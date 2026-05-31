"use strict";

const { AuditLogEvent } = require("discord.js");
const AntiNukeMemory = require("../core/antinukeMemory");
const resolveAudit = require("../core/resolveAuditAdvanced");

const wlkey = "webhook_update";

module.exports = (client) => {
  client.on("webhooksUpdate", async (webhook) => {
    if (!webhook.guildId) return;

    const guild = client.guilds.cache.get(webhook.guildId);
    if (!guild) return;

    const g = AntiNukeMemory.get(guild.id);
    if (!g?.enabled) return;

    try {
      const result = await resolveAudit(
        guild,
        AuditLogEvent.WebhooksUpdate,
        webhook.id,
      );

      if (!result) return;

      const { executorId, executor } = result;

      if (!executorId) return;
      if (executorId === client.user.id) return;
      if (executorId === webhook.guild.ownerId) return;

      client.sntl.trackViolation(guild, g, "webhook");

      if (await client.sntl.isTrusted(guild, g, executorId, wlkey)) return;

      await client.sntl.AntinukePunish(
        guild,
        g,
        executorId,
        `Updated Webhook "${webhook.name}" in <#${webhook.channelId}> (${webhook.id})`,
      );
      client.logger.warn(
        `[ANTINUKE] Unauthorized webhook update by ${executor?.tag ?? executorId} in ${guild.name}. Webhook: ${webhook.name}`,
      );
    } catch (err) {
      client.logger.error(`[ANTINUKE] Error in antiWebhookUpdate: ${err}`, err);
    }
  });
};
