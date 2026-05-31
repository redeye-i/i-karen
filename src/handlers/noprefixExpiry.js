const NP_KEY = 'noprefix_users';

const now = () => Math.floor(Date.now() / 1000);

class NoPrefixExpiryService {
    
    constructor(client, options = {}) {
        this.client = client;
        this.intervalMs = options.intervalMs || 60 * 1000;
        this.timer = null;
    }

    async start() {
        if (!this.client.noprefixData) {
            await this.client.util.noprefix();
        }

        if (this.timer) return;

        this.timer = setInterval(
            () => this.check(),
            this.intervalMs
        );

        client.logger.log(
            `[NP] Expiry service started (every ${this.intervalMs / 1000}s)`
        );
    }

    async check() {
        try {
            const data = this.client.noprefixData;
            if (!data) return;

            let changed = false;

            for (const userId in data) {
                const entry = data[userId];

                if (!entry.expiresAt) continue;

                if (entry.expiresAt <= now()) {
                    delete data[userId];
                    changed = true;

                    client.logger.warn(`[NP] Expired: ${userId}`);
                }
            }

            if (changed) {
                await this.client.db.set(NP_KEY, data);
                await this.client.util.noprefix();
            }

        } catch (err) {
            client.logger.error('[NP] Expiry service error:', err);
        }
    }

    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
            client.logger.error('[NP] Expiry service stopped');
        }
    }
}

module.exports = NoPrefixExpiryService;
