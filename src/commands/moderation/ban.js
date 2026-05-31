const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
} = require("discord.js");

module.exports = {
  name: "ban",
  aliases: ["fuckoff"],
  category: "mod",
  premium: false,

  run: async (client, message, args) => {
    if (!message.member.permissions.has("BanMembers")) {
      return client.util.container(
        message,
        `✗ | You must have \`Ban Members\` permissions to use this command.`,
      );
    }

    if (!message.guild.members.me.permissions.has("BanMembers")) {
      return client.util.container(
        message,
        `✗ | I don't have \`Ban Members\` permissions.`,
      );
    }

    let user = await getUserFromMention(message, args[0]);

    if (!user) {
      try {
        user = await client.users.fetch(args[0]);
      } catch {
        return client.util.container(
          message,
          `✗ | Please provide a valid user ID or mention a member.`,
        );
      }
    }

    if (!user) {
      return client.util.container(message, `✗ | User not found.`);
    }

    
    if (user.id === message.author.id) {
      return client.util.container(message, `✗ | You can't ban yourself.`);
    }

    
    if (user.id === client.user.id) {
      return client.util.container(message, `✗ | I can't ban myself.`);
    }

    
    if (user.id === message.guild.ownerId) {
      return client.util.container(
        message,
        `✗ | I can't ban the owner of this server.`,
      );
    }

    
    const targetMember = await message.guild.members
      .fetch(user.id)
      .catch(() => null);

    if (targetMember) {
      const botHighestRole = message.guild.members.me.roles.highest;
      const targetHighestRole = targetMember.roles.highest;
      const modHighestRole = message.member.roles.highest;

      
      if (botHighestRole.comparePositionTo(targetHighestRole) <= 0) {
        return client.util.container(
          message,
          `✗ | I can't ban **${user.tag}** because their role is equal to or higher than my highest role.`,
        );
      }

      
      if (message.author.id !== message.guild.ownerId) {
        if (modHighestRole.comparePositionTo(targetHighestRole) <= 0) {
          return client.util.container(
            message,
            `✗ | You can't ban **${user.tag}** because their role is equal to or higher than yours.`,
          );
        }
      }
    }

    const reason = args.slice(1).join(" ") || "No Reason Provided";
    const reasonWithModerator = `${message.author.tag} (${message.author.id}) | ${reason}`;

    const confirmContainer = new ContainerBuilder();
    confirmContainer.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `# Ban Confirmation\n\n` +
          `**Member:** ${user} (${user.id})\n` +
          `**Reason:** ${reason}\n\n` +
          `Are you sure you want to ban this member?`,
      ),
    );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("yes_ban")
        .setLabel("Yes")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("no_ban")
        .setLabel("No")
        .setStyle(ButtonStyle.Secondary),
    );

    const confirmMsg = await message.channel.send({
      flags: MessageFlags.IsComponentsV2,
      components: [confirmContainer, row],
      allowedMentions: { parse: [] },
    });

    const filter = (interaction) =>
      (interaction.customId === "yes_ban" ||
        interaction.customId === "no_ban") &&
      interaction.user.id === message.author.id;

    const collector = confirmMsg.createMessageComponentCollector({
      filter,
      time: 60000,
    });

    let responded = false;

    collector.on("collect", async (interaction) => {
      responded = true;

      if (interaction.customId === "yes_ban") {
        await interaction.deferUpdate();
        await confirmMsg.delete().catch(() => {});

        let isdm = false;

        try {
          const dmContainer = new ContainerBuilder();
          dmContainer.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `# You Have Been Banned\n\n` +
                `**Server:** ${message.guild.name}\n` +
                `**Moderator:** ${message.author.tag}\n` +
                `**Reason:** ${reason}`,
            ),
          );

          await user.send({
            flags: MessageFlags.IsComponentsV2,
            components: [dmContainer],
          });

          isdm = true;
        } catch {
          
        }

        
        try {
          await message.guild.bans.create(user.id, {
            reason: reasonWithModerator,
          });

          const dmStatus = isdm ? "DM sent" : "DM failed";
          await client.util.container(
            message,
            `✓ | Successfully banned **${user.tag}** from the server.\n\n**Reason:** ${reason}\n**DM Status:** ${dmStatus}`,
          );
        } catch (err) {
          await client.util.container(
            message,
            `✗ | Failed to ban the user: ${err.message}`,
          );
        }

        collector.stop();
      } else if (interaction.customId === "no_ban") {
        await interaction.deferUpdate();
        await confirmMsg.delete().catch(() => {});
        await client.util.container(message, `✗ | Ban action canceled.`);
        collector.stop();
      }
    });

    collector.on("end", () => {
      if (!responded) {
        
        confirmMsg
          .edit({
            flags: MessageFlags.IsComponentsV2,
            components: [
              confirmContainer,
              new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                  .setCustomId("yes_ban")
                  .setLabel("Yes")
                  .setStyle(ButtonStyle.Danger)
                  .setDisabled(true),
                new ButtonBuilder()
                  .setCustomId("no_ban")
                  .setLabel("No")
                  .setStyle(ButtonStyle.Secondary)
                  .setDisabled(true),
              ),
            ],
          })
          .catch(() => {});
      }
    });
  },
};

async function getUserFromMention(message, mention) {
  if (!mention) return null;

  const matches = mention.match(/^<@!?(\d+)>$/);
  if (!matches) return null;

  const id = matches[1];
  try {
    return await message.client.users.fetch(id);
  } catch {
    return null;
  }
}
