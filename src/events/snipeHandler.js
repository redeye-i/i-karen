'use strict';

module.exports = (client) => {
    
    const insertSnipe = client.snipe.prepare(
        `INSERT INTO snipes (guildId, channelId, content, author, authorId, authorAvatar, timestamp, imageUrl)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );

    
    const trimSnipes = client.snipe.prepare(
        `DELETE FROM snipes
         WHERE guildId = ?
           AND id NOT IN (
               SELECT id FROM snipes WHERE guildId = ? ORDER BY timestamp DESC LIMIT 50
           )`,
    );

    client.on('messageDelete', async (msg) => {
        try {
            
            if (!msg.guild || msg.author?.bot) return;

            
            if (msg.partial) {
                try { await msg.fetch(); } catch { return; }
            }
            if (!msg.author) return;

            const content = msg.content || '';
            const imageUrl =
                msg.attachments.size > 0 ? msg.attachments.first().url : null;

            insertSnipe.run(
                msg.guild.id,
                msg.channel.id,
                content,
                msg.author.tag,
                msg.author.id,
                msg.author.displayAvatarURL({ extension: 'png', size: 256 }),
                msg.createdTimestamp,
                imageUrl,
            );

            
            trimSnipes.run(msg.guild.id, msg.guild.id);
        } catch (err) {
            client.logger.error(`[Snipe] messageDelete handler error: ${err}`, err);
        }
    });
};
