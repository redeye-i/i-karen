const mongoose = require('mongoose');


const slotSchema = new mongoose.Schema({
    slotId:      { type: String, required: true },   
    durationDays:{ type: Number, required: true },   
    grantedBy:   { type: String, required: true },   
    grantedAt:   { type: Date,   default: Date.now },
    note:        { type: String, default: null, maxlength: 200 },
}, { _id: false });


const premiumUserSchema = new mongoose.Schema({
    userId:       { type: String, required: true, unique: true, index: true },
    slots:        { type: [slotSchema], default: [] },  
    totalGranted: { type: Number, default: 0 },          
    isBlacklisted:{ type: Boolean, default: false },
    notes:        { type: String, default: null, maxlength: 300 },
    createdAt:    { type: Date, default: Date.now },
    updatedAt:    { type: Date, default: Date.now },
}, { versionKey: false });


const premiumActivationSchema = new mongoose.Schema({
    guildId:      { type: String, required: true, unique: true, index: true },
    userId:       { type: String, required: true, index: true },

    
    activatedAt:  { type: Date, default: Date.now },
    expiresAt:    { type: Date, required: true, index: true },
    durationDays: { type: Number, required: true },
    slotId:       { type: String, default: null }, 

    
    status: {
        type: String,
        enum: ['active', 'grace_expiry', 'grace_revoke', 'paused', 'expired', 'revoked'],
        default: 'active',
        index: true,
    },

    
    graceStartedAt:  { type: Date,    default: null },
    graceEndsAt:     { type: Date,    default: null },   
    graceType:       { type: String,  default: null },   
    graceInitiator:  { type: String,  default: null },   

    
    graceDmSent:      { type: Boolean, default: false },
    graceWarn24Sent:  { type: Boolean, default: false },
    warn3dSent:       { type: Boolean, default: false },
    warn1dSent:       { type: Boolean, default: false },
    warn6hSent:       { type: Boolean, default: false },

    
    revokedAt:    { type: Date,   default: null },
    revokedBy:    { type: String, default: null }, 
    revokeReason: { type: String, default: null, maxlength: 300 },

    
    pausedAt:         { type: Date,   default: null },
    pauseRemainingMs: { type: Number, default: null },

}, { versionKey: false });


const auditLogSchema = new mongoose.Schema({
    action:        { type: String, required: true, index: true },
    actorId:       { type: String, required: true },
    actorTag:      { type: String, default: null },
    targetUserId:  { type: String, default: null, index: true },
    targetGuildId: { type: String, default: null, index: true },
    meta:          { type: mongoose.Schema.Types.Mixed, default: {} },
    severity:      { type: String, enum: ['info', 'warn', 'critical'], default: 'info' },
    createdAt:     { type: Date, default: Date.now, expires: 3888000 }, 
}, {
    versionKey: false,
    capped: { size: 8388608, max: 3000 }, 
});

module.exports = {
    PremiumUser:       mongoose.model('PremiumUser',       premiumUserSchema),
    PremiumActivation: mongoose.model('PremiumActivation', premiumActivationSchema),
    AuditLog:          mongoose.model('AuditLog',          auditLogSchema),
};
