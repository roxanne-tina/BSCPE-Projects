class GameLogic {
    constructor() {
        this.apiUrl = 'http://localhost:3001';
        this.currentUser = this.getCurrentUser();
    }

    getCurrentUser() {
        return JSON.parse(sessionStorage.getItem('casino_user') || '{}');
    }

    async getUserBalance() {
        try {
            const response = await fetch(`${this.apiUrl}/balance/${this.currentUser.wallet_address}`);
            const data = await response.json();
            return data.balance || 0;
        } catch (error) {
            console.error('Error fetching balance:', error);
            return 0;
        }
    }

    async placeBet(gameType, betAmount, gameData) {
        const balance = await this.getUserBalance();
        
        if (balance < betAmount) {
            throw new Error('Insufficient balance');
        }

        const gameResult = this.processGame(gameType, gameData);
        const winAmount = gameResult.won ? this.calculateWinnings(gameType, betAmount, gameData) : 0;
        
        // Log game to database
        await this.logGame(gameType, betAmount, winAmount, gameResult);
        
        // Update blockchain balance
        if (gameResult.won && winAmount > 0) {
            await this.updateBalance(winAmount);
        } else {
            await this.updateBalance(-betAmount);
        }

        return {
            ...gameResult,
            winAmount,
            newBalance: await this.getUserBalance()
        };
    }

    processGame(gameType, gameData) {
        switch (gameType) {
            case 'coin-flip':
                return this.processCoinFlip(gameData);
            case 'lucky-dice':
                return this.processLuckyDice(gameData);
            case 'slot-machine':
                return this.processSlotMachine(gameData);
            case 'rock-paper':
                return this.processRockPaper(gameData);
            case 'number-guess':
                return this.processNumberGuess(gameData);
            default:
                throw new Error('Unknown game type');
        }
    }

    processCoinFlip(gameData) {
        const result = Math.random() < 0.5 ? 'heads' : 'tails';
        const won = result === gameData.choice;
        return { won, result, choice: gameData.choice };
    }

    processLuckyDice(gameData) {
        const roll = Math.floor(Math.random() * 6) + 1;
        const won = roll === gameData.prediction;
        return { won, roll, prediction: gameData.prediction };
    }

    processSlotMachine(gameData) {
        const symbols = ['🍒', '🍋', '🍊', '🍇', '⭐', '💎'];
        const reels = [
            symbols[Math.floor(Math.random() * symbols.length)],
            symbols[Math.floor(Math.random() * symbols.length)],
            symbols[Math.floor(Math.random() * symbols.length)]
        ];
        
        const won = reels[0] === reels[1] && reels[1] === reels[2];
        return { won, reels };
    }

    processRockPaper(gameData) {
        const choices = ['rock', 'paper', 'scissors'];
        const computerChoice = choices[Math.floor(Math.random() * 3)];
        const playerChoice = gameData.choice;
        
        let won = false;
        if (
            (playerChoice === 'rock' && computerChoice === 'scissors') ||
            (playerChoice === 'paper' && computerChoice === 'rock') ||
            (playerChoice === 'scissors' && computerChoice === 'paper')
        ) {
            won = true;
        }
        
        return { won, playerChoice, computerChoice };
    }

    processNumberGuess(gameData) {
        const randomNumber = Math.floor(Math.random() * 10) + 1;
        const won = randomNumber === gameData.guess;
        return { won, randomNumber, guess: gameData.guess };
    }

    calculateWinnings(gameType, betAmount, gameData) {
        const multipliers = {
            'coin-flip': 2,
            'lucky-dice': 6,
            'slot-machine': 10,
            'rock-paper': 2,
            'number-guess': 10
        };
        
        return betAmount * multipliers[gameType];
    }

    async logGame(gameType, betAmount, winAmount, gameResult) {
        try {
            await fetch('php/log-game.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: this.currentUser.id,
                    game_type: gameType,
                    bet_amount: betAmount,
                    win_amount: winAmount,
                    game_data: JSON.stringify(gameResult)
                })
            });
        } catch (error) {
            console.error('Error logging game:', error);
        }
    }

    async updateBalance(amount) {
        try {
            const response = await fetch('php/update-balance.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    wallet_address: this.currentUser.wallet_address,
                    amount: amount
                })
            });
            return await response.json();
        } catch (error) {
            console.error('Error updating balance:', error);
        }
    }
}

// Export for use in game pages
window.GameLogic = GameLogic;
