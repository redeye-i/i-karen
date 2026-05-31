"use strict";

const { AuditLogEvent } = require("discord.js");
const AntiNukeMemory = require("../core/antinukeMemory");
const resolveAudit = require("../core/resolveAuditAdvanced");

const wlkey = "member_unban";

module.exports = (client) => {
  client.on("guildBanRemove", async (ban) => {
    const g = AntiNukeMemory.get(ban.guild.id);
    if (!g?.enabled) return;

    try {
      const result = await resolveAudit(
        ban.guild,
        AuditLogEvent.MemberBanRemove,
        ban.user.id,
      );

      if (!result) return;

      const { executorId, executor } = result;

      if (!executorId) return;
      if (executorId === client.user.id) return;
      if (executorId === ban.guild.ownerId || g.extraOwners?.has(executorId))
        client.sntl.trackViolation(ban.guild, g, "unban");
      if (await client.sntl.isTrusted(ban.guild, g, executorId, wlkey)) return;

      await ban.guild.members
        .ban(ban.user.id, {
          reason: "Anti-Nuke: Re-banning unauthorizedly unbanned user",
        })
        .catch(() => {});
      await client.sntl.AntinukePunish(
        ban.guild,
        g,
        executorId,
        `Unbanned ${ban.user.tag} (${ban.user.id}) — user re-banned`,
      );
      await client.logSendHandler.send(ban.guild, g, {
        executorId,
        actionType: "unban",
        reason: `Unbanned ${ban.user.tag} (${ban.user.id}) — user re-banned`,
        targetDetails: ban.user.id,
      });
    } catch (err) {
      client.logger.error(`[ANTINUKE] Error in antiUnban: ${err}`, err);
    }
  });
};
