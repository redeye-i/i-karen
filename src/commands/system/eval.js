const { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');

this.config = require(`${process.cwd()}/config.json`);

module.exports = {
    name: 'eval',
    aliases: ['ev', 'jaduexe'],
    category: 'owner',
    run: async (client, message, args) => {
        if (!this.config.owner.includes(message.author.id)) return;

        const content = message.content.split(' ').slice(1).join(' ');
        const result = new Promise((resolve) => resolve(eval(content)));

        await message.delete();
        return result
            .then((output) => {
                if (typeof output !== 'string') {
                    output = require('util').inspect(output, { depth: 0 });
                }

                output = output
                    .replaceAll(client.token, 'T0K3N')
                    .replaceAll(client.config.MONGO_DB, 'T0K3N');

                
                const codeBlock = `\`\`\`js\n${output}\`\`\``;
                if (codeBlock.length > 1990) {
                    output = output.substring(0, 1900) + '\n... (truncated)';
                }

                return;
            })
            .catch((err) => {
                err = err.toString();
                err = err.replaceAll(client.token, 'T0K3N');
                err = err.replaceAll(client.config.MONGO_DB, 'T0K3N');

                
                if (err.length > 1900) {
                    err = err.substring(0, 1900) + '\n... (truncated)';
                }

                return client.util.container(message,
                    `# ✗ Eval Error\n\n` +
                    `\`\`\`js\n${err}\`\`\``
                );
            });
    }
};
