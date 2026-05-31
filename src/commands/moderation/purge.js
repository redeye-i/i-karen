module.exports = {
    name: 'purge',
    aliases: ['clear', 'c'],
    category: 'mod',
    premium: false,

    run: async (client, message, args) => {
        const role = await client.db.get(`modrole_${message.guild.id}`) || null;

        if (!message.member.permissions.has('ManageMessages') && (!role || !message.member.roles.cache.has(role))) {
            return client.util.container(message, `✗ | You must have \`Manage Messages\` permissions to use this command.`);
        }

        if (!message.guild.members.me.permissions.has('ManageMessages')) {
            return client.util.container(message, `✗ | I must have \`Manage Messages\` permissions to use this command.`);
        }

        if (!args[0]) {
            return client.util.container(message,
                `✗ | You didn't provide the purge type.\n\n` +
                `**Usage:** \`${message.guild.prefix}purge <type> <amount> [content]\`\n\n` +
                `**Types:** \`bots\`, \`humans\`, \`links\`, \`attachments\`, \`mentions\`, \`emojis\`, \`stickers\`, \`user\`, \`contains\`\n` +
                `**Example:** \`${message.guild.prefix}purge bots 50\``
            );
        }

        await message.delete().catch(() => {});

        
        if (args[0].toLowerCase() === 'user' || args[0].toLowerCase() === 'users') {
            let user = await getUserFromMention(message, args[1]);
            const count = parseInt(args[2]) || 99;

            if (!user) {
                user = message.guild.members.cache.get(args[1]);
            }

            if (!user) {
                return client.util.container(message,
                    `✗ | Please provide a valid user.\n\n**Usage:** \`${message.guild.prefix}purge user <member> <amount>\``
                );
            }

            const messages = await message.channel.messages.fetch({ limit: count }, { cache: false, force: true });
            const userMessages = messages.filter(msg => msg.author.id === user.id);

            if (userMessages.size === 0) {
                return client.util.container(message, `ⓘ | No messages found from ${user} in the last ${count} messages.`);
            }

            await message.channel.bulkDelete(userMessages, true).catch(() => {});
            return client.util.container(message, `✓ | Successfully deleted **${userMessages.size}** messages from ${user}.`).then(msg => setTimeout(() => msg.delete(), 3000));
        }

        const type = args[0].toLowerCase();
        const amount = parseInt(args[1]) || 99;
        const contentToSearch = args.slice(2).join(' ');

        let messagesToDelete;

        switch (type) {
            case 'bot':
            case 'bots':
                messagesToDelete = await fetchAndFilterMessages(message.channel, amount, msg => msg.author.bot);
                break;
            case 'emoji':
            case 'emojis':
                messagesToDelete = await fetchAndFilterMessages(message.channel, amount, msg => hasDiscordEmojis(msg.content));
                break;
            case 'sticker':
            case 'stickers':
                messagesToDelete = await fetchAndFilterMessages(message.channel, amount, msg => msg.stickers.size > 0);
                break;
            case 'mention':
            case 'mentions':
                messagesToDelete = await fetchAndFilterMessages(message.channel, amount, msg => msg.mentions.users.size > 0);
                break;
            case 'human':
            case 'humans':
                messagesToDelete = await fetchAndFilterMessages(message.channel, amount, msg => !msg.author.bot);
                break;
            case 'link':
            case 'links':
                messagesToDelete = await fetchAndFilterMessages(message.channel, amount, msg => msg.content.match(/(https?|ftp):\/\/[^\s/$.?#].[^\s]*/i));
                break;
            case 'attachment':
            case 'attachments':
                messagesToDelete = await fetchAndFilterMessages(message.channel, amount, msg => msg.attachments.size > 0);
                break;
            case 'content':
            case 'contains':
                if (!contentToSearch) {
                    return client.util.container(message,
                        `✗ | Please provide content to search for.\n\n**Usage:** \`${message.guild.prefix}purge contains <amount> <content>\``
                    );
                }
                messagesToDelete = await fetchAndFilterMessages(message.channel, amount, msg => msg.content.includes(contentToSearch));
                break;
            default:
                const numAmount = parseInt(args[0]);
                if (isNaN(numAmount) || numAmount <= 0) {
                    return client.util.container(message, `✗ | You must provide a valid number of messages to delete.`);
                }
                if (numAmount >= 1000) {
                    return client.util.container(message, `✗ | You can't delete more than **999** messages at a time.`);
                }
                await deleteMessages(message.channel, numAmount);
                return client.util.container(message, `✓ | Successfully deleted **${numAmount}** messages.`).then(m => setTimeout(() => m.delete().catch(() => {}), 3000));
        }

        if (messagesToDelete.size === 0) {
            return client.util.container(message, `ⓘ | No messages found matching the criteria.`);
        }

        await message.channel.bulkDelete(messagesToDelete, true).catch(() => {});
        return client.util.container(message, `✓ | Successfully deleted **${messagesToDelete.size}** messages.`).then(msg => setTimeout(() => msg.delete().catch(() => {}), 4000));
    }
};

async function fetchAndFilterMessages(channel, amount, filterFunction) {
    const messages = await channel.messages.fetch({ limit: amount });
    return messages.filter(filterFunction);
}

async function deleteMessages(channel, amount) {
    for (let i = amount; i > 0; i -= 100) {
        try {
            await channel.bulkDelete(Math.min(i, 100), true);
        } catch (error) {
            return;
        }
    }
}

function hasDiscordEmojis(text) {
    const emojiRegex = /<a?:\w+:\d+>/;
    return emojiRegex.test(text);
}

async function getUserFromMention(message, mention) {
    if (!mention) return null;

    const matches = mention.match(/^<@!?(\d+)>$/);
    if (!matches) return null;

    const id = matches[1];
    try {
        return await message.guild.members.fetch(id);
    } catch (err) {
        return null;
    }
}
