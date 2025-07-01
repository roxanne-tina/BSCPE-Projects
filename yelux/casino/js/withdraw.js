class WithdrawHandler {
    constructor() {
        this.apiUrl = 'http://localhost:3001/api';
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadAccountInfo();
    }

    bindEvents() {
        const withdrawForm = document.getElementById('withdrawForm');
        if (withdrawForm) {
            withdrawForm.addEventListener('submit', (e) => this.handleWithdraw(e));
        }

        const amountInput = document.getElementById('withdrawAmount');
        if (amountInput) {
            amountInput.addEventListener('input', () => this.validateAmount());
        }
    }

    async loadAccountInfo() {
        try {
            // Load linked wallet info
            const walletResponse = await fetch('../php/link-wallet.php');
            const walletResult = await walletResponse.json();
            
            if (walletResult.success && walletResult.wallet) {
                await this.displayAccountInfo(walletResult.wallet);
            } else {
                this.displayNoWallet();
            }
            
        } catch (error) {
            console.error('Error loading account info:', error);
            this.showMessage('Failed to load account information', 'error');
        }
    }

    async displayAccountInfo(wallet) {
        try {
            // Get casino balance (you'll need to implement this endpoint)
            const casinoBalanceResponse = await fetch('../php/get-casino-balance.php');
            const casinoBalanceData = await casinoBalanceResponse.json();
            
            const container = document.getElementById('accountInfo');
            if (container) {
                container.innerHTML = `
                    <div class="account-display">
                        <h3>Your Account</h3>
                        <p><strong>Linked Wallet:</strong> ${wallet.address}</p>
                        <p><strong>Casino Balance:</strong> <span id="casinoBalance">${casinoBalanceData.balance || 0}</span> YELUX</p>
                        <p><strong>Available for Withdrawal:</strong> <span id="availableBalance">${casinoBalanceData.available || 0}</span> YELUX</p>
                    </div>
                `;
            }

            // Set max amount for withdrawal
            const maxAmount = casinoBalanceData.available || 0;
            const amountInput = document.getElementById('withdrawAmount');
            if (amountInput) {
                amountInput.max = maxAmount;
                amountInput.setAttribute('data-max', maxAmount);
            }

        } catch (error) {
            console.error('Error fetching casino balance:', error);
            this.showMessage('Failed to fetch casino balance', 'error');
        }
    }

    displayNoWallet() {
        const container = document.getElementById('accountInfo');
        if (container) {
            container.innerHTML = `
                <div class="no-wallet">
                    <p>No wallet linked to your account.</p>
                    <a href="manual-login.html" class="btn btn-primary">Link Wallet</a>
                </div>
            `;
        }

        // Disable withdraw form
        const withdrawForm = document.getElementById('withdrawForm');
        if (withdrawForm) {
            withdrawForm.style.display = 'none';
        }
    }

    validateAmount() {
        const amountInput = document.getElementById('withdrawAmount');
        const amount = parseFloat(amountInput.value);
        const maxAmount = parseFloat(amountInput.getAttribute('data-max') || 0);
        const submitBtn = document.getElementById('withdrawSubmit');
        
        if (amount <= 0) {
            this.showValidationError('Amount must be greater than 0');
            submitBtn.disabled = true;
            return false;
        }
        
        if (amount > maxAmount) {
            this.showValidationError(`Amount cannot exceed ${maxAmount} YELUX`);
            submitBtn.disabled = true;
            return false;
        }
        
        this.clearValidationError();
        submitBtn.disabled = false;
        return true;
    }

    async handleWithdraw(event) {
        event.preventDefault();
        
        if (!this.validateAmount()) {
            return;
        }

        const amount = parseFloat(document.getElementById('withdrawAmount').value);
        const password = document.getElementById('walletPassword').value;
        
        if (!password) {
            this.showMessage('Please enter your wallet password', 'error');
            return;
        }

        try {
            this.showLoading(true);
            
            // Get wallet info
            const walletResponse = await fetch('../php/link-wallet.php');
            const walletResult = await walletResponse.json();
            
            if (!walletResult.success || !walletResult.wallet) {
                throw new Error('No wallet linked to account');
            }

            const walletAddress = walletResult.wallet.address;
            
            // Verify wallet password
            const verifyResponse = await fetch(`${this.apiUrl}/wallet/verify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    address: walletAddress,
                    password: password
                })
            });

            const verifyResult = await verifyResponse.json();
            if (!verifyResult.success) {
                throw new Error('Invalid wallet password');
            }

            // Process withdrawal (transfer from casino to user wallet)
            const withdrawalData = {
                wallet_address: walletAddress,
                amount: amount,
                password: password
            };

            const withdrawResponse = await fetch('../php/process-withdrawal.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(withdrawalData)
            });

            const withdrawResult = await withdrawResponse.json();
            
            if (withdrawResult.success) {
                // Log withdrawal to database
                await this.logWithdrawal(walletAddress, amount, withdrawResult.transactionId);
                
                this.showMessage(`Successfully withdrew ${amount} YELUX to your wallet!`, 'success');
                document.getElementById('withdrawForm').reset();
                
                // Refresh account info
                setTimeout(() => {
                    this.loadAccountInfo();
                }, 2000);
                
            } else {
                throw new Error(withdrawResult.message || 'Withdrawal failed');
            }
            
        } catch (error) {
            console.error('Withdrawal error:', error);
            this.showMessage(error.message || 'Withdrawal failed', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async logWithdrawal(walletAddress, amount, transactionId) {
        try {
            const response = await fetch('../php/log-withdrawal.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    wallet_address: walletAddress,
                    amount: amount,
                    transaction_id: transactionId
                })
            });

            const result = await response.json();
            if (!result.success) {
                console.error('Failed to log withdrawal:', result.message);
            }
        } catch (error) {
            console.error('Error logging withdrawal:', error);
        }
    }

    showValidationError(message) {
        const errorDiv = document.getElementById('amountError') || this.createErrorDiv();
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }

    clearValidationError() {
        const errorDiv = document.getElementById('amountError');
        if (errorDiv) {
            errorDiv.style.display = 'none';
        }
    }

    createErrorDiv() {
        const errorDiv = document.createElement('div');
        errorDiv.id = 'amountError';
        errorDiv.className = 'error-message';
        
        const amountInput = document.getElementById('withdrawAmount');
        amountInput.parentNode.insertBefore(errorDiv, amountInput.nextSibling);
        
        return errorDiv;
    }

    showMessage(message, type) {
        const messageDiv = document.getElementById('message') || this.createMessageDiv();
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = message;
        messageDiv.style.display = 'block';
        
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 5000);
    }

    createMessageDiv() {
        const messageDiv = document.createElement('div');
        messageDiv.id = 'message';
        messageDiv.className = 'message';
        document.body.insertBefore(messageDiv, document.body.firstChild);
        return messageDiv;
    }

    showLoading(show) {
        const loadingDiv = document.getElementById('loading') || this.createLoadingDiv();
        loadingDiv.style.display = show ? 'block' : 'none';
    }

    createLoadingDiv() {
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'loading';
        loadingDiv.className = 'loading';
        loadingDiv.textContent = 'Processing withdrawal...';
        document.body.appendChild(loadingDiv);
        return loadingDiv;
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new WithdrawHandler();
});
