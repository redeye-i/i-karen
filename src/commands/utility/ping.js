const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
  SectionBuilder,
  ThumbnailBuilder,
  Routes,
} = require('discord.js');

module.exports = {
  name: 'ping',
  category: 'info',
  premium: false,
  cooldown: 10,

  run: async (client, message, args) => {
    let dbPing = null;
    try {
      if (typeof client.db?.ping === 'function') {
        const raw = await client.db.ping();
        if (typeof raw === 'number') dbPing = Number(raw.toFixed(2));
      }
    } catch {
      dbPing = null;
    }

    const temp = await message.channel.send('Pinging...');
    const messageLatency = temp.createdTimestamp - message.createdTimestamp;

    let apiLatency = null;
    try {
      const start = Date.now();
      await client.rest.get(Routes.user(client.user.id));
      apiLatency = Date.now() - start;
    } catch {
      apiLatency = null;
    }

    const fmt = (v) => (v === null || v === undefined ? 'N/A' : `${Number(v).toFixed(0)}ms`);
    const wsPing = client?.ws?.ping ?? null;
    const dotEmoji = '<:dot:1443157325258166282>';

    const titleBlock = new TextDisplayBuilder().setContent('**Pong!**');

    const separator = new SeparatorBuilder()
      .setDivider(true)
      .setSpacing(SeparatorSpacingSize.Small);

    const statsContent =
      '**Latency :**\n' +
      ` **DataBase Latency:** ${fmt(dbPing ?? 0)}\n` +
      ` **WebSocket Ping:** ${fmt(wsPing)}\n`;

    const statsBlock = new TextDisplayBuilder().setContent(statsContent);

    const container = new ContainerBuilder()
      .addTextDisplayComponents(titleBlock)
      .addSeparatorComponents(separator)
      .addTextDisplayComponents(statsBlock);

    await temp.edit({
      content: null,
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });

    return temp;
  },
};
