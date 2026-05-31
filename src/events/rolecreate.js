"use strict";

const { AuditLogEvent } = require("discord.js");
const AntiNukeMemory = require("../core/antinukeMemory");
const resolveAudit = require("../core/resolveAuditAdvanced");

const wlkey = "role_create";

module.exports = (client) => {
  client.on("roleCreate", async (role) => {
    const g = AntiNukeMemory.get(role.guild.id);
    if (!g?.enabled) return;

    try {
      const result = await resolveAudit(
        role.guild,
        AuditLogEvent.RoleCreate,
        role.id,
      );

      if (!result) return;

      const { executorId, executor } = result;

      if (!executorId) return;
      if (executorId === client.user.id) return;
      if (executorId === role.guild.ownerId || g.extraOwners?.has(executorId))
        return;

      client.sntl.trackViolation(role.guild, g, "role");

      if (client.sntl.isTrusted(role.guild, g, executorId, wlkey)) return;
      await role
        .delete("Anti-Nuke: Unauthorized role creation")
        .catch(() => {});

      await client.sntl.AntinukePunish(
        role.guild,
        g,
        executorId,
        `Created Role "${role.name}" (${role.id})`,
      );
      await client.logSendHandler.send(role.guild, g, {
        executorId,
        actionType: "role_create",
        reason: `Created Role "${role.name}" (${role.id})`,
        targetDetails: role.id,
      });
    } catch (err) {
      client.logger.error(`[ANTINUKE] Error in antiRoleCreate: ${err}`, err);
    }
  });
};
