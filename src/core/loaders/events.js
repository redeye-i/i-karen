const fs = require("fs");
const path = require("path");

module.exports = async function loadEvents(client) {
    const dir = path.join(process.cwd(), "src/events");
    const files = fs.readdirSync(dir);
    let loaded = 0;

    for (const file of files) {
        try {
            const event = require(path.join(dir, file));
            if (typeof event !== "function") throw new TypeError("Export is not a function");
            event(client);
            loaded++;
        } catch (err) {
            client.logger.error(`Failed to load event: ${file} — ${err.message}`);
        }
    }

    client.logger.update(`Events loaded: ${loaded}/${files.length}`);
};
