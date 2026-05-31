# karen

A Discord moderation and security bot built with discord.js v14. Designed for server protection, anti-nuke enforcement, auto-moderation, and general moderation tooling.

---

## Requirements

- Node.js v18 or higher
- MongoDB instance (Atlas or self-hosted)
- A Discord bot application with the necessary intents enabled

---

## Setup

**1. Clone the repository**

```bash
git clone https://github.com/redeye-i/i-karen.git
cd i-karen
```

**2. Install dependencies**

```bash
npm install
```

**3. Configure environment**

Copy `.env.example` to `.env` and fill in the values.

```bash
cp .env.example .env
```

**4. Start the bot**

```bash
npm start
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `TOKEN` | Discord bot token |
| `MONGO_DB` | MongoDB connection URI |
| `WEBHOOK_URL` | Webhook URL for general logging |
| `COOLDOWN` | Enable command cooldowns (`true` / `false`) |
| `BOT_JOIN_CHANNEL` | Channel ID to log when the bot joins a server |
| `BOT_LEAVE_CHANNEL` | Channel ID to log when the bot leaves a server |
| `BOT_COMMAND_LOG_CHANNEL` | Channel ID to log executed commands |
| `OWNERS` | Comma-separated user IDs with owner-level access |
| `NP_USERS` | Comma-separated user IDs that can manage no-prefix access |
| `INVITE_LINK` | Bot invite link (optional) |
| `BASE_TEXT` | Argument format hint shown in help output |

---

## Project Structure

```
src/
├── commands/
│   ├── automod/        Auto-moderation configuration
│   ├── moderation/     Ban, kick, mute, purge, lock, snipe, etc.
│   ├── security/       Anti-nuke, whitelist, quarantine, extra owner
│   ├── system/         Owner-only bot management commands
│   └── utility/        Help, ping, uptime, role info
├── core/
│   ├── handlers/
│   │   └── errors.js   Process and client error handling
│   ├── loaders/
│   │   ├── commands.js Command registration
│   │   ├── events.js   Event registration
│   │   └── database.js SQL and MongoDB initialization
│   ├── Client.js       Extended Discord.js client
│   ├── Config.js       Environment variable bindings
│   ├── logger.js       Styled console logger
│   ├── sentinel.js     Anti-nuke enforcement engine
│   └── util.js         Shared utility methods
├── events/             Discord gateway event handlers
├── handlers/           Command execution, cooldowns, no-prefix expiry
├── models/             Mongoose schemas
└── index.js            Entry point
```

---

## Commands

### Moderation

| Command | Description |
|---|---|
| `ban` | Ban a member from the server |
| `unban` | Unban a user by ID |
| `unbanall` | Unban all banned users |
| `kick` | Kick a member from the server |
| `mute` | Timeout a member |
| `unmute` | Remove a timeout from a member |
| `unmuteall` | Remove timeouts from all members |
| `warn` | Issue a warning to a member |
| `purge` | Bulk delete messages in a channel |
| `lock` | Lock a channel |
| `unlock` | Unlock a channel |
| `hide` | Hide a channel from view |
| `unhide` | Restore channel visibility |
| `nick` | Change a member's nickname |
| `role` | Add or remove a role from a member |
| `massrole` | Assign a role to all members |
| `modrole` | Set the moderator role |
| `autorole` | Configure auto-assigned roles on join |
| `prefix` | Change the server command prefix |
| `snipe` | Retrieve recently deleted messages |
| `pb` | Purge messages from a specific user |
| `list` | List members with a specific role or permission |

### Security

| Command | Description |
|---|---|
| `antinuke` | Configure anti-nuke protection settings |
| `checkantinuke` | View current anti-nuke configuration |
| `whitelist` | Manage the anti-nuke whitelist |
| `extraowner` | Manage extra owner access |
| `quarantine` | View quarantined users |
| `quarantineadd` | Manually quarantine a user |

### Auto Mod

| Command | Description |
|---|---|
| `automod` | Configure auto-moderation rules (anti-link, anti-mention, anti-spam, etc.) |

### Utility

| Command | Description |
|---|---|
| `help` | Display the command menu |
| `ping` | Show bot latency and API response time |
| `uptime` | Show how long the bot has been running |
| `roleinfo` | Display information about a role |

### System (Owner only)

| Command | Description |
|---|---|
| `blacklist` | Manage the user blacklist |
| `blacklistserver` | Manage the server blacklist |
| `globalban` | Globally ban a user across all servers |
| `leaveserver` | Force the bot to leave a server |
| `serverlist` | List all servers the bot is in |
| `noprefix` | Manage no-prefix access for users |
| `maintancemode` | Toggle maintenance mode |
| `reloadcache` | Reload internal caches |
| `eval` | Execute arbitrary code (restricted) |

---

## Database

The bot uses two database layers:

- **MongoDB** via Mongoose — stores anti-nuke configs, autorole settings, and automod rules
- **SQLite** via better-sqlite3 — stores warnings, snipe history, and command usage counts

Both are initialized automatically on startup.

---

## License

ISC
