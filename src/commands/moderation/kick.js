const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ContainerBuilder, TextDisplayBuilder, MessageFlags, SeparatorBuilder, SectionBuilder } = require('discord.js');

module.exports = {
    name: 'kick',
    aliases: [],
    category: 'mod',
    premium: false,

    run: async (client, message, args) => {
        const isown = message.author.id === message.guild.ownerId;

        if (!message.member.permissions.has('KickMembers')) {
            return client.util.container(message, `✗ | You must have \`Kick Members\` permissions to use this command.`);
        }

        if (!message.guild.members.me.permissions.has('KickMembers')) {
            return client.util.container(message, `✗ | I must have \`Kick Members\` permissions to execute this command.`);
        }

        const isWhitelisted = await client.db.get(`${message.guild.id}_${message.author.id}_wl`);

        if (!isWhitelisted?.kick && message.author.id !== message.guild.ownerId && message.author.id !== client.user.id) {
            return client.util.container(message, `✗ | You must be Whitelisted to use this command!`);
        }

        let user = await getUserFromMention(message, args[0]);
        if (!user) {
            user = message.guild.members.cache.get(args[0]);
        }

        if (!user) {
            return client.util.container(message, `✗ | Please mention a user or provide a valid user ID.`);
        }

        if (user.id === message.guild.ownerId) {
            return client.util.container(message, `✗ | I can't kick the owner of this server.`);
        }

        if (!user.kickable) {
            return client.util.container(message, `✗ | My highest role is below <@${user.id}>, so I cannot kick them.`);
        }

        const reason = args.slice(1).join(' ') || 'No Reason Provided';
        const reasonWithModerator = `${message.author.tag} (${message.author.id}) | ${reason}`;

        
        const confirmContainer = new ContainerBuilder();
        confirmContainer.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `# Kick Confirmation\n\n` +
                `**Member:** ${user} (${user.id})\n` +
                `**Reason:** ${reason}\n\n` +
                `Are you sure you want to kick this member?`
            )
        );

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('yes_kick').setLabel('Yes').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('no_kick').setLabel('No').setStyle(ButtonStyle.Secondary)
        );

        const confirmMsg = await message.channel.send({
            flags: MessageFlags.IsComponentsV2,
            components: [confirmContainer, row],
            allowedMentions: { parse: [] }
        });

        const filter = interaction => (interaction.customId === 'yes_kick' || interaction.customId === 'no_kick') && interaction.user.id === message.author.id;
        const collector = confirmMsg.createMessageComponentCollector({ filter, time: 60000 });

        collector.on('collect', async interaction => {
            if (interaction.customId === 'yes_kick') {
                await interaction.deferUpdate();

                try {

                    try {
                        const dmEmbed = new EmbedBuilder()
                            .setColor('#ff6b6b')
                            .setTitle('You Have Been Kicked')
                            .addFields(
                                { name: 'Server', value: message.guild.name, inline: false },
                                { name: 'Moderator', value: message.author.tag, inline: false },
                                { name: 'Reason', value: reason, inline: false }
                            )
                            .setTimestamp();

                        await user.send({ embeds: [dmEmbed] });
                    } catch (err) {
                        
                    }

                    await message.guild.members.kick(user.id, reasonWithModerator);
                    await confirmMsg.delete();
                    
                    await client.util.container(message,
                        `✓ | Successfully kicked **${user.user.tag}** from the server.\n\n**Reason:** ${reason}`
                    );

                    
                    

                } catch (err) {
                    await confirmMsg.delete();
                }

                collector.stop();

            } else if (interaction.customId === 'no_kick') {
                await confirmMsg.delete();
                await interaction.deferUpdate();
                await client.util.container(message, `✗ | Kick action canceled.`);
                collector.stop();
            }
        });

        collector.on('end', collected => {
            if (collected.size === 0) {
                confirmMsg.edit({
                    components: []
                }).catch(() => { });
            }
        });
    }
};

async function getUserFromMention(message, mention) {
    if (!mention) return null;

    const matches = mention.match(/^<@!?(\d+)>$/);
    if (!matches) return null;

    const id = matches[1];
    try {
        return await message.guild.members.fetch(id);
    } catch (err) {
        return null;
    }
}
