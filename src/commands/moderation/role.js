const { PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SectionBuilder } = require('discord.js');

module.exports = {
    name: 'role',
    category: 'mod',
    subcommand: ['all', 'humans', 'bots', 'removeall', 'removehumans', 'removebots', 'cancel', 'status'],
    premium: false,

    run: async (client, message, args) => {
        const own = message.author.id === message.guild.ownerId;
        const prefix = message.guild.prefix || '&';

        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
            return client.util.container(message, `✗ | You must have \`Manage Roles\` permissions to use this command.`);
        }

        if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
            return client.util.container(message, `✗ | I don't have \`Manage Roles\` permissions to execute this command.`);
        }

        if (!own && message.member.roles.highest.position <= message.guild.members.me.roles.highest.position) {
            return client.util.container(message, `✗ | You must have a higher role than me to use this command.`);
        }

        const option = args[0]?.toLowerCase();

        
        if (!option || (!['all', 'humans', 'bots', 'removeall', 'removehumans', 'removebots', 'cancel', 'status'].includes(option) && !message.mentions.members.first() && !message.guild.members.cache.get(args[0]))) {
            const container = new ContainerBuilder();
            container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`**Massrole Configuration**`));
            container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

            const helpLines = [
                `\`${prefix}role all <role>\` - Adds role to everyone.`,
                `\`${prefix}role humans <role>\` - Adds role to all humans.`,
                `\`${prefix}role bots <role>\` - Adds role to all bots.`,
                `\`${prefix}role removeall <role>\` - Removes role from everyone.`,
                `\`${prefix}role removehumans <role>\` - Removes role from all humans.`,
                `\`${prefix}role removebots <role>\` - Removes role from all bots.`,
                `\`${prefix}role status\` - Shows progress of ongoing task.`,
                `\`${prefix}role cancel\` - Cancels ongoing task.`,
                `\`${prefix}role <user> <role>\` - Toggles role for a user.`
            ];

            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(helpLines.join('\n'))
            );

            return message.reply({
                flags: 64,
                components: [container]
            });
        }

        
        const isMassAction = ['all', 'humans', 'bots', 'removeall', 'removehumans', 'removebots'].includes(option);

        if (isMassAction) {
            const isRemove = option.startsWith('remove');
            const targetType = option.replace('remove', ''); 
            const roleInput = args.slice(1).join(' ');

            if (!roleInput) {
                return client.util.container(message, `✗ | Please provide a role to ${isRemove ? 'remove' : 'add'}.`);
            }

            const roles = findMatchingRoles(message.guild, roleInput);
            if (roles.length === 0) {
                return client.util.container(message, `✗ | No matching roles found for: \`${roleInput}\``);
            }

            const roleToProcess = roles[0];

            if (roleToProcess.managed) {
                return client.util.container(message, `✗ | This role is managed by an integration and cannot be modified.`);
            }

            if (!roleToProcess.editable) {
                return client.util.container(message, `✗ | I cannot manage this role. Check my role hierarchy.`);
            }

            const dangerousPerms = [
                PermissionsBitField.Flags.Administrator,
                PermissionsBitField.Flags.ManageRoles,
                PermissionsBitField.Flags.ManageGuild,
                PermissionsBitField.Flags.ManageChannels,
                PermissionsBitField.Flags.BanMembers,
                PermissionsBitField.Flags.KickMembers,
                PermissionsBitField.Flags.MentionEveryone
            ];

            if (dangerousPerms.some(perm => roleToProcess.permissions.has(perm))) {
                return client.util.container(message, `✗ | Security Alert: This role has sensitive permissions and cannot be used for mass actions.`);
            }

            if (message.guild.roleAssignmentActive) {
                return client.util.container(message, `✗ | A role process is already running. Use \`${prefix}mr status\` or \`${prefix}mr cancel\`.`);
            }

            
            const fetchMsg = await client.util.container(message, `• Fetching server members... **0** members cached.`);

            const progressInterval = setInterval(async () => {
                await fetchMsg.edit(buildContainerPayload(`• Fetching server members... **${message.guild.members.cache.size}** members cached.`)).catch(() => { });
            }, 3000);

            
            const allMembers = await message.guild.members.fetch().catch(err => {
                console.error('Fetch error:', err);
                return null;
            });

            clearInterval(progressInterval);

            if (!allMembers) {
                return fetchMsg.edit(buildContainerPayload(`✗ | Failed to fetch members. Discord might be having issues.`));
            }

            const targetMembers = allMembers.filter(m => {
                const hasRole = m.roles.cache.has(roleToProcess.id);
                const matchesType = targetType === 'all' ||
                    (targetType === 'humans' && !m.user.bot) ||
                    (targetType === 'bots' && m.user.bot);

                return matchesType && (isRemove ? hasRole : !hasRole);
            });

            if (targetMembers.size === 0) {
                return fetchMsg.edit(buildContainerPayload(`ⓘ | No members found who need this role ${isRemove ? 'removed' : 'added'}.`));
            }

            
            const confirmRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('confirm_mass').setLabel('Confirm').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('cancel_mass').setLabel('Cancel').setStyle(ButtonStyle.Secondary)
            );

            const { MessageFlags } = require('discord.js');
            const confirmContainer = new ContainerBuilder();

            confirmContainer.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**Mass Role — Confirmation**`)
            );
            confirmContainer.addSeparatorComponents(
                new SeparatorBuilder().setDivider(true)
            );
            confirmContainer.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `**Action** : \`${isRemove ? 'REMOVE' : 'ADD'}\`\n` +
                    `**Role** : ${roleToProcess}\n` +
                    `**Target** : \`${targetType.charAt(0).toUpperCase() + targetType.slice(1)}\``
                )
            );
            confirmContainer.addSeparatorComponents(
                new SeparatorBuilder().setDivider(false)
            );
            confirmContainer.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `**Members Fetched** : \`${allMembers.size}\`\n` +
                    `**Affected Members** : \`${targetMembers.size}\`\n` +
                    `**Est. Duration** : \`~${Math.ceil(targetMembers.size * 1.5 / 60)} min\``
                )
            );
            confirmContainer.addSeparatorComponents(
                new SeparatorBuilder().setDivider(true)
            );
            confirmContainer.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`*Press Confirm to start or Cancel to abort.*`)
            );

            await fetchMsg.edit({
                flags: MessageFlags.IsComponentsV2,
                components: [confirmContainer, confirmRow]
            });

            const filter = i => i.user.id === message.author.id;
            const collector = fetchMsg.createMessageComponentCollector({ filter, time: 30000 });

            collector.on('collect', async i => {
                if (i.customId === 'confirm_mass') {
                    message.guild.roleAssignmentActive = true;
                    message.guild.roleTask = {
                        role: roleToProcess,
                        type: targetType,
                        action: isRemove ? 'remove' : 'add',
                        total: targetMembers.size,
                        processed: 0,
                        failed: 0,
                        startTime: Date.now()
                    };

                    
                    await i.update(buildContainerPayload(
                        `✓ | Mass role task started. Tracking progress below...`
                    ));

                    
                    const progressMsg = await message.channel.send(
                        buildProgressPayload(message.guild.roleTask)
                    );

                    const liveInterval = setInterval(async () => {
                        if (!message.guild.roleTask) {
                            clearInterval(liveInterval);
                            return;
                        }
                        await progressMsg.edit(
                            buildProgressPayload(message.guild.roleTask)
                        ).catch(() => { });
                    }, 5000);

                    let count = 0;
                    let failed = 0;

                    for (const [id, member] of targetMembers) {
                        if (!message.guild.roleAssignmentActive) break;

                        try {
                            if (isRemove) {
                                await member.roles.remove(roleToProcess.id, `Massrole Remove by ${message.author.tag}`);
                            } else {
                                await member.roles.add(roleToProcess.id, `Massrole Add by ${message.author.tag}`);
                            }
                            count++;
                        } catch (err) {
                            failed++;
                        }
                        message.guild.roleTask.processed = count;
                        message.guild.roleTask.failed = failed;
                        await client.util.sleep(1500);
                    }

                    clearInterval(liveInterval);
                    message.guild.roleAssignmentActive = false;

                    
                    const elapsed = Math.round((Date.now() - message.guild.roleTask.startTime) / 1000);
                    const { MessageFlags: MF, ContainerBuilder: CB, TextDisplayBuilder: TDB, SeparatorBuilder: SB } = require('discord.js');
                    const doneContainer = new CB();
                    doneContainer.addTextDisplayComponents(new TDB().setContent(`**Mass Role — Completed**`));
                    doneContainer.addSeparatorComponents(new SB().setDivider(true));
                    doneContainer.addTextDisplayComponents(
                        new TDB().setContent(
                            `**Action** : \`${isRemove ? 'REMOVE' : 'ADD'}\`\n` +
                            `**Role** : ${roleToProcess}\n` +
                            `**Successful** : \`${count}\`\n` +
                            `**Failed** : \`${failed}\`\n` +
                            `**Time Taken** : \`${elapsed}s\``
                        )
                    );
                    await progressMsg.edit({
                        flags: MF.IsComponentsV2,
                        components: [doneContainer]
                    }).catch(() => { });

                    message.guild.roleTask = null;

                } else {
                    await i.update(buildContainerPayload(`✗ | Action cancelled.`));
                }
                collector.stop();
            });

            collector.on('end', collected => {
                if (collected.size === 0) {
                    fetchMsg.edit(buildContainerPayload(`✗ | Confirmation timed out.`)).catch(() => { });
                }
            });

        } else if (option === 'status') {
            if (!message.guild.roleAssignmentActive || !message.guild.roleTask) {
                return client.util.container(message, `ⓘ | No active mass role task in this server.`);
            }

            const task = message.guild.roleTask;
            const percentage = ((task.processed / task.total) * 100).toFixed(1);
            const remaining = task.total - task.processed;
            const eta = Math.ceil((remaining * 1.5) / 60);

            const statusText = `**Massrole Progress**\n` +
                `Role: ${task.role}\n` +
                `Action: \`${task.action.toUpperCase()}\`\n` +
                `Progress: **${task.processed} / ${task.total}** (${percentage}%)\n` +
                `Estimated Time Remaining: **${eta} minute(s)**`;

            return client.util.container(message, statusText);

        } else if (option === 'cancel') {
            if (!message.guild.roleAssignmentActive) {
                return client.util.container(message, `✗ | No active task to cancel.`);
            }
            message.guild.roleAssignmentActive = false;
            return client.util.container(message, `✓ | Stopping the current task. This may take a few seconds to fully stop.`);

        } else {
            let member = message.mentions.members.first() || await message.guild.members.fetch(args[0]).catch(() => null);

            if (!member) {
                return client.util.container(message, `✗ | Invalid member provided.\nUsage: \`${prefix}mr <user> <role>\``);
            }

            const roleInput = args.slice(1).join(' ');
            if (!roleInput) {
                return client.util.container(message, `✗ | Please provide a role to toggle.`);
            }

            const roles = findMatchingRoles(message.guild, roleInput);
            if (roles.length === 0) {
                return client.util.container(message, `✗ | No matching roles found.`);
            }

            const role = roles[0];

            if (role.managed) return client.util.container(message, `✗ | Managed roles cannot be assigned.`);
            if (!role.editable) return client.util.container(message, `✗ | I don't have permission to manage this role.`);
            if (!own && message.member.roles.highest.position <= role.position) {
                return client.util.container(message, `✗ | This role is above your hierarchy.`);
            }

            try {
                if (member.roles.cache.has(role.id)) {
                    await member.roles.remove(role.id, `Role removed by ${message.author.tag}`);
                    return client.util.container(message, `✓ | Removed ${role} from ${member.user.tag}`);
                } else {
                    await member.roles.add(role.id, `Role added by ${message.author.tag}`);
                    return client.util.container(message, `✓ | Added ${role} to ${member.user.tag}`);
                }
            } catch (err) {
                return client.util.container(message, `✗ | Error: ${err.message}`);
            }
        }
    }
};

function buildContainerPayload(text, extraComponents = []) {
    const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
    const container = new ContainerBuilder();
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
    return {
        flags: MessageFlags.IsComponentsV2,
        components: [container, ...extraComponents]
    };
}

function buildProgressPayload(task) {
    const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
    const processed = task.processed || 0;
    const failed = task.failed || 0;
    const total = task.total;
    const percentage = total > 0 ? ((processed / total) * 100).toFixed(1) : '0.0';
    const remaining = total - processed;
    const elapsed = Math.round((Date.now() - task.startTime) / 1000);
    const eta = remaining > 0 ? Math.ceil((remaining * 1.5) / 60) : 0;
    const filled = Math.round((processed / total) * 20);
    const bar = `${'█'.repeat(filled)}${'░'.repeat(20 - filled)}`;

    const container = new ContainerBuilder();
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**Mass Role — In Progress**`)
    );
    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            `**Action** : \`${task.action.toUpperCase()}\`\n` +
            `**Target** : \`${task.type.charAt(0).toUpperCase() + task.type.slice(1)}\``
        )
    );
    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            `\`${bar}\` **${percentage}%**\n` +
            `**Done** : \`${processed} / ${total}\`  •  **Failed** : \`${failed}\`\n` +
            `**Elapsed** : \`${elapsed}s\`  •  **ETA** : \`~${eta} min\``
        )
    );
    container.addSeparatorComponents(new SeparatorBuilder().setDivider(false));
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`-# Updates every 5 seconds`)
    );

    return {
        flags: MessageFlags.IsComponentsV2,
        components: [container]
    };
}

function findMatchingRoles(guild, query) {
    if (!guild || !query) return [];
    const idMatch = query.match(/(\d{17,20})/);
    if (idMatch) {
        const role = guild.roles.cache.get(idMatch[1]);
        if (role) return [role];
    }

    const lowerQuery = query.toLowerCase();
    const roles = guild.roles.cache;

    const exact = roles.find(r => r.name.toLowerCase() === lowerQuery);
    if (exact) return [exact];

    const startsWith = roles.filter(r => r.name.toLowerCase().startsWith(lowerQuery));
    if (startsWith.size > 0) return Array.from(startsWith.values());

    const includes = roles.filter(r => r.name.toLowerCase().includes(lowerQuery));
    return Array.from(includes.values());
}
