const {
    ActionRowBuilder,
    MessageFlags,
    TextDisplayBuilder,
    SeparatorBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    ContainerBuilder,
    MediaGalleryBuilder,
    StringSelectMenuBuilder,
} = require('discord.js');

const CATEGORY_META = {
    security:   { label: 'Security',     description: 'Antinuke protection, whitelist & quarantine.' },
    automod:    { label: 'Auto Mod',     description: 'Auto-moderation rules and message filters.' },
    utility:    { label: 'Utility',      description: 'Bot info, ping, uptime & role information.' },
    moderation: { label: 'Moderation',   description: 'Ban, kick, mute, warn, purge, lock and more.' },
    system:     { label: 'System',       description: 'Internal bot owner commands (restricted).' },
};

function makeSep() {
    return new SeparatorBuilder().setDivider(true);
}

function getCategoryOptions(client, isOwner) {
    const seen = new Set();
    const options = [];
    for (const cmd of client.commands.values()) {
        if (cmd.directory === 'system' && !isOwner) continue;
        if (seen.has(cmd.directory)) continue;
        seen.add(cmd.directory);
        const meta = CATEGORY_META[cmd.directory];
        const label = meta?.label ?? (cmd.directory.charAt(0).toUpperCase() + cmd.directory.slice(1));
        options.push({
            label,
            value: cmd.directory,
            description: meta?.description ?? `Commands in the ${cmd.directory} category.`,
        });
    }
    return options;
}

function buildCommandsText(client, directory) {
    const cmds = [...client.commands.values()].filter(c => c.directory === directory);
    if (!cmds.length) return '*No commands found.*';
    return cmds.map(c => `\`${c.name}\``).join('  ');
}

function buildMainContainer(bannerUrl, prefix, totalCmds, userAvatar, options) {
    const container = new ContainerBuilder();

    container.addTextDisplayComponents(new TextDisplayBuilder().setContent('# Help Menu'));
    container.addSeparatorComponents(makeSep());
    container.addSectionComponents(
        new SectionBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                `- **Server Prefix:** \`${prefix}\`\n- **Total Commands:** \`${totalCmds}\``
            ))
            .setThumbnailAccessory(new ThumbnailBuilder({ media: { url: userAvatar } }))
    );
    container.addSeparatorComponents(makeSep());
    container.addActionRowComponents(
        new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('help-menu-id')
                .setPlaceholder('Select a category')
                .addOptions(options)
        )
    );
    container.addSeparatorComponents(makeSep());
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent('karen !'));

    return container;
}

function buildCategoryContainer(bannerUrl, directory, cmdText, options) {
    const meta = CATEGORY_META[directory] ?? {
        label: directory.charAt(0).toUpperCase() + directory.slice(1),
    };
    const container = new ContainerBuilder();
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`# ${meta.label} Commands`));
    container.addSeparatorComponents(makeSep());
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(cmdText));
    container.addSeparatorComponents(makeSep());
    container.addActionRowComponents(
        new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('help-menu-id')
                .setPlaceholder(`Viewing: ${meta.label}`)
                .addOptions(options)
        )
    );
    container.addSeparatorComponents(makeSep());
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent('karen !'));

    return container;
}

module.exports = {
    name: 'help',
    aliases: ['h'],
    category: 'info',
    cooldown: 5,
    run: async (client, message, args) => {
        const prefix = message.guild?.prefix || '&';
        const isOwner =
            client.config.owner.includes(message.author.id);

        const botUser = await client.user.fetch();
        const bannerUrl = botUser.bannerURL({ size: 1024, forceStatic: false }) ?? null;
        const userAvatar = message.author.displayAvatarURL({ extension: 'png', size: 1024 });

        const totalCmds = [...client.commands.values()].filter(cmd => {
            if (cmd.directory === 'system' && !isOwner) return false;
            return true;
        }).length;

        const options = getCategoryOptions(client, isOwner);
        const container = buildMainContainer(bannerUrl, prefix, totalCmds, userAvatar, options);

        const msg = await message.channel.send({
            flags: MessageFlags.IsComponentsV2,
            components: [container],
        });

        const collector = msg.createMessageComponentCollector({
            filter: i => i.customId === 'help-menu-id' && i.user.id === message.author.id,
            time: 120_000,
        });

        collector.on('collect', async interaction => {
            const dir = interaction.values[0];
            const cmdText = buildCommandsText(client, dir);
            const updated = buildCategoryContainer(bannerUrl, dir, cmdText, options);
            await interaction.update({
                flags: MessageFlags.IsComponentsV2,
                components: [updated],
            });
        });
    },
};
