/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Address of the API, for example https://your-api.onrender.com (no trailing slash). */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
