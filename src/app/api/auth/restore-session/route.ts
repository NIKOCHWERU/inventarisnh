import { NextResponse } from 'next/server';
import { restoreUserSession, createOrRenewEmployeeSession, attachSessionCookie } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { sessionToken, userId } = body;

    // 1. Try to restore via existing session token
    if (sessionToken && typeof sessionToken === 'string') {
      const user = await restoreUserSession(sessionToken.trim());
      if (user) {
        const response = NextResponse.json({
          success: true,
          restored: true,
          user: {
            id: user.id,
            name: user.name,
            role: user.role,
            status: user.status,
          },
          sessionToken: sessionToken.trim(),
        });
        attachSessionCookie(response, sessionToken.trim());
        return response;
      }
    }

    // 2. Fallback: if session was purged from DB but employee userId is stored in device localStorage
    if (userId && typeof userId === 'string') {
      const renewed = await createOrRenewEmployeeSession(userId.trim());
      if (renewed) {
        const response = NextResponse.json({
          success: true,
          restored: true,
          user: {
            id: renewed.user.id,
            name: renewed.user.name,
            role: renewed.user.role,
            status: renewed.user.status,
          },
          sessionToken: renewed.sessionToken,
        });
        attachSessionCookie(response, renewed.sessionToken);
        return response;
      }
    }

    return NextResponse.json(
      {
        success: false,
        restored: false,
        error: 'Sesi perangkat tidak ditemukan atau karyawan sudah nonaktif.',
      },
      { status: 401 }
    );
  } catch (error: any) {
    console.error('restore-session error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan sistem saat memulihkan sesi.' },
      { status: 500 }
    );
  }
}
