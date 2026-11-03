const { SlashCommandBuilder, MessageFlags, ChannelType, PermissionFlagsBits, Colors, EmbedBuilder } = require('discord.js');
const db = require('../../core-utils/db.js');
module.exports = {
    data: new SlashCommandBuilder()
        .setName('start')
        .setDescription('Initializes the bot setup for the server. Must be run by an administrator.'),

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            await interaction.reply({ content: 'You do not have permission to run this command.', ephemeral: true });
            return;
        }
        try {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            const serverData = db.prepare(`SELECT * FROM guilds WHERE guild_id = ?`).get(interaction.guild.id);

            const exists = (id, manager) => id ? manager.cache.has(id) : false;

            let { verify_channel_id, verified_role_id, admin_role_id, how_to_chID, category_id } = serverData || {};

            if (!exists(category_id, interaction.guild.channels)) {
                const category = await interaction.guild.channels.create({
                    name: 'R3E Verification',
                    type: ChannelType.GuildCategory,
                });
                category_id = category.id;
            }

            if (!exists(verify_channel_id, interaction.guild.channels)) {
                const channel = await interaction.guild.channels.create({
                    name: 'verify',
                    type: ChannelType.GuildText,
                    parent: category_id
                });
                verify_channel_id = channel.id;
            }

            if (!exists(how_to_chID, interaction.guild.channels)) {
                const channel = await interaction.guild.channels.create({
                    name: 'how-to-verify',
                    type: ChannelType.GuildText,
                    parent: category_id,
                    permissionOverwrites: [{
                        id: interaction.guild.roles.everyone,
                        deny: [PermissionFlagsBits.SendMessages]
                    }]
                });
                how_to_chID = channel.id;
            }

            if (!exists(verified_role_id, interaction.guild.roles)) { 
                const role = await interaction.guild.roles.create({
                    name : 'Verified [R3Ev]',
                    color: '#498C56',
                });
                verified_role_id = role.id;
            }

            if (!exists(admin_role_id, interaction.guild.roles)) {
                const role = await interaction.guild.roles.create({
                    name : 'League Admin [R3Ev]',
                    color: '#FFCF56',
                });
                admin_role_id = role.id;
            }

            db.prepare(`
                INSERT INTO guilds (guild_id, verify_channel_id, verified_role_id, admin_role_id, how_to_chID, category_id)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(guild_id) DO UPDATE SET 
                    verify_channel_id = excluded.verify_channel_id,
                    verified_role_id = excluded.verified_role_id,
                    admin_role_id = excluded.admin_role_id,
                    how_to_chID = excluded.how_to_chID,
                    category_id = excluded.category_id

            `).run(interaction.guild.id, verify_channel_id, verified_role_id, admin_role_id, how_to_chID, category_id);
        
            const channel = interaction.guild.channels.cache.get(how_to_chID);
            const helpMessage = `## HOW TO: R3E verification on discord
            > **IMPORTANT**: Have your R3E account logged in before verifying, otherwise you won't have time to confirm that you're ready.
            > __Make sure to have at least one race before verifying, otherwise the bot won't be able to find your account.__

            **Step 1:** Type \`/verify\` and find the result of the R3E verification bot.
            **Step 2:** The bot will send you a 16-character code in a code block like this: \`CODE_HERE\`.
            **Step 3:** Write that 16-character code in any of the profile fields of your R3E profile (First name or Last name only).
            **Step 4:** Press the **I'm done!** button.
            **Step 5:** Wait for confirmation—and you're done!

            > **Please be patient:** Confirmation can take **15-60 minutes** due to endpoint timing.
            > If you want to check your status, you can try \`/verify\` again!`;
            const embed = new EmbedBuilder()
                .setTitle('How to Verify Your R3E Account')
                .setDescription(helpMessage);
                await channel.send({ embeds: [embed] });

            await interaction.editReply({
                content: `Setup complete! Ready to verify.
                - Verification channel: <#${verify_channel_id}>
                - How-to channel: <#${how_to_chID}>
                - Verified role: <@&${verified_role_id}>
                - Admin role: <@&${admin_role_id}>
                Use /list to see verified users. Requires Admin role.
                Always leave the bot's role on top of the role hierarchy for it to work properly!`,
                flags: MessageFlags.Ephemeral
            })
        } catch (err) {
            console.error(err);
            await interaction.reply({ content: 'Something went wrong during setup.', ephemeral: true });
        }
    }
}