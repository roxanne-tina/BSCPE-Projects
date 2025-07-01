// YELUX Blockchain Configuration
module.exports = {
    // Network Configuration
    NETWORK_NAME: 'YELUX Network',
    VERSION: '1.0.0',
    
    // Token Configuration
    TOKEN_NAME: 'YELUX',
    TOKEN_SYMBOL: 'YLX',
    TOTAL_SUPPLY: 21000000, // 21 million total supply
    DECIMALS: 8,
    
    // Mining Configuration
    MINING_REWARD: 50, // Initial mining reward
    BLOCK_TIME: 60000, // Target block time in milliseconds (1 minute)
    DIFFICULTY_ADJUSTMENT_INTERVAL: 10, // Adjust difficulty every 10 blocks
    INITIAL_DIFFICULTY: 4, // Starting difficulty
    MAX_DIFFICULTY: 10, // Maximum difficulty
    MIN_DIFFICULTY: 1, // Minimum difficulty
    
    // Transaction Configuration
    TRANSACTION_FEE: 0.001, // Default transaction fee
    MIN_TRANSACTION_AMOUNT: 0.00000001, // Minimum transaction amount (1 satoshi)
    MAX_TRANSACTION_AMOUNT: 1000000, // Maximum single transaction
    MAX_TRANSACTIONS_PER_BLOCK: 100, // Maximum transactions per block
    
    // Wallet Configuration
    WALLET_VERSION: 1,
    ADDRESS_PREFIX: 'YLX', // YELUX address prefix
    ADDRESS_LENGTH: 64, // Total address length including prefix
    
    // Security Configuration
    HASH_ALGORITHM: 'sha256',
    SIGNATURE_ALGORITHM: 'ecdsa',
}
