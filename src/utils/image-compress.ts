// ============================================================
// マネーツリー - 画像圧縮・変換ユーティリティ (image-compress.ts)
// クエスト写真提出用画像のリサイズ・圧縮・サムネイル生成
// ============================================================

type ImageSource = ImageBitmap | HTMLImageElement;

/**
 * ファイルから画像ソース（ImageBitmap または HTMLImageElement）を読み込む
 */
async function loadImageSource(file: File): Promise<ImageSource> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file);
    } catch {
      // createImageBitmap が失敗した場合は Image 要素でフォールバック
    }
  }

  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('画像の読み込みに失敗しました'));
    };

    img.src = url;
  });
}

/**
 * 画像ソースの元サイズを取得
 */
function getImageDimensions(source: ImageSource): { width: number; height: number } {
  if ('close' in source && typeof source.close === 'function') {
    // ImageBitmap
    return { width: source.width, height: source.height };
  }
  const img = source as HTMLImageElement;
  return {
    width: img.naturalWidth || img.width,
    height: img.naturalHeight || img.height,
  };
}

/**
 * 画像ソースのリソース解放
 */
function cleanUpImageSource(source: ImageSource): void {
  if ('close' in source && typeof source.close === 'function') {
    source.close();
  }
}

/**
 * クエスト写真アップロード用の画像圧縮・リサイズ処理
 * - 指定した最大幅 (maxWidth) を上限にアスペクト比を維持して縮小
 * - WebP 形式で出力（非対応環境では JPEG 形式にフォールバック）
 * - 利用可能なら OffscreenCanvas を使用し、無ければ通常 Canvas を使用
 *
 * @param file アップロード対象の画像ファイル
 * @param maxWidth 最大横幅 (px)（デフォルト: 1024）
 * @param quality 圧縮品質 0.0〜1.0（デフォルト: 0.8）
 * @returns 圧縮後の Blob
 */
export async function compressImage(
  file: File,
  maxWidth: number = 1024,
  quality: number = 0.8
): Promise<Blob> {
  const imageSource = await loadImageSource(file);
  const { width: origWidth, height: origHeight } = getImageDimensions(imageSource);

  // リサイズ計算（アスペクト比維持、拡大は行わず縮小のみ）
  let targetWidth = origWidth;
  let targetHeight = origHeight;

  if (origWidth > maxWidth) {
    targetWidth = maxWidth;
    targetHeight = Math.round((origHeight * maxWidth) / origWidth);
  }

  // 1. OffscreenCanvas が利用可能な場合
  if (typeof OffscreenCanvas !== 'undefined') {
    try {
      const offscreen = new OffscreenCanvas(targetWidth, targetHeight);
      const ctx = offscreen.getContext('2d');
      if (ctx) {
        ctx.drawImage(imageSource, 0, 0, targetWidth, targetHeight);
        cleanUpImageSource(imageSource);

        try {
          const webpBlob = await offscreen.convertToBlob({ type: 'image/webp', quality });
          if (webpBlob && webpBlob.type === 'image/webp') {
            return webpBlob;
          }
        } catch {
          // WebP変換が非対応の場合はJPEGにフォールバック
        }

        return await offscreen.convertToBlob({ type: 'image/jpeg', quality });
      }
    } catch {
      // OffscreenCanvas処理でエラー時は通常のCanvasへフォールバック
    }
  }

  // 2. 通常の HTMLCanvasElement フォールバック
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    cleanUpImageSource(imageSource);
    throw new Error('Canvas 2D コンテキストの取得に失敗しました');
  }

  ctx.drawImage(imageSource, 0, 0, targetWidth, targetHeight);
  cleanUpImageSource(imageSource);

  return new Promise<Blob>((resolve, reject) => {
    // まず WebP での変換を試行
    canvas.toBlob(
      (webpBlob) => {
        if (webpBlob && webpBlob.type === 'image/webp') {
          resolve(webpBlob);
        } else {
          // WebP 非対応ブラウザでは JPEG にフォールバック
          canvas.toBlob(
            (jpegBlob) => {
              if (jpegBlob) {
                resolve(jpegBlob);
              } else {
                reject(new Error('画像の圧縮 Blob 生成に失敗しました'));
              }
            },
            'image/jpeg',
            quality
          );
        }
      },
      'image/webp',
      quality
    );
  });
}

/**
 * プレビューサムネイル表示用 Data URL 生成
 * @param file 対象ファイル
 * @returns Base64 Data URL 文字列の Promise
 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('ファイルの読み込みに失敗しました'));
    reader.readAsDataURL(file);
  });
}

/**
 * Base64 Data URL を Blob に変換
 * @param dataUrl Data URL 文字列 ('data:image/jpeg;base64,...')
 * @returns 復元された Blob
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const mimeMatch = parts[0]?.match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const binaryStr = atob(parts[1] || '');
  const len = binaryStr.length;
  const u8arr = new Uint8Array(len);

  for (let i = 0; i < len; i++) {
    u8arr[i] = binaryStr.charCodeAt(i);
  }

  return new Blob([u8arr], { type: mime });
}
