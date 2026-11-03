const https = require('https');

let playerIndex = null;
let lastFetch = 0;
const CACHE_TTL = 20 * 60 * 1000; // 20 minutes

function fetchPlayers() {
    return new Promise((resolve, reject) => {
        https.get('https://game.raceroom.com/multiplayer-rating/ratings.json', (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log('Player cache updated');
                resolve(JSON.parse(data));
            });
            res.on('error', reject);
        });
    });
}

function buildIndex(players) {
    const index = new Map();
    const idIndex = new Map(); // new
    for (const player of players) {
        if (!player.Fullname) continue;
        const firstWord = player.Fullname.split(' ')[0].toUpperCase();
        if (!index.has(firstWord)) index.set(firstWord, []);
        index.get(firstWord).push(player);
        idIndex.set(player.UserId, player); // new
    }
    return { index, idIndex };
}

async function getPlayerIndex() {
    if (!playerIndex || Date.now() - lastFetch > CACHE_TTL) {
        const players = await fetchPlayers();
        playerIndex = buildIndex(players);
        lastFetch = Date.now();
    }
    return playerIndex;
}

async function findPlayerByToken(token) {
    const index = await getPlayerIndex();
    const matches = index.get(token) || [];
    if (matches.length === 0) return null;
    if (matches.length > 1) throw new Error('Multiple players found for token');
    return matches[0];
}

function invalidateCache() {
    lastFetch = 0;
}

module.exports = { findPlayerByToken, getPlayerIndex, invalidateCache };