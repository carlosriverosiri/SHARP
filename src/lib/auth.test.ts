import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AstroCookies } from 'astro';
import type { User } from '@supabase/supabase-js';

vi.mock('./supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
      refreshSession: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      signInWithOtp: vi.fn(),
      resetPasswordForEmail: vi.fn()
    }
  },
  loggaHandelse: vi.fn(),
  supabaseKonfigurerad: true
}));

import { arInloggad, hamtaAnvandare } from './auth';
import { supabase } from './supabase';

class MockCookies {
  private store = new Map<string, string>();

  constructor(initial: Record<string, string> = {}) {
    Object.entries(initial).forEach(([key, value]) => {
      this.store.set(key, value);
    });
  }

  get(name: string) {
    const value = this.store.get(name);
    return value ? { value } : undefined;
  }

  set(name: string, value: string) {
    this.store.set(name, value);
  }

  delete(name: string) {
    this.store.delete(name);
  }

  value(name: string): string | undefined {
    return this.store.get(name);
  }
}

function createJwt(payload: Record<string, unknown>): string {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.test-signature`;
}

function createSupabaseUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    app_metadata: { role: 'superadmin' },
    user_metadata: { full_name: 'Carlos Test' },
    aud: 'authenticated',
    confirmation_sent_at: undefined,
    confirmed_at: undefined,
    created_at: '2026-03-15T10:00:00.000Z',
    email: 'carlos@example.com',
    email_confirmed_at: '2026-03-15T10:00:00.000Z',
    factors: [],
    identities: [],
    is_anonymous: false,
    last_sign_in_at: '2026-03-15T10:00:00.000Z',
    phone: '',
    role: 'authenticated',
    updated_at: '2026-03-15T10:00:00.000Z',
    ...overrides
  } as User;
}

describe('auth supabase session verification', () => {
  const getUserMock = vi.mocked(supabase.auth.getUser);
  const refreshSessionMock = vi.mocked(supabase.auth.refreshSession);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects a forged access token even if the payload looks valid', async () => {
    const forgedToken = createJwt({
      sub: 'attacker-id',
      email: 'attacker@example.com',
      app_metadata: { role: 'superadmin' },
      exp: Math.floor(Date.now() / 1000) + 3600
    });
    const cookies = new MockCookies({
      'sb-access-token': forgedToken
    });

    getUserMock.mockResolvedValue({
      data: { user: null },
      error: new Error('invalid token') as never
    });

    const user = await hamtaAnvandare(cookies as unknown as AstroCookies);

    expect(user).toBeNull();
    expect(getUserMock).toHaveBeenCalledWith(forgedToken);
    expect(cookies.value('sb-access-token')).toBeUndefined();
  });

  it('returns the verified Supabase user for a valid access token', async () => {
    const accessToken = createJwt({
      sub: 'user-1',
      email: 'carlos@example.com',
      app_metadata: { role: 'superadmin' },
      exp: Math.floor(Date.now() / 1000) + 3600
    });
    const cookies = new MockCookies({
      'sb-access-token': accessToken
    });

    getUserMock.mockResolvedValue({
      data: { user: createSupabaseUser() },
      error: null
    });

    const user = await hamtaAnvandare(cookies as unknown as AstroCookies);

    expect(user).toEqual({
      id: 'user-1',
      email: 'carlos@example.com',
      roll: 'superadmin',
      namn: 'Carlos Test'
    });
    expect(getUserMock).toHaveBeenCalledWith(accessToken);
  });

  it('refreshes an expired session and updates cookies', async () => {
    const expiredToken = createJwt({
      sub: 'user-1',
      email: 'carlos@example.com',
      exp: Math.floor(Date.now() / 1000) - 60
    });
    const refreshedUser = createSupabaseUser({
      user_metadata: { full_name: 'Carlos Refreshed' }
    });
    const cookies = new MockCookies({
      'sb-access-token': expiredToken,
      'sb-refresh-token': 'refresh-token-1'
    });

    refreshSessionMock.mockResolvedValue({
      data: {
        session: {
          access_token: 'fresh-access-token',
          refresh_token: 'fresh-refresh-token',
          user: refreshedUser
        },
        user: refreshedUser
      },
      error: null
    } as never);

    const loggedIn = await arInloggad(cookies as unknown as AstroCookies);

    expect(loggedIn).toBe(true);
    expect(getUserMock).not.toHaveBeenCalled();
    expect(refreshSessionMock).toHaveBeenCalledWith({
      refresh_token: 'refresh-token-1'
    });
    expect(cookies.value('sb-access-token')).toBe('fresh-access-token');
    expect(cookies.value('sb-refresh-token')).toBe('fresh-refresh-token');
  });
});
