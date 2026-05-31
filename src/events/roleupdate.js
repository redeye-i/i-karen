"use strict";

const { AuditLogEvent, PermissionsBitField } = require("discord.js");
const AntiNukeMemory = require("../core/antinukeMemory");
const resolveAudit = require("../core/resolveAuditAdvanced");

const wlkey = "role_update";

const DANGEROUS_PERMISSIONS = [
  "Administrator",
  "ManageGuild",
  "ManageRoles",
  "BanMembers",
  "KickMembers",
  "ManageChannels",
  "ManageWebhooks",
  "MentionEveryone",
  "ModerateMembers",
];

const revertingRoles = new Set();

const UNBYPASS_PERMS = new PermissionsBitField([
  "Administrator",
  "KickMembers",
  "BanMembers",
  "ManageRoles",
]);

module.exports = (client) => {
  client.on("roleUpdate", async (oldRole, newRole) => {
    const g = AntiNukeMemory.get(oldRole.guild.id);
    if (!g?.enabled) return;

    if (revertingRoles.has(newRole.id)) return;

    try {
      if (newRole.id === g.unbypassRoleId) {
        revertingRoles.add(newRole.id);

        await newRole
          .setPermissions(UNBYPASS_PERMS, "Anti-Nuke: Unbypass role enforced")
          .catch(() => {});

        setTimeout(() => revertingRoles.delete(newRole.id), 1500);
        return;
      }

      if (newRole.id === g.quarantineRoleId) {
        revertingRoles.add(newRole.id);
        await newRole.setPermissions(new PermissionsBitField(0n), "Anti-Nuke: Quarantine role enforced").catch(() => {});
        setTimeout(() => revertingRoles.delete(newRole.id), 1500);
        return;
      }

      if (g.panicWhitelistRoles?.has(newRole.id)) {
        revertingRoles.add(newRole.id);
        await newRole.setPermissions(oldRole.permissions, "Anti-Nuke: Protected role reverted").catch(() => {});
        setTimeout(() => revertingRoles.delete(newRole.id), 1500);
        return;
      }

      const newlyDangerous = DANGEROUS_PERMISSIONS.filter(
        (perm) =>
          !oldRole.permissions.has(perm) && newRole.permissions.has(perm),
      );

      if (!newlyDangerous.length) return;

      const result = await resolveAudit(
        oldRole.guild,
        AuditLogEvent.RoleUpdate,
        newRole.id,
      );

      if (!result) return;

      const { executorId } = result;
      if (!executorId) return;

      if (
        executorId === client.user.id ||
        executorId === oldRole.guild.ownerId ||
        g.extraOwners?.has?.(executorId)
      )
        return;

      client.sntl.trackViolation(oldRole.guild, g, "role");

      if (await client.sntl.isTrusted(oldRole.guild, g, executorId, wlkey))
        return;

      revertingRoles.add(newRole.id);

      await newRole
        .setPermissions(
          oldRole.permissions,
          "Anti-Nuke: Unauthorized dangerous permission update",
        )
        .catch(() => {});

      if (newRole.id === g.quarantineRoleId) {
        await newRole
          .setPermissions(
            new PermissionsBitField(0n),
            "Anti-Nuke: Quarantine role must have no permissions",
          )
          .catch(() => {});
      }

      setTimeout(() => revertingRoles.delete(newRole.id), 1500);
      await client.sntl.AntinukePunish(
        oldRole.guild,
        g,
        executorId,
        `Updated Role "${newRole.name}" — added dangerous permissions: ${newlyDangerous.join(", ")}`,
      );
      await client.logSendHandler.send(oldRole.guild, g, {
        executorId,
        actionType: "role_update",
        reason: `Updated Role "${newRole.name}" — added dangerous permissions: ${newlyDangerous.join(", ")}`,
        targetDetails: newRole.id,
      });
    } catch (err) {
      client.logger.error(`[ANTINUKE] roleUpdate error: ${err}`, err);
    }
  });
};
