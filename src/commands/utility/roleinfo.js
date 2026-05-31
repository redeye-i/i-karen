module.exports = {
    name: 'roleinfo',
    aliases: ['ri'],
    category: 'info',
    description: 'To Get Information About A Role',
    premium: false,
    run: async (client, message, args) => {
        let role = message.mentions.roles.first() || await message.guild.roles.fetch(args[0]).catch(() => null);
        
        if (!role) {
            return client.util.container(message,
                `✗ | Please provide a valid role mention or ID.`
            );
        }
        
        let size = await message.guild.members.fetch()
            .then(members => members.filter(member => member.roles.cache.has(role.id)))
            .then(x => x.size);
        
        let color = role.color === 0 ? '#000000' : `#${role.color.toString(16).padStart(6, '0')}`;
        let created = `<t:${Math.round(role.createdTimestamp / 1000)}:R>`;
        
        let permissions;
        if (role.permissions.toArray().includes('Administrator')) {
            permissions = '`Administrator` (All Permissions)';
        } else {
            const perms = role.permissions.toArray().sort((a, b) => a.localeCompare(b));
            if (perms.length === 0) {
                permissions = 'No special permissions';
            } else {
                permissions = perms.map(p => `\`${p}\``).join(', ');
            }
        }
        
        return client.util.container(message,
            `#  Role Information\n\n` +
            `## General Info\n` +
            `**Role Name:** ${role.name}\n` +
            `**Role ID:** \`${role.id}\`\n` +
            `**Role Position:** ${role.rawPosition}\n` +
            `**Hex Color:** \`${color}\`\n` +
            `**Created:** ${created}\n` +
            `**Mentionable:** ${role.mentionable ? '✓ Yes' : '✗ No'}\n` +
            `**Managed:** ${role.managed ? '✓ Yes (Bot/Integration)' : '✗ No'}\n` +
            `**Hoisted:** ${role.hoist ? '✓ Yes' : '✗ No'}\n\n` +
            `## Allowed Permissions\n` +
            `${permissions}\n\n` +
            `## Role Statistics\n` +
            `**Members with this role:** \`${size}\``
        );
    }
};
