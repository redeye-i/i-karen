"use strict";

const AntiNukeMemory = require("../core/antinukeMemory");

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
  "ManageEvents",
];

module.exports = (client) => {
  client.on("guildMemberUpdate", async (oldMember, newMember) => {
    if (newMember.id === client.user.id) return;

    const g = AntiNukeMemory.get(newMember.guild.id);
    if (!g?.enabled) return;

    try {
      const addedRoles = newMember.roles.cache.filter(
        (role) => !oldMember.roles.cache.has(role.id),
      );

      if (!addedRoles.size) return;

      const dangerousLinkedRoles = addedRoles.filter(
        (role) =>
          role.tags?.guildConnections &&
          DANGEROUS_PERMISSIONS.some((perm) => role.permissions.has(perm)),
      );
      client.sntl.trackViolation(newMember.guild, g, "linkroleadd");
      if (!dangerousLinkedRoles.size) return;

      for (const role of dangerousLinkedRoles.values()) {
        await role
          .setPermissions(
            [],
            `Anti-Nuke: Linked role with dangerous permissions — ${newMember.user.tag}`,
          )
          .catch(() => {});
      }

      await client.sntl.AntinukePunish(
        newMember.guild,
        g,
        newMember.id,
        `Linked Role With Dangerous Permissions (${dangerousLinkedRoles.map((r) => r.name).join(", ")})`,
      );
    } catch (err) {
      client.logger.error(`[ANTINUKE] Error in antiLinkRole: ${err}`, err);
    }
  });
};
