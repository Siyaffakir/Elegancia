// middleware/auditLog.js — lightweight security/audit event trail
const db = require('../db');

function clientIp(req) {
  // req.ip already respects Express's `trust proxy` setting when configured
  return req.ip || (req.connection && req.connection.remoteAddress) || 'unknown';
}

/**
 * Records a security-relevant event. Never pass secrets (passwords, tokens) in `detail`.
 */
function logAudit(req, { event, actor = null, success = true, detail = '' } = {}) {
  const sql = `
    INSERT INTO \`audit_logs\` (\`event_type\`, \`actor\`, \`ip\`, \`success\`, \`detail\`)
    VALUES (?, ?, ?, ?, ?)
  `;
  const params = [event, actor, clientIp(req), success ? 1 : 0, String(detail || '')];

  db.run(sql, params).catch((err) => {
    console.error('[Audit] Failed to record event', event, err.message);
  });
}

module.exports = { logAudit, clientIp };
