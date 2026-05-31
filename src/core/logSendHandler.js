"use strict";

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SectionBuilder,
  MessageFlags,
  SeparatorBuilder,
  ThumbnailBuilder,
  SeparatorSpacingSize,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const antinuke = require("../models/antinuke.js");

class logSendHandler {
  constructor(client) {
    this.client = client;
  }

  async send(guild, g, data) {
    try {
      const { executorId, actionType, reason, targetDetails } = data;

      if (!g.logChannel) {
        console.warn(
          `[LOG DEBUG] No logChannel set for guild: ${guild.id} (${guild.name})`,
        );
        return;
      }

      console.log(`[LOG DEBUG] Sending log for ${actionType} in ${guild.id}`);

      const executor = await guild.members.fetch(executorId).catch(() => null);
      const logChannel = await guild.channels
        .fetch(g.logChannel)
        .catch((err) => {
          console.error(
            `[LOG DEBUG] Failed to fetch channel ${g.logChannel}:`,
            err.message,
          );
          return null;
        });

      if (!logChannel) {
        console.error(`[LOG DEBUG] Log channel ${g.logChannel} not found.`);
        return;
      }

      if (!logChannel.isTextBased()) {
        console.error(
          `[LOG DEBUG] Log channel ${logChannel.name} is not text-based.`,
        );
        return;
      }

      const timestamp = `<t:${Math.floor(Date.now() / 1000)}:F>`;
      const avatarURL =
        executor?.user?.displayAvatarURL?.() ||
        `https://api.dicebear.com/7.x/identicon/png?seed=${executorId}`;

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            [
              `## ⚔ Anti-Nuke Response`,
              `-# Automated protection active in **${guild.name}**`,
            ].join("\n"),
          ),
        )
        .addSeparatorComponents(
          new SeparatorBuilder()
            .setSpacing(SeparatorSpacingSize.Small)
            .setDivider(true),
        )
        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                [`-# ◆  EXECUTOR`, `<@${executorId}>`].join("\n"),
              ),
            )
            .setThumbnailAccessory(new ThumbnailBuilder().setURL(avatarURL)),
        )
        .addSeparatorComponents(
          new SeparatorBuilder()
            .setSpacing(SeparatorSpacingSize.Small)
            .setDivider(false),
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            [`-# ◆  ACTION`, `\`${actionType.toUpperCase()}\``].join("\n"),
          ),
        )
        .addSeparatorComponents(
          new SeparatorBuilder()
            .setSpacing(SeparatorSpacingSize.Small)
            .setDivider(true),
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            [`-# ◆  DETAILS`, `> ${reason}`, `> Target: ${targetDetails}`].join(
              "\n",
            ),
          ),
        )
        .addSeparatorComponents(
          new SeparatorBuilder()
            .setSpacing(SeparatorSpacingSize.Small)
            .setDivider(false),
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            [`-# ◆  TIMESTAMP`, `-# ${timestamp}`].join("\n"),
          ),
        )
        .addSeparatorComponents(
          new SeparatorBuilder()
            .setSpacing(SeparatorSpacingSize.Small)
            .setDivider(true),
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `-# ▸ Anti-Nuke Recovery System Active  •  Sentinal Protocol`,
          ),
        );

      if (g.notifyowners) {
        const ownersToNotify = new Set([guild.ownerId]);
        if (g.extraOwners) {
          g.extraOwners.forEach((id) => ownersToNotify.add(id));
        }

        for (const ownerId of ownersToNotify) {
          const owner = await guild.members.fetch(ownerId).catch(() => null);
          if (owner) {
            await owner
              .send({
                components: [container],
                flags: MessageFlags.IsComponentsV2,
              })
              .catch((err) =>
                console.warn(
                  `[LOG DEBUG] DM owner fail (${ownerId}): ${err.message}`,
                ),
              );
          }
        }
      }

      await logChannel
        .send({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
        })
        .then(() => console.log(`[LOG DEBUG] Success.`))
        .catch((err) => {
          console.error(`[LOG DEBUG] Channel send error:`, err);
        });
    } catch (err) {
      console.error(`[LOG SEND HANDLER CRITICAL ERROR]: ${err}`, err);
    }
  }
}

module.exports = logSendHandler;
