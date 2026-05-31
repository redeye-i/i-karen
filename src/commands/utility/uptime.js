module.exports = {
    name: 'uptime',
    category: 'info',
    premium: false,
    run: async (client, message, args) => {
        const duration1 = Math.round(
            (Date.now() - message.client.uptime) / 1000
        );
        
        return client.util.container(message,
            `#  Bot Uptime\n\n` +
            `I am online from <t:${duration1}:R>\n\n` +
            `**Exact time:** <t:${duration1}:F>`
        );
    }
};
