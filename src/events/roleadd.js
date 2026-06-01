"use strict";

const { AuditLogEvent } = require("discord.js");
const AntiNukeMemory = require("../core/antinukeMemory");
const resolveAudit = require("../core/resolveAuditAdvanced");

const wlkey = "role_add";

const DANGEROUS_PERMISSIONS = [
  "Administrator",
  "ManageGuild",
  "ManageRoles",
  "BanMembers",
  "KickMembers",
  "ManageChannels",
  "ManageWebhooks",
  "ManageNicknames",
  "MentionEveryone",
];

module.exports = (client) => {
  client.on("guildMemberUpdate", async (oldMember, newMember) => {
    const g = AntiNukeMemory.get(newMember.guild.id);
    if (!g?.enabled) return;

    try {
      const addedRoles = newMember.roles.cache.filter(
        (role) => !oldMember.roles.cache.has(role.id),
      );

      if (!addedRoles.size) return;

      const quarantineRoleId = g.quarantineRoleId;
      const isPunished = g.punishedUsers?.has(newMember.id);

      const firstRole = addedRoles.first();

      const result = await resolveAudit(
        newMember.guild,
        AuditLogEvent.MemberRoleUpdate,
        newMember.id,
        {
          changeKey: "$add",
          changeTargetId: firstRole.id,
        },
      );

      if (!result) return;

      const { executorId } = result;
      if (executorId === client.user.id) return;
      if (!executorId) return;
      if (isPunished) {
        for (const role of addedRoles.values()) {
          await newMember.roles
            .remove(role, "Anti-Nuke: Cannot modify roles of punished user")
            .catch(() => {});
        }

        await client.sntl.AntinukePunish(
          newMember.guild,
          g,
          executorId,
          "Tried to modify roles of quarantined user",
        );

        return;
      }

      if (
        quarantineRoleId &&
        addedRoles.has(quarantineRoleId) &&
        executorId !== client.user.id
      ) {
        await newMember.roles
          .remove(quarantineRoleId, "Anti-Nuke: Only bot can assign quarantine")
          .catch(() => {});

        await client.sntl.AntinukePunish(
          newMember.guild,
          g,
          executorId,
          "Tried to manually assign quarantine role",
        );

        return;
      }

      if (
        executorId === newMember.guild.ownerId ||
        g.extraOwners?.has(executorId)
      )
        return;

      if (g.modules?.antirole === false) return;

      const dangerousRoles = addedRoles.filter((role) =>
        DANGEROUS_PERMISSIONS.some((perm) => role.permissions.has(perm)),
      );

      if (!dangerousRoles.size) return;

      client.sntl.trackViolation(newMember.guild, g, "role");

      if (
        !g.panic &&
        await client.sntl.isTrusted(newMember.guild, g, executorId, wlkey)
      )
        return;

      for (const role of dangerousRoles.values()) {
        await newMember.roles
          .remove(role, "Anti-Nuke: Dangerous role added")
          .catch(() => {});

        await client.sntl.AntinukePunish(
          newMember.guild,
          g,
          executorId,
          `Added Dangerous Role (${role.permissions.toArray().join(", ")})`,
        );
      }
      await client.logSendHandler.send(newMember.guild, g, {
        executorId,
        actionType: "role_add",
        reason: `Added Role ${addedRoles.map((r) => r.name).join(", ")} (${addedRoles.map((r) => r.id).join(", ")})`,
        targetDetails: newMember.id,
      });
    } catch (err) {
      client.logger.error(`[ANTINUKE] Error in antiRoleAdd: ${err}`, err);
    }
  });
};
