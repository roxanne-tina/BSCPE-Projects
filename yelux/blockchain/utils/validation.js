const CryptoUtils = require('./crypto');

class ValidationUtils {
    // Validate transaction
    static validateTransaction(transaction) {
        const errors = [];

        // Check required fields
        if (!transaction.id) errors.push('Transaction ID is required');
        if (!transaction.from && transaction.type !== 'mining' && transaction.type !== 'genesis') {
            errors.push('From address is required');
        }
        if (!transaction.to) errors.push('To address is required');
        if (transaction.amount === undefined || transaction.amount === null) {
            errors.push('Amount is required');
        }
        if (!transaction.timestamp) errors.push('Timestamp is required');

        // Validate addresses
        if (transaction.from && !CryptoUtils.isValidAddress(transaction.from)) {
            errors.push('Invalid from address format');
        }
        if (transaction.to && !CryptoUtils.isValidAddress(transaction.to)) {
            errors.push('Invalid to address format');
        }

        // Validate amount
        if (transaction.amount < 0) {
            errors.push('Amount cannot be negative');
        }
        if (!this.isValidAmount(transaction.amount)) {
            errors.push('Invalid amount format');
        }

        // Validate fee
        if (transaction.fee < 0) {
            errors.push('Fee cannot be negative');
        }

        // Validate signature for non-system transactions
        if (transaction.type !== 'mining' && transaction.type !== 'genesis') {
            if (!transaction.signature) {
                errors.push('Transaction signature is required');
            }
        }

        // Validate timestamp
        if (!this.isValidTimestamp(transaction.timestamp)) {
            errors.push('Invalid timestamp format');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // Validate block
    static validateBlock(block, previousBlock = null) {
        const errors = [];

        // Check required fields
        if (block.index === undefined || block.index === null) {
            errors.push('Block index is required');
        }
        if (!block.timestamp) errors.push('Block timestamp is required');
        if (!block.hash) errors.push('Block hash is required');
        if (!block.previousHash && block.index !== 0) {
            errors.push('Previous hash is required for non-genesis blocks');
        }
        if (!block.merkleRoot) errors.push('Merkle root is required');
        if (!Array.isArray(block.transactions)) {
            errors.push('Transactions must be an array');
        }

        // Validate index sequence
        if (previousBlock && block.index !== previousBlock.index + 1) {
            errors.push('Block index must be sequential');
        }

        // Validate previous hash
        if (previousBlock && block.previousHash !== previousBlock.hash) {
            errors.push('Previous hash does not match');
        }

        // Validate timestamp
        if (!this.isValidTimestamp(block.timestamp)) {
            errors.push('Invalid timestamp format');
        }

        // Validate transactions
        block.transactions.forEach((tx, index) => {
            const txValidation = this.validateTransaction(tx);
            if (!txValidation.isValid) {
                errors.push(`Transaction ${index}: ${txValidation.errors.join(', ')}`);
            }
        });

        // Validate merkle root
        const calculatedMerkleRoot = CryptoUtils.generateMerkleRoot(block.transactions);
        if (block.merkleRoot !== calculatedMerkleRoot) {
            errors.push('Invalid merkle root');
        }

        // Validate hash
        const blockData = {
            index: block.index,
            timestamp: block.timestamp,
            previousHash: block.previousHash,
            merkleRoot: block.merkleRoot,
            nonce: block.nonce,
            difficulty: block.difficulty
        };
        const calculatedHash = CryptoUtils.sha256(JSON.stringify(blockData));
        if (block.hash !== calculatedHash) {
            errors.push('Invalid block hash');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // Validate wallet
    static validateWallet(wallet) {
        const errors = [];

        // Check required fields
        if (!wallet.address) errors.push('Wallet address is required');
        if (wallet.balance === undefined || wallet.balance === null) {
            errors.push('Wallet balance is required');
        }
        if (!wallet.type) errors.push('Wallet type is required');

        // Validate address
        if (!CryptoUtils.isValidAddress(wallet.address)) {
            errors.push('Invalid wallet address format');
        }

        // Validate balance
        if (wallet.balance < 0) {
            errors.push('Wallet balance cannot be negative');
        }
        if (!this.isValidAmount(wallet.balance)) {
            errors.push('Invalid balance format');
        }

        // Validate type
        const validTypes = ['user', 'system', 'treasury', 'mining', 'casino', 'exchange', 'business', 'genesis'];
        if (!validTypes.includes(wallet.type)) {
            errors.push('Invalid wallet type');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // Validate amount format (8 decimal places)
    static isValidAmount(amount) {
        if (typeof amount === 'string') {
            amount = parseFloat(amount);
        }
        if (isNaN(amount)) return false;
        
        const decimalPlaces = (amount.toString().split('.')[1] || '').length;
        return decimalPlaces <= 8;
    }

    // Validate timestamp format
    static isValidTimestamp(timestamp) {
        const date = new Date(timestamp);
        return date instanceof Date && !isNaN(date.getTime());
    }

    // Validate private key
    static isValidPrivateKey(privateKey) {
        return /^[a-fA-F0-9]{64}$/.test(privateKey);
    }

    // Validate public key
    static isValidPublicKey(publicKey) {
        return /^[a-fA-F0-9]{66}$/.test(publicKey);
    }

    // Validate signature
    static isValidSignature(signature) {
        return /^[a-fA-F0-9]{128}$/.test(signature);
    }

    // Validate hash
    static isValidHash(hash) {
        return /^[a-fA-F0-9]{64}$/.test(hash);
    }

    // Validate difficulty
    static isValidDifficulty(difficulty) {
        return Number.isInteger(difficulty) && difficulty >= 1 && difficulty <= 1000000000;
    }

    // Validate nonce
    static isValidNonce(nonce) {
        return Number.isInteger(nonce) && nonce >= 0;
    }

    // Validate email format
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Validate URL format
    static isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    // Sanitize input string
    static sanitizeString(input, maxLength = 255) {
        if (typeof input !== 'string') return '';
        return input.trim().substring(0, maxLength);
    }

    // Validate mining difficulty target
    static isValidDifficultyTarget(target, difficulty) {
        const targetZeros = '0'.repeat(difficulty);
        return target.startsWith(targetZeros);
    }

    // Validate block reward
    static isValidBlockReward(reward, blockHeight) {
        const halvingInterval = 210000;
        const initialReward = 50;
        const halvings = Math.floor(blockHeight / halvingInterval);
        const expectedReward = initialReward / Math.pow(2, halvings);
        
        return Math.abs(reward - expectedReward) < 0.00000001;
    }
}

module.exports = ValidationUtils;
