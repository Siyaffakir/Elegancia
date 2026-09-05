// middleware/upload.js — hardened image upload handling for product images
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const isVercel = process.env.VERCEL === '1';
const uploadDir = isVercel
  ? path.join('/tmp', 'uploads')
  : path.resolve(__dirname, '..', 'uploads');

try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
} catch (e) {
  console.warn('[Upload] Read-only directory notice:', e.message);
}

const ALLOWED_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const ALLOWED_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

// Magic-byte signatures, checked independently of filename and declared Content-Type.
// Filenames and MIME headers are attacker-controlled metadata; only the actual bytes are trustworthy.
function detectImageSignature(buffer) {
  if (!buffer || buffer.length < 12) return null;

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';

  if (
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47 &&
    buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a
  ) return 'image/png';

  if (
    (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) &&
    (buffer[4] === 0x37 || buffer[4] === 0x39) && buffer[5] === 0x61
  ) return 'image/gif';

  if (
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) return 'image/webp';

  return null;
}

const SIGNATURE_TO_EXTS = {
  'image/jpeg': new Set(['.jpg', '.jpeg']),
  'image/png': new Set(['.png']),
  'image/gif': new Set(['.gif']),
  'image/webp': new Set(['.webp']),
};

// Buffer in memory first so we can validate real bytes before anything ever touches disk.
const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    // Cheap upfront rejection on declared extension/MIME; the authoritative check is the
    // signature verification below, run once the full buffer is available.
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTS.has(ext) || !ALLOWED_MIMES.has(file.mimetype)) {
      const err = new Error('Invalid image type. Only JPEG, PNG, WEBP, and GIF images are permitted.');
      err.status = 400;
      return cb(err);
    }
    cb(null, true);
  },
}).single('image');

function persistBufferToDisk(buffer, originalExt) {
  const randomName = crypto.randomBytes(16).toString('hex');
  const filename = `${Date.now()}-${randomName}${originalExt}`;
  const targetDir = isVercel ? path.join('/tmp', 'uploads') : uploadDir;
  try {
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
  } catch (e) {
    // Directory might already exist
  }
  const destPath = path.join(targetDir, filename);
  fs.writeFileSync(destPath, buffer, { mode: 0o644 });
  try {
    fs.chmodSync(destPath, 0o644);
  } catch (e) {
    // chmod can be ignored if filesystem does not support it
  }
  return filename;
}

/**
 * Express middleware: parses a single `image` field into memory, verifies its real
 * byte signature matches an allowed image format (independent of filename/MIME), then
 * writes it to disk with a random name and non-executable permissions.
 * Populates req.file.filename for downstream route handlers, matching multer's disk API.
 */
function upload(req, res, next) {
  memoryUpload(req, res, (err) => {
    if (err) return next(err);
    if (!req.file) return next();

    const ext = path.extname(req.file.originalname).toLowerCase();
    const signature = detectImageSignature(req.file.buffer);

    if (!signature || !SIGNATURE_TO_EXTS[signature].has(ext)) {
      const sigErr = new Error('File content does not match a valid image format. The file was rejected.');
      sigErr.status = 400;
      return next(sigErr);
    }

    try {
      req.file.filename = persistBufferToDisk(req.file.buffer, ext);
      delete req.file.buffer;
      next();
    } catch (writeErr) {
      next(writeErr);
    }
  });
}

upload.single = () => upload; // keeps route call sites (`upload.single('image')`) working unchanged

function deleteUploadedFile(filename) {
  if (!filename) return;
  try {
    const target = path.join(uploadDir, path.basename(filename));
    if (fs.existsSync(target)) fs.unlinkSync(target);
  } catch (err) {
    console.error('[Upload] Failed to clean up file', filename, err.message);
  }
}

module.exports = upload;
module.exports.deleteUploadedFile = deleteUploadedFile;
