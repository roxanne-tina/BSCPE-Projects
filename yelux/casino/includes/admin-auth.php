<?php
function verifyAdminToken() {
    // Check if admin is logged in via session
    if (!isset($_SESSION['admin_id'])) {
        return false;
    }
    
    try {
        $pdo = getDBConnection();
        $stmt = $pdo->prepare("SELECT id, username, role FROM admin_users WHERE id = :id");
        $stmt->execute([':id' => $_SESSION['admin_id']]);
        $admin = $stmt->fetch();
        
        return $admin ?: false;
    } catch (Exception $e) {
        error_log("Admin auth error: " . $e->getMessage());
        return false;
    }
}

function requireAdmin() {
    $admin = verifyAdminToken();
    if (!$admin) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Admin access required']);
        exit;
    }
    return $admin;
}
?>