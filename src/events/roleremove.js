"use strict";

const { AuditLogEvent } = require("discord.js");
const AntiNukeMemory = require("../core/antinukeMemory");
const resolveAudit = require("../core/resolveAuditAdvanced");

module.exports = (client) => {
  client.on("guildMemberUpdate", async (oldMember, newMember) => {
    const g = AntiNukeMemory.get(newMember.guild.id);
    if (!g?.enabled) return;

    const unbypassRoleId = g.unbypassRoleId ?? null;
    const quarantineRoleId = g.quarantineRoleId ?? null;

    const shouldCheckUnbypass = unbypassRoleId !== null;
    const shouldCheckQuarantine = quarantineRoleId !== null;

    if (!shouldCheckUnbypass && !shouldCheckQuarantine) return;

    const oldRoles = oldMember.roles.cache;
    const newRoles = newMember.roles.cache;

    const unbypassRemoved =
      shouldCheckUnbypass &&
      oldRoles.has(unbypassRoleId) &&
      !newRoles.has(unbypassRoleId);
    const quarantineRemoved =
      shouldCheckQuarantine &&
      oldRoles.has(quarantineRoleId) &&
      !newRoles.has(quarantineRoleId);

    if (!unbypassRemoved && !quarantineRemoved) return;

    try {
      const anchorRoleId = unbypassRemoved ? unbypassRoleId : quarantineRoleId;

      const result = await resolveAudit(
        newMember.guild,
        AuditLogEvent.MemberRoleUpdate,
        newMember.id,
        {
          changeKey: "$remove",
          changeTargetId: anchorRoleId,
        },
      );

      if (!result) return;

      const { executorId, executor } = result;
      if (!executorId) return;
      if (executorId === client.user.id) return;

      const extraOwners = g.extraOwners ?? [];
      const isExtraOwner = Array.isArray(extraOwners)
        ? extraOwners.includes(executorId)
        : extraOwners.has(executorId);

      const isProtectedExecutor =
        executorId === client.user.id ||
        executorId === newMember.guild.ownerId ||
        isExtraOwner;

      if (unbypassRemoved && oldMember.id === client.user.id) {
        await newMember.roles
          .add(unbypassRoleId, "Anti-Nuke: Restoring unbypass role")
          .catch(() => { });

        client.sntl.trackViolation(newMember.guild.id, g, "unbypass_remove");

        if (!isProtectedExecutor) {
          await client.sntl.AntinukePunish(
            newMember.guild,
            g,
            executorId,
            `Removed Unbypass Role from ${newMember.user.tag} (${newMember.id})`,
          );
        }

        client.logger.warn(
          `[ANTINUKE] ${executor?.tag ?? executorId} removed unbypass role from ` +
          `${newMember.user.tag} — ${isProtectedExecutor ? "restored only" : "restored + punished"}`,
        );

        return;
      }
      if (quarantineRemoved) {
        const punishedUsers = g.punishedUsers ?? new Map();
        const punishEntry = punishedUsers.get(newMember.id);

        if (!punishEntry) return;

        const punishAction = (punishEntry.action ?? "role").toLowerCase();

        if (punishAction !== "ban") {
          await newMember.roles
            .add(
              quarantineRoleId,
              "Anti-Nuke: Restoring quarantine role to punished user",
            )
            .catch(() => { });
        }

        client.sntl.trackViolation(newMember.guild.id, g, "quarantine_remove");

        if (!isProtectedExecutor) {
          await client.sntl.AntinukePunish(
            newMember.guild,
            g,
            executorId,
            `Removed Quarantine Role from punished user ${newMember.user.tag} (${newMember.id}) ` +
            `[action: ${punishAction}] — original reason: ${punishEntry.reason ?? "No reason provided"}`,
          );
        }

        client.logger.warn(
          `[ANTINUKE] ${executor?.tag ?? executorId} removed quarantine from ` +
          `${newMember.user.tag} — ${isProtectedExecutor ? "restored only" : "restored + punished"}`,
        );
      }
    } catch (err) {
      client.logger.error(`[ANTINUKE] Error in antiRoleRemove: ${err}`, err);
    }
  });
};
