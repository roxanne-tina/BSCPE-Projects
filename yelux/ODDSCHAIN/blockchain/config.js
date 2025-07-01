module.exports = {
    // Blockchain settings
    INITIAL_DIFFICULTY: 2,
    BLOCK_TIME: 10000, // 10 seconds in milliseconds
    DIFFICULTY_ADJUSTMENT_INTERVAL: 10, // Adjust difficulty every 10 blocks
    MINING_REWARD: 50,
    
    // Cryptography settings
    HASH_ALGORITHM: 'sha256',
    
    // Network settings
    MAX_PEERS: 10,
    PEER_DISCOVERY_INTERVAL: 30000, // 30 seconds
    
    // Transaction settings
    MIN_TRANSACTION_FEE: 0.001,
    MAX_TRANSACTION_SIZE: 1024, // bytes
    TRANSACTION_TIMEOUT: 300000, // 5 minutes
    
    // Wallet settings
    WALLET_VERSION: 1,
    ADDRESS_LENGTH: 40,
    
    // API settings
    API_PORT: 3001,
    API_RATE_LIMIT: 100, // requests per minute
    
    // Database settings (if using)
    DB_HOST: 'localhost',
    DB_PORT: 3306,
    DB_NAME: 'yelux',
    DB_USER: 'root',
    DB_PASSWORD: '',
    
    // Casino settings
    CASINO_HOUSE_EDGE: 0.02, // 2%
    MIN_BET: 0.00000001,
    MAX_BET: 1000,
    
    // Security settings
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_TIME: 900000, // 15 minutes
    SESSION_TIMEOUT: 3600000, // 1 hour
    
    // File paths
    BLOCKCHAIN_DATA_PATH: './data/blockchain.json',
    WALLET_DATA_PATH: './data/wallets/',
    LOG_PATH: './logs/',
    
    // Development settings
    DEBUG_MODE: process.env.NODE_ENV !== 'production',
    LOG_LEVEL: process.env.LOG_LEVEL || 'info'
};