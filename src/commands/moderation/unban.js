const { PermissionsBitField } = require('discord.js');

module.exports = {
    name: 'unban',
    category: 'mod',
    premium: false,

    run: async (client, message, args) => {
        if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            return client.util.container(message, `✗ | You must have \`Ban Members\` permissions to use this command.`);
        }

        if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            return client.util.container(message, `✗ | I must have \`Ban Members\` permissions to execute this command.`);
        }

        const isOwner = message.author.id === message.guild.ownerId;
        if (!isOwner && !client.util.hasHigher(message.member)) {
            return client.util.container(message, `✗ | You must have a higher role than me to use this command.`);
        }

        const userID = args[0];
        if (!userID) {
            return client.util.container(message, `✗ | You didn't provide the ID of the member to unban.\n\n**Usage:** \`${message.guild.prefix}unban <user_id>\``);
        }

        try {
            
            const userBanInfo = await message.guild.bans.fetch(userID);
            
            if (!userBanInfo) {
                return client.util.container(message, `✗ | This user isn't banned in this server.`);
            }

            
            await message.guild.members.unban(userID, `Unbanned by ${message.author.tag} (${message.author.id})`);

            
            const user = await client.users.fetch(userID);

            return client.util.container(message, `✓ | Successfully unbanned **${user.tag}** (\`${user.id}\`).`);

        } catch (error) {
            
            if (error.code === 10026) {
                return client.util.container(message, `✗ | This user isn't banned in this server.`);
            }

            return client.util.container(message, `✗ | Failed to unban that member. They might not be banned or an error occurred.`);
        }
    }
};
