const { whitelistadd } = require("./helpers/whitelistadd");
const { whitelistremove } = require("./helpers/whitelistremove");
const { whitelistpanel } = require("./helpers/whitelistpanel");
const { whitelistview } = require("./helpers/whitelistview");
const { whitelistreset } = require("./helpers/whitelistreset");
const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
  MediaGalleryBuilder,
  SeparatorBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

module.exports = {
  name: "whitelist",
  aliases: ["wl"],
  category: "security",
  premium: false,
  run: async (client, message, args) => {
    const sub = (args[0] || "").toLowerCase();

    switch (sub) {
      case "add":
        await whitelistadd(client, message, args);
        break;
      case "remove":
        await whitelistremove(client, message, args);
        break;
      case "view":
        await whitelistview(client, message, args);
        break;
      case "panel":
        await whitelistpanel(client, message, args);
        break;
      case "reset":
        await whitelistreset(client, message, args);
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
      `# Whitelist\n` +
        `Manage trusted users who bypass automated defenses.\n\n` +
        `-# Use the buttons or commands below to manage the whitelist.`,
    ),
  );

  Ancontainer.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

  Ancontainer.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          [
            `### Commands`,
            `\`${prefix}whitelist add @user\` - Add user to whitelist`,
            `\`${prefix}whitelist remove @user\` - Remove user from whitelist`,
            `\`${prefix}whitelist view @user\` - View user permissions`,
            `\`${prefix}whitelist panel\` - Interactive management panel`,
            `\`${prefix}whitelist reset\` - Reset whitelist configuration`,
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
      `-# Only server owners or trusted extra owners can access these features.`,
    ),
  );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("wl-panel")
      .setLabel("Whitelist Panel")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("wl-reset")
      .setLabel("Reset")
      .setStyle(ButtonStyle.Danger)
  );

  const responseMsg = await message.reply({
    flags: MessageFlags.IsComponentsV2,
    components: [Ancontainer, row],
  });

  const wlCollector = responseMsg.createMessageComponentCollector({
    filter: (i) => i.user.id === message.author.id,
    time: 60000,
  });

  wlCollector.on("collect", async (i) => {
    if (i.customId === "wl-panel") {
      wlCollector.stop();
      await responseMsg.delete().catch(() => {});
      await whitelistpanel(client, message, ["panel"]);
    } else if (i.customId === "wl-reset") {
      wlCollector.stop();
      await responseMsg.delete().catch(() => {});
      await whitelistreset(client, message, ["reset"]);
    }
  });
}
