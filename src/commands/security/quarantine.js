"use strict";



const {
  ContainerBuilder,
  TextDisplayBuilder,
  SectionBuilder,
  MessageFlags,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const AntiNukeMemory = require("../../core/antinukeMemory");
const quarantineRelease = require("./helpers/quarantinerelease");



function pretty(str) {
  return str.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatAge(timestamp) {
  if (!timestamp || isNaN(timestamp)) return "—";
  const diff = Date.now() - timestamp;
  const s = Math.floor(diff / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

function formatTimestamp(timestamp) {
  if (!timestamp || isNaN(timestamp)) return "—";
  return new Date(timestamp).toUTCString().replace(" GMT", " UTC");
}



function txt(content) {
  return new TextDisplayBuilder().setContent(content);
}


function simplePanel(header, body) {
  return new ContainerBuilder().addTextDisplayComponents(
    txt(`## ${header}\n${body}`),
  );
}


function row(label, value, badgeLabel) {
  return new SectionBuilder()
    .addTextDisplayComponents(txt(`**${label}**\n${value}`))
    .setButtonAccessory(
      new ButtonBuilder()
        .setCustomId(`_noop_${label.toLowerCase().replace(/\s+/g, "_")}`)
        .setLabel(badgeLabel ?? label)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
    );
}



async function buildListComponents(guild, entries, page, perPage) {
  const totalPages = Math.max(1, Math.ceil(entries.length / perPage));
  const slice = entries.slice(page * perPage, (page + 1) * perPage);

  const container = new ContainerBuilder();
  container.addTextDisplayComponents(
    txt(
      `## Quarantine  ·  Registry\nPage ${page + 1} of ${totalPages}  ·  ${entries.length} record${entries.length !== 1 ? "s" : ""} total`,
    ),
  );

  if (!slice.length) {
    container.addTextDisplayComponents(
      txt("No users are currently held under quarantine."),
    );
    return container;
  }

  for (const [id, entry] of slice) {
    const member = await guild.members.fetch(id).catch(() => null);
    const tag = member ? member.user.tag : "Unknown User";
    const reason = entry?.reason ?? "No reason recorded";
    const age = entry?.timestamp ? formatAge(entry.timestamp) : "—";

    container.addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          txt(`**${tag}**\n\`${id}\`\n${reason}\nHeld  ·  ${age}`),
        )
        .setButtonAccessory(
          new ButtonBuilder()
            .setCustomId(`_noop_${id}`)
            .setLabel("Quarantined")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),
        ),
    );
  }

  return container;
}

async function buildDropdown(guild, entries, page, perPage) {
  const slice = entries.slice(page * perPage, (page + 1) * perPage);

  if (!slice.length) {
    return new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("q_select")
        .setPlaceholder("Registry is empty")
        .setDisabled(true)
        .addOptions([{ label: "No data", value: "_none" }]),
    );
  }

  const options = await Promise.all(
    slice.slice(0, 25).map(async ([id, entry]) => {
      const member = await guild.members.fetch(id).catch(() => null);
      const tag = member ? member.user.tag : "Unknown User";
      const age = entry?.timestamp ? formatAge(entry.timestamp) : "?";
      return {
        label: tag.slice(0, 100),
        description: `${id}  ·  Held: ${age}`.slice(0, 100),
        value: id,
      };
    }),
  );

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("q_select")
      .setPlaceholder("Select a record to inspect...")
      .addOptions(options),
  );
}

function buildNavRow(page, totalEntries, perPage) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("q_prev")
      .setLabel("« Prev")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page === 0),

    new ButtonBuilder()
      .setCustomId("q_next")
      .setLabel("Next »")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled((page + 1) * perPage >= totalEntries),

    new ButtonBuilder()
      .setCustomId("q_refresh")
      .setLabel("Refresh")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("q_reset_all")
      .setLabel("Purge All")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(totalEntries === 0),
  );
}



function buildInspector(userId, entry, tag) {
  const reason = entry?.reason ?? "No reason recorded";
  const age = entry?.timestamp ? formatAge(entry.timestamp) : "—";
  const fullDate = formatTimestamp(entry?.timestamp ?? null);
  const actions =
    Array.isArray(entry?.actions) && entry.actions.length
      ? entry.actions.map((a) => `· ${pretty(a)}`).join("\n")
      : "None recorded";

  const container = new ContainerBuilder();
  container.addTextDisplayComponents(txt(`## Quarantine  ·  Subject File`));
  container.addSectionComponents(row("Subject", `${tag}\n\`${userId}\``, "ID"));
  container.addSectionComponents(row("Reason", reason, "Reason"));
  container.addSectionComponents(
    row("Held for", `${age}\nSince ${fullDate}`, "Duration"),
  );
  container.addSectionComponents(row("Trigger Actions", actions, "Actions"));
  return container;
}

function buildInspectorRow(userId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`q_release_${userId}`)
      .setLabel("Release Subject")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("q_back")
      .setLabel("« Back")
      .setStyle(ButtonStyle.Secondary),
  );
}



async function handleList(client, message) {
  const perPage = 5;
  let page = 0;

  const freshEntries = () => {
    const d = AntiNukeMemory.get(message.guild.id);
    return Array.from((d?.punishedUsers ?? new Map()).entries());
  };

  let entries = freshEntries();

  const buildFull = async () => {
    const container = await buildListComponents(message.guild, entries, page, perPage);
    container.addActionRowComponents(await buildDropdown(message.guild, entries, page, perPage));
    container.addActionRowComponents(buildNavRow(page, entries.length, perPage));

    return {
      flags: MessageFlags.IsComponentsV2,
      components: [container],
    };
  };

  const msg = await message.reply(await buildFull());

  const collector = msg.createMessageComponentCollector({
    filter: (i) => i.user.id === message.author.id,
    time: 180_000,
  });

  collector.on("collect", async (i) => {
    try {
      if (i.customId === "q_refresh") {
        entries = freshEntries();
        page = Math.min(
          page,
          Math.max(0, Math.ceil(entries.length / perPage) - 1),
        );
        return i.update(await buildFull());
      }

      if (i.customId === "q_next") {
        if ((page + 1) * perPage < entries.length) page++;
        return i.update(await buildFull());
      }

      if (i.customId === "q_prev") {
        if (page > 0) page--;
        return i.update(await buildFull());
      }

      
      if (i.customId === "q_reset_all") {
        const confirmContainer = new ContainerBuilder()
          .addTextDisplayComponents(txt(`## Quarantine  ·  Mass Release`))
          .addSectionComponents(
            row(
              "Warning",
              `You are about to release **${entries.length}** quarantined user${entries.length !== 1 ? "s" : ""}.\nThis cannot be reversed.`,
              "!",
            ),
          );
        confirmContainer.addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("q_confirm_reset")
              .setLabel("Confirm Release All")
              .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
              .setCustomId("q_abort_reset")
              .setLabel("Abort")
              .setStyle(ButtonStyle.Secondary),
          ),
        );

        return i.update({
          flags: MessageFlags.IsComponentsV2,
          components: [confirmContainer],
        });
      }

      if (i.customId === "q_abort_reset") {
        entries = freshEntries();
        return i.update(await buildFull());
      }

      if (i.customId === "q_confirm_reset") {
        const targets = freshEntries().map(([id]) => id);
        let released = 0,
          failed = 0;
        const failLog = [];

        for (const userId of targets) {
          const res = await quarantineRelease(
            client,
            message.guild,
            userId,
            message.author.id,
          );
          if (res.success) released++;
          else {
            failed++;
            failLog.push(`· \`${userId}\`  ${res.reason}`);
          }
        }

        entries = [];
        page = 0;

        const resultContainer = new ContainerBuilder()
          .addTextDisplayComponents(
            txt(`## Quarantine  ·  Mass Release Complete`),
          )
          .addSectionComponents(row("Released", `${released}`, "OK"))
          .addSectionComponents(row("Failed", `${failed}`, "ERR"))
          .addSectionComponents(row("Total", `${targets.length}`, "#"));

        if (failLog.length) {
          resultContainer.addTextDisplayComponents(
            txt(
              `**Failures**\n${failLog.slice(0, 10).join("\n")}${failLog.length > 10 ? `\n· ...and ${failLog.length - 10} more` : ""}`,
            ),
          );
        }

        return i.update({
          flags: MessageFlags.IsComponentsV2,
          components: [resultContainer],
        });
      }

      
      if (i.customId === "q_select") {
        const userId = i.values[0];
        if (userId === "_none") return i.deferUpdate();

        const d = AntiNukeMemory.get(message.guild.id);
        const entry = d?.punishedUsers?.get(userId);
        const member = await message.guild.members
          .fetch(userId)
          .catch(() => null);
        const tag = member ? member.user.tag : userId;
        const inspector = buildInspector(userId, entry, tag);
        inspector.addActionRowComponents(buildInspectorRow(userId));

        return i.update({
          flags: MessageFlags.IsComponentsV2,
          components: [inspector],
        });
      }

      
      if (i.customId.startsWith("q_release_")) {
        const userId = i.customId.slice("q_release_".length);
        const res = await quarantineRelease(
          client,
          message.guild,
          userId,
          message.author.id,
        );

        entries = freshEntries();
        page = Math.min(
          page,
          Math.max(0, Math.ceil(entries.length / perPage) - 1),
        );

        if (res.success) {
          const releasedPanel = simplePanel("Quarantine Released", `Subject \`${userId}\` has been released. Quarantine role stripped.`);
          releasedPanel.addActionRowComponents(await buildDropdown(message.guild, entries, page, perPage));
          releasedPanel.addActionRowComponents(buildNavRow(page, entries.length, perPage));

          return i.update({
            flags: MessageFlags.IsComponentsV2,
            components: [releasedPanel],
          });
        } else {
          const failedPanel = simplePanel("Quarantine Release Failed", res.reason);
          failedPanel.addActionRowComponents(
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId("q_back")
                .setLabel("Back")
                .setStyle(ButtonStyle.Secondary),
            ),
          );

          return i.update({
            flags: MessageFlags.IsComponentsV2,
            components: [failedPanel],
          });
        }
      }

      
      if (i.customId === "q_back") {
        entries = freshEntries();
        page = Math.min(
          page,
          Math.max(0, Math.ceil(entries.length / perPage) - 1),
        );
        return i.update(await buildFull());
      }
    } catch (err) {
      console.error("[QUARANTINE] Collector error:", err);
      await i.deferUpdate().catch(() => {});
    }
  });

  collector.on("end", async () => {
    await msg
      .edit({
        flags: MessageFlags.IsComponentsV2,
        components: [
          simplePanel(
            "Quarantine  ·  Closed",
            "This session has expired. Run the command again to reopen.",
          ),
        ],
      })
      .catch(() => {});
  });
}



async function handleRelease(client, message, args) {
  const userId =
    message.mentions.users.first()?.id ??
    args.find((a) => /^\d{17,20}$/.test(a));

  if (!userId) {
    return message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [
        simplePanel(
          "Quarantine  ·  Invalid Usage",
          "Please mention a user or provide a valid user ID.\n\n`quarantine release @user`",
        ),
      ],
    });
  }

  const res = await quarantineRelease(
    client,
    message.guild,
    userId,
    message.author.id,
  );
  const member = await message.guild.members.fetch(userId).catch(() => null);
  const tag = member ? member.user.tag : userId;

  if (res.success) {
    return message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [
        new ContainerBuilder()
          .addTextDisplayComponents(txt(`## Quarantine  ·  Subject Released`))
          .addSectionComponents(row("Subject", `${tag}\n\`${userId}\``, "ID"))
          .addSectionComponents(
            row(
              "Status",
              "Released from quarantine. Role stripped successfully.",
              "OK",
            ),
          ),
      ],
    });
  } else {
    return message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [simplePanel("Quarantine  ·  Release Failed", res.reason)],
    });
  }
}

async function handleView(client, message, args, data) {
  const userId =
    message.mentions.users.first()?.id ??
    args.find((a) => /^\d{17,20}$/.test(a));

  if (!userId) {
    return message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [
        simplePanel(
          "Quarantine View",
          "Please mention a user or provide a valid user ID.\n\n`quarantine view @user`",
        ),
      ],
    });
  }

  const entry = data.punishedUsers?.get(userId);
  const member = await message.guild.members.fetch(userId).catch(() => null);
  const tag = member ? member.user.tag : userId;
  const hasRole = data.quarantineRoleId && member?.roles.cache.has(data.quarantineRoleId);

  if (!entry && !hasRole) {
    return message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [simplePanel("Quarantine View", `No quarantine data found for \`${userId}\`.`)],
    });
  }

  const container = new ContainerBuilder()
    .addTextDisplayComponents(txt(`## Quarantine View`))
    .addSectionComponents(row("Subject", `${tag}\n\`${userId}\``, "ID"))
    .addSectionComponents(row("Role Applied", hasRole ? "Yes" : "No", "Role"))
    .addSectionComponents(row("Reason", entry?.reason || "No reason recorded", "Reason"))
    .addSectionComponents(row("Action", entry?.action || "quarantine", "Action"))
    .addSectionComponents(row("Since", entry?.punishedAt ? formatTimestamp(new Date(entry.punishedAt).getTime()) : "Unknown", "Time"));

  return message.reply({
    flags: MessageFlags.IsComponentsV2,
    components: [container],
    allowedMentions: { repliedUser: true },
  });
}



async function handleResetAll(client, message, data) {
  const punishedUsers = data.punishedUsers ?? new Map();
  const total = punishedUsers.size;

  if (total === 0) {
    return message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [
        simplePanel(
          "Quarantine  ·  Registry Empty",
          "No users are currently under quarantine.",
        ),
      ],
    });
  }

  const confirmContainer = new ContainerBuilder()
    .addTextDisplayComponents(txt(`## Quarantine  ·  Mass Release`))
    .addSectionComponents(
      row(
        "Warning",
        `You are about to release **${total}** quarantined user${total !== 1 ? "s" : ""}.\nThis cannot be reversed.`,
        "!",
      ),
    );
  confirmContainer.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("qra_confirm")
        .setLabel("Confirm Release All")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("qra_abort")
        .setLabel("Abort")
        .setStyle(ButtonStyle.Secondary),
    ),
  );

  const confirmMsg = await message.reply({
    flags: MessageFlags.IsComponentsV2,
    components: [confirmContainer],
  });

  const collector = confirmMsg.createMessageComponentCollector({
    filter: (i) => i.user.id === message.author.id,
    time: 30_000,
    max: 1,
  });

  collector.on("collect", async (i) => {
    if (i.customId === "qra_abort") {
      return i.update({
        flags: MessageFlags.IsComponentsV2,
        components: [
          simplePanel(
            "Quarantine  ·  Aborted",
            "Operation aborted. No users were released.",
          ),
        ],
      });
    }

    if (i.customId === "qra_confirm") {
      const allIds = Array.from(punishedUsers.keys());
      let released = 0,
        failed = 0;
      const failLog = [];

      for (const userId of allIds) {
        const res = await quarantineRelease(
          client,
          message.guild,
          userId,
          message.author.id,
        );
        if (res.success) released++;
        else {
          failed++;
          failLog.push(`· \`${userId}\`  ${res.reason}`);
        }
      }

      const resultContainer = new ContainerBuilder()
        .addTextDisplayComponents(
          txt(`## Quarantine  ·  Mass Release Complete`),
        )
        .addSectionComponents(row("Released", `${released}`, "OK"))
        .addSectionComponents(row("Failed", `${failed}`, "ERR"))
        .addSectionComponents(row("Total", `${allIds.length}`, "#"));

      if (failLog.length) {
        resultContainer.addTextDisplayComponents(
          txt(
            `**Failures**\n${failLog.slice(0, 10).join("\n")}${failLog.length > 10 ? `\n· ...and ${failLog.length - 10} more` : ""}`,
          ),
        );
      }

      return i.update({
        flags: MessageFlags.IsComponentsV2,
        components: [resultContainer],
      });
    }
  });

  collector.on("end", (collected) => {
    if (collected.size === 0) {
      confirmMsg
        .edit({
          flags: MessageFlags.IsComponentsV2,
          components: [
            simplePanel(
              "Quarantine  ·  Timed Out",
              "Confirmation window expired. No users were released.",
            ),
          ],
        })
        .catch(() => {});
    }
  });
}



function isAuthorized(message, data) {
  return (
    message.author.id === message.guild.ownerId ||
    (data.extraOwners?.has(message.author.id) ?? false)
  );
}



function buildHelp() {
  return new ContainerBuilder()
    .addTextDisplayComponents(txt(`## Quarantine  ·  Help`))
    .addSectionComponents(
      row(
        "quarantine list",
        "Open the paginated quarantine registry panel.\nAliases: `panel`",
        "list",
      ),
    )
    .addSectionComponents(
      row(
        "quarantine release <@user | id>",
        "Release a specific user from quarantine.\nAliases: `free` `unquarantine`",
        "release",
      ),
    )
    .addSectionComponents(
      row(
        "quarantine view <@user | id>",
        "Inspect stored quarantine reason, action, and role status.",
        "view",
      ),
    )
    .addSectionComponents(
      row(
        "quarantine resetall",
        "Release all quarantined users at once.\nAliases: `reset` `clearall`",
        "resetall",
      ),
    )
    .addSectionComponents(
      row(
        "quarantineadd <@user | id> [reason]",
        "Manually quarantine a user via the antinuke pipeline.\nAliases: `qadd` `qforce`",
        "add",
      ),
    )
    .addSectionComponents(
      row("Access", "Server Owner  ·  Extra Owners only", "Restricted"),
    );
}



module.exports = {
  name: "quarantine",
  aliases: ["quar", "q"],
  category: "security",

  run: async (client, message, args) => {
    if (!message.guild) return;

    const data = AntiNukeMemory.get(message.guild.id);

    if (!data?.enabled) {
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

    if (!isAuthorized(message, data)) {
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

    const sub = (args[0] ?? "").toLowerCase();

    switch (sub) {
      case "list":
      case "panel":
        return handleList(client, message);

      case "release":
      case "free":
      case "unquarantine":
        return handleRelease(client, message, args.slice(1));

      case "view":
      case "inspect":
        return handleView(client, message, args.slice(1), data);

      case "resetall":
      case "reset":
      case "clearall":
        return handleResetAll(client, message, data);

      default:
        return message.reply({
          flags: MessageFlags.IsComponentsV2,
          components: [buildHelp()],
        });
    }
  },
};
