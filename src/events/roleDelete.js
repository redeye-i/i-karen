"use strict";

const { AuditLogEvent } = require("discord.js");
const AntiNukeMemory = require("../core/antinukeMemory");
const resolveAudit = require("../core/resolveAuditAdvanced");
const Antinuke = require("../models/antinuke");

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

      const isBotSystemRole =
        role.id === g.quarantineRoleId || role.id === g.unbypassRoleId;
      const isOwnerOrExtraOwner =
        executorId === role.guild.ownerId || g.extraOwners?.has(executorId);

      // Bot system roles (unbypass / quarantine) are always recreated — even if
      // the owner deleted them. No one is allowed to permanently remove them.
      if (isBotSystemRole) {
        let recovered = null;
        if (role.id === g.quarantineRoleId) {
          recovered = await client.sntl.quarantinedelete(role.guild, g);
        } else {
          recovered = await client.sntl.unbypassroledelete(role.guild, g);
        }
        // Owner/extra-owners are not punished, but the action is still logged.
        if (!isOwnerOrExtraOwner) {
          await client.sntl.AntinukePunish(
            role.guild,
            g,
            executorId,
            `Deleted a protected bot system role. Sentinal recovery triggered.`,
          );
        }
        await client.logSendHandler.send(role.guild, g, {
          executorId,
          actionType: "role_delete",
          reason: `Sentinal Recovery: ${recovered ? "Restored" : "Failed to restore"} deleted bot system role "${role.name}"`,
          targetDetails: role.id,
        });
        return;
      }

      // For all other roles, owners/extra-owners are fully trusted — skip.
      if (isOwnerOrExtraOwner) return;

      const isProtectedRole = g.protectedRoles?.has(role.id);
      if (!isProtectedRole && g.modules?.antirole === false) return;

      client.sntl.trackViolation(role.guild, g, "role");

      if (await client.sntl.isTrusted(role.guild, g, executorId, wlkey)) return;

      const recovered = await role.guild.roles
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

      if (recovered && g.protectedRoles?.has(role.id)) {
        g.protectedRoles.delete(role.id);
        g.protectedRoles.add(recovered.id);
        AntiNukeMemory.set(role.guild.id, g);
        await Antinuke.updateOne(
          { _id: role.guild.id },
          { $pull: { protectedRoles: role.id }, $addToSet: { protectedRoles: recovered.id } },
        ).catch(() => null);
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
