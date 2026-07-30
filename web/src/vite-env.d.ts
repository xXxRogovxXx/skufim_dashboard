/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Сборка для .exe: "true" отключает экран пароля
  readonly VITE_DISABLE_GATE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
