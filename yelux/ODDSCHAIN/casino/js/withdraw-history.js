  class WithdrawHistoryManager {
      constructor() {
          this.currentUser = null;
          this.withdrawals = [];
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
              await this.loadWithdrawHistory();
              this.setupEventListeners();
              this.renderWithdrawHistory();
          } catch (error) {
              console.error('Failed to initialize withdraw history:', error);
              this.showError('Failed to load withdrawal history');
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

      async loadWithdrawHistory(filters = {}) {
          try {
              this.showLoading(true);
            
              const queryFilters = {
                  ...this.filters,
                  ...filters,
                  page: this.currentPage,
                  limit: this.itemsPerPage
              };
            
              const result = await this.api.getWithdrawalHistory(queryFilters);
            
              if (result.success) {
                  this.withdrawals = result.withdrawals;
                  this.renderWithdrawHistory();
                  this.renderPagination(result.pagination);
                  this.updateSummary(result.summary);
              } else {
                  throw new Error(result.message || 'Failed to load withdrawal history');
              }
            
          } catch (error) {
              console.error('Error loading withdrawal history:', error);
              this.showMessage('Failed to load withdrawal history', 'error');
              this.displayEmptyHistory();
          } finally {
              this.showLoading(false);
          }
      }

      renderWithdrawHistory() {
          const container = document.getElementById('historyContainer');
          if (!container) return;

          if (!this.withdrawals || this.withdrawals.length === 0) {
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
                              <th>To Address</th>
                              <th>Transaction Hash</th>
                              <th>Status</th>
                              <th>Actions</th>
                          </tr>
                      </thead>
                      <tbody>
                          ${this.withdrawals.map(withdrawal => `
                              <tr>
                                  <td>${this.formatDate(withdrawal.created_at)}</td>
                                  <td>${this.formatAmount(withdrawal.amount)} YLX</td>
                                  <td>
                                      <span class="address" title="${withdrawal.to_address}">
                                          ${this.truncateAddress(withdrawal.to_address)}
                                      </span>
                                  </td>
                                  <td>
                                      <span class="tx-hash" title="${withdrawal.tx_hash || 'N/A'}">
                                          ${this.truncateHash(withdrawal.tx_hash)}
                                      </span>
                                  </td>
                                  <td>
                                      <span class="badge badge-${this.getStatusClass(withdrawal.status)}">
                                          ${withdrawal.status}
                                      </span>
                                  </td>
                                  <td>
                                      ${withdrawal.tx_hash ? `
                                          <button class="btn btn-sm btn-outline-primary" 
                                                  onclick="withdrawHistory.viewTransaction('${withdrawal.tx_hash}')">
                                              View
                                          </button>
                                      ` : '<span class="text-muted">Pending</span>'}
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

      setupEventListeners() {
          // Refresh button
          const refreshBtn = document.getElementById('refreshHistory');
          if (refreshBtn) {
              refreshBtn.addEventListener('click', () => this.loadWithdrawHistory());
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
                  this.loadWithdrawHistory();
              }
          });
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
          this.loadWithdrawHistory();
      }

      updateSummary(summary) {
          if (!summary) return;
        
          const summaryContainer = document.getElementById('summaryContainer');
          if (summaryContainer) {
              summaryContainer.innerHTML = `
                  <div class="row">
                      <div class="col-md-3">
                          <div class="stat-card">
                              <h6>Total Withdrawals</h6>
                              <h4>${summary.total_withdrawals || 0}</h4>
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

      truncateAddress(address) {
          if (!address) return 'N/A';
          return address.length > 16 ? `${address.substring(0, 8)}...${address.substring(address.length - 8)}` : address;
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
        
          setTimeout(() => {
              messageContainer.innerHTML = '';
          }, 5000);
      }

      displayEmptyHistory() {
          const container = document.getElementById('historyContainer');
          if (container) {
              container.innerHTML = `
                  <div class="empty-state text-center py-5">
                      <i class="fas fa-wallet fa-3x text-muted mb-3"></i>
                      <h5>No withdrawals found</h5>
                      <p class="text-muted">You haven't made any withdrawals yet.</p>
                  </div>
              `;
          }
      }

      viewTransaction(txHash) {
          if (txHash) {
              window.open(`http://localhost:3001/transaction/${txHash}`, '_blank');
          }
      }

      exportHistory() {
          if (!this.withdrawals || this.withdrawals.length === 0) {
              this.showMessage('No data to export', 'warning');
              return;
          }

          const csvContent = this.generateCSV(this.withdrawals);
          this.downloadCSV(csvContent, 'withdrawal-history.csv');
      }

      generateCSV(data) {
          const headers = ['Date', 'Amount', 'To Address', 'Transaction Hash', 'Status'];
          const csvRows = [headers.join(',')];
        
          data.forEach(withdrawal => {
              const row = [
                  this.formatDate(withdrawal.created_at),
                  withdrawal.amount,
                  withdrawal.to_address,
                  withdrawal.tx_hash || 'N/A',
                  withdrawal.status
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
      window.withdrawHistory = new WithdrawHistoryManager();
  });
