require("module-alias/register");

const karen = require("./core/Client");
const client = new karen();

client.init().catch(err => {
    client.logger.error(`Startup failed — ${err.message}`);
    console.error(err);
});
