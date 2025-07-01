class Config {
    constructor() {
        this.environment = process.env.NODE_ENV || 'development';
        this.loadConfig();
    }
    
    loadConfig() {
        const baseConfig = {
            HASH_ALGORITHM: 'sha256',
            INITIAL_DIFFICULTY: 2,
            MINING_REWARD: 50,
            BLOCK_TIME: 10000,
            DIFFICULTY_ADJUSTMENT_INTERVAL: 10
        };
        
        const envConfigs = {
            development: {
                ...baseConfig,
                BLOCKCHAIN_PORT: 3001,
                DATABASE_URL: 'mysql://localhost:3306/yelux_dev',
                LOG_LEVEL: 'debug',
                CORS_ORIGINS: ['http://localhost:3000', 'http://localhost']
            },
            production: {
                ...baseConfig,
                INITIAL_DIFFICULTY: 4,
                BLOCKCHAIN_PORT: process.env.PORT || 3001,
                DATABASE_URL: process.env.DATABASE_URL,
                LOG_LEVEL: 'error',
                CORS_ORIGINS: process.env.CORS_ORIGINS?.split(',') || []
            }
        };
        
        this.config = envConfigs[this.environment] || envConfigs.development;
    }
    
    get(key) {
        return this.config[key];
    }
}

module.exports = new Config();