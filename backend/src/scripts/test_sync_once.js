const { pool } = require('../config/db');
const backgroundSync = require('../services/backgroundSync');

async function testSync() {
    try {
        console.log('🚀 Starting manual sync test...');
        await backgroundSync.syncOnce();
        console.log('✅ Manual sync test completed');
    } catch (error) {
        console.error('❌ Manual sync test failed:', error);
    } finally {
        await pool.end();
    }
}

testSync();
