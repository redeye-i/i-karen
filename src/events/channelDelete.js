"use strict";

const { AuditLogEvent } = require("discord.js");
const AntiNukeMemory = require("../core/antinukeMemory");
const resolveAudit = require("../core/resolveAuditAdvanced");

const wlkey = "channel_delete";

module.exports = (client) => {
  client.on("channelDelete", async (channel) => {
    if (!channel.guild) return;

    const g = AntiNukeMemory.get(channel.guild.id);
    if (!g?.enabled || g.modules?.antichannel === false) return;

    try {
      const result = await resolveAudit(
        channel.guild,
        AuditLogEvent.ChannelDelete,
        channel.id,
      );

      if (!result) return;

      const { executorId, executor } = result;

      if (!executorId) return;
      if (executorId === client.user.id) return;
      if (
        executorId === channel.guild.ownerId ||
        g.extraOwners?.has(executorId)
      )
        return;

      client.sntl.trackViolation(channel.guild, g, "channel");

      if (await client.sntl.isTrusted(channel.guild, g, executorId, wlkey))
        return;

      const recreated = await channel.guild.channels
        .create({
          name: channel.name,
          type: channel.type,
          topic: channel.topic ?? undefined,
          nsfw: channel.nsfw ?? false,
          bitrate: channel.bitrate ?? undefined,
          userLimit: channel.userLimit ?? undefined,
          parent: channel.parentId ?? undefined,
          permissionOverwrites:
            channel.permissionOverwrites?.cache.map((o) => ({
              id: o.id,
              allow: o.allow,
              deny: o.deny,
              type: o.type,
            })) ?? [],
          position: channel.rawPosition ?? undefined,
          reason:
            "Anti-Nuke: Sentinal Recovery — unauthorized channel deletion",
        })
        .catch(() => null);
      await client.sntl.AntinukePunish(
        channel.guild,
        g,
        executorId,
        `Channel Deletion attempt detected. Sentinal recovery triggered.`,
      );
      await client.logSendHandler.send(channel.guild, g, {
        executorId,
        actionType: "channel_delete",
        reason: `Sentinal Recovery: ${recreated ? "Restored" : "Failed to restore"} deleted channel #${channel.name}`,
        targetDetails: channel.id,
      });
    } catch (err) {
      client.logger.error(`[ANTINUKE] Error in antiChannelDelete: ${err}`, err);
    }
  });
};
