const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const Blockchain = require('./blockchain');
const Transaction = require('./transaction');
const EC = require('elliptic').ec;
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3002; // Changed from 3001 to 3002
const ec = new EC('secp256k1');

// Initialize blockchain
const yeluxCoin = new Blockchain();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Routes

// Get blockchain stats
app.get('/stats', (req, res) => {
    try {
        const stats = yeluxCoin.getStats();
        res.json({
            success: true,
            stats: stats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get balance for an address
app.get('/balance/:address', (req, res) => {
    try {
        const address = req.params.address;
        const balance = yeluxCoin.getBalance(address);
        
        res.json({
            success: true,
            address: address,
            balance: balance
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Send transaction
app.post('/send', (req, res) => {
    try {
        const { fromAddress, toAddress, amount, privateKey, fee = 0 } = req.body;
        
        // Validate input
        if (!fromAddress || !toAddress || !amount || !privateKey) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }

        // Create transaction
        const transaction = new Transaction(fromAddress, toAddress, amount, fee);
        
        // Sign transaction
        transaction.signTransaction(privateKey);
        
        // Add to blockchain
        yeluxCoin.createTransaction(transaction);
        
        res.json({
            success: true,
            message: 'Transaction added to pending pool',
            transactionHash: transaction.hash
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

// Mine pending transactions
app.post('/mine', (req, res) => {
    try {
        const { minerAddress } = req.body;
        
        if (!minerAddress) {
            return res.status(400).json({
                success: false,
                error: 'Miner address is required'
            });
        }

        const block = yeluxCoin.minePendingTransactions(minerAddress);
        
        res.json({
            success: true,
            message: 'Block mined successfully',
            block: block
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Generate new wallet
app.post('/generate-wallet', (req, res) => {
    try {
        const keyPair = ec.genKeyPair();
        const privateKey = keyPair.getPrivate('hex');
        const publicKey = keyPair.getPublic('hex');
        
        // Generate address from public key
        const address = crypto
            .createHash('sha256')
            .update(publicKey)
            .digest('hex')
            .substring(0, 40);

        res.json({
            success: true,
            wallet: {
                address: address,
                publicKey: publicKey,
                privateKey: privateKey
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Server Error:', error);
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 YELUX Blockchain Server running on port ${PORT}`);
    console.log(`📊 API Documentation: http://localhost:${PORT}/health`);
    
    // Mine genesis block reward
    setTimeout(() => {
        console.log('⛏️ Mining initial block...');
        try {
            yeluxCoin.minePendingTransactions('genesis-miner-address');
            console.log('✅ Initial block mined successfully');
        } catch (error) {
            console.error('❌ Error mining initial block:', error.message);
        }
    }, 1000);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 Server shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🛑 Server shutting down gracefully...');
    process.exit(0);
});

module.exports = app;