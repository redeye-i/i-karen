module.exports = {
    name: 'nick',
    aliases: [],
    category: 'mod',
    premium: false,

    run: async (client, message, args) => {
        const role = await client.db.get(`modrole_${message.guild.id}`) || null;

        if (!message.member.permissions.has('ManageNicknames') && (!role || !message.member.roles.cache.has(role))) {
            return client.util.container(message, `✗ | You must have \`Manage Nicknames\` permission to use this command.`);
        }

        if (!message.guild.members.me.permissions.has('ManageNicknames')) {
            return client.util.container(message, `✗ | I must have \`Manage Nicknames\` permission to use this command.`);
        }

        if (!client.util.hasHigher(message.member) && (!role || !message.member.roles.cache.has(role))) {
            return client.util.container(message, `✗ | You must have a higher role than me to use this command.`);
        }

        if (!args.length) {
            return client.util.container(message, `✗ | Please provide a member and optionally a new nickname.\n\n**Usage:** \`${message.guild.prefix}nick <member> [nickname]\``);
        }

        let member = await getUserFromMention(message, args[0]);
        if (!member) {
            try {
                member = await message.guild.members.fetch(args[0]);
            } catch (error) {
                return client.util.container(message, `✗ | Please provide a valid member.`);
            }
        }

        const name = args.slice(1).join(' ');

        try {
            if (!name) {
                await member.setNickname(null, `Nickname reset by ${message.author.tag}`);
                return client.util.container(message, `✓ | ${member}'s nickname has been successfully removed.`);
            } else {
                await member.setNickname(name, `Nickname changed by ${message.author.tag}`);
                return client.util.container(message, `✓ | ${member}'s nickname has been successfully changed to **${name}**.`);
            }
        } catch (err) {
            console.error('Nick error:', err.message);
            return client.util.container(message, `✗ | Failed to change nickname. I may not have sufficient permissions or my highest role may not be above ${member}'s highest role.`);
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
    } catch (err) {
        return null;
    }
}
