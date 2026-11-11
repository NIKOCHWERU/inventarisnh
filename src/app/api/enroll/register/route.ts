import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateEnrollmentToken } from '@/lib/tokens';
import { createSession, setSessionCookie, attachSessionCookie } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, name } = body;

    if (!token || !token.trim()) {
      return NextResponse.json(
        { error: 'Token QR Code tidak valid.' },
        { status: 400 }
      );
    }

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Nama Lengkap wajib diisi.' },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 80) {
      return NextResponse.json(
        { error: 'Nama Lengkap harus antara 2 hingga 80 karakter.' },
        { status: 400 }
      );
    }

    // Validate enrollment token
    const validation = await validateEnrollmentToken(token);
    if (!validation.valid || !validation.record) {
      return NextResponse.json(
        { error: validation.error || 'Token tidak valid atau sudah kedaluwarsa.' },
        { status: 400 }
      );
    }

    const tokenRecord = validation.record;

    // Use transaction to link token, reuse or create user, and mark token as USED
    const result = await prisma.$transaction(async (tx) => {
      // Find existing active employee with same name or create new
      let employeeUser = await tx.user.findFirst({
        where: {
          name: trimmedName,
          role: 'Penginventaris',
          status: 'ACTIVE',
        },
      });

      if (!employeeUser) {
        employeeUser = await tx.user.create({
          data: {
            name: trimmedName,
            role: 'Penginventaris',
            status: 'ACTIVE',
          },
        });
      }

      // Update enrollment token
      await tx.enrollmentToken.update({
        where: { id: tokenRecord.id },
        data: {
          status: 'USED',
          used_at: new Date(),
          used_by_user_id: employeeUser.id,
        },
      });

      return employeeUser;
    });

    // Create session and set HttpOnly cookie
    const plainSessionToken = await createSession(result.id);
    await setSessionCookie(plainSessionToken);

    const response = NextResponse.json({
      success: true,
      message: 'Registrasi berhasil. Selamat datang di Portal Penginput Inventaris!',
      sessionToken: plainSessionToken,
      user: {
        id: result.id,
        name: result.name,
        role: result.role,
      },
    });

    attachSessionCookie(response, plainSessionToken);
    return response;
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan sistem saat mendaftarkan akun.' },
      { status: 500 }
    );
  }
}
