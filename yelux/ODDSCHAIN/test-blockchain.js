// Import the helper utilities
const HelperUtils = require('./blockchain/utils/helpers.js');

console.log('🚀 Testing Blockchain Helper Utils...\n');

// Test formatting
console.log('💰 Amount Formatting:');
console.log('  Format 1.23456789:', HelperUtils.formatAmount(1.23456789));
console.log('  Format 0.1:', HelperUtils.formatAmount(0.1));

// Test satoshi conversion
console.log('\n🔢 Satoshi Conversion:');
console.log('  1.5 YLX to satoshis:', HelperUtils.toSatoshis(1.5));
console.log('  150000000 satoshis to YLX:', HelperUtils.fromSatoshis(150000000));

// Test ID generation
console.log('\n🆔 ID Generation:');
console.log('  Transaction ID:', HelperUtils.generateTransactionId());
console.log('  Block ID:', HelperUtils.generateBlockId());

// Test fee calculation
console.log('\n💸 Fee Calculation:');
const sampleTransaction = {
    from: 'address1',
    to: 'address2',
    amount: 1.5,
    timestamp: Date.now()
};
console.log('  Transaction fee:', HelperUtils.calculateTransactionFee(sampleTransaction));

// Test block reward calculation
console.log('\n🎁 Block Rewards:');
console.log('  Block 0 reward:', HelperUtils.calculateBlockReward(0));
console.log('  Block 100000 reward:', HelperUtils.calculateBlockReward(100000));
console.log('  Block 210000 reward:', HelperUtils.calculateBlockReward(210000));

console.log('\n✅ Helper Utils test completed!');