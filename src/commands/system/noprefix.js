const { Client, Message } = require('discord.js');

const NP_KEY = 'noprefix_users';
const now = () => Math.floor(Date.now() / 1000);
async function getUserFromMentionOrID(message, input) {
    if (!input) return null;

    const match = input.match(/^<@!?(\d+)>$/);
    const id = match ? match[1] : input;

    if (!/^\d{17,20}$/.test(id)) return null;

    try {
        return await message.client.users.fetch(id);
    } catch {
        return null;
    }
}

function parseDuration(str) {
    if (!str) return null;

    const match = str.match(/^(\d+)(m|h|d|y)$/i);
    if (!match) return null;

    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();

    const units = {
        m: 60,
        h: 60 * 60,
        d: 60 * 60 * 24,
        mo: 60 * 60 * 24 * 30,
        y: 60 * 60 * 24 * 365
    };

    return value * units[unit];
}

module.exports = {
    name: 'noprefix',
    aliases: ['np'],
    category: 'owner',

    run: async (client, message, args) => {
        if (!client.config.np.includes(message.author.id)) return;

        const prefix = message.guild.prefix;
        let data = (await client.db.get(NP_KEY)) || {};
        const opt = (args[0] || '').toLowerCase();

        switch (opt) {

            case 'list': {
                const users = Object.keys(data);
                const info = [];

                if (!users.length) {
                    info.push('No users have no-prefix access.');
                } else {
                    let i = 1;
                    for (const uid of users) {
                        const entry = data[uid];
                        let tag = `Unknown User (${uid})`;

                        try {
                            const u = await client.users.fetch(uid);
                            tag = u.tag;
                        } catch { }

                        const expiry = entry.expiresAt
                            ? `<t:${entry.expiresAt}:R>`
                            : 'Never';

                        info.push(`${i++}) ${tag} • Expires: ${expiry}`);
                    }
                }

                return client.util.pagination(
                    message,
                    info,
                    'No Prefix Users'
                );
            }
            case 'add':
            case 'a':
            case '+': {
                const user = await getUserFromMentionOrID(message, args[1]);
                if (!user) {
                    return client.util.container(
                        message,
                        `✗ | Please mention a valid user or provide a valid ID.`
                    );
                }

                const duration = parseDuration(args[2]);
                if (args[2] && !duration) {
                    return client.util.container(
                        message,
                        `✗ | Invalid duration. Use \`10m / 10h / 10d / 10y\`.`
                    );
                }

                const expiresAt = duration ? now() + duration : null;

                if (data[user.id]) {
                    data[user.id].expiresAt = expiresAt;

                    await client.db.set(NP_KEY, data);
                    await client.util.noprefix();

                    return client.util.container(
                        message,
                        ` | **${user.tag}** already had no-prefix.\n` +
                        ` Expiry updated to: **${expiresAt ? `<t:${expiresAt}:R>` : 'Never'}**`
                    );
                }

                data[user.id] = {
                    addedBy: message.author.id,
                    addedAt: now(),
                    expiresAt
                };

                await client.db.set(NP_KEY, data);
                await client.util.noprefix();

                return client.util.container(
                    message,
                    `✓ | **${user.tag}** added to no-prefix users.\n` +
                    ` Expiry: **${expiresAt ? `<t:${expiresAt}:R>` : 'Never'}**`
                );
            }
            case 'info': {
                if (!client.noprefixData) {
                    await client.util.noprefix();
                }

                const user = await getUserFromMentionOrID(message, args[1]);
                if (!user) {
                    return client.util.container(message, `✗ | Invalid user.`);
                }

                const entry = client.noprefixData[user.id];
                if (!entry) {
                    return client.util.container(
                        message,
                        `ⓘ | **${user.tag}** does not have no-prefix access.`
                    );
                }

                return client.util.container(
                    message,
                    `# ⓘ No-Prefix Info\n\n` +
                    `**User:** ${user.tag}\n` +
                    `**Added By:** <@${entry.addedBy}>\n` +
                    `**Added At:** <t:${entry.addedAt}:F>\n` +
                    `**Expires:** ${entry.expiresAt ? `<t:${entry.expiresAt}:R>` : 'Never'}`
                );
            }
            case 'remove':
            case 'r':
            case '-': {
                const user = await getUserFromMentionOrID(message, args[1]);
                if (!user) {
                    return client.util.container(
                        message,
                        `✗ | Please mention a valid user or provide a valid ID.`
                    );
                }

                if (!data[user.id]) {
                    return client.util.container(
                        message,
                        `ⓘ | **${user.tag}** does not have no-prefix access.`
                    );
                }

                delete data[user.id];
                await client.db.set(NP_KEY, data);
                await client.util.noprefix();

                return client.util.container(
                    message,
                    `✓ | **${user.tag}** removed from no-prefix users.`
                );
            }
            case 'makeperm': {
                const user = await getUserFromMentionOrID(message, args[1]);
                if (!user) {
                    return client.util.container(
                        message,
                        `✗ | Please mention a valid user or provide a valid ID.`
                    );
                }

                if (!data[user.id]) {
                    return client.util.container(
                        message,
                        `ⓘ | **${user.tag}** does not have no-prefix access.`
                    );
                }

                if (data[user.id].expiresAt === null) {
                    return client.util.container(
                        message,
                        `ⓘ | **${user.tag}** already has permanent no-prefix access.`
                    );
                }

                data[user.id].expiresAt = null;

                await client.db.set(NP_KEY, data);
                await client.util.noprefix();

                return client.util.container(
                    message,
                    `♾ | **${user.tag}** is now a **permanent** no-prefix user.`
                );
            }

            case 'extend': {
                const user = await getUserFromMentionOrID(message, args[1]);
                if (!user) {
                    return client.util.container(
                        message,
                        `✗ | Please mention a valid user or provide a valid ID.`
                    );
                }

                if (!data[user.id]) {
                    return client.util.container(
                        message,
                        `ⓘ | **${user.tag}** does not have no-prefix access.`
                    );
                }

                const duration = parseDuration(args[2]);
                if (!duration) {
                    return client.util.container(
                        message,
                        `✗ | Invalid duration. Use \`10m / 10h / 10d / 10y\`.`
                    );
                }

                const current = data[user.id].expiresAt || now();
                const newExpiry = current + duration;

                data[user.id].expiresAt = newExpiry;

                await client.db.set(NP_KEY, data);
                await client.util.noprefix();

                return client.util.container(
                    message,
                    ` | **${user.tag}** no-prefix extended.\n` +
                    ` New Expiry: **<t:${newExpiry}:R>**`
                );
            }

            default:
                return client.util.container(
                    message,
                    `# ⓘ No Prefix Command\n\n` +
                    `**Usage:**\n` +
                    `\`${prefix}np add @user 10h\`\n` +
                    `\`${prefix}np remove @user\`\n` +
                    `\`${prefix}np list\`\n\n` +
                    `**Time Units:**\n` +
                    `\`m\` = minutes, \`h\` = hours, \`d\` = days, \`y\` = years`
                );
        }
    }
};
