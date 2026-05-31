const { Client, ActionRowBuilder, ButtonBuilder } = require('discord.js');

module.exports = {
    name: 'globalban',
    aliases: ['gban'],
    category: 'owner',
    run: async (client, message, args) => {
        if (!this.config.owner.includes(message.author.id)) return;
        
        if (!args[0]) {
            return client.util.container(message,
                `✗ | Please provide a valid user ID or mention a member.`
            );
        }
        
        let userId;
        if (args[0].startsWith('<@') && args[0].endsWith('>')) {
            userId = getUserFromMention(args[0]);
        } else {
            try {
                const user = await client.users.fetch(args[0]);
                userId = user.id;
            } catch (error) {
                return client.util.container(message,
                    `✗ | Please provide a valid user ID or mention a member.`
                );
            }
        }

        if (!userId) {
            return client.util.container(message,
                `✗ | Could not resolve user ID.`
            );
        }

        
        const statusMsg = await message.channel.send(
            `#  Global Ban In Progress\n\n` +
            `Banning user **${userId}** across all servers...\n\n` +
            ` This may take a while...`
        );

        
        const results = await client.cluster.broadcastEval(async (client, { userId }) => {
            const mutualGuilds = client.guilds.cache.filter(guild => guild.members.cache.has(userId));
            let results = [];
            
            for (const [guildId, guild] of mutualGuilds) {
                try {
                    await new Promise(resolve => setTimeout(resolve, 2000)); 
                    await guild.members.ban(userId, { 
                        reason: "User has been globally banned due to repeated and severe violations of Discord's terms of service, including but not limited to harassment, nuking, spamming, distributing malicious content, and engaging in activities that undermine the safety and well-being of the Discord community. This global ban is a result of a pattern of behavior that is deemed unacceptable, and it is necessary to ensure the integrity and security of multiple servers on the platform."
                    });
                    results.push(`✓ Banned from ${guild.name}`);
                } catch (err) {
                    results.push(`✗ Couldn't ban from ${guild.name}: ${err.message}`);
                    if (err.code === 429) {
                        
                        await new Promise(resolve => setTimeout(resolve, 5000));
                    }
                }
            }
            return results;
        }, { context: { userId } });

        
        const allResults = results.flat();
        
        if (allResults.length === 0) {
            return statusMsg.edit(
                `# ⓘ Global Ban Complete\n\n` +
                `User **${userId}** is not in any mutual servers.`
            );
        }

        
        const successes = allResults.filter(r => r.startsWith('✓')).length;
        const failures = allResults.filter(r => r.startsWith('✗')).length;

        
        await statusMsg.edit(
            `# ✓ Global Ban Complete\n\n` +
            `**User ID:** ${userId}\n` +
            `**Successful Bans:** ${successes}\n` +
            `**Failed Bans:** ${failures}\n\n` +
            `Sending detailed results...`
        );

        
        const chunkSize = 10;
        for (let i = 0; i < allResults.length; i += chunkSize) {
            const chunk = allResults.slice(i, i + chunkSize);
            await message.channel.send(chunk.join('\n'));
        }
    }
};

function getUserFromMention(mention) {
    const matches = mention.match(/^<@!?(\d+)>$/);
    return matches ? matches[1] : null;
}
