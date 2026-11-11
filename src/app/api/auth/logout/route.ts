import { NextResponse } from 'next/server';
import { destroySession } from '@/lib/auth';

export async function POST() {
  try {
    await destroySession();
    return NextResponse.json({ success: true, message: 'Berhasil keluar.' });
  } catch (error: any) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Gagal keluar.' },
      { status: 500 }
    );
  }
}
