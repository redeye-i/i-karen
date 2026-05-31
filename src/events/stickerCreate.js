"use strict";

const { AuditLogEvent } = require("discord.js");
const AntiNukeMemory = require("../core/antinukeMemory");
const resolveAudit = require("../core/resolveAuditAdvanced");

const wlkey = "sticker_create";

module.exports = (client) => {
  client.on("stickerCreate", async (sticker) => {
    const g = AntiNukeMemory.get(sticker.guildId);
    if (!g?.enabled) return;

    const guild = sticker.guild ?? client.guilds.cache.get(sticker.guildId);
    if (!guild) return;

    try {
      const result = await resolveAudit(
        guild,
        AuditLogEvent.StickerCreate,
        sticker.id,
      );

      if (!result) return;

      const { executorId, executor } = result;

      if (!executorId) return;
      if (executorId === client.user.id) return;

      if (await client.sntl.isTrusted(sticker.guild, g, executorId, wlkey))
        return;

      await sticker
        .delete("Anti-Nuke: Unauthorized sticker creation")
        .catch(() => {});

      await client.sntl.AntinukePunish(
        guild,
        g,
        executorId,
        `Created Sticker "${sticker.name}" (${sticker.id})`,
      );
      client.logger.warn(
        `[ANTINUKE] Unauthorized sticker create by ${executor?.tag ?? executorId} in ${guild.name}.`,
      );
    } catch (err) {
      client.logger.error(`[ANTINUKE] Error in antiStickerCreate: ${err}`, err);
    }
  });
};
