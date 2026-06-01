const mongoose = require("mongoose");

const enabledmodules = new mongoose.Schema(
  {
    antiban: { type: Boolean, default: true },
    antiunban: { type: Boolean, default: true },
    antikick: { type: Boolean, default: true },
    antibotadd: { type: Boolean, default: true },
    antilink: { type: Boolean, default: true },
    antichannel: { type: Boolean, default: true },
    antirole: { type: Boolean, default: true },
    antiwebhook: { type: Boolean, default: true },
    antiserver: { type: Boolean, default: true },
    antiemoji: { type: Boolean, default: true },
    antisticker: { type: Boolean, default: true },
    antiintegration: { type: Boolean, default: true },
    antithread: { type: Boolean, default: true },
    antimention: { type: Boolean, default: true },
  },
  { _id: false },
);

const AntinukeSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    enabled: { type: Boolean, default: false },
    punishment: { type: String, default: "ban" },
    logChannel: { type: String, default: null },
    notifyowners: { type: Boolean, default: true },
    unbypassRoleId: { type: String, default: null },
    quarantineroleid: { type: String, default: null },
    panic: { type: Boolean, default: false },
    panicWhitelistRoles: {
      type: [String],
      default: [],
    },
    protectedRoles: {
      type: [String],
      default: [],
    },
    extraowner: {
      type: [String],
      default: [],
    },
    enabledmodules: {
      type: enabledmodules,
      default: () => ({}),
    },
    whitelist: {
      type: Map,
      of: [String],
      default: {},
    },
    panicBackup: {
      type: Map,
      of: String,
      default: {},
    },
    securityBackup: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    quarantineData: {
      type: Map,
      of: {
        oldRoles: { type: [String], default: [] },
        removedDangerousRoles: { type: [String], default: [] },
        reason: { type: String, default: "No reason provided" },
        timestamp: { type: Date, default: Date.now },
      },
      default: {},
    },
    punishedusers: {
      type: Map,
      of: {
        reason: { type: String, default: "No reason provided" },
        action: { type: String, default: null },
        punishedAt: { type: Date, default: Date.now },
      },
    },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Antinuke", AntinukeSchema);
