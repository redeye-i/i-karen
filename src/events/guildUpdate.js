"use strict";

const { AuditLogEvent } = require("discord.js");
const AntiNukeMemory = require("../core/antinukeMemory");
const resolveAudit = require("../core/resolveAuditAdvanced");

const wlkey = "guild_update";

const SENSITIVE_FIELDS = [
  "name",
  "icon",
  "splash",
  "discoverySplash",
  "banner",
  "verificationLevel",
  "explicitContentFilter",
  "systemChannelId",
  "rulesChannelId",
  "publicUpdatesChannelId",
  "mfaLevel",
  "vanityURLCode",
];

module.exports = (client) => {
  client.on("guildUpdate", async (oldGuild, newGuild) => {
    const g = AntiNukeMemory.get(newGuild.id);
    if (!g?.enabled || g.modules?.antiserver === false) return;

    try {
      const changedFields = SENSITIVE_FIELDS.filter(
        (field) => oldGuild[field] !== newGuild[field],
      );

      if (!changedFields.length) return;

      const result = await resolveAudit(
        newGuild,
        AuditLogEvent.GuildUpdate,
        newGuild.id,
        {
          ttl: 15_000,
          retryDelayMs: 1500,
          allowDeepScan: true,
        },
      );

      if (!result) return;

      const { executorId, executor } = result;

      if (!executorId) return;
      if (executorId === client.user.id) return;
      if (executorId === newGuild.ownerId || g.extraOwners?.has(executorId))
        return;

      if (await client.sntl.isTrusted(newGuild, g, executorId, wlkey)) return;

      const revertData = {};
      for (const field of changedFields) {
        revertData[field] = oldGuild[field] ?? null;
      }

      await newGuild
        .edit(revertData, "Anti-Nuke: Reverting unauthorized guild update")
        .catch(() => {});
      await client.sntl.AntinukePunish(
        newGuild,
        g,
        executorId,
        `Updated Guild Settings — changed: ${changedFields.join(", ")}`,
      );
      await client.logSendHandler.send(newGuild, g, {
        executorId,
        actionType: "guild_update",
        reason: `Updated Guild Settings — changed: ${changedFields.join(", ")}`,
        targetDetails: newGuild.id,
      });

      client.logger.warn(
        `[ANTINUKE] Unauthorized guild update by ${executor?.tag ?? executorId} in ${newGuild.name}. Changed: ${changedFields.join(", ")}`,
      );
    } catch (err) {
      client.logger.error(`[ANTINUKE] Error in antiGuildUpdate: ${err}`, err);
    }
  });
};
