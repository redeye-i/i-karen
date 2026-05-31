const { PermissionsBitField } = require('discord.js');

module.exports = {
    name: 'unmute',
    aliases: ['untimeout'],
    category: 'mod',
    premium: false,

    run: async (client, message, args) => {
        const role = await client.db.get(`modrole_${message.guild.id}`) || null;

        if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers) && (!role || !message.member.roles.cache.has(role))) {
            return client.util.container(message, `✗ | You must have \`Timeout Members\` permissions to use this command.`);
        }

        if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return client.util.container(message, `✗ | I must have \`Timeout Members\` permissions to run this command.`);
        }

        if (!client.util.hasHigher(message.member) && (!role || !message.member.roles.cache.has(role))) {
            return client.util.container(message, `✗ | You must have a higher role than me to use this command.`);
        }

        if (!args[0]) {
            return client.util.container(message, `✗ | You didn't mention the member or provide a valid ID to unmute.\n\n**Usage:** \`${message.guild.prefix}unmute <member> [reason]\``);
        }

        let user = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
        
        if (!user) {
            try {
                user = await message.guild.members.fetch(args[0]);
            } catch (error) {
                return client.util.container(message, `✗ | Please provide a valid member.`);
            }
        }

        if (user.id === client.user.id) {
            return client.util.container(message, `✗ | You cannot unmute me.`);
        }

        if (user.id === message.guild.ownerId) {
            return client.util.container(message, `✗ | You cannot unmute the server owner.`);
        }

        if (user.id === message.member.id) {
            return client.util.container(message, `✗ | You cannot unmute yourself.`);
        }

        if (!user.isCommunicationDisabled()) {
            return client.util.container(message, `✗ | ${user} is not currently muted.`);
        }

        if (!user.manageable) {
            return client.util.container(message, `✗ | I cannot unmute ${user}. Please check my role position and permissions.`);
        }

        const reason = args.slice(1).join(' ') || 'No reason given';

        try {
            await user.disableCommunicationUntil(null, `${message.author.tag} | ${reason}`);
            
            return client.util.container(message, `✓ | Successfully unmuted ${user}.\n\n**Reason:** ${reason}`);

        } catch (error) {
            console.error('Unmute error:', error);
            return client.util.container(message, `✗ | An error occurred while trying to unmute ${user}.`);
        }
    }
};
