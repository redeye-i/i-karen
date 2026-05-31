class AntiNukeMemory {
  constructor() {
    this.guilds = new Map();
  }

  has(guildId) {
    return this.guilds.has(guildId);
  }

  get(guildId) {
    return this.guilds.get(guildId);
  }

  set(guildId, data) {
    this.guilds.set(guildId, data);
  }

  delete(guildId) {
    this.guilds.delete(guildId);
  }

  clear() {
    this.guilds.clear();
  }
}

module.exports = new AntiNukeMemory();
