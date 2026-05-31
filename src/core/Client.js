const { Client, Collection, Partials, WebhookClient } = require("discord.js");
const axios = require("axios");

const config        = require("./Config");
const logger        = require("./logger");
const Utils         = require("./util");
const sentinel      = require("./sentinel");
const logSendHandler = require("./logSendHandler");

const registerErrorHandlers = require("./handlers/errors");
const { initSQL, initMongo, initCache } = require("./loaders/database");
const loadCommands  = require("./loaders/commands");
const loadEvents    = require("./loaders/events");

module.exports = class karen extends Client {
    constructor() {
        super({
            intents: 53608191,
            fetchAllMembers: true,
            allowedMentions: { parse: ["users"], repliedUser: true },
            partials: [Partials.Message, Partials.Channel, Partials.Reaction],
            sweepers: { messages: { interval: 300, lifetime: 1800 } },
        });

        this.config   = config;
        this.logger   = logger;
        this.snek     = axios;
        this.color    = 0xff0000;
        this.support  = "https://discord.gg/S7Ju9RUpbT";
        this.ready    = false;

        this.commands   = new Collection();
        this.cooldowns  = new Collection();
        this.rateLimits = new Collection();

        this.sntl          = new sentinel(this);
        this.util          = new Utils(this);
        this.logSendHandler = new logSendHandler(this);

        this.ratelimit = new WebhookClient({ url: "https://discord.com/api/webhooks/1269946396434497568/-r5ZOP0b0kGG4ZM6Rh1DUTkbrBopQYrJYg0ujy8IzXy2G0hZFzBqMwTJYOHio39OrJlt" });
        this.error     = new WebhookClient({ url: "https://discord.com/api/webhooks/1180429380321804289/hK4ERW6vGMAjvO1VuGXyuKre60Zw1X3xkHhVChshBn7mNhhbtPODOeB1S1LFF_hZpTNp" });

        this.setMaxListeners(Infinity);
        registerErrorHandlers(this);
    }

    async init() {
        await initMongo(this);
        await initCache(this);
        await initSQL(this);
        await loadEvents(this);
        await loadCommands(this);
        await this.login(this.config.TOKEN);
    }
};
