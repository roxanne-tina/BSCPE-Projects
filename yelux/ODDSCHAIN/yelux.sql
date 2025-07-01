-- =============================================
-- YELUX PROJECT DATABASE SCHEMA (Essential Tables)
-- =============================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

-- Database: yelux_casino
CREATE DATABASE IF NOT EXISTS `yelux_casino` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `yelux_casino`;

-- Users table
CREATE TABLE `users` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `username` varchar(50) NOT NULL UNIQUE,
    `email` varchar(100) NOT NULL UNIQUE,
    `password_hash` varchar(255) NOT NULL,
    `wallet_address` varchar(50) DEFAULT NULL,
    `balance` decimal(20,8) DEFAULT 0.00000000,
    `status` enum('active','suspended','banned') DEFAULT 'active',
    `is_admin` tinyint(1) DEFAULT 0,
    `email_verified` tinyint(1) DEFAULT 0,
    `login_attempts` int(11) DEFAULT 0,
    `locked_until` datetime DEFAULT NULL,
    `last_login` datetime DEFAULT NULL,
    `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
    `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_username` (`username`),
    KEY `idx_email` (`email`),
    KEY `idx_wallet` (`wallet_address`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User sessions table
CREATE TABLE `user_sessions` (
    `id` varchar(128) NOT NULL,
    `user_id` int(11) NOT NULL,
    `ip_address` varchar(45) NOT NULL,
    `user_agent` text,
    `is_active` tinyint(1) DEFAULT 1,
    `expires_at` timestamp NOT NULL,
    `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `fk_session_user` (`user_id`),
    CONSTRAINT `fk_session_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Wallet transactions table
CREATE TABLE `wallet_transactions` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `user_id` int(11) NOT NULL,
    `transaction_type` enum('deposit','withdrawal','game_win','game_loss','bonus','fee') NOT NULL,
    `amount` decimal(20,8) NOT NULL,
    `balance_before` decimal(20,8) NOT NULL,
    `balance_after` decimal(20,8) NOT NULL,
    `tx_hash` varchar(100) DEFAULT NULL,
    `from_address` varchar(50) DEFAULT NULL,
    `to_address` varchar(50) DEFAULT NULL,
    `status` enum('pending','completed','failed') DEFAULT 'completed',
    `description` text,
    `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `fk_wallet_user` (`user_id`),
    KEY `idx_type` (`transaction_type`),
    CONSTRAINT `fk_wallet_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Deposit logs table
CREATE TABLE `deposit_logs` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `user_id` int(11) NOT NULL,
    `amount` decimal(20,8) NOT NULL,
    `tx_hash` varchar(100) NOT NULL UNIQUE,
    `from_address` varchar(50) DEFAULT NULL,
    `to_address` varchar(50) DEFAULT NULL,
    `block_number` int(11) DEFAULT NULL,
    `confirmations` int(11) DEFAULT 0,
    `status` enum('pending','confirmed','failed') DEFAULT 'pending',
    `processed` tinyint(1) DEFAULT 0,
    `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
    `confirmed_at` timestamp NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `fk_deposit_user` (`user_id`),
    KEY `idx_tx_hash` (`tx_hash`),
    CONSTRAINT `fk_deposit_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Withdrawal logs table
CREATE TABLE `withdrawal_logs` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `user_id` int(11) NOT NULL,
    `amount` decimal(20,8) NOT NULL,
    `fee` decimal(20,8) DEFAULT 0.00000000,
    `to_address` varchar(50) NOT NULL,
    `tx_hash` varchar(100) DEFAULT NULL,
    `status` enum('pending','processing','completed','failed','cancelled') DEFAULT 'pending',
    `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
    `processed_at` timestamp NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `fk_withdrawal_user` (`user_id`),
    KEY `idx_status` (`status`),
    CONSTRAINT `fk_withdrawal_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Game history table
CREATE TABLE `game_history` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `user_id` int(11) NOT NULL,
    `game_type` varchar(50) NOT NULL,
    `bet_amount` decimal(20,8) NOT NULL,
    `win_amount` decimal(20,8) DEFAULT 0.00000000,
    `result` text,
    `profit_loss` decimal(20,8) NOT NULL,
    `balance_before` decimal(20,8) NOT NULL,
    `balance_after` decimal(20,8) NOT NULL,
    `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `fk_game_user` (`user_id`),
    CONSTRAINT `fk_game_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Admin logs table
CREATE TABLE `admin_logs` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `admin_id` int(11) NOT NULL,
    `action` varchar(100) NOT NULL,
    `target_type` varchar(50) DEFAULT NULL,
    `target_id` int(11) DEFAULT NULL,
    `description` text,
    `ip_address` varchar(45) DEFAULT NULL,
    `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `fk_admin_user` (`admin_id`),
    CONSTRAINT `fk_admin_user` FOREIGN KEY (`admin_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- System settings table
CREATE TABLE `system_settings` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `setting_key` varchar(100) NOT NULL UNIQUE,
    `setting_value` text,
    `description` text,
    `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_setting_key` (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Blockchain sync status table
CREATE TABLE IF NOT EXISTS blockchain_sync (
      id INT AUTO_INCREMENT PRIMARY KEY,
      last_block_processed INT DEFAULT 0,
      last_sync_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      sync_status ENUM('syncing', 'synced', 'error') DEFAULT 'synced',
      error_message TEXT DEFAULT NULL,
    
      INDEX idx_sync_status (sync_status)
);

-- Insert default system settings
INSERT INTO `system_settings` (`setting_key`, `setting_value`, `description`) VALUES
('min_deposit', '0.001', 'Minimum deposit amount in YELUX'),
('min_withdrawal', '0.01', 'Minimum withdrawal amount in YELUX'),
('withdrawal_fee', '0.001', 'Withdrawal fee in YELUX'),
('max_bet_amount', '100', 'Maximum bet amount per game'),
('house_edge', '2.5', 'House edge percentage'),
('email_verification_required', 'false', 'Require email verification for new accounts'),
('maintenance_mode', 'false', 'Enable maintenance mode'),
('casino_name', 'YELUX Casino', 'Casino name'),
('support_email', 'support@yelux.casino', 'Support email address');

-- Insert initial blockchain sync record
INSERT INTO blockchain_sync (last_block_processed, sync_status) VALUES (0, 'synced')
ON DUPLICATE KEY UPDATE last_sync_time = CURRENT_TIMESTAMP;

-- Create default admin user (password: admin123)
INSERT INTO `users` (`username`, `email`, `password_hash`, `is_admin`, `email_verified`, `status`) VALUES
('admin', 'admin@yelux.casino', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 1, 1, 'active');

COMMIT;
