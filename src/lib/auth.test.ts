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

const mockGetUser = vi.fn();
const mockGetSession = vi.fn();
const mockSignOut = vi.fn();

vi.mock('./supabase-ssr-astro', () => ({
  createSupabaseServerClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
      getSession: mockGetSession,
      signInWithPassword: vi.fn(),
      signOut: mockSignOut
    }
  }))
}));

import { arInloggad, hamtaAnvandare } from './auth';

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

function testRequest(): Request {
  return new Request('https://example.test/personal', {
    headers: { cookie: 'irrelevant=1' }
  });
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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when Supabase getUser rejects session', async () => {
    const cookies = new MockCookies();
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: new Error('invalid session') as never
    });

    const user = await hamtaAnvandare(cookies as unknown as AstroCookies, testRequest());

    expect(user).toBeNull();
    expect(mockGetUser).toHaveBeenCalled();
    expect(mockSignOut).toHaveBeenCalled();
  });

  it('returns the verified Supabase user when getUser succeeds', async () => {
    const cookies = new MockCookies();
    mockGetUser.mockResolvedValue({
      data: { user: createSupabaseUser() },
      error: null
    });

    const user = await hamtaAnvandare(cookies as unknown as AstroCookies, testRequest());

    expect(user).toEqual({
      id: 'user-1',
      email: 'carlos@example.com',
      roll: 'superadmin',
      namn: 'Carlos Test'
    });
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('arInloggad mirrors hamtaAnvandare truthiness', async () => {
    const cookies = new MockCookies();
    mockGetUser.mockResolvedValue({
      data: { user: createSupabaseUser() },
      error: null
    });

    const loggedIn = await arInloggad(cookies as unknown as AstroCookies, testRequest());

    expect(loggedIn).toBe(true);
  });
});
