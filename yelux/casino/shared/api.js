    class YeluxAPI {
        constructor() {
            this.blockchainUrl = 'http://localhost:3001';
            this.casinoUrl = 'http://localhost/YELUX-Project/frontend/casino';
            this.retryAttempts = 3;
            this.retryDelay = 1000;
            this.cache = new Map();
            this.cacheTimeout = 30000; // 30 seconds
        }

        // Generic fetch wrapper with error handling and caching
        async fetchAPI(url, options = {}) {
            const cacheKey = `${url}-${JSON.stringify(options)}`;
            const useCache = options.method === 'GET' || !options.method;
            
            // Check cache for GET requests
            if (useCache && this.cache.has(cacheKey)) {
                const cached = this.cache.get(cacheKey);
                if (Date.now() - cached.timestamp < this.cacheTimeout) {
                    return cached.data;
                }
                this.cache.delete(cacheKey);
            }

            const defaultOptions = {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    ...options.headers
                },
                timeout: 15000, // Increased timeout
                ...options
            };

            for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), defaultOptions.timeout);
                
                    const response = await fetch(url, {
                        ...defaultOptions,
                        signal: controller.signal
                    });
                
                    clearTimeout(timeoutId);
                
                    if (!response.ok) {
                        const errorBody = await response.text();
                        throw new APIError(`HTTP ${response.status}: ${response.statusText}`, response.status, errorBody);
                    }

                    const contentType = response.headers.get('content-type');
                    let data;
                
                    if (contentType && contentType.includes('application/json')) {
                        data = await response.json();
                    } else {
                        data = await response.text();
                    }
                
                    // Cache successful GET requests
                    if (useCache && data) {
                        this.cache.set(cacheKey, {
                            data,
                            timestamp: Date.now()
                        });
                    }
                
                    return data;
                
                } catch (error) {
                    console.error(`API Error (attempt ${attempt}/${this.retryAttempts}):`, {
                        url,
                        error: error.message,
                        timestamp: new Date().toISOString()
                    });
                
                    if (attempt === this.retryAttempts || error.name === 'AbortError') {
                        throw error;
                    }
                
                    // Exponential backoff
                    await this.delay(this.retryDelay * Math.pow(2, attempt - 1));
                }
            }
        }

        // Utility method for delays
        delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }

        clearCache() {
            this.cache.clear();
        }

        // User Authentication APIs
        async login(username, password) {
            try {
                const response = await this.fetchAPI(`${this.casinoUrl}/php/login.php`, {
                    method: 'POST',
                    credentials: 'include',
                    body: JSON.stringify({ username, password })
                });
            
                if (response.success) {
                    this.clearCache(); // Clear cache on login
                }
            
                return response;
            } catch (error) {
                console.error('Login error:', error);
                throw new APIError('Login failed', 401, error.message);
            }
        }

        async register(userData) {
            return await this.fetchAPI(`${this.casinoUrl}/php/register.php`, {
                method: 'POST',
                body: JSON.stringify(userData)
            });
        }

        async getUserInfo() {
            try {
                const response = await this.fetchAPI(`${this.casinoUrl}/php/get-users.php`, {
                    credentials: 'include'
                });
                return response;
            } catch (error) {
                console.error('Error getting user info:', error);
                throw new APIError('Failed to get user info', 401, error.message);
            }
        }

        async logout() {
            try {
                const response = await this.fetchAPI(`${this.casinoUrl}/php/logout.php`, {
                    method: 'POST',
                    credentials: 'include'
                });
            
                this.clearCache(); // Clear cache on logout
                return response;
            } catch (error) {
                console.error('Logout error:', error);
                throw new APIError('Logout failed', 500, error.message);
            }
        }

        // Wallet APIs
        async linkWallet(walletAddress, privateKey = null) {
            try {
                const response = await this.fetchAPI(`${this.casinoUrl}/php/link-wallet.php`, {
                    method: 'POST',
                    credentials: 'include',
                    body: JSON.stringify({
                        wallet_address: walletAddress,
                        private_key: privateKey
                    })
                });
            
                if (response.success) {
                    this.clearCache(); // Clear cache after wallet link
                }
            
                return response;
            } catch (error) {
                console.error('Error linking wallet:', error);
                throw new APIError('Failed to link wallet', 400, error.message);
            }
        }

        async generateWallet() {
            try {
                const response = await this.fetchAPI(`${this.blockchainUrl}/generate-wallet`, {
                    method: 'POST'
                });
                return response;
            } catch (error) {
                console.error('Error generating wallet:', error);
                throw new APIError('Failed to generate wallet', 500, error.message);
            }
        }

        async getWalletBalance(address) {
            try {
                const response = await this.fetchAPI(`${this.blockchainUrl}/balance/${address}`);
                return response.balance || 0;
            } catch (error) {
                console.error('Error getting balance:', error);
                return 0;
            }
        }

        // Transaction APIs
        async sendTransaction(fromAddress, toAddress, amount, privateKey) {
            try {
                const response = await this.fetchAPI(`${this.blockchainUrl}/send`, {
                    method: 'POST',
                    body: JSON.stringify({
                        fromAddress,
                        toAddress,
                        amount: parseFloat(amount),
                        privateKey
                    })
                });
            
                // Clear balance cache after transaction
                this.clearCache();
                return response;
            } catch (error) {
                console.error('Error sending transaction:', error);
                throw new APIError('Transaction failed', 500, error.message);
            }
        }

        async sendToBlockchain(transactionData) {
            return await this.fetchAPI(`${this.casinoUrl}/php/send-to-blockchain.php`, {
                method: 'POST',
                body: JSON.stringify(transactionData)
            });
        }

        // Deposit/Withdrawal Logging APIs
        async logDeposit(amount, txHash) {
            try {
                const response = await this.fetchAPI(`${this.casinoUrl}/php/log-deposit.php`, {
                    method: 'POST',
                    body: JSON.stringify({
                        amount: parseFloat(amount),
                        tx_hash: txHash
                    })
                });
            
                if (response.success) {
                    this.clearCache(); // Clear cache after deposit
                }
            
                return response;
            } catch (error) {
                console.error('Error logging deposit:', error);
                throw new APIError('Failed to log deposit', 400, error.message);
            }
        }

        async logWithdrawal(amount, toAddress, txHash = null) {
            try {
                const response = await this.fetchAPI(`${this.casinoUrl}/php/log-withdrawal.php`, {
                    method: 'POST',
                    body: JSON.stringify({
                        amount: parseFloat(amount),
                        to_address: toAddress,
                        tx_hash: txHash
                    })
                });
            
                if (response.success) {
                    this.clearCache(); // Clear cache after withdrawal
                }
            
                return response;
            } catch (error) {
                console.error('Error logging withdrawal:', error);
                throw new APIError('Failed to log withdrawal', 400, error.message);
            }
        }

        // History APIs
        async getDepositHistory(filters = {}) {
            try {
                const queryParams = new URLSearchParams(filters).toString();
                const url = `${this.casinoUrl}/php/get-deposit-logs.php${queryParams ? '?' + queryParams : ''}`;
                const response = await this.fetchAPI(url, { credentials: 'include' });
                return response;
            } catch (error) {
                console.error('Error getting deposit history:', error);
                throw new APIError('Failed to get deposit history', 400, error.message);
            }
        }

        async getWithdrawalHistory(filters = {}) {
            try {
                const queryParams = new URLSearchParams(filters).toString();
                const url = `${this.casinoUrl}/php/get-withdrawal-logs.php${queryParams ? '?' + queryParams : ''}`;
                const response = await this.fetchAPI(url, { credentials: 'include' });
                return response;
            } catch (error) {
                console.error('Error getting withdrawal history:', error);
                throw new APIError('Failed to get withdrawal history', 400, error.message);
            }
        }

        async getGameHistory(filters = {}) {
            try {
                const queryParams = new URLSearchParams(filters).toString();
                const url = `${this.casinoUrl}/php/get-game-history.php${queryParams ? '?' + queryParams : ''}`;
                const response = await this.fetchAPI(url, { credentials: 'include' });
                return response;
            } catch (error) {
                console.error('Error getting game history:', error);
                throw new APIError('Failed to get game history', 400, error.message);
            }
        }

        // Blockchain APIs
        async getBlockchainInfo() {
            try {
                const response = await this.fetchAPI(`${this.blockchainUrl}/info`);
                return response;
            } catch (error) {
                console.error('Error getting blockchain info:', error);
                throw new APIError('Failed to get blockchain info', 500, error.message);
            }
        }

        async getTransaction(txHash) {
            try {
                const response = await this.fetchAPI(`${this.blockchainUrl}/transaction/${txHash}`);
                return response;
            } catch (error) {
                console.error('Error getting transaction:', error);
                throw new APIError('Failed to get transaction', 500, error.message);
            }
        }

        async getBlock(blockNumber) {
            return await this.fetchAPI(`${this.blockchainUrl}/block/${blockNumber}`);
        }

        async getLatestBlocks(limit = 10) {
            return await this.fetchAPI(`${this.blockchainUrl}/blocks?limit=${limit}`);
        }

        // Mining APIs
        async getMiningStats() {
            return await this.fetchAPI(`${this.blockchainUrl}/mining/stats`);
        }

        async startMining(minerAddress) {
            return await this.fetchAPI(`${this.blockchainUrl}/mining/start`, {
                method: 'POST',
                body: JSON.stringify({ minerAddress })
            });
        }

        async stopMining() {
            return await this.fetchAPI(`${this.blockchainUrl}/mining/stop`, {
                method: 'POST'
            });
        }

        // Game APIs
        async playGame(gameType, betAmount, gameData = {}) {
            try {
                const response = await this.fetchAPI(`${this.casinoUrl}/php/play-game.php`, {
                    method: 'POST',
                    credentials: 'include',
                    body: JSON.stringify({
                        game_type: gameType,
                        bet_amount: betAmount,
                        game_data: gameData
                    })
                });
            
                if (response.success) {
                    this.clearCache(); // Clear cache after game play
                }
            
                return response;
            } catch (error) {
                console.error('Error playing game:', error);
                throw new APIError('Game play failed', 400, error.message);
            }
        }

        // Admin APIs
        async getOverview() {
            try {
                const response = await this.fetchAPI(`${this.casinoUrl}/get-overview.php`, {
                    credentials: 'include'
                });
                return response;
            } catch (error) {
                console.error('Error getting admin overview:', error);
                throw new APIError('Failed to get admin overview', 401, error.message);
            }
        }

        async getAllUsers(filters = {}) {
            const queryParams = new URLSearchParams(filters).toString();
            const url = `${this.casinoUrl}/php/admin/get-all-users.php${queryParams ? '?' + queryParams : ''}`;
            return await this.fetchAPI(url);
        }

        async updateUserStatus(userId, status) {
            return await this.fetchAPI(`${this.casinoUrl}/php/admin/update-user-status.php`, {
                method: 'POST',
                body: JSON.stringify({
                    user_id: userId,
                    status: status
                })
            });
        }

        // Utility methods
        formatError(error) {
            if (error instanceof APIError) {
                return {
                    message: error.message,
                    status: error.status,
                    details: error.details
                };
            }
            return {
                message: error.message || 'Unknown error occurred',
                status: 500,
                details: null
            };
        }

        isOnline() {
            return navigator.onLine;
        }

        async healthCheck() {
            try {
                const [blockchainHealth, casinoHealth] = await Promise.allSettled([
                    this.fetchAPI(`${this.blockchainUrl}/health`),
                    this.fetchAPI(`${this.casinoUrl}/php/health.php`)
                ]);

                return {
                    blockchain: {
                        status: blockchainHealth.status === 'fulfilled' ? 'online' : 'offline',
                        data: blockchainHealth.value || null,
                        error: blockchainHealth.reason?.message || null
                    },
                    casino: {
                        status: casinoHealth.status === 'fulfilled' ? 'online' : 'offline',
                        data: casinoHealth.value || null,
                        error: casinoHealth.reason?.message || null
                    }
                };
            } catch (error) {
                console.error('Health check error:', error);
                return {
                    blockchain: { status: 'offline', error: error.message },
                    casino: { status: 'offline', error: error.message }
                };
            }
        }
    }

    // Custom API Error class
    class APIError extends Error {
        constructor(message, status = 500, details = null) {
            super(message);
            this.name = 'APIError';
            this.status = status;
            this.details = details;
            this.timestamp = new Date().toISOString();
        }

        toJSON() {
            return {
                name: this.name,
                message: this.message,
                status: this.status,
                details: this.details,
                timestamp: this.timestamp
            };
        }
    }

    // Export for use in other modules
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { YeluxAPI, APIError };
    }

    // Global instance for browser use
    if (typeof window !== 'undefined') {
        window.YeluxAPI = YeluxAPI;
        window.APIError = APIError;
        window.yeluxAPI = new YeluxAPI();
    }
