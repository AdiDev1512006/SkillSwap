// backend/config/db.config.js

require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '1501',
    database: process.env.DB_NAME || 'skill_exchange_db',
    port: process.env.DB_PORT || 3306
};

module.exports = dbConfig;