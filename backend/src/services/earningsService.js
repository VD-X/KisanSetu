const defaultPrisma = require('../config/db');
const { creditWallet } = require('./walletService'); // Import walletService

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const safeNumber = (value, fallback = 0) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
};

const round2 = (n) => {
    const v = safeNumber(n, 0);
    return Math.round((v + Number.EPSILON) * 100) / 100;
};

const computeSurgeMultiplier = (at) => {
    const d = at instanceof Date ? at : new Date(at || Date.now());
    const hour = d.getHours();
    if ((hour >= 6 && hour <= 9) || (hour >= 17 && hour <= 20)) return 1.2;
    return 1;
};

const isTransientError = (error) => {
    const msg = String(error?.message || '').toLowerCase();
    const code = String(error?.code || '');
    if (code === 'P1001' || code === 'P1002' || code === 'P1008' || code === 'P1017') return true;
    if (msg.includes('timed out') || msg.includes('timeout')) return true;
    if (msg.includes('econnreset') || msg.includes('socket') || msg.includes('network')) return true;
    return false;
};

const computeEarningsFromDelivery = (delivery) => {
    const distance = safeNumber(delivery?.distance, 0);
    const pricePerKm = safeNumber(delivery?.pricePerKm, 0);
    // Use totalCost if available (which includes base price, etc.), else fallback to simple calc
    const baseAmount = delivery?.totalCost ? round2(delivery.totalCost) : round2(distance * pricePerKm);

    const rawSurgeMult = safeNumber(delivery?.surgeMultiplier, 0);
    const surgeMult = rawSurgeMult > 0 ? rawSurgeMult : computeSurgeMultiplier(delivery?.deliveryTimestamp || new Date());
    const surgeAmount = round2(baseAmount * (surgeMult - 1));

    const pickupTs = delivery?.pickupTimestamp ? new Date(delivery.pickupTimestamp) : null;
    const deliveryTs = delivery?.deliveryTimestamp ? new Date(delivery.deliveryTimestamp) : null;
    const durationMins = pickupTs && deliveryTs ? Math.max(0, Math.round((deliveryTs.getTime() - pickupTs.getTime()) / 60000)) : null;

    const timeRatePerMin = safeNumber(process.env.EARNINGS_TIME_RATE_PER_MIN || 0, 0);
    const timeAmount = durationMins !== null ? round2(durationMins * timeRatePerMin) : 0;

    const tipAmount = round2(safeNumber(delivery?.tip, 0));
    const amount = round2(baseAmount + surgeAmount + timeAmount + tipAmount);

    return {
        distance,
        pricePerKm,
        baseAmount,
        durationMins,
        timeAmount,
        surgeMult,
        surgeAmount,
        tipAmount,
        amount
    };
};

const emitEarningsUpdated = (io, transporterId, payload) => {
    if (!io || !transporterId) return;
    io.to(`user-${transporterId}`).emit('earnings:updated', payload);
    io.to(`user-${transporterId}`).emit('push:notification', {
        title: 'Earnings Updated',
        body: `₹${payload?.earning?.amount ?? payload?.amount ?? ''} added to your earnings.`,
        type: 'EARNINGS_UPDATED',
        timestamp: new Date().toISOString(),
        data: payload
    });

    // Create persistent notification record
    const amount = payload?.earning?.amount ?? payload?.amount ?? '';
    const PrismaClient = require('@prisma/client').PrismaClient;
    const prisma = new PrismaClient(); // Using a local instance or imported one
    // Note: In this file defaultPrisma is used at the top.

    const notificationPromise = defaultPrisma.notification.create({
        data: {
            userId: transporterId,
            title: '💰 Earnings Updated',
            message: `₹${amount} has been added to your earnings for a recently completed delivery.`,
            type: 'earnings_updated',
            deliveryId: payload?.earning?.deliveryId,
            createdAt: new Date()
        }
    }).catch(err => console.error('[Notification] Failed to create earnings notification:', err));
};

const createEarningsService = (prisma) => {
    const pendingRetries = new Map();

    const writeAudit = async (data) => {
        try {
            await prisma.earningAuditLog.create({ data });
        } catch (e) {
            console.error('earningAuditLog.create failed', e);
        }
    };

    const runAtomicCredit = async (deliveryId, attempt, io) => {
        const delivery = await prisma.delivery.findUnique({
            where: { id: deliveryId },
            select: {
                id: true,
                orderId: true, // Added orderId
                status: true,
                transporterId: true,
                distance: true,
                pricePerKm: true,
                pickupTimestamp: true,
                deliveryTimestamp: true,
                surgeMultiplier: true,
                deliveryTimestamp: true,
                surgeMultiplier: true,
                totalCost: true, // Added totalCost
                tip: true
            }
        });

        if (!delivery || !delivery.transporterId) {
            await writeAudit({
                deliveryId,
                transporterId: delivery?.transporterId || '000000000000000000000000',
                status: 'FAILED',
                attempt,
                error: 'Delivery not found or transporter not assigned'
            });
            return null;
        }

        if (String(delivery.status || '').toUpperCase() !== 'COMPLETED') {
            await writeAudit({
                deliveryId,
                transporterId: delivery.transporterId,
                status: 'FAILED',
                attempt,
                error: `Delivery not completed (status=${delivery.status})`
            });
            return null;
        }

        const breakdown = computeEarningsFromDelivery(delivery);

        try {
            const result = await prisma.$transaction(async (tx) => {
                const existing = await tx.earning.findUnique({ where: { deliveryId: delivery.id } });
                if (existing) {
                    return { earning: existing, credited: false };
                }

                const earning = await tx.earning.create({
                    data: {
                        deliveryId: delivery.id,
                        transporterId: delivery.transporterId,
                        distance: breakdown.distance,
                        pricePerKm: breakdown.pricePerKm,
                        amount: breakdown.amount,
                        baseAmount: breakdown.baseAmount,
                        durationMins: breakdown.durationMins,
                        timeAmount: breakdown.timeAmount,
                        surgeMult: breakdown.surgeMult,
                        surgeAmount: breakdown.surgeAmount,
                        tipAmount: breakdown.tipAmount
                    }
                });

                // Credit Transporter Wallet
                try {
                    await creditWallet(
                        delivery.transporterId,
                        breakdown.amount,
                        `Earnings for Delivery #${delivery.id.slice(-6)}`,
                        delivery.orderId,
                        io
                    );
                } catch (err) {
                    console.error("Failed to credit wallet in earnings service", err);
                    // Continue since earning record is created? 
                    // Or fail transaction? 
                    // If we fail, we won't record earning. Better to fail so we retry.
                    throw err;
                }

                await tx.transporterProfile.update({
                    where: { userId: delivery.transporterId },
                    data: { totalEarnings: { increment: breakdown.amount } }
                });

                return { earning, credited: true };
            });

            await writeAudit({
                deliveryId: delivery.id,
                transporterId: delivery.transporterId,
                status: result.credited ? 'SUCCESS' : 'DUPLICATE',
                amount: breakdown.amount,
                attempt,
                details: breakdown
            });

            emitEarningsUpdated(io, delivery.transporterId, { earning: result.earning, credited: result.credited });
            return result;
        } catch (error) {
            await writeAudit({
                deliveryId: delivery.id,
                transporterId: delivery.transporterId,
                status: 'FAILED',
                amount: breakdown.amount,
                attempt,
                error: String(error?.message || error),
                details: { code: error?.code }
            });
            throw error;
        }
    };

    const scheduleRetry = (deliveryId, nextAttempt, io) => {
        const key = `${deliveryId}`;
        if (pendingRetries.has(key)) return;
        const delayMs = Math.min(800, 100 * Math.pow(2, Math.max(0, nextAttempt - 1)));
        const timeout = setTimeout(async () => {
            pendingRetries.delete(key);
            try {
                await runAtomicCredit(deliveryId, nextAttempt, io);
            } catch (e) {
                const maxAttempts = Number(process.env.EARNINGS_MAX_RETRIES || 3);
                if (nextAttempt < maxAttempts && isTransientError(e)) {
                    scheduleRetry(deliveryId, nextAttempt + 1, io);
                    await writeAudit({
                        deliveryId,
                        transporterId: '000000000000000000000000',
                        status: 'RETRY_SCHEDULED',
                        attempt: nextAttempt + 1,
                        error: String(e?.message || e)
                    });
                }
            }
        }, delayMs);
        pendingRetries.set(key, timeout);
    };

    const triggerEarningsUpdateAfterCompletion = async (deliveryId, io) => {
        const maxAttempts = Number(process.env.EARNINGS_MAX_RETRIES || 3);
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const res = await runAtomicCredit(deliveryId, attempt, io);
                if (res) return res;
                return null;
            } catch (error) {
                if (attempt < maxAttempts && isTransientError(error)) {
                    await sleep(50);
                    continue;
                }
                if (isTransientError(error) && attempt >= maxAttempts) {
                    scheduleRetry(deliveryId, attempt + 1, io);
                }
                throw error;
            }
        }
        return null;
    };

    return { triggerEarningsUpdateAfterCompletion };
};

const defaultService = createEarningsService(defaultPrisma);

exports.createEarningsService = createEarningsService;
exports.computeEarningsFromDelivery = computeEarningsFromDelivery;
exports.triggerEarningsUpdateAfterCompletion = defaultService.triggerEarningsUpdateAfterCompletion;
