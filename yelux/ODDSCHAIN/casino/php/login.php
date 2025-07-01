<?php
require_once 'db.php';
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$username = trim($input['username'] ?? '');
$password = $input['password'] ?? '';

if (empty($username) || empty($password)) {
    echo json_encode(['success' => false, 'message' => 'Username and password required']);
    exit;
}

try {
    $pdo = getDBConnection();
    
    // Get user by username or email
    $stmt = $pdo->prepare("
        SELECT id, username, email, password_hash, status, is_admin, email_verified, 
               login_attempts, locked_until, last_login, wallet_address, balance
        FROM users 
        WHERE username = ? OR email = ?
    ");
    $stmt->execute([$username, $username]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user) {
        echo json_encode(['success' => false, 'message' => 'Invalid credentials']);
        exit;
    }
    
    // Check if account is locked
    if ($user['locked_until'] && new DateTime() < new DateTime($user['locked_until'])) {
        $lockTime = new DateTime($user['locked_until']);
        $remainingTime = $lockTime->diff(new DateTime())->format('%i minutes %s seconds');
        echo json_encode([
            'success' => false, 
            'message' => "Account locked. Try again in $remainingTime"
        ]);
        exit;
    }
    
    // Check account status
    if ($user['status'] !== 'active') {
        echo json_encode(['success' => false, 'message' => 'Account is ' . $user['status']]);
        exit;
    }
    
    // Verify password
    if (!password_verify($password, $user['password_hash'])) {
        // Increment login attempts
        $attempts = $user['login_attempts'] + 1;
        $lockUntil = null;
        
        // Lock account after 5 failed attempts for 15 minutes
        if ($attempts >= 5) {
            $lockUntil = date('Y-m-d H:i:s', strtotime('+15 minutes'));
        }
        
        $stmt = $pdo->prepare("
            UPDATE users 
            SET login_attempts = ?, locked_until = ? 
            WHERE id = ?
        ");
        $stmt->execute([$attempts, $lockUntil, $user['id']]);
        
        echo json_encode(['success' => false, 'message' => 'Invalid credentials']);
        exit;
    }
    
    // Check email verification if required
    $stmt = $pdo->prepare("SELECT setting_value FROM system_settings WHERE setting_key = 'email_verification_required'");
    $stmt->execute();
    $emailVerificationRequired = $stmt->fetchColumn();
    
    if ($emailVerificationRequired === 'true' && !$user['email_verified']) {
        echo json_encode([
            'success' => false, 
            'message' => 'Please verify your email address before logging in'
        ]);
        exit;
    }
    
    // Successful login - reset attempts and update last login
    $stmt = $pdo->prepare("
        UPDATE users 
        SET login_attempts = 0, locked_until = NULL, last_login = NOW() 
        WHERE id = ?
    ");
    $stmt->execute([$user['id']]);
    
    // Create session
    session_start();
    session_regenerate_id(true);
    
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['username'] = $user['username'];
    $_SESSION['is_admin'] = $user['is_admin'];
    $_SESSION['login_time'] = time();
    
    // Log session in database
    $sessionId = session_id();
    $ipAddress = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';
    $expiresAt = date('Y-m-d H:i:s', time() + (24 * 60 * 60)); // 24 hours
    
    $stmt = $pdo->prepare("
        INSERT INTO user_sessions (id, user_id, ip_address, user_agent, expires_at) 
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
        ip_address = VALUES(ip_address),
        user_agent = VALUES(user_agent),
        expires_at = VALUES(expires_at),
        created_at = NOW(),
        is_active = TRUE
    ");
    $stmt->execute([$sessionId, $user['id'], $ipAddress, $userAgent, $expiresAt]);
    
    // Return user data (excluding sensitive information)
    echo json_encode([
        'success' => true,
        'message' => 'Login successful',
        'user' => [
            'id' => $user['id'],
            'username' => $user['username'],
            'email' => $user['email'],
            'is_admin' => $user['is_admin'],
            'wallet_address' => $user['wallet_address'],
            'balance' => $user['balance'],
            'last_login' => $user['last_login']
        ]
    ]);
    
} catch (PDOException $e) {
    error_log("Database error in login.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error occurred']);
} catch (Exception $e) {
    error_log("Error in login.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Login failed']);
}
?>
