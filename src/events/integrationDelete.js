"use strict";

const { AuditLogEvent } = require("discord.js");
const AntiNukeMemory = require("../core/antinukeMemory");
const resolveAudit = require("../core/resolveAuditAdvanced");

const wlkey = "integration_delete";

module.exports = (client) => {
  client.on("guildIntegrationDelete", async (integration) => {
    const guild =
      integration.guild ?? client.guilds.cache.get(integration.guildId);
    if (!guild) return;

    const g = AntiNukeMemory.get(guild.id);
    if (!g?.enabled || g.modules?.antiintegration === false) return;

    try {
      const result = await resolveAudit(
        guild,
        AuditLogEvent.IntegrationDelete,
        integration.id,
      );

      if (!result) return;

      const { executorId, executor } = result;

      if (!executorId) return;
      if (executorId === client.user.id) return;
      if (executorId === guild.ownerId || g.extraOwners?.has(executorId))
        return;

      if (await client.sntl.isTrusted(guild, g, executorId, wlkey)) return;

      await client.sntl.AntinukePunish(
        guild,
        g,
        executorId,
        `Deleted Integration "${integration.name}" type: ${integration.type} (${integration.id})`,
      );
      client.logger.warn(
        `[ANTINUKE] Unauthorized integration delete by ${executor?.tag ?? executorId} in ${guild.name}. Integration: ${integration.name}`,
      );
    } catch (err) {
      client.logger.error(
        `[ANTINUKE] Error in antiIntegrationDelete: ${err}`,
        err,
      );
    }
  });
};
