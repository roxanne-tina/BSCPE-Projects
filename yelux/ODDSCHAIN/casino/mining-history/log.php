<?php
session_start();
require_once '../php/db.php';

header('Content-Type: application/json');

// This endpoint is typically called by the blockchain server to log mining rewards
// Check for API key or internal request validation
$headers = getallheaders();
$apiKey = $headers['X-API-Key'] ?? $_POST['api_key'] ?? '';

// Simple API key validation (you should use a more secure method)
$validApiKey = 'yelux_mining_api_2024'; // Change this to a secure key

if ($apiKey !== $validApiKey) {
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

// Get POST data
$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    $input = $_POST;
}

$wallet_address = $input['wallet_address'] ?? '';
$block_number = $input['block_number'] ?? 0;
$block_hash = $input['block_hash'] ?? '';
$reward_amount = $input['reward_amount'] ?? 0;
$difficulty = $input['difficulty'] ?? 0;
$timestamp = $input['timestamp'] ?? date('Y-m-d H:i:s');

// Validate required fields
if (empty($wallet_address) || empty($block_hash) || $block_number <= 0 || $reward_amount <= 0) {
    echo json_encode(['success' => false, 'message' => 'Missing required fields']);
    exit;
}

try {
    // Check if this mining record already exists
    $stmt = $pdo->prepare("
        SELECT id FROM mining_logs 
        WHERE wallet_address = ? AND block_number = ? AND block_hash = ?
    ");
    $stmt->execute([$wallet_address, $block_number, $block_hash]);
    
    if ($stmt->fetch()) {
        echo json_encode(['success' => false, 'message' => 'Mining record already exists']);
        exit;
    }
    
    // Insert mining log
    $stmt = $pdo->prepare("
        INSERT INTO mining_logs (
            wallet_address,
            block_number,
            block_hash,
            reward_amount,
            difficulty,
            timestamp,
            created_at
        ) VALUES (?, ?, ?, ?, ?, ?, NOW())
    ");
    
    $stmt->execute([
        $wallet_address,
        $block_number,
        $block_hash,
        $reward_amount,
        $difficulty,
        $timestamp
    ]);
    
    echo json_encode([
        'success' => true,
        'message' => 'Mining reward logged successfully',
        'log_id' => $pdo->lastInsertId()
    ]);
    
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}
?>
