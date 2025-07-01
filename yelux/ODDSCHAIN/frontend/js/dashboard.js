// Dashboard functionality
let currentWallet = null;

document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
});

async function initializeDashboard() {
    // Check if user is logged in
    if (!isWalletUnlocked()) {
        showLoginSection();
        return;
    }
    
    currentWallet = getCurrentWallet();
    if (currentWallet) {
        showDashboardContent();
        await loadWalletData();
    } else {
        showLoginSection();
    }
}

function showLoginSection() {
    document.getElementById('loginSection').style.display = 'block';
    document.getElementById('dashboardContent').classList.add('hidden');
    
    // Setup login form
    document.getElementById('walletLoginForm').addEventListener('submit', handleWalletLogin);
}

function showDashboardContent() {
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('dashboardContent').classList.remove('hidden');
}

async function handleWalletLogin(e) {
    e.preventDefault();
    
    const password = document.getElementById('walletPassword').value;
    
    try {
        const success = await unlockWallet(password);
        if (success) {
            currentWallet = getCurrentWallet();
            showDashboardContent();
            await loadWalletData();
        } else {
            alert('Invalid password. Please try again.');
        }
    } catch (error) {
        alert('Error unlocking wallet: ' + error.message);
    }
}

async function loadWalletData() {
    if (!currentWallet) return;
    
    // Display wallet address
    document.getElementById('currentWalletAddress').textContent = currentWallet.address;
    
    // Load balance
    await refreshBalance();
    
    // Load recent transactions
    await loadRecentTransactions();
}

async function refreshBalance() {
    if (!currentWallet) return;
    
    try {
        const response = await fetch(`http://localhost:3001/api/wallet/balance/${currentWallet.address}`);
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('walletBalance').textContent = data.balance.toFixed(2);
        } else {
            console.error('Error fetching balance:', data.message);
        }
    } catch (error) {
        console.error('Error connecting to blockchain:', error);
        document.getElementById('walletBalance').textContent = '0.00';
    }
}

async function loadRecentTransactions() {
    if (!currentWallet) return;
    
    const transactionsList = document.getElementById('transactionsList');
    
    try {
        const response = await fetch(`http://localhost:3001/api/wallet/transactions/${currentWallet.address}`);
        const data = await response.json();
        
        if (data.success && data.transactions.length > 0) {
            transactionsList.innerHTML = data.transactions.slice(0, 5).map(tx => `
                <div class="transaction-item">
                    <div class="transaction-info">
                        <div class="transaction-type ${tx.from === currentWallet.address ? 'sent' : 'received'}">
                            ${tx.from === currentWallet.address ? '📤 Sent' : '📥 Received'}
                        </div>
                        <div class="transaction-address">
                            ${tx.from === currentWallet.address ? 'To: ' + tx.to.substring(0, 20) + '...' : 'From: ' + tx.from.substring(0, 20) + '...'}
                        </div>
                        <div class="transaction-date">${new Date(tx.timestamp).toLocaleDateString()}</div>
                    </div>
                    <div class="transaction-amount ${tx.from === currentWallet.address ? 'negative' : 'positive'}">
                        ${tx.from === currentWallet.address ? '-' : '+'}${tx.amount} YELUX
                    </div>
                </div>
            `).join('');
        } else {
            transactionsList.innerHTML = '<div class="no-transactions">No transactions found</div>';
        }
    } catch (error) {
        transactionsList.innerHTML = '<div class="error">Error loading transactions</div>';
    }
}

async function startMining() {
    if (!currentWallet) {
        alert('Please unlock your wallet first');
        return;
    }
    
    try {
        const response = await fetch('http://localhost:3001/api/mining/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ minerAddress: currentWallet.address })
        });
        
        const result = await response.json();
        if (result.success) {
            alert('Mining started! Check mining history for updates.');
        } else {
            alert('Error starting mining: ' + result.message);
        }
    } catch (error) {
        alert('Error connecting to mining service: ' + error.message);
    }
}

function copyAddress() {
    const address = document.getElementById('currentWalletAddress').textContent;
    navigator.clipboard.writeText(address).then(() => {
        alert('Address copied to clipboard!');
    });
}

// Logout functionality
document.getElementById('logoutBtn').addEventListener('click', function() {
    if (confirm('Are you sure you want to logout?')) {
        clearWalletSession();
        window.location.reload();
    }
});

// Auto-refresh balance every 30 seconds
setInterval(() => {
    if (currentWallet && !document.getElementById('dashboardContent').classList.contains('hidden')) {
        refreshBalance();
    }
}, 30000);
