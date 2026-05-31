"use strict";

const { AuditLogEvent } = require("discord.js");
const AntiNukeMemory = require("../core/antinukeMemory");
const resolveAudit = require("../core/resolveAuditAdvanced");

const wlkey = "member_kick";

module.exports = (client) => {
  client.on("guildMemberRemove", async (member) => {
    const g = AntiNukeMemory.get(member.guild.id);
    if (!g?.enabled) return;

    try {
      const result = await resolveAudit(
        member.guild,
        AuditLogEvent.MemberKick,
        member.id,
      );
      if (!result) return;

      const { executorId, executor, victim } = result;

      if (!executorId) return;
      if (executorId === client.user.id) return;
      if (executorId === member.guild.ownerId || g.extraOwners?.has(executorId))
        return;
      console.log(result);
      client.sntl.trackViolation(member.guild, g, "kick");

      if (await client.sntl.isTrusted(member.guild, g, executorId, wlkey))
        return;

      await client.sntl.AntinukePunish(
        member.guild,
        g,
        executorId,
        `Kicked ${victim?.tag ?? member.user.tag} (${member.id})`,
      );
      await client.logSendHandler.send(member.guild, g, {
        executorId,
        actionType: "kick",
        reason: `Kicked ${victim?.tag ?? member.user.tag} (${member.user.id})`,
        targetDetails: member.user.id,
      });
    } catch (err) {
      client.logger.error(`[ANTINUKE] Error in antiKick: ${err}`, err);
    }
  });
};
