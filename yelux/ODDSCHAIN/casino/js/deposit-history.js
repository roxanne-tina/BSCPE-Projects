class DepositHistoryManager {
    constructor() {
        this.currentUser = null;
        this.deposits = [];
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.totalPages = 1;
        this.filters = {
            status: 'all',
            dateFrom: null,
            dateTo: null
        };
        this.api = new YeluxAPI();
        
        this.init();
    }

    async init() {
        try {
            await this.checkUserSession();
            await this.loadDepositHistory();
            this.setupEventListeners();
            this.renderDepositHistory();
        } catch (error) {
            console.error('Failed to initialize deposit history:', error);
            this.showError('Failed to load deposit history');
        }
    }

    async checkUserSession() {
        try {
            const data = await this.api.getUserInfo();
            
            if (!data.success || !data.user) {
                window.location.href = '../auth/login.html';
                return;
            }

            this.currentUser = data.user;
            this.updateUserInfo();
        } catch (error) {
            console.error('Session check error:', error);
            window.location.href = '../auth/login.html';
        }
    }

    updateUserInfo() {
        const userNameElement = document.getElementById('userName');
        const userBalanceElement = document.getElementById('userBalance');
        
        if (userNameElement && this.currentUser) {
            userNameElement.textContent = this.currentUser.username;
        }
        
        if (userBalanceElement && this.currentUser) {
            userBalanceElement.textContent = `${this.currentUser.balance || 0} YLX`;
        }
    }

    setupEventListeners() {
        // Refresh button
        const refreshBtn = document.getElementById('refreshHistory');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadDepositHistory());
        }

        // Filter form
        const filterForm = document.getElementById('filterForm');
        if (filterForm) {
            filterForm.addEventListener('submit', (e) => this.handleFilter(e));
        }

        // Export button
        const exportBtn = document.getElementById('exportHistory');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportHistory());
        }

        // Pagination
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('page-btn')) {
                const page = parseInt(e.target.dataset.page);
                this.currentPage = page;
                this.loadDepositHistory();
            }
        });
    }

    async loadDepositHistory(filters = {}) {
        try {
            this.showLoading(true);
            
            const queryFilters = {
                ...this.filters,
                ...filters,
                page: this.currentPage,
                limit: this.itemsPerPage
            };
            
            const result = await this.api.getDepositHistory(queryFilters);
            
            if (result.success) {
                this.deposits = result.deposits;
                this.renderDepositHistory();
                this.renderPagination(result.pagination);
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

    renderDepositHistory() {
        const container = document.getElementById('historyContainer');
        if (!container) return;

        if (!this.deposits || this.deposits.length === 0) {
            this.displayEmptyHistory();
            return;
        }

        const tableHTML = `
            <div class="table-responsive">
                <table class="table table-striped">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Amount</th>
                            <th>Transaction Hash</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.deposits.map(deposit => `
                            <tr>
                                <td>${this.formatDate(deposit.created_at)}</td>
                                <td>${this.formatAmount(deposit.amount)} YLX</td>
                                <td>
                                    <span class="tx-hash" title="${deposit.tx_hash}">
                                        ${this.truncateHash(deposit.tx_hash)}
                                    </span>
                                </td>
                                <td>
                                    <span class="badge badge-${this.getStatusClass(deposit.status)}">
                                        ${deposit.status}
                                    </span>
                                </td>
                                <td>
                                    <button class="btn btn-sm btn-outline-primary" 
                                            onclick="depositHistory.viewTransaction('${deposit.tx_hash}')">
                                        View
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = tableHTML;
    }

    renderPagination(pagination) {
        const container = document.getElementById('paginationContainer');
        if (!container || !pagination) return;

        const { current_page, total_pages } = pagination;
        
        if (total_pages <= 1) {
            container.innerHTML = '';
            return;
        }

        let paginationHTML = '<nav><ul class="pagination justify-content-center">';
        
        // Previous button
        paginationHTML += `
            <li class="page-item ${current_page === 1 ? 'disabled' : ''}">
                <button class="page-link page-btn" data-page="${current_page - 1}" ${current_page === 1 ? 'disabled' : ''}>
                    Previous
                </button>
            </li>
        `;
        
        // Page numbers
        for (let i = Math.max(1, current_page - 2); i <= Math.min(total_pages, current_page + 2); i++) {
            paginationHTML += `
                <li class="page-item ${i === current_page ? 'active' : ''}">
                    <button class="page-link page-btn" data-page="${i}">${i}</button>
                </li>
            `;
        }
        
        // Next button
        paginationHTML += `
            <li class="page-item ${current_page === total_pages ? 'disabled' : ''}">
                <button class="page-link page-btn" data-page="${current_page + 1}" ${current_page === total_pages ? 'disabled' : ''}>
                    Next
                </button>
            </li>
        `;
        
        paginationHTML += '</ul></nav>';
        container.innerHTML = paginationHTML;
    }

    handleFilter(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        this.filters = {
            status: formData.get('status') || 'all',
            dateFrom: formData.get('dateFrom') || null,
            dateTo: formData.get('dateTo') || null
        };
        
        this.currentPage = 1;
        this.loadDepositHistory();
    }

    updateSummary(summary) {
        if (!summary) return;
        
        const summaryContainer = document.getElementById('summaryContainer');
        if (summaryContainer) {
            summaryContainer.innerHTML = `
                <div class="row">
                    <div class="col-md-3">
                        <div class="stat-card">
                            <h6>Total Deposits</h6>
                            <h4>${summary.total_deposits || 0}</h4>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="stat-card">
                            <h6>Total Amount</h6>
                            <h4>${this.formatAmount(summary.total_amount || 0)} YLX</h4>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="stat-card">
                            <h6>Completed</h6>
                            <h4>${summary.completed_count || 0}</h4>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="stat-card">
                            <h6>Pending</h6>
                            <h4>${summary.pending_count || 0}</h4>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    // Utility methods
    formatDate(dateString) {
        return new Date(dateString).toLocaleString();
    }

    formatAmount(amount) {
        return parseFloat(amount).toFixed(8);
    }

    truncateHash(hash) {
        if (!hash) return 'N/A';
        return hash.length > 16 ? `${hash.substring(0, 8)}...${hash.substring(hash.length - 8)}` : hash;
    }

    getStatusClass(status) {
        switch (status) {
            case 'completed': return 'success';
            case 'pending': return 'warning';
            case 'failed': return 'danger';
            default: return 'secondary';
        }
    }

    showLoading(show) {
        const loader = document.getElementById('loadingSpinner');
        if (loader) {
            loader.style.display = show ? 'block' : 'none';
        }
    }

    showMessage(message, type = 'info') {
        // Create or update message container
        let messageContainer = document.getElementById('messageContainer');
        if (!messageContainer) {
            messageContainer = document.createElement('div');
            messageContainer.id = 'messageContainer';
            document.body.insertBefore(messageContainer, document.body.firstChild);
        }
        
        messageContainer.innerHTML = `
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="close" data-dismiss="alert">
                    <span>&times;</span>
                </button>
            </div>
        `;
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            messageContainer.innerHTML = '';
        }, 5000);
    }

    displayEmptyHistory() {
        const container = document.getElementById('historyContainer');
        if (container) {
            container.innerHTML = `
                <div class="empty-state text-center py-5">
                    <i class="fas fa-inbox fa-3x text-muted mb-3"></i>
                    <h5>No deposits found</h5>
                    <p class="text-muted">You haven't made any deposits yet.</p>
                </div>
            `;
        }
    }

    viewTransaction(txHash) {
        if (txHash) {
            // Open blockchain explorer or show transaction details
            window.open(`http://localhost:3001/transaction/${txHash}`, '_blank');
        }
    }

    exportHistory() {
        // Export deposit history to CSV
        if (!this.deposits || this.deposits.length === 0) {
            this.showMessage('No data to export', 'warning');
            return;
        }

        const csvContent = this.generateCSV(this.deposits);
        this.downloadCSV(csvContent, 'deposit-history.csv');
    }

    generateCSV(data) {
        const headers = ['Date', 'Amount', 'Transaction Hash', 'Status'];
        const csvRows = [headers.join(',')];
        
        data.forEach(deposit => {
            const row = [
                this.formatDate(deposit.created_at),
                deposit.amount,
                deposit.tx_hash,
                deposit.status
            ];
            csvRows.push(row.join(','));
        });
        
        return csvRows.join('\n');
    }

    downloadCSV(content, filename) {
        const blob = new Blob([content], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.depositHistory = new DepositHistoryManager();
});
