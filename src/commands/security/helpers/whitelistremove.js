const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const Antinuke = require("../../../models/antinuke");

const antinukeMemory = require("../../../core/antinukeMemory");

function pretty(p) {
  return p.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function panel(title, content) {
  return new ContainerBuilder().addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`## ${title}\n${content}`),
  );
}
function getUserId(input) {
  return input?.replace(/[<@!>]/g, "");
}
async function whitelistremove(client, message, args) {
  if (!message.guild) return;
  if (args[0] !== "remove") return;

  const data = await Antinuke.findById(message.guild.id);
  if (!data) return message.reply("No data found.");

  const isAllowed =
    message.author.id === message.guild.ownerId ||
    data.extraowner?.includes(message.author.id);

  if (!isAllowed) return message.reply("Owner only.");

  const userId = getUserId(args[1]);
  if (!userId) {
    return message.reply("Usage: whitelist remove @user");
  }

  const target = await client.users.fetch(userId).catch(() => null);
  if (!target) {
    return message.reply("Invalid user ID or user not found.");
  }

  const perms = data.whitelist.get(userId) || [];
  if (!perms.length) {
    return message.reply("User has no whitelist permissions.");
  }

  const selectId = `rm_${message.id}`;
  const confirmId = `cf_${message.id}`;
  const cancelId = `cl_${message.id}`;

  let selected = [];

  const menu = new StringSelectMenuBuilder()
    .setCustomId(selectId)
    .setPlaceholder("Select permissions to remove")
    .setMinValues(1)
    .setMaxValues(perms.length)
    .addOptions([
      {
        label: "All Permissions",
        value: "all",
      },
      ...perms
        .filter((p) => typeof p === "string" && p.length > 0)
        .map((p) => ({
          label: pretty(p),
          value: p,
        })),
    ]);

  const msg = await message.reply({
    flags: MessageFlags.IsComponentsV2,
    components: [
      panel("Remove Whitelist", `Target: ${target.tag}`),
      new ActionRowBuilder().addComponents(menu),
    ],
  });

  const collector = msg.createMessageComponentCollector({
    filter: (i) => i.user.id === message.author.id,
    time: 60000,
  });

  collector.on("collect", async (i) => {
    if (i.customId === selectId) {
      if (i.values.includes("all")) {
        selected = [...perms];
      } else {
        selected = i.values;
      }

      return i.update({
        flags: MessageFlags.IsComponentsV2,
        components: [
          panel(
            "Confirm Removal",
            `Removing:\n${selected.map((x) => `• ${pretty(x)}`).join("\n")}`,
          ),
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(confirmId)
              .setLabel("Confirm")
              .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
              .setCustomId(cancelId)
              .setLabel("Cancel")
              .setStyle(ButtonStyle.Secondary),
          ),
        ],
      });
    }

    if (i.customId === confirmId) {
      let current = data.whitelist.get(target.id) || [];
      current = current.filter((p) => !selected.includes(p));
      const g = antinukeMemory.get(message.guild.id);

      if (current.length === 0) {
        data.whitelist.delete(target.id);
        if (g) g.whitelist.delete(target.id);
      } else {
        data.whitelist.set(target.id, current);
        if (g) g.whitelist.set(target.id, current);
      }

      data.markModified("whitelist");

      await data.save();

      if (g) antinukeMemory.set(message.guild.id, g);

      collector.stop();

      return i.update({
        flags: MessageFlags.IsComponentsV2,
        components: [panel("Done", "Permissions removed successfully.")],
      });
    }

    if (i.customId === cancelId) {
      collector.stop();
      return i.update({
        flags: MessageFlags.IsComponentsV2,
        components: [panel("Cancelled", "No changes made.")],
      });
    }
  });
}
module.exports = { whitelistremove };
