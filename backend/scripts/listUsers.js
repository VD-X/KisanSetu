const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const transporters = await prisma.user.findMany({
            where: { role: 'TRANSPORTER' },
            include: { transporterProfile: true }
        });

        if (transporters.length === 0) {
            console.log('No transporters found.');
        } else {
            console.log(`Found ${transporters.length} transporters:`);
            transporters.forEach(t => {
                console.log(`Email: ${t.email}, Status: ${t.status}`);
                console.log('Profile:', t.transporterProfile);
            });
        }
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
