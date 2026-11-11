import { NextResponse } from 'next/server';
import { validateEnrollmentToken } from '@/lib/tokens';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { valid: false, error: 'Token QR Code tidak disediakan.' },
        { status: 400 }
      );
    }

    const result = await validateEnrollmentToken(token);
    if (!result.valid) {
      return NextResponse.json(
        { valid: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      valid: true,
      expiresAt: result.record?.expires_at,
      createdBy: result.record?.creator?.name,
    });
  } catch (error: any) {
    console.error('Validate token error:', error);
    return NextResponse.json(
      { valid: false, error: 'Gagal memvalidasi token QR Code.' },
      { status: 500 }
    );
  }
}
