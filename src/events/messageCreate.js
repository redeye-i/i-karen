const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const commandExecution = require('../handlers/commandExecution');
const { checker } = require('../commands/automod/automod');
const { handleAntinukeMention } = require('./antimention');

const mcooldown = new Set();

module.exports = async (client) => {
    client.on('messageCreate', async (message) => {
        if (!message.guild) return;
        handleAntinukeMention(client, message).catch(() => {});
        if (message.author.bot) return;
        checker(message);
        try {
            let check = await client.util.BlacklistCheck(message.guild)
            if (check) return;

            await client.util.setPrefix(message, client);

            if (message.content === `<@${client.user.id}>`) {
                if (mcooldown.has(message.author.id)) return;
                mcooldown.add(message.author.id);
                setTimeout(() => mcooldown.delete(message.author.id), 4000);

                return client.util.container(message, `use \`${message.guild.prefix || '&'}help\` to get the list of commands!`);
            }

            let prefix = message.guild.prefix || '!';
            const mentionRegexPrefix = RegExp(`^<@!?${client.user.id}>`);
            const prefix1 = message.content.match(mentionRegexPrefix) ? message.content.match(mentionRegexPrefix)[0] : prefix;
            let datab = client.noprefix || [];

            if (!datab.includes(message.author.id)) {
                if (!message.content.startsWith(prefix1)) return;
            }

            const args = datab.includes(message.author.id) == false
                ? message.content.slice(prefix1.length).trim().split(/ +/)
                : message.content.startsWith(prefix1) == true
                    ? message.content.slice(prefix1.length).trim().split(/ +/)
                    : message.content.trim().split(/ +/);

            const cmd = args.shift().toLowerCase();

            const command = client.commands.get(cmd.toLowerCase()) ||
                client.commands.find((c) => c.aliases?.includes(cmd.toLowerCase()));

            if (!command) return;
            let blacklistdb = client.blacklist || [];
            if (blacklistdb.includes(message.author.id) && !client.config.owner.includes(message.author.id)) {
                client.util.container(message, `You are blacklisted from using this bot.`);
                return;
            }
            await commandExecution.executeCommand(client, message, command, args);

        } catch (err) {
            if (err.code === 429) {
                await client.util.handleRateLimit();
            }
            console.error('MessageCreate Error:', err);
            return;
        }
    });
};
