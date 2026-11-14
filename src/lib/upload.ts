import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const DEFAULT_UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

// Ensure default directory exists
if (!fs.existsSync(DEFAULT_UPLOAD_DIR)) {
  fs.mkdirSync(DEFAULT_UPLOAD_DIR, { recursive: true });
}

/**
 * Get active upload directory.
 * If user configured a custom path in settings, use that; otherwise default to public/uploads.
 */
export async function getUploadDir(): Promise<string> {
  try {
    const setting = await prisma.appSetting.findUnique({
      where: { key: 'upload_directory' },
    });
    if (setting && setting.value && setting.value.trim().length > 0) {
      const customPath = path.resolve(setting.value.trim());
      if (!fs.existsSync(customPath)) {
        fs.mkdirSync(customPath, { recursive: true });
      }
      return customPath;
    }
  } catch (err) {
    console.error('getUploadDir fallback error:', err);
  }
  return DEFAULT_UPLOAD_DIR;
}

/**
 * Resolves the absolute path of a photo stored in database (/uploads/xyz.jpg or /uploads/logistics/xyz.jpg).
 * Searches first in active upload directory, then fallback to public/uploads.
 */
export async function resolvePhotoAbsolutePath(photoPath: string | null | undefined): Promise<string | null> {
  if (!photoPath) return null;
  // Strip leading /uploads/ or /
  const relSubPath = photoPath.replace(/^\/?uploads\/?/, '').replace(/^\/+/, '');
  // Prevent path traversal
  const safeRel = path.normalize(relSubPath).replace(/^(\.\.[\/\\])+/, '');

  try {
    const activeDir = await getUploadDir();
    const activeFilePath = path.join(activeDir, safeRel);
    if (fs.existsSync(activeFilePath)) {
      return activeFilePath;
    }
  } catch (err) {
    console.error('resolvePhotoAbsolutePath activeDir error:', err);
  }

  // Fallback to default public/uploads
  const defaultFilePath = path.join(DEFAULT_UPLOAD_DIR, safeRel);
  if (fs.existsSync(defaultFilePath)) {
    return defaultFilePath;
  }

  return null;
}

export interface UploadResult {
  success: boolean;
  filePath?: string;
  error?: string;
}

export async function saveUploadedFile(file: File, subFolder: string = ''): Promise<UploadResult> {
  try {
    if (!file || file.size === 0) {
      return { success: false, error: 'File tidak boleh kosong.' };
    }

    if (file.size > MAX_FILE_SIZE) {
      return {
        success: false,
        error: `Ukuran file melebihi batas maksimal 5 MB (ukuran file: ${(file.size / (1024 * 1024)).toFixed(1)} MB).`,
      };
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return {
        success: false,
        error: 'Format foto tidak didukung. Harap gunakan format JPEG, PNG, atau WebP.',
      };
    }

    // Determine extension safely
    let ext = '.jpg';
    if (file.type === 'image/png') ext = '.png';
    else if (file.type === 'image/webp') ext = '.webp';
    else if (file.type === 'image/jpeg') ext = '.jpg';

    // Generate random secure filename
    const randomHex = crypto.randomBytes(8).toString('hex');
    const safeFilename = `inv_${Date.now()}_${randomHex}${ext}`;

    const targetBaseDir = await getUploadDir();
    const targetDir = subFolder ? path.join(targetBaseDir, subFolder) : targetBaseDir;

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const destinationPath = path.join(targetDir, safeFilename);

    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.promises.writeFile(destinationPath, buffer);

    const relativeUrl = subFolder ? `/uploads/${subFolder}/${safeFilename}` : `/uploads/${safeFilename}`;

    return {
      success: true,
      filePath: relativeUrl,
    };
  } catch (error: any) {
    console.error('saveUploadedFile error:', error);
    return { success: false, error: 'Gagal mengunggah foto ke folder penyimpanan.' };
  }
}

export async function deleteUploadedFile(relativeUrl: string): Promise<boolean> {
  try {
    if (!relativeUrl || !relativeUrl.startsWith('/uploads/')) return false;
    const resolvedPath = await resolvePhotoAbsolutePath(relativeUrl);
    if (resolvedPath && fs.existsSync(resolvedPath)) {
      await fs.promises.unlink(resolvedPath);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Validates a folder path for write permissions.
 */
export async function testDirectoryWritable(targetPath: string): Promise<{ writable: boolean; message: string }> {
  try {
    const resolved = path.resolve(targetPath);
    if (!fs.existsSync(resolved)) {
      fs.mkdirSync(resolved, { recursive: true });
    }
    const testFile = path.join(resolved, `.test_write_${Date.now()}.tmp`);
    await fs.promises.writeFile(testFile, 'test');
    await fs.promises.unlink(testFile);
    return { writable: true, message: `Folder valid dan siap digunakan: ${resolved}` };
  } catch (err: any) {
    return { writable: false, message: `Folder tidak dapat diakses atau ditulis: ${err.message}` };
  }
}

/**
 * Extracts list of photo paths from database record.
 * Handles both new photo_paths JSON string array and legacy photo_path.
 */
export function parsePhotoPaths(item: { photo_path?: string | null; photo_paths?: string | null } | null | undefined): string[] {
  if (!item) return [];
  if (item.photo_paths) {
    try {
      const parsed = JSON.parse(item.photo_paths);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter((p) => typeof p === 'string' && p.trim().length > 0);
      }
    } catch {}
  }
  if (item.photo_path) {
    if (item.photo_path.startsWith('[') && item.photo_path.endsWith(']')) {
      try {
        const parsed = JSON.parse(item.photo_path);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter((p) => typeof p === 'string' && p.trim().length > 0);
        }
      } catch {}
    }
    return [item.photo_path];
  }
  return [];
}

/**
 * Saves multiple uploaded files (up to maxCount, default 100).
 */
export async function saveMultipleUploadedFiles(
  files: File[],
  subFolder: string = '',
  maxCount: number = 100
): Promise<{ filePaths: string[]; errors: string[] }> {
  const filePaths: string[] = [];
  const errors: string[] = [];
  const filesToProcess = files.slice(0, maxCount);

  for (const file of filesToProcess) {
    if (!file || file.size === 0) continue;
    const res = await saveUploadedFile(file, subFolder);
    if (res.success && res.filePath) {
      filePaths.push(res.filePath);
    } else if (res.error) {
      errors.push(`${file.name}: ${res.error}`);
    }
  }

  return { filePaths, errors };
}
