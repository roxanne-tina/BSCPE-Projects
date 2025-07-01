const CONFIG = {
    // API Endpoints
    BLOCKCHAIN_API: 'http://localhost:3001',
    CASINO_API: 'http://localhost/YELUX-Project/casino',
    
    // Network settings
    NETWORK: {
        name: 'YELUX',
        symbol: 'YLX',
        decimals: 8
    },
    
    // API settings
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000,
    REQUEST_TIMEOUT: 10000,
    
    // Pagination
    ITEMS_PER_PAGE: 10,
    
    // Validation
    MIN_USERNAME_LENGTH: 3,
    MAX_USERNAME_LENGTH: 50,
    MIN_PASSWORD_LENGTH: 6,
    
    // Transaction limits
    MIN_DEPOSIT: 0.00000001,
    MIN_WITHDRAWAL: 0.00000001,
    MAX_WITHDRAWAL: 1000000
};

// Export for Node.js or browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
} else if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
}