"use strict";

const { AuditLogEvent } = require("discord.js");


async function resolveAudit(guild, auditType, targetId, opts = {}) {
  const {
    changeKey = null, 
    changeTargetId = null, 
    ttl = 8_000, 
    auditLimit = 5, 
    retryDelayMs = 500, 
    allowRetry = true, 
    allowDeepScan = true, 
  } = opts;

  const t0 = Date.now();

  
  const { entry, isEmpty, page1 } = await _fetch(guild, auditType, targetId, {
    changeKey,
    changeTargetId,
    ttl,
    limit: auditLimit,
  });

  if (entry) return _result(entry, "audit", Date.now() - t0);

  
  
  
  
  
  
  
  
  
  
  if (allowRetry && isEmpty) {
    await _sleep(retryDelayMs);

    const { entry: retryEntry } = await _fetch(guild, auditType, targetId, {
      changeKey,
      changeTargetId,
      ttl: ttl + retryDelayMs, 
      limit: auditLimit,
    });

    if (retryEntry) return _result(retryEntry, "audit_retry", Date.now() - t0);
  }

  
  
  
  
  
  if (allowDeepScan && page1 && page1.entries.size === auditLimit) {
    const cursor = [...page1.entries.values()].at(-1)?.id;

    if (cursor) {
      const { entry: deepEntry } = await _fetch(guild, auditType, targetId, {
        changeKey,
        changeTargetId,
        ttl: ttl * 2, 
        limit: auditLimit,
        before: cursor,
      });

      if (deepEntry) return _result(deepEntry, "audit_deep", Date.now() - t0);
    }
  }

  return null;
}




async function _fetch(
  guild,
  auditType,
  targetId,
  { changeKey, changeTargetId, ttl, limit, before } = {},
) {
  const logs = await guild
    .fetchAuditLogs({
      limit,
      type: auditType,
      ...(before ? { before } : {}),
    })
    .catch((err) => {
      console.warn(
        `[resolveAudit] fetchAuditLogs failed (guild=${guild.id}):`,
        err.message,
      );
      return null;
    });

  
  if (!logs) return { entry: null, isEmpty: true, page1: null };

  
  if (logs.entries.size === 0)
    return { entry: null, isEmpty: true, page1: logs };

  const cutoff = Date.now() - ttl;

  for (const entry of logs.entries.values()) {
    
    if (entry.target?.id !== targetId) continue;

    
    if (entry.createdTimestamp < cutoff) continue;

    
    if (changeKey !== null) {
      const hasKey = entry.changes?.some((c) => c.key === changeKey);
      if (!hasKey) continue;
    }

    
    if (changeTargetId !== null) {
      if (!_changeContains(entry, changeTargetId)) continue;
    }

    
    return { entry, isEmpty: false, page1: logs };
  }

  
  return { entry: null, isEmpty: false, page1: logs };
}


function _changeContains(entry, id) {
  if (!entry.changes) return false;

  for (const change of entry.changes) {
    
    if (Array.isArray(change.new) && change.new.some((item) => item?.id === id))
      return true;
    if (Array.isArray(change.old) && change.old.some((item) => item?.id === id))
      return true;

    
    if (change.new === id || change.old === id) return true;
  }

  return false;
}




function _result(entry, source, latencyMs) {
  const victimId = entry.target?.id ?? null;

  return {
    executorId: entry.executorId ?? null,
    executor:
      entry.executor ?? (entry.executorId ? { id: entry.executorId } : null),
    victimId,
    victim: entry.target ?? (victimId ? { id: victimId } : null),
    source,
    latencyMs,
    raw: entry,
  };
}

const _sleep = (ms) => new Promise((r) => setTimeout(r, ms));







module.exports = resolveAudit;
