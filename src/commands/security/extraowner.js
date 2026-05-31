const { extraowneradd } = require("./helpers/extraowneradd");
const { extraownerremove } = require("./helpers/extraownerremove");
const { extraownerpanel } = require("./helpers/extraownerpanel");
const { extraownerreset } = require("./helpers/extraownerreset");
const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
  MediaGalleryBuilder,
  SeparatorBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

module.exports = {
  name: "extraowner",
  aliases: ["eo"],
  category: "security",
  premium: false,
  run: async (client, message, args) => {
    const sub = (args[0] || "").toLowerCase();

    switch (sub) {
      case "add":
        await extraowneradd(client, message, args);
        break;
      case "remove":
        await extraownerremove(client, message, args);
        break;
      case "panel":
        await extraownerpanel(client, message, args);
        break;
      case "reset":
        await extraownerreset(client, message, args);
        break;
      default:
        await helpmenu(message, client);
        break;
    }
  },
};

async function helpmenu(message, client) {
  const prefix = message.guild.prefix || "&";

  const Ancontainer = new ContainerBuilder();

  const bot = await client.user.fetch();
  const banner = bot.bannerURL({ size: 1024 }) || bot.displayAvatarURL();

  Ancontainer.addMediaGalleryComponents(
    new MediaGalleryBuilder({
      items: [
        {
          media: { url: banner },
        },
      ],
    }),
  );

  Ancontainer.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `# Extra Owner\n` +
        `Manage server co-owners who hold full administrative permissions to manage the security system.\n\n` +
        `-# Use the buttons or commands below to manage co-owners.`,
    ),
  );

  Ancontainer.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

  Ancontainer.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          [
            `### Commands`,
            `\`${prefix}extraowner add @user\` \u2014 Add a co-owner`,
            `\`${prefix}extraowner remove @user/ID\` \u2014 Remove a co-owner`,
            `\`${prefix}extraowner panel\` \u2014 Interactive management panel`,
            `\`${prefix}extraowner reset\` \u2014 Reset co-owners configuration`,
          ].join("\n"),
        ),
      )
      .setThumbnailAccessory(
        new ThumbnailBuilder({
          media: {
            url: message.author.displayAvatarURL({
              extension: "png",
              size: 1024,
            }),
          },
        }),
      ),
  );

  Ancontainer.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

  Ancontainer.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `-# Only the primary server owner can access these features.`,
    ),
  );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("eo-panel")
      .setLabel("Manage Panel")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("eo-reset")
      .setLabel("Reset")
      .setStyle(ButtonStyle.Danger)
  );

  const responseMsg = await message.reply({
    flags: MessageFlags.IsComponentsV2,
    components: [Ancontainer, row],
  });

  const eoCollector = responseMsg.createMessageComponentCollector({
    filter: (i) => i.user.id === message.author.id,
    time: 60000,
  });

  eoCollector.on("collect", async (i) => {
    if (i.customId === "eo-panel") {
      eoCollector.stop();
      await responseMsg.delete().catch(() => {});
      await extraownerpanel(client, message, ["panel"]);
    } else if (i.customId === "eo-reset") {
      eoCollector.stop();
      await responseMsg.delete().catch(() => {});
      await extraownerreset(client, message, ["reset"]);
    }
  });
}
