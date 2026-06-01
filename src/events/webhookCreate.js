"use strict";

const { AuditLogEvent } = require("discord.js");
const AntiNukeMemory = require("../core/antinukeMemory");
const resolveAudit = require("../core/resolveAuditAdvanced");

const wlkey = "webhook_create";

module.exports = (client) => {
  client.on("webhookCreate", async (webhook) => {
    if (!webhook.guildId) return;

    const guild = client.guilds.cache.get(webhook.guildId);
    if (!guild) return;

    const g = AntiNukeMemory.get(guild.id);
    if (!g?.enabled || g.modules?.antiwebhook === false) return;

    try {
      const result = await resolveAudit(
        guild,
        AuditLogEvent.WebhookCreate,
        webhook.id,
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

      if (await client.sntl.isTrusted(guild, g, executorId, wlkey)) return;

      await webhook
        .delete("Anti-Nuke: Unauthorized webhook creation")
        .catch(() => {});

      await client.sntl.AntinukePunish(
        guild,
        g,
        executorId,
        `Created Webhook "${webhook.name}" in <#${webhook.channelId}> (${webhook.id})`,
      );

      await client.logSendHandler.send(guild, g, {
        executorId,
        actionType: "webhook_create",
        reason: `Created Webhook "${webhook.name}" in <#${webhook.channelId}> (${webhook.id})`,
        targetDetails: webhook.id,
      });

      client.logger.warn(
        `[ANTINUKE] Unauthorized webhook create by ${executor?.tag ?? executorId} in ${guild.name}. Webhook: ${webhook.name}`,
      );
    } catch (err) {
      client.logger.error(`[ANTINUKE] Error in antiWebhookCreate: ${err}`, err);
    }
  });
};
