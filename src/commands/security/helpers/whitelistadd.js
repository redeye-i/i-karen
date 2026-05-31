const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const Antinuke = require("../../../models/antinuke");
const AntiNukeMemory = require("../../../core/antinukeMemory");

const PERMISSIONS = [
  "role_delete",
  "role_create",
  "role_update",
  "role_add",
  "role_remove",
  "channel_create",
  "channel_delete",
  "channel_update",
  "member_kick",
  "member_ban",
  "member_unban",
  "bot_add",
  "webhook_create",
  "webhook_update",
  "guild_update",
  "emoji_create",
  "emoji_delete",
  "integration_create",
  "integration_delete",
  "sticker_create",
  "sticker_delete",
  "thread_delete",
  "role_mention",
];

function prettyName(key) {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getUserId(input) {
  return input?.replace(/[<@!>]/g, "");
}

function buildPanel(title, content) {
  return new ContainerBuilder().addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`## ${title}\n${content}`),
  );
}

async function whitelistadd(client, message, args) {
  if (!message.guild) return;

  const sub = (args[0] || "").toLowerCase();
  if (sub !== "add") return;

  const data = await Antinuke.findById(message.guild.id);

  const isAllowed =
    message.author.id === message.guild.ownerId ||
    data.extraowner?.includes(message.author.id);

  if (!isAllowed) {
    return message.reply("#- Only owner / co-owner can use this.");
  }

  const raw = args[1];
  if (!raw) {
    return message.reply("#- Usage: whitelist add @user/@role");
  }

  const userId = getUserId(raw);

  const target = await client.users.fetch(userId).catch(() => null);
  if (!target) {
    return message.reply("Invalid user ID or user not found.");
  }

  const selectId = `wl_${message.id}`;
  const confirmId = `cf_${message.id}`;
  const cancelId = `cl_${message.id}`;

  let selected = [];

  const menu = new StringSelectMenuBuilder()
    .setCustomId(selectId)
    .setPlaceholder("Select permissions")
    .setMinValues(1)
    .setMaxValues(PERMISSIONS.length + 1)
    .addOptions(
      {
        label: "All Permissions",
        value: "all",
      },
      ...PERMISSIONS.map((p) => ({
        label: prettyName(p),
        value: p,
      })),
    );

  const msg = await message.reply({
    flags: MessageFlags.IsComponentsV2,
    components: [
      buildPanel("Whitelist Add", `Target: ${target.tag}`),
      new ActionRowBuilder().addComponents(menu),
    ],
  });

  const collector = msg.createMessageComponentCollector({
    time: 60000,
    filter: (i) => i.user.id === message.author.id,
  });

  collector.on("collect", async (i) => {
    if (i.customId === selectId) {
      if (i.values.includes("all")) {
        selected = [...PERMISSIONS];
      } else {
        selected = i.values;
      }

      return i.update({
        flags: MessageFlags.IsComponentsV2,
        components: [
          buildPanel(
            "Confirm",
            `Target: ${target.tag}\n\nPermissions:\n${selected.map((x) => `• ${prettyName(x)}`).join("\n")}`,
          ),
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(confirmId)
              .setLabel("Confirm")
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId(cancelId)
              .setLabel("Cancel")
              .setStyle(ButtonStyle.Secondary),
          ),
        ],
      });
    }

    if (i.customId === confirmId) {
      let current = data.whitelist.get(target.id) || [];

      const updated = [...new Set([...current, ...selected])];

      data.whitelist.set(target.id, updated);
      await data.save();
      const g = AntiNukeMemory.get(message.guild.id);
      g.whitelist.set(target.id, updated);
      AntiNukeMemory.set(message.guild.id, g);

      collector.stop();

      return i.update({
        flags: MessageFlags.IsComponentsV2,
        components: [
          buildPanel("Done", `Whitelist updated for ${target.tag}`),
        ],
      });
    }

    if (i.customId === cancelId) {
      collector.stop();

      return i.update({
        flags: MessageFlags.IsComponentsV2,
        components: [buildPanel("Cancelled", "No changes made.")],
      });
    }
  });

  collector.on("end", async (_, reason) => {
    if (reason === "time") {
      await msg
        .edit({
          flags: MessageFlags.IsComponentsV2,
          components: [buildPanel("Timeout", "No response.")],
        })
        .catch(() => { });
    }
  });
}

module.exports = { whitelistadd };
