const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const Antinuke = require("../../../models/antinuke");
const AntiNukeMemory = require("../../../core/antinukeMemory");
const buildGuildCache = require("../../../core/buildGuildCache");

function panel(title, content) {
  return new ContainerBuilder().addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`## ${title}\n${content}`),
  );
}

async function whitelistreset(client, message, args) {
  if (!message.guild) return;
  if (args[0] !== "reset") return;

  const guildId = message.guild.id;

  let g = AntiNukeMemory.get(guildId);
  if (!g) {
    const doc = await Antinuke.findById(guildId);
    if (!doc) return message.reply("No data.");
    g = buildGuildCache(doc);
    AntiNukeMemory.set(guildId, g);
  }

  const isAllowed =
    message.author.id === message.guild.ownerId ||
    g.extraOwners?.has(message.author.id);

  if (!isAllowed) return message.reply("Owner only.");

  const entries = Array.from(g.whitelist.keys());

  if (!entries.length) {
    return message.reply("Whitelist is already empty.");
  }

  let text = "";

  for (const id of entries) {
    const member = await message.guild.members.fetch(id).catch(() => null);
    const name = member ? member.user.tag : `Unknown (${id})`;

    text += `• ${name}\n`;
  }

  const confirmId = `wl_reset_confirm_${message.id}`;
  const cancelId = `wl_reset_cancel_${message.id}`;

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(confirmId)
      .setLabel("Reset Whitelist")
      .setStyle(ButtonStyle.Danger),

    new ButtonBuilder()
      .setCustomId(cancelId)
      .setLabel("Cancel")
      .setStyle(ButtonStyle.Secondary),
  );

  const msg = await message.reply({
    flags: MessageFlags.IsComponentsV2,
    components: [
      panel(
        "Whitelist Reset",
        `The following users will be removed:\n\n${text}`,
      ),
      row,
    ],
  });

  const collector = msg.createMessageComponentCollector({
    filter: (i) => i.user.id === message.author.id,
    time: 30000,
  });

  collector.on("collect", async (i) => {
    if (i.customId === cancelId) {
      collector.stop();

      return i.update({
        flags: MessageFlags.IsComponentsV2,
        components: [panel("Cancelled", "No changes were made.")],
      });
    }

    if (i.customId === confirmId) {
      const doc = await Antinuke.findById(guildId);
      doc.whitelist.clear();
      doc.markModified("whitelist");
      await doc.save();

      if (g) {
        g.whitelist.clear();
        AntiNukeMemory.set(guildId, g);
      }

      collector.stop();

      return i.update({
        flags: MessageFlags.IsComponentsV2,
        components: [panel("Done", "Whitelist has been reset successfully.")],
      });
    }
  });

  collector.on("end", async (_, reason) => {
    if (reason === "time") {
      await msg
        .edit({
          flags: MessageFlags.IsComponentsV2,
          components: [panel("Expired", "No response received.")],
        })
        .catch(() => { });
    }
  });
}

module.exports = { whitelistreset };
