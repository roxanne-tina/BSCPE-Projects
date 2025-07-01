const crypto = require('crypto');
const EC = require('elliptic').ec;
const config = require('./config');

const ec = new EC('secp256k1');

class Transaction {
    constructor(fromAddress, toAddress, amount, fee = 0, data = '') {
        this.fromAddress = fromAddress;
        this.toAddress = toAddress;
        this.amount = parseFloat(amount);
        this.fee = parseFloat(fee);
        this.data = data;
        this.timestamp = Date.now();
        this.hash = this.calculateHash();
        this.signature = null;
        this.nonce = 0; // For preventing replay attacks
    }

    /**
     * Calculate the hash of this transaction
     */
    calculateHash() {
        return crypto
            .createHash(config.HASH_ALGORITHM)
            .update(
                (this.fromAddress || '') +
                this.toAddress +
                this.amount.toString() +
                this.fee.toString() +
                this.timestamp.toString() +
                this.nonce.toString() +
                (this.data || '')
            )
            .digest('hex');
    }

    /**
     * Generate address from public key
     */
    generateAddressFromPublicKey(publicKey) {
        return crypto
            .createHash('sha256')
            .update(publicKey)
            .digest('hex')
            .substring(0, config.ADDRESS_LENGTH);
    }

    /**
     * Sign the transaction with the given private key
     */
    signTransaction(privateKey) {
        if (this.fromAddress === null) return;
        
        // Add input validation and sanitization
        if (!privateKey || typeof privateKey !== 'string' || !/^[a-fA-F0-9]{64}$/.test(privateKey)) {
            throw new Error('Invalid private key format - must be 64 character hex string');
        }

        try {
            const keyPair = ec.keyFromPrivate(privateKey, 'hex');
            const publicKey = keyPair.getPublic('hex');
            const address = this.generateAddressFromPublicKey(publicKey);
            
            if (address !== this.fromAddress) {
                throw new Error('Private key does not match the fromAddress');
            }

            // Add timestamp validation to prevent replay attacks
            const currentTime = Date.now();
            if (Math.abs(currentTime - this.timestamp) > config.TRANSACTION_TIMEOUT) {
                throw new Error('Transaction timestamp is too old or too far in the future');
            }

            // Recalculate hash before signing
            this.hash = this.calculateHash();
            
            // Sign the transaction hash
            const signature = keyPair.sign(this.hash, 'base64');
            this.signature = signature.toDER('hex');
            
            console.log('✅ Transaction signed successfully');
        } catch (error) {
            console.error('❌ Transaction signing failed:', error.message);
            throw error;
        }
    }

    /**
     * Verify the transaction signature
     */
    isValid() {
        // Mining reward transactions don't need signatures
        if (this.fromAddress === null) return true;

        // Check if signature exists
        if (!this.signature || this.signature.length === 0) {
            console.error('No signature in this transaction');
            return false;
        }

        // Validate amounts
        if (this.amount <= 0) {
            console.error('Transaction amount must be positive');
            return false;
        }

        if (this.fee < 0) {
            console.error('Transaction fee cannot be negative');
            return false;
        }

        // Validate addresses
        if (!this.isValidAddress(this.fromAddress) || !this.isValidAddress(this.toAddress)) {
            console.error('Invalid address format');
            return false;
        }

        // Prevent self-transactions
        if (this.fromAddress === this.toAddress) {
            console.error('Cannot send transaction to yourself');
            return false;
        }

        try {
            // Verify hash integrity
            const calculatedHash = this.calculateHash();
            if (calculatedHash !== this.hash) {
                console.error('Transaction hash mismatch');
                return false;
            }

            return true;
        } catch (error) {
            console.error('Transaction validation error:', error.message);
            return false;
        }
    }

    /**
     * Validate address format
     */
    isValidAddress(address) {
        if (!address || typeof address !== 'string') {
            return false;
        }
        
        // Check if address has correct length and format
        const addressRegex = new RegExp(`^[a-fA-F0-9]{${config.ADDRESS_LENGTH}}$`);
        return addressRegex.test(address);
    }

    /**
     * Get transaction size in bytes
     */
    getSize() {
        return JSON.stringify(this).length;
    }

    /**
     * Get transaction summary
     */
    getSummary() {
        return {
            hash: this.hash,
            from: this.fromAddress,
            to: this.toAddress,
            amount: this.amount,
            fee: this.fee,
            timestamp: this.timestamp,
            size: this.getSize(),
            signed: !!this.signature
        };
    }

    /**
     * Convert transaction to JSON
     */
    toJSON() {
        return {
            fromAddress: this.fromAddress,
            toAddress: this.toAddress,
            amount: this.amount,
            fee: this.fee,
            data: this.data,
            timestamp: this.timestamp,
            hash: this.hash,
            signature: this.signature,
            nonce: this.nonce
        };
    }

    /**
     * Create transaction from JSON
     */
    static fromJSON(json) {
        const tx = new Transaction(
            json.fromAddress,
            json.toAddress,
            json.amount,
            json.fee,
            json.data
        );
        
        tx.timestamp = json.timestamp;
        tx.hash = json.hash;
        tx.signature = json.signature;
        tx.nonce = json.nonce;
        
        return tx;
    }
}

module.exports = Transaction;
