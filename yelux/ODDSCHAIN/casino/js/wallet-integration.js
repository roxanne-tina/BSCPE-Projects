class WalletIntegration {
    constructor() {
        this.apiUrl = 'http://localhost:3001';
        this.currentUser = this.getCurrentUser();
    }

    getCurrentUser() {
        return JSON.parse(sessionStorage.getItem('casino_user') || '{}');
    }

    async syncWalletBalance() {
        if (!this.currentUser.wallet_address) {
            throw new Error('No wallet linked to account');
        }

        try {
            const response = await fetch(`${this.apiUrl}/balance/${this.currentUser.wallet_address}`);
            const data = await response.json();
            
            // Update casino database with blockchain balance
            await fetch('php/wallet-sync.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: this.currentUser.id,
                    wallet_address: this.currentUser.wallet_address,
                    balance: data.balance
                })
            });

            return data.balance;
        } catch (error) {
            console.error('Error syncing wallet:', error);
            throw error;
        }
    }

    async sendToBlockchain(recipientAddress, amount) {
        if (!this.currentUser.wallet_address) {
            throw new Error('No wallet linked to account');
        }

        try {
            const response = await fetch(`${this.apiUrl}/send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    from: this.currentUser.wallet_address,
                    to: recipientAddress,
                    amount: amount
                })
            });

            const result = await response.json();
            
            if (result.success) {
                // Update local casino balance
                await this.syncWalletBalance();
            }

            return result;
        } catch (error) {
            console.error('Error sending to blockchain:', error);
            throw error;
        }
    }

    async getWalletTransactions() {
        if (!this.currentUser.wallet_address) {
            return [];
        }

        try {
            const response = await fetch(`${this.apiUrl}/transactions/${this.currentUser.wallet_address}`);
            const data = await response.json();
            return data.transactions || [];
        } catch (error) {
            console.error('Error fetching transactions:', error);
            return [];
        }
    }

    async linkWallet(walletAddress, privateKey) {
        try {
            const response = await fetch('php/link-wallet.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: this.currentUser.id,
                    wallet_address: walletAddress,
                    private_key: privateKey
                })
            });

            const result = await response.json();
            
            if (result.success) {
                // Update session data
                this.currentUser.wallet_address = walletAddress;
                sessionStorage.setItem('casino_user', JSON.stringify(this.currentUser));
                
                // Sync balance
                await this.syncWalletBalance();
            }

            return result;
        } catch (error) {
            console.error('Error linking wallet:', error);
            throw error;
        }
    }
}

window.WalletIntegration = WalletIntegration;





history-loader.js
class HistoryLoader {
    constructor() {
        this.currentUser = this.getCurrentUser();
    }

    getCurrentUser() {
        return JSON.parse(sessionStorage.getItem('casino_user') || '{}');
    }

    async loadGameHistory(limit = 50, offset = 0) {
        try {
            const response = await fetch(`php/get-game-logs.php?user_id=${this.currentUser.id}&limit=${limit}&offset=${offset}`);
            const data = await response.json();
            return data.games || [];
        } catch (error) {
            console.error('Error loading game history:', error);
            return [];
        }
    }

    async loadMiningHistory(limit = 50, offset = 0) {
        try {
            const response = await fetch(`mining-history/get-history.php?wallet_address=${this.currentUser.wallet_address}&limit=${limit}&offset=${offset}`);
            const data = await response.json();
            return data.mining || [];
        } catch (error) {
            console.error('Error loading mining history:', error);
            return [];
        }
    }

    renderGameHistory(games, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const html = games.map(game => `
            <div class="history-item ${game.win_amount > 0 ? 'win' : 'loss'}">
                <div class="game-info">
                    <span class="game-type">${this.formatGameType(game.game_type)}</span>
                    <span class="game-time">${new Date(game.created_at).toLocaleString()}</span>
                </div>
                <div class="game-amounts">
                    <span class="bet-amount">Bet: ${game.bet_amount} YELUX</span>
                    <span class="win-amount ${game.win_amount > 0 ? 'positive' : 'negative'}">
                        ${game.win_amount > 0 ? '+' : ''}${game.win_amount - game.bet_amount} YELUX
                    </span>
                </div>
                <div class="game-details">
                    ${this.formatGameDetails(game.game_type, JSON.parse(game.game_data || '{}'))}
                </div>
            </div>
        `).join('');

        container.innerHTML = html;
    }

    renderMiningHistory(mining, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const html = mining.map(mine => `
            <div class="history-item mining">
                <div class="mining-info">
                    <span class="mining-type">Block Mined</span>
                    <span class="mining-time">${new Date(mine.timestamp).toLocaleString()}</span>
                </div>
                <div class="mining-details">
                    <span class="block-hash">Block: ${mine.block_hash.substring(0, 16)}...</span>
                    <span class="mining-reward">+${mine.reward} YELUX</span>
                </div>
            </div>
        `).join('');

        container.innerHTML = html;
    }

    formatGameType(gameType) {
        const types = {
            'coin-flip': 'Coin Flip',
            'lucky-dice': 'Lucky Dice',
            'slot-machine': 'Slot Machine',
            'rock-paper': 'Rock Paper Scissors',
            'number-guess': 'Number Guess'
        };
        return types[gameType] || gameType;
    }

    formatGameDetails(gameType, gameData) {
        switch (gameType) {
            case 'coin-flip':
                return `Chose: ${gameData.choice}, Result: ${gameData.result}`;
            case 'lucky-dice':
                return `Predicted: ${gameData.prediction}, Rolled: ${gameData.roll}`;
            case 'slot-machine':
                return `Reels: ${gameData.reels ? gameData.reels.join(' ') : 'N/A'}`;
            case 'rock-paper':
                return `You: ${gameData.playerChoice}, Computer: ${gameData.computerChoice}`;
            case 'number-guess':
                return `Guessed: ${gameData.guess}, Number: ${gameData.randomNumber}`;
            default:
                return '';
        }
    }
}

window.HistoryLoader = HistoryLoader;




mining-loader.js
class MiningLoader {
    constructor() {
        this.apiUrl = 'http://localhost:3001';
        this.currentUser = this.getCurrentUser();
    }

    getCurrentUser() {
        return JSON.parse(sessionStorage.getItem('casino_user') || '{}');
    }

    async startMining() {
        if (!this.currentUser.wallet_address) {
            throw new Error('No wallet linked to account');
        }

        try {
            const response = await fetch(`${this.apiUrl}/mine`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    miner_address: this.currentUser.wallet_address
                })
            });

            const result = await response.json();
            
            if (result.success) {
                // Log mining reward
                await this.logMiningReward(result.block, result.reward);
            }

            return result;
        } catch (error) {
            console.error('Error mining:', error);
            throw error;
        }
    }

    async logMiningReward(block, reward) {
        try {
            await fetch('mining-history/log.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: this.currentUser.id,
                    wallet_address: this.currentUser.wallet_address,
                    block_hash: block.hash,
                    block_index: block.index,
                    reward: reward,
                    timestamp: new Date().toISOString()
                })
            });
        } catch (error) {
            console.error('Error logging mining reward:', error);
        }
    }

    async getMiningStats() {
        if (!this.currentUser.wallet_address) {
            return { totalMined: 0, totalRewards: 0, lastMined: null };
        }

        try {
            const response = await fetch(`mining-history/get-history.php?wallet_address=${this.currentUser.wallet_address}&stats=true`);
            const data = await response.json();
            return data.stats || { totalMined: 0, totalRewards: 0, lastMined: null };
        } catch (error) {
            console.error('Error fetching mining stats:', error);
            return { totalMined: 0, totalRewards: 0, lastMined: null };
        }
    }

    async getNetworkHashRate() {
        try {
            const response = await fetch(`${this.apiUrl}/network/stats`);
            const data = await response.json();
            return data.hashRate || 0;
        } catch (error) {
            console.error('Error fetching network hash rate:', error);
            return 0;
        }
    }

    async getBlockchainInfo() {
        try {
            const response = await fetch(`${this.apiUrl}/blockchain/info`);
            const data = await response.json();
            return {
                height: data.height || 0,
                difficulty: data.difficulty || 1,
                totalSupply: data.totalSupply || 0
            };
        } catch (error) {
            console.error('Error fetching blockchain info:', error);
            return { height: 0, difficulty: 1, totalSupply: 0 };
        }
    }
}

window.MiningLoader = MiningLoader;
