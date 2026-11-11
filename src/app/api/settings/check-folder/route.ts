import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { testDirectoryWritable } from '@/lib/upload';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 });
    }

    const body = await request.json();
    const { folder_path } = body;

    if (!folder_path || !folder_path.trim()) {
      return NextResponse.json({
        writable: true,
        message: 'Menggunakan folder default: public/uploads',
      });
    }

    const result = await testDirectoryWritable(folder_path.trim());
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { writable: false, message: error.message || 'Gagal menguji folder.' },
      { status: 500 }
    );
  }
}
