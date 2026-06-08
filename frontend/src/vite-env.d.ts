/// <reference types="vite/client" />

interface Window {
  localmind: {
    appName: string;
    selectImportFiles?: () => Promise<LocalMindSelectedFile[]>;
  };
}

interface LocalMindSelectedFile {
  filePath: string;
  name: string;
  size: number;
  lastModified: number;
}
