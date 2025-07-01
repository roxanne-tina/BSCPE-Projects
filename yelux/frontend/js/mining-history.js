// Mining history functionality
let currentWallet = null;
let miningInterval = null;
let isMining = false;

document.addEventListener('DOMContentLoaded', function() {
    initializeMiningHistory();
});

async function initializeMiningHistory() {
    // Check wallet session
    if (!isWalletUnlocked()) {
        alert('Please unlock your wallet first');
        window.location.href = 'dashboard.html';
        return;
    }
    
    currentWallet = getCurrentWallet();
    if (!currentWallet) {
        alert('Wallet not found');
        window.location.href = 'dashboard.html';
        return;
    }
    
    await loadMiningStats();
    await loadMiningHistory();
}

async function loadMiningStats() {
    try {
        const response = await fetch(`http://localhost:3001/api/mining/stats/${currentWallet.address}`);
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('totalMined').textContent = data.totalMined.toFixed(2);
            document.getElementById('blocksMined').textContent = data.blocksMined;
            document.getElementById('lastMining').textContent = data.lastMining ? 
                new Date(data.lastMining).toLocaleString() : 'Never';
        }
    } catch (error) {
        console.error('Error loading mining stats:', error);
    }
}

async function loadMiningHistory() {
    try {
        const response = await fetch(`http://localhost:3001/api/mining/history/${currentWallet.address}`);
        const data = await response.json();
        
        const tableBody = document.getElementById('historyTableBody');
        
        if (data.success && data.history.length > 0) {
            tableBody.innerHTML = data.history.map(record => `
                <tr>
                    <td>${new Date(record.timestamp).toLocaleString()}</td>
                    <td>#${record.blockNumber}</td>
                    <td>${record.reward} YELUX</td>
                    <td class="hash-cell" title="${record.hash}">${record.hash.substring(0, 16)}...</td>
                    <td><span class="status-badge ${record.status}">${record.status}</span></td>
                </tr>
            `).join('');
        } else {
            tableBody.innerHTML = '<tr><td colspan="5" class="no-data">No mining history found</td></tr>';
        }
    } catch (error) {
        document.getElementById('historyTableBody').innerHTML = 
            '<tr><td colspan="5" class="error">Error loading mining history</td></tr>';
    }
}

async function startMining() {
    if (isMining) {
        alert('Mining is already in progress');
        return;
    }
    
    isMining = true;
    document.getElementById('startMiningBtn').classList.add('hidden');
    document.getElementById('stopMiningBtn').classList.remove('hidden');
    document.getElementById('miningStatus').classList.remove('hidden');
    
    try {
        const response = await fetch('http://localhost:3001/api/mining/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ minerAddress: currentWallet.address })
        });
        
        const result = await response.json();
        
        if (result.success) {
            startMiningAnimation();
            // Poll for mining completion
            miningInterval = setInterval(checkMiningStatus, 2000);
        } else {
            alert('Error starting mining: ' + result.message);
            stopMining();
        }
    } catch (error) {
        alert('Error connecting to mining service: ' + error.message);
        stopMining();
    }
}

function stopMining() {
    isMining = false;
    document.getElementById('startMiningBtn').classList.remove('hidden');
    document.getElementById('stopMiningBtn').classList.add('hidden');
    document.getElementById('miningStatus').classList.add('hidden');
    
    if (miningInterval) {
        clearInterval(miningInterval);
        miningInterval = null;
    }
    
    // Stop mining on server
    fetch('http://localhost:3001/api/mining/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minerAddress: currentWallet.address })
    }).catch(console.error);
}

async function checkMiningStatus() {
    try {
        const response = await fetch(`http://localhost:3001/api/mining/status/${currentWallet.address}`);
        const data = await response.json();
        
        if (data.success) {
            if (data.status === 'completed') {
                // Mining completed
                alert(`Mining completed! You earned ${data.reward} YELUX`);
                stopMining();
                await loadMiningStats();
                await loadMiningHistory();
            } else if (data.status === 'mining') {
                // Update progress
                updateMiningProgress(data.progress || 0);
            }
        }
    } catch (error) {
        console.error('Error checking mining status:', error);
    }
}

function startMiningAnimation() {
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    
    let progress = 0;
    const animationInterval = setInterval(() => {
        progress += Math.random() * 5;
        if (progress > 95) progress = 95; // Don't complete until actual mining is done
        
        progressFill.style.width = progress + '%';
        progressText.textContent = `Mining... ${Math.floor(progress)}%`;
        
        if (!isMining) {
            clearInterval(animationInterval);
        }
    }, 500);
}

function updateMiningProgress(actualProgress) {
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    
    progressFill.style.width = actualProgress + '%';
    progressText.textContent = `Mining... ${Math.floor(actualProgress)}%`;
}

function refreshHistory() {
    loadMiningStats();
    loadMiningHistory();
}






'wallet-auth.js'
// Wallet authentication and session management

function isWalletUnlocked() {
    return localStorage.getItem('wallet_session') === 'active' && 
           localStorage.getItem('current_wallet') !== null;
}

async function unlockWallet(password) {
    try {
        const encryptedWallet = localStorage.getItem('yelux_wallet');
        if (!encryptedWallet) {
            throw new Error('No wallet found. Please create a wallet first.');
        }
        
        const walletData = JSON.parse(encryptedWallet);
        const decryptedWallet = await decryptWallet(walletData, password);
        
        if (decryptedWallet) {
            // Store in session
            localStorage.setItem('current_wallet', JSON.stringify(decryptedWallet));
            localStorage.setItem('wallet_session', 'active');
            localStorage.setItem('session_timestamp', Date.now().toString());
            
            return true;
        } else {
            return false;
        }
    } catch (error) {
        console.error('Error unlocking wallet:', error);
        return false;
    }
}

function getCurrentWallet() {
    try {
        const walletData = localStorage.getItem('current_wallet');
        return walletData ? JSON.parse(walletData) : null;
    } catch (error) {
        console.error('Error getting current wallet:', error);
        return null;
    }
}

function clearWalletSession() {
    localStorage.removeItem('current_wallet');
    localStorage.removeItem('wallet_session');
    localStorage.removeItem('session_timestamp');
}

function isSessionExpired() {
    const sessionTimestamp = localStorage.getItem('session_timestamp');
    if (!sessionTimestamp) return true;
    
    const sessionAge = Date.now() - parseInt(sessionTimestamp);
    const maxAge = 30 * 60 * 1000; // 30 minutes
    
    return sessionAge > maxAge;
}

// Auto-logout on session expiry
setInterval(() => {
    if (isWalletUnlocked() && isSessionExpired()) {
        clearWalletSession();
        if (window.location.pathname.includes('dashboard.html')) {
            window.location.reload();
        }
    }
}, 60000); // Check every minute

