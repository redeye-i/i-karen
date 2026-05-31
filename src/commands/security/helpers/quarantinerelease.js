"use strict";

const AntiNukeMemory = require("../../../core/antinukeMemory");




async function quarantineRelease(client, guild, targetUserId, releasedById) {
  
  const result = { success: false, reason: null, removedEntry: null };

  const g = AntiNukeMemory.get(guild.id);
  if (!g?.enabled) {
    result.reason = "Anti-nuke is not enabled for this guild";
    return result;
  }

  const quarantineRoleId = g.quarantineRoleId ?? null;
  if (!quarantineRoleId) {
    result.reason = "No quarantine role is configured for this guild";
    return result;
  }

  const punishedUsers = g.punishedUsers ?? new Map();
  if (!punishedUsers.has(targetUserId)) {
    result.reason = "This user is not in the quarantine registry";
    return result;
  }

  const extraOwners = g.extraOwners ?? new Set();
  const isAuthorized =
    releasedById === guild.ownerId || extraOwners.has(releasedById);
  if (!isAuthorized) {
    result.reason =
      "Only the server owner or a designated extra-owner can release quarantined users";
    return result;
  }

  const member = await guild.members.fetch(targetUserId).catch(() => null);
  if (member) {
    if (member.roles.cache.has(g.quarantineRoleId)) {
      await member.roles
        .remove(
          quarantineRoleId,
          `Anti-Nuke: Quarantine released by ${releasedById}`,
        )
        .catch((err) => {
          client.logger?.warn(
            `[ANTINUKE] quarantineRelease: Could not remove role from ${targetUserId}: ${err.message}`,
          );
        });
    }
  }

  await restoreRoles(client, guild, member);

  result.removedEntry = punishedUsers.get(targetUserId);
  punishedUsers.delete(targetUserId);
  g.punishedUsers = punishedUsers;

  try {
    const Antinuke = require("../../../models/antinuke");
    await Antinuke.findOneAndUpdate(
      { _id: guild.id },
      { $unset: { [`punishedusers.${targetUserId}`]: "" } },
      { new: true },
    );
  } catch (dbErr) {
    client.logger?.warn(
      `[ANTINUKE] quarantineRelease: DB persist failed for ${targetUserId}: ${dbErr.message}`,
    );
  }

  client.logger?.info(
    `[ANTINUKE] Quarantine released: ${targetUserId} in "${guild.name}" by ${releasedById}`,
  );

  result.success = true;
  return result;
}

async function restoreRoles(client, guild, member) {
  try {
    const antinuke = require("../../../models/antinuke");
    const { PermissionFlagsBits } = require("discord.js");

    const DANGEROUS_PERMS = [
      PermissionFlagsBits.Administrator,
      PermissionFlagsBits.BanMembers,
      PermissionFlagsBits.KickMembers,
      PermissionFlagsBits.ManageGuild,
      PermissionFlagsBits.ManageChannels,
      PermissionFlagsBits.ManageRoles,
      PermissionFlagsBits.ManageWebhooks,
    ];

    const data = await antinuke.findById(guild.id);
    if (!data) return;

    const qData = data.quarantineData?.get(member.id);
    if (!qData) return;

    const validRoles = qData.oldRoles.filter((roleId) => {
      
      const role = guild.roles.cache.get(roleId);
      if (!role) return false;

      
      const hasDangerousPerm = DANGEROUS_PERMS.some((perm) =>
        role.permissions.has(perm),
      );
      if (hasDangerousPerm) {
        client.logger.warn(
          `[ANTINUKE] Skipping role ${role.name} (${roleId}) for ${member.id} — contains dangerous permissions`,
        );
        return false;
      }

      return true;
    });

    if (member) {
      await member.roles.set(validRoles);
    }

    await antinuke.updateOne(
      { _id: guild.id },
      {
        $unset: {
          [`quarantineData.${member.id}`]: "",
        },
      },
    );

    client.logger.log(`Restored roles for ${member.user.tag} (${member.id})`);
  } catch (err) {
    client.logger.error(`Failed to restore ${member.id}:${err}`, err);
  }
}

module.exports = quarantineRelease;
