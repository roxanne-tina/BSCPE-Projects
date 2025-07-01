const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class MiningLogger {
    constructor() {
        this.logFile = path.join(__dirname, 'data', 'mining-logs.json');
        this.historyFile = path.join(__dirname, 'data', 'mining-history.json');
        this.statsFile = path.join(__dirname, 'data', 'mining-stats.json');
        this.maxLogEntries = 1000;
        this.maxHistoryEntries = 10000;
        this.ensureDataDirectory();
    }

    async ensureDataDirectory() {
        const dataDir = path.join(__dirname, 'data');
        try {
            await fs.access(dataDir);
        } catch (error) {
            await fs.mkdir(dataDir, { recursive: true });
        }
    }

    async logMining(miningData) {
        try {
            const logEntry = {
                id: this.generateLogId(),
                timestamp: new Date().toISOString(),
                blockNumber: miningData.blockNumber,
                minerAddress: miningData.minerAddress,
                rewardAmount: miningData.rewardAmount,
                difficulty: miningData.difficulty,
                hashRate: miningData.hashRate || null,
                miningTime: miningData.miningTime || null,
                blockHash: miningData.blockHash,
                transactionHash: miningData.transactionHash || null,
                nonce: miningData.nonce || null,
                previousHash: miningData.previousHash || null,
                merkleRoot: miningData.merkleRoot || null,
                gasUsed: miningData.gasUsed || 0,
                status: 'confirmed'
            };

            await this.appendToLogFile(logEntry);
            await this.addToHistory(logEntry);
            await this.updateStats(logEntry);
            
            console.log(`⛏️  Mining logged: Block ${logEntry.blockNumber} - Reward: ${logEntry.rewardAmount} YLX`);
            return logEntry;
        } catch (error) {
            console.error('❌ Error logging mining event:', error);
            throw error;
        }
    }

    generateLogId() {
        return crypto.randomBytes(16).toString('hex');
    }

    async appendToLogFile(logEntry) {
        try {
            let logs = [];
            try {
                const data = await fs.readFile(this.logFile, 'utf8');
                logs = JSON.parse(data);
            } catch (error) {
                // File doesn't exist or is empty
            }

            logs.push(logEntry);
            
            // Keep only recent entries
            if (logs.length > this.maxLogEntries) {
                logs = logs.slice(-this.maxLogEntries);
            }

            await fs.writeFile(this.logFile, JSON.stringify(logs, null, 2));
        } catch (error) {
            console.error('Error writing to log file:', error);
        }
    }

    async addToHistory(logEntry) {
        try {
            let history = [];
            try {
                const data = await fs.readFile(this.historyFile, 'utf8');
                history = JSON.parse(data);
            } catch (error) {
                // File doesn't exist
            }

            history.push(logEntry);
            
            if (history.length > this.maxHistoryEntries) {
                history = history.slice(-this.maxHistoryEntries);
            }

            await fs.writeFile(this.historyFile, JSON.stringify(history, null, 2));
        } catch (error) {
            console.error('Error writing to history file:', error);
        }
    }

    async updateStats(logEntry) {
        try {
            let stats = {
                totalBlocks: 0,
                totalRewards: 0,
                averageHashRate: 0,
                averageMiningTime: 0,
                lastUpdated: null
            };

            try {
                const data = await fs.readFile(this.statsFile, 'utf8');
                stats = JSON.parse(data);
            } catch (error) {
                // File doesn't exist
            }

            stats.totalBlocks += 1;
            stats.totalRewards += logEntry.rewardAmount;
            stats.lastUpdated = new Date().toISOString();

            if (logEntry.hashRate) {
                stats.averageHashRate = ((stats.averageHashRate * (stats.totalBlocks - 1)) + logEntry.hashRate) / stats.totalBlocks;
            }

            if (logEntry.miningTime) {
                stats.averageMiningTime = ((stats.averageMiningTime * (stats.totalBlocks - 1)) + logEntry.miningTime) / stats.totalBlocks;
            }

            await fs.writeFile(this.statsFile, JSON.stringify(stats, null, 2));
        } catch (error) {
            console.error('Error updating stats:', error);
        }
    }

    async getRecentLogs(limit = 50) {
        try {
            const data = await fs.readFile(this.logFile, 'utf8');
            const logs = JSON.parse(data);
            return logs.slice(-limit).reverse();
        } catch (error) {
            return [];
        }
    }

    async getStats() {
        try {
            const data = await fs.readFile(this.statsFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            return {
                totalBlocks: 0,
                totalRewards: 0,
                averageHashRate: 0,
                averageMiningTime: 0,
                lastUpdated: null
            };
        }
    }
}

module.exports = MiningLogger;
