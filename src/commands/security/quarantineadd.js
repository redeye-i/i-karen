"use strict";



const {
  ContainerBuilder,
  TextDisplayBuilder,
  SectionBuilder,
  MessageFlags,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const AntiNukeMemory = require("../../core/antinukeMemory");



function text(content) {
  return new TextDisplayBuilder().setContent(content);
}

function panel(header, sections) {
  const container = new ContainerBuilder();
  container.addTextDisplayComponents(text(`## ${header}`));
  for (const s of sections) container.addSectionComponents(s);
  return container;
}

function section(label, value) {
  return new SectionBuilder()
    .addTextDisplayComponents(text(`**${label}**\n${value}`))
    .setButtonAccessory(
      new ButtonBuilder()
        .setCustomId(`_noop_${label}`)
        .setLabel(label)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
    );
}

function simplePanel(header, body) {
  return new ContainerBuilder().addTextDisplayComponents(
    text(`## ${header}\n${body}`),
  );
}



function isAuthorized(message, data) {
  return (
    message.author.id === message.guild.ownerId ||
    (data.extraOwners?.has(message.author.id) ?? false)
  );
}



module.exports = {
  name: "quarantineadd",
  aliases: ["qadd", "qforce"],
  category: "security",
  description: "Manually add a user to quarantine via the antinuke system.",
  usage: "quarantineadd <@user | id> [reason]",

  run: async (client, message, args) => {
    if (!message.guild) return;

    const g = AntiNukeMemory.get(message.guild.id);

    if (!g?.enabled) {
      return message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          simplePanel(
            "Quarantine  ·  System Offline",
            "Anti-nuke is not active on this server.",
          ),
        ],
      });
    }

    if (!isAuthorized(message, g)) {
      return message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          simplePanel(
            "Quarantine  ·  Unauthorized",
            "Only the server owner or extra-owners can use this command.",
          ),
        ],
      });
    }

    
    const targetUser =
      message.mentions.users.first() ??
      (await client.users.fetch(args[0]).catch(() => null));

    if (!targetUser) {
      return message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          simplePanel(
            "Quarantine  ·  Invalid Usage",
            "Please mention a user or provide a valid user ID.\n\n`quarantineadd @user [reason]`",
          ),
        ],
      });
    }

    if (targetUser.id === message.guild.ownerId) {
      return message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          simplePanel(
            "Quarantine  ·  Forbidden",
            "The server owner cannot be quarantined.",
          ),
        ],
      });
    }

    
    const reasonArgs = args
      .slice(message.mentions.users.size > 0 ? 1 : 1)
      .join(" ")
      .trim();
    const reason = `Quarantine by ${message.author.tag}${reasonArgs ? `: ${reasonArgs}` : ""}`;

    
    try {
      await client.sntl.AntinukePunish(message.guild, g, targetUser.id, reason);
    } catch (err) {
      client.logger?.error(
        `[QUARANTINE ADD] AntinukePunish failed: ${err.message}`,
      );
      return message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          simplePanel(
            "Quarantine  ·  Failed",
            `The punish pipeline encountered an error.\n\`${err.message}\``,
          ),
        ],
      });
    }

    
    const member = await message.guild.members
      .fetch(targetUser.id)
      .catch(() => null);
    const tag = member ? member.user.tag : targetUser.tag;

    return message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [
        new ContainerBuilder()
          .addTextDisplayComponents(text(`## Quarantine  ·  Subject Added`))
          .addSectionComponents(
            new SectionBuilder()
              .addTextDisplayComponents(
                text(`**User**\n${tag}\n\`${targetUser.id}\``),
              )
              .setButtonAccessory(
                new ButtonBuilder()
                  .setCustomId("_noop_user")
                  .setLabel("Subject")
                  .setStyle(ButtonStyle.Secondary)
                  .setDisabled(true),
              ),
          )
          .addSectionComponents(
            new SectionBuilder()
              .addTextDisplayComponents(text(`**Reason**\n${reason}`))
              .setButtonAccessory(
                new ButtonBuilder()
                  .setCustomId("_noop_reason")
                  .setLabel("Reason")
                  .setStyle(ButtonStyle.Secondary)
                  .setDisabled(true),
              ),
          )
          .addSectionComponents(
            new SectionBuilder()
              .addTextDisplayComponents(
                text(`**Actioned by**\n${message.author.tag}`),
              )
              .setButtonAccessory(
                new ButtonBuilder()
                  .setCustomId("_noop_by")
                  .setLabel("Operator")
                  .setStyle(ButtonStyle.Secondary)
                  .setDisabled(true),
              ),
          ),
      ],
    });
  },
};
