<?php
require_once 'db.php';
header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Not authenticated']);
    exit;
}

try {
    $stmt = $pdo->prepare("SELECT * FROM withdraw_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 50");
    $stmt->execute([$_SESSION['user_id']]);
    $logs = $stmt->fetchAll();
    
    echo json_encode([
        'success' => true,
        'withdrawals' => $logs
    ]);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
?>