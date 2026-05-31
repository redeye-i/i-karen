'use strict';

const { PermissionFlagsBits } = require('discord.js');
const AutoRole = require('../models/autorole.js');

const DANGEROUS_PERMS = [
    PermissionFlagsBits.Administrator,
    PermissionFlagsBits.ManageGuild,
    PermissionFlagsBits.ManageRoles,
    PermissionFlagsBits.BanMembers,
    PermissionFlagsBits.KickMembers,
    PermissionFlagsBits.ManageWebhooks,
    PermissionFlagsBits.ManageChannels,
];

module.exports = (client) => {
    client.on('guildMemberAdd', async (member) => {
        
        if (member.user.bot) return;

        try {
            const data = await AutoRole.findById(member.guild.id).lean();
            if (!data || !data.enabled || !data.roles || data.roles.length === 0) return;

            const botMember = member.guild.members.me;

            for (const roleId of data.roles) {
                
                const role = await member.guild.roles.fetch(roleId).catch(() => null);

                
                if (!role) {

                    continue;
                }

                
                const hasDanger = DANGEROUS_PERMS.some((p) => role.permissions.has(p));
                if (hasDanger) {
                    client.logger.warn(
                        `[AutoRole] Role "${role.name}" (${roleId}) in guild ${member.guild.id} has dangerous permissions. Attempting to remove them.`,
                    );

                    
                    try {
                        const safePerms = role.permissions.remove(DANGEROUS_PERMS);
                        await role.setPermissions(
                            safePerms,
                            '[AutoRole] Automatically removed dangerous permissions detected on join',
                        );
                        client.logger.log(
                            `[AutoRole] Removed dangerous perms from role "${role.name}" in guild ${member.guild.id}.`,
                        );
                    } catch (permErr) {
                        
                        client.logger.error(
                            `[AutoRole] Failed to remove dangerous perms from "${role.name}" in guild ${member.guild.id}: ${permErr}`,
                        );

                        try {
                            const owner = await member.guild.fetchOwner().catch(() => null);
                            if (owner) {
                                await owner.send(
                                    `**Auto Role Warning — ${member.guild.name}**\n\n` +
                                    `The role **${role.name}** (\`${roleId}\`) is configured as an auto role but now has **dangerous permissions**.\n` +
                                    `I could not automatically fix this. Please remove it from auto role or edit its permissions.\n\n` +
                                    `-# This role was **skipped** and not assigned to \`${member.user.tag}\`.`,
                                ).catch(() => { });
                            }
                        } catch { }

                        
                        continue;
                    }
                }

                
                if (role.position >= botMember.roles.highest.position) {
                    client.logger.warn(
                        `[AutoRole] Cannot assign role "${role.name}" — it is above or equal to my highest role in guild ${member.guild.id}.`,
                    );
                    continue;
                }

                
                await member.roles.add(role, '[AutoRole] Automatically assigned on join').catch((err) => {
                    client.logger.error(
                        `[AutoRole] Failed to assign role "${role.name}" to ${member.user.tag}: ${err}`,
                    );
                });
            }
        } catch (err) {
            client.logger.error(`[AutoRole] Error in guildMemberAdd handler: ${err}`, err);
        }
    });
};
