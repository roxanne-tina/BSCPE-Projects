const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('frontend'));

// Serve casino files
app.use('/casino', express.static('frontend/casino'));
app.use('/crypto', express.static('frontend/crypto'));

// Mock PHP endpoints with Node.js
app.post('/api/login', (req, res) => {
    // Handle login logic
    const { username, password } = req.body;
    // Simple mock authentication
    if (username && password) {
        res.json({ success: true, user: { id: 1, username } });
    } else {
        res.json({ success: false, message: 'Invalid credentials' });
    }
});

app.post('/api/register', (req, res) => {
    const { username, password, email } = req.body;
    // Mock registration
    res.json({ success: true, message: 'User registered successfully' });
});

app.get('/api/game-history', (req, res) => {
    // Mock game history
    res.json([
        { id: 1, game: 'Coin Flip', result: 'Win', amount: 100, date: new Date() },
        { id: 2, game: 'Dice Roll', result: 'Loss', amount: -50, date: new Date() }
    ]);
});

app.listen(8080, () => {
    console.log('Casino server running on http://localhost:8080');
});
