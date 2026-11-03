const db = require('./db');
const { getPlayerIndex, invalidateCache } = require('./script');


async function processPendingVerifications(client) {
    const pending = db.prepare('SELECT discord_id, token FROM users WHERE token IS NOT NULL AND r3e_user_id IS NULL').all();
    if (pending.length === 0) return;

    invalidateCache();
    const index = await getPlayerIndex();
    const verified = db.prepare('SELECT discord_id, r3e_user_id FROM users WHERE r3e_user_id IS NOT NULL').all();
    for (const user of verified) {
        const player = index.idIndex.get(user.r3e_user_id);
        if (player) {
            db.prepare('UPDATE users SET r3e_fullname = ? WHERE discord_id = ?')
                .run(player.Fullname, user.discord_id);
        }
    }

    for (const user of pending) {
        const matches = index.get(user.token) || [];
        if (matches.length === 1) {
            db.prepare('UPDATE users SET r3e_user_id = ?, r3e_fullname = ?, token = NULL, verified_at = datetime("now") WHERE discord_id = ?')
                .run(Math.floor(matches[0].UserId), matches[0].Fullname, user.discord_id);
            
            await channel?.send(`<@${user.discord_id}> has been verified as ${matches[0].Fullname}!`);        
        }
    }
}

module.exports = { processPendingVerifications };