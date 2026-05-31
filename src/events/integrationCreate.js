"use strict";

const { AuditLogEvent } = require("discord.js");
const AntiNukeMemory = require("../core/antinukeMemory");
const resolveAudit = require("../core/resolveAuditAdvanced");

const wlkey = "integration_create";

module.exports = (client) => {
  client.on("guildIntegrationCreate", async (integration) => {
    const guild =
      integration.guild ?? client.guilds.cache.get(integration.guildId);
    if (!guild) return;

    const g = AntiNukeMemory.get(guild.id);
    if (!g?.enabled) return;

    try {
      const result = await resolveAudit(
        guild,
        AuditLogEvent.IntegrationCreate,
        integration.id,
      );

      if (!result) return;

      const { executorId, executor } = result;

      if (!executorId) return;
      if (executorId === client.user.id) return;
      if (executorId === guild.ownerId || g.extraOwners?.has(executorId))
        return;

      if (await client.sntl.isTrusted(guild, g, executorId, wlkey)) return;

      await integration
        .delete("Anti-Nuke: Unauthorized integration added")
        .catch(() => {});
      await client.sntl.AntinukePunish(
        guild,
        g,
        executorId,
        `Added Integration "${integration.name}" type: ${integration.type} (${integration.id})`,
      );
      await client.logSendHandler.send(guild, g, {
        executorId,
        actionType: "integration_create",
        reason: `Added Integration "${integration.name}" type: ${integration.type} (${integration.id})`,
        targetDetails: integration.id,
      });

      client.logger.warn(
        `[ANTINUKE] Unauthorized integration create by ${executor?.tag ?? executorId} in ${guild.name}. Integration: ${integration.name}`,
      );
    } catch (err) {
      client.logger.error(
        `[ANTINUKE] Error in antiIntegrationCreate: ${err}`,
        err,
      );
    }
  });
};
