module.exports = {
    name: 'leaveserver',
    category: 'owner',
    aliases: ['leaveg', 'gleave'],
    description: 'Leaves A Guild',
    run: async (client, message, args) => {
        if (!client.config.owner.includes(message.author.id)) return;
        
        let id = args[0];
        
        if (!id) {
            return client.util.container(message,
                `✗ | Please provide a server ID.`
            );
        }
        
        let guild;
        try {
            guild = await client.guilds.fetch(id);
        } catch (error) {
            return client.util.container(message,
                `✗ | Please provide a valid server ID.`
            );
        }
        
        if (!guild) {
            return client.util.container(message,
                `✗ | Could not find a server with that ID.`
            );
        }
        
        let name = guild.name || 'Unknown Server';
        
        try {
            await guild.leave();
            return client.util.container(message,
                `✓ | Successfully left **${name}** (${id}).`
            );
        } catch (error) {
            return client.util.container(message,
                `✗ | Failed to leave **${name}** (${id}).\n\n` +
                `Error: ${error.message}`
            );
        }
    }
};
