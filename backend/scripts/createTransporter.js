const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
    const email = 'transporter@kisan.com';
    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                role: 'TRANSPORTER',
                status: 'ACTIVE',
                transporterProfile: {
                    create: {
                        fullName: 'Test Transporter',
                        gender: 'Male',
                        phone: '9876543210',
                        address: '123 Transport Lane',
                        city: 'Mumbai',
                        state: 'Maharashtra',
                        pincode: '400001',
                        vehicleType: 'Truck',
                        vehicleNumber: 'MH-01-AB-1234',
                        capacity: 3000,
                        pricePerKm: 25,
                        approvalStatus: 'APPROVED'
                    }
                }
            },
            include: { transporterProfile: true }
        });

        console.log('Transporter created successfully:');
        console.log('Email:', user.email);
        console.log('Password:', password);
        console.log('ID:', user.id);

    } catch (e) {
        if (e.code === 'P2002') {
            console.log('Transporter already exists.');
        } else {
            console.error(e);
        }
    } finally {
        await prisma.$disconnect();
    }
}

main();
