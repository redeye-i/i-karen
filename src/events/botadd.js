const {
  Events,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require("discord.js");

this.config = require(`${process.cwd()}/config.json`);

module.exports = (client) => {
  client.on("guildCreate", async (guild) => {
    const LOG_CHANNEL_ID = this.config.botjoin;

    const logChannel = client.channels.cache.get(LOG_CHANNEL_ID);
    if (!logChannel) return;

    let ownerTag = "Unknown";
    try {
      const owner = await guild.fetchOwner();
      ownerTag = `${owner.user.username} (${owner.user.id})`;
    } catch {}

    let inviteUrl = null;
    try {
      const targetChannel = guild.channels.cache.find(
        (ch) =>
          ch.isTextBased() &&
          !ch.isThread() &&
          ch.permissionsFor(guild.members.me).has("CreateInstantInvite"),
      );

      if (targetChannel) {
        const invite = await targetChannel.createInvite({
          maxAge: 0,
          maxUses: 0,
          unique: true,
          reason: "Bot guild join log invite",
        });
        inviteUrl = invite.url;
      }
    } catch {}

    const container = new ContainerBuilder()

      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`> New Server Joined`),
      )

      .addSeparatorComponents(
        new SeparatorBuilder()
          .setDivider(true)
          .setSpacing(SeparatorSpacingSize.Small),
      )

      
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          [
            `**> Server Name**`,
            `> ${guild.name}`,
            ``,
            `**^ Server ID**`,
            `> ${guild.id}`,
            ``,
            `**@ Owner**`,
            `> ${ownerTag}`,
            ``,
            `**~ Members**`,
            `> ${guild.memberCount.toLocaleString()} members`,
            ``,
            `**! Created**`,
            `> <t:${Math.floor(guild.createdTimestamp / 1000)}:F>`,
          ].join("\n"),
        ),
      )

      .addSeparatorComponents(
        new SeparatorBuilder()
          .setDivider(true)
          .setSpacing(SeparatorSpacingSize.Small),
      )

      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `[-] Total Servers: **${client.guilds.cache.size}**`,
        ),
      );

    const buttonRow = inviteUrl
      ? new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setLabel("~ Join Server")
            .setStyle(ButtonStyle.Link)
            .setURL(inviteUrl),
        )
      : null;

    await logChannel.send({
      components: buttonRow ? [container, buttonRow] : [container],
      flags: MessageFlags.IsComponentsV2,
    });
  });
};
