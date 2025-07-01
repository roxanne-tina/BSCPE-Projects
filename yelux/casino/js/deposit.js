class DepositHistory {
    constructor() {
        this.init();
    }

    init() {
        this.loadDepositHistory();
        this.bindEvents();
    }

    bindEvents() {
        const refreshBtn = document.getElementById('refreshHistory');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadDepositHistory());
        }

        const filterForm = document.getElementById('filterForm');
        if (filterForm) {
            filterForm.addEventListener('submit', (e) => this.handleFilter(e));
        }

        const exportBtn = document.getElementById('exportHistory');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportHistory());
        }
    }

    async loadDepositHistory(filters = {}) {
        try {
            this.showLoading(true);
            
            const queryParams = new URLSearchParams(filters).toString();
            const url = `../php/get-deposit-logs.php${queryParams ? '?' + queryParams : ''}`;
            
            const response = await fetch(url);
            const result = await response.json();
            
            if (result.success) {
                this.displayHistory(result.deposits);
                this.updateSummary(result.summary);
            } else {
                throw new Error(result.message || 'Failed to load deposit history');
            }
            
        } catch (error) {
            console.error('Error loading deposit history:', error);
            this.showMessage('Failed to load deposit history', 'error');
            this.displayEmptyHistory();
        } finally {
            this.showLoading(false);
        }
    }

    displayHistory(deposits) {
        const container = document.getElementById('historyContainer');
        if (!container) return;

        if (!deposits || deposits.length === 0) {
            this.displayEmptyHistory();
            return;
        }

        const tableHTML = `
            <div class="history-table-container">
                <table class="history-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Amount</th>
                            <th>Wallet Address</th>
                            <th>Transaction ID</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${deposits.map(deposit => this.createDepositRow(deposit)).join('')}
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = tableHTML;
    }

    createDepositRow(deposit) {
        const date = new Date(deposit.created_at).toLocaleString();
        const statusClass = deposit.status === 'completed' ? 'status-success' : 
                           deposit.status === 'pending' ? 'status-pending' : 'status-failed';
        
        return `
            <tr>
                <td>${date}</td>
                <td class="amount">${parseFloat(deposit.amount).toFixed(4)} YELUX</td>
                <td class="wallet-address" title="${deposit.wallet_address}">
                    ${this.truncateAddress(deposit.wallet_address)}
                </td>
                <td class="transaction-id" title="${deposit.transaction_id || 'N/A'}">
                    ${deposit.transaction_id ? this.truncateHash(deposit.transaction_id) : 'N/A'}
                </td>
                <td><span class="status ${statusClass}">${deposit.status}</span></td>
            </tr>
        `;
    }

    displayEmptyHistory() {
        const container = document.getElementById('historyContainer');
        if (container) {
            container.innerHTML = `
                <div class="empty-history">
                    <p>No deposit history found.</p>
                    <a href="deposit.html" class="btn btn-primary">Make Your First Deposit</a>
                </div>
            `;
        }
    }

    updateSummary(summary) {
        const summaryContainer = document.getElementById('summaryContainer');
        if (!summaryContainer || !summary) return;

        summaryContainer.innerHTML = `
            <div class="summary-cards">
                <div class="summary-card">
                    <h4>Total Deposits</h4>
                    <p class="summary-value">${summary.total_count || 0}</p>
                </div>
                <div class="summary-card">
                    <h4>Total Amount</h4>
                    <p class="summary-value">${parseFloat(summary.total_amount || 0).toFixed(4)} YELUX</p>
                </div>
                <div class="summary-card">
                    <h4>This Month</h4>
                    <p class="summary-value">${parseFloat(summary.month_amount || 0).toFixed(4)} YELUX</p>
                </div>
                <div class="summary-card">
                    <h4>Average Deposit</h4>
                    <p class="summary-value">${parseFloat(summary.average_amount || 0).toFixed(4)} YELUX</p>
                </div>
            </div>
        `;
    }

    handleFilter(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const filters = {};
        
        for (let [key, value] of formData.entries()) {
            if (value.trim()) {
                filters[key] = value.trim();
            }
        }
        
        this.loadDepositHistory(filters);
    }

    async exportHistory() {
        try {
            this.showLoading(true);
            
            const response = await fetch('../php/export-deposit-history.php');
            const blob = await response.blob();
            
            if (blob.size === 0) {
                throw new Error('No data to export');
            }
            
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `deposit-history-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild( );          a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            this.showMessage('History exported successfully!', 'success');
            
        } catch (error) {
            console.error('Error exporting history:', error);
            this.showMessage('Failed to export history', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    truncateAddress(address) {
        if (!address) return 'N/A';
        return address.length > 12 ? 
            `${address.substring(0, 6)}...${address.substring(address.length - 6)}` : 
            address;
    }

    truncateHash(hash) {
        if (!hash) return 'N/A';
        return hash.length > 16 ? 
            `${hash.substring(0, 8)}...${hash.substring(hash.length - 8)}` : 
            hash;
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
        loadingDiv.textContent = 'Loading deposit history...';
        document.body.appendChild(loadingDiv);
        return loadingDiv;
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new DepositHistory();
});

