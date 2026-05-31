const mongoose = require("mongoose");

const automodSchema = new mongoose.Schema({
  guildid: { type: String, required: true, unique: true },

  antilink: {
    enabled:     { type: Boolean,  default: false },
    wlrole:      { type: [String], default: [] },
    allowedlink: { type: [String], default: [] },
    wlchannel:   { type: [String], default: [] },
  },

  antiinvite: {
    enabled:   { type: Boolean,  default: false },
    wlrole:    { type: [String], default: [] },
    wlchannel: { type: [String], default: [] },
  },

  antispam: {
    enabled:   { type: Boolean,  default: false },
    threshold: { type: Number,   default: 5 },   
    window:    { type: Number,   default: 5 },   
    wlrole:    { type: [String], default: [] },
    wlchannel: { type: [String], default: [] },
  },

  antimention: {
    enabled:   { type: Boolean,  default: false },
    threshold: { type: Number,   default: 5 },   
    wlrole:    { type: [String], default: [] },
    wlchannel: { type: [String], default: [] },
  },

  

  anticaps: {
    enabled:   { type: Boolean, default: false },
    threshold: { type: Number,  default: 70 },   
    wlrole:    { type: [String], default: [] },
    wlchannel: { type: [String], default: [] },
  },

  antiflood: {
    enabled:   { type: Boolean, default: false },
    threshold: { type: Number,  default: 3 },    
    window:    { type: Number,  default: 5 },    
    wlrole:    { type: [String], default: [] },
    wlchannel: { type: [String], default: [] },
  },

  antizalgo: {
    enabled:   { type: Boolean, default: false },
    wlrole:    { type: [String], default: [] },
    wlchannel: { type: [String], default: [] },
  },

  antiemoji: {
    enabled:   { type: Boolean, default: false },
    threshold: { type: Number,  default: 8 },    
    wlrole:    { type: [String], default: [] },
    wlchannel: { type: [String], default: [] },
  },

  wordfilter: {
    enabled:   { type: Boolean,  default: false },
    words:     { type: [String], default: [] },
    wlrole:    { type: [String], default: [] },
    wlchannel: { type: [String], default: [] },
  },

  

  punishment: { type: String, default: "none" },
  logchannel: { type: String, default: null },
});

module.exports = mongoose.model("Automod", automodSchema);
