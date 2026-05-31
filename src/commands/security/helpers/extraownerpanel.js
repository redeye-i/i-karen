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

async function extraownerpanel(client, message, args) {
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

    let text = "";
    for (const id of current) {
      const member = await message.guild.members.fetch(id).catch(() => null);
      const name = member ? `${member.user.tag} (\`${id}\`)` : `\`${id}\``;
      text += `• ${name}\n`;
    }

    return text;
  };

  const buildButtons = () =>
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("eo_prev")
        .setLabel("◀")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === 0),
      new ButtonBuilder()
        .setCustomId("eo_next")
        .setLabel("▶")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled((page + 1) * perPage >= entries.length),
      new ButtonBuilder()
        .setCustomId("eo_refresh")
        .setLabel("Refresh")
        .setStyle(ButtonStyle.Primary),
    );

  const msg = await message.reply({
    flags: MessageFlags.IsComponentsV2,
    components: [
      panel("Extra Owners Panel", await buildList()),
      buildButtons(),
    ],
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

      if (i.customId === "eo_next") {
        if ((page + 1) * perPage < entries.length) page++;
      }

      if (i.customId === "eo_prev") {
        if (page > 0) page--;
      }

      await i.update({
        flags: MessageFlags.IsComponentsV2,
        components: [
          panel("Extra Owners Panel", await buildList()),
          buildButtons(),
        ],
      });
    } catch (err) {
      console.error("EO Collector Error:", err);
      await i.deferUpdate().catch(() => {});
    }
  });

  collector.on("end", async () => {
    await msg.edit({
      flags: MessageFlags.IsComponentsV2,
      components: [panel("Panel Closed", "Session expired.")],
    }).catch(() => {});
  });
}

module.exports = { extraownerpanel };
