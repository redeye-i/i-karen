"use strict";

const { AuditLogEvent } = require("discord.js");
const AntiNukeMemory = require("../core/antinukeMemory");
const resolveAudit = require("../core/resolveAuditAdvanced");

const wlkey = "emoji_delete";

module.exports = (client) => {
  client.on("emojiDelete", async (emoji) => {
    const g = AntiNukeMemory.get(emoji.guild.id);
    if (!g?.enabled) return;

    try {
      const result = await resolveAudit(
        emoji.guild,
        AuditLogEvent.EmojiDelete,
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

      const recovered = await emoji.guild.emojis
        .create({
          attachment: emoji.imageURL(),
          name: emoji.name,
          reason: "Anti-Nuke: Recovery — unauthorized emoji deletion",
        })
        .catch(() => null);

      await client.sntl.AntinukePunish(
        emoji.guild,
        g,
        executorId,
        `Deleted Emoji :${emoji.name}: (${emoji.id})${recovered ? " — emoji recovered" : " — recovery failed"}`,
      );
    } catch (err) {
      client.logger.error(`[ANTINUKE] Error in antiEmojiDelete: ${err}`, err);
    }
  });
};
