// YELUX Shared Wallet Utilities
// Used across crypto and casino frontends

class YeluxWallet {
    constructor() {
        this.apiUrl = CONFIG?.BLOCKCHAIN_API || 'http://localhost:3001';
        this.currentWallet = null;
        this.api = new YeluxAPI();
    }

    // Generate new wallet
    async generateWallet() {
        try {
            const response = await fetch(`${this.apiUrl}/generate-wallet`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const wallet = await response.json();
            this.currentWallet = wallet;
            return wallet;
        } catch (error) {
            console.error('Error generating wallet:', error);
            throw error;
        }
    }

    // Get wallet balance
    async getBalance(address) {
        try {
            const response = await fetch(`${this.apiUrl}/balance/${address}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return data.balance || 0;
        } catch (error) {
            console.error('Error getting balance:', error);
            return 0;
        }
    }

    // Send transaction
    async sendTransaction(fromAddress, toAddress, amount, privateKey) {
        try {
            const response = await fetch(`${this.apiUrl}/send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fromAddress,
                    toAddress,
                    amount: parseFloat(amount),
                    privateKey
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Error sending transaction:', error);
            throw error;
        }
    }

    // Get all wallets (admin function)
    async getAllWallets() {
        try {
            const response = await fetch(`${this.apiUrl}/wallets`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const wallets = await response.json();
            return wallets;
        } catch (error) {
            console.error('Error getting wallets:', error);
            return {};
        }
    }

    // Get blockchain info
    async getBlockchainInfo() {
        try {
            const response = await fetch(`${this.apiUrl}/blockchain`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const blockchain = await response.json();
            return {
                totalBlocks: blockchain.chain ? blockchain.chain.length : 0,
                totalSupply: this.calculateTotalSupply(blockchain),
                difficulty: blockchain.difficulty || 4
            };
        } catch (error) {
            console.error('Error getting blockchain info:', error);
            return { totalBlocks: 0, totalSupply: 0, difficulty: 4 };
        }
    }

    // Calculate total supply from blockchain
    calculateTotalSupply(blockchain) {
        if (!blockchain.chain || blockchain.chain.length === 0) return 0;
        
        let totalSupply = 0;
        blockchain.chain.forEach(block => {
            if (block.transactions) {
                block.transactions.forEach(tx => {
                    if (tx.fromAddress === null) { // Mining reward
                        totalSupply += tx.amount;
                    }
                });
            }
        });
        return totalSupply;
    }

    // Mine new block (admin function)
    async mineBlock(rewardAddress) {
        try {
            const response = await fetch(`${this.apiUrl}/mine`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ rewardAddress })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Error mining block:', error);
            throw error;
        }
    }

    // Validate wallet address
    isValidAddress(address) {
        // Basic validation - adjust based on your address format
        return address && typeof address === 'string' && address.length >= 26 && address.length <= 35;
    }

    // Format balance for display
    formatBalance(balance) {
        return parseFloat(balance).toFixed(8) + ' YLX';
    }

    // Get current wallet info
    getCurrentWallet() {
        return this.currentWallet;
    }

    // Set current wallet
    setCurrentWallet(wallet) {
        this.currentWallet = wallet;
    }

    // Clear current wallet
    clearWallet() {
        this.currentWallet = null;
    }

    // Encrypt wallet with password (AES)
    async encryptWallet(wallet, password) {
        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(JSON.stringify(wallet));
            const passwordKey = await crypto.subtle.importKey(
                'raw',
                encoder.encode(password),
                { name: 'PBKDF2' },
                false,
                ['deriveKey']
            );
            
            const key = await crypto.subtle.deriveKey(
                {
                    name: 'PBKDF2',
                    salt: encoder.encode('yelux-salt'),
                    iterations: 100000,
                    hash: 'SHA-256'
                },
                passwordKey,
                { name: 'AES-GCM', length: 256 },
                false,
                ['encrypt']
            );
            
            const iv = crypto.getRandomValues(new Uint8Array(12));
            const encrypted = await crypto.subtle.encrypt(
                { name: 'AES-GCM', iv },
                key,
                data
            );
            
            return {
                encrypted: Array.from(new Uint8Array(encrypted)),
                iv: Array.from(iv)
            };
        } catch (error) {
            console.error('Error encrypting wallet:', error);
            throw error;
        }
    }

    // Decrypt wallet with password
    async decryptWallet(encryptedData, password) {
        try {
            const encoder = new TextEncoder();
            const decoder = new TextDecoder();
            
            const passwordKey = await crypto.subtle.importKey(
                'raw',
                encoder.encode(password),
                { name: 'PBKDF2' },
                false,
                ['deriveKey']
            );
            
            const key = await crypto.subtle.deriveKey(
                {
                    name: 'PBKDF2',
                    salt: encoder.encode('yelux-salt'),
                    iterations: 100000,
                    hash: 'SHA-256'
                },
                passwordKey,
                { name: 'AES-GCM', length: 256 },
                false,
                ['decrypt']
            );
            
            const decrypted = await crypto.subtle.decrypt(
                { 
                    name: 'AES-GCM', 
                    iv: new Uint8Array(encryptedData.iv) 
                },
                key,
                new Uint8Array(encryptedData.encrypted)
            );
            
            const walletJson = decoder.decode(decrypted);
            return JSON.parse(walletJson);
        } catch (error) {
            console.error('Error decrypting wallet:', error);
            throw error;
        }
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = YeluxWallet;
} else if (typeof window !== 'undefined') {
    window.YeluxWallet = YeluxWallet;
}
