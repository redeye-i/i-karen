"use strict";

const { AuditLogEvent } = require("discord.js");
const AntiNukeMemory = require("../core/antinukeMemory");
const resolveAudit = require("../core/resolveAuditAdvanced");

const wlkey = "member_ban";

module.exports = (client) => {
  client.on("guildBanAdd", async (ban) => {
    const g = AntiNukeMemory.get(ban.guild.id);
    if (!g?.enabled) return;

    try {
      const result = await resolveAudit(
        ban.guild,
        AuditLogEvent.MemberBanAdd,
        ban.user.id,
      );

      if (!result) return;

      const { executorId, executor, victim } = result;

      if (!executorId) return;
      if (executorId === client.user.id) return;
      if (executorId === ban.guild.ownerId || g.extraOwners?.has(executorId))
        return;

      if (await client.sntl.isTrusted(ban.guild, g, executorId, wlkey)) return;

      client.sntl.trackViolation(ban.guild, g, "ban");
      await client.sntl.AntinukePunish(
        ban.guild,
        g,
        executorId,
        `Banned ${victim?.tag ?? ban.user.tag} (${ban.user.id})`,
      );
      await client.logSendHandler.send(ban.guild, g, {
        executorId,
        actionType: "ban",
        reason: `Banned ${victim?.tag ?? ban.user.tag} (${ban.user.id})`,
        targetDetails: ban.user.id,
      });
    } catch (err) {
      client.logger.error(`[ANTINUKE] Error in antiBan: ${err}`, err);
    }
  });
};
