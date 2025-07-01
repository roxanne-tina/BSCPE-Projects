<?php
require_once 'db.php';
header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Not authenticated']);
    exit;
}

try {
    $userId = $_SESSION['user_id'];
    
    // Build query with filters
    $whereClause = "WHERE user_id = :user_id";
    $params = [':user_id' => $userId];
    
    // Add status filter
    if (isset($_GET['status']) && $_GET['status'] !== 'all') {
        $whereClause .= " AND status = :status";
        $params[':status'] = $_GET['status'];
    }
    
    // Add date filters
    if (isset($_GET['date_from']) && !empty($_GET['date_from'])) {
        $whereClause .= " AND DATE(created_at) >= :date_from";
        $params[':date_from'] = $_GET['date_from'];
    }
    
    if (isset($_GET['date_to']) && !empty($_GET['date_to'])) {
        $whereClause .= " AND DATE(created_at) <= :date_to";
        $params[':date_to'] = $_GET['date_to'];
    }
    
    // Get total count
    $countStmt = $pdo->prepare("SELECT COUNT(*) as total FROM deposit_logs $whereClause");
    $countStmt->execute($params);
    $totalCount = $countStmt->fetch()['total'];
    
    // Pagination
    $page = max(1, intval($_GET['page'] ?? 1));
    $limit = intval($_GET['limit'] ?? 10);
    $offset = ($page - 1) * $limit;
    
    // Get deposits
    $stmt = $pdo->prepare("
        SELECT id, amount, tx_hash, status, created_at 
        FROM deposit_logs 
        $whereClause 
        ORDER BY created_at DESC 
        LIMIT :limit OFFSET :offset
    ");
    
    // Bind parameters
    foreach ($params as $key => $value) {
        $stmt->bindValue($key, $value);
    }
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    
    $stmt->execute();
    $deposits = $stmt->fetchAll();
    
    // Calculate summary
    $summaryStmt = $pdo->prepare("
        SELECT 
            COUNT(*) as total_deposits,
            COALESCE(SUM(amount), 0) as total_amount,
            COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
            COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count
        FROM deposit_logs 
        $whereClause
    ");
    $summaryStmt->execute($params);
    $summary = $summaryStmt->fetch();
    
    echo json_encode([
        'success' => true,
        'deposits' => $deposits,
        'summary' => $summary,
        'pagination' => [
            'current_page' => $page,
            'total_pages' => ceil($totalCount / $limit),
            'total_items' => $totalCount,
            'items_per_page' => $limit
        ]
    ]);
    
} catch (Exception $e) {
    error_log("Deposit logs error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error']);
}
?>
