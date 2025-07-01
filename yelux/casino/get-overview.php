
    <?php
    require_once 'config/database.php';
    require_once 'includes/admin-auth.php';

    header('Content-Type: application/json');

    // Verify admin authentication
    $admin = verifyAdminToken();
    if (!$admin) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Unauthorized']);
        exit;
    }

    try {
        $pdo = getDBConnection();
    
        // Get overview statistics
        $stats = [];
    
        // Total users
        $stmt = $pdo->query("SELECT COUNT(*) as count FROM users WHERE is_active = 1");
        $stats['totalUsers'] = $stmt->fetch()['count'] ?? 0;
    
        // Total deposits
        $stmt = $pdo->query("SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM deposit_logs WHERE status = 'completed'");
        $depositData = $stmt->fetch();
        $stats['totalDeposits'] = $depositData['count'] ?? 0;
        $stats['totalDepositAmount'] = $depositData['total'] ?? 0;
    
        // Total withdrawals
        $stmt = $pdo->query("SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM withdrawal_logs WHERE status = 'completed'");
        $withdrawalData = $stmt->fetch();
        $stats['totalWithdrawals'] = $withdrawalData['count'] ?? 0;
        $stats['totalWithdrawalAmount'] = $withdrawalData['total'] ?? 0;
    
        // Total games played
        $stmt = $pdo->query("SELECT COUNT(*) as count FROM game_history");
        $stats['totalGames'] = $stmt->fetch()['count'] ?? 0;
    
        // Total profit (deposits - withdrawals)
        $stats['totalProfit'] = $stats['totalDepositAmount'] - $stats['totalWithdrawalAmount'];
    
        // Get recent activity
        $stmt = $pdo->query("
            SELECT u.username, gh.game_type, gh.bet_amount, gh.result, gh.created_at 
            FROM game_history gh 
            JOIN users u ON gh.user_id = u.id 
            ORDER BY gh.created_at DESC 
            LIMIT 10
        ");
        $recent = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
        // Get daily stats for the last 7 days
        $stmt = $pdo->query("
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as deposits,
                SUM(amount) as deposit_amount
            FROM deposit_logs 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            GROUP BY DATE(created_at)
            ORDER BY date DESC
        ");
        $dailyStats = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
        echo json_encode([
            'success' => true,
            'stats' => $stats,
            'recent' => $recent,
            'dailyStats' => $dailyStats
        ]);
    
    } catch (Exception $e) {
        error_log("Overview error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Server error']);
    }
    ?>
