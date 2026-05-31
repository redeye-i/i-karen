const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ContainerBuilder, TextDisplayBuilder, MessageFlags, PermissionsBitField } = require('discord.js');

module.exports = {
    name: 'unmuteall',
    aliases: [],
    category: 'mod',
    premium: false,
    cooldown: 60,

    run: async (client, message, args) => {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return client.util.container(message, `✗ | You must have \`Moderate Members\` permission to use this command.`);
        }

        if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return client.util.container(message, `✗ | I must have \`Moderate Members\` permission to use this command.`);
        }

        if (!client.util.hasHigher(message.member)) {
            return client.util.container(message, `✗ | Your highest role must be higher than my highest role to use this command.`);
        }

        
        if (message.guild.unmuteallRunning) {
            return client.util.container(message, `✗ | There is already an unmute all process running in this server.`);
        }

        const members = await message.guild.members.fetch().then(members => members.filter(member => member.isCommunicationDisabled()));

        if (members.size === 0) {
            return client.util.container(message, `ⓘ | There are no muted members in this server.`);
        }

        
        const confirmContainer = new ContainerBuilder();
        confirmContainer.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `# Unmute All Confirmation\n\n` +
                `**Total Muted Members:** ${members.size}\n\n` +
                `Are you sure you want to unmute all muted members in this server?`
            )
        );

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('yes_unmuteall').setLabel('Yes').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('no_unmuteall').setLabel('No').setStyle(ButtonStyle.Danger)
        );

        const confirmMsg = await message.channel.send({
            flags: MessageFlags.IsComponentsV2,
            components: [confirmContainer, row],
            allowedMentions: { parse: [] }
        });

        const filter = interaction => (interaction.customId === 'yes_unmuteall' || interaction.customId === 'no_unmuteall') && interaction.user.id === message.author.id;
        const collector = confirmMsg.createMessageComponentCollector({ filter, time: 30000 });

        collector.on('collect', async interaction => {
            if (interaction.customId === 'yes_unmuteall') {
                await interaction.deferUpdate();

                try {
                    await confirmMsg.delete();

                    message.guild.unmuteallRunning = true;

                    const loadingMsg = await client.util.container(message, `⏳ | Unmuting **${members.size}** members... This may take a while.`);

                    let unmutedCount = 0;
                    const reason = `Unmute all by ${message.author.tag} (${message.author.id})`;

                    for (const [id, member] of members) {
                        try {
                            if (member.isCommunicationDisabled()) {
                                await member.disableCommunicationUntil(null, reason);
                                unmutedCount++;
                                await client.util.sleep(1000); 
                            }
                        } catch (err) {
                            console.error(`Failed to unmute ${member.user.tag}:`, err.message);
                            if (err.code === 429) {
                                await client.util.sleep(3000); 
                            }
                        }
                    }

                    
                    if (loadingMsg && loadingMsg.deletable) {
                        await loadingMsg.delete().catch(() => {});
                    }

                    message.guild.unmuteallRunning = false;

                    return client.util.container(message,
                        `✓ | Successfully unmuted **${unmutedCount}** out of **${members.size}** members.`
                    );

                } catch (err) {
                    console.error('Unmuteall error:', err);
                    message.guild.unmuteallRunning = false;
                    await client.util.container(message, `✗ | An error occurred while trying to unmute members.`);
                    await confirmMsg.delete().catch(() => {});
                }

                collector.stop();

            } else if (interaction.customId === 'no_unmuteall') {
                await interaction.deferUpdate();
                await client.util.container(message, `✗ | Unmute all action canceled.`);
                await confirmMsg.edit({ components: [] });
                collector.stop();
            }
        });

        collector.on('end', collected => {
            if (collected.size === 0) {
                confirmMsg.edit({
                    components: []
                }).catch(() => {});
            }
        });
    }
};
