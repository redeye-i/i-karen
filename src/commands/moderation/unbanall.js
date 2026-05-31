const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');

module.exports = {
    name: 'unbanall',
    aliases: [],
    category: 'mod',
    premium: false,

    run: async (client, message, args) => {
        if (!message.member.permissions.has('BanMembers')) {
            return client.util.container(message, `✗ | You must have \`Ban Members\` permissions to use this command.`);
        }

        if (!message.guild.members.me.permissions.has('BanMembers')) {
            return client.util.container(message, `✗ | I must have \`Ban Members\` permissions to execute this command.`);
        }

        const isOwner = message.author.id === message.guild.ownerId;
        if (!isOwner && !client.util.hasHigher(message.member)) {
            return client.util.container(message, `✗ | You must have a higher role than me to use this command.`);
        }

        try {
            const bans = await message.guild.bans.fetch();

            if (bans.size === 0) {
                return client.util.container(message, `ⓘ | There are no banned users in this server.`);
            }

            
            const confirmContainer = new ContainerBuilder();
            confirmContainer.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `# Unban All Confirmation\n\n` +
                    `**Total Banned Users:** ${bans.size}\n\n` +
                    `Are you sure you want to unban all users from this server?`
                )
            );

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('yes_unbanall').setLabel('Yes').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('no_unbanall').setLabel('No').setStyle(ButtonStyle.Secondary)
            );

            const confirmMsg = await message.channel.send({
                flags: MessageFlags.IsComponentsV2,
                components: [confirmContainer, row],
                allowedMentions: { parse: [] }
            });

            const filter = interaction => (interaction.customId === 'yes_unbanall' || interaction.customId === 'no_unbanall') && interaction.user.id === message.author.id;
            const collector = confirmMsg.createMessageComponentCollector({ filter, time: 60000 });

            collector.on('collect', async interaction => {
                if (interaction.customId === 'yes_unbanall') {
                    await interaction.deferUpdate();

                    try {
                        await confirmMsg.delete();

                        const loadingMsg = await client.util.container(message, `⏳ | Unbanning **${bans.size}** users... This may take a moment.`);

                        let unbannedCount = 0;
                        const reason = `Mass unban by ${message.author.tag} (${message.author.id})`;

                        for (const ban of bans.values()) {
                            try {
                                await message.guild.members.unban(ban.user.id, reason);
                                unbannedCount++;
                            } catch (err) {
                                console.error(`Failed to unban ${ban.user.tag}:`, err.message);
                            }
                        }

                        
                        if (loadingMsg && loadingMsg.deletable) {
                            await loadingMsg.delete().catch(() => {});
                        }

                        return client.util.container(message,
                            `✓ | Successfully unbanned **${unbannedCount}** out of **${bans.size}** users from the server.`
                        );

                    } catch (err) {
                        console.error('Unbanall error:', err);
                        await client.util.container(message, `✗ | An error occurred while trying to unban users.`);
                        await confirmMsg.delete().catch(() => {});
                    }

                    collector.stop();

                } else if (interaction.customId === 'no_unbanall') {
                    await interaction.deferUpdate();
                    await client.util.container(message, `✗ | Unban all action canceled.`);
                    collector.stop();
                    await confirmMsg.delete();
                }
            });

            collector.on('end', collected => {
                if (collected.size === 0) {
                    confirmMsg.edit({
                        components: []
                    }).catch(() => {});
                }
            });

        } catch (error) {
            console.error('Unbanall error:', error);
            return client.util.container(message, `✗ | An error occurred while fetching banned users.`);
        }
    }
};
