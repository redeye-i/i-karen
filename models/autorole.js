const mongoose = require('mongoose');

const AutoRoleSchema = new mongoose.Schema(
    {
        _id: { type: String, required: true },
        roles: { type: [String], default: [] },
        enabled: { type: Boolean, default: true },
    },
    { timestamps: true },
);

module.exports = mongoose.model('AutoRole', AutoRoleSchema);
