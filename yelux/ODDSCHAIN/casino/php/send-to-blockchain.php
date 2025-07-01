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
$fromAddress = $input['from'] ?? '';
$toAddress = $input['to'] ?? '';
$amount = floatval($input['amount'] ?? 0);
$privateKey = $input['privateKey'] ?? '';

// Validation
if (empty($fromAddress) || empty($toAddress) || $amount <= 0) {
    echo json_encode(['success' => false, 'message' => 'Invalid transaction parameters']);
    exit;
}

if (empty($privateKey)) {
    echo json_encode(['success' => false, 'message' => 'Private key required']);
    exit;
}

try {
    $pdo = getDBConnection();
    
    // Get user info and verify wallet ownership
    $stmt = $pdo->prepare("SELECT id, username, wallet_address, balance FROM users WHERE id = ?");
    $stmt->execute([$_SESSION['user_id']]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user) {
        echo json_encode(['success' => false, 'message' => 'User not found']);
        exit;
    }
    
    // Verify the from address matches user's wallet
    if ($user['wallet_address'] !== $fromAddress) {
        echo json_encode(['success' => false, 'message' => 'Unauthorized wallet access']);
        exit;
    }
    
    // Check minimum withdrawal amount
    $stmt = $pdo->prepare("SELECT setting_value FROM system_settings WHERE setting_key = 'min_withdrawal'");
    $stmt->execute();
    $minWithdrawal = floatval($stmt->fetchColumn() ?? 0.01);
    
    if ($amount < $minWithdrawal) {
        echo json_encode([
            'success' => false, 
            'message' => "Minimum withdrawal amount is $minWithdrawal YELUX"
        ]);
        exit;
    }
    
    // Get withdrawal fee
    $stmt = $pdo->prepare("SELECT setting_value FROM system_settings WHERE setting_key = 'withdrawal_fee'");
    $stmt->execute();
    $withdrawalFee = floatval($stmt->fetchColumn() ?? 0.001);
    
    $totalAmount = $amount + $withdrawalFee;
    
    // Check if user has sufficient balance
    if ($user['balance'] < $totalAmount) {
        echo json_encode([
            'success' => false, 
            'message' => 'Insufficient balance (including withdrawal fee)'
        ]);
        exit;
    }
    
    // Send transaction to blockchain
    $blockchainUrl = 'http://localhost:3001';
    $transactionData = [
        'fromAddress' => $fromAddress,
        'toAddress' => $toAddress,
        'amount' => $amount,
        'privateKey' => $privateKey
    ];
    
    $context = stream_context_create([
        'http' => [
            'header' => "Content-type: application/json\r\n",
            'method' => 'POST',
            'content' => json_encode($transactionData),
            'timeout' => 30
        ]
    ]);
    
    $response = @file_get_contents("$blockchainUrl/send", false, $context);
    
    if ($response === false) {
        echo json_encode(['success' => false, 'message' => 'Blockchain network error']);
        exit;
    }
    
    $result = json_decode($response, true);
    
    if (!$result || !$result['success']) {
        $errorMsg = $result['message'] ?? 'Transaction failed';
        echo json_encode(['success' => false, 'message' => $errorMsg]);
        exit;
    }
    
    // Transaction successful - update database
    $pdo->beginTransaction();
    
    try {
        // Deduct amount from user balance
        $newBalance = $user['balance'] - $totalAmount;
        $stmt = $pdo->prepare("UPDATE users SET balance = ? WHERE id = ?");
        $stmt->execute([$newBalance, $_SESSION['user_id']]);
        
        // Log the withdrawal
        $stmt = $pdo->prepare("
            INSERT INTO withdrawal_logs (user_id, amount, fee, to_address, tx_hash, status, created_at) 
            VALUES (?, ?, ?, ?, ?, 'completed', NOW())
        ");
        $stmt->execute([$_SESSION['user_id'], $amount, $withdrawalFee, $toAddress, $result['txHash']]);
        
        // Log wallet transaction
        $stmt = $pdo->prepare("
            INSERT INTO wallet_transactions 
            (user_id, transaction_type, amount, balance_before, balance_after, tx_hash, to_address, 
             status, description, created_at) 
            VALUES (?, 'withdrawal', ?, ?, ?, ?, ?, 'completed', ?, NOW())
        ");
        $stmt->execute([
            $_SESSION['user_id'],
            -$totalAmount,
            $user['balance'],
            $newBalance,
            $result['txHash'],
            $toAddress,
            "Withdrawal to $toAddress (Amount: $amount, Fee: $withdrawalFee)"
        ]);
        
        $pdo->commit();
        
        echo json_encode([
            'success' => true,
            'message' => 'Transaction sent successfully',
            'tx_hash' => $result['txHash'],
            'amount' => $amount,
            'fee' => $withdrawalFee,
            'new_balance' => $newBalance
        ]);
        
    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }
    
} catch (PDOException $e) {
    error_log("Database error in send-to-blockchain.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error occurred']);
} catch (Exception $e) {
    error_log("Error in send-to-blockchain.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Transaction failed']);
}
?>
