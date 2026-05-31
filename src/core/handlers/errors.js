const IGNORED_CODES = new Set([
    10008, 4000, 10001, 10003,
    10004, 10005, 50001, 10062,
    50013, 50035,
]);

function send(webhook, content) {
    webhook.send(`\`\`\`js\n${content}\`\`\``).catch(() => {});
}

module.exports = function registerErrorHandlers(client) {
    const { error: errHook, ratelimit: rlHook } = client;

    client.on("error", err => {
        if (IGNORED_CODES.has(err.code)) return;
        send(errHook, err.stack);
    });

    process.on("unhandledRejection", err => {
        send(errHook, err?.stack ?? err);
    });

    process.on("uncaughtException", err => {
        if (IGNORED_CODES.has(err.code)) return;
        send(errHook, err.stack);
        console.error(err);
    });

    process.on("uncaughtExceptionMonitor", (err, origin) => {
        send(errHook, `${err}\n${origin}`);
    });

    process.on("warning", warn => {
        send(errHook, warn);
    });

    client.rest.on("rateLimited", info => {
        const { route, limit, remaining, resetAfter } = info;
        client.rateLimits.set(route, { limit, remaining, resetAfter, lastReset: Date.now() });
        send(rlHook,
            `Timeout: ${info.retryAfter} | Limit: ${info.limit} | Method: ${info.method}\n` +
            `Route: ${info.route} | Global: ${info.global} | URL: ${info.url}`
        );
    });
};
