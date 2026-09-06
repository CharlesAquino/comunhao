/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_PUBLIC_SITE_URL?: string;
  readonly VITE_VAPID_PUBLIC_KEY?: string;
  readonly VITE_UPDATE_CHANNEL?: 'production' | 'testing';
  readonly VITE_UPDATE_MANIFEST_URL?: string;
  readonly VITE_BUILD_LABEL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
