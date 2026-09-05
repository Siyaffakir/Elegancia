// middleware/pathSecurity.js — Path Traversal Protection & Safe File Serving
const path = require('path');
const fs = require('fs');

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.avif']);

/**
 * Sanitizes a filename to prevent path traversal and unsafe characters.
 * Retains only alphanumeric characters, underscores, dashes, and standard extension dots.
 */
function sanitizeFilename(filename) {
  if (!filename || typeof filename !== 'string') return '';
  // Remove null bytes and path separators
  const clean = filename.replace(/[\0\r\n/\\]/g, '');
  // Base name only (strip any remaining directory tokens)
  const base = path.basename(clean);
  // Remove all dangerous non-alphanumeric chars except dots, dashes, underscores
  return base.replace(/[^a-zA-Z0-9._-]/g, '_');
}

/**
 * Middleware for safe static file serving from an uploads directory.
 * Defends against:
 * - Directory traversal (../, ..\, %2e%2e)
 * - Absolute path injection
 * - Null byte injection (\0, %00)
 * - Access to hidden / dotfiles (.env, .git, etc.)
 * - MIME-sniffing attacks via security headers
 */
function createSafeStaticServer(baseDir, fallbackDir = null) {
  const canonicalBase = path.resolve(baseDir);
  const canonicalFallback = fallbackDir ? path.resolve(fallbackDir) : null;

  return function safeStaticMiddleware(req, res, next) {
    // Only allow GET and HEAD requests for static assets
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      // Decode URI path safely
      let requestedPath;
      try {
        requestedPath = decodeURIComponent(req.path);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid URL encoding' });
      }

      // 1. Check for null byte attacks
      if (requestedPath.includes('\0') || req.url.includes('%00')) {
        return res.status(403).json({ error: 'Forbidden: Malformed path characters' });
      }

      // 2. Check for explicit directory traversal attempts
      if (requestedPath.includes('..') || requestedPath.includes('\\')) {
        return res.status(403).json({ error: 'Forbidden: Directory traversal is not permitted' });
      }

      const safeRelative = requestedPath.replace(/^\/+/, ''); // Strip leading slashes
      const ext = path.extname(safeRelative).toLowerCase();
      if (!ALLOWED_EXTENSIONS.has(ext)) {
        return res.status(403).json({ error: 'Forbidden: File type not permitted' });
      }

      // 3. Resolve canonical path in baseDir first, then fallbackDir if provided
      let resolvedPath = path.resolve(canonicalBase, safeRelative);
      let found = false;

      if (
        (resolvedPath.startsWith(canonicalBase + path.sep) || resolvedPath === canonicalBase) &&
        fs.existsSync(resolvedPath)
      ) {
        found = true;
      } else if (canonicalFallback) {
        const resolvedFallback = path.resolve(canonicalFallback, safeRelative);
        if (
          (resolvedFallback.startsWith(canonicalFallback + path.sep) || resolvedFallback === canonicalFallback) &&
          fs.existsSync(resolvedFallback)
        ) {
          resolvedPath = resolvedFallback;
          found = true;
        }
      }

      if (!found) {
        return res.status(404).json({ error: 'File not found' });
      }

      // 5. Reject hidden files (files starting with a dot)
      const filename = path.basename(resolvedPath);
      if (filename.startsWith('.')) {
        return res.status(403).json({ error: 'Forbidden: Access to hidden files denied' });
      }

      const stat = fs.statSync(resolvedPath);
      if (!stat.isFile()) {
        return res.status(403).json({ error: 'Forbidden: Not a readable file' });
      }

      // 8. Set robust security headers for static files
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.setHeader('Content-Security-Policy', "default-src 'none'");

      return res.sendFile(resolvedPath);
    } catch (err) {
      console.error('[PathSecurity Error]', err);
      return res.status(500).json({ error: 'Internal security check error' });
    }
  };
}

module.exports = {
  sanitizeFilename,
  createSafeStaticServer,
  ALLOWED_EXTENSIONS,
};
