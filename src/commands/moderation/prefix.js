module.exports = {
    name: 'prefix',
    aliases: ['setprefix'],
    category: 'mod',
    premium: false,

    run: async (client, message, args) => {
        if (!message.member.permissions.has('Administrator')) {
            return client.util.container(message, `✗ | You must have \`Administrator\` permissions to change the prefix of this server.`);
        }

        if (!args[0]) {
            return client.util.container(message, `✗ | You didn't provide a new prefix.\n\n**Usage:** \`${message.guild.prefix}prefix <new_prefix>\`\n**Reset:** \`${message.guild.prefix}prefix &\``);
        }

        if (args[1]) {
            return client.util.container(message, `✗ | You cannot set a prefix with multiple arguments.`);
        }

        if (args[0].length > 3) {
            return client.util.container(message, `✗ | Prefix cannot be more than 3 characters long.`);
        }

        if (args[0] === '&') {
            await client.db.delete(`prefix_${message.guild.id}`);
            client.util.setPrefix(message, client);
            return client.util.container(message, `✓ | Successfully reset the prefix to the default: **&**`);
        }

        await client.db.set(`prefix_${message.guild.id}`, args[0]);
        client.util.setPrefix(message, client);
        return client.util.container(message, `✓ | Successfully changed the server prefix to: **${args[0]}**`);
    }
};
