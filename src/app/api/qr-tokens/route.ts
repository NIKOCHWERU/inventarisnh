import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { generateEnrollmentToken } from '@/lib/tokens';
import { getNetworkAccessInfo } from '@/lib/network';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 });
    }

    const tokens = await prisma.enrollmentToken.findMany({
      orderBy: { created_at: 'desc' },
      include: {
        creator: { select: { name: true } },
        used_by: { select: { id: true, name: true, created_at: true } },
      },
    });

    const now = new Date();
    // Dynamically update any that expired
    const formatted = tokens.map((t) => {
      let status = t.status;
      if (status === 'ACTIVE' && now > new Date(t.expires_at)) {
        status = 'EXPIRED';
      }
      return {
        id: t.id,
        status,
        expiresAt: t.expires_at,
        usedAt: t.used_at,
        createdAt: t.created_at,
        creatorName: t.creator?.name || 'Admin',
        usedByName: t.used_by?.name || null,
        usedByUserId: t.used_by?.id || null,
      };
    });

    return NextResponse.json({ tokens: formatted });
  } catch (error: any) {
    console.error('List QR tokens error:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil daftar QR Code.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { expiryHours = 24, baseUrl } = body;

    const validHours = Math.max(1, Math.min(720, Number(expiryHours) || 24)); // 1 hour to 30 days
    const expiresAt = new Date(Date.now() + validHours * 60 * 60 * 1000);

    const { token, hash } = generateEnrollmentToken();

    const created = await prisma.enrollmentToken.create({
      data: {
        token_hash: hash,
        status: 'ACTIVE',
        expires_at: expiresAt,
        created_by: admin.id,
      },
    });

    // Determine target host URL for the QR code (Never localhost for HP scanner)
    const hostHeader = request.headers.get('x-forwarded-host') || request.headers.get('host');
    const netInfo = await getNetworkAccessInfo(hostHeader);
    
    let domainToUse = baseUrl?.trim();
    if (!domainToUse || domainToUse.includes('localhost') || domainToUse.includes('127.0.0.1')) {
      domainToUse = netInfo.preferredUrl;
    }
    const targetUrl = `${domainToUse.replace(/\/$/, '')}/enroll?token=${token}`;

    // Generate QR Code as high-res PNG Data URL
    const qrDataUrl = await QRCode.toDataURL(targetUrl, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 480,
      color: {
        dark: '#202820',
        light: '#FFFFFF',
      },
    });

    return NextResponse.json({
      success: true,
      tokenRecord: {
        id: created.id,
        plainToken: token,
        targetUrl,
        qrDataUrl,
        expiresAt: created.expires_at,
        status: 'ACTIVE',
      },
    });
  } catch (error: any) {
    console.error('Create QR token error:', error);
    return NextResponse.json(
      { error: 'Gagal membuat QR Code baru.' },
      { status: 500 }
    );
  }
}
