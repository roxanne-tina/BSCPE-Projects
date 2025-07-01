<?php
session_start();
require_once '../php/db.php';

header('Content-Type: application/json');

// Check if user is logged in
if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Not logged in']);
    exit;
}

$user_id = $_SESSION['user_id'];

try {
    // Get linked wallet addresses for this user
    $stmt = $pdo->prepare("SELECT wallet_address FROM wallet_links WHERE user_id = ?");
    $stmt->execute([$user_id]);
    $walletAddresses = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    if (empty($walletAddresses)) {
        echo json_encode([
            'success' => true,
            'history' => [],
            'message' => 'No linked wallets found'
        ]);
        exit;
    }
    
    // Get mining history from blockchain API for linked wallets
    $allHistory = [];
    
    foreach ($walletAddresses as $walletAddress) {
        try {
            // Call blockchain API to get mining history
            $apiUrl = "http://localhost:3001/api/mining/history/" . $walletAddress;
            $context = stream_context_create([
                'http' => [
                    'timeout' => 10,
                    'method' => 'GET'
                ]
            ]);
            
            $response = file_get_contents($apiUrl, false, $context);
            if ($response !== false) {
                $data = json_decode($response, true);
                if ($data && isset($data['history'])) {
                    $allHistory = array_merge($allHistory, $data['history']);
                }
            }
        } catch (Exception $e) {
            error_log("Error fetching mining history for wallet $walletAddress: " . $e->getMessage());
        }
    }
    
    // Sort by timestamp (newest first)
    usort($allHistory, function($a, $b) {
        return strtotime($b['timestamp']) - strtotime($a['timestamp']);
    });
    
    // Also get any mining logs from database
    $placeholders = str_repeat('?,', count($walletAddresses) - 1) . '?';
    $stmt = $pdo->prepare("
        SELECT 
            wallet_address,
            block_number,
            block_hash,
            reward_amount,
            timestamp,
            'database' as source
        FROM mining_logs 
        WHERE wallet_address IN ($placeholders)
        ORDER BY timestamp DESC
    ");
    
    $stmt->execute($walletAddresses);
    $dbHistory = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Merge blockchain and database history, removing duplicates
    $combinedHistory = [];
    $seenBlocks = [];
    
    // Add blockchain history first
    foreach ($allHistory as $record) {
        $blockKey = $record['block_number'] . '_' . $record['wallet_address'];
        if (!isset($seenBlocks[$blockKey])) {
            $combinedHistory[] = $record;
            $seenBlocks[$blockKey] = true;
        }
    }
    
    // Add database history if not already present
    foreach ($dbHistory as $record) {
        $blockKey = $record['block_number'] . '_' . $record['wallet_address'];
        if (!isset($seenBlocks[$blockKey])) {
            $combinedHistory[] = $record;
            $seenBlocks[$blockKey] = true;
        }
    }
    
    // Sort final combined history
    usort($combinedHistory, function($a, $b) {
        return strtotime($b['timestamp']) - strtotime($a['timestamp']);
    });
    
    echo json_encode([
        'success' => true,
        'history' => $combinedHistory,
        'total_records' => count($combinedHistory)
    ]);
    
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage()
    ]);
}
?>
