const Block = require('./block');
const Transaction = require('./transaction');
const config = require('./config');
const crypto = require('crypto');

class Blockchain {
    constructor() {
        this.chain = [this.createGenesisBlock()];
        this.difficulty = config.INITIAL_DIFFICULTY;
        this.pendingTransactions = [];
        this.miningReward = config.MINING_REWARD;
        this.blockTime = config.BLOCK_TIME;
        this.difficultyAdjustmentInterval = config.DIFFICULTY_ADJUSTMENT_INTERVAL;
        this.networkHashRate = 0;
        this.totalSupply = 0;
        this.circulatingSupply = 0;
        
        // Performance optimizations
        this.blockCache = new Map();
        this.balanceCache = new Map();
        this.transactionPool = new Set();
        this.maxPendingTransactions = 1000;
    }

    /**
     * Create the genesis block (first block in the chain)
     */
    createGenesisBlock() {
        const genesisBlock = new Block(0, Date.now(), [], "0");
        genesisBlock.hash = genesisBlock.calculateHash();
        
        console.log('🎯 Genesis block created');
        return genesisBlock;
    }

    /**
     * Get the latest block in the chain
     */
    getLatestBlock() {
        return this.chain[this.chain.length - 1];
    }

    /**
     * Get a specific block by index
     */
    getBlock(index) {
        if (index >= 0 && index < this.chain.length) {
            return this.chain[index];
        }
        return null;
    }

    /**
     * Mine pending transactions into a new block
     */
    minePendingTransactions(miningRewardAddress) {
        try {
            // Create mining reward transaction
            const rewardTransaction = new Transaction(null, miningRewardAddress, this.miningReward, 0);
            this.pendingTransactions.push(rewardTransaction);

            // Create new block
            const block = new Block(
                this.chain.length,
                Date.now(),
                this.pendingTransactions,
                this.getLatestBlock().hash
            );

            // Set miner
            block.miner = miningRewardAddress;

            // Mine the block
            block.mineBlock(this.difficulty);

            console.log('✅ Block successfully mined!');
            
            // Add block to chain
            this.chain.push(block);

            // Update supply
            this.totalSupply += this.miningReward;
            this.circulatingSupply += this.miningReward;

            // Clear pending transactions
            this.pendingTransactions = [];

            // Clear balance cache
            this.balanceCache.clear();

            return block;
        } catch (error) {
            console.error('❌ Mining error:', error.message);
            throw error;
        }
    }

    /**
     * Create a new transaction
     */
    createTransaction(transaction) {
        // Validate transaction
        if (!transaction.isValid()) {
            throw new Error('Cannot add invalid transaction to chain');
        }

        // Check if sender has enough balance
        if (transaction.fromAddress !== null) {
            const balance = this.getBalance(transaction.fromAddress);
            const totalRequired = transaction.amount + transaction.fee;
            
            if (balance < totalRequired) {
                throw new Error('Not enough balance');
            }
        }

        // Add to pending transactions
        this.pendingTransactions.push(transaction);
        this.transactionPool.add(transaction.hash);

        console.log('✅ Transaction added to pending pool');
    }

    /**
     * Get balance for a given address
     */
    getBalance(address) {
        // Check cache first
        if (this.balanceCache.has(address)) {
            return this.balanceCache.get(address);
        }

        let balance = 0;

        // Go through all blocks and transactions
        for (const block of this.chain) {
            for (const trans of block.transactions) {
                // If address is sender, subtract amount and fee
                if (trans.fromAddress === address) {
                    balance -= trans.amount;
                    balance -= trans.fee;
                }

                // If address is receiver, add amount
                if (trans.toAddress === address) {
                    balance += trans.amount;
                }
            }
        }

        // Cache the result
        this.balanceCache.set(address, balance);
        return balance;
    }

    /**
     * Get all transactions for a given address
     */
    getAllTransactionsForWallet(address) {
        const txs = [];

        for (const block of this.chain) {
            for (const tx of block.transactions) {
                if (tx.fromAddress === address || tx.toAddress === address) {
                    txs.push({
                        ...tx,
                        blockIndex: block.index,
                        blockTimestamp: block.timestamp
                    });
                }
            }
        }

        return txs;
    }

    /**
     * Validate the entire blockchain
     */
    isChainValid() {
        for (let i = 1; i < this.chain.length; i++) {
            const currentBlock = this.chain[i];
            const previousBlock = this.chain[i - 1];

            // Check if current block is valid
            if (!currentBlock.hasValidTransactions()) {
                console.error('Invalid transactions in block', i);
                return false;
            }

            // Check if hash is correct
            if (currentBlock.hash !== currentBlock.calculateHash()) {
                console.error('Invalid hash in block', i);
                return false;
            }

            // Check if block points to previous block
            if (currentBlock.previousHash !== previousBlock.hash) {
                console.error('Invalid previous hash in block', i);
                return false;
            }
        }

        return true;
    }

    /**
     * Get blockchain statistics
     */
    getStats() {
        return {
            totalBlocks: this.chain.length,
            difficulty: this.difficulty,
            pendingTransactions: this.pendingTransactions.length,
            miningReward: this.miningReward,
            totalSupply: this.totalSupply,
            circulatingSupply: this.circulatingSupply,
            networkHashRate: this.networkHashRate,
            latestBlock: this.getLatestBlock().getSummary()
        };
    }

    /**
     * Adjust mining difficulty
     */
    adjustDifficulty() {
        if (this.chain.length % this.difficultyAdjustmentInterval !== 0) {
            return;
        }

        const lastAdjustmentBlock = this.chain[this.chain.length - this.difficultyAdjustmentInterval];
        const timeExpected = this.blockTime * this.difficultyAdjustmentInterval;
        const timeTaken = this.getLatestBlock().timestamp - lastAdjustmentBlock.timestamp;

        if (timeTaken < timeExpected / 2) {
            this.difficulty++;
            console.log(`⬆️ Difficulty increased to ${this.difficulty}`);
        } else if (timeTaken > timeExpected * 2) {
            this.difficulty = Math.max(1, this.difficulty - 1);
            console.log(`⬇️ Difficulty decreased to ${this.difficulty}`);
        }
    }
}

module.exports = Blockchain;
