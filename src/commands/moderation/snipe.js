'use strict';

const {
    ContainerBuilder,
    TextDisplayBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
    PermissionFlagsBits,
} = require('discord.js');

const PAGE_SIZE = 1; 

module.exports = {
    name: 'snipe',
    aliases: ['s'],
    category: 'moderation',
    premium: false,

    run: async (client, message, args) => {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return client.util.container(
                message,
                '# Access Denied\nYou need the `Manage Messages` permission to use this command.',
            );
        }

        
        try {
            const cols = client.snipe
                .prepare(`PRAGMA table_info(snipes)`)
                .all()
                .map((c) => c.name);

            if (!cols.includes('authorId')) {
                client.snipe
                    .prepare(`ALTER TABLE snipes ADD COLUMN authorId TEXT DEFAULT NULL`)
                    .run();
            }
            if (!cols.includes('authorAvatar')) {
                client.snipe
                    .prepare(`ALTER TABLE snipes ADD COLUMN authorAvatar TEXT DEFAULT NULL`)
                    .run();
            }
        } catch {  }

        
        let filterUserId = null;
        let filterUserTag = null;

        if (args[0]?.toLowerCase() === 'user' && args[1]) {
            
            const mention = message.mentions.users.first();
            if (mention) {
                filterUserId = mention.id;
                filterUserTag = mention.tag;
            } else {
                
                const rawId = args[1].replace(/\D/g, '');
                if (rawId.length >= 17) {
                    filterUserId = rawId;
                    const u = await client.users.fetch(rawId).catch(() => null);
                    filterUserTag = u?.tag ?? `ID: ${rawId}`;
                } else {
                    return client.util.container(
                        message,
                        '# ✗ Invalid User\nProvide a valid mention or user ID.\n\n`snipe user @user`',
                    );
                }
            }
        }

        
        const snipes = filterUserId
            ? client.snipe
                .prepare(
                    `SELECT * FROM snipes
                       WHERE guildId = ? AND authorId = ?
                       ORDER BY timestamp DESC LIMIT 30`,
                )
                .all(message.guild.id, filterUserId)
            : client.snipe
                .prepare(
                    `SELECT * FROM snipes
                       WHERE guildId = ?
                       ORDER BY timestamp DESC LIMIT 30`,
                )
                .all(message.guild.id);

        if (!snipes || snipes.length === 0) {
            return client.util.container(
                message,
                filterUserId
                    ? `#  No Sniped Messages\nNo deleted messages found for **${filterUserTag}** in this server.`
                    : `#  Nothing to Snipe\nNo recently deleted messages found in this server.`,
            );
        }

        
        let page = 0;
        const total = snipes.length;

        const buildContainer = (idx) => {
            const snipe = snipes[idx];
            const container = new ContainerBuilder();

            
            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    filterUserId
                        ? `#  Snipe — ${filterUserTag}`
                        : `#  Snipe`,
                ),
            );
            container.addSeparatorComponents(
                new SeparatorBuilder()
                    .setDivider(true)
                    .setSpacing(SeparatorSpacingSize.Small),
            );

            
            const avatarUrl =
                snipe.authorAvatar ||
                `https://cdn.discordapp.com/embed/avatars/0.png`;

            const channelMention = snipe.channelId
                ? `<#${snipe.channelId}>`
                : '`Unknown Channel`';

            const timeAgo = `<t:${Math.floor(snipe.timestamp / 1000)}:R>`;
            const timeAbsolute = `<t:${Math.floor(snipe.timestamp / 1000)}:f>`;

            const contentText = snipe.content
                ? snipe.content.length > 1800
                    ? snipe.content.slice(0, 1800) + '…'
                    : snipe.content
                : '_No text content_';

            container.addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            [
                                `-# ^ **Author**`,
                                `**${snipe.author}**${snipe.authorId ? ` \`(${snipe.authorId})\`` : ''}`,
                                '',
                                `-# ~ **Channel**`,
                                channelMention,
                                '',
                                `-# - **Deleted**`,
                                `${timeAgo} · ${timeAbsolute}`,
                            ].join('\n'),
                        ),
                    )
                    .setThumbnailAccessory(
                        new ThumbnailBuilder({ media: { url: avatarUrl } }),
                    ),
            );

            container.addSeparatorComponents(
                new SeparatorBuilder()
                    .setDivider(true)
                    .setSpacing(SeparatorSpacingSize.Small),
            );

            // Content
            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(contentText),
            );

            // Attachment notice
            if (snipe.imageUrl) {
                container.addSeparatorComponents(
                    new SeparatorBuilder()
                        .setDivider(false)
                        .setSpacing(SeparatorSpacingSize.Small),
                );
                container.addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `-#  [Attachment](<${snipe.imageUrl}>)`,
                    ),
                );
            }

            container.addSeparatorComponents(
                new SeparatorBuilder()
                    .setDivider(true)
                    .setSpacing(SeparatorSpacingSize.Small),
            );

            // Footer + pagination buttons
            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `-# Page **${idx + 1} / ${total}**`,
                ),
            );

            container.addActionRowComponents(
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('snipe_prev')
                        .setLabel('‹')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(idx === 0),
                    new ButtonBuilder()
                        .setCustomId('snipe_next')
                        .setLabel('›')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(idx >= total - 1),
                    new ButtonBuilder()
                        .setCustomId('snipe_latest')
                        .setLabel('!')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(idx === 0),
                ),
            );

            return container;
        };

        // Send initial page
        const response = await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [buildContainer(page)],
            allowedMentions: { repliedUser: false },
        });

        if (total === 1) return; // No need for collector if single result

        // ── Collector ──────────────────────────────────────────────────────────
        const collector = response.createMessageComponentCollector({
            filter: (i) => i.user.id === message.author.id && i.isButton(),
            time: 90_000,
            idle: 30_000,
        });

        collector.on('collect', async (btn) => {
            if (btn.customId === 'snipe_prev' && page > 0) page--;
            else if (btn.customId === 'snipe_next' && page < total - 1) page++;
            else if (btn.customId === 'snipe_latest') page = 0;

            await btn.deferUpdate();
            await response.edit({
                flags: MessageFlags.IsComponentsV2,
                components: [buildContainer(page)],
            });
        });

        collector.on('end', async () => {
            // Disable all buttons when collector expires
            const finalContainer = buildContainer(page);
            // Remove the last action row and re-add with all disabled
            try {
                const disabledRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('snipe_prev')
                        .setLabel('‹')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true),
                    new ButtonBuilder()
                        .setCustomId('snipe_next')
                        .setLabel('›')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true),
                    new ButtonBuilder()
                        .setCustomId('snipe_latest')
                        .setLabel('!')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true),
                );

                // Rebuild without the old action row, append disabled row
                const expiredContainer = new ContainerBuilder();
                // Rebuild the page cleanly
                const snipe = snipes[page];
                const avatarUrl =
                    snipe.authorAvatar ||
                    `https://cdn.discordapp.com/embed/avatars/0.png`;
                const channelMention = snipe.channelId
                    ? `<#${snipe.channelId}>`
                    : '`Unknown Channel`';
                const timeAgo = `<t:${Math.floor(snipe.timestamp / 1000)}:R>`;
                const timeAbsolute = `<t:${Math.floor(snipe.timestamp / 1000)}:f>`;
                const contentText = snipe.content
                    ? snipe.content.length > 1800
                        ? snipe.content.slice(0, 1800) + '…'
                        : snipe.content
                    : '_No text content_';

                expiredContainer.addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        filterUserId ? `#  Snipe — ${filterUserTag}` : `#  Snipe`,
                    ),
                );
                expiredContainer.addSeparatorComponents(
                    new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
                );
                expiredContainer.addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                [
                                    `-# ^ **Author**`,
                                    `**${snipe.author}**${snipe.authorId ? ` \`(${snipe.authorId})\`` : ''}`,
                                    '',
                                    `-# ~ **Channel**`,
                                    channelMention,
                                    '',
                                    `-# - **Deleted**`,
                                    `${timeAgo} · ${timeAbsolute}`,
                                ].join('\n'),
                            ),
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder({ media: { url: avatarUrl } }),
                        ),
                );
                expiredContainer.addSeparatorComponents(
                    new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
                );
                expiredContainer.addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(contentText),
                );
                expiredContainer.addSeparatorComponents(
                    new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
                );
                expiredContainer.addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `-# Page **${page + 1} / ${total}** · Session expired`,
                    ),
                );
                expiredContainer.addActionRowComponents(disabledRow);

                await response.edit({
                    flags: MessageFlags.IsComponentsV2,
                    components: [expiredContainer],
                }).catch(() => { });
            } catch { /* message may have been deleted */ }
        });
    },
};
