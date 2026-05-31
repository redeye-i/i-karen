const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const ms = require('ms');

module.exports = {
    name: 'mute',
    aliases: ['timeout', 'stfu'],
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

        if (!args[0]) {
            return client.util.container(message, `✗ | You didn't mention the member or provide a valid ID to mute.\n\n**Usage:** \`${message.guild.prefix}mute <member> <time> <reason>\``);
        }

        let user = await getUserFromMention(message, args[0]);
        if (!user) {
            try {
                user = await message.guild.members.fetch(args[0]);
            } catch (error) {
                return client.util.container(message, `✗ | You didn't mention the member or provide a valid ID to mute.\n\n**Usage:** \`${message.guild.prefix}mute <member> <time> <reason>\``);
            }
        }

        let reason = args.slice(2).join(' ') || 'No reason given';
        let time = args[1] || '27d';
        let dur = ms(time);

        if (!dur) {
            return client.util.container(message, `✗ | Invalid time format.\n\n**Usage:** \`${message.guild.prefix}mute <member> <time> <reason>\`\n**Examples:** 1m, 5h, 1d, 7d`);
        }

        if (user.isCommunicationDisabled()) {
            return client.util.container(message, `✗ | <@${user.user.id}> is already muted!`);
        }

        if (user.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return client.util.container(message, `✗ | <@${user.user.id}> has \`Administrator\` permissions!`);
        }

        if (user.id === message.guild.ownerId) {
            return client.util.container(message, `✗ | You can't mute the server owner!`);
        }

        if (user.id === message.member.id) {
            return client.util.container(message, `✗ | You can't mute yourself.`);
        }

        if (!user.manageable) {
            return client.util.container(message, `✗ | I don't have enough permissions to mute <@${user.user.id}>.`);
        }

        try {
            await user.timeout(dur, `${message.author.tag} | ${reason}`);

            
            try {
                const muteEmbed = new EmbedBuilder()
                    .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setDescription(`You have been muted in **${message.guild.name}**.\n\n**Moderator:** ${message.author.tag}\n**Duration:** ${time}\n**Reason:** ${reason}`)
                    .setColor('#ff6b6b')
                    .setTimestamp();

                await user.send({ embeds: [muteEmbed] });
            } catch (err) {
                
            }

            return client.util.container(message, `✓ | Successfully muted <@${user.user.id}> for **${time}**.\n\n**Reason:** ${reason}`);

        } catch (error) {
            console.error('Error muting user:', error);
            return client.util.container(message, `✗ | An error occurred while trying to mute <@${user.user.id}>.`);
        }
    }
};

async function getUserFromMention(message, mention) {
    if (!mention) return null;

    const matches = mention.match(/^<@!?(\d+)>$/);
    if (!matches) return null;

    const id = matches[1];
    try {
        return await message.guild.members.fetch(id);
    } catch (error) {
        return null;
    }
}
