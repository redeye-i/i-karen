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

async function extraownerreset(client, message, args) {
  if (!message.guild) return;

  if (message.author.id !== message.guild.ownerId) {
    return message.reply("#- Only the server owner can use this.");
  }

  const confirmId = `eo_reset_cf_${message.id}`;
  const cancelId = `eo_reset_cl_${message.id}`;

  const msg = await message.reply({
    flags: MessageFlags.IsComponentsV2,
    components: [
      new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`## Extra Owner Reset\nAre you sure you want to reset all extra owners?`),
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

  const collector = msg.createMessageComponentCollector({
    filter: (i) => i.user.id === message.author.id,
    time: 30000,
  });

  collector.on("collect", async (i) => {
    if (i.customId === confirmId) {
      const data = await Antinuke.findById(message.guild.id);
      if (data) {
        data.extraowner = [];
        await data.save();
      }

      const g = AntiNukeMemory.get(message.guild.id);
      if (g) {
        g.extraOwners.clear();
      }

      collector.stop();
      return i.update({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new ContainerBuilder().addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## Done\nAll extra owners have been reset.`),
          ),
        ],
      });
    }

    if (i.customId === cancelId) {
      collector.stop();
      return i.update({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new ContainerBuilder().addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## Cancelled\nReset operation was cancelled.`),
          ),
        ],
      });
    }
  });

  collector.on("end", (_, reason) => {
    if (reason === "time") {
      msg.edit({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new ContainerBuilder().addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## Timeout\nNo response received.`),
          ),
        ],
      }).catch(() => {});
    }
  });
}

module.exports = { extraownerreset };
