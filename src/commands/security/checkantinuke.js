const AntiNukeMemory = require('../../core/antinukeMemory');

module.exports = {
  name: 'anticheck',
  aliases: ['antiwizz', 'an'],
  category: 'security',

  run: async (client, message, args) => {
    if (!message.guild) return;

    const g = AntiNukeMemory.get(message.guild.id);

    console.log('AntiNukeMemory object:', AntiNukeMemory);
    console.log('Guild cache:', g);

    message.channel.send(
      `Anti-Nuke is currently **${g ? 'Enabled' : 'Disabled'}** for this server.`
    );
  }
};
