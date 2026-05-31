"use strict";

const {
    PermissionFlagsBits,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    RoleSelectMenuBuilder,
    ChannelSelectMenuBuilder,
    ChannelType,
    MessageFlags,
} = require("discord.js");

const AutomodModel = require("../../models/automod");

const SAFE_DOMAINS = new Set(["tenor.com", "giphy.com", "cdn.discordapp.com", "media.discordapp.net"]);
const URL_REGEX = /\b(?:https?:\/\/)?(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*)/gi;
const INVITE_REGEX = /(?:https?:\/\/)?(?:www\.)?(?:discord(?:app)?\.(?:gg|com\/invite)|dsc\.gg|dis\.gd)\/([\w-]{2,32})/gi;
const INVITE_DOMAINS = new Set(["discord.gg", "discord.com", "discordapp.com", "dsc.gg", "dis.gd"]);

const MAX_WL = 15;
const MAX_LINKS = 15;
const TOTAL_PAGES = 4;
const COLLECTOR_TIMEOUT = 180_000;

const PUNISH_LABELS = {
    kick: "Kick",
    ban: "Ban",
    mute: "Mute",
    warn: "Warn",
    none: "None",
};

const AC = {
    gray: 0x24272C
};

const CID = {
    PREV: "am_p", NEXT: "am_n", SAVE: "am_s", CANCEL: "am_c",
    AL_TGL: "al_t", AL_ROLE: "al_r", AL_CHAN: "al_ch", AL_ADD: "al_a", AL_REM: "al_rm",
    AI_TGL: "ai_t", AI_ROLE: "ai_r", AI_CHAN: "ai_ch",
    AS_TGL: "as_t", AS_ROLE: "as_r", AS_CHAN: "as_ch", AS_T_UP: "as_tu", AS_T_DN: "as_td", AS_W_UP: "as_wu", AS_W_DN: "as_wd",
    AM_TGL: "am_t", AM_ROLE: "am_r", AM_CHAN: "am_ch", AM_T_UP: "am_tu", AM_T_DN: "am_td",
    PUNISH: "am_pun",
    VIEW: "am_v"
};

const AutomodCache = new Map();
const SpamBuckets = new Map();
const MentionBuckets = new Map();

function buildCacheEntry(doc) {
    return {
        antilink: {
            enabled: doc?.antilink?.enabled ?? false,
            wlrole: doc?.antilink?.wlrole ?? [],
            allowedlink: doc?.antilink?.allowedlink ?? [],
            wlchannel: doc?.antilink?.wlchannel ?? [],
        },
        antiinvite: {
            enabled: doc?.antiinvite?.enabled ?? false,
            wlrole: doc?.antiinvite?.wlrole ?? [],
            wlchannel: doc?.antiinvite?.wlchannel ?? [],
        },
        antispam: {
            enabled: doc?.antispam?.enabled ?? false,
            threshold: doc?.antispam?.threshold ?? 5,
            window: doc?.antispam?.window ?? 5,
            wlrole: doc?.antispam?.wlrole ?? [],
            wlchannel: doc?.antispam?.wlchannel ?? [],
        },
        antimention: {
            enabled: doc?.antimention?.enabled ?? false,
            threshold: doc?.antimention?.threshold ?? 5,
            wlrole: doc?.antimention?.wlrole ?? [],
            wlchannel: doc?.antimention?.wlchannel ?? [],
        },
        punishment: doc?.punishment ?? "none",
    };
}

async function loadAutomodCache() {
    try {
        const docs = await AutomodModel.find({}).lean();
        for (const doc of docs) AutomodCache.set(doc.guildid, buildCacheEntry(doc));
    } catch (e) {
        console.error("[Automod] Initialisation failed:", e);
    }
}

async function saveAutomodConfig(guildId, state) {
    AutomodCache.set(guildId, state);
    await AutomodModel.findOneAndUpdate({ guildid: guildId }, { $set: state }, { upsert: true });
}

async function handleViolation(message, punishment, reason) {
    try {
        const deleted = await message.delete().catch(() => null);
        if (deleted === null) return false;

        const member = message.member || await message.guild.members.fetch(message.author.id).catch(() => null);
        if (!member) return true;

        const bot = message.guild.members.me;
        if (bot && member.roles.highest.position >= bot.roles.highest.position) return true;

        const fullReason = `Automod: ${reason}`;
        switch (punishment) {
            case "kick": await member.kick(fullReason).catch(() => { }); break;
            case "ban": await member.ban({ reason: fullReason }).catch(() => { }); break;
            case "mute": await member.timeout(10 * 60 * 1000, fullReason).catch(() => { }); break;
            case "warn":
                const warnC = new ContainerBuilder().addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`## Automod Notification\nYour message in **${message.guild.name}** was removed for: **${reason}**.`)
                );
                await member.user.send({ components: [warnC], flags: MessageFlags.IsComponentsV2 }).catch(() => { });
                break;
        }

        const notice = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`### Automod Protection\n> ${message.author}, your message was removed for **${reason}**.`)
            );

        message.channel.send({
            components: [notice],
            flags: MessageFlags.IsComponentsV2
        }).then(msg => {
            setTimeout(() => msg.delete().catch(() => { }), 6000);
        }).catch(() => { });

        return true;
    } catch (e) {
        return false;
    }
}

function isWhitelisted(message, featureCfg) {
    if (featureCfg.wlchannel.includes(message.channel.id)) return true;
    if (message.channel.parentId && featureCfg.wlchannel.includes(message.channel.parentId)) return true;
    if (message.member?.roles.cache.some(r => featureCfg.wlrole.includes(r.id))) return true;
    return false;
}

async function runAntiLink(message, config) {
    const al = config.antilink;
    if (!al.enabled || isWhitelisted(message, al)) return false;
    const urls = [...message.content.matchAll(URL_REGEX)].map(m => m[0]);
    for (const url of urls) {
        try {
            const domain = new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, "").toLowerCase();
            if (INVITE_DOMAINS.has(domain) || SAFE_DOMAINS.has(domain)) continue;
            if (al.allowedlink.some(e => domain === e || domain.endsWith(`.${e}`))) continue;
            return await handleViolation(message, config.punishment, "Forbidden Link");
        } catch (e) { }
    }
    return false;
}

async function runAntiInvite(message, config) {
    const ai = config.antiinvite;
    if (!ai.enabled || isWhitelisted(message, ai)) return false;
    const codes = [...message.content.matchAll(INVITE_REGEX)].map(m => m[1]);
    for (const code of codes) {
        const inv = await message.client.fetchInvite(code).catch(() => null);
        if (inv?.guild?.id === message.guild.id || message.guild.vanityURLCode === code) continue;
        return await handleViolation(message, config.punishment, "Server Invite");
    }
    return false;
}

async function runAntiSpam(message, config) {
    const as = config.antispam;
    if (!as.enabled || isWhitelisted(message, as)) return false;
    if (!SpamBuckets.has(message.guild.id)) SpamBuckets.set(message.guild.id, new Map());
    const gBuckets = SpamBuckets.get(message.guild.id);
    if (!gBuckets.has(message.author.id)) gBuckets.set(message.author.id, []);

    const now = Date.now();
    const stamps = gBuckets.get(message.author.id);
    stamps.push(now);
    const cutoff = now - (as.window * 1000);
    while (stamps.length > 0 && stamps[0] < cutoff) stamps.shift();

    if (stamps.length >= as.threshold) {
        stamps.length = 0;
        return await handleViolation(message, config.punishment, "Spamming");
    }
    return false;
}

async function runAntiMention(message, config) {
    const am = config.antimention;
    if (!am.enabled || isWhitelisted(message, am)) return false;
    const mCount = message.mentions.users.size + message.mentions.roles.size + (message.mentions.everyone ? 1 : 0);
    if (mCount === 0) return false;

    if (!MentionBuckets.has(message.guild.id)) MentionBuckets.set(message.guild.id, new Map());
    const gBuckets = MentionBuckets.get(message.guild.id);
    if (!gBuckets.has(message.author.id)) gBuckets.set(message.author.id, { count: 0, last: Date.now() });

    const entry = gBuckets.get(message.author.id);
    if (Date.now() - entry.last > 10_000) entry.count = 0;
    entry.count += mCount;
    entry.last = Date.now();

    if (entry.count >= am.threshold) {
        entry.count = 0;
        return await handleViolation(message, config.punishment, "Mass Mention");
    }
    return false;
}

async function checker(message) {
    try {
        if (message.author.bot || !message.guild) return;
        const config = AutomodCache.get(message.guild.id);
        if (!config) return;

        
        if (message.author.id === message.guild.ownerId) return;
        if (message.member?.permissions.has(PermissionFlagsBits.Administrator)) return;

        
        if (await runAntiLink(message, config)) return;
        if (await runAntiInvite(message, config)) return;
        if (await runAntiSpam(message, config)) return;
        await runAntiMention(message, config);
    } catch (e) {
        console.error("[Automod] Checker Error:", e);
    }
}

const div = () => new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small);
const status = (e) => e ? "Enabled" : "Disabled";

function commonRows(page, state) {
    return [
        new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder().setCustomId(CID.PUNISH).setPlaceholder(`Global Punishment: ${PUNISH_LABELS[state.punishment] ?? "None"}`)
                .addOptions(Object.entries(PUNISH_LABELS).map(([v, l]) => ({ label: l, value: v, default: state.punishment === v })))
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(CID.PREV).setLabel("Previous").setStyle(ButtonStyle.Secondary).setDisabled(page === 1),
            new ButtonBuilder().setCustomId("page_label").setLabel(`Page ${page} of ${TOTAL_PAGES}`).setStyle(ButtonStyle.Secondary).setDisabled(true),
            new ButtonBuilder().setCustomId(CID.NEXT).setLabel("Next").setStyle(ButtonStyle.Secondary).setDisabled(page === TOTAL_PAGES)
        )
    ];
}

function getControlComponent(page, state) {
    const modules = ["antilink", "antiinvite", "antispam", "antimention"];
    const labels = ["Anti-Link", "Anti-Invite", "Anti-Spam", "Anti-Mention"];
    const key = modules[page - 1];
    const name = labels[page - 1];
    const active = state[key].enabled;

    return new ContainerBuilder().addActionRowComponents(
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`toggle_current`).setLabel(`${active ? "Disable" : "Enable"} ${name}`).setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(CID.SAVE).setLabel("Save changes").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(CID.CANCEL).setLabel("Discard").setStyle(ButtonStyle.Secondary)
        )
    );
}

function buildPage1(state) {
    const al = state.antilink;
    return new ContainerBuilder()
        .setAccentColor(AC.gray)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `## Anti-Link Configuration\n` +
            `> **Status** - ${status(al.enabled)}\n` +
            `> **Whitelists** - ${al.wlrole.length} Roles / ${al.wlchannel.length} Channels\n` +
            `> **Domains** - ${al.allowedlink.length} Total`
        ))
        .addSeparatorComponents(div())
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(new RoleSelectMenuBuilder().setCustomId(CID.AL_ROLE).setPlaceholder("Whitelist Roles")),
            new ActionRowBuilder().addComponents(new ChannelSelectMenuBuilder().setCustomId(CID.AL_CHAN).setPlaceholder("Whitelist Channels")),
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(CID.AL_ADD).setLabel("Add domain").setStyle(ButtonStyle.Secondary).setDisabled(al.allowedlink.length >= MAX_LINKS),
                new ButtonBuilder().setCustomId(CID.AL_REM).setLabel("Clear list").setStyle(ButtonStyle.Secondary).setDisabled(al.allowedlink.length === 0)
            ),
            ...commonRows(1, state)
        );
}

function buildPage2(state) {
    const ai = state.antiinvite;
    return new ContainerBuilder()
        .setAccentColor(AC.gray)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `## Anti-Invite Configuration\n` +
            `> **Status** - ${status(ai.enabled)}\n` +
            `> **Whitelists** - ${ai.wlrole.length} Roles / ${ai.wlchannel.length} Channels`
        ))
        .addSeparatorComponents(div())
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(new RoleSelectMenuBuilder().setCustomId(CID.AI_ROLE).setPlaceholder("Whitelist Roles")),
            new ActionRowBuilder().addComponents(new ChannelSelectMenuBuilder().setCustomId(CID.AI_CHAN).setPlaceholder("Whitelist Channels")),
            ...commonRows(2, state)
        );
}

function buildPage3(state) {
    const as = state.antispam;
    return new ContainerBuilder()
        .setAccentColor(AC.gray)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `## Anti-Spam Configuration\n` +
            `> **Status** - ${status(as.enabled)}\n` +
            `> **Threshold** - ${as.threshold} msgs / ${as.window}s\n` +
            `> **Whitelists** - ${as.wlrole.length} Roles / ${as.wlchannel.length} Channels`
        ))
        .addSeparatorComponents(div())
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(new RoleSelectMenuBuilder().setCustomId(CID.AS_ROLE).setPlaceholder("Whitelist Roles")),
            new ActionRowBuilder().addComponents(new ChannelSelectMenuBuilder().setCustomId(CID.AS_CHAN).setPlaceholder("Whitelist Channels")),
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(CID.AS_T_DN).setLabel("-1 msg").setStyle(ButtonStyle.Secondary).setDisabled(as.threshold <= 2),
                new ButtonBuilder().setCustomId(CID.AS_T_UP).setLabel("+1 msg").setStyle(ButtonStyle.Secondary).setDisabled(as.threshold >= 20),
                new ButtonBuilder().setCustomId(CID.AS_W_DN).setLabel("-1s").setStyle(ButtonStyle.Secondary).setDisabled(as.window <= 2),
                new ButtonBuilder().setCustomId(CID.AS_W_UP).setLabel("+1s").setStyle(ButtonStyle.Secondary).setDisabled(as.window >= 30)
            ),
            ...commonRows(3, state)
        );
}

function buildPage4(state) {
    const am = state.antimention;
    return new ContainerBuilder()
        .setAccentColor(AC.gray)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `## Anti-Mention Configuration\n` +
            `> **Status** - ${status(am.enabled)}\n` +
            `> **Limit** - ${am.threshold} / message\n` +
            `> **Whitelists** - ${am.wlrole.length} Roles / ${am.wlchannel.length} Channels`
        ))
        .addSeparatorComponents(div())
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(new RoleSelectMenuBuilder().setCustomId(CID.AM_ROLE).setPlaceholder("Whitelist Roles")),
            new ActionRowBuilder().addComponents(new ChannelSelectMenuBuilder().setCustomId(CID.AM_CHAN).setPlaceholder("Whitelist Channels")),
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(CID.AM_T_DN).setLabel("-1 mention").setStyle(ButtonStyle.Secondary).setDisabled(am.threshold <= 2),
                new ButtonBuilder().setCustomId(CID.AM_T_UP).setLabel("+1 mention").setStyle(ButtonStyle.Secondary).setDisabled(am.threshold >= 50)
            ),
            ...commonRows(4, state)
        );
}

function buildViewPage(state) {
    const c = new ContainerBuilder()
        .setAccentColor(AC.gray)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## Automod Overview`));

    c.addSeparatorComponents(div());
    c.addTextDisplayComponents(new TextDisplayBuilder().setContent(`> **Global Punishment** - ${PUNISH_LABELS[state.punishment] || "Delete Only"}`));

    const features = [
        { name: "Anti-Link", key: "antilink" },
        { name: "Anti-Invite", key: "antiinvite" },
        { name: "Anti-Spam", key: "antispam" },
        { name: "Anti-Mention", key: "antimention" }
    ];

    for (const feat of features) {
        const data = state[feat.key];
        const roles = data.wlrole.length ? data.wlrole.map(r => `<@&${r}>`).join(", ") : "None";
        const chans = data.wlchannel.length ? data.wlchannel.map(ch => `<#${ch}>`).join(", ") : "None";

        let extra = "";
        if (feat.key === "antilink") extra = `\n> **Domains** - ${data.allowedlink.length ? data.allowedlink.join(", ") : "Default"}`;
        if (feat.key === "antispam") extra = `\n> **Trigger** - ${data.threshold} msgs in ${data.window}s`;
        if (feat.key === "antimention") extra = `\n> **Limit** - ${data.threshold}`;

        c.addSeparatorComponents(div());
        c.addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `### ${feat.name} [${data.enabled ? "Active" : "Inactive"}]\n` +
            `> **Roles** - ${roles}\n` +
            `> **Channels** - ${chans}${extra}`
        ));
    }

    return c;
}

module.exports = {
    name: "automod",
    aliases: ["amod", "am"],
    category: "security",
    run: async (client, message, args) => {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return client.util.container(message, `✗ | You don't have permission to use this command.`);
        const guildId = message.guild.id;
        const state = JSON.parse(JSON.stringify(AutomodCache.get(guildId) || buildCacheEntry({})));

        if (args[0]?.toLowerCase() === "view") {
            return message.reply({ components: [buildViewPage(state)], flags: MessageFlags.IsComponentsV2 });
        }

        if (args[0]?.toLowerCase() === "reset") {
            AutomodCache.delete(guildId);
            return client.util.container(message, `✗ | Automod configuration has been reset.`);
        }

        let page = 1;

        const render = () => [buildPage1, buildPage2, buildPage3, buildPage4][page - 1](state);
        const renderControls = () => getControlComponent(page, state);

        const panel = await message.reply({ components: [render()], flags: MessageFlags.IsComponentsV2 });
        const controls = await message.channel.send({ components: [renderControls()], flags: MessageFlags.IsComponentsV2 });

        const col = message.channel.createMessageComponentCollector({ filter: i => i.user.id === message.author.id, time: COLLECTOR_TIMEOUT });
        col.on("collect", async i => {
            const id = i.customId;

            
            if (id === CID.NEXT) { page++; await i.deferUpdate(); }
            else if (id === CID.PREV) { page--; await i.deferUpdate(); }

            
            else if (id === "toggle_current") {
                const modules = ["antilink", "antiinvite", "antispam", "antimention"];
                state[modules[page - 1]].enabled = !state[modules[page - 1]].enabled;
                await i.deferUpdate();
            }

            
            else if (id === CID.SAVE) {
                col.stop("s");
                await saveAutomodConfig(guildId, state);
                await panel.delete().catch(() => { });
                return i.update({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent("Automod configuration has been updated."))], flags: MessageFlags.IsComponentsV2 });
            }
            else if (id === CID.CANCEL) {
                col.stop();
                await panel.delete().catch(() => { });
                return i.update({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent("Configuration changes were discarded."))], flags: MessageFlags.IsComponentsV2 });
            }

            
            else if (id === CID.PUNISH) { state.punishment = i.values[0]; await i.deferUpdate(); }
            else if (id === CID.AL_ROLE) { const r = i.values[0]; if (state.antilink.wlrole.includes(r)) state.antilink.wlrole = state.antilink.wlrole.filter(x => x !== r); else if (state.antilink.wlrole.length < MAX_WL) state.antilink.wlrole.push(r); await i.deferUpdate(); }
            else if (id === CID.AI_ROLE) { const r = i.values[0]; if (state.antiinvite.wlrole.includes(r)) state.antiinvite.wlrole = state.antiinvite.wlrole.filter(x => x !== r); else if (state.antiinvite.wlrole.length < MAX_WL) state.antiinvite.wlrole.push(r); await i.deferUpdate(); }
            else if (id === CID.AS_ROLE) { const r = i.values[0]; if (state.antispam.wlrole.includes(r)) state.antispam.wlrole = state.antispam.wlrole.filter(x => x !== r); else if (state.antispam.wlrole.length < MAX_WL) state.antispam.wlrole.push(r); await i.deferUpdate(); }
            else if (id === CID.AM_ROLE) { const r = i.values[0]; if (state.antimention.wlrole.includes(r)) state.antimention.wlrole = state.antimention.wlrole.filter(x => x !== r); else if (state.antimention.wlrole.length < MAX_WL) state.antimention.wlrole.push(r); await i.deferUpdate(); }
            else if (id === CID.AL_CHAN) { const c = i.values[0]; if (state.antilink.wlchannel.includes(c)) state.antilink.wlchannel = state.antilink.wlchannel.filter(x => x !== c); else if (state.antilink.wlchannel.length < MAX_WL) state.antilink.wlchannel.push(c); await i.deferUpdate(); }
            else if (id === CID.AI_CHAN) { const c = i.values[0]; if (state.antiinvite.wlchannel.includes(c)) state.antiinvite.wlchannel = state.antiinvite.wlchannel.filter(x => x !== c); else if (state.antiinvite.wlchannel.length < MAX_WL) state.antiinvite.wlchannel.push(c); await i.deferUpdate(); }
            else if (id === CID.AS_CHAN) { const c = i.values[0]; if (state.antispam.wlchannel.includes(c)) state.antispam.wlchannel = state.antispam.wlchannel.filter(x => x !== c); else if (state.antispam.wlchannel.length < MAX_WL) state.antispam.wlchannel.push(c); await i.deferUpdate(); }
            else if (id === CID.AM_CHAN) { const c = i.values[0]; if (state.antimention.wlchannel.includes(c)) state.antimention.wlchannel = state.antimention.wlchannel.filter(x => x !== c); else if (state.antimention.wlchannel.length < MAX_WL) state.antimention.wlchannel.push(c); await i.deferUpdate(); }
            else if (id === CID.AS_T_UP) { state.antispam.threshold++; await i.deferUpdate(); }
            else if (id === CID.AS_T_DN) { state.antispam.threshold--; await i.deferUpdate(); }
            else if (id === CID.AS_W_UP) { state.antispam.window++; await i.deferUpdate(); }
            else if (id === CID.AS_W_DN) { state.antispam.window--; await i.deferUpdate(); }
            else if (id === CID.AM_T_UP) { state.antimention.threshold++; await i.deferUpdate(); }
            else if (id === CID.AM_T_DN) { state.antimention.threshold--; await i.deferUpdate(); }
            else if (id === CID.AL_REM) { state.antilink.allowedlink = []; await i.deferUpdate(); }
            else if (id === CID.AL_ADD) {
                await i.reply({ content: "Provide domain (e.g. example.com)", flags: MessageFlags.Ephemeral });
                const collected = await message.channel.awaitMessages({ filter: m => m.author.id === message.author.id, max: 1, time: 30000 }).catch(() => null);
                if (collected?.size) {
                    const domain = collected.first().content.toLowerCase().replace(/https?:\/\//, "").split("/")[0];
                    if (!state.antilink.allowedlink.includes(domain)) state.antilink.allowedlink.push(domain);
                    collected.first().delete().catch(() => { });
                }
                return;
            }

            await panel.edit({ components: [render()] }).catch(() => { });
            await controls.edit({ components: [renderControls()] }).catch(() => { });
        });

        col.on("end", (collected, reason) => {
            if (reason !== "s") {
                panel.delete().catch(() => { }).catch(console.error);
                controls.delete().catch(() => { }).catch(console.error);
            } else {
                controls.delete().catch(() => { }).catch(console.error);
            }
        });
    }
};

module.exports.loadAutomodCache = loadAutomodCache;
module.exports.checker = checker;
