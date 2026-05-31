"use strict";

const { AuditLogEvent } = require("discord.js");
const AntiNukeMemory = require("../core/antinukeMemory");
const resolveAudit = require("../core/resolveAuditAdvanced");

const wlkey = "sticker_delete";

module.exports = (client) => {
  client.on("stickerDelete", async (sticker) => {
    const g = AntiNukeMemory.get(sticker.guildId);
    if (!g?.enabled) return;

    const guild = sticker.guild ?? client.guilds.cache.get(sticker.guildId);
    if (!guild) return;

    try {
      const result = await resolveAudit(
        guild,
        AuditLogEvent.StickerDelete,
        sticker.id,
      );

      if (!result) return;

      const { executorId, executor } = result;

      if (!executorId) return;
      if (executorId === client.user.id) return;

      if (await client.sntl.isTrusted(sticker.guild, g, executorId, wlkey))
        return;

      await client.sntl.AntinukePunish(
        guild,
        g,
        executorId,
        `Deleted Sticker "${sticker.name}" (${sticker.id})`,
      );
      client.logger.warn(
        `[ANTINUKE] Unauthorized sticker delete by ${executor?.tag ?? executorId} in ${guild.name}.`,
      );
    } catch (err) {
      client.logger.error(`[ANTINUKE] Error in antiStickerDelete: ${err}`, err);
    }
  });
};
