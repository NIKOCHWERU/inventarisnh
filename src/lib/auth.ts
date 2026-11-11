import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from './prisma';

export const SESSION_COOKIE_NAME = 'app_session';
export const SESSION_DURATION_DAYS = 365; // 365 hari (1 tahun) agar karyawan di device masing-masing tidak perlu scan ulang

export function hashSessionToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function createSession(userId: string): Promise<string> {
  const plainToken = crypto.randomBytes(32).toString('hex');
  const sessionTokenHash = hashSessionToken(plainToken);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      user_id: userId,
      session_token_hash: sessionTokenHash,
      expires_at: expiresAt,
    },
  });

  return plainToken;
}

export function attachSessionCookie(response: NextResponse, plainToken: string): NextResponse {
  const isHttps = process.env.COOKIE_SECURE === 'true' || Boolean(process.env.APP_URL?.startsWith('https://'));
  response.cookies.set(SESSION_COOKIE_NAME, plainToken, {
    httpOnly: true,
    secure: isHttps,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60,
  });
  return response;
}

export async function setSessionCookie(plainToken: string) {
  try {
    const cookieStore = cookies();
    const isHttps = process.env.COOKIE_SECURE === 'true' || Boolean(process.env.APP_URL?.startsWith('https://'));

    cookieStore.set(SESSION_COOKIE_NAME, plainToken, {
      httpOnly: true,
      secure: isHttps,
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60,
    });
  } catch {}
}

export async function destroySession() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (token) {
      const hash = hashSessionToken(token);
      try {
        await prisma.session.deleteMany({
          where: { session_token_hash: hash },
        });
      } catch {}
    }

    cookieStore.set(SESSION_COOKIE_NAME, '', {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });
  } catch {}
}

export async function getCurrentUser() {
  try {
    let token: string | undefined | null = null;

    // 1. Check custom headers (useful for mobile clients when cookies are restricted over HTTP LAN)
    try {
      const headerStore = headers();
      const customHeader = headerStore.get('x-session-token');
      if (customHeader) {
        token = customHeader.trim();
      } else {
        const authHeader = headerStore.get('authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
          token = authHeader.substring(7).trim();
        }
      }
    } catch {}

    // 2. Check cookies
    if (!token) {
      try {
        const cookieStore = cookies();
        token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
      } catch {}
    }

    if (!token) return null;

    const session_token_hash = hashSessionToken(token);
    const session = await prisma.session.findUnique({
      where: { session_token_hash },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            role: true,
            status: true,
            created_at: true,
          },
        },
      },
    });

    if (!session) return null;

    // Check expiration
    if (new Date() > new Date(session.expires_at)) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
      return null;
    }

    // Check user active status
    if (session.user.status !== 'ACTIVE') {
      return null;
    }

    // Sliding renewal: extend session if less than 300 days remain
    const daysLeft = (new Date(session.expires_at).getTime() - Date.now()) / (24 * 60 * 60 * 1000);
    if (daysLeft < 300) {
      const newExpiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);
      prisma.session.update({
        where: { id: session.id },
        data: { expires_at: newExpiresAt },
      }).catch(() => {});
    }

    return session.user;
  } catch (error) {
    console.error('getCurrentUser error:', error);
    return null;
  }
}

/**
 * Restore an active session using the plain token stored on the employee's device.
 * Renews the expiration and resets the session cookie.
 */
export async function restoreUserSession(plainToken: string) {
  try {
    if (!plainToken || typeof plainToken !== 'string') return null;
    const session_token_hash = hashSessionToken(plainToken.trim());
    const session = await prisma.session.findUnique({
      where: { session_token_hash },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            role: true,
            status: true,
            created_at: true,
          },
        },
      },
    });

    if (!session || session.user.status !== 'ACTIVE') return null;

    // Renew expires_at in database
    const newExpiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);
    await prisma.session.update({
      where: { id: session.id },
      data: { expires_at: newExpiresAt },
    });

    await setSessionCookie(plainToken.trim());
    return session.user;
  } catch (err) {
    console.error('restoreUserSession error:', err);
    return null;
  }
}

/**
 * Fallback restore: if the session in the DB was deleted but the employee ID exists
 * and is ACTIVE, seamlessly issue a new session token so the device never needs to re-scan.
 */
export async function createOrRenewEmployeeSession(userId: string) {
  try {
    if (!userId || typeof userId !== 'string') return null;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        status: true,
        created_at: true,
      },
    });

    if (!user || user.status !== 'ACTIVE' || user.role !== 'Penginventaris') {
      return null;
    }

    const newPlainToken = await createSession(user.id);
    await setSessionCookie(newPlainToken);
    return { user, sessionToken: newPlainToken };
  } catch (err) {
    console.error('createOrRenewEmployeeSession error:', err);
    return null;
  }
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'Admin') {
    return null;
  }
  return user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  return user;
}
