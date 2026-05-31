"use strict";

const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const AntiNukeMemory = require("../../../core/antinukeMemory");

function pretty(p) {
  return p.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function panel(title, content) {
  return new ContainerBuilder().addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`## ${title}\n${content}`),
  );
}

async function whitelistpanel(client, message, args) {
  if (!message.guild) return;
  if (args[0] !== "panel") return;

  const data = AntiNukeMemory.get(message.guild.id);
  if (!data) return message.reply("No data.");

  const isAllowed =
    message.author.id === message.guild.ownerId ||
    data.extraOwners?.has(message.author.id);

  if (!isAllowed) return message.reply("Owner only.");

  let entries = Array.from(data.whitelist.entries());
  let page = 0;
  const perPage = 5;

  const getPage = () => entries.slice(page * perPage, (page + 1) * perPage);

  const buildList = async () => {
    const current = getPage();

    if (!current.length) return "No entries.";

    let text = "";

    for (const [id] of current) {
      const member = await message.guild.members.fetch(id).catch(() => null);

      const name = member ? member.user.tag : id;
      text += `**${name}**\n`;
    }

    return text;
  };

  const buildDropdown = async () => {
    const current = getPage();

    if (!current.length) {
      return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("select_user")
          .setPlaceholder("No users available")
          .setDisabled(true)
          .addOptions([
            {
              label: "No data",
              value: "none",
            },
          ]),
      );
    }

    const options = await Promise.all(
      current.slice(0, 25).map(async ([id]) => {
        const member = await message.guild.members.fetch(id).catch(() => null);

        return {
          label: (member ? member.user.tag : id).slice(0, 100),
          value: id,
        };
      }),
    );

    return new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("select_user")
        .setPlaceholder("Select user to inspect")
        .addOptions(options),
    );
  };

  const buildButtons = () =>
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("prev")
        .setLabel("◀")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === 0),

      new ButtonBuilder()
        .setCustomId("next")
        .setLabel("▶")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled((page + 1) * perPage >= entries.length),

      new ButtonBuilder()
        .setCustomId("refresh")
        .setLabel("Refresh")
        .setStyle(ButtonStyle.Primary),
    );

  const msg = await message.reply({
    flags: MessageFlags.IsComponentsV2,
    components: [
      panel("Whitelist Panel", await buildList()),
      await buildDropdown(),
      buildButtons(),
    ],
  });

  const collector = msg.createMessageComponentCollector({
    filter: (i) => i.user.id === message.author.id,
    time: 120000,
  });

  collector.on("collect", async (i) => {
    try {
      if (i.customId === "refresh") {
        entries = Array.from(data.whitelist.entries());
      }

      if (i.customId === "next") {
        if ((page + 1) * perPage < entries.length) page++;
      }

      if (i.customId === "prev") {
        if (page > 0) page--;
      }

      if (i.customId === "select_user") {
        const userId = i.values[0];

        if (userId === "none") {
          return i.deferUpdate();
        }

        const perms = data.whitelist.get(userId) || [];

        const member = await message.guild.members
          .fetch(userId)
          .catch(() => null);

        const name = member ? member.user.tag : userId;

        return i.update({
          flags: MessageFlags.IsComponentsV2,
          components: [
            panel(
              "User Inspector",
              `**${name}**\n\n**Permanent Permissions:**\n${perms.length
                ? perms.map((p) => `• ${pretty(p)}`).join("\n")
                : "None"
              }`,
            ),
            buildButtons(),
          ],
        });
      }

      await i.update({
        flags: MessageFlags.IsComponentsV2,
        components: [
          panel("Whitelist Panel", await buildList()),
          await buildDropdown(),
          buildButtons(),
        ],
      });
    } catch (err) {
      console.error("Collector Error:", err);
      await i.deferUpdate().catch(() => { });
    }
  });

  collector.on("end", async () => {
    await msg
      .edit({
        flags: MessageFlags.IsComponentsV2,
        components: [panel("Panel Closed", "Session expired.")],
      })
      .catch(() => { });
  });
}

module.exports = { whitelistpanel };
