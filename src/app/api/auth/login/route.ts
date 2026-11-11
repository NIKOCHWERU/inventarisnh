import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { createSession, setSessionCookie, attachSessionCookie } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username dan password wajib diisi.' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { username: username.trim() },
    });

    if (!user || !user.password_hash) {
      return NextResponse.json(
        { error: 'Username atau password salah.' },
        { status: 401 }
      );
    }

    if (user.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Akun Anda dinonaktifkan. Hubungi administrator.' },
        { status: 403 }
      );
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Username atau password salah.' },
        { status: 401 }
      );
    }

    const plainToken = await createSession(user.id);
    await setSessionCookie(plainToken);

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
      },
    });
    attachSessionCookie(response, plainToken);
    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan internal server saat login.' },
      { status: 500 }
    );
  }
}
