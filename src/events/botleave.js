const {
  Events,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} = require("discord.js");

module.exports = (client) => {
  client.on("guildDelete", async (guild) => {
    const LOG_CHANNEL_ID = client.config.botleave;

    const logChannel = client.channels.cache.get(LOG_CHANNEL_ID);
    if (!logChannel) return;
    const memberCount = guild.memberCount || "N/A";

    const container = new ContainerBuilder()

      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`< Left a Server`),
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
            `**~ Members at Removal**`,
            `> ${typeof memberCount === "number" ? memberCount.toLocaleString() : memberCount} members`,
            ``,
            `**! Server Created**`,
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

    await logChannel.send({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });
  });
};
