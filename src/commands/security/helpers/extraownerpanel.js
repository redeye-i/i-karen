"use strict";

const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const AntiNukeMemory = require("../../../core/antinukeMemory");

function panel(title, content) {
  return new ContainerBuilder().addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`## ${title}\n${content}`),
  );
}

async function extraownerpanel(client, message) {
  if (!message.guild) return;

  const data = AntiNukeMemory.get(message.guild.id);
  if (!data) return message.reply("No data.");

  if (message.author.id !== message.guild.ownerId) {
    return message.reply("Only the server owner can view this panel.");
  }

  let entries = Array.from(data.extraOwners);
  let page = 0;
  const perPage = 10;

  const getPage = () => entries.slice(page * perPage, (page + 1) * perPage);

  const buildList = async () => {
    const current = getPage();
    if (!current.length) return "No extra owners found.";

    const lines = [];
    for (const id of current) {
      const member = await message.guild.members.fetch(id).catch(() => null);
      lines.push(member ? `- ${member.user.tag} (\`${id}\`)` : `- \`${id}\``);
    }
    return lines.join("\n");
  };

  const buildButtons = () =>
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("eo_prev")
        .setLabel("Prev")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === 0),
      new ButtonBuilder()
        .setCustomId("eo_next")
        .setLabel("Next")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled((page + 1) * perPage >= entries.length),
      new ButtonBuilder()
        .setCustomId("eo_refresh")
        .setLabel("Refresh")
        .setStyle(ButtonStyle.Secondary),
    );

  const buildMainContainer = async () => {
    const container = panel("Extra Owners Panel", await buildList());
    container.addActionRowComponents(buildButtons());
    return container;
  };

  const msg = await message.reply({
    flags: MessageFlags.IsComponentsV2,
    components: [await buildMainContainer()],
  });

  const collector = msg.createMessageComponentCollector({
    filter: (i) => i.user.id === message.author.id,
    time: 120000,
  });

  collector.on("collect", async (i) => {
    try {
      if (i.customId === "eo_refresh") {
        const newData = AntiNukeMemory.get(message.guild.id);
        entries = Array.from(newData?.extraOwners || []);
      }

      if (i.customId === "eo_next" && (page + 1) * perPage < entries.length) {
        page++;
      }

      if (i.customId === "eo_prev" && page > 0) {
        page--;
      }

      await i.update({
        flags: MessageFlags.IsComponentsV2,
        components: [await buildMainContainer()],
      });
    } catch (err) {
      console.error("EO Collector Error:", err);
      await i.deferUpdate().catch(() => {});
    }
  });

  collector.on("end", async () => {
    await msg
      .edit({
        flags: MessageFlags.IsComponentsV2,
        components: [panel("Panel Closed", "Session expired.")],
      })
      .catch(() => {});
  });
}

module.exports = { extraownerpanel };
