class CasinoAuth {
    constructor() {
        this.apiUrl = 'http://localhost:3001'; // Blockchain API
        this.phpUrl = '../php'; // PHP backend
        this.sessionKey = 'yelux_session';
        this.walletKey = 'yelux_wallet';
        this.api = new YeluxAPI();
    }

    // Email/Password Authentication
    async emailLogin(email, password) {
        try {
            // Validate input
            if (!email || !password) {
                return { success: false, error: 'Email and password are required' };
            }

            if (!this.isValidEmail(email)) {
                return { success: false, error: 'Please enter a valid email address' };
            }

            const formData = new FormData();
            formData.append('email', email);
            formData.append('password', password);

            const response = await fetch(`${this.phpUrl}/login.php`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success) {
                this.setSession(result.user);
                this.logAuthEvent('email_login', result.user.id);
                return { success: true, user: result.user };
            } else {
                return { success: false, error: result.error || 'Login failed' };
            }
        } catch (error) {
            console.error('Email login error:', error);
            return { success: false, error: 'Connection failed. Please try again.' };
        }
    }

    // User Registration
    async register(userData) {
        try {
            // Validate required fields
            const requiredFields = ['email', 'password', 'username'];
            for (const field of requiredFields) {
                if (!userData[field]) {
                    return { success: false, error: `${field} is required` };
                }
            }

            // Validate email format
            if (!this.isValidEmail(userData.email)) {
                return { success: false, error: 'Please enter a valid email address' };
            }

            // Validate password strength
            if (!this.isValidPassword(userData.password)) {
                return { success: false, error: 'Password must be at least 8 characters long and contain uppercase, lowercase, and numbers' };
            }

            // Validate username
            if (!this.isValidUsername(userData.username)) {
                return { success: false, error: 'Username must be 3-20 characters long and contain only letters, numbers, and underscores' };
            }

            const formData = new FormData();
            Object.keys(userData).forEach(key => {
                formData.append(key, userData[key]);
            });

            const response = await fetch(`${this.phpUrl}/register.php`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success) {
                this.logAuthEvent('registration', result.user.id);
                return { success: true, user: result.user };
            } else {
                return { success: false, error: result.error || 'Registration failed' };
            }
        } catch (error) {
            console.error('Registration error:', error);
            return { success: false, error: 'Registration failed. Please try again.' };
        }
    }

    // Wallet Authentication
    async walletLogin(walletAddress, signature) {
        try {
            if (!walletAddress || !signature) {
                return { success: false, error: 'Wallet address and signature are required' };
            }

            const response = await fetch(`${this.phpUrl}/wallet-login.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    wallet_address: walletAddress,
                    signature: signature
                })
            });

            const result = await response.json();
            
            if (result.success) {
                this.setSession(result.user);
                this.logAuthEvent('wallet_login', result.user.id);
                return { success: true, user: result.user };
            } else {
                return { success: false, error: result.error || 'Wallet authentication failed' };
            }
        } catch (error) {
            console.error('Wallet login error:', error);
            return { success: false, error: 'Wallet authentication failed. Please try again.' };
        }
    }

    // Session Management
    setSession(user) {
        const sessionData = {
            id: user.id,
            username: user.username,
            email: user.email,
            wallet_address: user.wallet_address,
            timestamp: Date.now()
        };
        localStorage.setItem(this.sessionKey, JSON.stringify(sessionData));
    }

    getSession() {
        try {
            const sessionData = localStorage.getItem(this.sessionKey);
            if (sessionData) {
                const session = JSON.parse(sessionData);
                // Check if session is still valid (24 hours)
                if (Date.now() - session.timestamp < 86400000) {
                    return session;
                }
                this.clearSession();
            }
        } catch (error) {
            console.error('Error getting session:', error);
            this.clearSession();
        }
        return null;
    }

    clearSession() {
        localStorage.removeItem(this.sessionKey);
        localStorage.removeItem(this.walletKey);
    }

    async logout() {
        try {
            await fetch(`${this.phpUrl}/logout.php`, {
                method: 'POST'
            });
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            this.clearSession();
        }
    }

    // Validation helpers
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    isValidPassword(password) {
        // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
        return passwordRegex.test(password);
    }

    isValidUsername(username) {
        // 3-20 characters, letters, numbers, underscores only
        const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
        return usernameRegex.test(username);
    }

    // Event logging
    logAuthEvent(event, userId) {
        try {
            fetch(`${this.phpUrl}/log-auth-event.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    event: event,
                    user_id: userId,
                    timestamp: Date.now(),
                    ip: this.getClientIP()
                })
            });
        } catch (error) {
            console.error('Error logging auth event:', error);
        }
    }

    getClientIP() {
        // This would need to be implemented server-side
        return 'unknown';
    }

    // Check if user is authenticated
    isAuthenticated() {
        return this.getSession() !== null;
    }

    // Get current user
    getCurrentUser() {
        return this.getSession();
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CasinoAuth;
}