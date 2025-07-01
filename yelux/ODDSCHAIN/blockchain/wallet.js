const crypto = require('crypto');
const EC = require('elliptic').ec;
const config = require('./yelux.config');
const Transaction = require('./transaction');

// Create elliptic curve instance
const ec = new EC('secp256k1');

class Wallet {
    constructor(privateKey = null) {
        if (privateKey) {
            this.keyPair = ec.keyFromPrivate(privateKey, 'hex');
        } else {
            this.keyPair = ec.genKeyPair();
        }
        
        this.privateKey = this.keyPair.getPrivate('hex');
        this.publicKey = this.keyPair.getPublic('hex');
        this.address = this.generateAddress();
        this.balance = 0;
        this.nonce = 0;
        this.createdAt = Date.now();
        this.label = '';
        this.isEncrypted = false;
    }

    /**
     * Generate wallet address from public key
     */
    generateAddress() {
        // Hash the public key
        const hash1 = crypto.createHash('sha256').update(this.publicKey, 'hex').digest();
        const hash2 = crypto.createHash('ripemd160').update(hash1).digest('hex');
        
        // Add checksum
        const checksum = this.calculateChecksum(hash2);
        
        // Combine prefix + hash + checksum
        return config.ADDRESS_PREFIX + hash2 + checksum;
    }

    /**
     * Calculate address checksum
     */
    calculateChecksum(data) {
        const hash = crypto.createHash('sha256').update(data, 'hex').digest();
        const doubleHash = crypto.createHash('sha256').update(hash).digest('hex');
        return doubleHash.substring(0, 8); // First 4 bytes as hex
    }

    /**
     * Sign a transaction
     */
    signTransaction(transaction) {
        if (transaction.fromAddress !== this.address) {
            throw new Error('Cannot sign transaction for other wallets');
        }

        transaction.signTransaction(this.privateKey);
        return transaction;
    }

    /**
     * Create a new transaction
     */
    createTransaction(toAddress, amount, fee = config.TRANSACTION_FEE, data = '') {
        const transaction = new Transaction(this.address, toAddress, amount, fee, data);
        transaction.nonce = this.nonce++;
        return this.signTransaction(transaction);
    }

    /**
     * Get wallet balance from blockchain
     */
    getBalance(blockchain) {
        this.balance = blockchain.getBalanceOfAddress(this.address);
        return this.balance;
    }

    /**
     * Get transaction history
     */
    getTransactionHistory(blockchain) {
        return blockchain.getTransactionsForAddress(this.address);
    }

    /**
     * Encrypt wallet with password
     */
    encrypt(password) {
        if (this.isEncrypted) {
            throw new Error('Wallet is already encrypted');
        }

        const cipher = crypto.createCipher('aes-256-cbc', password);
        let encrypted = cipher.update(this.privateKey, 'hex', 'hex');
        encrypted += cipher.final('hex');
        
        this.encryptedPrivateKey = encrypted;
        this.privateKey = null; // Remove plain private key
        this.isEncrypted = true;
        
        return true;
    }

    /**
     * Decrypt wallet with password
     */
    decrypt(password) {
        if (!this.isEncrypted) {
            throw new Error('Wallet is not encrypted');
        }

        try {
            const decipher = crypto.createDecipher('aes-256-cbc', password);
            let decrypted = decipher.update(this.encryptedPrivateKey, 'hex', 'hex');
            decrypted += decipher.final('hex');
            
            this.privateKey = decrypted;
            this.keyPair = ec.keyFromPrivate(this.privateKey, 'hex');
            this.isEncrypted = false;
            
            return true;
        } catch (error) {
            throw new Error('Invalid password');
        }
    }

    /**
     * Export wallet to JSON
     */
    toJSON(includePrivateKey = false) {
        const walletData = {
            address: this.address,
            publicKey: this.publicKey,
            balance: this.balance,
            nonce: this.nonce,
            createdAt: this.createdAt,
            label: this.label,
            isEncrypted: this.isEncrypted
        };

        if (includePrivateKey && !this.isEncrypted) {
            walletData.privateKey = this.privateKey;
        }

        if (this.isEncrypted) {
            walletData.encryptedPrivateKey = this.encryptedPrivateKey;
        }

        return walletData;
    }

    /**
     * Create wallet from JSON data
     */
    static fromJSON(data, password = null) {
        const wallet = new Wallet();
        
        wallet.address = data.address;
        wallet.publicKey = data.publicKey;
        wallet.balance = data.balance || 0;
        wallet.nonce = data.nonce || 0;
        wallet.createdAt = data.createdAt || Date.now();
        wallet.label = data.label || '';
        wallet.isEncrypted = data.isEncrypted || false;

        if (data.privateKey) {
            wallet.privateKey = data.privateKey;
            wallet.keyPair = ec.keyFromPrivate(wallet.privateKey, 'hex');
        } else if (data.encryptedPrivateKey && password) {
            wallet.encryptedPrivateKey = data.encryptedPrivateKey;
            wallet.decrypt(password);
        }

        return wallet;
    }
}

class WalletManager {
    constructor() {
        this.wallets = new Map();
        this.casinoWallet = null;
        this.systemWallet = null;
    }

    /**
     * Create a new wallet
     */
    createWallet(label = '') {
        const wallet = new Wallet();
        wallet.label = label;
        
        this.wallets.set(wallet.address, wallet);
        
        console.log(`👛 New wallet created: ${wallet.address}`);
        return wallet;
    }

    /**
     * Import wallet from private key
     */
    importWallet(privateKey, label = '') {
        try {
            const wallet = new Wallet(privateKey);
            wallet.label = label;
            
            this.wallets.set(wallet.address, wallet);
            
            console.log(`📥 Wallet imported: ${wallet.address}`);
            return wallet;
        } catch (error) {
            throw new Error(`Failed to import wallet: ${error.message}`);
        }
    }

    /**
     * Get wallet by address
     */
    getWallet(address) {
        return this.wallets.get(address);
    }

    /**
     * Get all wallets
     */
    getAllWallets() {
        return Array.from(this.wallets.values());
    }

    /**
     * Remove wallet
     */
    removeWallet(address) {
        const removed = this.wallets.delete(address);
        if (removed) {
            console.log(`🗑️ Wallet removed: ${address}`);
        }
        return removed;
    }

    /**
     * Get wallet balance
     */
    getBalance(address) {
        const wallet = this.getWallet(address);
        return wallet ? wallet.balance : 0;
    }

    /**
     * Update wallet balances from blockchain
     */
    updateBalances(blockchain) {
        for (const wallet of this.wallets.values()) {
            wallet.getBalance(blockchain);
        }
    }

    /**
     * Get or create casino wallet
     */
    getCasinoWallet() {
        if (!this.casinoWallet) {
            this.casinoWallet = this.createWallet('Casino System Wallet');
        }
        return this.casinoWallet;
    }

    /**
     * Get or create system wallet
     */
    getSystemWallet() {
        if (!this.systemWallet) {
            this.systemWallet = this.createWallet('System Wallet');
        }
        return this.systemWallet;
    }

    /**
     * Get total balance of all wallets
     */
    getTotalBalance() {
        return Array.from(this.wallets.values())
            .reduce((total, wallet) => total + wallet.balance, 0);
    }

    /**
     * Export all wallets to JSON
     */
    exportWallets(includePrivateKeys = false) {
        const walletsData = {};
        
        for (const [address, wallet] of this.wallets) {
            walletsData[address] = wallet.toJSON(includePrivateKeys);
        }

        return {
            wallets: walletsData,
            casinoWallet: this.casinoWallet ? this.casinoWallet.address : null,
            systemWallet: this.systemWallet ? this.systemWallet.address : null,
            exportedAt: new Date().toISOString()
        };
    }

    /**
     * Import wallets from JSON
     */
    importWallets(data, password = null) {
        if (!data.wallets) {
            throw new Error('Invalid wallet data');
        }

        let importedCount = 0;

        for (const [address, walletData] of Object.entries(data.wallets)) {
            try {
                const wallet = Wallet.fromJSON(walletData, password);
                this.wallets.set(address, wallet);
                importedCount++;
            } catch (error) {
                console.error(`Failed to import wallet ${address}: ${error.message}`);
            }
        }

        // Restore special wallets
        if (data.casinoWallet) {
            this.casinoWallet = this.getWallet(data.casinoWallet);
        }

        if (data.systemWallet) {
            this.systemWallet = this.getWallet(data.systemWallet);
        }

        console.log(`📥 Imported ${importedCount} wallets`);
        return importedCount;
    }

    /**
     * Validate address format
     */
    isValidAddress(address) {
        if (!address || typeof address !== 'string') {
            return false;
        }

        // Check prefix
        if (!address.startsWith(config.ADDRESS_PREFIX)) {
            return false;
        }

        // Check length
        const expectedLength = config.ADDRESS_PREFIX.length + 40 + 8; // prefix + hash + checksum
        if (address.length !== expectedLength) {
            return false;
        }

        // Validate checksum
        const addressBody = address.substring(config.ADDRESS_PREFIX.length, address.length - 8);
        const checksum = address.substring(address.length - 8);
        const calculatedChecksum = this.calculateChecksum(addressBody);

        return checksum === calculatedChecksum;
    }

    /**
     * Calculate address checksum
     */
    calculateChecksum(data) {
        const hash = crypto.createHash('sha256').update(data, 'hex').digest();
        const doubleHash = crypto.createHash('sha256').update(hash).digest('hex');
        return doubleHash.substring(0, 8);
    }

    /**
     * Generate mnemonic seed phrase
     */
    generateMnemonic() {
        // Simple implementation - in production, use BIP39
        const words = [
            'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract',
            'absurd', 'abuse', 'access', 'accident', 'account', 'accuse', 'achieve', 'acid'
            // ... add more words for full BIP39 wordlist
        ];

        const mnemonic = [];
        for (let i = 0; i < 12; i++) {
            const randomIndex = crypto.randomInt(0, words.length);
            mnemonic.push(words[randomIndex]);
        }

        return mnemonic.join(' ');
    }

      /**
     * Create wallet from mnemonic
     */
    createWalletFromMnemonic(mnemonic, label = '') {
        // Simple implementation - in production, use proper BIP39/BIP44
        const seed = crypto.createHash('sha256').update(mnemonic).digest('hex');
        const privateKey = seed.substring(0, 64); // Use first 32 bytes as private key
        
        const wallet = this.importWallet(privateKey, label);
        wallet.mnemonic = mnemonic;
        
        return wallet;
    }

    /**
     * Backup wallet data
     */
    createBackup(password) {
        const backup = {
            version: config.VERSION,
            timestamp: Date.now(),
            walletCount: this.wallets.size,
            data: this.exportWallets(false) // Don't include private keys in backup
        };

        if (password) {
            // Encrypt backup
            const cipher = crypto.createCipher('aes-256-cbc', password);
            let encrypted = cipher.update(JSON.stringify(backup), 'utf8', 'hex');
            encrypted += cipher.final('hex');
            
            return {
                encrypted: true,
                data: encrypted,
                timestamp: backup.timestamp
            };
        }

        return backup;
    }

    /**
     * Restore from backup
     */
    restoreFromBackup(backupData, password = null) {
        let data = backupData;

        if (backupData.encrypted && password) {
            try {
                const decipher = crypto.createDecipher('aes-256-cbc', password);
                let decrypted = decipher.update(backupData.data, 'hex', 'utf8');
                decrypted += decipher.final('utf8');
                data = JSON.parse(decrypted);
            } catch (error) {
                throw new Error('Invalid backup password');
            }
        }

        if (!data.data || !data.data.wallets) {
            throw new Error('Invalid backup format');
        }

        return this.importWallets(data.data, password);
    }

    /**
     * Get wallet statistics
     */
    getStats() {
        const wallets = Array.from(this.wallets.values());
        
        return {
            totalWallets: wallets.length,
            totalBalance: this.getTotalBalance(),
            encryptedWallets: wallets.filter(w => w.isEncrypted).length,
            averageBalance: wallets.length > 0 ? this.getTotalBalance() / wallets.length : 0,
            oldestWallet: wallets.reduce((oldest, wallet) => 
                wallet.createdAt < oldest.createdAt ? wallet : oldest, 
                wallets[0] || { createdAt: Date.now() }
            ).createdAt,
            newestWallet: wallets.reduce((newest, wallet) => 
                wallet.createdAt > newest.createdAt ? wallet : newest, 
                wallets[0] || { createdAt: 0 }
            ).createdAt
        };
    }
}

module.exports = { Wallet, WalletManager };