"use strict";

const { AuditLogEvent } = require("discord.js");
const AntiNukeMemory = require("../core/antinukeMemory");
const resolveAudit = require("../core/resolveAuditAdvanced");

const wlkey = "channel_update";

const DANGEROUS_PERMISSIONS = [
  "Administrator",
  "ManageGuild",
  "ManageRoles",
  "ManageChannels",
  "ManageWebhooks",
  "BanMembers",
  "KickMembers",
  "MentionEveryone",
];

module.exports = (client) => {
  client.on("channelUpdate", async (oldChannel, newChannel) => {
    if (!newChannel.guild) return;

    const g = AntiNukeMemory.get(newChannel.guild.id);
    if (!g?.enabled) return;

    try {
      const nameChanged = oldChannel.name !== newChannel.name;
      const topicChanged = oldChannel.topic !== newChannel.topic;
      const nsfw = !oldChannel.nsfw && newChannel.nsfw;
      const dangerousOverwrite = newChannel.permissionOverwrites?.cache.some(
        (overwrite) =>
          DANGEROUS_PERMISSIONS.some((perm) => overwrite.allow.has(perm)),
      );

      if (!nameChanged && !topicChanged && !nsfw && !dangerousOverwrite) return;

      const result = await resolveAudit(
        newChannel.guild,
        AuditLogEvent.ChannelUpdate,
        newChannel.id,
      );

      if (!result) return;

      const { executorId, executor } = result;

      if (!executorId) return;
      if (executorId === client.user.id) return;
      if (
        executorId === newChannel.guild.ownerId ||
        g.extraOwners?.has(executorId)
      )
        return;

      client.sntl.trackViolation(newChannel.guild, g, "channel");
      if (await client.sntl.isTrusted(newChannel.guild, g, executorId, wlkey))
        return;

      await newChannel
        .edit({
          name: oldChannel.name,
          topic: oldChannel.topic ?? null,
          nsfw: oldChannel.nsfw ?? false,
          permissionOverwrites:
            oldChannel.permissionOverwrites?.cache.map((o) => ({
              id: o.id,
              allow: o.allow,
              deny: o.deny,
              type: o.type,
            })) ?? [],
          reason: "Anti-Nuke: Reverting unauthorized channel update",
        })
        .catch(() => {});

      const changes = [
        nameChanged && `name: "${oldChannel.name}" → "${newChannel.name}"`,
        topicChanged && `topic changed`,
        nsfw && `nsfw enabled`,
        dangerousOverwrite && `dangerous permission overwrite added`,
      ]
        .filter(Boolean)
        .join(", ");
      await client.sntl.AntinukePunish(
        newChannel.guild,
        g,
        executorId,
        `Updated Channel #${newChannel.name} (${newChannel.id}) — ${changes}`,
      );
      await client.logSendHandler.send(newChannel.guild, g, {
        executorId,
        actionType: "channel_update",
        reason: `Updated Channel #${newChannel.name} (${newChannel.id}) — ${changes}`,
        targetDetails: newChannel.id,
      });

      if (g.quarantineRoleId) {
        await client.sntl
          .enforceQuarantine(newChannel.guild, newChannel, g.quarantineRoleId)
          .catch(() => {});
      }

      client.logger.warn(
        `[ANTINUKE] Unauthorized channel update by ${executor?.tag ?? executorId} in ${newChannel.guild.name}. Changes: ${changes}`,
      );
    } catch (err) {
      client.logger.error(`[ANTINUKE] Error in antiChannelUpdate: ${err}`, err);
    }
  });
};
