// Send YELUX functionality
let currentWallet = null;
let currentBalance = 0;

document.addEventListener('DOMContentLoaded', function() {
    initializeSendPage();
});

async function initializeSendPage() {
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
    
    await loadBalance();
    setupFormHandlers();
}

async function loadBalance() {
    try {
        const response = await fetch(`http://localhost:3001/api/wallet/balance/${currentWallet.address}`);
        const data = await response.json();
        
        if (data.success) {
            currentBalance = data.balance;
            document.getElementById('availableBalance').textContent = currentBalance.toFixed(2);
        } else {
            console.error('Error fetching balance:', data.message);
        }
    } catch (error) {
        console.error('Error connecting to blockchain:', error);
    }
}

function setupFormHandlers() {
    const sendForm = document.getElementById('sendForm');
    const amountInput = document.getElementById('amount');
    
    sendForm.addEventListener('submit', handleSendTransaction);
    amountInput.addEventListener('input', updateTransactionSummary);
    
    // Initial summary update
    updateTransactionSummary();
}

function updateTransactionSummary() {
    const amount = parseFloat(document.getElementById('amount').value) || 0;
    const fee = 0.01; // Fixed transaction fee
    const total = amount + fee;
    
    document.getElementById('summaryAmount').textContent = amount.toFixed(2) + ' YELUX';
    document.getElementById('summaryFee').textContent = fee.toFixed(2) + ' YELUX';
    document.getElementById('summaryTotal').textContent = total.toFixed(2) + ' YELUX';
    
    // Validate amount
    const sendButton = document.getElementById('sendButton');
    if (total > currentBalance) {
        sendButton.disabled = true;
        sendButton.textContent = 'Insufficient Balance';
        sendButton.classList.add('disabled');
    } else if (amount <= 0) {
        sendButton.disabled = true;
        sendButton.textContent = 'Enter Valid Amount';
        sendButton.classList.add('disabled');
    } else {
        sendButton.disabled = false;
        sendButton.textContent = 'Send YELUX';
        sendButton.classList.remove('disabled');
    }
}

async function handleSendTransaction(e) {
    e.preventDefault();
    
    const recipientAddress = document.getElementById('recipientAddress').value.trim();
    const amount = parseFloat(document.getElementById('amount').value);
    const note = document.getElementById('transactionNote').value.trim();
    
    // Validation
    if (!recipientAddress) {
        alert('Please enter recipient address');
        return;
    }
    
    if (recipientAddress === currentWallet.address) {
        alert('Cannot send to your own address');
        return;
    }
    
    if (amount <= 0) {
        alert('Please enter a valid amount');
        return;
    }
    
    if (amount + 0.01 > currentBalance) {
        alert('Insufficient balance (including transaction fee)');
        return;
    }
    
    // Confirm transaction
    const confirmMessage = `Send ${amount} YELUX to ${recipientAddress.substring(0, 20)}...?`;
    if (!confirm(confirmMessage)) {
        return;
    }
    
    // Disable form and show loading
    const sendButton = document.getElementById('sendButton');
    sendButton.disabled = true;
    sendButton.textContent = 'Sending...';
    
    try {
        const transactionData = {
            from: currentWallet.address,
            to: recipientAddress,
            amount: amount,
            privateKey: currentWallet.privateKey,
            note: note
        };
        
        const response = await fetch('http://localhost:3001/api/transaction/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(transactionData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showTransactionSuccess(result.transaction, amount, recipientAddress);
        } else {
            alert('Transaction failed: ' + result.message);
            resetSendForm();
        }
    } catch (error) {
        alert('Error sending transaction: ' + error.message);
        resetSendForm();
    }
}

function showTransactionSuccess(transaction, amount, recipientAddress) {
    // Hide form and show result
    document.querySelector('.send-form').style.display = 'none';
    document.getElementById('transactionResult').classList.remove('hidden');
    
    // Populate result details
    document.getElementById('transactionId').textContent = transaction.id || 'Pending';
    document.getElementById('sentAmount').textContent = amount + ' YELUX';
    document.getElementById('sentToAddress').textContent = recipientAddress;
}

function resetSendForm() {
    const sendButton = document.getElementById('sendButton');
    sendButton.disabled = false;
    sendButton.textContent = 'Send YELUX';
    sendButton.classList.remove('disabled');
}

function sendAnother() {
    // Reset form
    document.getElementById('sendForm').reset();
    document.querySelector('.send-form').style.display = 'block';
    document.getElementById('transactionResult').classList.add('hidden');
    
    // Reload balance
    loadBalance();
    updateTransactionSummary();
}

function setMaxAmount() {
    const fee = 0.01;
    const maxAmount = Math.max(0, currentBalance - fee);
    document.getElementById('amount').value = maxAmount.toFixed(2);
    updateTransactionSummary();
}

async function pasteFromClipboard() {
    try {
        const text = await navigator.clipboard.readText();
        document.getElementById('recipientAddress').value = text;
    } catch (error) {
        console.error('Failed to read clipboard:', error);
        alert('Please paste the address manually');
    }
}