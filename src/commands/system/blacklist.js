const { Message, Client } = require('discord.js');
const { USERS_PATTERN } = require('discord.js').MessageMentions;

this.config = require(`${process.cwd()}/config.json`);

module.exports = {
    name: 'blacklist',
    aliases: ['bl'],
    category: 'owner',
    run: async (client, message, args) => {
        if (!client.config.owner.includes(message.author.id)) return;

        let prefix = message.guild.prefix;

        if (!args[0]) {
            return client.util.container(message,
                `# ⓘ Blacklist Command\n\n` +
                `Please provide the required arguments.\n\n` +
                `**Usage:**\n` +
                `\`${prefix}blacklist add <user> [reason] [expiry]\`\n` +
                `\`${prefix}blacklist remove <user>\`\n` +
                `\`${prefix}blacklist list\`\n` +
                `\`${prefix}blacklist listid\``
            );
        }

        const opt = args[0].toLowerCase();
        let data = (await client.db.get('blacklist_user')) || {};

        if (opt === 'list' || opt === 'listid') {
            const users = Object.keys(data);
            let info = [];

            if (users.length === 0) {
                info.push('No blacklisted users');
            } else {
                let i = 1;
                for (const uid of users) {
                    try {
                        const u = await client.users.fetch(uid);
                        const expiry = data[uid].expiresAt ? new Date(data[uid].expiresAt * 1000).toLocaleString() : 'Never';
                        const line = opt === 'list'
                            ? `${i++}) ${u.tag} • Reason: ${data[uid].reason || 'N/A'} • Expires: ${expiry} • Added by: ${data[uid].addedBy}`
                            : `${i++}) ${uid} • Reason: ${data[uid].reason || 'N/A'} • Expires: ${expiry} • Added by: ${data[uid].addedBy}`;
                        info.push(line);
                    } catch {
                        info.push(
                            `${i++}) Unknown User (${uid}) • Reason: ${data[uid].reason || 'N/A'} • Expires: ${data[uid].expiresAt ? new Date(data[uid].expiresAt * 1000).toLocaleString() : 'Never'} • Added by: ${data[uid].addedBy}`
                        );
                    }
                }
            }

            return client.util.pagination(
                message,
                info,
                'Blacklist Users List'
            );
        }

        if (!args[1]) {
            return client.util.container(message,
                `✗ | Please provide a valid user ID or mention.`
            );
        }

        let user;
        try {
            user = await client.users.fetch(args[1]);
        } catch {
            return client.util.container(message,
                `✗ | Please provide a valid user ID.`
            );
        }
        const now = Math.floor(Date.now() / 1000);

        if (opt === 'add' || opt === 'a' || opt === '+') {
            if (data[user.id]) {
                return client.util.container(message,
                    `ⓘ | **${user.tag}** (${user.id}) is already blacklisted.`
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

            data[user.id] = {
                addedBy: message.author.id,
                addedAt: now,
                reason: reason,
                expiresAt: expiry
            };

            await client.db.set('blacklist_user', data);
            client.util.blacklist();

            return client.util.container(message,
                `✓ | **${user.tag}** (${user.id}) has been added to the blacklist. Reason: ${reason}, Expires: ${expiry ? new Date(expiry * 1000).toLocaleString() : 'Never'}`
            );
        }

        if (opt === 'remove' || opt === 'r' || opt === '-') {
            if (!data[user.id]) {
                return client.util.container(message,
                    `ⓘ | **${user.tag}** (${user.id}) is not blacklisted.`
                );
            }

            delete data[user.id];
            await client.db.set('blacklist_user', data);
            client.util.blacklist();

            return client.util.container(message,
                `✓ | **${user.tag}** (${user.id}) has been removed from the blacklist.`
            );
        }

        return client.util.container(message,
            `# ⓘ Blacklist Command\n\n` +
            `Please provide valid arguments.\n\n` +
            `**Usage:**\n` +
            `\`${prefix}blacklist add <user> [reason] [expiry]\`\n` +
            `\`${prefix}blacklist remove <user>\`\n` +
            `\`${prefix}blacklist list\`\n` +
            `\`${prefix}blacklist listid\``
        );
    }
};
