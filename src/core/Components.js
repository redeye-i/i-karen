const {
    ContainerBuilder,
    SectionBuilder,
    TextDisplayBuilder,
    ThumbnailBuilder,
    SeparatorBuilder,
} = require('discord.js');


const C = {
    gold:    0xF5C518,
    green:   0x2ECC71,
    red:     0xE74C3C,
    orange:  0xF39C12,
    blue:    0x3B82F6,
    indigo:  0x6366F1,
    grey:    0x6B7280,
    dark:    0x1E2124,
    diamond: 0x06B6D4,
    rose:    0xF43F5E,
    amber:   0xF59E0B,
    emerald: 0x10B981,
    slate:   0x475569,
    violet:  0x8B5CF6,
};


function ts(date, format = 'F') {
    return `<t:${Math.floor(new Date(date).getTime() / 1000)}:${format}>`;
}

function timeLeft(expiresAt) {
    const ms = new Date(expiresAt) - Date.now();
    if (ms <= 0) return '`EXPIRED`';
    const d = Math.floor(ms / 86400000);
    const h = Math.floor((ms % 86400000) / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    if (d > 0) return `\`${d}d ${h}h\``;
    if (h > 0) return `\`${h}h ${m}m\``;
    return `\`${m}m\``;
}

function bar(used, total, len = 12) {
    if (!total) return `\`${'░'.repeat(len)}\` **0%**`;
    const f   = Math.round(Math.min(used / total, 1) * len);
    const pct = Math.round(Math.min(used / total, 1) * 100);
    return `\`${'█'.repeat(f)}${'░'.repeat(len - f)}\` **${pct}%**`;
}

function sep(divider = true, spacing = 1) {
    return new SeparatorBuilder().setDivider(divider).setSpacing(spacing);
}

function txt(content) {
    return new TextDisplayBuilder().setContent(content);
}

function avatarUrl(user) {
    try { return user?.displayAvatarURL?.({ size: 64 }) ?? null; }
    catch { return null; }
}

const STATUS = {
    active:       '🟢 Active',
    grace_expiry: '🟡 Grace (Expiry)',
    grace_revoke: '🔴 Grace (Revoked)',
    paused:       '🔵 Paused',
    expired:      '⚫ Expired',
    revoked:      '⛔ Revoked',
};

const STATUS_DOT = {
    active: '🟢', grace_expiry: '🟡', grace_revoke: '🔴',
    paused: '🔵', expired: '⚫', revoked: '⛔',
};

const ACTION_META = {
    grant:                { e: '🎁' },
    remove_slots:         { e: '➖' },
    set_slots:            { e: '🔢' },
    activate:             { e: '✅' },
    self_revoke:          { e: '🚪' },
    admin_revoke:         { e: '🚫' },
    owner_revoke_user:    { e: '⚠️' },
    grace_start_expiry:   { e: '🟡' },
    final_expire:         { e: '⌛' },
    final_revoke_cascade: { e: '💀' },
    extend:               { e: '📆' },
    transfer:             { e: '🔄' },
    pause:                { e: '⏸️' },
    resume:               { e: '▶️' },
    blacklist:            { e: '⛔' },
    unblacklist:          { e: '✅' },
};

const SEV_COLOR = { info: '⬜', warn: '🟨', critical: '🟥' };




function buildActivateSuccess({ guildName, guildId, userId, durationDays, expiresAt, slotsLeft, slotId }) {
    return new ContainerBuilder()
        .setAccentColor(C.gold)
        .addTextDisplayComponents(txt(`## ✨ Premium Activated\n**${guildName}** is now powered by premium.`))
        .addSeparatorComponents(sep())
        .addTextDisplayComponents(txt(
            `> 🏷️  **Server** ·· \`${guildId}\`\n` +
            `> 👤  **By** ·· <@${userId}>\n` +
            `> 🎟️  **Slot used** ·· \`${slotId}\`\n` +
            `> 📆  **Duration** ·· **${durationDays} days** *(set by owner)*\n` +
            `> ⏰  **Expires** ·· ${ts(expiresAt)}\n` +
            `> ⏳  **Remaining** ·· ${timeLeft(expiresAt)}`
        ))
        .addSeparatorComponents(sep(false))
        .addTextDisplayComponents(txt(
            `-# 🎟️  **${slotsLeft}** slot(s) left  ·  ⚠️ \`p revoke\` does **NOT** refund your slot`
        ));
}


function buildServerStatus({ guildName, guildId, activation }) {
    const isGrace  = ['grace_expiry', 'grace_revoke'].includes(activation.status);
    const isPaused = activation.status === 'paused';
    const daysLeft = Math.ceil((new Date(activation.expiresAt) - Date.now()) / 86400000);
    const isSoon   = daysLeft <= 3 && activation.status === 'active';
    const color    = isGrace ? C.orange : isPaused ? C.blue : isSoon ? C.amber : C.gold;

    let banner = '';
    if (activation.status === 'grace_expiry')
        banner = `\n> ⚠️ **In grace period** — still has access until ${ts(activation.graceEndsAt, 'R')}`;
    else if (activation.status === 'grace_revoke')
        banner = `\n> 🔴 **License revoked** — access ends ${ts(activation.graceEndsAt, 'R')}`;
    else if (isPaused)
        banner = `\n> 🔵 **Timer paused** — ${timeLeft(activation.expiresAt)} frozen`;
    else if (isSoon)
        banner = `\n> ⚠️ **Expiring soon!** Only **${daysLeft} day(s)** left.`;

    return new ContainerBuilder()
        .setAccentColor(color)
        .addTextDisplayComponents(txt(
            `## ${STATUS_DOT[activation.status]} Premium Status · ${guildName ?? guildId}` + banner
        ))
        .addSeparatorComponents(sep())
        .addTextDisplayComponents(txt(
            `> 🏷️  **Server** ·· \`${guildId}\`\n` +
            `> 👤  **Owner** ·· <@${activation.userId}>\n` +
            `> 📅  **Activated** ·· ${ts(activation.activatedAt, 'R')}\n` +
            `> ⏰  **Expires** ·· ${ts(activation.expiresAt)}\n` +
            `> ⏳  **Remaining** ·· ${timeLeft(activation.expiresAt)}\n` +
            `> 📊  **Status** ·· ${STATUS[activation.status] ?? activation.status}` +
            (isGrace ? `\n> 🛡️  **Grace ends** ·· ${ts(activation.graceEndsAt)}` : '')
        ));
}


function buildMySlots({ user, activations, userId, userObj = null }) {
    const slots   = user.slots ?? [];
    const used    = activations.filter(a => a.status === 'active').length;
    const gracing = activations.filter(a => ['grace_expiry', 'grace_revoke'].includes(a.status)).length;
    const total   = Math.max(user.totalGranted, used + slots.length);
    const usage   = bar(used, total);

    const slotList = slots.length
        ? slots.map((s, i) =>
            `> 🎟️  \`${String(i + 1).padStart(2, '0')}\`  ·  \`${s.slotId}\`  ·  **${s.durationDays}d**\n` +
            `>     ↳ granted by <@${s.grantedBy}> · ${ts(s.grantedAt, 'R')}` +
            (s.note ? ` · *${s.note}*` : '')
          ).join('\n')
        : '> *No slots available*';

    const serverList = activations.length
        ? activations.slice(0, 5).map((a, i) =>
            `> ${STATUS_DOT[a.status]} \`${String(i + 1).padStart(2, '0')}\`  ·  \`${a.guildId}\`\n` +
            `>     ↳ ${STATUS[a.status]} · **${a.durationDays}d** · ${timeLeft(a.expiresAt)} · ${ts(a.expiresAt, 'R')}`
          ).join('\n')
        : '> *No active servers*';

    const overflow = activations.length > 5 ? `\n-# …and ${activations.length - 5} more` : '';
    const url      = avatarUrl(userObj);

    const container = new ContainerBuilder().setAccentColor(C.diamond);

    if (url) {
        
        container.addSectionComponents(
            new SectionBuilder()
                .addTextDisplayComponents(txt(
                    `## 💎 Premium Dashboard` +
                    (user.isBlacklisted ? `\n> ⛔ **Your account is blacklisted.**` : '')
                ))
                .setThumbnailAccessory(
                    new ThumbnailBuilder().setURL(url).setDescription('Avatar')
                )
        );
    } else {
        container.addTextDisplayComponents(txt(
            `## 💎 Premium Dashboard` +
            (user.isBlacklisted ? `\n> ⛔ **Your account is blacklisted.**` : '')
        ));
    }

    return container
        .addSeparatorComponents(sep())
        .addTextDisplayComponents(txt(
            `### 📊 Overview\n` +
            `${usage}\n` +
            `> 🎟️  **Available Slots** ·· **${slots.length}**\n` +
            `> 🔵  **In Use** ·· **${used}** server(s)\n` +
            (gracing ? `> 🟡  **In Grace** ·· **${gracing}** server(s)\n` : '') +
            `> 📈  **Lifetime Granted** ·· **${user.totalGranted}**`
        ))
        .addSeparatorComponents(sep(false))
        .addTextDisplayComponents(txt(`### 🎟️ Slot Inventory (${slots.length} available)\n${slotList}`))
        .addSeparatorComponents(sep(false))
        .addTextDisplayComponents(txt(`### 🌐 Active Servers\n${serverList}${overflow}`))
        .addSeparatorComponents(sep(false))
        .addTextDisplayComponents(txt(
            `-# Use \`p activate [slotId]\` to pick a specific slot  ·  ⚠️ Self-revoking does **NOT** refund`
        ));
}


function buildUserInfo({ target, user, activations, activeCount, gracingCount, totalCount }) {
    const slots  = user.slots ?? [];
    const total  = Math.max(user.totalGranted, 1);
    const usage  = bar(activeCount, total);

    const durationGroups = {};
    for (const s of slots) durationGroups[s.durationDays] = (durationGroups[s.durationDays] ?? 0) + 1;

    const slotSummary = Object.entries(durationGroups).length
        ? Object.entries(durationGroups)
            .sort(([a], [b]) => Number(b) - Number(a))
            .map(([days, count]) => `> 🎟️  **${count}x** · **${days}d** slot(s)`)
            .join('\n')
        : '> *No slots available*';

    const slotDetail = slots.slice(0, 6)
        .map(s => `> \`${s.slotId}\`  **${s.durationDays}d**  · ${ts(s.grantedAt, 'R')}`)
        .join('\n');

    const serverList = activations.length
        ? activations.slice(0, 6).map(a =>
            `> ${STATUS_DOT[a.status]} \`${a.guildId}\`  ·  ${STATUS[a.status]}  ·  **${a.durationDays}d**  ·  ${timeLeft(a.expiresAt)}`
          ).join('\n')
        : '> *No active activations*';

    const url       = avatarUrl(target);
    const container = new ContainerBuilder().setAccentColor(user.isBlacklisted ? C.red : C.violet);
    const headerTxt = `## 👤 User Profile\n**${target.username}**  ·  \`${target.id}\`` +
                      (user.isBlacklisted ? '\n> ⛔ **BLACKLISTED**' : '');

    if (url) {
        container.addSectionComponents(
            new SectionBuilder()
                .addTextDisplayComponents(txt(headerTxt))
                .setThumbnailAccessory(new ThumbnailBuilder().setURL(url).setDescription(target.username))
        );
    } else {
        container.addTextDisplayComponents(txt(headerTxt));
    }

    return container
        .addSeparatorComponents(sep())
        .addTextDisplayComponents(txt(
            `### 📊 Stats\n${usage}\n` +
            `> 🎟️  **Available Slots** ·· **${slots.length}**\n` +
            `> 🔵  **Active Servers** ·· **${activeCount}**\n` +
            (gracingCount ? `> 🟡  **In Grace** ·· **${gracingCount}**\n` : '') +
            `> 📈  **Lifetime Granted** ·· **${user.totalGranted}**\n` +
            `> 🕐  **Account Since** ·· ${ts(user.createdAt, 'R')}` +
            (user.notes ? `\n> 📝  **Notes** ·· ${user.notes}` : '')
        ))
        .addSeparatorComponents(sep(false))
        .addTextDisplayComponents(txt(
            `### 🎟️ Slot Inventory (${slots.length})\n` +
            slotSummary +
            (slots.length ? `\n\n**Slot IDs:**\n${slotDetail}` : '') +
            (slots.length > 6 ? `\n> *…and ${slots.length - 6} more*` : '')
        ))
        .addSeparatorComponents(sep(false))
        .addTextDisplayComponents(txt(`### 🌐 Active Servers\n${serverList}`));
}


function buildStats({ stats, expiringSoon = 0 }) {
    const liveBar = bar(stats.active, Math.max(stats.totalLive, 1));
    return new ContainerBuilder()
        .setAccentColor(C.indigo)
        .addTextDisplayComponents(txt(`## 📊 Premium System Overview`))
        .addSeparatorComponents(sep())
        .addTextDisplayComponents(txt(
            `### 👥 Users\n` +
            `> **${stats.totalUsers}** accounts  ·  **${stats.totalSlots}** slots in circulation`
        ))
        .addSeparatorComponents(sep(false))
        .addTextDisplayComponents(txt(
            `### 🌐 Servers  (${stats.totalLive} live)\n` +
            `${liveBar}\n` +
            `> 🟢  **Active** ·· **${stats.active}**\n` +
            `> 🟡  **Grace (Expiry)** ·· **${stats.graceExp}**\n` +
            `> 🔴  **Grace (Revoked)** ·· **${stats.graceRev}**\n` +
            `> 🔵  **Paused** ·· **${stats.paused}**\n` +
            `> ⚫  **Expired** ·· **${stats.expired}**\n` +
            `> ⛔  **Revoked** ·· **${stats.revoked}**` +
            (expiringSoon > 0 ? `\n\n> ⚠️  **Expiring in 3d** ·· **${expiringSoon}** need attention` : '')
        ));
}


function buildServerList({ servers, page = 1, totalPages = 1 }) {
    const list = servers.length
        ? servers.map((s, i) => {
            const n = ((page - 1) * 15) + i + 1;
            return `> ${STATUS_DOT[s.status]} \`${String(n).padStart(2, '0')}\`  ·  \`${s.guildId}\`  ·  <@${s.userId}>\n` +
                   `>     ↳ ${STATUS[s.status]} · ${timeLeft(s.expiresAt)} · ${ts(s.expiresAt, 'R')}`;
          }).join('\n')
        : '> *No active premium servers*';

    return new ContainerBuilder()
        .setAccentColor(C.gold)
        .addTextDisplayComponents(txt(`## 📋 Premium Servers\nPage **${page}** / **${totalPages}**`))
        .addSeparatorComponents(sep())
        .addTextDisplayComponents(txt(list))
        .addSeparatorComponents(sep(false))
        .addTextDisplayComponents(txt(`-# Sorted by expiry · \`p list ${page + 1}\` for next page`));
}


function buildExpiringSoon({ servers, days }) {
    const list = servers.length
        ? servers.map((s, i) =>
            `> ⚠️ \`${String(i + 1).padStart(2, '0')}\`  ·  \`${s.guildId}\`  ·  <@${s.userId}>\n` +
            `>     ↳ ${timeLeft(s.expiresAt)} left  ·  ${ts(s.expiresAt)}`
          ).join('\n')
        : `> ✅  All servers healthy — nothing expiring within **${days}** day(s).`;

    return new ContainerBuilder()
        .setAccentColor(servers.length ? C.amber : C.emerald)
        .addTextDisplayComponents(txt(
            `## ⏳ Expiring Within ${days} Day(s)\n` +
            (servers.length ? `**${servers.length}** server(s) need attention.` : `Everything looks good! 🎉`)
        ))
        .addSeparatorComponents(sep())
        .addTextDisplayComponents(txt(list));
}


function buildAuditLog({ logs }) {
    const list = logs.length
        ? logs.map(l => {
            const m   = ACTION_META[l.action] ?? { e: '•' };
            const sev = SEV_COLOR[l.severity] ?? '⬜';
            return `> ${m.e} ${sev}  **${l.action.toUpperCase()}**  ·  ${ts(l.createdAt, 'R')}\n` +
                   `>     ↳ by <@${l.actorId}>` +
                   (l.targetUserId  ? `  on <@${l.targetUserId}>` : '') +
                   (l.targetGuildId ? `  in \`${l.targetGuildId}\`` : '');
          }).join('\n')
        : '> *No log entries found.*';

    return new ContainerBuilder()
        .setAccentColor(C.slate)
        .addTextDisplayComponents(txt(`## 📋 Audit Log\nLast **${logs.length}** entr${logs.length === 1 ? 'y' : 'ies'}`))
        .addSeparatorComponents(sep())
        .addTextDisplayComponents(txt(list))
        .addSeparatorComponents(sep(false))
        .addTextDisplayComponents(txt(`-# ⬜ Info  🟨 Warning  🟥 Critical  ·  \`p audit --severity critical\` to filter`));
}


function buildHistory({ activations, userId }) {
    const list = activations.length
        ? activations.slice(0, 10).map((a, i) =>
            `> ${STATUS_DOT[a.status]} \`${String(i + 1).padStart(2, '0')}\`  ·  \`${a.guildId}\`\n` +
            `>     ↳ **${a.status.toUpperCase()}**  ·  ${a.durationDays}d  ·  ${ts(a.activatedAt, 'R')}` +
            (a.revokeReason ? `\n>     ↳ Reason: ${a.revokeReason}` : '')
          ).join('\n')
        : '> *No activation history found.*';

    return new ContainerBuilder()
        .setAccentColor(C.grey)
        .addTextDisplayComponents(txt(`## 📋 Activation History\nAll-time record for <@${userId}>`))
        .addSeparatorComponents(sep())
        .addTextDisplayComponents(txt(list))
        .addSeparatorComponents(sep(false))
        .addTextDisplayComponents(txt(
            `-# Showing ${Math.min(activations.length, 10)} of **${activations.length}** total`
        ));
}


function buildGraceNotice({ activation, guildName }) {
    const isExpiry = activation.graceType === 'expiry';
    const color    = isExpiry ? C.amber : C.rose;
    const title    = isExpiry ? '🟡 Grace Period — Subscription Expired' : '🔴 Grace Period — License Revoked';

    return new ContainerBuilder()
        .setAccentColor(color)
        .addTextDisplayComponents(txt(`## ${title}\n**${guildName}** is in a **3-day grace period**.`))
        .addSeparatorComponents(sep())
        .addTextDisplayComponents(txt(
            (isExpiry
                ? `> Your subscription expired but the server still has access for **3 more days**.\n` +
                  `> To keep premium, use \`p activate\` in this server.`
                : `> The premium license owner has had their slots removed.\n` +
                  `> This server has **3 days** for another user to activate premium.\n` +
                  `> After this period, server premium will be fully revoked.`) +
            `\n\n> ⏰  **Grace ends** ·· ${ts(activation.graceEndsAt)}\n` +
            `> ⏳  **Remaining** ·· ${timeLeft(activation.graceEndsAt)}`
        ));
}


function buildHelp(isOwner = false) {
    const userSection =
        `### 🙋 User Commands\n` +
        `> \`p activate [slotId]\` — Activate in this server *(uses longest-duration slot)*\n` +
        `> \`p revoke [reason]\` — Remove premium *(slot is NOT refunded)*\n` +
        `> \`p status\` — This server's premium status\n` +
        `> \`p myslots\` — Your slot inventory with durations & IDs\n` +
        `> \`p history\` — Full activation history`;

    const ownerSection = !isOwner ? '' :
        `\n\n### 🔐 Owner — Slots\n` +
        `> \`p grant <@user> <count> <days> [note]\` — Grant N slots × X days each\n` +
        `> \`p remove <@user> <count>\` — Remove N slots (shortest first)\n` +
        `> \`p removeslot <@user> <slotId>\` — Remove one slot by ID\n` +
        `> \`p set <@user> <count> <days>\` — Replace all slots\n` +
        `> \`p info <@user>\` — Full user profile + slot inventory\n` +
        `> \`p blacklist <@user> [reason]\` — Ban from premium\n` +
        `> \`p unblacklist <@user>\` — Remove ban\n` +
        `\n### 🔐 Owner — Servers\n` +
        `> \`p revokeguild <guildId> [reason] [--norefund]\` — Force revoke server\n` +
        `> \`p revokeuser <@user> [reason]\` — Revoke user → cascades 3d grace on all their servers\n` +
        `> \`p extend <guildId> <days>\` — Extend duration\n` +
        `> \`p transfer <guildId> <@user>\` — Transfer ownership\n` +
        `> \`p check [guildId]\` — Check server status\n` +
        `> \`p pause <guildId>\` — Freeze timer\n` +
        `> \`p resume <guildId>\` — Resume timer\n` +
        `\n### 🔐 Owner — System\n` +
        `> \`p list [page]\` — All premium servers\n` +
        `> \`p expiring [days]\` — Expiring soon\n` +
        `> \`p stats\` — System statistics\n` +
        `> \`p audit [--user] [--guild] [--action] [--severity] [--limit]\`\n` +
        `> \`p expire\` — Run expiry engine manually`;

    return new ContainerBuilder()
        .setAccentColor(C.diamond)
        .addTextDisplayComponents(txt(`## 💎 Premium System · Help`))
        .addSeparatorComponents(sep())
        .addTextDisplayComponents(txt(userSection + ownerSection))
        .addSeparatorComponents(sep(false))
        .addTextDisplayComponents(txt(
            `-# Command prefix: \`p\`  ·  ⚠️ Self-revoking does **NOT** refund your slot`
        ));
}


function buildSuccess(title, body) {
    return new ContainerBuilder()
        .setAccentColor(C.emerald)
        .addTextDisplayComponents(txt(`## ✅ ${title}\n${body}`));
}

function buildError(body) {
    return new ContainerBuilder()
        .setAccentColor(C.red)
        .addTextDisplayComponents(txt(`## ✗ Error\n${body}`));
}

function buildWarn(title, body) {
    return new ContainerBuilder()
        .setAccentColor(C.amber)
        .addTextDisplayComponents(txt(`## ⚠️ ${title}\n${body}`));
}


async function send(message, container) {
    const payload = { components: [container], flags: [32768] };
    try {
        return await message.channel.send(payload);
    } catch {
        return await message.reply(payload);
    }
}

async function dmUser(client, userId, container) {
    try {
        const user = await client.users.fetch(userId);
        await user.send({ components: [container], flags: [32768] });
        return true;
    } catch {
        return false;
    }
}

module.exports = {
    C, ts, timeLeft, bar, STATUS, STATUS_DOT, sep, avatarUrl, ACTION_META,
    buildActivateSuccess, buildServerStatus, buildMySlots, buildUserInfo,
    buildStats, buildServerList, buildExpiringSoon, buildAuditLog,
    buildHistory, buildGraceNotice, buildHelp,
    buildSuccess, buildError, buildWarn,
    send, dmUser,
};
