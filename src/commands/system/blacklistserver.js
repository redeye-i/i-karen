const {
    Message,
    Client,
    ActionRowBuilder,
    ButtonBuilder
} = require('discord.js');

this.config = require(`${process.cwd()}/config.json`);

module.exports = {
    name: 'blacklistserver',
    aliases: ['bs'],
    category: 'owner',
    run: async (client, message, args) => {
        if (!client.config.owner.includes(message.author.id)) return;

        let prefix = message.guild.prefix;
        const now = Math.floor(Date.now() / 1000);

        if (!args[0]) {
            return client.util.container(message,
                `# ⓘ Blacklist Server Command\n\n` +
                `Please provide the required arguments.\n\n` +
                `**Usage:**\n` +
                `\`${prefix}blacklistserver add <server id> <reason> <expires>\`\n` +
                `\`${prefix}blacklistserver remove <server id>\`\n` +
                `\`${prefix}blacklistserver list\``
            );
        }

        let opt = args[0].toLowerCase();
        let data = (await client.db.get(`blacklist_server`)) || {};

        if (opt === 'list') {
            let listing = Object.keys(data);
            let info = [];

            if (listing.length < 1) {
                info.push('No blacklisted servers');
            } else {
                for (let i = 0; i < listing.length; i++) {
                    try {
                        let ss = await client.guilds.fetch(listing[i]);
                        info.push(`${i + 1}) ${ss.id} | Added by ${data[listing[i]].addedby} | Added at ${data[listing[i]].addedat} | Expires at ${data[listing[i]].expires}`);
                    } catch {
                        listing = listing.filter(id => id !== listing[i]);
                        await client.db.set(`blacklist_server`, listing);
                        info.push(`${i + 1}) Unknown Server (${listing[i]}) - Removed`);
                    }
                }
            }

            return await client.util.pagination(
                message,
                info,
                'Blacklist Server List'
            );
        }

        if (!args[1]) {
            return client.util.container(message,
                `# ⓘ Blacklist Server Command\n\n` +
                `Please provide the required arguments.\n\n` +
                `**Usage:**\n` +
                `\`${prefix}blacklistserver add <server id> <reason> <expires>\`\n` +
                `\`${prefix}blacklistserver remove <server id>\`\n` +
                `\`${prefix}blacklistserver list\``
            );
        }

        let server;
        try {
            server = await client.guilds.fetch(`${args[1]}`);
        } catch {
            return client.util.container(message,
                `✗ | Please provide a valid server ID.`
            );
        }

        if (opt === 'add' || opt === 'a' || opt === '+') {
            if (data[server.id]) {
                return client.util.container(message,
                    `ⓘ | **${server.name}** (${server.id}) is already blacklisted.`
                );
            }
            const reason = args[2] || 'No reason provided';
            let expiry = null;
            if (args[3]) {
                const time = parseInt(args[3]);
                if (!isNaN(time)) {
                    expiry = now + time;
                }
            }

            data[server.id] = {
                addedby: message.author.id,
                addedat: now,
                expires: expiry,
                reason: reason
            };

            await client.db.set(`blacklist_server`, data);
            client.util.blacklistserver();

            return client.util.container(message,
                `✓ | **${server.name}** (${server.id}) has been added to the server blacklist.`
            );
        }

        if (opt === 'remove' || opt === 'r' || opt === '-') {
            if (!data[args[1]]) {
                return client.util.container(message,
                    `✗ | Server ID **${args[1]}** is not in the blacklist.`
                );
            }

            delete data[args[1]];
            await client.db.set(`blacklist_server`, data);
            client.util.blacklistserver();

            return client.util.container(message,
                `✓ | Server ID **${args[1]}** has been removed from the blacklist.`
            );
        }

        return client.util.container(message,
            `# ⓘ Blacklist Server Command\n\n` +
            `Please provide valid arguments.\n\n` +
            `**Usage:**\n` +
            `\`${prefix}blacklistserver add <server id>\`\n` +
            `\`${prefix}blacklistserver remove <server id>\`\n` +
            `\`${prefix}blacklistserver list\``
        );
    }
};
