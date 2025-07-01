// Session management utilities

class WalletSession {
    constructor() {
        this.sessionKey = 'yelux_wallet_session';
        this.walletKey = 'yelux_current_wallet';
        this.timestampKey = 'yelux_session_timestamp';
        this.maxAge = 30 * 60 * 1000; // 30 minutes
        
        // Auto-cleanup expired sessions
        this.startSessionMonitor();
    }
    
    createSession(walletData) {
        try {
            localStorage.setItem(this.sessionKey, 'active');
            localStorage.setItem(this.walletKey, JSON.stringify(walletData));
            localStorage.setItem(this.timestampKey, Date.now().toString());
            
            this.logSessionEvent('Session created');
            return true;
        } catch (error) {
            console.error('Error creating session:', error);
            return false;
        }
    }
    
        getSession() {
        try {
            const sessionStatus = localStorage.getItem(this.sessionKey);
            const walletData = localStorage.getItem(this.walletKey);
            const timestamp = localStorage.getItem(this.timestampKey);
            
            if (!sessionStatus || !walletData || !timestamp) {
                return null;
            }
            
            // Check if session is expired
            if (this.isExpired()) {
                this.clearSession();
                return null;
            }
            
            return {
                wallet: JSON.parse(walletData),
                timestamp: parseInt(timestamp),
                isActive: sessionStatus === 'active'
            };
        } catch (error) {
            console.error('Error getting session:', error);
            this.clearSession();
            return null;
        }
    }
    
    isExpired() {
        const timestamp = localStorage.getItem(this.timestampKey);
        if (!timestamp) return true;
        
        const sessionAge = Date.now() - parseInt(timestamp);
        return sessionAge > this.maxAge;
    }
    
    refreshSession() {
        if (this.getSession()) {
            localStorage.setItem(this.timestampKey, Date.now().toString());
            this.logSessionEvent('Session refreshed');
            return true;
        }
        return false;
    }
    
    clearSession() {
        localStorage.removeItem(this.sessionKey);
        localStorage.removeItem(this.walletKey);
        localStorage.removeItem(this.timestampKey);
        
        this.logSessionEvent('Session cleared');
    }
    
    startSessionMonitor() {
        setInterval(() => {
            if (this.isExpired()) {
                this.clearSession();
                this.logSessionEvent('Session expired - auto logout');
                
                // Redirect to login if on protected page
                if (this.isProtectedPage()) {
                    window.location.href = 'dashboard.html';
                }
            }
        }, 60000); // Check every minute
    }
    
    isProtectedPage() {
        const protectedPages = ['dashboard.html', 'send.html', 'mining-history.html'];
        return protectedPages.some(page => window.location.pathname.includes(page));
    }
    
    logSessionEvent(event) {
        console.log(`[WalletSession] ${new Date().toISOString()}: ${event}`);
    }
    
    getSessionInfo() {
        const session = this.getSession();
        if (!session) return null;
        
        const remainingTime = this.maxAge - (Date.now() - session.timestamp);
        
        return {
            isActive: session.isActive,
            walletAddress: session.wallet.address,
            createdAt: new Date(session.timestamp),
            expiresAt: new Date(session.timestamp + this.maxAge),
            remainingTime: Math.max(0, remainingTime),
            remainingMinutes: Math.floor(Math.max(0, remainingTime) / 60000)
        };
    }
}

// Global session instance
const walletSession = new WalletSession();

// Convenience functions for backward compatibility
function isWalletUnlocked() {
    return walletSession.getSession() !== null;
}

function getCurrentWallet() {
    const session = walletSession.getSession();
    return session ? session.wallet : null;
}

function clearWalletSession() {
    walletSession.clearSession();
}

function refreshWalletSession() {
    return walletSession.refreshSession();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { WalletSession, walletSession };
}

