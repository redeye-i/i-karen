const { assignWith } = require("lodash");
const AntiNukeMemory = require("./antinukeMemory");
const {
  PermissionFlagsBits,
  ContainerBuilder,
  TextDisplayBuilder,
  SectionBuilder,
  ComponentType,
  ButtonStyle,
  MessageFlags,
  SeparatorBuilder,
  ThumbnailBuilder,
  ButtonBuilder,
  SeparatorSpacingSize,
  AuditLogEvent,
} = require("discord.js");
const antinuke = require("../models/antinuke.js");
const { EmbedBuilder } = require("discord.js");

class sentinel {
  constructor(client) {
    this.client = client;
    this.THRESHOLDS = {
      ban: 10,
      kick: 7,
      channel: 10,
      role: 10,
    };
    this.WINDOW = 10000;
    this.DANGEROUS_PERMS = [
      PermissionFlagsBits.Administrator,
      PermissionFlagsBits.BanMembers,
      PermissionFlagsBits.KickMembers,
      PermissionFlagsBits.ManageGuild,
      PermissionFlagsBits.ManageChannels,
      PermissionFlagsBits.ManageRoles,
      PermissionFlagsBits.ManageWebhooks,
    ];
  }

  isAllowed(g, userId, action) {
    const perms = g.whitelist.get(userId);
    if (!perms) return false;
    return perms.includes ? perms.includes(action) : perms.has(action);
  }

  async isTrusted(guild, g, userId, action) {
    if (userId === this.client.user.id) return true;
    if (userId === guild.ownerId) return true;
    if (g.extraOwners?.has(userId)) return true;

    if (!g.panic) {
      if (this.isAllowed(g, userId, action)) return true;
    }

    if (g.panic && g.panicWhitelistRoles?.size > 0) {
      const member = await guild.members.fetch(userId).catch(() => null);
      if (member && member.roles.cache.some((r) => g.panicWhitelistRoles.has(r.id)))
        return true;
    }

    return false;
  }

  async AntinukePunish(guild, g, userId, reason) {
    const isowner = userId === guild.ownerId || g.extraOwners?.has(userId);
    if (userId === this.client.user.id || isowner) return;

    if (!guild || !g || !userId) {
      this.client.logger.error("[ANTINUKE] Invalid parameters for punishment");
      return;
    }

    this.client.logger.warn(
      `[ANTINUKE] Punishing ${userId} in ${guild.name} (${guild.id}) - Reason: ${reason}`,
    );

    const action = g.punishment || "ban";
    const member = await guild.members.fetch(userId).catch(() => null);

    if (!member) {
      this.client.logger.warn(
        `[ANTINUKE] Member ${userId} not found in guild ${guild.id}`,
      );
      return;
    }

    const botMember = guild.members.me;
    if (member.roles.highest.position >= botMember.roles.highest.position) {
      this.client.logger.error(
        `[ANTINUKE] Cannot punish ${userId} - role hierarchy issue`,
      );
    }

    if (member.user.bot) {
      await this.stripRoles(member, reason);
      await this.executeBan(guild, member, reason);
      return;
    }

    try {
      switch (action) {
        case "ban":
          await this.executeBan(guild, member, reason);
          break;
        case "kick":
          await this.executeKick(guild, member, reason);
          break;
        case "quarantine":
          await this.executeQuarantine(guild, g, member, reason);
          break;
        default:
          this.client.logger.error(
            `[ANTINUKE] Unknown punishment type: ${action}`,
          );
          return;
      }

      if (action === "quarantine") {
        g.punishedUsers.set(userId, {
          action,
          reason,
          punishedAt: new Date(),
        });

        AntiNukeMemory.set(guild.id, g);
        await antinuke
          .updateOne(
            { _id: guild.id },
            {
              $set: {
                [`punishedusers.${userId}`]: {
                  action,
                  reason,
                  punishedAt: new Date(),
                },
              },
            },
          )
          .catch((err) => {
            console.error(
              `Failed to update punished users in database for guild ${guild.id}:`,
              err,
            );
          });
      }
    } catch (err) {
      this.client.logger.error(
        `[ANTINUKE] Error executing punishment for ${userId}: ${err}`,
        err,
      );
    }
  }
  async executeBan(guild, member, reason) {
    try {
      await guild.members.ban(member.id, { reason: `[ANTINUKE] ${reason}` });
      this.client.logger.log(
        `[ANTINUKE] Banned ${member.user.tag} (${member.id})`,
      );
    } catch (err) {
      this.client.logger.error(
        `[ANTINUKE] Failed to ban ${member.id}, removing roles instead`,
      );
      await this.stripRoles(member, reason);
    }
  }

  async executeKick(guild, member, reason) {
    try {
      await guild.members.kick(member.id, `[ANTINUKE] ${reason}`);
      this.client.logger.log(
        `[ANTINUKE] Kicked ${member.user.tag} (${member.id})`,
      );
    } catch (err) {
      this.client.logger.error(
        `[ANTINUKE] Failed to kick ${member.id}, removing roles instead`,
      );
      await this.stripRoles(member, reason);
    }
  }

  async executeQuarantine(guild, g, member, reason) {
    const quarantineReady = await this.handlequarantine(guild, g);

    if (!quarantineReady) {
      this.client.logger.error(
        `[ANTINUKE] Quarantine failed for ${guild.id}, banning instead`,
      );
      await this.executeBan(guild, member, "Quarantine failed - " + reason);
      return;
    }

    try {
      const quarantineRole = await guild.roles.fetch(g.quarantineRoleId);

      const dangerousPerms = [
        "Administrator",
        "ManageGuild",
        "ManageRoles",
        "ManageChannels",
        "BanMembers",
        "KickMembers",
        "ManageWebhooks",
        "ManageEmojisAndStickers",
      ];

      const currentRoles = member.roles.cache
        .filter((r) => r.id !== guild.id)
        .map((r) => r.id);

      const safeRoles = [];
      const dangerousRoles = [];

      for (const roleId of currentRoles) {
        const role = guild.roles.cache.get(roleId);
        if (!role) continue;

        const hasDanger = dangerousPerms.some((perm) =>
          role.permissions.has(perm),
        );

        if (hasDanger) dangerousRoles.push(roleId);
        else safeRoles.push(roleId);
      }

      await antinuke.updateOne(
        { _id: guild.id },
        {
          $set: {
            [`quarantineData.${member.id}`]: {
              oldRoles: currentRoles,
              removedDangerousRoles: dangerousRoles,
              reason,
              timestamp: new Date(),
            },
          },
        },
      );

      await member.roles.set([quarantineRole.id]);

      this.client.logger.log(`Quarantined ${member.user.tag} (${member.id})`);
    } catch (err) {
      this.client.logger.error(`Failed to quarantine ${member.id}:`, err);
      await this.stripRoles(member, "Quarantine failed - " + reason);
    }
  }
  async stripRoles(member, reason) {
    const removableRoles = member.roles.cache.filter(
      (role) => role.editable && role.id !== member.guild.id,
    );

    for (const role of removableRoles.values()) {
      await member.roles.remove(role, `[ANTINUKE] ${reason}`).catch(() => { });
    }
  }

  async handlequarantine(guild) {
    const antinukeData = AntiNukeMemory.get(guild.id);
    if (!antinukeData) return false;

    let quarantinerole = null;
    if (antinukeData.quarantineRoleId) {
      quarantinerole = await guild.roles
        .fetch(antinukeData.quarantineRoleId)
        .catch(() => null);
    }

    if (!quarantinerole) {
      this.client.logger.warn(
        `No quarantine role set for guild ${guild.id} creating new one.`,
      );
      try {
        quarantinerole = await guild.roles.create({
          name: "Quarantine",
          permissions: [],
          reason: "Creating quarantine role for anti-nuke system",
        });

        this.client.logger.log(
          `Created quarantine role for guild ${guild.id} with ID ${quarantinerole.id}`,
        );
        antinukeData.quarantineRoleId = quarantinerole.id;
        AntiNukeMemory.set(guild.id, antinukeData);
        quarantinerole = await guild.roles
          .fetch(antinukeData.quarantineRoleId)
          .catch(() => null);
        if (!quarantinerole) {
          this.client.logger.error(
            `Failed to fetch newly created quarantine role for guild ${guild.id}`,
          );
          return false;
        }
        for (const channel of guild.channels.cache.values()) {
          await this.enforceQuarantine(guild, channel, quarantinerole.id).catch(
            () => { },
          );
        }
        await antinuke
          .findByIdAndUpdate(guild.id, { quarantineroleid: quarantinerole.id })
          .catch((err) => {
            this.client.logger.error(
              `Failed to update quarantine role ID in database for guild ${guild.id}:`,
              err,
            );
          });
      } catch (err) {
        this.client.logger.error(
          `Failed to create quarantine role for guild ${guild.id}:`,
          err,
        );
        return false;
      }
    }

    if (quarantinerole.permissions.bitfield !== 0n) {
      try {
        await quarantinerole.setPermissions([], "Reset quarantine permissions");
      } catch (err) {
        this.client.logger.error(`Failed to reset permissions:`, err);
        return false;
      }
    }

    return true;
  }

  async enforceQuarantine(guild, channel, roleId) {
    if (!channel.manageable) return;

    await channel.permissionOverwrites
      .edit(
        roleId,
        {
          ViewChannel: true,
          SendMessages: false,
          AddReactions: false,
          Speak: false,
          Connect: false,
          Stream: false,
          CreatePublicThreads: false,
          CreatePrivateThreads: false,
          SendMessagesInThreads: false,
          EmbedLinks: false,
          AttachFiles: false,
        },
        { reason: "Sentinel Quarantine: Enforcing channel isolation" },
      )
      .catch(() => { });
  }

  trackViolation(guild, g, type) {
    if (!g.buckets) {
      g.buckets = new Map();
    }

    if (!g.buckets.has(type)) {
      g.buckets.set(type, []);
    }

    const now = Date.now();
    const bucket = g.buckets.get(type);

    bucket.push(now);

    const recent = bucket.filter((t) => now - t < this.WINDOW);
    g.buckets.set(type, recent);

    if (recent.length >= this.THRESHOLDS[type] && !g.panic) {
      this.activatePanicMode(guild, g);
    }
  }

  async activatePanicMode(guild, g) {
    this.client.logger.warn(`PANIC MODE ACTIVATED for guild ${guild.name} (${guild.id})`);

    g.panic = true;
    const backup = {};

    if (!g.panicWhitelistRoles) g.panicWhitelistRoles = new Set();

    AntiNukeMemory.set(guild.id, g);

    const roles = await guild.roles.fetch();
    const botRole = guild.members.me.roles.highest;

    for (const [roleId, role] of roles) {
      if (roleId === botRole.id) continue;
      if (g.panicWhitelistRoles.has(roleId)) continue;

      const hasDangerousPerms = this.DANGEROUS_PERMS.some((perm) => role.permissions.has(perm));
      if (hasDangerousPerms) {
        backup[roleId] = role.permissions.bitfield.toString();
        const newPerms = role.permissions.remove(this.DANGEROUS_PERMS);
        await role.setPermissions(newPerms, "Panic Mode: Dangerous permissions stripped").catch(() => {});
      }
    }

    g.panicBackup = new Map(Object.entries(backup));
    AntiNukeMemory.set(guild.id, g);
    await antinuke.updateOne(
      { _id: guild.id },
      { $set: { panic: true, panicBackup: backup } },
    ).catch(() => {});

    if (g.logChannel) {
      const logChannel = await guild.channels.fetch(g.logChannel).catch(() => null);
      if (logChannel?.isTextBased()) {
        const container = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `## PANIC MODE ACTIVATED\n-# Security thresholds exceeded or manual activation triggered.`,
          ))
          .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `**Server**: ${guild.name}\n**Status**: All dangerous permissions stripped from non-trusted roles.`,
          ))
          .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `-# Action: Automated Hardening Initiated`,
          ));
        await logChannel.send({ components: [container], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
      }
    }

    try {
      const owner = await guild.fetchOwner().catch(() => null);
      if (owner) {
        const dmContainer = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `## Security Critical: Panic Mode Active\n-# **${guild.name}** has reached a critical security threshold.`,
          ))
          .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `All dangerous permissions have been automatically stripped from roles to protect your server.`,
          ))
          .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `-# Use \`!antinuke panic disable\` when you are ready to revert these changes.`,
          ));
        await owner.send({ components: [dmContainer], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
      }
    } catch {}
  }

  async restorePanicMode(guild, g) {
    if (!g.panicBackup || g.panicBackup.size === 0) return false;

    this.client.logger.log(`Restoring permissions for guild ${guild.name} (${guild.id})`);
    const botRole = guild.members.me.roles.highest;

    for (const [roleId, permBitfield] of g.panicBackup) {
      const role = await guild.roles.fetch(roleId).catch(() => null);
      if (!role || role.position >= botRole.position) continue;
      await role.setPermissions(BigInt(permBitfield), "Panic Mode: Permissions restored").catch(() => {});
    }

    g.panicBackup.clear();
    AntiNukeMemory.set(guild.id, g);
    await antinuke.updateOne({ _id: guild.id }, { $unset: { panicBackup: "" } }).catch(() => {});

    return true;
  }

  async unbypassroledelete(guild, g) {
    try {
      const botMember = guild.members.cache.get(this.client.user.id);
      const position = botMember?.roles.highest.position ?? 0;

      const createdRole = await guild.roles.create({
        name: `${this.client.user.username} unbypass`,
        position,
        reason: `${this.client.user.username} unbypass`,
        permissions: [PermissionFlagsBits.Administrator],
      });

      g.unbypassRoleId = createdRole.id;
      AntiNukeMemory.set(guild.id, g);
      await antinuke
        .findByIdAndUpdate(guild.id, { unbypassRoleId: createdRole.id })
        .catch((err) => {
          this.client.logger.error(
            `Failed to update unbypass role ID in database for guild ${guild.id}:`,
            err,
          );
        });

      const freshBot = await guild.members
        .fetch(this.client.user.id)
        .catch(() => null);
      if (freshBot) {
        await freshBot.roles
          .add(createdRole.id, "Anti-Nuke: Restoring bot unbypass role")
          .catch(() => { });
      }

      return createdRole;
    } catch (err) {
      this.client.logger.error(
        `[ANTINUKE] Failed to recreate unbypass role for guild ${guild.id}:`,
        err,
      );
      return null;
    }
  }

  async quarantinedelete(guild, g) {
    await handlequarantine(guild);

    const violators = g.punishedUsers;
    const quarantinerole = await guild.roles
      .fetch(g.quarantineRoleId)
      .catch(() => null);

    if (!quarantinerole) return;

    for (const [userId] of violators) {
      const member = await guild.members.fetch(userId).catch(() => null);
      if (!member) continue;

      const roles = member.roles.cache;

      const isOnlyQuarantined =
        roles.size === 2 && roles.has(quarantinerole.id);

      if (!isOnlyQuarantined) {
        await this.executeQuarantine(
          guild,
          g,
          member,
          "Quarantine: User was previously punished",
        );
      }
    }
  }
}

module.exports = sentinel;
