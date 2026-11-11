const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const readline = require('readline');
const crypto = require('crypto');

const prisma = new PrismaClient();

async function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  let username = args[0] || process.env.ADMIN_USERNAME;
  let password = args[1] || process.env.ADMIN_PASSWORD;
  let name = args[2] || process.env.ADMIN_NAME;

  if (!username) {
    username = await prompt('Masukkan Username Admin: ');
  }
  if (!password) {
    const generated = `Adm#${crypto.randomBytes(4).toString('hex')}!`;
    const inputPass = await prompt(`Masukkan Password (tekan Enter untuk acak: ${generated}): `);
    password = inputPass || generated;
  }
  if (!name) {
    const inputName = await prompt('Masukkan Nama Lengkap Admin (Default: Administrator): ');
    name = inputName || 'Administrator';
  }

  if (!username || !password) {
    console.error('❌ Username dan password tidak boleh kosong.');
    process.exit(1);
  }

  const salt = await bcrypt.genSalt(10);
  const password_hash = await bcrypt.hash(password, salt);

  const existing = await prisma.user.findUnique({
    where: { username },
  });

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        name,
        password_hash,
        role: 'Admin',
        status: 'ACTIVE',
      },
    });
    console.log(`\n✅ Admin "${username}" berhasil diperbarui!`);
  } else {
    await prisma.user.create({
      data: {
        name,
        username,
        password_hash,
        role: 'Admin',
        status: 'ACTIVE',
      },
    });
    console.log(`\n✅ Admin "${username}" berhasil dibuat!`);
  }

  console.log('======================================================');
  console.log(`   Nama     : ${name}`);
  console.log(`   Username : ${username}`);
  console.log(`   Password : ${password}`);
  console.log('======================================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Error creating admin:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
