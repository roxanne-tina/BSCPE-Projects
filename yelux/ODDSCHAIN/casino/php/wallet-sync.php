<?php
require_once 'db.php';
header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Not authenticated']);
    exit;
}

$walletAddress = $_SESSION['wallet_address'] ?? null;

if (!$walletAddress) {
    echo json_encode(['success' => false, 'message' => 'No wallet linked']);
    exit;
}

try {
    // Call blockchain API to get wallet balance
    $blockchainUrl = "http://localhost:3000/api/balance/" . $walletAddress;
    $response = file_get_contents($blockchainUrl);
    
    if ($response === false) {
        echo json_encode(['success' => false, 'message' => 'Failed to connect to blockchain']);
        exit;
    }
    
    $balanceData = json_decode($response, true);
    
    if (!$balanceData || !isset($balanceData['balance'])) {
        echo json_encode(['success' => false, 'message' => 'Invalid blockchain response']);
        exit;
    }
    
    $walletBalance = $balanceData['balance'];
    
    // Get current casino balance
    $stmt = $pdo->prepare("SELECT casino_balance FROM users WHERE id = ?");
    $stmt->execute([$_SESSION['user_id']]);
    $user = $stmt->fetch();
    
    echo json_encode([
        'success' => true,
        'wallet_balance' => $walletBalance,
        'casino_balance' => $user['casino_balance'],
        'wallet_address' => $walletAddress
    ]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
}
?>


