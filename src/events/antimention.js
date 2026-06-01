"use strict";

const { AuditLogEvent } = require("discord.js");
const AntiNukeMemory = require("../core/antinukeMemory");
const resolveAudit = require("../core/resolveAuditAdvanced");

const wlkey = "role_mention";

const ROLE_MEMBER_THRESHOLD = 10;

const PUNISH_COOLDOWN_MS = 8_000;

const recentlyPunished = new Map();

setInterval(() => {
  const cutoff = Date.now() - PUNISH_COOLDOWN_MS;
  for (const [k, t] of recentlyPunished) {
    if (t < cutoff) recentlyPunished.delete(k);
  }
}, 30_000).unref?.();

async function handleAntinukeMention(client, message) {
  if (!message.guild) return;
  if (!message.mentions.everyone && message.mentions.roles.size === 0) return;

  const g = AntiNukeMemory.get(message.guild.id);
  if (!g?.enabled || g.modules?.antimention === false) return;

  _handleMention(client, message, g).catch((err) =>
    client.logger.error(`[ANTINUKE] Error in antiMention: ${err}`, err),
  );
}

async function _handleMention(client, message, g) {
  const mentionsEveryone = message.mentions.everyone;
  let dangerousRoles = null;
  if (message.mentions.roles.size > 0) {
    dangerousRoles = message.mentions.roles.filter(
      (role) =>
        role.id !== message.guild.id &&
        (role.members?.size ?? 0) >= ROLE_MEMBER_THRESHOLD,
    );
  }

  const hasDangerousRoleMention = dangerousRoles?.size > 0;

  if (!mentionsEveryone && !hasDangerousRoleMention) return;

  let executorId = null;
  let webhookObj = null;

  if (message.webhookId) {
    webhookObj = await message.fetchWebhook().catch(() => null);

    if (webhookObj) {
      const result = await resolveAudit(
        message.guild,
        AuditLogEvent.WebhookCreate,
        webhookObj.id,
        { allowRetry: false, allowDeepScan: false },
      );
      executorId = result?.executorId ?? webhookObj.owner?.id ?? null;
    }
  } else {
    executorId = message.author?.id ?? null;
  }

  if (!executorId) return;
  if (executorId === client.user.id) return;
  if (executorId === message.guild.ownerId || g.extraOwners?.has(executorId))
    return;
  client.sntl.trackViolation(message.guild, g, "mention");
  if (await client.sntl.isTrusted(message.guild, g, executorId, wlkey)) return;

  const cooldownKey = `${message.guild.id}:${executorId}`;

  const lastPunish = recentlyPunished.get(cooldownKey) ?? 0;
  if (Date.now() - lastPunish < PUNISH_COOLDOWN_MS) {
    await message.delete().catch(() => {});
    return;
  }
  recentlyPunished.set(cooldownKey, Date.now());

  await message.delete().catch(() => {});

  if (webhookObj) {
    await webhookObj
      .delete("Anti-Nuke: Webhook used for mass mention")
      .catch(() => {});
  }

  const parts = [];
  if (mentionsEveryone) parts.push("@everyone / @here");
  if (hasDangerousRoleMention)
    parts.push(
      dangerousRoles
        .map((r) => `@${r.name} (${r.members?.size} members)`)
        .join(", "),
    );
  const reason = `Mass Mention: ${parts.join(" | ")} in <#${message.channelId}>`;
  await client.sntl.AntinukePunish(message.guild, g, executorId, reason);
  await client.logSendHandler.send(message.guild, g, {
    executorId,
    actionType: "mention",
    reason: `Mass Mention: ${parts.join(" | ")} in <#${message.channelId}>`,
    targetDetails: message.id,
  });

  client.logger.warn(
    `[ANTINUKE] Mass mention by ${executorId}${webhookObj ? " (webhook)" : ""} ` +
      `in ${message.guild.name} — ${reason}`,
  );
}

module.exports = (client) => {};
module.exports.handleAntinukeMention = handleAntinukeMention;
