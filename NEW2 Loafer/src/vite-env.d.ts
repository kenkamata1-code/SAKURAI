/// <reference types="vite/client" />

// .md ファイルの ?raw インポートの型定義
declare module '*.md?raw' {
  const content: string;
  export default content;
}

declare module '*.md' {
  const content: string;
  export default content;
}
