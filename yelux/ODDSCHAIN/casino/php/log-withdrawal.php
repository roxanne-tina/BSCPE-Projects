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
$toAddress = $input['to_address'] ?? '';
$fee = floatval($input['fee'] ?? 0);

if ($amount <= 0) {
    echo json_encode(['success' => false, 'message' => 'Invalid amount']);
    exit;
}

if (empty($toAddress)) {
    echo json_encode(['success' => false, 'message' => 'Destination address required']);
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
    
    // Get withdrawal fee if not provided
    if ($fee <= 0) {
        $stmt = $pdo->prepare("SELECT setting_value FROM system_settings WHERE setting_key = 'withdrawal_fee'");
        $stmt->execute();
        $fee = floatval($stmt->fetchColumn() ?? 0.001);
    }
    
    $totalAmount = $amount + $fee;
    
    // Check if user has sufficient balance
    if ($user['balance'] < $totalAmount) {
        echo json_encode([
            'success' => false, 
            'message' => 'Insufficient balance (including withdrawal fee)'
        ]);
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
    
    // Check if withdrawal with same hash already exists
    if (!empty($txHash)) {
        $stmt = $pdo->prepare("SELECT id FROM withdrawal_logs WHERE tx_hash = ?");
        $stmt->execute([$txHash]);
        if ($stmt->fetch()) {
            echo json_encode(['success' => false, 'message' => 'Withdrawal already processed']);
            exit;
        }
    }
    
    // Process withdrawal request
    $pdo->beginTransaction();
    
    try {
        // Create withdrawal log entry
        $status = empty($txHash) ? 'pending' : 'completed';
        
        $stmt = $pdo->prepare("
            INSERT INTO withdrawal_logs 
            (user_id, amount, fee, to_address, tx_hash, status, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, NOW())
        ");
        $stmt->execute([$_SESSION['user_id'], $amount, $fee, $toAddress, $txHash, $status]);
        
        $withdrawalId = $pdo->lastInsertId();
        
        // If transaction hash is provided, it means withdrawal is completed
        if (!empty($txHash)) {
            // Deduct amount from user balance
            $newBalance = $user['balance'] - $totalAmount;
            $stmt = $pdo->prepare("UPDATE users SET balance = ? WHERE id = ?");
            $stmt->execute([$newBalance, $_SESSION['user_id']]);
            
            // Log wallet transaction
            $stmt = $pdo->prepare("
                INSERT INTO wallet_transactions 
                (user_id, transaction_type, amount, balance_before, balance_after, tx_hash, 
                 to_address, status, description, created_at) 
                VALUES (?, 'withdrawal', ?, ?, ?, ?, ?, 'completed', ?, NOW())
            ");
            $stmt->execute([
                $_SESSION['user_id'],
                -$totalAmount,
                $user['balance'],
                $newBalance,
                $txHash,
                $toAddress,
                "Withdrawal to $toAddress (Amount: $amount, Fee: $fee)"
            ]);
            
            $message = 'Withdrawal completed successfully';
            $responseData = [
                'success' => true,
                'message' => $message,
                'withdrawal_id' => $withdrawalId,
                'amount' => $amount,
                'fee' => $fee,
                'tx_hash' => $txHash,
                'new_balance' => $newBalance
            ];
        } else {
            // Withdrawal request created, pending processing
            $message = 'Withdrawal request created successfully';
            $responseData = [
                'success' => true,
                'message' => $message,
                'withdrawal_id' => $withdrawalId,
                'amount' => $amount,
                'fee' => $fee,
                'status' => 'pending'
            ];
        }
        
        $pdo->commit();
        echo json_encode($responseData);
        
    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }
    
} catch (PDOException $e) {
    error_log("Database error in log-withdrawal.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error occurred']);
} catch (Exception $e) {
    error_log("Error in log-withdrawal.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to process withdrawal']);
}
?>
