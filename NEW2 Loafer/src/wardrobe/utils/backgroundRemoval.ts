/**
 * 背景削除ユーティリティ
 * @imgly/background-removal ライブラリを使用
 */

import { removeBackground } from '@imgly/background-removal';

export async function removeBgFromImage(imageFile: File): Promise<Blob> {
  try {
    const blob = await removeBackground(imageFile, {
      publicPath: 'https://cdn.jsdelivr.net/npm/@imgly/background-removal@latest/dist/',
      progress: (key, current, total) => {
        console.log(`Processing: ${key} - ${Math.round((current / total) * 100)}%`);
      },
    });

    return blob;
  } catch (error) {
    console.error('Background removal failed:', error);
    throw new Error('背景削除に失敗しました / Background removal failed');
  }
}

export function blobToFile(blob: Blob, fileName: string): File {
  return new File([blob], fileName, { type: blob.type });
}

