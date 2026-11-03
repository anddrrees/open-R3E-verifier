const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('how-to')
        .setDescription('Learn how to verify your R3E account on Discord!'),

    async execute(interaction) {
        const serverData = db.prepare('SELECT guild_id FROM guilds WHERE guild_id = ?').get(interaction.guild.id);
        if (!serverData) {
            await interaction.reply({ content: 'Please run /start first.', flags: MessageFlags.Ephemeral });
        return;
        }

    try {
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
        await interaction.reply({ embeds: [embed] });
    } catch (err) {
        await interaction.reply("Failed to display help message.");
    }
}
};

