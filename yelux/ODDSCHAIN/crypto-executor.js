const path = require('path');
const fs = require('fs').promises;

// Import helper utilities
class HelperUtils {
    static formatAmount(amount) {
        return parseFloat(amount).toFixed(8);
    }

    static toSatoshis(amount) {
        return Math.round(parseFloat(amount) * 100000000);
    }

    static fromSatoshis(satoshis) {
        return (satoshis / 100000000).toFixed(8);
    }

    static generateTransactionId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2);
        return `tx_${timestamp}_${random}`;
    }

    static generateBlockId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2);
        return `block_${timestamp}_${random}`;
    }

    static calculateTransactionFee(transaction, feePerByte = 0.00000001) {
        const transactionSize = JSON.stringify(transaction).length;
        const baseFee = 0.00001000;
        const sizeFee = transactionSize * feePerByte;
        return Math.max(baseFee, sizeFee);
    }

    static calculateBlockReward(blockHeight) {
        const halvingInterval = 210000;
        const initialReward = 50;
        const halvings = Math.floor(blockHeight / halvingInterval);
        return initialReward / Math.pow(2, halvings);
    }

    static calculateNextDifficulty(blocks, targetBlockTime = 600) {
        if (blocks.length < 2016) return 1;
        const lastBlock = blocks[blocks.length - 1];
        const firstBlock = blocks[blocks.length - 2016];
        const actualTime = new Date(lastBlock.timestamp) - new Date(firstBlock.timestamp);
        const expectedTime = 2016 * targetBlockTime * 1000;
        const ratio = actualTime / expectedTime;
        return Math.max(0.25, Math.min(4, ratio));
    }
}

// Mining Logger implementation
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
        } catch (error) {
            await fs.mkdir(dataDir, { recursive: true });
        }
    }

    generateLogId() {
        return `log_${Date.now()}_${Math.random().toString(36).substring(2)}`;
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
                status: 'confirmed'
            };

            await this.ensureDataDirectory();
            console.log(`⛏️  Mining logged: Block ${logEntry.blockNumber} - Reward: ${logEntry.rewardAmount} YLX`);
            return logEntry;
        } catch (error) {
            console.error('❌ Error logging mining event:', error);
            throw error;
        }
    }
}

// Simple Blockchain implementation
class YeluxBlockchain {
    constructor() {
        this.chain = [];
        this.difficulty = 4;
        this.miningReward = 50;
        this.pendingTransactions = [];
        this.miningLogger = new MiningLogger();
    }

    createGenesisBlock() {
        const genesisBlock = {
            index: 0,
            timestamp: new Date().toISOString(),
            transactions: [],
            previousHash: "0",
            hash: this.calculateHash(0, new Date().toISOString(), [], "0", 0),
            nonce: 0
        };
        return genesisBlock;
    }

    calculateHash(index, timestamp, transactions, previousHash, nonce) {
        const crypto = require('crypto');
        return crypto
            .createHash('sha256')
            .update(index + timestamp + JSON.stringify(transactions) + previousHash + nonce)
            .digest('hex');
    }

    getLatestBlock() {
        return this.chain[this.chain.length - 1];
    }

    addTransaction(transaction) {
        transaction.id = HelperUtils.generateTransactionId();
        transaction.fee = HelperUtils.calculateTransactionFee(transaction);
        this.pendingTransactions.push(transaction);
        console.log(`💸 Transaction added: ${transaction.from} → ${transaction.to} (${transaction.amount} YLX)`);
    }

    async minePendingTransactions(miningRewardAddress) {
        console.log('\n⛏️  Starting mining process...');
        
        const rewardTransaction = {
            from: null,
            to: miningRewardAddress,
            amount: this.miningReward,
            type: 'mining_reward'
        };
        
        this.pendingTransactions.push(rewardTransaction);
        
        const block = {
            index: this.chain.length,
            timestamp: new Date().toISOString(),
            transactions: this.pendingTransactions,
            previousHash: this.getLatestBlock().hash,
            nonce: 0
        };

        const startTime = Date.now();
        block.hash = this.mineBlock(block);
        const miningTime = Date.now() - startTime;

        this.chain.push(block);

        // Log mining activity
        await this.miningLogger.logMining({
            blockNumber: block.index,
            minerAddress: miningRewardAddress,
            rewardAmount: this.miningReward,
            difficulty: this.difficulty,
            miningTime: miningTime,
            blockHash: block.hash,
            nonce: block.nonce
        });

        this.pendingTransactions = [];
        console.log(`✅ Block mined successfully! Hash: ${block.hash.substring(0, 16)}...`);
        return block;
    }

    mineBlock(block) {
        const target = Array(this.difficulty + 1).join("0");
        
        while (block.hash.substring(0, this.difficulty) !== target) {
            block.nonce++;
            block.hash = this.calculateHash(
                block.index,
                block.timestamp,
                block.transactions,
                block.previousHash,
                block.nonce
            );
        }
        
        console.log(`🎯 Block mined with nonce ${block.nonce}: ${block.hash}`);
        return block.hash;
    }

    getBalance(address) {
        let balance = 0;

        for (const block of this.chain) {
            for (const trans of block.transactions) {
                if (trans.from === address) {
                    balance -= parseFloat(trans.amount);
                    balance -= parseFloat(trans.fee || 0);
                }
                if (trans.to === address) {
                    balance += parseFloat(trans.amount);
                }
            }
        }

        return HelperUtils.formatAmount(balance);
    }

    isChainValid() {
        for (let i = 1; i < this.chain.length; i++) {
            const currentBlock = this.chain[i];
            const previousBlock = this.chain[i - 1];

            if (currentBlock.hash !== this.calculateHash(
                currentBlock.index,
                currentBlock.timestamp,
                currentBlock.transactions,
                currentBlock.previousHash,
                currentBlock.nonce
            )) {
                return false;
            }

            if (currentBlock.previousHash !== previousBlock.hash) {
                return false;
            }
        }
        return true;
    }

    displayBlockchain() {
        console.log('\n📊 YELUX BLOCKCHAIN STATUS:');
        console.log('═'.repeat(60));
        console.log(`Total Blocks: ${this.chain.length}`);
        console.log(`Difficulty: ${this.difficulty}`);
        console.log(`Mining Reward: ${this.miningReward} YLX`);
        console.log(`Pending Transactions: ${this.pendingTransactions.length}`);
        console.log(`Chain Valid: ${this.isChainValid() ? '✅' : '❌'}`);
        console.log('═'.repeat(60));
    }
}

// Main execution function
async function executeCrypto() {
    console.log('🚀 YELUX CRYPTOCURRENCY SYSTEM STARTING...\n');
    
    // Initialize blockchain
    const yeluxCoin = new YeluxBlockchain();
    yeluxCoin.chain.push(yeluxCoin.createGenesisBlock());
    
    console.log('🔗 Genesis block created!');
    
    // Create some sample addresses
    const addresses = {
        alice: 'ylx_alice_' + Math.random().toString(36).substring(2, 10),
        bob: 'ylx_bob_' + Math.random().toString(36).substring(2, 10),
        miner: 'ylx_miner_' + Math.random().toString(36).substring(2, 10)
    };
    
    console.log('\n👥 Created addresses:');
    console.log(`Alice: ${addresses.alice}`);
    console.log(`Bob: ${addresses.bob}`);
    console.log(`Miner: ${addresses.miner}`);
    
    // Mine first block to give miner some coins
    console.log('\n🎯 Mining first block...');
    await yeluxCoin.minePendingTransactions(addresses.miner);
    
    // Add some transactions
    console.log('\n💰 Adding transactions...');
    yeluxCoin.addTransaction({
        from: addresses.miner,
        to: addresses.alice,
        amount: 10
    });
    
    yeluxCoin.addTransaction({
        from: addresses.miner,
        to: addresses.bob,
        amount: 5
    });
    
    // Mine second block
    console.log('\n🎯 Mining second block...');
    await yeluxCoin.minePendingTransactions(addresses.miner);
    
    // Add more transactions
    yeluxCoin.addTransaction({
        from: addresses.alice,
        to: addresses.bob,
        amount: 3
    });
    
    // Mine third block
    console.log('\n🎯 Mining third block...');
    await yeluxCoin.minePendingTransactions(addresses.miner);
    
    // Display final results
    yeluxCoin.displayBlockchain();
    
    console.log('\n💳 FINAL BALANCES:');
    console.log(`Alice: ${yeluxCoin.getBalance(addresses.alice)} YLX`);
    console.log(`Bob: ${yeluxCoin.getBalance(addresses.bob)} YLX`);
    console.log(`Miner: ${yeluxCoin.getBalance(addresses.miner)} YLX`);
    
    console.log('\n🎉 YELUX CRYPTOCURRENCY EXECUTION COMPLETED!');
    
    return yeluxCoin;
}

// Execute the crypto system
executeCrypto().catch(console.error);