// Wallet encryption/decryption utilities using Web Crypto API

async function encryptWallet(walletData, password) {
    try {
        // Generate salt
        const salt = crypto.getRandomValues(new Uint8Array(16));
        
        // Derive key from password
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode(password),
            { name: 'PBKDF2' },
            false,
            ['deriveKey']
        );
        
        const key = await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: 100000,
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt']
        );
        
        // Generate IV
        const iv = crypto.getRandomValues(new Uint8Array(12));
        
        // Encrypt wallet data
        const encodedData = new TextEncoder().encode(JSON.stringify(walletData));
        const encryptedData = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            encodedData
        );
        
        // Return encrypted wallet with metadata
        return {
            encrypted: Array.from(new Uint8Array(encryptedData)),
            salt: Array.from(salt),
            iv: Array.from(iv),
            timestamp: Date.now()
        };
    } catch (error) {
        console.error('Encryption error:', error);
        throw new Error('Failed to encrypt wallet');
    }
}

async function decryptWallet(encryptedWallet, password) {
    try {
        // Reconstruct salt and IV
        const salt = new Uint8Array(encryptedWallet.salt);
        const iv = new Uint8Array(encryptedWallet.iv);
        const encryptedData = new Uint8Array(encryptedWallet.encrypted);
        
        // Derive key from password
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode(password),
            { name: 'PBKDF2' },
            false,
            ['deriveKey']
        );
        
        const key = await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: 100000,
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['decrypt']
        );
        
        // Decrypt data
        const decryptedData = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            encryptedData
        );
        
        // Parse and return wallet data
        const walletJson = new TextDecoder().decode(decryptedData);
        return JSON.parse(walletJson);
    } catch (error) {
        console.error('Decryption error:', error);
        return null; // Invalid password or corrupted data
    }
}

// Utility function to generate secure random password
function generateSecurePassword(length = 16) {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    
    return Array.from(array, byte => charset[byte % charset.length]).join('');
}

// Password strength checker
function checkPasswordStrength(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    let score = 0;
    let feedback = [];
    
    if (password.length >= minLength) score++;
    else feedback.push(`At least ${minLength} characters`);
    
    if (hasUpperCase) score++;
    else feedback.push('Include uppercase letters');
    
    if (hasLowerCase) score++;
    else feedback.push('Include lowercase letters');
    
    if (hasNumbers) score++;
    else feedback.push('Include numbers');
    
    if (hasSpecialChar) score++;
    else feedback.push('Include special characters');
    
    const strength = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'][score];
    
    return {
        score,
        strength,
        feedback,
        isStrong: score >= 4
    };
}
