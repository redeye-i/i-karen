const { Collection } = require('discord.js');

class CooldownManager {
    constructor() {
        this.cooldowns = new Map();
        this.commandLimit = 5;
    }

    async checkCooldown(client, message, command) {
        if (client.config.owner.includes(message.author.id)) {
            return { allowed: true };
        }

        if (!this.cooldowns.has(command.name)) {
            this.cooldowns.set(command.name, new Collection());
        }

        const now = Date.now();
        const timestamps = this.cooldowns.get(command.name);
        const cooldownAmount = (command.cooldown || 5) * 1000;

        if (!timestamps.has(message.author.id)) {
            timestamps.set(message.author.id, now);
            timestamps.set(`${message.author.id}_count`, 1);
            
            setTimeout(() => {
                timestamps.delete(message.author.id);
                timestamps.delete(`${message.author.id}_count`);
                timestamps.delete(`${message.author.id}_cooldown_message_sent`);
            }, cooldownAmount);

            return { allowed: true };
        }

        const expirationTime = timestamps.get(message.author.id) + cooldownAmount;

        if (now < expirationTime) {
            const timeLeft = (expirationTime - now) / 1000;
            let commandCount = timestamps.get(`${message.author.id}_count`) || 0;
            commandCount++;
            timestamps.set(`${message.author.id}_count`, commandCount);

            if (commandCount > this.commandLimit) {
                await this.blacklistUser(client, message.author.id);
                return { 
                    allowed: false, 
                    blacklisted: true 
                };
            }

            if (!timestamps.has(`${message.author.id}_cooldown_message_sent`)) {
                timestamps.set(`${message.author.id}_cooldown_message_sent`, true);
                return { 
                    allowed: false, 
                    timeLeft: timeLeft.toFixed(1),
                    showMessage: true
                };
            }

            return { allowed: false };
        }

        timestamps.set(message.author.id, now);
        timestamps.set(`${message.author.id}_count`, 1);
        setTimeout(() => {
            timestamps.delete(message.author.id);
            timestamps.delete(`${message.author.id}_count`);
            timestamps.delete(`${message.author.id}_cooldown_message_sent`);
        }, cooldownAmount);

        return { allowed: true };
    }

    async blacklistUser(client, userId) {
        let blacklistedUsers = (await client.db.get(`blacklist_${client.user.id}`)) || [];
        if (!blacklistedUsers.includes(userId)) {
            blacklistedUsers.push(userId);
            await client.db.set(`blacklist_${client.user.id}`, blacklistedUsers);
            client.util.blacklist();
        }
    }
}

module.exports = new CooldownManager();
