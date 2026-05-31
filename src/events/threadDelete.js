"use strict";

const { AuditLogEvent } = require("discord.js");
const AntiNukeMemory = require("../core/antinukeMemory");
const resolveAudit = require("../core/resolveAuditAdvanced");

const wlkey = "thread_delete";

module.exports = (client) => {
  client.on("threadDelete", async (thread) => {
    if (!thread.guild) return;

    const g = AntiNukeMemory.get(thread.guild.id);
    if (!g?.enabled) return;

    try {
      const result = await resolveAudit(
        thread.guild,
        AuditLogEvent.ThreadDelete,
        thread.id,
      );

      if (!result) return;

      const { executorId, executor } = result;

      if (!executorId) return;
      if (executorId === client.user.id) return;

      if (await client.sntl.isTrusted(thread.guild, g, executorId, wlkey))
        return;

      await client.sntl.AntinukePunish(
        thread.guild,
        g,
        executorId,
        `Deleted Thread "${thread.name}" in <#${thread.parentId}> (${thread.id})`,
      );
      client.logger.warn(
        `[ANTINUKE] Unauthorized thread delete by ${executor?.tag ?? executorId} in ${thread.guild.name}. Thread: ${thread.name}`,
      );
    } catch (err) {
      client.logger.error(`[ANTINUKE] Error in antiThreadDelete: ${err}`, err);
    }
  });
};
