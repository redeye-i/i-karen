"use strict";

const { AuditLogEvent, UserFlagsBitField } = require("discord.js");
const AntiNukeMemory = require("../core/antinukeMemory");
const resolveAudit = require("../core/resolveAuditAdvanced");

const wlkey = "bot_add";

module.exports = (client) => {
  client.on("guildMemberAdd", async (member) => {
    if (!member.user.bot) return;

    const g = AntiNukeMemory.get(member.guild.id);
    if (!g?.enabled) return;

    try {
      const result = await resolveAudit(
        member.guild,
        AuditLogEvent.BotAdd,
        member.id,
      );

      if (!result) return;

      const { executorId, executor, victim } = result;

      if (!executorId) return;
      if (executorId === member.guild.ownerId) return;

      const botMember = await member.guild.members
        .fetch(member.id)
        .catch(() => null);
      if (!botMember) return;

      const isVerified = botMember.user.flags?.has(
        UserFlagsBitField.Flags.VerifiedBot,
      );
      if (!isVerified) {
        await botMember
          .ban({ reason: "Anti-Nuke: Unverified bot added" })
          .catch(() => {});
        await client.sntl.AntinukePunish(
          member.guild,
          g,
          executorId,
          `Bot Add ${victim?.tag ?? member.user.tag} (${member.id})`,
        );
        return;
      }
      client.sntl.trackViolation(member.guild, g, "botadd");
      if (await client.sntl.isTrusted(member.guild, g, executorId, wlkey)) return;

      await botMember
        .ban({ reason: "Anti-Nuke: Unauthorized bot addition" })
        .catch(() => {});

      await client.sntl.AntinukePunish(
        member.guild,
        g,
        executorId,
        `Bot Add ${victim?.tag ?? member.user.tag} (${member.id})`,
      );
    } catch (err) {
      client.logger.error(`[ANTINUKE] Error in antiBotAdd: ${err}`, err);
    }
  });
};
