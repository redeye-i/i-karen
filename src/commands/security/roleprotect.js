const {
  ContainerBuilder,
  MessageFlags,
  TextDisplayBuilder,
} = require("discord.js");

const Antinuke = require("../../models/antinuke");
const AntiNukeMemory = require("../../core/antinukeMemory");
const { updateGuildAntiNuke } = require("../../core/loadAntiNuke");

function resolveRole(message, input) {
  const id = input?.replace(/[<@&>]/g, "");
  return message.mentions.roles.first() || message.guild.roles.cache.get(id);
}

function renderRoleList(message, ids) {
  if (!ids.length) return "No protected roles.";
  return ids
    .map((id, index) => {
      const role = message.guild.roles.cache.get(id);
      return `${index + 1}. ${role ? `${role} | \`${id}\`` : `Missing | \`${id}\``}`;
    })
    .join("\n");
}

module.exports = {
  name: "roleprotect",
  aliases: ["rprotect", "protectedrole"],
  category: "security",
  premium: false,

  run: async (client, message, args) => {
    if (!message.guild) return;

    const own = message.author.id === message.guild.ownerId;
    const extra = await client.util.isExtraOwner(message.author, message.guild);
    if (!own && !extra) {
      return client.util.container(message, "# Access Denied\n-# Only server owner or extra owner can manage protected roles.");
    }

    const sub = args[0]?.toLowerCase();
    const anti = await Antinuke.findById(message.guild.id);
    if (!anti) return client.util.container(message, "# Antinuke Missing\n-# Enable antinuke first.");

    if (sub === "add") {
      const role = resolveRole(message, args[1]);
      if (!role || role.id === message.guild.id) {
        return client.util.container(message, `# Invalid Role\n-# Usage: \`${message.guild.prefix || "&"}roleprotect add @role\``);
      }

      if (!anti.protectedRoles.includes(role.id)) anti.protectedRoles.push(role.id);
      await anti.save();
      await updateGuildAntiNuke(message.guild.id);
      return client.util.container(message, `# Role Protected\n-# ${role} will be restored if deleted or modified.`);
    }

    if (sub === "remove") {
      const role = resolveRole(message, args[1]);
      const roleId = role?.id || args[1]?.replace(/[<@&>]/g, "");
      if (!roleId) {
        return client.util.container(message, `# Invalid Role\n-# Usage: \`${message.guild.prefix || "&"}roleprotect remove @role\``);
      }

      anti.protectedRoles = anti.protectedRoles.filter((id) => id !== roleId);
      await anti.save();
      await updateGuildAntiNuke(message.guild.id);
      return client.util.container(message, `# Role Unprotected\n-# Removed \`${roleId}\` from protected roles.`);
    }

    const g = AntiNukeMemory.get(message.guild.id);
    const ids = [...(g?.protectedRoles || new Set(anti.protectedRoles || []))];
    const container = new ContainerBuilder().addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`# Protected Roles\n${renderRoleList(message, ids)}`),
    );

    return message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [container],
      allowedMentions: { repliedUser: true },
    });
  },
};
