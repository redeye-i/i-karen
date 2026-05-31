const { PermissionsBitField } = require('discord.js');

module.exports = {
    name: 'lock',
    category: 'mod',
    premium: false,

    run: async (client, message, args) => {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return client.util.container(message, `✗ | You must have \`Manage Channels\` permission to use this command.`);
        }

        if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return client.util.container(message, `✗ | I must have \`Manage Channels\` permission to use this command.`);
        }

        const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[0]) || message.channel;

        if (!channel.manageable) {
            return client.util.container(message, `✗ | I don't have adequate permissions to lock this channel.`);
        }

        try {
            await channel.permissionOverwrites.edit(message.guild.id, {
                SendMessages: false
            }, {
                reason: `${message.author.tag} (${message.author.id})`
            });

            return client.util.container(message, `✓ | ${channel} has been locked for @everyone role.`);

        } catch (error) {
            console.error('Lock error:', error.message);
            return client.util.container(message, `✗ | An error occurred while trying to lock the channel: ${error.message}`);
        }
    }
};
