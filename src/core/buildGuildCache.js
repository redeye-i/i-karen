const DEFAULT_MODULES = {
  antiban: true,
  antiunban: true,
  antikick: true,
  antibotadd: true,
  antilink: true,
  antichannel: true,
  antirole: true,
  antiwebhook: true,
  antiserver: true,
  antiemoji: true,
  antisticker: true,
  antiintegration: true,
  antithread: true,
  antimention: true,
};

function buildGuildCache(doc) {
  const modules = {
    ...DEFAULT_MODULES,
    ...Object.fromEntries(Object.entries(doc.enabledmodules || {})),
  };

  return {
    enabled: doc.enabled,
    punishment: doc.punishment,
    logChannel: doc.logChannel,
    notifyowners: doc.notifyowners,
    extraOwners: new Set(doc.extraowner || []),
    unbypassRoleId: doc.unbypassRoleId,
    quarantineRoleId: doc.quarantineroleid,
    panic: doc.panic,
    panicWhitelistRoles: new Set(doc.panicWhitelistRoles || []),
    protectedRoles: new Set(doc.protectedRoles || []),
    securityBackup: doc.securityBackup || null,
    modules,

    whitelist: new Map(
      Object.entries(doc.whitelist ?? {}).map(([id, perms]) => [
        id,
        Array.isArray(perms) ? perms : [],
      ]),
    ),

    panicBackup: new Map(
      doc.panicBackup ? Object.entries(doc.panicBackup) : [],
    ),

    punishedUsers: new Map(
      Object.entries(doc.punishedusers ?? {}).map(([userId, u]) => [
        userId,
        {
          reason: u.reason ?? "No reason provided",
          action: u.action ?? null,
          punishedAt: u.punishedAt ?? new Date(),
        },
      ]),
    ),
    joins: new Map(),
    buckets: new Map(),
  };
}

module.exports = buildGuildCache;
