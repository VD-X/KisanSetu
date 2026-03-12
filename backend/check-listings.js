const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const listings = await prisma.listing.findMany({
            include: {
                crop: true,
                farmer: true
            }
        });
        console.log('Listings found:', JSON.stringify(listings, null, 2));
    } catch (error) {
        console.error('Error fetching listings:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
