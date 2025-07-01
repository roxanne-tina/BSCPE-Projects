<?php
require_once 'db.php';
header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Not authenticated']);
    exit;
}

try {
    $userId = $_SESSION['user_id'];
    
    // Get current user data
    $stmt = $pdo->prepare("
        SELECT id, username, email, balance, wallet_address, created_at, updated_at
        FROM users 
        WHERE id = :id AND is_active = 1
    ");
    $stmt->execute([':id' => $userId]);
    $user = $stmt->fetch();

    if (!$user) {
        // Clear invalid session
        session_destroy();
        echo json_encode(['success' => false, 'message' => 'User not found']);
        exit;
    }

    echo json_encode([
        'success' => true,
        'user' => [
            'id' => $user['id'],
            'username' => $user['username'],
            'email' => $user['email'],
            'balance' => $user['balance'],
            'wallet_address' => $user['wallet_address'],
            'member_since' => $user['created_at']
        ]
    ]);

} catch (Exception $e) {
    error_log("Get user error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error']);
}
?>
