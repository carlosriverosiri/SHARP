/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_SUPABASE_URL: string;
  readonly PUBLIC_SUPABASE_ANON_KEY: string;
  readonly SUPABASE_SERVICE_ROLE_KEY: string;
  readonly PERSONAL_PASSWORD: string;
  readonly PERSONAL_SESSION_SECRET: string;
  readonly USE_SUPABASE_AUTH: string;
  readonly SITE: string;
  readonly PUBLIC_SITE_URL: string;
  // 46elks SMS API
  readonly ELKS_API_USER: string;
  readonly ELKS_API_PASSWORD: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace App {
  interface Locals {
    user?: {
      id: string;
      email: string;
      roll: 'admin' | 'personal' | 'superadmin';
    };
  }
}

declare module 'papaparse' {
  export type ParseResult<T> = {
    data: T[];
    meta: {
      fields?: string[];
    };
  };

  export type ParseConfig<T> = {
    header?: boolean;
    delimiter?: string;
    preview?: number;
    skipEmptyLines?: boolean | 'greedy';
  };

  const Papa: {
    parse<T>(input: string, config?: ParseConfig<T>): ParseResult<T>;
  };

  export default Papa;
}
