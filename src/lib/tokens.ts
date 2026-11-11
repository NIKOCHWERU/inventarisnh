import crypto from 'crypto';
import { prisma } from './prisma';

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
}

export function generateEnrollmentToken(): { token: string; hash: string } {
  const token = crypto.randomBytes(32).toString('hex');
  const hash = hashToken(token);
  return { token, hash };
}

export async function validateEnrollmentToken(plainToken: string) {
  if (!plainToken || plainToken.trim().length === 0) {
    return { valid: false, error: 'Token enrollment tidak valid.' };
  }

  const token_hash = hashToken(plainToken);
  const record = await prisma.enrollmentToken.findUnique({
    where: { token_hash },
    include: { creator: { select: { name: true } } },
  });

  if (!record) {
    return { valid: false, error: 'Token QR Code tidak ditemukan atau tidak valid.' };
  }

  if (record.status === 'REVOKED') {
    return { valid: false, error: 'Token QR Code telah dinonaktifkan oleh administrator.' };
  }

  if (record.status === 'USED' || record.used_at) {
    return { valid: false, error: 'Token QR Code sudah pernah digunakan. Minta QR Code baru ke administrator.' };
  }

  if (new Date() > new Date(record.expires_at)) {
    // Update status to EXPIRED if past due
    if (record.status !== 'EXPIRED') {
      await prisma.enrollmentToken.update({
        where: { id: record.id },
        data: { status: 'EXPIRED' },
      });
    }
    return { valid: false, error: 'Token QR Code telah kedaluwarsa. Minta QR Code baru ke administrator.' };
  }

  return { valid: true, record };
}
