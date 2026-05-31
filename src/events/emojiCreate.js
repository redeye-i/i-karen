"use strict";

const { AuditLogEvent } = require("discord.js");
const AntiNukeMemory = require("../core/antinukeMemory");
const resolveAudit = require("../core/resolveAuditAdvanced");

const wlkey = "emoji_create";

module.exports = (client) => {
  client.on("emojiCreate", async (emoji) => {
    const g = AntiNukeMemory.get(emoji.guild.id);
    if (!g?.enabled) return;

    try {
      const result = await resolveAudit(
        emoji.guild,
        AuditLogEvent.EmojiCreate,
        emoji.id,
      );

      if (!result) return;

      const { executorId, executor } = result;

      if (!executorId) return;
      if (executorId === client.user.id) return;
      if (executorId === emoji.guild.ownerId || g.extraOwners?.has(executorId))
        return;

      if (await client.sntl.isTrusted(emoji.guild, g, executorId, wlkey))
        return;

      await emoji
        .delete("Anti-Nuke: Unauthorized emoji creation")
        .catch(() => {});

      await client.sntl.AntinukePunish(
        emoji.guild,
        g,
        executorId,
        `Created Emoji :${emoji.name}: (${emoji.id})`,
      );
    } catch (err) {
      client.logger.error(`[ANTINUKE] Error in antiEmojiCreate: ${err}`, err);
    }
  });
};
