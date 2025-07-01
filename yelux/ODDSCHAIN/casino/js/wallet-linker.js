class WalletLinker {
    constructor() {
        this.apiUrl = 'http://localhost:3001/api';
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadLinkedWallet();
    }

    bindEvents() {
        const linkForm = document.getElementById('linkWalletForm');
        const unlinkBtn = document.getElementById('unlinkWallet');
        
        if (linkForm) {
            linkForm.addEventListener('submit', (e) => this.handleLinkWallet(e));
        }
        
        if (unlinkBtn) {
            unlinkBtn.addEventListener('click', () => this.handleUnlinkWallet());
        }
    }

    async handleLinkWallet(event) {
        event.preventDefault();
        
        const walletAddress = document.getElementById('walletAddress').value.trim();
        const walletPassword = document.getElementById('walletPassword').value;
        
        if (!walletAddress || !walletPassword) {
            this.showMessage('Please enter both wallet address and password', 'error');
            return;
        }

        try {
            this.showLoading(true);
            
            // Verify wallet exists and password is correct
            const walletResponse = await fetch(`${this.apiUrl}/wallet/${walletAddress}`);
            if (!walletResponse.ok) {
                throw new Error('Wallet not found');
            }

            // Link wallet to current user
            const linkResponse = await fetch('../php/link-wallet.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    wallet_address: walletAddress,
                    wallet_password: walletPassword
                })
            });

            const result = await linkResponse.json();
            
            if (result.success) {
                this.showMessage('Wallet linked successfully!', 'success');
                this.loadLinkedWallet();
                document.getElementById('linkWalletForm').reset();
            } else {
                throw new Error(result.message || 'Failed to link wallet');
            }
            
        } catch (error) {
            console.error('Error linking wallet:', error);
            this.showMessage(error.message || 'Failed to link wallet', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async handleUnlinkWallet() {
        if (!confirm('Are you sure you want to unlink your wallet?')) {
            return;
        }

        try {
            this.showLoading(true);
            
            const response = await fetch('../php/link-wallet.php', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            const result = await response.json();
            
            if (result.success) {
                this.showMessage('Wallet unlinked successfully!', 'success');
                this.loadLinkedWallet();
            } else {
                throw new Error(result.message || 'Failed to unlink wallet');
            }
            
        } catch (error) {
            console.error('Error unlinking wallet:', error);
            this.showMessage(error.message || 'Failed to unlink wallet', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async loadLinkedWallet() {
        try {
            const response = await fetch('../php/link-wallet.php');
            const result = await response.json();
            
            if (result.success && result.wallet) {
                this.displayLinkedWallet(result.wallet);
            } else {
                this.displayNoWallet();
            }
            
        } catch (error) {
            console.error('Error loading linked wallet:', error);
            this.displayNoWallet();
        }
    }

    displayLinkedWallet(wallet) {
        const container = document.getElementById('linkedWalletInfo');
        if (container) {
            container.innerHTML = `
                <div class="wallet-info">
                    <h3>Linked Wallet</h3>
                    <p><strong>Address:</strong> ${wallet.address}</p>
                    <p><strong>Balance:</strong> ${wallet.balance || 0} YELUX</p>
                    <p><strong>Linked:</strong> ${new Date(wallet.linked_at).toLocaleString()}</p>
                    <button id="unlinkWallet" class="btn btn-danger">Unlink Wallet</button>
                </div>
            `;
            this.bindEvents(); // Re-bind events for new button
        }

        // Hide link form if wallet is linked
        const linkForm = document.getElementById('linkWalletSection');
        if (linkForm) {
            linkForm.style.display = 'none';
        }
    }

    displayNoWallet() {
        const container = document.getElementById('linkedWalletInfo');
        if (container) {
            container.innerHTML = '<p>No wallet linked to your account.</p>';
        }

        // Show link form if no wallet is linked
        const linkForm = document.getElementById('linkWalletSection');
        if (linkForm) {
            linkForm.style.display = 'block';
        }
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
        loadingDiv.textContent = 'Loading...';
        document.body.appendChild(loadingDiv);
        return loadingDiv;
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new WalletLinker();
});

