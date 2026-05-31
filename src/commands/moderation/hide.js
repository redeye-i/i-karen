const {
    Message,
    Client,
    PermissionsBitField
} = require('discord.js');

module.exports = {
    name: 'hide',
    aliases: [],
    category: 'mod',
    premium: false,

    run: async (client, message, args) => {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return client.util.container(message,
                `✗ | You must have \`Manage Channels\` permission to use this command.`
            );
        }

        const channel =
            message.mentions.channels.first() ||
            message.guild.channels.cache.get(args[0]) ||
            message.channel;

        if (channel.manageable) {
            try {
                await channel.permissionOverwrites.edit(message.guild.id, {
                    ViewChannel: false
                }, {
                    reason: `${message.author.tag} (${message.author.id})`
                });

                return client.util.container(message,
                    `✓ | ${channel} has been hidden for @everyone role.`
                );
            } catch (error) {
                return client.util.container(message,
                    `✗ | An error occurred while trying to hide the channel.\n\n\`\`\`${error.message}\`\`\``
                );
            }
        } else {
            return client.util.container(message,
                `✗ | I don't have adequate permissions to hide this channel.`
            );
        }
    }
};
