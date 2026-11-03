const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const db = require('../../core-utils/db.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('list')
        .setDescription('Lists all verified users in the server.'),

    async execute(interaction) {
        const serverData = db.prepare('SELECT guild_id, admin_role_id FROM guilds WHERE guild_id = ?').get(interaction.guild.id);
        if (!serverData) {
            await interaction.reply({ content: 'Please run /start first.', flags: MessageFlags.Ephemeral });
        return;
        }

        const discordId = interaction.user.id;
        if (!interaction.member.roles.cache.has(serverData.admin_role_id)) {
            await interaction.reply({ content: 'You do not have permission to use this command.', flags: MessageFlags.Ephemeral });
            return;
        }

        const members = await interaction.guild.members.fetch();
        const verifiedIds = new Set(members.keys());

        const list = db.prepare(`
            SELECT r3e_fullname, discord_id FROM users
            WHERE r3e_user_id IS NOT NULL
            ORDER BY verified_at DESC
        `).all().filter(user => verifiedIds.has(user.discord_id));

        const message = list.length > 0
        ? list.map(user => `<${user.discord_id}> - ${user.r3e_fullname}`).join('\n').slice(0, 1900)
        : 'No verified users found.';

        await interaction.reply({ content: message });
    }
}