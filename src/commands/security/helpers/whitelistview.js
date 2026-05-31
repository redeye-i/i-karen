const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
} = require("discord.js");

const Antinuke = require("../../../models/antinuke");

function pretty(p) {
  return p.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function panel(title, content) {
  return new ContainerBuilder().addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`## ${title}\n${content}`),
  );
} 

function formatTime(msLeft) {
  const s = Math.floor(msLeft / 1000) % 60;
  const m = Math.floor(msLeft / (1000 * 60)) % 60;
  const h = Math.floor(msLeft / (1000 * 60 * 60)) % 24;
  const d = Math.floor(msLeft / (1000 * 60 * 60 * 24));

  return `${d}d ${h}h ${m}m ${s}s`;
}
function getUserId(input) {
  return input?.replace(/[<@!>]/g, "");
}
async function whitelistview(client, message, args) {
  if (!message.guild) return;

  const sub = (args[0] || "").toLowerCase();
  if (sub !== "view") return;

  const data = await Antinuke.findById(message.guild.id);
  if (!data) return message.reply("No data found.");

  const isAllowed =
    message.author.id === message.guild.ownerId ||
    data.extraowner?.includes(message.author.id);

  if (!isAllowed) {
    return message.reply("Only owner / co-owner can use this.");
  }

  const userId = getUserId(args[1]);
  if (!userId) {
    return message.reply("Usage: whitelist view @user");
  }

  const target = await client.users.fetch(userId).catch(() => null);
  if (!target) {
    return message.reply("User not found.");
  }

  const perms = data.whitelist.get(userId) || [];

  const temp = data.temporaryWhitelist?.get(userId);

  let tempInfo = "None";
  if (temp) {
    const remaining = temp.expiresAt ? temp.expiresAt - Date.now() : null;

    if (remaining && remaining > 0) {
      tempInfo = `${temp.permissions.map((p) => `• ${pretty(p)}`).join("\n")}\n\n⏳ Expires in: ${formatTime(remaining)}`;
    } else {
      tempInfo = "Expired (will auto remove)";
    }
  }

  let status = "Normal User";
  if (userId === message.guild.ownerId) status = "Server Owner";
  else if (data.extraowner?.includes(userId)) status = "Co-Owner";

  const content = [
    ` **User:** ${target.tag}`,
    ` **ID:** ${userId}`,
    ` **Status:** ${status}`,
    "",
    `**Permanent Permissions:**`,
    perms.length ? perms.map((p) => `• ${pretty(p)}`).join("\n") : "None",
    "",
    ` **Temporary Permissions:**`,
    tempInfo,
  ].join("\n");

  return message.reply({
    flags: MessageFlags.IsComponentsV2,
    components: [panel("Whitelist Viewer", content)],
  });
}

module.exports = { whitelistview };
