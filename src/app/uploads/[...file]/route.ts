import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { resolvePhotoAbsolutePath } from '@/lib/upload';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { file: string[] } }
) {
  try {
    const filePathSegment = Array.isArray(params.file) ? params.file.join('/') : params.file;
    const sanitizedName = path.basename(filePathSegment);
    const resolvedPath = await resolvePhotoAbsolutePath(`/uploads/${sanitizedName}`);

    if (!resolvedPath || !fs.existsSync(resolvedPath)) {
      return new NextResponse('File tidak ditemukan.', { status: 404 });
    }

    const stat = await fs.promises.stat(resolvedPath);
    const ext = path.extname(resolvedPath).toLowerCase();

    let contentType = 'application/octet-stream';
    if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.webp') contentType = 'image/webp';
    else if (ext === '.svg') contentType = 'image/svg+xml';

    const fileStream = fs.createReadStream(resolvedPath);
    // Convert stream to web-compatible ReadableStream
    const readable = new ReadableStream({
      start(controller) {
        fileStream.on('data', (chunk) => controller.enqueue(chunk));
        fileStream.on('end', () => controller.close());
        fileStream.on('error', (err) => controller.error(err));
      },
    });

    return new NextResponse(readable, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': stat.size.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error: any) {
    console.error('Serve upload error:', error);
    return new NextResponse('Gagal memuat file.', { status: 500 });
  }
}
