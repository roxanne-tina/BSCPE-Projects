const express = require('express');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs').promises;

class HelperUtils {
    static formatAmount(amount) {
        return parseFloat(amount || 0).toFixed(8);
    }

    static toSatoshis(amount) {
        return Math.round(parseFloat(amount || 0) * 100000000);
    }

    static fromSatoshis(satoshis) {
        return ((satoshis || 0) / 100000000).toFixed(8);
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
}

class YeluxBlockchain {
    constructor() {
        this.chain = [];
        this.difficulty = 2; // Reduced for faster mining
        this.miningReward = 50;
        this.pendingTransactions = [];
        this.initializeBlockchain();
    }

    initializeBlockchain() {
        if (this.chain.length === 0) {
            this.chain.push(this.createGenesisBlock());
            console.log('🎯 Genesis block created');
        }
    }

    createGenesisBlock() {
        const genesisBlock = {
            index: 0,
            timestamp: new Date().toISOString(),
            transactions: [],
            previousHash: "0",
            nonce: 0
        };
        
        genesisBlock.hash = this.calculateHash(genesisBlock);
        return genesisBlock;
    }

    calculateHash(block) {
        const data = (block.index || 0).toString() + 
                    (block.timestamp || '') + 
                    JSON.stringify(block.transactions || []) + 
                    (block.previousHash || '') + 
                    (block.nonce || 0).toString();
        
        return crypto.createHash('sha256').update(data).digest('hex');
    }

    getLatestBlock() {
        return this.chain[this.chain.length - 1];
    }

    addTransaction(transaction) {
        if (!transaction.from || !transaction.to || !transaction.amount) {
            throw new Error('Invalid transaction data');
        }
        
        transaction.id = HelperUtils.generateTransactionId();
        transaction.fee = HelperUtils.calculateTransactionFee(transaction);
        transaction.timestamp = new Date().toISOString();
        
        this.pendingTransactions.push(transaction);
        console.log(`💸 Transaction added: ${transaction.from} → ${transaction.to} (${transaction.amount} YLX)`);
        return transaction;
    }

    async minePendingTransactions(miningRewardAddress) {
        console.log('⛏️ Starting mining process...');
        
        try {
            const rewardTransaction = {
                id: HelperUtils.generateTransactionId(),
                from: null,
                to: miningRewardAddress,
                amount: this.miningReward,
                type: 'mining_reward',
                timestamp: new Date().toISOString()
            };
            
            this.pendingTransactions.push(rewardTransaction);
            
            const block = {
                index: this.chain.length,
                timestamp: new Date().toISOString(),
                transactions: [...this.pendingTransactions],
                previousHash: this.getLatestBlock().hash,
                nonce: 0
            };

            const startTime = Date.now();
            block.hash = this.mineBlock(block);
            const miningTime = Date.now() - startTime;

            this.chain.push(block);
            this.pendingTransactions = [];
            
            console.log(`✅ Block ${block.index} mined! Hash: ${block.hash.substring(0, 16)}... (${miningTime}ms)`);
            return block;
            
        } catch (error) {
            console.error('❌ Mining error:', error.message);
            throw error;
        }
    }

    mineBlock(block) {
        const target = Array(this.difficulty + 1).join("0");
        
        while (!block.hash || block.hash.substring(0, this.difficulty) !== target) {
            block.nonce = (block.nonce || 0) + 1;
            block.hash = this.calculateHash(block);
            
            // Prevent infinite loop
            if (block.nonce > 1000000) {
                console.log('⚠️ Mining taking too long, reducing difficulty');
                this.difficulty = Math.max(1, this.difficulty - 1);
                block.nonce = 0;
            }
        }
        
        return block.hash;
    }

    getBalance(address) {
        let balance = 0;

        for (const block of this.chain) {
            for (const trans of block.transactions) {
                if (trans.from === address) {
                    balance -= parseFloat(trans.amount || 0);
                    balance -= parseFloat(trans.fee || 0);
                }
                if (trans.to === address) {
                    balance += parseFloat(trans.amount || 0);
                }
            }
        }

        return HelperUtils.formatAmount(balance);
    }

    isChainValid() {
        for (let i = 1; i < this.chain.length; i++) {
            const currentBlock = this.chain[i];
            const previousBlock = this.chain[i - 1];

            if (currentBlock.hash !== this.calculateHash(currentBlock)) {
                return false;
            }

            if (currentBlock.previousHash !== previousBlock.hash) {
                return false;
            }
        }
        return true;
    }

    getStats() {
        return {
            totalBlocks: this.chain.length,
            difficulty: this.difficulty,
            miningReward: this.miningReward,
            pendingTransactions: this.pendingTransactions.length,
            isValid: this.isChainValid(),
            latestBlock: this.getLatestBlock()
        };
    }
}

// Initialize blockchain
const yeluxBlockchain = new YeluxBlockchain();
const app = express();
const PORT = 3002;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// CORS middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});

// Routes
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'Yelux Blockchain',
        timestamp: new Date().toISOString(),
        stats: yeluxBlockchain.getStats()
    });
});

app.get('/api/blockchain', (req, res) => {
    res.json({
        chain: yeluxBlockchain.chain,
        stats: yeluxBlockchain.getStats()
    });
});

app.get('/api/balance/:address', (req, res) => {
    const { address } = req.params;
    const balance = yeluxBlockchain.getBalance(address);
    res.json({ address, balance });
});

app.post('/api/transaction', async (req, res) => {
    try {
        const { from, to, amount } = req.body;
        
        if (!from || !to || !amount) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        const transaction = yeluxBlockchain.addTransaction({ from, to, amount });
        res.json({ success: true, transaction });
        
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.post('/api/mine', async (req, res) => {
    try {
        const { minerAddress } = req.body;
        
        if (!minerAddress) {
            return res.status(400).json({ error: 'Miner address required' });
        }
        
        const block = await yeluxBlockchain.minePendingTransactions(minerAddress);
        res.json({ success: true, block });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/stats', (req, res) => {
    res.json(yeluxBlockchain.getStats());
});

// Initialize with first block
async function initializeBlockchain() {
    try {
        console.log('⛏️ Mining initial block...');
        const minerAddress = 'ylx_genesis_miner_' + Math.random().toString(36).substring(2, 8);
        await yeluxBlockchain.minePendingTransactions(minerAddress);
        console.log('✅ Initial block mined successfully!');
    } catch (error) {
        console.error('❌ Error mining initial block:', error.message);
    }
}

// Start server
app.listen(PORT, async () => {
    console.log(`🚀 YELUX Blockchain Server running on port ${PORT}`);
    console.log(`📊 API Documentation: http://localhost:${PORT}/health`);
    
    // Mine initial block
    await initializeBlockchain();
});

module.exports = { yeluxBlockchain, app };