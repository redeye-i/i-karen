"use strict";

const { AuditLogEvent } = require("discord.js");
const AntiNukeMemory = require("../core/antinukeMemory");
const resolveAudit = require("../core/resolveAuditAdvanced");

const wlkey = "role_delete";

module.exports = (client) => {
  client.on("roleDelete", async (role) => {
    const g = AntiNukeMemory.get(role.guild.id);
    if (!g?.enabled) return;

    try {
      const result = await resolveAudit(
        role.guild,
        AuditLogEvent.RoleDelete,
        role.id,
      );

      if (!result) return;

      const { executorId, executor } = result;

      if (!executorId) return;
      if (executorId === client.user.id) return;
      if (executorId === role.guild.ownerId || g.extraOwners?.has(executorId))
        return;

      client.sntl.trackViolation(role.guild, g, "role");

      if (await client.sntl.isTrusted(role.guild, g, executorId, wlkey)) return;

      let recovered = null;
      if (role.id === g.quarantineRoleId) {
        recovered = await client.sntl.quarantinedelete(role.guild, g);
      } else if (role.id === g.unbypassRoleId) {
        recovered = await client.sntl.unbypassroledelete(role.guild, g);
      } else {
        recovered = await role.guild.roles
          .create({
            name: role.name,
            color: role.color,
            hoist: role.hoist,
            permissions: role.permissions,
            mentionable: role.mentionable,
            position: role.rawPosition,
            icon: role.icon ?? undefined,
            unicodeEmoji: role.unicodeEmoji ?? undefined,
            reason: "Anti-Nuke: Sentinal Recovery — unauthorized role deletion",
          })
          .catch(() => null);
      }
      await client.sntl.AntinukePunish(
        role.guild,
        g,
        executorId,
        `Mass Role Deletion attempt detected. Sentinal recovery triggered.`,
      );
      await client.logSendHandler.send(role.guild, g, {
        executorId,
        actionType: "role_delete",
        reason: `Sentinal Recovery: ${recovered ? "Restored" : "Failed to restore"} deleted role "${role.name}"`,
        targetDetails: role.id,
      });
    } catch (err) {
      client.logger.error(`[ANTINUKE] Error in antiRoleDelete: ${err}`, err);
    }
  });
};
