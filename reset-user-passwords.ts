require('dotenv').config({ path: '../.env' });
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function resetPasswords() {
  const emails = [
    'djfredmax221@outlook.com',
    'maxrick221@gmail.com'
  ];

  for (const email of emails) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.log(`User not found: ${email}`);
      continue;
    }
    
    const newPassword = await bcrypt.hash('Salone2025!', 10);
    await prisma.user.update({
      where: { email },
      data: { password: newPassword }
    });
    console.log(`Password reset for ${email} (id: ${user.id}) — new password: Salone2025!`);
  }

  await prisma.$disconnect();
}

resetPasswords().catch(e => { console.error(e); process.exit(1); });
