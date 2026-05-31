'use strict';

const {
    ContainerBuilder,
    TextDisplayBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    ActionRowBuilder,
    RoleSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
    PermissionFlagsBits,
} = require('discord.js');
const AutoRole = require('../../models/autorole.js');
const AntiNukeMemory = require('../../core/antinukeMemory.js');

const DANGEROUS_PERMS = [
    PermissionFlagsBits.Administrator,
    PermissionFlagsBits.ManageGuild,
    PermissionFlagsBits.ManageRoles,
    PermissionFlagsBits.BanMembers,
    PermissionFlagsBits.KickMembers,
    PermissionFlagsBits.ManageWebhooks,
    PermissionFlagsBits.ManageChannels,
];

function getDangerousPermNames(role) {
    const names = [];
    const map = {
        [PermissionFlagsBits.Administrator]: 'Administrator',
        [PermissionFlagsBits.ManageGuild]: 'Manage Server',
        [PermissionFlagsBits.ManageRoles]: 'Manage Roles',
        [PermissionFlagsBits.BanMembers]: 'Ban Members',
        [PermissionFlagsBits.KickMembers]: 'Kick Members',
        [PermissionFlagsBits.ManageWebhooks]: 'Manage Webhooks',
        [PermissionFlagsBits.ManageChannels]: 'Manage Channels',
    };
    for (const [flag, name] of Object.entries(map)) {
        if (role.permissions.has(BigInt(flag))) names.push(name);
    }
    return names;
}

function hasDangerousPerm(role) {
    return DANGEROUS_PERMS.some((p) => role.permissions.has(p));
}

module.exports = {
    name: 'autorole',
    aliases: ['ar'],
    category: 'moderation',
    premium: false,

    run: async (client, message, args) => {
        
        const isAdmin = message.member.permissions.has(PermissionFlagsBits.Administrator);
        const isExtraOwner = await client.util.isExtraOwner(message.author, message.guild);
        if (!isAdmin && !isExtraOwner) {
            return client.util.container(
                message,
                '# Access Denied\nOnly users with **Administrator** permissions or trusted **Extra Owners** can manage Auto Roles.',
            );
        }

        const prefix = message.guild.prefix || '&';
        const option = args[0]?.toLowerCase();

        
        if (!option || option === 'help') {
            return sendHelp(message, client, prefix);
        }

        
        if (option === 'set') {
            return startSetFlow(client, message);
        }

        
        if (option === 'reset' || option === 'clear') {
            await AutoRole.findByIdAndUpdate(
                message.guild.id,
                { $set: { roles: [], enabled: true } },
                { upsert: true },
            );
            return client.util.container(
                message,
                '# Auto Role Cleared\nAll saved auto roles have been removed.',
            );
        }

        
        if (option === 'list') {
            return sendList(client, message);
        }

        
        if (option === 'enable' || option === 'disable') {
            const enabled = option === 'enable';
            await AutoRole.findByIdAndUpdate(
                message.guild.id,
                { $set: { enabled } },
                { upsert: true },
            );
            return client.util.container(
                message,
                `# ${enabled ? 'Auto Role ' : 'Auto Role '} ${enabled ? 'Enabled' : 'Disabled'}\nNew members will ${enabled ? 'now' : 'no longer'} receive auto roles.`,
            );
        }

        return sendHelp(message, client, prefix);
    },
};

async function sendHelp(message, client, prefix) {
    const container = new ContainerBuilder();
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent('# Auto Role System'),
    );
    container.addSeparatorComponents(
        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
    );
    container.addSectionComponents(
        new SectionBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    [
                        `**Set Roles** -- \`${prefix}autorole set\``,
                        `-# Interactively choose roles to auto-assign on join`,
                        '',
                        `**List Roles** -- \`${prefix}autorole list\``,
                        `-# View currently configured auto roles`,
                        '',
                        `**Enable / Disable** -- \`${prefix}autorole enable|disable\``,
                        `-# Toggle the system on or off`,
                        '',
                        `**Clear** -- \`${prefix}autorole reset\``,
                        `-# Remove all saved auto roles`,
                    ].join('\n'),
                ),
            )
            .setThumbnailAccessory(
                new ThumbnailBuilder({ media: { url: client.user.displayAvatarURL() } }),
            ),
    );
    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            `-# Only Administrators and Extra Owners can use this command.`,
        ),
    );

    return message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
        allowedMentions: { repliedUser: false },
    });
}

async function sendList(client, message) {
    const data = await AutoRole.findById(message.guild.id).lean();
    const roles = data?.roles ?? [];

    const container = new ContainerBuilder();
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent('# Auto Role -- Current Config'),
    );
    container.addSeparatorComponents(
        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
    );

    if (roles.length === 0) {
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                '`No auto roles configured.`\nUse `autorole set` to get started.',
            ),
        );
    } else {
        const roleLines = roles
            .map((id, i) => {
                const role = message.guild.roles.cache.get(id);
                return role
                    ? `**${i + 1}.** ${role} \`(${id})\``
                    : `**${i + 1}.** ~~Unknown Role~~ \`(${id})\``;
            })
            .join('\n');

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(roleLines),
        );
    }

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            `-# Status: **${data?.enabled !== false ? 'Enabled ' : 'Disabled '}** -- Total: **${roles.length}** role(s)`,
        ),
    );

    return message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
        allowedMentions: { repliedUser: false },
    });
}

async function startSetFlow(client, message) {
    let selectedRoles = [];

    
    const buildPanel = (selected) => {
        const container = new ContainerBuilder();
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent('# Auto Role -- Setup'),
        );
        container.addSeparatorComponents(
            new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
        );
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                selected.length === 0
                    ? `-# No roles selected yet. Use the menu below to pick roles.`
                    : `-# **Selected Roles:**\n${selected
                        .map((id) => {
                            const r = message.guild.roles.cache.get(id);
                            return r ? `- ${r} \`(${id})\`` : `- \`${id}\``;
                        })
                        .join('\n')}`,
            ),
        );
        container.addSeparatorComponents(
            new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
        );
        container.addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new RoleSelectMenuBuilder()
                    .setCustomId('autorole_select')
                    .setPlaceholder('Choose up to 10 roles to auto-assign')
                    .setMinValues(1)
                    .setMaxValues(10),
            ),
        );
        container.addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('autorole_confirm')
                    .setLabel('Confirm')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(selected.length === 0),
                new ButtonBuilder()
                    .setCustomId('autorole_clear')
                    .setLabel('Clear Selection')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(selected.length === 0),
                new ButtonBuilder()
                    .setCustomId('autorole_cancel')
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Secondary),
            ),
        );
        return container;
    };

    const response = await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [buildPanel(selectedRoles)],
        allowedMentions: { repliedUser: false },
    });

    const collector = response.createMessageComponentCollector({
        filter: (i) => i.user.id === message.author.id,
        time: 120_000,
    });

    collector.on('collect', async (interaction) => {
        // Role select
        if (interaction.isRoleSelectMenu() && interaction.customId === 'autorole_select') {
            const chosen = interaction.roles;
            const rejected = [];
            const approved = [];

            for (const [id, role] of chosen) {
                if (hasDangerousPerm(role)) {
                    const perms = getDangerousPermNames(role);
                    rejected.push({ role, perms });
                } else {
                    approved.push(id);
                }
            }

            if (rejected.length > 0) {
                const rejectedText = rejected
                    .map((r) => `- **${r.role.name}** -- \`${r.perms.join(', ')}\``)
                    .join('\n');

                await interaction.reply({
                    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
                    components: [
                        new ContainerBuilder()
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `#  Dangerous Roles Rejected\n\nThe following role(s) were rejected because they contain sensitive permissions that cannot be auto-assigned:\n\n${rejectedText}\n\n-# Only safe roles have been kept from your selection.`,
                                ),
                            ),
                    ],
                });

                
                selectedRoles = [...new Set([...selectedRoles, ...approved])];
            } else {
                selectedRoles = [...new Set([...selectedRoles, ...approved])];
                await interaction.deferUpdate();
            }

            await response.edit({
                flags: MessageFlags.IsComponentsV2,
                components: [buildPanel(selectedRoles)],
            });
            return;
        }

        
        if (interaction.isButton() && interaction.customId === 'autorole_clear') {
            selectedRoles = [];
            await interaction.deferUpdate();
            await response.edit({
                flags: MessageFlags.IsComponentsV2,
                components: [buildPanel(selectedRoles)],
            });
            return;
        }

        
        if (interaction.isButton() && interaction.customId === 'autorole_cancel') {
            collector.stop('cancelled');
            const c = new ContainerBuilder().addTextDisplayComponents(
                new TextDisplayBuilder().setContent('# [X] Cancelled\nAuto Role setup was cancelled.'),
            );
            await interaction.deferUpdate();
            await response.edit({ flags: MessageFlags.IsComponentsV2, components: [c] });
            return;
        }

        
        if (interaction.isButton() && interaction.customId === 'autorole_confirm') {
            collector.stop('confirmed');

            
            const finalRoles = [];
            const lateRejected = [];

            for (const id of selectedRoles) {
                const role = message.guild.roles.cache.get(id) ||
                    (await message.guild.roles.fetch(id).catch(() => null));
                if (!role) continue;
                if (hasDangerousPerm(role)) {
                    lateRejected.push(role.name);
                } else {
                    finalRoles.push(id);
                }
            }

            await AutoRole.findByIdAndUpdate(
                message.guild.id,
                { $set: { roles: finalRoles, enabled: true } },
                { upsert: true },
            );

            const roleNames = finalRoles
                .map((id) => {
                    const r = message.guild.roles.cache.get(id);
                    return r ? `- ${r} \`(${id})\`` : `- \`${id}\``;
                })
                .join('\n');

            const confirm = new ContainerBuilder();
            confirm.addTextDisplayComponents(
                new TextDisplayBuilder().setContent('#  Auto Role Saved'),
            );
            confirm.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
            confirm.addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            finalRoles.length > 0
                                ? `**Roles that will be assigned on join:**\n${roleNames}`
                                : '`No safe roles were saved.`',
                        ),
                    )
                    .setThumbnailAccessory(
                        new ThumbnailBuilder({
                            media: {
                                url: message.author.displayAvatarURL({ extension: 'png' }),
                            },
                        }),
                    ),
            );
            if (lateRejected.length > 0) {
                confirm.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
                confirm.addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `-# ! Late-rejected dangerous roles: ${lateRejected.join(', ')}`,
                    ),
                );
            }

            await interaction.deferUpdate();
            await response.edit({ flags: MessageFlags.IsComponentsV2, components: [confirm] });
        }
    });

    collector.on('end', async (_, reason) => {
        if (reason === 'time') {
            const c = new ContainerBuilder().addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    '# ! Timed Out\nAuto Role setup expired. Run the command again.',
                ),
            );
            await response.edit({ flags: MessageFlags.IsComponentsV2, components: [c] }).catch(() => { });
        }
    });
}
