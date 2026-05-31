const {
  Collection,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} = require("discord.js");

this.config = require(`${process.cwd()}/config.json`);

module.exports = {
  async executeCommand(client, message, command, args) {
    
    let maintain = client.maintanance;
    if (maintain && !client.config.owner.includes(message.author.id)) {
      return client.util.container(
        message,
        `# ⓘ Bot Functionality Temporarily Disabled\n\n` +
          `Dear Discord Community Members,\n\n` +
          `We would like to inform you that the bot's functionality has been temporarily disabled by the developers.\n` +
          `We understand this may cause inconvenience and truly appreciate your patience while we work on restoring full service.\n\n` +
          `Thank you for your understanding and continued support.\n\n` +
          `Sincerely,\n[karen </>](https://discord.gg/VX9DTQehV6)`,
      );
    }

    
    const commandLimit = 5;

    if (
      client.config.cooldown &&
      !client.config.owner.includes(message.author.id)
    ) {
      if (!client.cooldowns.has(command.name)) {
        client.cooldowns.set(command.name, new Collection());
      }

      const now = Date.now();
      const timestamps = client.cooldowns.get(command.name);
      const cooldownAmount = (command.cooldown ? command.cooldown : 5) * 1000;

      if (timestamps.has(message.author.id)) {
        const expirationTime =
          timestamps.get(message.author.id) + cooldownAmount;

        if (now < expirationTime) {
          const timeLeft = (expirationTime - now) / 1000;
          let commandCount = timestamps.get(`${message.author.id}_count`) || 0;
          commandCount++;
          timestamps.set(`${message.author.id}_count`, commandCount);

          if (commandCount > commandLimit) {
            let blacklistedUsers =
              (await client.db.get(`blacklist_user`)) || {};
            if (!blacklistedUsers[message.author.id]) {
              blacklistedUsers[message.author.id] = {
                addedBy: client.displayName,
                addedAt: now,
                reason: "Spamming",
                expiresAt: now + 86400000,
              };
              await client.db.set(`blacklist_user`, blacklistedUsers);
              client.util.blacklist();
            }

            return client.util.container(
              message,
              `# ✗ Blacklisted for Spamming\n\n` +
                `You have been blacklisted for spamming commands.\n` +
                `Please refrain from such behavior.\n\n` +
                `**Support Server:** [Join here](https://discord.gg/S7Ju9RUpbT)`,
            );
          }

          if (!timestamps.has(`${message.author.id}_cooldown_message_sent`)) {
            message.channel
              .send({
                content: `ⓘ | Please wait, this command is on cooldown for \`${timeLeft.toFixed(1)}s\``,
              })
              .then((msg) => {
                setTimeout(() => msg.delete().catch(() => {}), 5000);
              });
            timestamps.set(`${message.author.id}_cooldown_message_sent`, true);
          }
          return;
        }
      }

      timestamps.set(message.author.id, now);
      timestamps.set(`${message.author.id}_count`, 1);
      setTimeout(() => {
        timestamps.delete(message.author.id);
        timestamps.delete(`${message.author.id}_count`);
        timestamps.delete(`${message.author.id}_cooldown_message_sent`);
      }, cooldownAmount);
    }

    
    try {
      await command.run(client, message, args);
      client.cmd
        .prepare(
          "UPDATE total_command_count SET count = count + 1 WHERE id = 1",
        )
        .run();

      if (command) {
        const LOG_CHANNEL_ID = client.config.botcommandlog;
        const logChannel = client.channels.cache.get(LOG_CHANNEL_ID);

        if (logChannel) {
          const timestamp = `<t:${Math.floor(Date.now() / 1000)}:F>`;

          const container = new ContainerBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(`### Command Executed`),
            )
            .addSeparatorComponents(
              new SeparatorBuilder()
                .setSpacing(SeparatorSpacingSize.Small)
                .setDivider(true),
            )
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                [
                  `-# ^ **Executor**`,
                  `${message.author.tag} \`(${message.author.id})\``,
                  ``,
                  `-# > **Server**`,
                  `${message.guild.name} \`(${message.guild.id})\``,
                  ``,
                  `-# ~ **Channel**`,
                  `${message.channel.name} \`(${message.channel.id})\``,
                  ``,
                  `-# ! **Command**`,
                  `\`${command.name}\``,
                  ``,
                  `-# - **Content**`,
                  `\`\`\`${message.content}\`\`\``,
                  ``,
                  `-# <t: **Timestamp**`,
                  timestamp,
                ].join("\n"),
              ),
            );

          logChannel
            .send({
              components: [container],
              flags: MessageFlags.IsComponentsV2,
            })
            .catch(console.error);
        }
      }
    } catch (err) {
      if (err.code === 429) {
        await client.util.handleRateLimit();
      }
      console.error(err);
    }
  },
};
