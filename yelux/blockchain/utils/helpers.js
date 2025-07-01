const fs = require('fs').promises;
const path = require('path');

class HelperUtils {
    // Format amount to 8 decimal places
    static formatAmount(amount) {
        return parseFloat(amount).toFixed(8);
    }

    // Convert amount to satoshis (smallest unit)
    static toSatoshis(amount) {
        return Math.round(parseFloat(amount) * 100000000);
    }

    // Convert satoshis to YLX
    static fromSatoshis(satoshis) {
        return (satoshis / 100000000).toFixed(8);
    }

    // Generate unique transaction ID
    static generateTransactionId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2);
        return `tx_${timestamp}_${random}`;
    }

    // Generate unique block ID
    static generateBlockId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2);
        return `block_${timestamp}_${random}`;
    }

    // Calculate transaction fee
    static calculateTransactionFee(transaction, feePerByte = 0.00000001) {
        const transactionSize = JSON.stringify(transaction).length;
        const baseFee = 0.00001000;
        const sizeFee = transactionSize * feePerByte;
        return Math.max(baseFee, sizeFee);
    }

    // Calculate block reward based on height
    static calculateBlockReward(blockHeight) {
        const halvingInterval = 210000;
        const initialReward = 50;
        const halvings = Math.floor(blockHeight / halvingInterval);
        return initialReward / Math.pow(2, halvings);
    }

    // Calculate next difficulty adjustment
    static calculateNextDifficulty(blocks, targetBlockTime = 600) {
        if (blocks.length < 2016) return 1;

        const lastBlock = blocks[blocks.length - 1];
        const firstBlock = blocks[blocks.length - 2016];
        
        const actualTime = new Date(lastBlock.timestamp) - new Date(firstBlock.timestamp);
        const expectedTime = 2016 * targetBlockTime * 1000; // Convert to milliseconds
        
        const ratio = actualTime / expectedTime;
        const newDifficulty = Math.max(1, Math.min(lastBlock.difficulty * ratio, lastBlock.difficulty * 4));
        
        return Math.round(newDifficulty);
    }

    // Format timestamp to readable string
    static formatTimestamp(timestamp) {
        return new Date(timestamp).toLocaleString();
    }

    // Calculate time difference in human readable format
    static getTimeDifference(timestamp1, timestamp2) {
        const diff = Math.abs(new Date(timestamp1) - new Date(timestamp2));
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
        if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
        if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''}`;
        return `${seconds} second${seconds > 1 ? 's' : ''}`;
    }

    // Generate random string
    static generateRandomString(length = 10) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    // Deep clone object
    static deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    // Merge objects
    static mergeObjects(target, source) {
        const result = { ...target };
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this.mergeObjects(result[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }
        return result;
    }

    // Validate JSON string
    static isValidJSON(str) {
        try {
            JSON.parse(str);
            return true;
        } catch {
            return false;
        }
    }

    // File operations
    static async fileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    static async createDirectory(dirPath) {
        try {
            await fs.mkdir(dirPath, { recursive: true });
            return true;
        } catch (error) {
            console.error('Error creating directory:', error);
            return false;
        }
    }

    static async readJSONFile(filePath) {
        try {
            const data = await fs.readFile(filePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Error reading JSON file:', error);
            return null;
        }
    }

    static async writeJSONFile(filePath, data) {
        try {
            await fs.writeFile(filePath, JSON.stringify(data, null, 2));
            return true;
        } catch (error) {
            console.error('Error writing JSON file:', error);
            return false;
        }
    }

    // Array utilities
    static chunk(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }

    static shuffle(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    // Network utilities
    static isValidIP(ip) {
        const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        return ipv4Regex.test(ip);
    }

    static isValidPort(port) {
        return Number.isInteger(port) && port >= 1 && port <= 65535;
    }

    // Performance utilities
    static measureExecutionTime(func) {
        return async function(...args) {
            const start = process.hrtime.bigint();
            const result = await func.apply(this, args);
            const end = process.hrtime.bigint();
            const executionTime = Number(end - start) / 1000000; // Convert to milliseconds
            
            console.log(`Function ${func.name} executed in ${executionTime.toFixed(2)}ms`);
            return result;
        };
    }

    // Memory usage
    static getMemoryUsage() {
        const usage = process.memoryUsage();
        return {
            rss: Math.round(usage.rss / 1024 / 1024 * 100) / 100,
            heapTotal: Math.round(usage.heapTotal / 1024 / 1024 * 100) / 100,
            heapUsed: Math.round(usage.heapUsed / 1024 / 1024 * 100) / 100,
            external: Math.round(usage.external / 1024 / 1024 * 100) / 100
        };
    }

    // Rate limiting
    static createRateLimiter(maxRequests, windowMs) {
        const requests = new Map();
        
        return (identifier) => {
            const now = Date.now();
            const windowStart = now - windowMs;
            
            if (!requests.has(identifier)) {
                requests.set(identifier, []);
            }
            
            const userRequests = requests.get(identifier);
            const validRequests = userRequests.filter(time => time > windowStart);
            
            if (validRequests.length >= maxRequests) {
                return false;
            }
            
            validRequests.push(now);
            requests.set(identifier, validRequests);
            return true;
        };
    }

    // Retry mechanism
    static async retry(func, maxAttempts = 3, delay = 1000) {
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return await func();
            } catch (error) {
                if (attempt === maxAttempts) {
                    throw error;
                }
                await this.sleep(delay * attempt);
            }
        }
    }

    // Sleep utility
    static sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Convert bytes to human readable format
    static formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
        
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    // Hash rate formatting
    static formatHashRate(hashRate) {
        const units = ['H/s', 'KH/s', 'MH/s', 'GH/s', 'TH/s', 'PH/s'];
        let unitIndex = 0;
        
        while (hashRate >= 1000 && unitIndex < units.length - 1) {
            hashRate /= 1000;
            unitIndex++;
        }
        
        return `${hashRate.toFixed(2)} ${units[unitIndex]}`;
    }

    // Generate QR code data for address
    static generateQRData(address, amount = null, message = null) {
        let qrData = `yelux:${address}`;
        const params = [];
        
        if (amount) params.push(`amount=${amount}`);
        if (message) params.push(`message=${encodeURIComponent(message)}`);
        
        if (params.length > 0) {
            qrData += '?' + params.join('&');
        }
        
        return qrData;
    }

    // Validate and parse QR code data
    static parseQRData(qrData) {
        try {
            const url = new URL(qrData);
            if (url.protocol !== 'yelux:') {
                throw new Error('Invalid protocol');
            }
            
            return {
                address: url.pathname,
                amount: url.searchParams.get('amount'),
                message: url.searchParams.get('message')
            };
        } catch (error) {
            return null;
        }
    }

    // Environment detection
    static isDevelopment() {
        return process.env.NODE_ENV === 'development';
    }

    static isProduction() {
        return process.env.NODE_ENV === 'production';
    }

    static isTest() {
        return process.env.NODE_ENV === 'test';
    }
}

module.exports = HelperUtils;
