const cron = require('node-cron');
const marketPriceService = require('./marketPriceService');

/**
 * Initialize all cron jobs for the application
 */
const initCronJobs = () => {
    console.log('[Cron] Initializing background tasks...');

    // Schedule daily market price refresh at 4:30 AM IST
    // IST is UTC+5:30, so 4:30 AM IST = 11:00 PM UTC (previous day)
    // Format: minute hour day-of-month month day-of-week
    cron.schedule('30 4 * * *', async () => {
        try {
            console.log('[Cron] Triggering daily market price refresh at 4:30 AM IST');
            await marketPriceService.refreshAllPrices();
            console.log('[Cron] Daily market price refresh successful');
        } catch (error) {
            console.error('[Cron] Daily market price refresh failed:', error);
        }
    }, {
        scheduled: true,
        timezone: "Asia/Kolkata"
    });

    console.log('[Cron] Market price refresh scheduled for 04:30 AM IST daily');
};

module.exports = {
    initCronJobs
};
