const express = require('express');
const cors = require('cors');
require('dotenv').config();

const db = require('./db');
const routes = require('./routes/routes');

const app = express();
const PORT = process.env.PORT || 5000;

// ===== MIDDLEWARE =====
app.use(cors({
    origin: [
        'http://localhost:3000',
        'http://localhost:8000',
        'http://127.0.0.1:5500',
        'http://localhost:5500',
        'http://localhost:5000'
    ],
    credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// ===== HEALTH CHECK =====
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Server is running',
        timestamp: new Date()
    });
});

// ===== DATABASE TEST =====
app.get('/api/test', (req, res) => {
    db.query('SELECT COUNT(*) AS userCount FROM users', (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({
                success: false,
                message: 'Database connection failed'
            });
        }

        res.json({
            success: true,
            message: '✅ Database connected!',
            totalUsers: results[0].userCount
        });
    });
});

// ===== ROUTES =====
app.use('/api', routes);

// ===== 404 =====
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found'
    });
});

// ===== ERROR HANDLER =====
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({
        success: false,
        message: 'Internal Server Error'
    });
});

// ===== START SERVER =====
app.listen(PORT, () => {
    console.log(`\n======================================`);
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📡 API: http://localhost:${PORT}/api`);
    console.log(`======================================\n`);
});