const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const prisma = new PrismaClient();

const INITIAL_CATEGORIES = [
  'Elektronik',
  'Alat Masak',
  'Alat Kebersihan',
  'Peralatan Kantor',
  'Furniture',
  'Peralatan Keamanan',
  'Peralatan IT',
  'Lainnya',
];

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Seed Categories
  for (const catName of INITIAL_CATEGORIES) {
    await prisma.category.upsert({
      where: { name: catName },
      update: { status: 'ACTIVE' },
      create: { name: catName, status: 'ACTIVE' },
    });
  }
  console.log(`✅ Seeded ${INITIAL_CATEGORIES.length} default categories.`);

  // 2. Seed Default Settings
  const defaultSettings = [
    { key: 'office_name', value: 'Kantor Narasumberhukum' },
    { key: 'app_title', value: 'Sistem Inventaris Kantor' },
    { key: 'allow_employee_edit', value: 'false' },
    { key: 'qr_default_expiry_hours', value: '24' },
  ];

  for (const s of defaultSettings) {
    await prisma.appSetting.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    });
  }
  console.log('✅ Seeded default system settings.');

  // 3. Ensure First Admin
  const adminCount = await prisma.user.count({
    where: { role: 'Admin' },
  });

  if (adminCount === 0) {
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    // Use env password if provided, or generate a high-entropy secure password
    const adminPassword = process.env.ADMIN_PASSWORD || `Admin#${crypto.randomBytes(4).toString('hex')}!`;
    const adminName = process.env.ADMIN_NAME || 'Administrator Utama';

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(adminPassword, salt);

    const admin = await prisma.user.create({
      data: {
        name: adminName,
        username: adminUsername,
        password_hash,
        role: 'Admin',
        status: 'ACTIVE',
      },
    });

    console.log('\n======================================================');
    console.log('🔐 FIRST ADMIN CREATED:');
    console.log(`   Nama     : ${admin.name}`);
    console.log(`   Username : ${admin.username}`);
    console.log(`   Password : ${adminPassword}`);
    console.log('======================================================');
    console.log('⚠️  Simpan kredensial ini dengan aman!');
    console.log('   Anda dapat mengubah password kapan saja di Pengaturan.');
    console.log('======================================================\n');
  } else {
    console.log('ℹ️  Akun Admin sudah tersedia.');
  }

  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
