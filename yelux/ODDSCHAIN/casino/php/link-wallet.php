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
$walletAddress = trim($input['wallet_address'] ?? '');

if (empty($walletAddress)) {
    echo json_encode(['success' => false, 'message' => 'Wallet address required']);
    exit;
}

// Basic wallet address validation
if (strlen($walletAddress) < 26 || strlen($walletAddress) > 35) {
    echo json_encode(['success' => false, 'message' => 'Invalid wallet address format']);
    exit;
}

try {
    $pdo = getDBConnection();
    
    // Check if wallet address is already linked to another user
    $stmt = $pdo->prepare("SELECT id, username FROM users WHERE wallet_address = ? AND id != ?");
    $stmt->execute([$walletAddress, $_SESSION['user_id']]);
    $existingUser = $stmt->fetch();
    
    if ($existingUser) {
        echo json_encode([
            'success' => false, 
            'message' => 'Wallet address is already linked to another account'
        ]);
        exit;
    }
    
    // Verify wallet address exists on blockchain (optional)
    $blockchainUrl = 'http://localhost:3001';
    $verifyUrl = "$blockchainUrl/balance/$walletAddress";
    
    $context = stream_context_create([
        'http' => [
            'timeout' => 5,
            'method' => 'GET'
        ]
    ]);
    
    $response = @file_get_contents($verifyUrl, false, $context);
    
    if ($response === false) {
        // Blockchain verification failed, but we'll still allow linking
        error_log("Warning: Could not verify wallet address $walletAddress on blockchain");
    } else {
        $balanceData = json_decode($response, true);
        if (!$balanceData || !isset($balanceData['balance'])) {
            echo json_encode([
                'success' => false, 
                'message' => 'Invalid wallet address or blockchain error'
            ]);
            exit;
        }
    }
    
    // Update user's wallet address
    $stmt = $pdo->prepare("UPDATE users SET wallet_address = ?, updated_at = NOW() WHERE id = ?");
    
    if ($stmt->execute([$walletAddress, $_SESSION['user_id']])) {
        // Log the wallet linking
        $stmt = $pdo->prepare("
            INSERT INTO admin_logs (admin_id, action, target_type, target_id, description, ip_address) 
            VALUES (?, 'wallet_linked', 'user', ?, ?, ?)
        ");
        $stmt->execute([
            $_SESSION['user_id'],
            $_SESSION['user_id'],
            "Wallet address linked: $walletAddress",
            $_SERVER['REMOTE_ADDR'] ?? 'unknown'
        ]);
        
        echo json_encode([
            'success' => true,
            'message' => 'Wallet linked successfully',
            'wallet_address' => $walletAddress
        ]);
    } else {
        throw new Exception('Failed to link wallet address');
    }
    
} catch (PDOException $e) {
    error_log("Database error in link-wallet.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error occurred']);
} catch (Exception $e) {
    error_log("Error in link-wallet.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to link wallet']);
}
?>
