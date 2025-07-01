const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = 8081;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    next();
});

// Simple data storage (in production, use a real database)
let users = [];
let sessions = [];
let walletLinks = [];
let casinoBalances = [];
let transactions = [];

// Helper functions
function generateSessionId() {
    return crypto.randomBytes(32).toString('hex');
}

function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

function findUserByEmail(email) {
    return users.find(u => u.email === email);
}

function findUserById(id) {
    return users.find(u => u.id === id);
}

function getSessionUser(sessionId) {
    const session = sessions.find(s => s.sessionId === sessionId);
    if (session && session.expires > Date.now()) {
        return findUserById(session.userId);
    }
    return null;
}

// Routes

// User Registration
app.post('/register.php', (req, res) => {
    try {
        const { username, email, password, confirmPassword } = req.body;
        
        // Validation
        if (!username || !email || !password) {
            return res.json({ success: false, error: 'All fields are required' });
        }

        if (password !== confirmPassword) {
            return res.json({ success: false, error: 'Passwords do not match' });
        }

        if (password.length < 6) {
            return res.json({ success: false, error: 'Password must be at least 6 characters' });
        }

        // Check if user exists
        if (findUserByEmail(email) || users.find(u => u.username === username)) {
            return res.json({ success: false, error: 'User already exists' });
        }
        
        // Create user
        const user = {
            id: users.length + 1,
            username,
            email,
            password: hashPassword(password),
            email_verified: false,
            account_status: 'active',
            created_at: new Date().toISOString(),
            last_login: null
        };
        
        users.push(user);

        // Create initial casino balance
        casinoBalances.push({
            id: casinoBalances.length + 1,
            user_id: user.id,
            balance: 0,
            total_deposited: 0,
            total_withdrawn: 0,
            updated_at: new Date().toISOString()
        });
        
        res.json({ 
            success: true, 
            message: 'Registration successful',
            user: { 
                id: user.id, 
                username: user.username, 
                email: user.email 
            } 
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.json({ success: false, error: 'Registration failed' });
    }
});

// User Login
app.post('/login.php', (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.json({ success: false, error: 'Email and password are required' });
        }

        const user = findUserByEmail(email);
        
        if (!user || user.password !== hashPassword(password)) {
            return res.json({ success: false, error: 'Invalid credentials' });
        }

        if (user.account_status !== 'active') {
            return res.json({ success: false, error: 'Account is suspended' });
        }

        // Create session
        const sessionId = generateSessionId();
        const session = {
            sessionId,
            userId: user.id,
            created: Date.now(),
            expires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
        };

        sessions.push(session);

        // Update last login
        user.last_login = new Date().toISOString();
        
        res.json({ 
            success: true, 
            message: 'Login successful',
            user: { 
                id: user.id, 
                username: user.username, 
                email: user.email,
                sessionId: sessionId
            } 
        });
    } catch (error) {
        console.error('Login error:', error);
        res.json({ success: false, error: 'Login failed' });
    }
});