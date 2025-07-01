<?php
session_start();
require_once '../php/db.php';

header('Content-Type: application/json');

// Check if user is logged in
if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Not logged in']);
    exit;
}

// Get POST data
$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    echo json_encode(['success' => false, 'message' => 'Invalid input']);
    exit;
}

$user_id = $_SESSION['user_id'];
$game_type = $input['game_type'] ?? '';
$bet_amount = $input['bet_amount'] ?? 0;
$win_amount = $input['win_amount'] ?? 0;
$result = $input['result'] ?? '';
$game_data = $input['game_data'] ?? '';

// Validate required fields
if (empty($game_type) || empty($result) || $bet_amount <= 0) {
    echo json_encode(['success' => false, 'message' => 'Missing required fields']);
    exit;
}

try {
    // Insert game log
    $stmt = $pdo->prepare("
        INSERT INTO game_logs (
            user_id, 
            game_type, 
            bet_amount, 
            win_amount, 
            result, 
            game_data,
            created_at
        ) VALUES (?, ?, ?, ?, ?, ?, NOW())
    ");
    
    $stmt->execute([
        $user_id,
        $game_type,
        $bet_amount,
        $win_amount,
        $result,
        $game_data
    ]);
    
    echo json_encode([
        'success' => true,
        'message' => 'Game logged successfully',
        'log_id' => $pdo->lastInsertId()
    ]);
    
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}
?>

