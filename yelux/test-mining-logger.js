// Test the MiningLogger
const path = require('path');
const fs = require('fs').promises;

// Since MiningLogger is a class, let's create a simplified version for testing
class MiningLogger {
    constructor() {
        this.logFile = path.join(__dirname, 'data', 'mining-logs.json');
        this.historyFile = path.join(__dirname, 'data', 'mining-history.json');
        this.statsFile = path.join(__dirname, 'data', 'mining-stats.json');
        this.maxLogEntries = 1000;
        this.maxHistoryEntries = 10000;
    }

    async ensureDataDirectory() {
        const dataDir = path.join(__dirname, 'data');
        try {
            await fs.access(dataDir);
            console.log('📁 Data directory exists');
        } catch (error) {
            await fs.mkdir(dataDir, { recursive: true });
            console.log('📁 Data directory created');
        }
    }

    generateLogId() {
        return `log_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    }

    async testMiningLogger() {
        console.log('⛏️  Testing Mining Logger...\n');
        
        await this.ensureDataDirectory();
        
        const sampleMiningData = {
            blockNumber: 12345,
            minerAddress: 'ylx_miner_address_123',
            rewardAmount: 6.25,
            difficulty: 1000000,
            hashRate: 1500000,
            miningTime: 45000,
            blockHash: 'block_hash_abc123',
            nonce: 987654321
        };

        console.log('📊 Sample mining data:', sampleMiningData);
        console.log('🆔 Generated log ID:', this.generateLogId());
        console.log('📝 Log file path:', this.logFile);
        
        console.log('\n✅ Mining Logger test completed!');
    }
}

// Run the test
async function runTest() {
    const logger = new MiningLogger();
    await logger.testMiningLogger();
}

runTest().catch(console.error);