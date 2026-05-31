const { ActivityType, Events } = require('discord.js');
const { loadAntiNuke } = require('../core/loadAntiNuke');
const { loadAutomodCache } = require('../commands/automod/automod');

module.exports = async (client) => {
    client.once(Events.ClientReady, async () => {
        client.ready = true;

        client.user.setPresence({
            activities: [{
                name: 'meow !!',
                type: ActivityType.Listening
            }],
            status: 'dnd'
        });

        client.logger.log(`Logged in as ${client.user.tag}`, 'ready');

        try {
            await loadAntiNuke();
        }

        catch (err) {
            client.logger.error(`Failed to load anti-nuke data: ${err}`, err);
        }

        try {
            await loadAutomodCache();
        } catch (err) {
            client.logger.error(`Failed to load automod cache: ${err}`, err);
        }

        try {
            await client.util.noprefix();
            await client.util.blacklist();
            await client.util.blacklistserver();
            await client.util.MaintananceCheck();
        } catch (err) {
            client.logger.error(`[UTIL ERROR]: ${err}`, err);
        }

        const NoPrefixExpiryService = require('../handlers/noprefixExpiry');
        client.npExpiryService = new NoPrefixExpiryService(client, {
            intervalMs: 60 * 1000
        });

        

        await client.npExpiryService.start();
    });
};
