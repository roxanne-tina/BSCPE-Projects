const crypto = require('crypto');

class Block {
    constructor(index, timestamp, transactions, previousHash) {
        this.index = index;
        this.timestamp = timestamp;
        this.transactions = transactions;
        this.previousHash = previousHash;
        this.hash = '';
        this.nonce = 0;
        this.miner = '';
    }

    /**
     * Calculate hash for this block
     */
    calculateHash() {
        return crypto
            .createHash('sha256')
            .update(
                this.index +
                this.previousHash +
                this.timestamp +
                JSON.stringify(this.transactions) +
                this.nonce +
                this.miner
            )
            .digest('hex');
    }

    /**
     * Mine block with given difficulty
     */
    mineBlock(difficulty) {
        const target = Array(difficulty + 1).join("0");
        const startTime = Date.now();
        
        console.log(`⛏️ Mining block ${this.index} with difficulty ${difficulty}...`);
        
        while (this.hash.substring(0, difficulty) !== target) {
            this.nonce++;
            this.hash = this.calculateHash();
            
            // Log progress every 100000 attempts
            if (this.nonce % 100000 === 0) {
                console.log(`Mining attempt: ${this.nonce}, Hash: ${this.hash.substring(0, 10)}...`);
            }
        }

        const endTime = Date.now();
        const miningTime = (endTime - startTime) / 1000;
        
        console.log(`✅ Block ${this.index} mined successfully!`);
        console.log(`Hash: ${this.hash}`);
        console.log(`Nonce: ${this.nonce}`);
        console.log(`Mining time: ${miningTime}s`);
        console.log(`Hash rate: ${Math.round(this.nonce / miningTime)} H/s`);
    }

    /**
     * Validate all transactions in this block
     */
    hasValidTransactions() {
        for (const tx of this.transactions) {
            if (!tx.isValid()) {
                console.error('Invalid transaction found:', tx);
                return false;
            }
        }
        return true;
    }

    /**
     * Get block size in bytes (approximate)
     */
    getSize() {
        return JSON.stringify(this).length;
    }

    /**
     * Get total transaction fees in this block
     */
    getTotalFees() {
        return this.transactions.reduce((total, tx) => total + (tx.fee || 0), 0);
    }

    /**
     * Get total transaction amount in this block
     */
    getTotalAmount() {
        return this.transactions.reduce((total, tx) => total + tx.amount, 0);
    }

    /**
     * Get block summary
     */
    getSummary() {
        return {
            index: this.index,
            hash: this.hash,
            previousHash: this.previousHash,
            timestamp: this.timestamp,
            transactionCount: this.transactions.length,
            totalAmount: this.getTotalAmount(),
            totalFees: this.getTotalFees(),
            size: this.getSize(),
            miner: this.miner,
            nonce: this.nonce
        };
    }
}

module.exports = Block;