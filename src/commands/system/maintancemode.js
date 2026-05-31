module.exports = {
    name: 'maintanance',
    aliases: ['maintain'],
    category: 'owner',
    run: async (client, message, args) => {
        if (!client.config.owner.includes(message.author.id)) return;

        let maintain = await client.db.get(`karen_maintanance`);

        switch (args[0]) {
            case 'enable':
                if (!maintain) {
                    await client.db.set(`karen_maintanance`, true);
                    await client.util.MaintananceCheck();
                    return client.util.container(message,
                        `# ✓ Maintenance Mode Enabled\n\n` +
                        `Maintenance mode has been successfully enabled!\n\n` +
                        `The bot will now reject commands from non-owners.`
                    );
                } else {
                    return client.util.container(message,
                        `# ⓘ Already Enabled\n\n` +
                        `Maintenance mode is already enabled.`
                    );
                }
            case 'disable':
                if (maintain) {
                    await client.db.set(`karen_maintanance`, false);
                    await client.util.MaintananceCheck();
                    return client.util.container(message,
                        `# ✓ Maintenance Mode Disabled\n\n` +
                        `Maintenance mode has been successfully disabled!\n\n` +
                        `The bot is now available for all users.`
                    );
                } else {
                    return client.util.container(message,
                        `# ⓘ Already Disabled\n\n` +
                        `Maintenance mode is not currently enabled.`
                    );
                }
            default:
                return client.util.container(message,
                    `# ✗ Invalid Arguments\n\n` +
                    `Please provide valid arguments.\n\n` +
                    `**Usage:**\n` +
                    `\`maintanance enable\` - Enable maintenance mode\n` +
                    `\`maintanance disable\` - Disable maintenance mode`
                );
        }
    }
};
