const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('\n========================================================================');
  console.log('👥 DAFTAR PENGGUNA TERDAFTAR (SISTEM INVENTARIS KANTOR)');
  console.log('========================================================================\n');

  const users = await prisma.user.findMany({
    orderBy: { created_at: 'asc' },
  });

  if (users.length === 0) {
    console.log('Belum ada pengguna di database.');
    return;
  }

  console.log('📌 AKUN ADMINISTRATOR (Memerlukan Username & Password untuk Login):');
  console.log('------------------------------------------------------------------------');
  const admins = users.filter((u) => u.role === 'Admin');
  admins.forEach((admin, i) => {
    console.log(`[${i + 1}] Nama Lengkap : ${admin.name}`);
    console.log(`    Username     : ${admin.username}`);
    console.log(`    Password     : [Tersimpan Aman dalam Hash Bcrypt: ${admin.password_hash?.slice(0, 15)}...]`);
    console.log(`    Status       : ${admin.status}`);
    console.log(`    Terdaftar    : ${new Date(admin.created_at).toLocaleString('id-ID')}`);
    console.log('------------------------------------------------------------------------');
  });

  console.log('\n📌 AKUN KARYAWAN PENGINVENTARIS (Login Melalui Scan QR Code Tanpa Password):');
  console.log('------------------------------------------------------------------------');
  const employees = users.filter((u) => u.role === 'Penginventaris');
  if (employees.length === 0) {
    console.log('Belum ada karyawan yang terdaftar via QR Code.');
  } else {
    employees.forEach((emp, i) => {
      console.log(`[${i + 1}] Nama Karyawan : ${emp.name}`);
      console.log(`    Metode Login  : Scan QR Code Otorisasi (Otomatis tanpa password)`);
      console.log(`    Status Akun   : ${emp.status}`);
      console.log(`    Terdaftar     : ${new Date(emp.created_at).toLocaleString('id-ID')}`);
      console.log('------------------------------------------------------------------------');
    });
  }

  console.log('\n💡 CATATAN KEAMANAN PASSWORD:');
  console.log('   Password admin di-hash menggunakan algoritma Bcrypt (1-way encryption).');
  console.log('   Jika Anda lupa password akun admin tertentu, jalankan perintah reset:');
  console.log('   👉 npm run reset-admin <username> <password_baru>');
  console.log('   Contoh: npm run reset-admin admin admin123\n');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
