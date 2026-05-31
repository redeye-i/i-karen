const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const lodash = require('lodash');

module.exports = {
    name: 'list',
    aliases: ['l'],
    subcommand: ['admin', 'mod', 'bot', 'inrole', 'booster', 'roles', 'noroles', 'muted', 'joinpos', 'bans'],
    category: 'mod',
    premium: false,
    run: async (client, message, args) => {
        if (!args[0]) {
            return client.util.container(message,
                `#  List Command\n\n` +
                `Please provide a list type.\n\n` +
                `**Available Options:**\n` +
                `\`admin\`, \`mod\`, \`bot\`, \`inrole\`, \`booster\`, \`noroles\`, \`roles\`, \`muted\`, \`joinpos\`, \`bans\`\n\n` +
                `**Example:** \`${message.guild.prefix || '&'}list admin\``
            );
        }

        const require = args[0].toLowerCase();
        let membersList = [];
        let title = '';
        let index = 0;

        if (require === 'joinpos') {
            const joinpos = await message.guild.members.fetch().then(members => members.sort((a, b) => a.joinedAt - b.joinedAt));
            membersList = joinpos.map((member) => `${++index}. <@${member.id}> | ${member.id}`);
            title = 'User Join Positions';
        }

        if (require === 'muted') {
            const muted = await message.guild.members.fetch().then(members => members.filter(member => member.isCommunicationDisabled()));
            membersList = muted.map((member) => `${++index}. <@${member.id}> | ${member.id}`);
            title = 'Muted Members';
        }

        if (require === 'noroles') {
            const noroles = await message.guild.members.fetch().then(members => members.filter(member => member.roles.cache.size === 1));
            membersList = noroles.map((member) => `${++index}. <@${member.id}> | ${member.id}`);
            title = 'Members Without Roles';
        }

        if (require === 'roles') {
            const roles = message.guild.roles.cache.filter(role => role.name !== '@everyone').sort((a, b) => b.position - a.position);
            membersList = roles.map((role) => `${++index}. <@&${role.id}> | ${role.id}`);
            title = 'Roles in the Server';
        }

        if (require === 'admin') {
            const admin = await message.guild.members.fetch().then(members => members.filter(member => member.permissions.has('Administrator')));
            membersList = admin.map((member) => `${++index}. <@${member.id}> | ${member.id}`);
            title = 'Admins in the Server';
        }

        if (require === 'mod') {
            const mod = await message.guild.members.fetch().then(members => members.filter(member =>
                member.permissions.has('KickMembers') &&
                member.permissions.has('ManageMessages') &&
                member.permissions.has('ManageRoles') &&
                member.permissions.has('ModerateMembers')
            ));
            membersList = mod.map((member) => `${++index}. <@${member.id}> | ${member.id}`);
            title = 'Moderators in the Server';
        }

        if (require === 'bot') {
            const bot = await message.guild.members.fetch().then(members => members.filter(member => member.user.bot));
            membersList = bot.map((member) => `${++index}. <@${member.id}> | ${member.id}`);
            title = 'Bots in the Server';
        }

        if (require === 'inrole') {
            const role =
                message.mentions.roles.first() ||
                message.guild.roles.cache.get(args[1]) ||
                (await message.guild.roles.fetch(args[1]).catch(() => null));

            if (!role) {
                return client.util.container(message,
                    `✗ | No role found. Please provide a valid role mention or ID.`
                );
            }

            const inrole = await message.guild.members.fetch().then(members => members.filter(member => member.roles.cache.has(role.id)));
            membersList = inrole.map((member) => `${++index}. <@${member.id}> | ${member.id}`);
            title = `Members with ${role.name} Role`;
        }

        if (require === 'booster') {
            const boosters = await message.guild.members.fetch().then(members => members.filter(member => member.premiumSince));
            membersList = boosters.map((member) => `${++index}. <@${member.id}> | ${member.id}`);
            title = 'Server Boosters';
        }

        if (require === 'bans') {
            const bans = await message.guild.bans.fetch();
            if (bans.size === 0) {
                return client.util.container(message,
                    `ⓘ | No users are currently banned from this server.`
                );
            }
            membersList = bans.map((ban) => `${++index}. [${ban.user.username}](https://discord.com/users/${ban.user.id}) | ${ban.user.id}`);
            title = 'Banned Members in the Server';
        }

        if (membersList.length === 0) {
            return client.util.container(message,
                `ⓘ | No data found for the specified list type **${require}**.`
            );
        }

        
        client.util.karenPagination(membersList, title, client, message);
    }
};
