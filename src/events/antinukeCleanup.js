"use strict";

const { Events } = require("discord.js");
const Antinuke = require("../models/antinuke");

module.exports = (client) => {
  
  client.on(Events.GuildDelete, async (guild) => {
    try {
      await Antinuke.findByIdAndUpdate(guild.id, { deletedAt: new Date() });
      client.logger.log(
        `Server ${guild.name} left. Data marked for deletion in 48 hours.`,
      );
    } catch (err) {
      client.logger.error("Error marking guild for deletion cleanup:", err);
    }
  });

  client.on(Events.GuildCreate, async (guild) => {
    try {
      const existing = await Antinuke.findById(guild.id);
      if (existing?.deletedAt) {
        await Antinuke.findByIdAndUpdate(guild.id, { $set: { deletedAt: null } });
        client.logger.log(
          `Server ${guild.name} rejoined. Deletion cleanup cancelled.`,
        );
      }
    } catch (err) {
      client.logger.error("Error cancelling guild deletion:", err);
    }
  });

  client.once(Events.ClientReady, async () => {
    const runCleanup = async () => {
      try {
        const twoDaysAgo = new Date();
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

        const result = await Antinuke.deleteMany({
          deletedAt: { $ne: null, $lt: twoDaysAgo },
        });

        if (result.deletedCount > 0) {
          client.logger.log(
            `Cleaned up Anti-Nuke data for ${result.deletedCount} inactive servers.`,
          );
        }
      } catch (err) {
        client.logger.error("Anti-Nuke Cleanup Task Error:", err);
      }
    };

    await runCleanup();
    setInterval(runCleanup, 6 * 60 * 60 * 1000);
  });
};
