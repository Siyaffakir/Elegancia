# Temp-First Upload Lifecycle

## Purpose

`rihlatic-agent` uses a temp-first upload strategy for image writes. The goal is to avoid leaving orphaned files on disk or database rows that reference files that were never finalized.

The standard lifecycle is:

1. validate the incoming file,
2. save it to temp storage,
3. create or prepare the final upload URL/path,
4. persist the related database row,
5. move the temp file to permanent storage,
6. cleanup temp files and rollback permanent files best-effort on failure.

## Current implementation in `rihlatic-agent`

The shared implementation lives in:

- `services/upload/image-upload.service.ts`

This service already covers multiple entity types:

- hotels,
- activities,
- trip instances,
- trip departure hotels,
- agencies.

Key behaviors already present:

- temp staging through `saveImageToTemp(...)`,
- deterministic final upload URLs under `uploads/<subdir>/<entityId>/...`,
- move-to-permanent via `moveTempImageToPermanent(...)`,
- temp cleanup on failure,
- permanent cleanup by URL for rollback and delete operations,
- multi-image flows that track moved URLs so they can be deleted if a transaction later fails.

## Important behavior details

- `uploadImageWithTransaction(...)` follows the strongest version of the pattern: temp save -> DB create -> move -> cleanup on failure.
- bulk helpers like `uploadHotelImages(...)` and `uploadRoomImages(...)` track already-moved files and delete them if the surrounding transaction fails.
- delete helpers remove permanent files by stored upload URL.

## Why this pattern matters

Image uploads span both the filesystem and the database. Since those two systems are not truly atomic together, the code must make rollback explicit. Temp-first uploads reduce partial-success cases and make recovery predictable.

## Rule for future upload work

Any new upload path in `rihlatic-agent` should reuse the same service-level pattern:

1. validate before writing,
2. stage to temp,
3. store the final relative upload URL in DB,
4. move after DB success,
5. clean up temp and best-effort permanent files on failure.

Avoid bypassing `ImageUploadService` unless the replacement flow offers the same guarantees.

## Security requirements for all uploaded files

The temp-first lifecycle controls consistency and cleanup, but it does not replace
file-security validation. Every new upload flow must apply the following checks on
the server before a file is persisted.

### Validate the final extension

Always derive the extension from the final suffix of the complete filename using a
path-aware helper such as `extname(...)`. Never accept a file because an allowed
extension appears somewhere in the middle of its name.

This must be a generalized rule, not a list of blocked filenames. For example, if
only PDF files are allowed, every filename whose final extension is not `.pdf` must
be rejected regardless of how many earlier extensions it contains. This covers
names such as `contract.pdf.sh`, `contract.x.x.sh`, `contract.png.pdf.x.sh`, and any
other variation ending in a disallowed suffix.

Normalize extension case before comparison. Reject filenames containing null bytes
or path separators, and never use the original filename as the storage path.

### Verify content independently of the filename and declared MIME type

Treat the filename and browser-provided MIME type as untrusted metadata. Validate
the actual bytes against the expected format.

For registration PDFs, the current implementation requires:

- an allowed final `.pdf` extension,
- a compatible `application/pdf` MIME type when one is declared,
- a valid PDF version header beginning at byte zero,
- a valid `startxref ... %%EOF` trailer near the end of the file,
- a non-empty file within the configured size limit.

Checking only a magic-number prefix is insufficient because an attacker can replace
or prepend the first bytes of another file. Structural checks must accompany the
signature check. When a reliable format parser is already available, prefer parsing
the complete file in addition to signature validation.

### Store files as non-executable

Uploaded files must never inherit executable permissions. Explicitly set staged and
permanent file permissions to `0600` (or an equivalently restrictive mode required
by the deployment), then verify that no execute bits are present.

Do not rely only on the process umask or the default mode used by a filesystem
library. Reapply the restrictive mode after moving the file to permanent storage.

### Encrypt sensitive files before permanent storage

Sensitive uploads, including signed agency contracts and supporting registration
documents, must use envelope encryption:

1. request a data key from Vault Transit,
2. encrypt the file with an authenticated cipher such as AES-256-GCM,
3. store only encrypted file bytes in permanent upload storage,
4. persist the Vault-wrapped data key, IV, and authentication tag in the database,
5. clear plaintext key and file buffers best-effort after use.

Use a storage suffix such as `.pdf.enc` so encrypted bytes cannot be mistaken for a
directly viewable PDF. Never return wrapped keys, IVs, or authentication tags in
public/client API responses.

### Preserve rollback guarantees for encrypted uploads

Track every permanent path as soon as its move succeeds. If encryption, a later
file move, a database operation, or the transaction commit fails:

- delete all remaining plaintext and encrypted temp files,
- delete every permanent file already moved by the failed operation,
- allow the database transaction to roll back,
- perform filesystem cleanup with best-effort semantics without hiding the original
  failure.

An encryption or permission failure that occurs after a move must also remove that
just-moved permanent file inside the upload service, because the caller may not yet
have received its path to track it.

### Decrypt only through an authorized server endpoint

Encrypted uploads must not be linked directly from storage. The viewing application
must resolve the database record, verify the authenticated user's authorization,
retrieve the wrapped encryption metadata server-side, decrypt through Vault, and
serve the verified plaintext without writing it back to permanent storage.

For PDF responses, use restrictive headers such as:

- `Content-Type: application/pdf`,
- `Content-Disposition: inline` with a sanitized filename,
- `Cache-Control: private, no-store`,
- `X-Content-Type-Options: nosniff`,
- an appropriate sandboxed Content Security Policy.

Validate the decrypted bytes again before serving them. Records missing encryption
metadata must not silently fall back to serving plaintext.

## Agency-registration reference implementation

The signed-contract and supporting-document implementation can be used as the
reference for future sensitive upload work:

- upload validation, permissions, encryption, move, and cleanup:
  `services/upload/agency-registration-upload.service.ts`,
- transaction orchestration and metadata persistence:
  `services/agencies/agency-registration.service.ts`,
- admin-side authenticated lookup and decryption:
  `rihlatic-admin/services/agencies/agency-registration-file.service.ts`,
- admin-side secure file response:
  `rihlatic-admin/app/api/uploads/agency-registrations/[registrationId]/[fileName]/route.ts`.

Security tests should cover the generalized validation rules rather than only one
reported filename. Include valid files, arbitrary multi-extension names ending in a
disallowed suffix, forged signatures, invalid MIME declarations, size limits,
non-executable filesystem modes, encrypted-at-rest bytes, and successful authorized
decryption.
