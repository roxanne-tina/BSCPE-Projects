<?php
require_once 'db.php';
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Not authenticated']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$amount = floatval($input['amount'] ?? 0);
$txHash = $input['tx_hash'] ?? '';
$fromAddress = $input['from_address'] ?? '';
$toAddress = $input['to_address'] ?? '';
$blockNumber = intval($input['block_number'] ?? 0);

if ($amount <= 0) {
    echo json_encode(['success' => false, 'message' => 'Invalid amount']);
    exit;
}

if (empty($txHash)) {
    echo json_encode(['success' => false, 'message' => 'Transaction hash required']);
    exit;
}

try {
    $pdo = getDBConnection();
    
    // Get user info
    $stmt = $pdo->prepare("SELECT id, username, wallet_address, balance FROM users WHERE id = ?");
    $stmt->execute([$_SESSION['user_id']]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user) {
        echo json_encode(['success' => false, 'message' => 'User not found']);
        exit;
    }
    
    // Check if deposit already exists
    $stmt = $pdo->prepare("SELECT id FROM deposit_logs WHERE tx_hash = ?");
    $stmt->execute([$txHash]);
    if ($stmt->fetch()) {
        echo json_encode(['success' => false, 'message' => 'Deposit already processed']);
        exit;
    }
    
    // Verify transaction on blockchain
    $blockchainUrl = 'http://localhost:3001';
    $verifyUrl = "$blockchainUrl/transaction/$txHash";
    
    $context = stream_context_create([
        'http' => [
            'timeout' => 10,
            'method' => 'GET'
        ]
    ]);
    
    $response = @file_get_contents($verifyUrl, false, $context);
    
    if ($response === false) {
        echo json_encode(['success' => false, 'message' => 'Could not verify transaction on blockchain']);
        exit;
    }
    
    $txData = json_decode($response, true);
    
    if (!$txData || !$txData['success']) {
        echo json_encode(['success' => false, 'message' => 'Transaction not found on blockchain']);
        exit;
    }
    
    // Verify transaction details
    $blockchainTx = $txData['transaction'];
    
    if (floatval($blockchainTx['amount']) !== $amount) {
        echo json_encode(['success' => false, 'message' => 'Amount mismatch']);
        exit;
    }
    
    if ($toAddress && $blockchainTx['to'] !== $toAddress) {
        echo json_encode(['success' => false, 'message' => 'Recipient address mismatch']);
        exit;
    }
    
    // Check minimum deposit amount
    $stmt = $pdo->prepare("SELECT setting_value FROM system_settings WHERE setting_key = 'min_deposit'");
    $stmt->execute();
    $minDeposit = floatval($stmt->fetchColumn() ?? 0.001);
    
    if ($amount < $minDeposit) {
        echo json_encode([
            'success' => false, 
            'message' => "Minimum deposit amount is $minDeposit YELUX"
        ]);
        exit;
    }
    
    // Process deposit
    $pdo->beginTransaction();
    
    try {
        // Add amount to user balance
        $newBalance = $user['balance'] + $amount;
        $stmt = $pdo->prepare("UPDATE users SET balance = ? WHERE id = ?");
        $stmt->execute([$newBalance, $_SESSION['user_id']]);
        
        // Log the deposit
        $stmt = $pdo->prepare("
            INSERT INTO deposit_logs 
            (user_id, amount, tx_hash, from_address, to_address, block_number, 
             confirmations, status, processed, created_at, confirmed_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, 'confirmed', TRUE, NOW(), NOW())
        ");
        $stmt->execute([
            $_SESSION['user_id'],
            $amount,
            $txHash,
            $fromAddress,
            $toAddress,
            $blockNumber,
            $blockchainTx['confirmations'] ?? 1
        ]);
        
        // Log wallet transaction
        $stmt = $pdo->prepare("
            INSERT INTO wallet_transactions 
            (user_id, transaction_type, amount, balance_before, balance_after, tx_hash, 
             from_address, status, description, created_at) 
            VALUES (?, 'deposit', ?, ?, ?, ?, ?, 'completed', ?, NOW())
        ");
        $stmt->execute([
            $_SESSION['user_id'],
            $amount,
            $user['balance'],
            $newBalance,
            $txHash,
            $fromAddress,
            "Deposit from $fromAddress"
        ]);
        
        $pdo->commit();
        
        echo json_encode([
            'success' => true,
            'message' => 'Deposit processed successfully',
            'amount' => $amount,
            'tx_hash' => $txHash,
            'new_balance' => $newBalance
        ]);
        
    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }
    
} catch (PDOException $e) {
    error_log("Database error in log-deposit.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error occurred']);
} catch (Exception $e) {
    error_log("Error in log-deposit.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to process deposit']);
}
?>
