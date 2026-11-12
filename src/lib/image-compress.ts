/**
 * Client-side high performance image compression utility.
 * Downscales huge phone camera photos (e.g. 10MB - 15MB 48MP images)
 * to crisp ~1280px resolution and compresses to ~150KB - 250KB JPEG.
 * This makes uploads 50x faster (instantaneous) and drastically saves disk space.
 */

export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

export async function compressImage(
  file: File,
  options: CompressOptions = {}
): Promise<{ file: File; previewUrl: string; originalSize: number; compressedSize: number }> {
  const { maxWidth = 1280, maxHeight = 1280, quality = 0.75 } = options;
  const originalSize = file.size;

  return new Promise((resolve) => {
    // If it's not an image, resolve with original
    if (!file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      return resolve({ file, previewUrl: url, originalSize, compressedSize: originalSize });
    }

    const reader = new FileReader();
    reader.onerror = () => {
      const url = URL.createObjectURL(file);
      resolve({ file, previewUrl: url, originalSize, compressedSize: originalSize });
    };

    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => {
        const url = URL.createObjectURL(file);
        resolve({ file, previewUrl: url, originalSize, compressedSize: originalSize });
      };

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate proportional scale
        if (width > maxWidth || height > maxHeight) {
          if (width / maxWidth > height / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          const url = URL.createObjectURL(file);
          resolve({ file, previewUrl: url, originalSize, compressedSize: originalSize });
          return;
        }

        // Draw white background in case of transparent png
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              const url = URL.createObjectURL(file);
              resolve({ file, previewUrl: url, originalSize, compressedSize: originalSize });
              return;
            }

            const cleanBaseName = file.name.replace(/\.[^/.]+$/, '');
            const compressedFile = new File([blob], `${cleanBaseName}.jpg`, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });

            const previewUrl = URL.createObjectURL(blob);
            resolve({
              file: compressedFile,
              previewUrl,
              originalSize,
              compressedSize: blob.size,
            });
          },
          'image/jpeg',
          quality
        );
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}
