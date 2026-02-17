/**
 * 顔ぼかし（ロゴ追加）ユーティリティ
 * スタイリング写真の顔部分にロゴを配置
 */

export async function addLogoToFace(imageFile: File, logoText = 'THE LONG GAME'): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;

      // 元画像を描画
      ctx.drawImage(img, 0, 0);

      // ロゴの位置とサイズを計算（顔の位置を想定）
      const logoWidth = img.width * 0.4;
      const logoHeight = logoWidth * 0.25;
      const logoX = (img.width - logoWidth) / 2;
      const logoY = img.height * 0.15;

      // 背景（黒の半透明）
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.fillRect(logoX - 20, logoY - 20, logoWidth + 40, logoHeight + 40);

      // テキストを描画
      ctx.fillStyle = 'white';
      ctx.font = `bold ${logoHeight * 0.35}px Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(logoText, img.width / 2, logoY + logoHeight / 2);

      // Blobに変換
      canvas.toBlob((blob) => {
        if (blob) {
          const processedFile = new File([blob], imageFile.name, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          resolve(processedFile);
        } else {
          reject(new Error('Failed to create blob'));
        }
      }, 'image/jpeg', 0.95);
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = URL.createObjectURL(imageFile);
  });
}

export async function previewImageWithLogo(imageFile: File): Promise<string> {
  const processedFile = await addLogoToFace(imageFile);
  return URL.createObjectURL(processedFile);
}

