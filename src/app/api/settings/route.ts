import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { getNetworkAccessInfo } from '@/lib/network';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 });
    }

    const hostHeader = request.headers.get('x-forwarded-host') || request.headers.get('host');
    const netInfo = await getNetworkAccessInfo(hostHeader);

    const settingsRecords = await prisma.appSetting.findMany();
    const settings: Record<string, string> = {};
    settingsRecords.forEach((s) => {
      settings[s.key] = s.value;
    });

    return NextResponse.json({
      settings: {
        office_name: settings.office_name || 'Kantor Narasumberhukum',
        app_title: settings.app_title || 'Sistem Inventaris Kantor',
        allow_employee_edit: settings.allow_employee_edit === 'true',
        qr_default_expiry_hours: settings.qr_default_expiry_hours || '24',
        tunnel_url: settings.tunnel_url || '',
        upload_directory: settings.upload_directory || '',
      },
      network: netInfo,
      admin: {
        id: admin.id,
        name: admin.name,
        username: admin.username,
      },
    });
  } catch (error: any) {
    console.error('Get settings error:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil pengaturan.' },
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

    const body = await request.json();
    const {
      office_name,
      app_title,
      allow_employee_edit,
      qr_default_expiry_hours,
      upload_directory,
      admin_name,
      admin_username,
      new_password,
    } = body;

    // Save key-value settings
    const updates = [
      { key: 'office_name', value: office_name?.trim() || 'Kantor Narasumberhukum' },
      { key: 'app_title', value: app_title?.trim() || 'Sistem Inventaris Kantor' },
      { key: 'allow_employee_edit', value: allow_employee_edit ? 'true' : 'false' },
      { key: 'qr_default_expiry_hours', value: String(qr_default_expiry_hours || '24') },
      { key: 'upload_directory', value: upload_directory !== undefined ? upload_directory.trim() : '' },
    ];

    for (const item of updates) {
      await prisma.appSetting.upsert({
        where: { key: item.key },
        update: { value: item.value },
        create: { key: item.key, value: item.value },
      });
    }

    // Optional admin profile/password update
    const userUpdate: any = {};
    if (admin_name && admin_name.trim()) {
      userUpdate.name = admin_name.trim();
    }
    if (admin_username && admin_username.trim()) {
      const trimmedUser = admin_username.trim();
      const duplicate = await prisma.user.findFirst({
        where: { username: trimmedUser, NOT: { id: admin.id } },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: 'Username tersebut sudah dipakai.' },
          { status: 400 }
        );
      }
      userUpdate.username = trimmedUser;
    }
    if (new_password && new_password.trim().length >= 6) {
      const salt = await bcrypt.genSalt(10);
      userUpdate.password_hash = await bcrypt.hash(new_password.trim(), salt);
    }

    if (Object.keys(userUpdate).length > 0) {
      await prisma.user.update({
        where: { id: admin.id },
        data: userUpdate,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Pengaturan dan profil berhasil disimpan.',
    });
  } catch (error: any) {
    console.error('Update settings error:', error);
    return NextResponse.json(
      { error: 'Gagal memperbarui pengaturan.' },
      { status: 500 }
    );
  }
}
