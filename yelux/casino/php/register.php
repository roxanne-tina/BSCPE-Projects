<?php
require_once 'db.php';
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

// Enhanced input validation
$username = filter_var(trim($input['username'] ?? ''), FILTER_SANITIZE_STRING);
$email = filter_var(trim($input['email'] ?? ''), FILTER_VALIDATE_EMAIL);
$password = $input['password'] ?? '';

// Validation checks
if (empty($username) || strlen($username) < 3 || strlen($username) > 50) {
    echo json_encode(['success' => false, 'message' => 'Username must be 3-50 characters']);
    exit;
}

if (!$email) {
    echo json_encode(['success' => false, 'message' => 'Valid email address required']);
    exit;
}

if (empty($password) || strlen($password) < 6) {
    echo json_encode(['success' => false, 'message' => 'Password must be at least 6 characters']);
    exit;
}

// Additional password strength validation
if (!preg_match('/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/', $password)) {
    echo json_encode(['success' => false, 'message' => 'Password must contain at least one uppercase letter, one lowercase letter, and one number']);
    exit;
}

try {
    $pdo = getDBConnection();
    
    // Check if username already exists
    $stmt = $pdo->prepare("SELECT id FROM users WHERE username = ?");
    $stmt->execute([$username]);
    if ($stmt->fetch()) {
        echo json_encode(['success' => false, 'message' => 'Username already exists']);
        exit;
    }
    
    // Check if email already exists
    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        echo json_encode(['success' => false, 'message' => 'Email already registered']);
        exit;
    }
    
    // Check registration settings
    $stmt = $pdo->prepare("SELECT setting_value FROM system_settings WHERE setting_key = 'registration_enabled'");
    $stmt->execute();
    $registrationEnabled = $stmt->fetchColumn();
    
    if ($registrationEnabled === 'false') {
        echo json_encode(['success' => false, 'message' => 'Registration is currently disabled']);
        exit;
    }
    
    // Hash password
    $passwordHash = password_hash($password, PASSWORD_DEFAULT);
    
    // Insert new user
    $stmt = $pdo->prepare("
        INSERT INTO users (username, email, password_hash, created_at) 
        VALUES (?, ?, ?, NOW())
    ");
    
    if ($stmt->execute([$username, $email, $passwordHash])) {
        $userId = $pdo->lastInsertId();
        
        // Log the registration
        error_log("New user registered: ID $userId, Username: $username, Email: $email");
        
        // Check if email verification is required
        $stmt = $pdo->prepare("SELECT setting_value FROM system_settings WHERE setting_key = 'email_verification_required'");
        $stmt->execute();
        $emailVerificationRequired = $stmt->fetchColumn();
        
        $response = [
            'success' => true,
            'message' => 'Registration successful',
            'user_id' => $userId,
            'email_verification_required' => $emailVerificationRequired === 'true'
        ];
        
        // If email verification is not required, auto-verify the user
        if ($emailVerificationRequired !== 'true') {
            $stmt = $pdo->prepare("UPDATE users SET email_verified = TRUE WHERE id = ?");
            $stmt->execute([$userId]);
        }
        
        echo json_encode($response);
    } else {
        throw new Exception('Failed to create user account');
    }
    
} catch (PDOException $e) {
    error_log("Database error in register.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error occurred']);
} catch (Exception $e) {
    error_log("Error in register.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Registration failed']);
}
?>
