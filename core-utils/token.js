const crypto = require('crypto');
const db = require('./db');

const pool = [];
const POOL_SIZE = 20;
const REFILL_THRESHOLD = 5;

function generateToken() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let token = '';
    const bytes = crypto.randomBytes(16);
    for (let i = 0; i < 16; i++) {
        token += chars[bytes[i] % 26];
    }
    return token;
}

function isTokenTaken(token) {
    const row = db.prepare('SELECT 1 FROM users WHERE token = ?').get(token);
    return !!row;
}

async function refillPool() {
    while (pool.length < POOL_SIZE) {
        const token = generateToken();
        if (!isTokenTaken(token)) pool.push(token);
    }
}

function consumeToken() {
    const token = pool.shift();
    if (pool.length < REFILL_THRESHOLD) refillPool();
    return token;
}

module.exports = { refillPool, consumeToken };