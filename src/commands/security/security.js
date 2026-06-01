const {
  ContainerBuilder,
  MessageFlags,
  PermissionFlagsBits,
  TextDisplayBuilder,
} = require("discord.js");

function linesOrNone(lines) {
  return lines.length ? lines.join("\n") : "None";
}

module.exports = {
  name: "security",
  aliases: ["sec"],
  category: "security",
  premium: false,

  run: async (client, message, args) => {
    if (!message.guild) return;

    const sub = args[0]?.toLowerCase();
    if (sub !== "scan") {
      return client.util.container(
        message,
        `# Security\n-# Usage: \`${message.guild.prefix || "&"}security scan\``,
      );
    }

    const botRole = message.guild.members.me.roles.highest;
    const adminRoles = message.guild.roles.cache
      .filter((role) => role.id !== message.guild.id && role.permissions.has(PermissionFlagsBits.Administrator))
      .sort((a, b) => b.position - a.position)
      .map((role) => `- ${role} | \`${role.id}\``);
    const manageRoles = message.guild.roles.cache
      .filter((role) => role.id !== message.guild.id && role.permissions.has(PermissionFlagsBits.ManageRoles))
      .sort((a, b) => b.position - a.position)
      .map((role) => `- ${role} | \`${role.id}\``);
    const aboveBot = message.guild.roles.cache
      .filter((role) => role.id !== message.guild.id && role.position >= botRole.position)
      .sort((a, b) => b.position - a.position)
      .map((role) => `- ${role} | \`${role.id}\``);
    const mentionableAdmin = message.guild.roles.cache
      .filter((role) => role.id !== message.guild.id && role.mentionable && role.permissions.has(PermissionFlagsBits.Administrator))
      .sort((a, b) => b.position - a.position)
      .map((role) => `- ${role} | \`${role.id}\``);

    const missingBotPerms = [
      PermissionFlagsBits.Administrator,
      PermissionFlagsBits.ManageRoles,
      PermissionFlagsBits.ManageChannels,
      PermissionFlagsBits.BanMembers,
      PermissionFlagsBits.KickMembers,
      PermissionFlagsBits.ViewAuditLog,
      PermissionFlagsBits.ManageWebhooks,
    ].filter((perm) => !message.guild.members.me.permissions.has(perm));

    const text =
      `# Security Scan\n` +
      `**Bot Top Role**: ${botRole}\n\n` +
      `## Administrator Roles\n${linesOrNone(adminRoles.slice(0, 15))}\n\n` +
      `## Manage Roles Roles\n${linesOrNone(manageRoles.slice(0, 15))}\n\n` +
      `## Roles At Or Above Bot\n${linesOrNone(aboveBot.slice(0, 15))}\n\n` +
      `## Mentionable Administrator Roles\n${linesOrNone(mentionableAdmin.slice(0, 15))}\n\n` +
      `## Missing Bot Permissions\n${missingBotPerms.length ? missingBotPerms.map((perm) => `- ${perm.toString()}`).join("\n") : "None"}`;

    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(text.slice(0, 3900)));

    return message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [container],
      allowedMentions: { repliedUser: true },
    });
  },
};
