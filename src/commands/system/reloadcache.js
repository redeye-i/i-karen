const { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');

module.exports = {
    name: 'reloadcache',
    aliases: ['reloadch'],
    category: 'owner',
    run: async (client, message, args) => {
        if (!client.config.owner.includes(message.author.id)) return;

        await client.util.noprefix();
        await client.util.blacklist();
        await client.util.blacklistserver();
        await client.util.container(message, 'Cache reloaded successfully!');


    }
}
