const { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');

this.config = require(`${process.cwd()}/config.json`);

module.exports = {
    name: 'reloadcache',
    aliases: ['reloadch'],
    category: 'owner',
    run: async (client, message, args) => {
        if (!this.config.owner.includes(message.author.id)) return;

        await client.util.noprefix();
        await client.util.blacklist();
        await client.util.blacklistserver();
        await client.util.container(message, 'Cache reloaded successfully!');


    }
}
