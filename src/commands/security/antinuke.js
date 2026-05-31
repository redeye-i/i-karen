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
            new ButtonBuilder().setCustomId("confirm-button").setLabel("Save").setStyle(ButtonStyle.Primary),
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
