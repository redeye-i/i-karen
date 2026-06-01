const {
    PermissionFlagsBits,
    ContainerBuilder,
    TextDisplayBuilder,
    MessageFlags,
    MediaGalleryBuilder,
    SeparatorBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    SeparatorSpacingSize,
    ActionRowBuilder,
    ChannelSelectMenuBuilder,
    ChannelType,
    StringSelectMenuBuilder,
    UserSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require("discord.js");

const Antinuke = require("../../models/antinuke.js");
const { updateGuildAntiNuke } = require("../../core/loadAntiNuke");

const MODULE_DEFINITIONS = [
    { key: "antiban", label: "Ban Protection", description: "Punish unauthorized member bans" },
    { key: "antiunban", label: "Unban Protection", description: "Punish unauthorized member unbans" },
    { key: "antikick", label: "Kick Protection", description: "Punish unauthorized member kicks" },
    { key: "antibotadd", label: "Bot Add Protection", description: "Remove unauthorized bots" },
    { key: "antichannel", label: "Channel Protection", description: "Protect channel create, delete, and update" },
    { key: "antirole", label: "Role Protection", description: "Protect role create, delete, update, add, and remove" },
    { key: "antiwebhook", label: "Webhook Protection", description: "Protect webhook create and update" },
    { key: "antiserver", label: "Server Update Protection", description: "Protect guild setting updates" },
    { key: "antiemoji", label: "Emoji Protection", description: "Protect emoji create and delete" },
    { key: "antisticker", label: "Sticker Protection", description: "Protect sticker create and delete" },
    { key: "antiintegration", label: "Integration Protection", description: "Protect integration create and delete" },
    { key: "antithread", label: "Thread Protection", description: "Protect thread deletion" },
    { key: "antimention", label: "Mention Protection", description: "Protect everyone, here, and large role mentions" },
    { key: "antilink", label: "Linked Role Protection", description: "Strip dangerous permissions from linked roles" },
];

module.exports = {
    name: "antinuke",
    aliases: ["antiwizz", "an"],
    category: "security",
    run: async (client, message, args) => {
        const own = message.author.id === message.guild.ownerId;
        const check = await client.util.isExtraOwner(message.author, message.guild);

        if (!own && !check) {
            return client.util.container(
                message,
                "# Access Denied\n-# Only the server owner or an extra owner can run this command.",
            );
        }

        const prefix = message.guild.prefix || "&";
        const option = args[0]?.toLowerCase();
        const anti = await Antinuke.findById(message.guild.id).lean();
        const isEnabled = anti?.enabled === true;

        const botUser = await client.user.fetch();
        const bannerUrl =
            botUser.bannerURL({ size: 1024, forceStatic: false }) ||
            botUser.displayAvatarURL({ size: 1024 });

        switch (option) {
            case "enable": {
                if (isEnabled) {
                    return client.util.container(
                        message,
                        `# Already Enabled\n-# Antinuke is already active on **${message.guild.name}**.\n-# Use \`${prefix}antinuke disable\` to turn it off.`,
                    );
                }

                if (message.guild.roles.cache.size > 249) {
                    return client.util.container(
                        message,
                        `# Cannot Enable\n-# This server has 250 roles. Delete a role before enabling antinuke.`,
                    );
                }

                const botPos = message.guild.members.me.roles.highest.position;
                const unbypassRole = await message.guild.roles.create({
                    name: `${client.user.username} unbypass`,
                    position: botPos,
                    reason: `${client.user.username} antinuke unbypass role`,
                    permissions: [PermissionFlagsBits.Administrator],
                });

                await Antinuke.updateOne(
                    { _id: message.guild.id },
                    { $set: { enabled: true, unbypassRoleId: unbypassRole.id } },
                    { upsert: true },
                );
                await updateGuildAntiNuke(message.guild.id);
                await message.guild.members.me.roles.add(unbypassRole.id).catch(() => {});

                return client.util.container(
                    message,
                    `# Antinuke Enabled\n-# Protection is now active on **${message.guild.name}**.\n-# Use \`${prefix}antinuke config\` to configure settings.`,
                );
            }

            case "disable": {
                if (!isEnabled) {
                    return client.util.container(
                        message,
                        `# Not Enabled\n-# Antinuke is not active on **${message.guild.name}**.\n-# Use \`${prefix}antinuke enable\` to turn it on.`,
                    );
                }

                await Antinuke.updateOne(
                    { _id: message.guild.id },
                    { $set: { enabled: false } },
                    { upsert: true },
                );
                await updateGuildAntiNuke(message.guild.id);

                if (anti?.unbypassRoleId) {
                    const role = message.guild.roles.cache.get(anti.unbypassRoleId);
                    if (role) await role.delete("Antinuke disabled").catch(() => {});
                }

                return client.util.container(
                    message,
                    `# Antinuke Disabled\n-# Protection has been turned off for **${message.guild.name}**.`,
                );
            }

            case "config": {
                await configsetup(client, message, anti, prefix);
                break;
            }

            case "module":
            case "modules": {
                if (!isEnabled) {
                    return client.util.container(
                        message,
                        `# Not Enabled\n-# Antinuke is not active. Use \`${prefix}antinuke enable\` first.`,
                    );
                }

                await modulesPanel(client, message, anti, prefix);
                break;
            }

            case "status": {
                return antinukeStatus(client, message, anti);
            }

            case "repair": {
                if (!isEnabled) {
                    return client.util.container(message, `# Not Enabled\n-# Antinuke is not active. Use \`${prefix}antinuke enable\` first.`);
                }
                return antinukeRepair(client, message);
            }

            case "audit": {
                return antinukeAudit(client, message, args.slice(1));
            }

            case "logs":
            case "log":
            case "setlogchannel": {
                if (!isEnabled) {
                    return client.util.container(message, `# Not Enabled\n-# Antinuke is not active. Use \`${prefix}antinuke enable\` first.`);
                }
                return antinukeLogs(client, message, args.slice(1));
            }

            case "backup": {
                if (!isEnabled) {
                    return client.util.container(message, `# Not Enabled\n-# Antinuke is not active. Use \`${prefix}antinuke enable\` first.`);
                }
                return antinukeBackup(client, message);
            }

            case "restore": {
                if (!isEnabled) {
                    return client.util.container(message, `# Not Enabled\n-# Antinuke is not active. Use \`${prefix}antinuke enable\` first.`);
                }
                return antinukeRestore(client, message);
            }

            case "panic": {
                if (!isEnabled) {
                    return client.util.container(
                        message,
                        `# Not Enabled\n-# Antinuke is not active. Use \`${prefix}antinuke enable\` first.`,
                    );
                }

                const panicAction = args[1]?.toLowerCase();
                const AntiNukeMemory = require("../../core/antinukeMemory");
                const g = AntiNukeMemory.get(message.guild.id);

                if (panicAction === "enable") {
                    if (!own) return client.util.container(message, "# Access Denied\n-# Only the server owner can enable panic mode.");
                    if (!g) return client.util.container(message, "Antinuke data not found.");
                    await client.sntl.activatePanicMode(message.guild, g);
                    return client.util.container(message, `# Panic Mode Enabled\n-# All dangerous role permissions have been stripped.\n-# Use \`${prefix}antinuke panic disable\` to revert.`);
                }

                if (panicAction === "disable") {
                    if (!anti?.panic) return client.util.container(message, "Panic mode is not active.");
                    if (!g) return client.util.container(message, "Antinuke data not found.");
                    await Antinuke.updateOne({ _id: message.guild.id }, { $set: { panic: false } }, { upsert: true });
                    await updateGuildAntiNuke(message.guild.id);
                    const restored = await client.sntl.restorePanicMode(message.guild, g);
                    return client.util.container(message, restored ? `# Panic Mode Disabled\n-# All role permissions have been restored.` : `# Panic Mode Disabled\n-# No backup found to restore.`);
                }

                if (panicAction === "restore") {
                    if (!own) return client.util.container(message, "# Access Denied\n-# Only the server owner can restore permissions.");
                    if (!g) return client.util.container(message, "Antinuke data not found.");
                    const restored = await client.sntl.restorePanicMode(message.guild, g);
                    return client.util.container(message, restored ? `# Permissions Restored\n-# All role permissions have been restored.` : `No backup found or panic mode is not active.`);
                }

                if (panicAction === "whitelist") {
                    const roleId = args[2];
                    if (!roleId) return client.util.container(message, "Provide a role ID.\n\nUsage: `antinuke panic whitelist <roleId>`");
                    const role = await message.guild.roles.fetch(roleId).catch(() => null);
                    if (!role) return client.util.container(message, "Invalid role ID.");
                    await Antinuke.updateOne({ _id: message.guild.id }, { $addToSet: { panicWhitelistRoles: roleId } }, { upsert: true });
                    await updateGuildAntiNuke(message.guild.id);
                    return client.util.container(message, `# Role Whitelisted\n-# **${role.name}** will bypass panic mode.`);
                }

                if (panicAction === "unwhitelist" || panicAction === "whitelistremove") {
                    const roleId = args[2];
                    if (!roleId) return client.util.container(message, "Provide a role ID.\n\nUsage: `antinuke panic unwhitelist <roleId>`");
                    if (!g?.panicWhitelistRoles?.has(roleId)) return client.util.container(message, "That role is not whitelisted.");
                    await Antinuke.updateOne({ _id: message.guild.id }, { $pull: { panicWhitelistRoles: roleId } }, { upsert: true });
                    await updateGuildAntiNuke(message.guild.id);
                    const role = await message.guild.roles.fetch(roleId).catch(() => null);
                    return client.util.container(message, `# Role Removed\n-# **${role?.name ?? roleId}** removed from panic whitelist.`);
                }

                if (panicAction === "whitelisted") {
                    if (!g) return client.util.container(message, "Antinuke data not found.");
                    const roles = g.panicWhitelistRoles ?? new Set();
                    const roleList = roles.size
                        ? [...roles].map((id, i) => {
                            const r = message.guild.roles.cache.get(id);
                            return r ? `${i + 1}. **${r.name}** — ${r} | \`${r.id}\`` : `${i + 1}. Unknown Role — \`${id}\``;
                        }).join("\n")
                        : "`No whitelisted roles.`";
                    return message.reply({
                        flags: MessageFlags.IsComponentsV2,
                        components: [
                            new ContainerBuilder()
                                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## Panic Whitelist Roles`))
                                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large))
                                .addTextDisplayComponents(new TextDisplayBuilder().setContent(roleList))
                                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
                                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Total: **${roles.size}**`)),
                        ],
                    });
                }

                return client.util.container(
                    message,
                    `**Panic Mode Commands**\n\n` +
                    `\`${prefix}antinuke panic enable\` — Strip all dangerous permissions (Owner only)\n` +
                    `\`${prefix}antinuke panic disable\` — Disable and restore permissions\n` +
                    `\`${prefix}antinuke panic restore\` — Restore permissions only (Owner only)\n` +
                    `\`${prefix}antinuke panic whitelist <roleId>\` — Whitelist a role\n` +
                    `\`${prefix}antinuke panic unwhitelist <roleId>\` — Remove whitelist\n` +
                    `\`${prefix}antinuke panic whitelisted\` — List whitelisted roles`,
                );
            }

            default: {
                const container = new ContainerBuilder();

                container.addMediaGalleryComponents(
                    new MediaGalleryBuilder({ items: [{ media: { url: bannerUrl } }] }),
                );
                container.addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `# Security Center\n` +
                        `Automated server protection. Monitors and mitigates threats in real time.\n\n` +
                        `-# Status: ${isEnabled ? "**Active**" : "**Disabled**"}`,
                    ),
                );
                container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
                container.addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `### Commands\n` +
                                `\`${prefix}antinuke enable\` — Enable protection\n` +
                                `\`${prefix}antinuke disable\` — Disable protection\n` +
                                `\`${prefix}antinuke config\` — Configure settings\n` +
                                `\`${prefix}antinuke panic\` — Panic mode\n` +
                                `\`${prefix}extraowner\` — Manage extra owners\n` +
                                `\`${prefix}whitelist\` — Manage whitelist`,
                            ),
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder({
                                media: { url: message.author.displayAvatarURL({ extension: "png", size: 1024 }) },
                            }),
                        ),
                );

                await message.channel.send({
                    flags: MessageFlags.IsComponentsV2,
                    components: [container],
                    allowedMentions: { parse: [] },
                });
                return;
            }
        }
    },
};

async function configsetup(client, message, anti, prefix) {
    const configcon = new ContainerBuilder();

    configcon.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# Antinuke Config — ${message.guild.name}`),
    );
    configcon.addSeparatorComponents(
        new SeparatorBuilder({ spacing: SeparatorSpacingSize.Large, divider: true }),
    );
    configcon.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            `**Punishment**\n-# Select what happens to violators`,
        ),
    );
    configcon.addActionRowComponents(
        new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId("punishment-id")
                .setPlaceholder("Select punishment")
                .setOptions(
                    { label: "Ban", value: "ban" },
                    { label: "Kick", value: "kick" },
                    { label: "Quarantine", value: "quarantine" },
                )
                .setMaxValues(1),
        ),
    );
    configcon.addSeparatorComponents(
        new SeparatorBuilder({ spacing: SeparatorSpacingSize.Small, divider: true }),
    );
    configcon.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            `**Log Channel**\n-# Where antinuke alerts are sent`,
        ),
    );
    configcon.addActionRowComponents(
        new ActionRowBuilder().addComponents(
            new ChannelSelectMenuBuilder()
                .setCustomId("channel-id0log")
                .setPlaceholder("Select log channel")
                .setChannelTypes(ChannelType.GuildText),
        ),
    );
    configcon.addSeparatorComponents(
        new SeparatorBuilder({ spacing: SeparatorSpacingSize.Small, divider: true }),
    );
    configcon.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            `**Extra Owners**\n-# Trusted users who bypass antinuke checks`,
        ),
    );
    configcon.addActionRowComponents(
        new ActionRowBuilder().addComponents(
            new UserSelectMenuBuilder()
                .setCustomId("user-select")
                .setPlaceholder("Select extra owners")
                .setMaxValues(3),
        ),
    );
    configcon.addSeparatorComponents(
        new SeparatorBuilder({ spacing: SeparatorSpacingSize.Small, divider: true }),
    );
    configcon.addActionRowComponents(
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("confirm-button").setLabel("Save").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("cancel-button").setLabel("Cancel").setStyle(ButtonStyle.Secondary),
        ),
    );

    const response = await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [configcon],
        allowedMentions: { repliedUser: true },
    });

    let punishment = anti?.punishment || "ban";
    let logChannel = null;
    let extraOwners = null;

    const collector = response.createMessageComponentCollector({
        filter: (i) => {
            if (i.user.id !== message.author.id) {
                i.reply({ content: "This config panel is not for you.", flags: MessageFlags.Ephemeral });
                return false;
            }
            return true;
        },
        time: 120_000,
    });

    collector.on("collect", async (i) => {
        if (i.isStringSelectMenu() && i.customId === "punishment-id") {
            punishment = i.values[0];
            await i.deferUpdate();
        } else if (i.isChannelSelectMenu() && i.customId === "channel-id0log") {
            logChannel = i.values[0];
            await i.deferUpdate();
        } else if (i.isUserSelectMenu() && i.customId === "user-select") {
            extraOwners = i.values;
            await i.deferUpdate();
        } else if (i.isButton() && i.customId === "confirm-button") {
            collector.stop("saved");

            const updateData = { punishment };
            if (logChannel) updateData.logChannel = logChannel;
            if (extraOwners !== null) updateData.extraowner = extraOwners;

            await Antinuke.updateOne(
                { _id: message.guild.id },
                { $set: updateData },
                { upsert: true },
            );
            await updateGuildAntiNuke(message.guild.id);

            const avatarUrl = message.author.displayAvatarURL({ extension: "png" });
            const saved = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`# Config Saved`),
                )
                .addSeparatorComponents(new SeparatorBuilder({ spacing: SeparatorSpacingSize.Small, divider: true }))
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `-# **Punishment**: ${punishment}\n` +
                                `-# **Log Channel**: ${logChannel ? `<#${logChannel}>` : "Not changed"}\n` +
                                `-# **Extra Owners**: ${extraOwners?.map((id) => `<@${id}>`).join(", ") ?? "Not changed"}`,
                            ),
                        )
                        .setThumbnailAccessory(new ThumbnailBuilder({ media: { url: avatarUrl } })),
                );

            await response.edit({
                flags: MessageFlags.IsComponentsV2,
                components: [saved],
                allowedMentions: { repliedUser: true },
            });
        } else if (i.isButton() && i.customId === "cancel-button") {
            collector.stop("cancelled");
            await response.edit({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().addTextDisplayComponents(
                        new TextDisplayBuilder().setContent("Configuration cancelled."),
                    ),
                ],
            });
        }
    });

    collector.on("end", async (_, reason) => {
        if (reason === "time") {
            await response.edit({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().addTextDisplayComponents(
                        new TextDisplayBuilder().setContent("Config panel timed out."),
                    ),
                ],
            }).catch(() => {});
        }
    });
}

function defaultModuleState() {
    return Object.fromEntries(MODULE_DEFINITIONS.map((module) => [module.key, true]));
}

function readModuleState(anti) {
    const saved = anti?.enabledmodules || {};
    const state = defaultModuleState();

    for (const module of MODULE_DEFINITIONS) {
        if (typeof saved[module.key] === "boolean") state[module.key] = saved[module.key];
    }

    return state;
}

function summarizeModules(state) {
    return MODULE_DEFINITIONS.map((module) => {
        const status = state[module.key] ? "Enabled" : "Disabled";
        return `- **${module.label}**: ${status}`;
    }).join("\n");
}

function buildModulesContainer(prefix, state, token, mode = "panel") {
    const enabledCount = MODULE_DEFINITIONS.filter((module) => state[module.key]).length;
    const container = new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `# Antinuke Modules\n` +
                `-# Select modules to keep enabled. Changes are saved only after confirmation.\n\n` +
                `Enabled: **${enabledCount}/${MODULE_DEFINITIONS.length}**\n` +
                `Command: \`${prefix}antinuke modules\``,
            ),
        )
        .addSeparatorComponents(new SeparatorBuilder({ spacing: SeparatorSpacingSize.Small, divider: true }))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(summarizeModules(state)))
        .addSeparatorComponents(new SeparatorBuilder({ spacing: SeparatorSpacingSize.Small, divider: true }));

    if (mode === "confirm") {
        container
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `## Confirm Module Changes\n-# Review the selected state, then save or cancel.`,
                ),
            )
            .addActionRowComponents(
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`antinuke-modules-confirm:${token}`)
                        .setLabel("Confirm")
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId(`antinuke-modules-cancel:${token}`)
                        .setLabel("Cancel")
                        .setStyle(ButtonStyle.Secondary),
                ),
            );

        return container;
    }

    container
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId(`antinuke-modules-select:${token}`)
                    .setPlaceholder("Select enabled modules")
                    .setMinValues(0)
                    .setMaxValues(MODULE_DEFINITIONS.length)
                    .setOptions(
                        MODULE_DEFINITIONS.map((module) => ({
                            label: module.label,
                            description: module.description,
                            value: module.key,
                            default: state[module.key],
                        })),
                    ),
            ),
        )
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`antinuke-modules-enable-all:${token}`)
                    .setLabel("Enable All")
                    .setStyle(ButtonStyle.Secondary),
            ),
        );

    return container;
}

async function modulesPanel(client, message, anti, prefix) {
    const token = `${message.id}-${Date.now()}`;
    let proposedState = readModuleState(anti);

    const response = await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [buildModulesContainer(prefix, proposedState, token)],
        allowedMentions: { repliedUser: true },
    });

    const collector = response.createMessageComponentCollector({
        filter: async (i) => {
            if (!i.customId.endsWith(`:${token}`)) return false;
            if (i.user.id !== message.author.id) {
                await i.reply({
                    content: "This module panel is not for you.",
                    flags: MessageFlags.Ephemeral,
                }).catch(() => {});
                return false;
            }
            return true;
        },
        time: 120_000,
    });

    collector.on("collect", async (i) => {
        if (i.isStringSelectMenu() && i.customId.startsWith("antinuke-modules-select:")) {
            const selected = new Set(i.values);
            proposedState = Object.fromEntries(
                MODULE_DEFINITIONS.map((module) => [module.key, selected.has(module.key)]),
            );

            await i.update({
                flags: MessageFlags.IsComponentsV2,
                components: [buildModulesContainer(prefix, proposedState, token, "confirm")],
            });
            return;
        }

        if (i.isButton() && i.customId.startsWith("antinuke-modules-enable-all:")) {
            proposedState = defaultModuleState();
            await i.update({
                flags: MessageFlags.IsComponentsV2,
                components: [buildModulesContainer(prefix, proposedState, token, "confirm")],
            });
            return;
        }

        if (i.isButton() && i.customId.startsWith("antinuke-modules-cancel:")) {
            await i.update({
                flags: MessageFlags.IsComponentsV2,
                components: [buildModulesContainer(prefix, proposedState, token)],
            });
            return;
        }

        if (i.isButton() && i.customId.startsWith("antinuke-modules-confirm:")) {
            collector.stop("saved");

            await Antinuke.updateOne(
                { _id: message.guild.id },
                { $set: { enabledmodules: proposedState } },
                { upsert: true },
            );
            await updateGuildAntiNuke(message.guild.id);

            const saved = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `# Modules Saved\n` +
                        `-# Antinuke module settings were saved and the guild cache was reloaded.`,
                    ),
                )
                .addSeparatorComponents(new SeparatorBuilder({ spacing: SeparatorSpacingSize.Small, divider: true }))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(summarizeModules(proposedState)));

            await i.update({
                flags: MessageFlags.IsComponentsV2,
                components: [saved],
            });
        }
    });

    collector.on("end", async (_, reason) => {
        if (reason !== "time") return;

        await response.edit({
            flags: MessageFlags.IsComponentsV2,
            components: [
                new ContainerBuilder().addTextDisplayComponents(
                    new TextDisplayBuilder().setContent("Module panel timed out."),
                ),
            ],
        }).catch(() => {});
    });
}

function antinukeMemory() {
    return require("../../core/antinukeMemory");
}

function chunkText(text, limit = 3500) {
    if (text.length <= limit) return text;
    return `${text.slice(0, limit - 40)}\n-# Output trimmed.`;
}

function roleLabel(guild, roleId) {
    const role = roleId ? guild.roles.cache.get(roleId) : null;
    return role ? `${role} | \`${role.id}\`` : roleId ? `Missing | \`${roleId}\`` : "Not set";
}

async function antinukeStatus(client, message, anti) {
    const AntiNukeMemory = antinukeMemory();
    const g = AntiNukeMemory.get(message.guild.id);
    const state = g?.modules || readModuleState(anti);
    const moduleLines = MODULE_DEFINITIONS
        .map((module) => `- **${module.label}**: ${state[module.key] === false ? "Disabled" : "Enabled"}`)
        .join("\n");

    const text =
        `# Antinuke Status\n` +
        `**Enabled**: ${anti?.enabled ? "Yes" : "No"}\n` +
        `**Punishment**: ${anti?.punishment || g?.punishment || "ban"}\n` +
        `**Log Channel**: ${anti?.logChannel ? `<#${anti.logChannel}>` : g?.logChannel ? `<#${g.logChannel}>` : "Not set"}\n` +
        `**Unbypass Role**: ${roleLabel(message.guild, anti?.unbypassRoleId || g?.unbypassRoleId)}\n` +
        `**Quarantine Role**: ${roleLabel(message.guild, anti?.quarantineroleid || g?.quarantineRoleId)}\n` +
        `**Panic Mode**: ${anti?.panic || g?.panic ? "Active" : "Inactive"}\n` +
        `**Whitelist Entries**: ${g?.whitelist?.size ?? Object.keys(anti?.whitelist || {}).length}\n` +
        `**Extra Owners**: ${g?.extraOwners?.size ?? anti?.extraowner?.length ?? 0}\n` +
        `**Protected Roles**: ${g?.protectedRoles?.size ?? anti?.protectedRoles?.length ?? 0}\n\n` +
        `## Modules\n${moduleLines}`;

    return client.util.container(message, chunkText(text));
}

async function antinukeRepair(client, message) {
    const AntiNukeMemory = antinukeMemory();
    let g = AntiNukeMemory.get(message.guild.id);
    if (!g) {
        await updateGuildAntiNuke(message.guild.id);
        g = AntiNukeMemory.get(message.guild.id);
    }
    if (!g) return client.util.container(message, "# Repair Failed\n-# Antinuke cache could not be loaded.");

    const actions = [];
    const unbypassRole = g.unbypassRoleId ? await message.guild.roles.fetch(g.unbypassRoleId).catch(() => null) : null;
    if (!unbypassRole) {
        const role = await client.sntl.unbypassroledelete(message.guild, g);
        actions.push(role ? `- Recreated unbypass role: ${role}` : "- Failed to recreate unbypass role");
    } else {
        actions.push("- Unbypass role exists");
        if (!message.guild.members.me.roles.cache.has(unbypassRole.id)) {
            await message.guild.members.me.roles.add(unbypassRole.id, "Anti-Nuke repair").catch(() => null);
            actions.push("- Reattached unbypass role to bot");
        }
    }

    const quarantineReady = await client.sntl.handlequarantine(message.guild);
    actions.push(quarantineReady ? "- Quarantine role exists and overwrites were checked" : "- Failed to repair quarantine role");

    await updateGuildAntiNuke(message.guild.id);
    actions.push("- Guild antinuke cache reloaded");

    return client.util.container(message, `# Antinuke Repair\n${actions.join("\n")}`);
}

async function antinukeAudit(client, message, args) {
    const userId = message.mentions.users.first()?.id || args[0]?.replace(/[<@!>]/g, "");
    if (!userId) return client.util.container(message, `# Antinuke Audit\n-# Usage: \`${message.guild.prefix || "&"}antinuke audit @user\``);

    const member = await message.guild.members.fetch(userId).catch(() => null);
    if (!member) return client.util.container(message, "# User Not Found\n-# Provide a valid server member.");

    const g = antinukeMemory().get(message.guild.id);
    const dangerousRoles = member.roles.cache
        .filter((role) => role.id !== message.guild.id && role.permissions.has(PermissionFlagsBits.Administrator))
        .map((role) => `${role} | \`${role.id}\``);
    const lines = [
        `# Antinuke Audit`,
        `**User**: ${member.user.tag} | \`${member.id}\``,
        `**Server Owner**: ${member.id === message.guild.ownerId ? "Yes" : "No"}`,
        `**Extra Owner**: ${g?.extraOwners?.has(member.id) ? "Yes" : "No"}`,
        `**Whitelisted**: ${g?.whitelist?.has(member.id) ? "Yes" : "No"}`,
        `**Panic Role Bypass**: ${g?.panicWhitelistRoles && member.roles.cache.some((role) => g.panicWhitelistRoles.has(role.id)) ? "Yes" : "No"}`,
        `**Can Administrator**: ${member.permissions.has(PermissionFlagsBits.Administrator) ? "Yes" : "No"}`,
        "",
        `## Administrator Roles`,
        dangerousRoles.length ? dangerousRoles.join("\n") : "None",
    ];

    return client.util.container(message, chunkText(lines.join("\n")));
}

async function antinukeLogs(client, message, args) {
    if (!message.mentions.channels.first() && !args[0]) {
        return client.util.container(message, `# Invalid Channel\n-# Usage: \`${message.guild.prefix || "&"}antinuke logs #channel\``);
    }

    const channel =
        message.mentions.channels.first() ||
        message.guild.channels.cache.get(args[0]) ||
        (await message.guild.channels.fetch(args[0]).catch(() => null));

    if (!channel?.isTextBased()) {
        return client.util.container(message, `# Invalid Channel\n-# Usage: \`${message.guild.prefix || "&"}antinuke logs #channel\``);
    }

    await Antinuke.updateOne(
        { _id: message.guild.id },
        { $set: { logChannel: channel.id } },
        { upsert: true },
    );
    await updateGuildAntiNuke(message.guild.id);

    return client.util.container(message, `# Log Channel Updated\n-# Antinuke logs will be sent to ${channel}.`);
}

function serializeOverwrites(channel) {
    if (!channel.permissionOverwrites?.cache) return [];
    return channel.permissionOverwrites.cache.map((overwrite) => ({
        id: overwrite.id,
        type: overwrite.type,
        allow: overwrite.allow.bitfield.toString(),
        deny: overwrite.deny.bitfield.toString(),
    }));
}

async function antinukeBackup(client, message) {
    const roles = message.guild.roles.cache
        .filter((role) => role.id !== message.guild.id)
        .map((role) => ({
            id: role.id,
            name: role.name,
            permissions: role.permissions.bitfield.toString(),
            color: role.color,
            hoist: role.hoist,
            mentionable: role.mentionable,
            position: role.rawPosition,
        }));

    const channels = message.guild.channels.cache.map((channel) => ({
        id: channel.id,
        name: channel.name,
        type: channel.type,
        parentId: channel.parentId,
        rawPosition: channel.rawPosition,
        permissionOverwrites: serializeOverwrites(channel),
    }));

    const backup = {
        createdAt: new Date().toISOString(),
        createdBy: message.author.id,
        roles,
        channels,
    };

    await Antinuke.updateOne(
        { _id: message.guild.id },
        { $set: { securityBackup: backup } },
        { upsert: true },
    );
    await updateGuildAntiNuke(message.guild.id);

    return client.util.container(message, `# Backup Saved\n-# Stored **${roles.length}** roles and **${channels.length}** channels.`);
}

async function antinukeRestore(client, message) {
    const anti = await Antinuke.findById(message.guild.id).lean();
    const backup = anti?.securityBackup;
    if (!backup) return client.util.container(message, "# No Backup\n-# Run `antinuke backup` before restoring.");

    let restoredRoles = 0;
    let restoredChannels = 0;
    const botRole = message.guild.members.me.roles.highest;

    for (const savedRole of backup.roles || []) {
        const role = await message.guild.roles.fetch(savedRole.id).catch(() => null);
        if (!role || role.position >= botRole.position) continue;

        await role.setPermissions(BigInt(savedRole.permissions), "Anti-Nuke backup restore").catch(() => null);
        await role.setMentionable(savedRole.mentionable, "Anti-Nuke backup restore").catch(() => null);
        await role.setHoist(savedRole.hoist, "Anti-Nuke backup restore").catch(() => null);
        restoredRoles++;
    }

    for (const savedChannel of backup.channels || []) {
        const channel = await message.guild.channels.fetch(savedChannel.id).catch(() => null);
        if (!channel?.permissionOverwrites) continue;

        const overwrites = (savedChannel.permissionOverwrites || []).map((overwrite) => ({
            id: overwrite.id,
            type: overwrite.type,
            allow: BigInt(overwrite.allow),
            deny: BigInt(overwrite.deny),
        }));

        await channel.permissionOverwrites.set(overwrites, "Anti-Nuke backup restore").catch(() => null);
        restoredChannels++;
    }

    await updateGuildAntiNuke(message.guild.id);
    return client.util.container(message, `# Backup Restored\n-# Restored **${restoredRoles}** roles and **${restoredChannels}** channel overwrite sets.`);
}
