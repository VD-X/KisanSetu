const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function run() {
    const newPassword = 'K1s@nSetu$Admin2026';
    const hash = await bcrypt.hash(newPassword, 10);

    const user = await prisma.user.update({
        where: { email: 'admin@kisan.com' },
        data: { password: hash }
    });

    console.log('✅ Password updated successfully for:', user.email);
    await prisma.$disconnect();
}

run().catch(e => { console.error(e); process.exit(1); });
