const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function seedAdmin() {
    const email = 'admin@kisan.com';
    const password = 'admin123';

    console.log(`Seeding admin user: ${email}`);

    try {
        // Check if exists
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            if (existing.role !== 'ADMIN') {
                await prisma.user.update({
                    where: { id: existing.id },
                    data: { role: 'ADMIN' }
                });
                console.log("Updated existing user to ADMIN role.");
            } else {
                console.log('Admin user already exists.');
            }
            return;
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                role: 'ADMIN',
                status: 'ACTIVE',
            }
        });

        console.log('Admin user created successfully:', user.id);
    } catch (error) {
        console.error("Error seeding admin:", error);
    }
}

seedAdmin()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
