const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const orders = await prisma.order.findMany();
        console.log('Orders found:', orders.length);
        if (orders.length > 0) {
            console.log('Sample order:', JSON.stringify(orders[0], null, 2));
        }
    } catch (error) {
        console.error('Error fetching orders:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
