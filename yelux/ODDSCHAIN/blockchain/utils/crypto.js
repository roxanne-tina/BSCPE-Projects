const crypto = require('crypto');
const secp256k1 = require('secp256k1');

class CryptoUtils {
    // Generate SHA-256 hash
    static sha256(data) {
        return crypto.createHash('sha256').update(data).digest('hex');
    }

    // Generate double SHA-256 hash (Bitcoin-style)
    static doubleSha256(data) {
        const firstHash = crypto.createHash('sha256').update(data).digest();
        return crypto.createHash('sha256').update(firstHash).digest('hex');
    }

    // Generate random private key
    static generatePrivateKey() {
        let privateKey;
        do {
            privateKey = crypto.randomBytes(32);
        } while (!secp256k1.privateKeyVerify(privateKey));
        return privateKey.toString('hex');
    }

    // Generate public key from private key
    static getPublicKey(privateKey) {
        const privateKeyBuffer = Buffer.from(privateKey, 'hex');
        const publicKey = secp256k1.publicKeyCreate(privateKeyBuffer);
        return Buffer.from(publicKey).toString('hex');
    }

    // Generate YELUX address from public key
    static generateAddress(publicKey) {
        const publicKeyHash = this.sha256(publicKey);
        const addressHash = this.sha256('YLX' + publicKeyHash);
        return 'YLX' + addressHash.substring(0, 61);
    }

    // Sign message with private key
    static sign(message, privateKey) {
        const messageHash = Buffer.from(this.sha256(message), 'hex');
        const privateKeyBuffer = Buffer.from(privateKey, 'hex');
        const signature = secp256k1.ecdsaSign(messageHash, privateKeyBuffer);
        return {
            signature: Buffer.from(signature.signature).toString('hex'),
            recovery: signature.recid
        };
    }

    // Verify signature
    static verify(message, signature, publicKey) {
        try {
            const messageHash = Buffer.from(this.sha256(message), 'hex');
            const signatureBuffer = Buffer.from(signature, 'hex');
            const publicKeyBuffer = Buffer.from(publicKey, 'hex');
            return secp256k1.ecdsaVerify(signatureBuffer, messageHash, publicKeyBuffer);
        } catch (error) {
            return false;
        }
    }

    // Generate merkle root
    static generateMerkleRoot(transactions) {
        if (transactions.length === 0) {
            return this.sha256('');
        }

        let hashes = transactions.map(tx => this.sha256(JSON.stringify(tx)));

        while (hashes.length > 1) {
            const newHashes = [];
            for (let i = 0; i < hashes.length; i += 2) {
                const left = hashes[i];
                const right = hashes[i + 1] || left;
                newHashes.push(this.sha256(left + right));
            }
            hashes = newHashes;
        }

        return hashes[0];
    }

    // Generate random nonce
    static generateNonce() {
        return Math.floor(Math.random() * 1000000000);
    }

    // Encrypt data with AES-256-GCM
    static encrypt(data, password) {
        const salt = crypto.randomBytes(16);
        const key = crypto.pbkdf2Sync(password, salt, 10000, 32, 'sha256');
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipherGCM('aes-256-gcm', key, iv);
        
        let encrypted = cipher.update(data, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag();

        return {
            encrypted,
            salt: salt.toString('hex'),
            iv: iv.toString('hex'),
            authTag: authTag.toString('hex')
        };
    }

    // Decrypt data with AES-256-GCM
    static decrypt(encryptedData, password) {
        try {
            const { encrypted, salt, iv, authTag } = encryptedData;
            const key = crypto.pbkdf2Sync(password, Buffer.from(salt, 'hex'), 10000, 32, 'sha256');
            const decipher = crypto.createDecipherGCM('aes-256-gcm', key, Buffer.from(iv, 'hex'));
            decipher.setAuthTag(Buffer.from(authTag, 'hex'));
            
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        } catch (error) {
            throw new Error('Decryption failed');
        }
    }

    // Generate wallet seed phrase
    static generateSeedPhrase() {
        const wordList = [
            'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract',
            'absurd', 'abuse', 'access', 'accident', 'account', 'accuse', 'achieve', 'acid',
            'acoustic', 'acquire', 'across', 'act', 'action', 'actor', 'actress', 'actual'
        ];
        
        const words = [];
        for (let i = 0; i < 12; i++) {
            words.push(wordList[Math.floor(Math.random() * wordList.length)]);
        }
        return words.join(' ');
    }

    // Validate address format
    static isValidAddress(address) {
        return /^YLX[A-Fa-f0-9]{61}$/.test(address);
    }

    // Generate checksum for data integrity
    static generateChecksum(data) {
        return this.sha256(JSON.stringify(data));
    }

    // Verify data integrity
    static verifyChecksum(data, checksum) {
        return this.generateChecksum(data) === checksum;
    }
}

module.exports = CryptoUtils;
