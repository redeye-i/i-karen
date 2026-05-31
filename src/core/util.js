const { EmbedBuilder, Collection, ButtonStyle, ActionRowBuilder, ButtonBuilder, PermissionsBitField, ChannelType, ContainerBuilder, MessageFlags, TextDisplayBuilder, messageLink, Component, AllowedMentionsTypes, SectionBuilder, ThumbnailBuilder, SeparatorBuilder } = require('discord.js')
const antinuke = require('../models/antinuke.js');
this.config = require('./Config.js');
const AntiNukeMemory = require('../core/antinukeMemory');
let globalCooldown
module.exports = class Util {
    constructor(client) {
        this.client = client;
    }

    async parse(content, member) {
        let mention = `<@${member.user.id}>`
        return content
            .replaceAll(/\\n/g, '\n')
            .replaceAll(/{server}/g, member.guild.name)
            .replaceAll(/{count}/g, member.guild.memberCount)
            .replaceAll(/{member:name}/g, member.displayName)
            .replaceAll(/{member:mention}/g, mention)
            .replaceAll(/{member:id}/g, member.user.id)
            .replaceAll(/{member:created_at}/g, `<t:${Math.round(member.user.createdTimestamp / 1000)}:R>`)
    }

    async isExtraOwner(member, guild) {
        const data = AntiNukeMemory.get(guild.id);
        if (!data) return false;
        if (data.extraOwners?.has(member.id)) return true;
        else return false;
    }

    isHex(text) {
        return /^#[0-9A-F]{6}$/i.test(text)
    }

    hasHigher(member) {
        if (
            member.roles.highest.position <=
            member.guild.members.me.roles.highest.position &&
            member.user.id != member.guild.ownerId
        )
            return false
        else return true
    }

    countCommandsAndSubcommands = (client) => {
        let totalCount = 0;

        this.client.commands.forEach(command => {
            totalCount++;

            if (command.subcommand && Array.isArray(command.subcommand)) {
                totalCount += command.subcommand.length;
            }
        });

        return totalCount;
    };

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes'
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
        const i = Math.floor(Math.log(bytes) / Math.log(1024))
        return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(2))} ${sizes[i]}`
    }

    async setPrefix(message, client) {
        let prefix = await this.client.db.get(`prefix_${message?.guild?.id}`)
        if (prefix === null) prefix = '&'
        message.guild.prefix = prefix
    }
    async noprefix() {
        let data = (await this.client.db.get('noprefix_users')) || [];
        this.client.noprefix = Object.keys(data);
        this.client.noprefixData = data;
    }
    async blacklist() {
        let data = (await this.client.db.get('blacklist_user')) || [];
        this.client.blacklist = Object.keys(data);
    }

    async blacklistserver() {
        let data = (await this.client.db.get(`blacklist_server`)) || [];
        this.client.blacklistserver = Object.keys(data);
    }
    async BlacklistCheck(guild) {
        let data = this.client.blacklistserver || [];
        return data.includes(guild.id)
    }

    async MaintananceCheck() {
        let main = await this.client.db.get(`karen_maintanance`) || false;
        this.client.maintanance = main;
    }

    async sleep(ms) {
        return await new Promise((resolve) => setTimeout(resolve, ms))
    }

    async handleRateLimit() {
        globalCooldown = true
        await this.client.util.sleep(5000)
        globalCooldown = false
    }

    embed() {
        return new EmbedBuilder()
    }

    async container(message, text) {
        const container = new ContainerBuilder();

        container.addTextDisplayComponents(
            new TextDisplayBuilder()
                .setContent(text)
        );

        try {
            return await message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [container],
                allowedMentions: { repliedUser: true }

            });
        } catch (error) {
            return await message.channel.send({
                flags: MessageFlags.IsComponentsV2,
                components: [container],
                allowedMentions: { parse: [] }
            });
        }
    }

    Textcontainer(text) {
        const container = new ContainerBuilder();
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
        return container;
    }

    async SendAntiNukelogs(message, text) {
        const anti = await antinuke.findById(message.guild.id).lean();
        let channel;
        if (anti?.logChannel) { channel = await this.client.channels.fetch(anti.logChannel).catch(() => null); }
        const container = new ContainerBuilder();
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`**# Antinuke ➜ ${message.guild.name}**`));
        container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

        container.addSectionComponents(new SectionBuilder().addTextDisplayComponents(...[`**Admin**: [${message.author.displayName}](https://discord.com/users/${message.author.id})`, `**Action**: \`${text[0]}\``, `${text[1]} ➡ ${text[2]}`].map(t => new TextDisplayBuilder().setContent(t))).setThumbnailAccessory(new ThumbnailBuilder().setURL(message.author.displayAvatarURL())));
        container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
        if (channel !== null && channel !== undefined) {
            await channel.send({ flags: MessageFlags.IsComponentsV2, components: [container] });
        }
        const shouldDM = anti?.notifyowners;
        if (shouldDM) {
            try {
                await (await this.client.users.fetch(message.guild.ownerId))
                    .send({
                        flags: MessageFlags.IsComponentsV2,
                        components: [container],
                        allowedMentions: { parse: [] }
                    });
            }
            catch {
                
            }
        }

    }
    async karenPagination(membersList, title, client, message) {
        const lodash = require('lodash');

        const pages = lodash.chunk(membersList, 10);
        let currentPage = 0;

        const generateEmbed = () => {
            return new EmbedBuilder()
                .setTitle(title)
                .setDescription(pages[currentPage].join('\n')) 
                .setColor('#00FFFF')
                .setAuthor({
                    name: message.guild.name,
                    iconURL: message.guild.iconURL({ dynamic: true }) || client.user.displayAvatarURL()
                })
                .setFooter({
                    text: `Page: ${currentPage + 1}/${pages.length}`,
                    iconURL: client.user.displayAvatarURL()
                });
        };

        if (pages.length === 0) {
            return message.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setDescription('No members found')
                        .setAuthor({
                            name: message.guild.name,
                            iconURL: message.guild.iconURL({ dynamic: true }) || client.user.displayAvatarURL()
                        })
                        .setFooter({
                            text: 'Page: 0',
                            iconURL: client.user.displayAvatarURL()
                        })
                        .setColor('#00FFFF')
                        .setThumbnail(client.user.displayAvatarURL())
                ]
            });
        }

        if (pages.length === 1) {
            return message.channel.send({ embeds: [generateEmbed()] });
        }

        let buttonBack = new ButtonBuilder()
            .setStyle(ButtonStyle.Secondary)
            .setCustomId('1')
            .setEmoji('◀')
            .setDisabled(true);

        let buttonHome = new ButtonBuilder()
            .setEmoji('⏹')
            .setCustomId('2')
            .setStyle(ButtonStyle.Secondary);

        let buttonForward = new ButtonBuilder()
            .setStyle(ButtonStyle.Secondary)
            .setCustomId('3')
            .setEmoji('▶️');

        let buttonFirst = new ButtonBuilder()
            .setStyle(ButtonStyle.Secondary)
            .setCustomId('4')
            .setEmoji('⏮')
            .setDisabled(true);

        let buttonLast = new ButtonBuilder()
            .setStyle(ButtonStyle.Secondary)
            .setCustomId('5')
            .setEmoji('⏭');

        const allButtons = [
            new ActionRowBuilder().addComponents([
                buttonFirst,
                buttonBack,
                buttonHome,
                buttonForward,
                buttonLast
            ])
        ];

        let swapmsg = await message.channel.send({
            embeds: [generateEmbed()],
            components: allButtons
        });

        const collector = swapmsg.createMessageComponentCollector({
            filter: (i) => i.isButton() && i.user.id === message.member.id,
            time: 60000
        });

        collector.on('collect', async (b) => {
            if (b.customId == '1') {
                
                if (currentPage !== 0) {
                    currentPage--;
                    if (currentPage === 0) {
                        buttonBack.setDisabled(true);
                        buttonFirst.setDisabled(true);
                    }
                    buttonForward.setDisabled(false);
                    buttonLast.setDisabled(false);
                }
            } else if (b.customId == '2') {
                
                buttonBack.setDisabled(true);
                buttonForward.setDisabled(true);
                buttonHome.setDisabled(true);
                buttonFirst.setDisabled(true);
                buttonLast.setDisabled(true);
            } else if (b.customId == '3') {
                
                if (currentPage < pages.length - 1) {
                    currentPage++;
                    if (currentPage === pages.length - 1) {
                        buttonForward.setDisabled(true);
                        buttonLast.setDisabled(true);
                    }
                    buttonBack.setDisabled(false);
                    buttonFirst.setDisabled(false);
                }
            } else if (b.customId == '4') {
                
                currentPage = 0;
                buttonBack.setDisabled(true);
                buttonFirst.setDisabled(true);
                buttonForward.setDisabled(false);
                buttonLast.setDisabled(false);
            } else if (b.customId == '5') {
                
                currentPage = pages.length - 1;
                buttonForward.setDisabled(true);
                buttonLast.setDisabled(true);
                buttonBack.setDisabled(false);
                buttonFirst.setDisabled(false);
            }

            await swapmsg.edit({
                embeds: [generateEmbed()],
                components: [
                    new ActionRowBuilder().addComponents([
                        buttonFirst,
                        buttonBack,
                        buttonHome,
                        buttonForward,
                        buttonLast
                    ])
                ]
            });

            await b.deferUpdate();
        });

        collector.on('end', () => {
            if (swapmsg) {
                buttonBack.setDisabled(true);
                buttonForward.setDisabled(true);
                buttonHome.setDisabled(true);
                buttonLast.setDisabled(true);
                buttonFirst.setDisabled(true);
                swapmsg.edit({
                    components: [
                        new ActionRowBuilder().addComponents([
                            buttonFirst,
                            buttonBack,
                            buttonHome,
                            buttonForward,
                            buttonLast
                        ])
                    ]
                });
            }
        });
    }

    async CheckPremium(guild) {
        return false;
    }

    async sendBooster(guild, member) {
        const db = require(`${process.cwd()}/models/boost.js`)
        const data = await db.findOne({ Guild: guild.id })
        if (!data || !data.Boost) return
        try {
            let channel = guild.channels.cache.get(data.Boost)
            if (!channel) return
            let count = guild.premiumSubscriptionCount
            const embed = this.client.util.embed()
                .setColor(guild.roles.premiumSubscriberRole.color)
                .setAuthor({
                    name: `🎉🎉 NEW BOOSTER 🎉🎉`,
                    iconURL: `https://cdn.discordapp.com/emojis/1035418876470640660.gif`
                })
                .setThumbnail(member.displayAvatarURL({ dynamic: true }))
                .setDescription(
                    `**<@${member.id}> Just Boosted ${guild.name}. Thank You So Much For Boosting Our Server. We Now Have Total ${count} Boosts On Our Server!!**`
                )
                .setFooter({
                    text: `Server Boosted 🎉 `,
                    iconURL: guild.iconURL({ dynamic: true })
                })
                .setTimestamp()
            await channel.send({ embeds: [embed] })
        } catch (err) {
            return
        }
    }

    async pagination(message, description, desc = '') {
        const lodash = require('lodash')
        let previousbut = new ButtonBuilder()
            .setCustomId('queueprev')
            .setEmoji('<:ARROW1:1182736084766036059>')
            .setStyle(ButtonStyle.Success)
        let nextbut = new ButtonBuilder()
            .setCustomId('queuenext')
            .setEmoji('<:ARROW:1182735884978765957>')
            .setStyle(ButtonStyle.Success)
        let row = new ActionRowBuilder().addComponents(previousbut, nextbut)
        const pages = lodash.chunk(description, 10).map((x) => x.join(`\n`))
        let page = 0
        let msg
        if (pages.length <= 1) {
            return await message.channel.send({
                content: desc + this.client.util.codeText(pages[page])
            })
        } else {
            msg = await message.channel.send({
                content: desc + this.client.util.codeText(pages[page]),
                components: [row]
            })
        }
        const collector = message.channel.createMessageComponentCollector({
            filter: (b) => {
                if (b.user.id === message.author.id) return true
                else {
                    b.reply({
                        ephemeral: true,
                        content: `Only **${message.author.tag}** can use this button, run the command again to use the queue menu.`
                    })
                    return false
                }
            },
            time: 60000 * 5,
            idle: 30e3
        })
        collector.on('collect', async (b) => {
            if (!b.deferred) await b.deferUpdate().catch(() => { })
            if (b.message.id !== msg.id) return
            if (b.customId === 'queueprev') {
                page = page - 1 < 0 ? pages.length - 1 : --page
                return await msg
                    .edit({
                        content: desc + this.client.util.codeText(pages[page])
                    })
                    .catch((e) => {
                        return
                    })
            } else if (b.customId === 'queuenext')
                page = page + 1 >= pages.length ? 0 : ++page
            if (!msg) return
            return await msg
                .edit({
                    content: desc + this.client.util.codeText(pages[page])
                })
                .catch((e) => {
                    return
                })
        })
        collector.on('end', async () => {
            await msg.edit({ components: [] }).catch((e) => {
                return
            })
        })
    }

    codeText(text, type = 'js') {
        return `\`\`\`${type}\n${text}\`\`\``
    }

    async haste(text) {
        const req = await this.client.snek.post(
            'https://haste.ntmnathan.com/documents',
            { text }
        )
        return `https://haste.ntmnathan.com/${req.data.key}`
    }

    removeDuplicates(arr) {
        return [...new Set(arr)]
    }

    removeDuplicates2(arr) {
        return [...new Set(arr)]
    }

}
