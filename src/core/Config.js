require('dotenv').config();

module.exports = {
  TOKEN: process.env.TOKEN,
  MONGO_DB: process.env.MONGO_DB,
  WEBHOOK_URL: process.env.WEBHOOK_URL,
  cooldown: process.env.COOLDOWN === 'true',
  botjoin: process.env.BOT_JOIN_CHANNEL,
  botleave: process.env.BOT_LEAVE_CHANNEL,
  botcommandlog: process.env.BOT_COMMAND_LOG_CHANNEL,
  owner: (process.env.OWNERS || '').split(',').map(s => s.trim()).filter(Boolean),
  np: (process.env.NP_USERS || '').split(',').map(s => s.trim()).filter(Boolean),
  invite: process.env.INVITE_LINK || "",
  baseText: process.env.BASE_TEXT || "```ml\n<> - Required Argument | () - Optional Argument```"
};
