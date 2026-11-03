const net = require('net');
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder().setName('ping').setDescription('Replies with host latency to google.com'),
    async execute(interaction) {
    try {
        const latency = await pingGoogle();
        await interaction.reply(`Google latency: ${latency} ms`);
    } catch (err) {
        await interaction.reply("Failed to ping Google.");
    }
}
};
function pingGoogle() {
    return new Promise((resolve, reject) => {
        const start = Date.now();

        const socket = net.createConnection(80, "google.com");

        socket.on("connect", () => {
            const latency = Date.now() - start;
            socket.destroy();
            resolve(latency);
        });

        socket.on("error", (err) => {
            reject(err);
        });
    });
}

