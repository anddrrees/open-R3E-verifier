const { SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, MessageFlags } = require('discord.js');
const { consumeToken } = require('../../core-utils/token.js');
const db = require('../../core-utils/db.js');
const { findPlayerByToken } = require('../../core-utils/script.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('verify')
        .setDescription('Verifies the user.'),

    async execute(interaction) {
        const serverData = db.prepare('SELECT guild_id, verified_role_id FROM guilds WHERE guild_id = ?').get(interaction.guild.id);
        if (!serverData) {
            await interaction.reply({ content: 'Please run /start first.', flags: MessageFlags.Ephemeral });
            return;
        }

        const existing = db.prepare('SELECT r3e_user_id, r3e_fullname FROM users WHERE discord_id = ?').get(interaction.user.id);
        if (existing?.r3e_user_id) {
            // Already verified globally, just assign the role if missing
            const role = interaction.guild.roles.cache.get(serverData.verified_role_id);
            if (role && !interaction.member.roles.cache.has(role.id)) {
                await interaction.member.roles.add(role);
            }
            await interaction.reply({ 
                content: `You are already verified as ${existing.r3e_fullname}. Welcome back!`, 
            });
            return;
        }

        try {
            const token = consumeToken();
            const discordId = interaction.user.id;

            db.prepare(`
                INSERT INTO users (discord_id, token)
                VALUES (?, ?)
                ON CONFLICT(discord_id) DO UPDATE SET token = excluded.token
            `).run(discordId, token);

            const confirm = new ButtonBuilder()
                .setCustomId('confirm')
                .setLabel("I'm ready!")
                .setStyle(ButtonStyle.Primary);

            const row = new ActionRowBuilder().addComponents(confirm);

            const response = await interaction.reply({
                content: `Your verification token: \`${token}\`\nPut it in your RaceRoom first or last name, then press the button.`,
                flags: MessageFlags.Ephemeral,
                components: [row],
                withResponse: true,
            });

            const collectorFilter = (i) => i.user.id === discordId;

            try {
                const confirmation = await response.resource.message.awaitMessageComponent({
                    filter: collectorFilter,
                    time: 120_000
                });

                if (confirmation.customId === 'confirm') {
                    await confirmation.deferUpdate();
                    await interaction.editReply({ 
                        content: 'Searching for your token, please wait...', 
                        components: [] 
                    });

                    const player = await findPlayerByToken(token);

                    if (!player) {
                        await interaction.editReply({ content: 'Could not find your token yet, retrying in 1 minute...', components: [] });
                        await new Promise(res => setTimeout(res, 60_000));
                        const retry = await findPlayerByToken(token);

                        if (!retry) {
                            await interaction.editReply({ content: 'You will be verified in the next cycle, please be patient!', components: [] });
                            return;
                        }

                        db.prepare('UPDATE users SET r3e_user_id = ?, r3e_fullname = ?, token = NULL, verified_at = datetime("now") WHERE discord_id = ?')
                            .run(Math.floor(retry.UserId), retry.Fullname, discordId);
                        const role = interaction.guild.roles.cache.get(serverData.verified_role_id);
                        if (role) await interaction.member.roles.add(role);
                        await interaction.editReply({ content: `Verified! Welcome, ${retry.Fullname}.`, components: [] });
                        return;
                    }

                    db.prepare('UPDATE users SET r3e_user_id = ?, r3e_fullname = ?, token = NULL, verified_at = datetime("now") WHERE discord_id = ?')
                        .run(Math.floor(player.UserId), player.Fullname, discordId);
                    const role = interaction.guild.roles.cache.get(serverData.verified_role_id);
                    if (role) await interaction.member.roles.add(role);
                    await interaction.editReply({ content: `Verified! Welcome, ${player.Fullname}.`, components: [] });
                }

            } catch {
                db.prepare('UPDATE users SET token = NULL WHERE discord_id = ?').run(discordId);
                await interaction.editReply({ content: 'Confirmation not received within 2 minutes, cancelling.', components: [] });
            }

        } catch (err) {
            console.error(err);
            await interaction.reply({ content: 'Something went wrong during verification.', ephemeral: true });
        }
    }
};