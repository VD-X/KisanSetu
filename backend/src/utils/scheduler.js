const marketPriceService = require('../services/marketPriceService');

const runDailyTasks = async () => {
    console.log(`[Scheduler] Running daily tasks at ${new Date().toISOString()}`);
    try {
        await marketPriceService.refreshAllPrices();
    } catch (error) {
        console.error('[Scheduler] Error running daily tasks:', error);
    }
};

const initScheduler = () => {
    console.log('[Scheduler] Initialized. Checking time every minute.');

    // Check every minute
    setInterval(() => {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();

        // Run at 03:00 AM
        if (hours === 3 && minutes === 0) {
            runDailyTasks();
        }
    }, 60 * 1000);
};

module.exports = { initScheduler };
