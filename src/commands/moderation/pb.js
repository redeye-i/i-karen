module.exports = {
    name: 'purgebot',
    aliases: ['pb', 'clearbots'],
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

        const amount = parseInt(args[0]) || 100;

        if (isNaN(amount) || amount <= 0) {
            return client.util.container(message, `✗ | You must provide a valid number of messages to scan.\n\n**Usage:** \`${message.guild.prefix}purgebot [amount]\``);
        }

        if (amount > 1000) {
            return client.util.container(message, `✗ | You can't scan more than **1000** messages at a time.`);
        }

        await message.delete().catch(() => { });

        try {
            
            const messages = await message.channel.messages.fetch({ limit: amount });
            const botMessages = messages.filter(msg => msg.author.bot);

            if (botMessages.size === 0) {
                return client.util.container(message, `ⓘ | No bot messages found in the last ${amount} messages.`);
            }

            
            await message.channel.bulkDelete(botMessages, true);

            
            return client.util.container(message,
                `✓ | Successfully deleted **${botMessages.size}** bot messages out of **${amount}** scanned messages.`
            ).then(msg => setTimeout(() => msg.delete().catch(() => { }), 4000));

        } catch (error) {
            console.error('Purgebot error:', error);
            return client.util.container(message, `✗ | An error occurred while trying to delete bot messages.`);
        }
    }
};
