"use strict";

const { AuditLogEvent } = require("discord.js");
const AntiNukeMemory = require("../core/antinukeMemory");
const resolveAudit = require("../core/resolveAuditAdvanced");

const wlkey = "channel_create";

module.exports = (client) => {
  client.on("channelCreate", async (channel) => {
    if (!channel.guild) return;

    const g = AntiNukeMemory.get(channel.guild.id);
    if (!g?.enabled || !g.modules?.antichannel) return;

    try {
      const result = await resolveAudit(
        channel.guild,
        AuditLogEvent.ChannelCreate,
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
      if (client.sntl.isTrusted(channel.guild, g, executorId, wlkey)) return;
      await client.sntl
        .enforceQuarantine(channel.guild, channel, g.quarantineRoleId)
        .catch(() => {});
      await channel
        .delete("Anti-Nuke: Unauthorized channel creation")
        .catch(() => {});
      await client.sntl.AntinukePunish(
        channel.guild,
        g,
        executorId,
        `Created Channel #${channel.name} (${channel.id})`,
      );
      await client.logSendHandler.send(channel.guild, g, {
        executorId,
        actionType: "channel_create",
        reason: `Created Channel #${channel.name} (${channel.id})`,
        targetDetails: channel.id,
      });
    } catch (err) {
      client.logger.error(`[ANTINUKE] Error in antiChannelCreate: ${err}`, err);
    }
  });
};
