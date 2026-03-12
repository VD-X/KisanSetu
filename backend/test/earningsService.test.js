const test = require('node:test');
const assert = require('node:assert/strict');

const { computeEarningsFromDelivery, createEarningsService } = require('../src/services/earningsService');

const makeIoMock = () => {
    const calls = [];
    return {
        calls,
        to(room) {
            return {
                emit(event, payload) {
                    calls.push({ room, event, payload });
                }
            };
        }
    };
};

test('computeEarningsFromDelivery includes distance, time, surge, and tips', async () => {
    const prev = process.env.EARNINGS_TIME_RATE_PER_MIN;
    process.env.EARNINGS_TIME_RATE_PER_MIN = '1';
    try {
        const pickup = new Date('2026-01-01T10:00:00.000Z');
        const delivered = new Date('2026-01-01T10:30:00.000Z');

        const result = computeEarningsFromDelivery({
            distance: 10,
            pricePerKm: 5,
            surgeMultiplier: 1.5,
            tip: 20,
            pickupTimestamp: pickup,
            deliveryTimestamp: delivered
        });

        assert.equal(result.baseAmount, 50);
        assert.equal(result.surgeMult, 1.5);
        assert.equal(result.surgeAmount, 25);
        assert.equal(result.durationMins, 30);
        assert.equal(result.timeAmount, 30);
        assert.equal(result.tipAmount, 20);
        assert.equal(result.amount, 125);
    } finally {
        process.env.EARNINGS_TIME_RATE_PER_MIN = prev;
    }
});

test('triggerEarningsUpdateAfterCompletion credits earnings and updates balance once', async () => {
    const io = makeIoMock();
    const state = {
        earning: null,
        totalEarnings: 0,
        audits: [],
        lastUpdateArgs: null
    };

    const prisma = {
        delivery: {
            findUnique: async () => ({
                id: 'delivery1',
                status: 'COMPLETED',
                transporterId: 'transporter1',
                distance: 10,
                pricePerKm: 5,
                pickupTimestamp: new Date('2026-01-01T10:00:00.000Z'),
                deliveryTimestamp: new Date('2026-01-01T10:10:00.000Z'),
                surgeMultiplier: 1,
                tip: 0
            })
        },
        earningAuditLog: {
            create: async ({ data }) => {
                state.audits.push(data);
            }
        },
        $transaction: async (fn) => fn({
            earning: {
                findUnique: async () => state.earning,
                create: async ({ data }) => {
                    state.earning = { id: 'earning1', ...data };
                    return state.earning;
                }
            },
            transporterProfile: {
                update: async (args) => {
                    state.lastUpdateArgs = args;
                    state.totalEarnings += Number(args?.data?.totalEarnings?.increment || 0);
                    return { userId: 'transporter1', totalEarnings: state.totalEarnings };
                }
            }
        })
    };

    const service = createEarningsService(prisma);
    const res = await service.triggerEarningsUpdateAfterCompletion('delivery1', io);

    assert.ok(res);
    assert.equal(res.credited, true);
    assert.equal(state.lastUpdateArgs?.data?.totalEarnings?.increment, 50);
    assert.equal(state.totalEarnings, 50);
    assert.equal(state.lastUpdateArgs?.where?.userId, 'transporter1');
    assert.equal(io.calls.some(c => c.event === 'earnings:updated' && c.room === 'user-transporter1'), true);
    assert.equal(state.audits.some(a => a.status === 'SUCCESS'), true);
});

test('triggerEarningsUpdateAfterCompletion is idempotent for duplicate credits', async () => {
    const io = makeIoMock();
    const state = {
        earning: { id: 'earning-existing', deliveryId: 'delivery1', transporterId: 'transporter1', amount: 50 },
        totalEarnings: 0
    };

    const prisma = {
        delivery: {
            findUnique: async () => ({
                id: 'delivery1',
                status: 'COMPLETED',
                transporterId: 'transporter1',
                distance: 10,
                pricePerKm: 5,
                pickupTimestamp: null,
                deliveryTimestamp: null,
                surgeMultiplier: 1,
                tip: 0
            })
        },
        earningAuditLog: { create: async () => null },
        $transaction: async (fn) => fn({
            earning: {
                findUnique: async () => state.earning,
                create: async () => {
                    throw new Error('should not create');
                }
            },
            transporterProfile: {
                update: async () => {
                    state.totalEarnings += 999;
                }
            }
        })
    };

    const service = createEarningsService(prisma);
    const res = await service.triggerEarningsUpdateAfterCompletion('delivery1', io);

    assert.ok(res);
    assert.equal(res.credited, false);
    assert.equal(state.totalEarnings, 0);
});

test('triggerEarningsUpdateAfterCompletion retries transient failures', async () => {
    const io = makeIoMock();
    const state = { attempts: 0, created: false, totalEarnings: 0 };

    const prisma = {
        delivery: {
            findUnique: async () => ({
                id: 'delivery1',
                status: 'COMPLETED',
                transporterId: 'transporter1',
                distance: 10,
                pricePerKm: 5,
                pickupTimestamp: null,
                deliveryTimestamp: null,
                surgeMultiplier: 1,
                tip: 0
            })
        },
        earningAuditLog: { create: async () => null },
        $transaction: async (fn) => {
            state.attempts += 1;
            if (state.attempts === 1) {
                const err = new Error('timeout');
                err.code = 'P1001';
                throw err;
            }
            return fn({
                earning: {
                    findUnique: async () => (state.created ? { id: 'earning1' } : null),
                    create: async ({ data }) => {
                        state.created = true;
                        return { id: 'earning1', ...data };
                    }
                },
                transporterProfile: {
                    update: async ({ data }) => {
                        state.totalEarnings += data.totalEarnings.increment;
                        return { userId: 'transporter1', totalEarnings: state.totalEarnings };
                    }
                }
            });
        }
    };

    const service = createEarningsService(prisma);
    const res = await service.triggerEarningsUpdateAfterCompletion('delivery1', io);
    assert.ok(res);
    assert.equal(state.attempts >= 2, true);
    assert.equal(state.totalEarnings, 50);
});

test('concurrent completion calls credit only once (unique deliveryId)', async () => {
    const io = makeIoMock();
    const state = { earning: null, totalEarnings: 0, createCalls: 0 };

    const prisma = {
        delivery: {
            findUnique: async () => ({
                id: 'delivery1',
                status: 'COMPLETED',
                transporterId: 'transporter1',
                distance: 10,
                pricePerKm: 5,
                pickupTimestamp: null,
                deliveryTimestamp: null,
                surgeMultiplier: 1,
                tip: 0
            })
        },
        earningAuditLog: { create: async () => null },
        $transaction: async (fn) => fn({
            earning: {
                findUnique: async () => state.earning,
                create: async ({ data }) => {
                    state.createCalls += 1;
                    if (state.createCalls >= 2) {
                        const err = new Error('Unique constraint failed');
                        err.code = 'P2002';
                        throw err;
                    }
                    state.earning = { id: 'earning1', ...data };
                    return state.earning;
                }
            },
            transporterProfile: {
                update: async ({ data }) => {
                    state.totalEarnings += data.totalEarnings.increment;
                    return { userId: 'transporter1', totalEarnings: state.totalEarnings };
                }
            }
        })
    };

    const service = createEarningsService(prisma);
    await Promise.allSettled([
        service.triggerEarningsUpdateAfterCompletion('delivery1', io),
        service.triggerEarningsUpdateAfterCompletion('delivery1', io)
    ]);

    assert.equal(state.totalEarnings, 50);
});
