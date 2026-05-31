const fs = require("fs");
const path = require("path");

module.exports = async function loadCommands(client) {
    let count = 0;
    const base = path.join(process.cwd(), "src/commands");
    const dirs = fs.readdirSync(base);

    for (const dir of dirs) {
        if (dir === "helpers") continue;

        const files = fs
            .readdirSync(path.join(base, dir))
            .filter(f => f.endsWith(".js"));

        for (const file of files) {
            const command = require(path.join(base, dir, file));
            if (!command.name) continue;
            client.commands.set(command.name, { directory: dir, ...command });
            count++;
        }
    }

    client.logger.update(`Commands loaded: ${count}`);
};
