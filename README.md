[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

# ROMANCE ENGINE By AXION Neuralis

**Romance Engine:** is a cinematic declaration of love site

## Folder Structure

**public:** (pages)
```text
   romance-engine-pages/
   └── public/
       ├── index.html
       ├── create.html
       ├── view.html
       └── assets/
           ├── audio/
           │   └── default-bgm.mp3
           ├── css/
           │   └── style.css
           └── js/
               ├── 3d-hearts.js
               ├── audio-player.js
               └── interactive.js
```

**src:** (workers)
```text
   romance-engine-worker/
   └── src/
       └── index.js
```

**full structure:** (all files and folders)
```text
   romance-engine/
   ├── public/
   │   ├── index.html
   │   ├── create.html
   │   ├── view.html
   │   └── assets/
   │       ├── audio/
   │       │   └── default-bgm.mp3
   │       ├── css/
   │       │   └── style.css
   │       └── js/
   │           ├── 3d-hearts.js
   │           ├── audio-player.js
   │           └── interactive.js
   ├── src/
   │   └── index.js
   ├── wrangler.jsonc
   ├── LICENSE
   └── README.md
```

## LICENSE
- GPLv3 License
You're free to do anything with the romance-engine code as long as it doesn't violate the GPLv3 license

## A little information
- romance-engine
  built to be optimized with Cloudflare worker and Cloudflare KV

## Supports
- Give a stars in this repository
- If possible, give your feedback as well
- A Sincere Donation in:
  https://axion-hub.axn.cc.cd/donate

## contacts
- **Email    :** azrielspace852@gmail.com, or axionneuralis@gmail.com
- **TikTok   :**
  - https://tiktok.com/@azrielspace
  - https://tiktok.com/@axion.neuralis
  - https://tiktok.com/@random.ai.id
- **Github   :** https://github.com/@azrielspace852-wq

## Site

- **AXION Neuralis Documentation​​​:** https://axion-neuralis.axn.cc.cd
- **AXION Hub                     :** https://axion-hub.axn.cc.cd
- **ROMANCE ENGINE                :** https://romance-engine.pages.dev
- **AXION Labs                    :** https://research.lab.axn.cc.cd
- **AXION Search                  :** https://search.axn.cc.cd

## code
1. **wrangler.jsonc**
```jsonc
{
  // Skema konfigurasi Wrangler — untuk validasi & autocomplete.
  "$schema": "node_modules/wrangler/config-schema.json",

  // Nama Worker menentukan subdomain workers.dev:
  // https://romance-engine.azrielspace852.workers.dev
  "name": "romance-engine",

  // Entry point Worker (format ES Modules, sesuai spesifikasi §2).
  "main": "src/index.js",

  // Tanggal kompatibilitas runtime Workers.
  "compatibility_date": "2026-01-01",

  // Aktifkan endpoint default *.workers.dev (domain backend spesifikasi §2).
  "workers_dev": true,

  // Binding Cloudflare KV — nama binding WAJIB ROMANCE_KV (spesifikasi §2 & §24).
  "kv_namespaces": [
    {
      "binding": "ROMANCE_KV",

      // ============================================================
      // [UNKNOWN — wajib diisi owner]
      // Nilai ini spesifik untuk akun Cloudflare Anda dan tidak
      // dapat ditentukan oleh siapa pun di luar akun tersebut.
      //
      // Cara mendapatkan ID yang benar:
      //   1. Pastikan sudah login:  npx wrangler login
      //   2. Buat namespace KV:     npx wrangler kv namespaces create ROMANCE_KV
      //   3. Salin nilai "id" dari output perintah di atas,
      //      lalu ganti nilai placeholder di bawah ini.
      //
      // Contoh output yang diharapkan:
      //   🌀 Creating namespace with title "romance-engine-ROMANCE_KV"
      //   ✨ Success!
      //   Add the following to your configuration file in your kv_namespaces array:
      //   { binding = "ROMANCE_KV", id = "<2606dbc714334c1384b9d7dfedcd13a3>" }
      // ============================================================
      "id": "2606dbc714334c1384b9d7dfedcd13a3"
    }
  ]
}
```
2 **src/index.js**
```javascript
/**
 * ============================================================
 * Romance Engine V1 — Cloudflare Worker (API Backend)
 * File: src/index.js
 * Format: ES Modules Worker
 * Binding KV: ROMANCE_KV (lihat wrangler.jsonc)
 * ============================================================
 *
 * KONTRAK API (sesuai spesifikasi romance-engine.xml §7):
 *
 *   POST /api/save
 *     Body  : application/json — RomancePayload
 *             { recipientName, message, specialDate, photoUrl?, musicUrl? }
 *     201   : { ok: true,  data: { id, viewUrl, payload } }
 *     400   : { ok: false, error: { code: "MALFORMED_JSON" | "VALIDATION_ERROR", message, details? } }
 *     405   : { ok: false, error: { code: "METHOD_NOT_ALLOWED", message } }
 *     413   : { ok: false, error: { code: "PAYLOAD_TOO_LARGE", message } }
 *     415   : { ok: false, error: { code: "UNSUPPORTED_MEDIA_TYPE", message } }
 *     500   : { ok: false, error: { code: "INTERNAL_ERROR", message } }
 *
 *   GET /api/get/:id
 *     200   : { ok: true,  data: { payload } }
 *     400   : { ok: false, error: { code: "BAD_REQUEST", message } }
 *     404   : { ok: false, error: { code: "NOT_FOUND", message } }
 *     500   : { ok: false, error: { code: "INTERNAL_ERROR", message } }
 *
 * KEPUTUSAN TEKNIS TERDOKUMENTASI (NN-007):
 *   1. KV key prefix "romance:v1:" — namespace konsisten, mencegah
 *      collision, dan memudahkan migrasi skema di masa depan.
 *   2. ID menggunakan crypto.randomUUID() dengan verifikasi ketersediaan
 *      key (maksimal 3 percobaan) sebelum KV.put.
 *   3. Body limit 64 KB, dipaksakan secara streaming (chunk reader),
 *      bukan hanya melalui header Content-Length (yang dapat dipalsukan).
 *   4. CORS allowlist: origin produksi (https://romance-engine.pages.dev)
 *      + localhost/127.0.0.1 khusus development (tanpa ini `wrangler dev`
 *      tidak dapat diuji dari frontend lokal).
 *   5. photoUrl/musicUrl hanya menerima scheme http/https. Ekstensi .mp3
 *      TIDAK dipaksakan agar URL CDN dengan query string tetap valid;
 *      kegagalan playback musik ditangani fallback audio di frontend
 *      (spesifikasi §11).
 *   6. specialDate disimpan sebagai string asli (setelah lolos validasi
 *      parse Date) untuk menghindari reinterpretasi zona waktu.
 *   7. Tidak ada TTL KV — spesifikasi tidak meminta kedaluwarsa data.
 *   8. Field di luar whitelist (id, createdAt, version) dari client
 *      diabaikan; ketiga field tersebut selalu diisi server.
 *   9. Rate limiting tidak diimplementasikan di level Worker (efektivitas
 *      per-isolate rendah); mitigasi abuse mengandalkan body limit,
 *      validasi ketat, dan dapat ditambah via Cloudflare Rate Limiting
 *      di dashboard tanpa mengubah kontrak ini.
 */

// ------------------------------------------------------------
// Konstanta konfigurasi
// ------------------------------------------------------------

const PUBLIC_FRONTEND_URL = 'https://romance-engine.pages.dev';
const KV_PREFIX = 'romance:v1:';
const PAYLOAD_SCHEMA_VERSION = 1;

const MAX_BODY_BYTES = 64 * 1024; // 64 KB
const MAX_NAME_LENGTH = 100;
const MAX_MESSAGE_LENGTH = 10_000;
const MAX_URL_LENGTH = 2_048;
const MAX_DATE_LENGTH = 64;
const MAX_ID_ATTEMPTS = 3;

// Charset ID yang diizinkan saat dibaca kembali via GET /api/get/:id.
// UUID memenuhi pola ini; pola ketat ini sekaligus mencegah karakter
// kontrol / path traversal masuk ke key KV.
const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

const ALLOWED_ORIGINS = new Set([PUBLIC_FRONTEND_URL]);
const LOCAL_DEV_ORIGIN_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d{1,5})?$/;

// ------------------------------------------------------------
// Utilitas respons & CORS
// ------------------------------------------------------------

function isOriginAllowed(origin) {
  if (typeof origin !== 'string' || origin.length === 0) {
    return false;
  }
  if (ALLOWED_ORIGINS.has(origin)) {
    return true;
  }
  return LOCAL_DEV_ORIGIN_PATTERN.test(origin);
}

function buildCorsHeaders(origin) {
  const headers = { vary: 'Origin' };
  if (isOriginAllowed(origin)) {
    headers['access-control-allow-origin'] = origin;
  }
  return headers;
}

function jsonResponse(status, body, origin) {
  const headers = {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    ...buildCorsHeaders(origin),
  };
  return new Response(JSON.stringify(body), { status, headers });
}

function errorResponse(status, code, message, origin, details) {
  const body = { ok: false, error: { code, message } };
  if (Array.isArray(details) && details.length > 0) {
    body.error.details = details;
  }
  return jsonResponse(status, body, origin);
}

function handlePreflight(origin) {
  const headers = { vary: 'Origin' };
  if (isOriginAllowed(origin)) {
    headers['access-control-allow-origin'] = origin;
    headers['access-control-allow-methods'] = 'GET, POST, OPTIONS';
    headers['access-control-allow-headers'] = 'Content-Type';
    headers['access-control-max-age'] = '86400';
  }
  return new Response(null, { status: 204, headers });
}

// ------------------------------------------------------------
// Pembacaan body dengan batas ukuran (streaming)
// ------------------------------------------------------------

/**
 * Membaca body request dengan batas byte yang dipaksakan secara streaming.
 * Return: string UTF-8, atau null jika melebihi batas.
 * Decoding UTF-8 bersifat non-fatal (karakter tidak valid diganti U+FFFD)
 * agar input jahat tidak menimbulkan exception (NN-010).
 */
async function readLimitedBody(request, limitBytes) {
  if (!request.body) {
    return '';
  }

  const reader = request.body.getReader();
  const chunks = [];
  let receivedBytes = 0;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      receivedBytes += value.byteLength;
      if (receivedBytes > limitBytes) {
        try {
          await reader.cancel();
        } catch {
          // Best-effort: pembatalan stream tidak boleh mengaburkan error 413.
        }
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const merged = new Uint8Array(receivedBytes);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder('utf-8', { fatal: false }).decode(merged);
}

// ------------------------------------------------------------
// Validasi payload
// ------------------------------------------------------------

/**
 * Memvalidasi URL media opsional (foto/musik).
 * - undefined / null / string kosong  -> dianggap tidak diisi (null)
 * - scheme hanya http/https (memblokir javascript:, data:, vbscript:, dst.)
 * - dinormalisasi melalui URL.toString()
 */
function validateMediaUrl(value, field, errors) {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== 'string') {
    errors.push({ field, message: `${field} harus berupa string URL atau dikosongkan.` });
    return null;
  }

  const candidate = value.trim();
  if (candidate.length === 0) {
    return null;
  }
  if (candidate.length > MAX_URL_LENGTH) {
    errors.push({ field, message: `${field} maksimal ${MAX_URL_LENGTH} karakter.` });
    return null;
  }

  let parsed;
  try {
    parsed = new URL(candidate);
  } catch {
    errors.push({ field, message: `${field} bukan URL yang valid.` });
    return null;
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    errors.push({ field, message: `${field} harus menggunakan http atau https.` });
    return null;
  }

  return parsed.toString();
}

/**
 * Memvalidasi input RomancePayload dari client.
 * Hanya field dalam whitelist yang diterima; field lain diabaikan.
 * Return: { record, errors } — record null jika terdapat error.
 */
function validateRomancePayload(raw) {
  const errors = [];

  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      record: null,
      errors: [{ field: 'payload', message: 'Payload harus berupa objek JSON.' }],
    };
  }

  // recipientName — required
  let recipientName = null;
  if (typeof raw.recipientName !== 'string' || raw.recipientName.trim().length === 0) {
    errors.push({ field: 'recipientName', message: 'Nama pasangan wajib diisi.' });
  } else {
    recipientName = raw.recipientName.trim();
    if (recipientName.length > MAX_NAME_LENGTH) {
      errors.push({ field: 'recipientName', message: `Nama pasangan maksimal ${MAX_NAME_LENGTH} karakter.` });
    }
  }

  // message — required, multi-paragraf
  let declarationMessage = null;
  if (typeof raw.message !== 'string' || raw.message.trim().length === 0) {
    errors.push({ field: 'message', message: 'Pesan deklarasi wajib diisi.' });
  } else {
    declarationMessage = raw.message.trim();
    if (declarationMessage.length > MAX_MESSAGE_LENGTH) {
      errors.push({ field: 'message', message: `Pesan maksimal ${MAX_MESSAGE_LENGTH} karakter.` });
    }
  }

  // specialDate — required, harus dapat diparse sebagai Date
  let specialDate = null;
  if (typeof raw.specialDate !== 'string' || raw.specialDate.trim().length === 0) {
    errors.push({ field: 'specialDate', message: 'Tanggal spesial wajib diisi.' });
  } else {
    specialDate = raw.specialDate.trim();
    if (specialDate.length > MAX_DATE_LENGTH) {
      errors.push({ field: 'specialDate', message: `Tanggal spesial maksimal ${MAX_DATE_LENGTH} karakter.` });
    } else if (Number.isNaN(new Date(specialDate).getTime())) {
      errors.push({ field: 'specialDate', message: 'Tanggal spesial tidak valid.' });
    }
  }

  // photoUrl / musicUrl — optional, tervalidasi ketat
  const photoUrl = validateMediaUrl(raw.photoUrl, 'photoUrl', errors);
  const musicUrl = validateMediaUrl(raw.musicUrl, 'musicUrl', errors);

  if (errors.length > 0) {
    return { record: null, errors };
  }

  return {
    record: {
      recipientName,
      message: declarationMessage,
      specialDate,
      photoUrl,
      musicUrl,
    },
    errors: [],
  };
}

// ------------------------------------------------------------
// Penyimpanan KV
// ------------------------------------------------------------

/**
 * Menghasilkan unique ID, memastikan key belum terpakai, lalu menyimpan.
 * Record yang disimpan selalu berisi id + createdAt + version dari server.
 */
async function allocateAndStore(kv, record) {
  for (let attempt = 0; attempt < MAX_ID_ATTEMPTS; attempt += 1) {
    const id = crypto.randomUUID();
    const key = KV_PREFIX + id;

    const existing = await kv.get(key);
    if (existing !== null) {
      continue; // collision (sangat jarang) — coba ID baru
    }

    const stored = {
      id,
      recipientName: record.recipientName,
      message: record.message,
      specialDate: record.specialDate,
      photoUrl: record.photoUrl,
      musicUrl: record.musicUrl,
      createdAt: record.createdAt,
      version: record.version,
    };

    await kv.put(key, JSON.stringify(stored));
    return stored;
  }

  throw new Error('Unable to allocate unique id');
}

// ------------------------------------------------------------
// Handler endpoint
// ------------------------------------------------------------

async function handleSave(request, env, origin) {
  if (!env || !env.ROMANCE_KV) {
    return errorResponse(500, 'INTERNAL_ERROR', 'Layanan penyimpanan tidak tersedia. Silakan coba lagi nanti.', origin);
  }

  const contentTypeRaw = request.headers.get('content-type') || '';
  const contentType = contentTypeRaw.split(';')[0].trim().toLowerCase();
  if (contentType !== 'application/json') {
    return errorResponse(415, 'UNSUPPORTED_MEDIA_TYPE', 'Request harus berformat application/json.', origin);
  }

  const bodyText = await readLimitedBody(request, MAX_BODY_BYTES);
  if (bodyText === null) {
    return errorResponse(413, 'PAYLOAD_TOO_LARGE', `Ukuran payload melebihi batas ${MAX_BODY_BYTES / 1024} KB.`, origin);
  }

  let raw;
  try {
    raw = JSON.parse(bodyText);
  } catch {
    return errorResponse(400, 'MALFORMED_JSON', 'Body JSON tidak valid.', origin);
  }

  const { record, errors } = validateRomancePayload(raw);
  if (errors.length > 0) {
    return errorResponse(400, 'VALIDATION_ERROR', 'Data tidak valid. Periksa kembali isian Anda.', origin, errors);
  }

  record.createdAt = new Date().toISOString();
  record.version = PAYLOAD_SCHEMA_VERSION;

  let stored;
  try {
    stored = await allocateAndStore(env.ROMANCE_KV, record);
  } catch (err) {
    console.error('romance_save_failed', err);
    return errorResponse(500, 'INTERNAL_ERROR', 'Gagal menyimpan data. Silakan coba lagi.', origin);
  }

  const viewUrl = `${PUBLIC_FRONTEND_URL}/view.html?id=${encodeURIComponent(stored.id)}`;
  return jsonResponse(201, { ok: true, data: { id: stored.id, viewUrl, payload: stored } }, origin);
}

async function handleGet(env, origin, rawId) {
  if (!env || !env.ROMANCE_KV) {
    return errorResponse(500, 'INTERNAL_ERROR', 'Layanan penyimpanan tidak tersedia. Silakan coba lagi nanti.', origin);
  }

  let id;
  try {
    id = decodeURIComponent(rawId);
  } catch {
    return errorResponse(400, 'BAD_REQUEST', 'Format ID tidak valid.', origin);
  }

  if (typeof id !== 'string' || !ID_PATTERN.test(id)) {
    return errorResponse(400, 'BAD_REQUEST', 'Format ID tidak valid.', origin);
  }

  const key = KV_PREFIX + id;

  let storedText;
  try {
    storedText = await env.ROMANCE_KV.get(key);
  } catch (err) {
    console.error('romance_kv_get_failed', err);
    return errorResponse(500, 'INTERNAL_ERROR', 'Gagal mengambil data. Silakan coba lagi.', origin);
  }

  if (storedText === null) {
    return errorResponse(404, 'NOT_FOUND', 'Deklarasi dengan ID tersebut tidak ditemukan.', origin);
  }

  let payload;
  try {
    payload = JSON.parse(storedText);
  } catch (err) {
    console.error('romance_record_corrupted', err);
    return errorResponse(500, 'INTERNAL_ERROR', 'Data tidak dapat dibaca.', origin);
  }

  return jsonResponse(200, { ok: true, data: { payload } }, origin);
}

// ------------------------------------------------------------
// Entry point Worker
// ------------------------------------------------------------

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      const origin = request.headers.get('origin');
      const { method } = request;
      const path = url.pathname;

      // Preflight CORS untuk seluruh endpoint.
      if (method === 'OPTIONS') {
        return handlePreflight(origin);
      }

      // POST /api/save
      if (path === '/api/save') {
        if (method !== 'POST') {
          return errorResponse(405, 'METHOD_NOT_ALLOWED', 'Endpoint ini hanya menerima metode POST.', origin);
        }
        return await handleSave(request, env, origin);
      }

      // GET /api/get/:id
      if (path.startsWith('/api/get/')) {
        if (method !== 'GET') {
          return errorResponse(405, 'METHOD_NOT_ALLOWED', 'Endpoint ini hanya menerima metode GET.', origin);
        }
        const rawId = path.slice('/api/get/'.length);
        if (rawId.length === 0) {
          return errorResponse(404, 'NOT_FOUND', 'Endpoint tidak ditemukan.', origin);
        }
        return await handleGet(env, origin, rawId);
      }

      // Di luar endpoint yang didefinisikan: 404 JSON terstruktur.
      return errorResponse(404, 'NOT_FOUND', 'Endpoint tidak ditemukan.', origin);
    } catch (err) {
      // Boundary terakhir: jangan pernah membocorkan stack trace atau
      // detail internal ke client (spesifikasi §16 error_security).
      console.error('romance_unhandled_error', err);
      let fallbackOrigin = null;
      try {
        fallbackOrigin = request.headers.get('origin');
      } catch {
        // request mungkin tidak tersedia dalam kondisi abnormal.
      }
      return errorResponse(500, 'INTERNAL_ERROR', 'Terjadi kesalahan pada server.', fallbackOrigin);
    }
  },
};
```

3. **public/index.html**
```html
<!DOCTYPE html>
<html lang="id">
<head>
<!--
  ============================================================
  Romance Engine V1 — public/index.html (Landing Page)
  ============================================================
  Dokumentasi keputusan teknis (NN-007):
  1. Halaman ini self-contained: seluruh gaya landing ditulis
     inline di dalam <style> sehingga tetap berfungsi penuh
     bahkan jika aset lain gagal dimuat, dan tidak bergantung
     pada style.css yang dipakai halaman create/view.
  2. Three.js / GSAP / canvas-confetti / vanilla-tilt TIDAK
     dimuat di halaman ini (§23: jangan memuat dependency
     yang tidak benar-benar digunakan). Efek visual landing
     hanya memakai animasi CSS (transform/opacity) + SVG inline.
  3. Tipografi memakai CDN fontsource dengan fallback font
     sistem — jika CDN gagal, halaman tetap terbaca.
  4. Reveal-on-scroll memakai IntersectionObserver dengan
     fallback. State awal "tersembunyi" hanya aktif saat JS
     berjalan (class .js pada <html>), sehingga tanpa JS
     seluruh konten tetap tampil.
  5. prefers-reduced-motion menonaktifkan seluruh animasi.
  6. Tidak ada panggilan API di halaman ini; alur berlanjut
     ke create.html sebagai entry pembuatan deklarasi.
-->
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="dark">
<meta name="theme-color" content="#0D0208">
<title>Romance Engine — Deklarasi Cinta Sinematik</title>
<meta name="description" content="Buat deklarasi cinta interaktif dengan visual 3D sinematik, musik, dan surat cinta digital dalam satu tautan — tanpa menulis kode.">
<link rel="canonical" href="https://romance-engine.pages.dev/">
<meta property="og:title" content="Romance Engine — Deklarasi Cinta Sinematik">
<meta property="og:description" content="Ubah perasaanmu menjadi satu tautan hidup: musik, visual 3D, dan pertanyaan besar untuknya.">
<meta property="og:type" content="website">
<meta property="og:url" content="https://romance-engine.pages.dev/">
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%23FFB3C9'/%3E%3Cstop offset='1' stop-color='%23FF5E94'/%3E%3C/linearGradient%3E%3C/defs%3E%3Cpath fill='url(%23g)' d='M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z'/%3E%3C/svg%3E">

<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/fontsource/css/playfair-display@latest/latin-700-normal.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/fontsource/css/playfair-display@latest/latin-500-italic.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/fontsource/css/manrope@latest/latin-400-normal.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/fontsource/css/manrope@latest/latin-600-normal.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/fontsource/css/manrope@latest/latin-700-normal.css">

<script>document.documentElement.classList.add('js');</script>

<style>
/* ================= Design tokens ================= */
:root {
  color-scheme: dark;
  --obsidian: #0D0208;
  --deep-crimson: #1A000C;
  --ink: #FDF2F6;
  --ink-dim: rgba(253, 242, 246, 0.74);
  --ink-faint: rgba(253, 242, 246, 0.5);
  --pink: #FF8FB1;
  --pink-strong: #FF5E94;
  --pink-deep: #F43F7F;
  --cyan: #7DE8F5;
  --glass-bg: rgba(255, 255, 255, 0.045);
  --glass-border: rgba(255, 255, 255, 0.10);
  --radius-lg: 22px;
  --font-display: "Playfair Display", Georgia, "Times New Roman", serif;
  --font-body: "Manrope", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}

/* ================= Base ================= */
*, *::before, *::after { box-sizing: border-box; }

html { scroll-behavior: smooth; }

body {
  margin: 0;
  font-family: var(--font-body);
  font-size: 1rem;
  line-height: 1.65;
  color: var(--ink);
  background-color: var(--obsidian);
  background-image:
    radial-gradient(1100px 700px at 82% -8%, rgba(244, 63, 127, 0.14), transparent 62%),
    radial-gradient(800px 600px at 4% 14%, rgba(125, 232, 245, 0.07), transparent 58%),
    radial-gradient(900px 700px at 50% 118%, rgba(122, 16, 62, 0.42), transparent 62%);
  overflow-x: hidden;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

img, svg { display: block; max-width: 100%; }
figure { margin: 0; }
::selection { background: rgba(255, 94, 148, 0.45); color: #fff; }

.container {
  width: min(1120px, 100% - 2.5rem);
  margin-inline: auto;
}

/* ================= Aksesibilitas ================= */
.skip-link {
  position: absolute;
  left: 1rem;
  top: -3.5rem;
  z-index: 80;
  background: var(--deep-crimson);
  color: var(--ink);
  padding: 0.65rem 1.1rem;
  border-radius: 12px;
  border: 1px solid var(--glass-border);
  text-decoration: none;
  font-weight: 600;
  transition: top 0.2s ease;
}
.skip-link:focus { top: 1rem; }

a:focus-visible, button:focus-visible {
  outline: 2px solid var(--cyan);
  outline-offset: 3px;
  border-radius: 6px;
}

main:focus { outline: none; }

/* ================= Header ================= */
.site-header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 30;
  padding: calc(1.15rem + env(safe-area-inset-top, 0px)) 0 1rem;
}
.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}
.brand {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1.18rem;
  letter-spacing: 0.02em;
  color: var(--ink);
  text-decoration: none;
}
.brand svg {
  width: 22px;
  height: 22px;
  color: var(--pink-strong);
  filter: drop-shadow(0 0 10px rgba(255, 94, 148, 0.55));
}
.main-nav {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}
.main-nav a:not(.btn) {
  color: var(--ink-dim);
  text-decoration: none;
  font-weight: 600;
  font-size: 0.95rem;
  transition: color 0.2s ease;
}
.main-nav a:not(.btn):hover { color: var(--pink); }
@media (max-width: 640px) {
  .main-nav { gap: 0.9rem; }
  .main-nav a:not(.btn) { display: none; }
}

/* ================= Tombol ================= */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  min-height: 48px;
  padding: 0.9rem 1.7rem;
  border-radius: 999px;
  border: none;
  font-family: var(--font-body);
  font-size: 1rem;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
  transition: transform 0.25s ease, box-shadow 0.25s ease, background-color 0.25s ease, border-color 0.25s ease;
}
.btn svg { width: 18px; height: 18px; flex: none; }
.btn-primary {
  color: #33061A;
  background: linear-gradient(135deg, #FFC1D4 0%, #FF5E94 55%, #FF8FD0 100%);
  box-shadow: 0 10px 34px rgba(255, 94, 148, 0.35), inset 0 0 0 1px rgba(255, 255, 255, 0.35);
}
.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 16px 46px rgba(255, 94, 148, 0.48), inset 0 0 0 1px rgba(255, 255, 255, 0.45);
}
.btn-ghost {
  color: var(--ink);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
}
.btn-ghost:hover {
  transform: translateY(-2px);
  border-color: rgba(255, 143, 177, 0.5);
  background: rgba(255, 143, 177, 0.09);
}
.btn-sm { min-height: 44px; padding: 0.6rem 1.25rem; font-size: 0.92rem; }

/* ================= Hero ================= */
.hero {
  position: relative;
  min-height: 100vh;
  min-height: 100svh;
  display: flex;
  align-items: center;
  padding: 7.5rem 0 4.5rem;
  overflow: hidden;
}
.hero-bg { position: absolute; inset: 0; pointer-events: none; }

.orb { position: absolute; border-radius: 50%; }
.orb--pink {
  width: min(48vw, 480px);
  aspect-ratio: 1;
  right: -9%;
  top: -13%;
  background: radial-gradient(circle, rgba(255, 94, 148, 0.30) 0%, rgba(255, 94, 148, 0.09) 45%, transparent 70%);
  animation: orb-drift 18s ease-in-out infinite alternate;
}
.orb--cyan {
  width: min(42vw, 420px);
  aspect-ratio: 1;
  left: -11%;
  bottom: -15%;
  background: radial-gradient(circle, rgba(125, 232, 245, 0.20) 0%, rgba(125, 232, 245, 0.06) 45%, transparent 70%);
  animation: orb-drift 22s ease-in-out infinite alternate-reverse;
}
@keyframes orb-drift {
  from { transform: translate3d(0, 0, 0) scale(1); }
  to   { transform: translate3d(34px, 26px, 0) scale(1.07); }
}

.hearts-field { position: absolute; inset: 0; }
.float-heart {
  position: absolute;
  bottom: -8%;
  left: var(--x);
  width: var(--size);
  color: var(--pink);
  opacity: 0;
  animation: heart-rise var(--dur) linear var(--delay) infinite;
}
.float-heart svg {
  width: 100%;
  height: auto;
  opacity: var(--alpha);
  filter: drop-shadow(0 0 8px rgba(255, 94, 148, 0.35));
}
@keyframes heart-rise {
  0%   { transform: translate3d(0, 0, 0) rotate(-7deg); opacity: 0; }
  10%  { opacity: var(--alpha); }
  88%  { opacity: var(--alpha); }
  100% { transform: translate3d(var(--sway), -108vh, 0) rotate(9deg); opacity: 0; }
}

.hero-content {
  position: relative;
  z-index: 2;
  max-width: 860px;
  text-align: center;
  display: grid;
  gap: 1.4rem;
  justify-items: center;
}
.hero-content > * { animation: fade-up 0.85s cubic-bezier(0.22, 0.61, 0.36, 1) both; }
.hero-content > *:nth-child(1) { animation-delay: 0.05s; }
.hero-content > *:nth-child(2) { animation-delay: 0.15s; }
.hero-content > *:nth-child(3) { animation-delay: 0.25s; }
.hero-content > *:nth-child(4) { animation-delay: 0.35s; }
.hero-content > *:nth-child(5) { animation-delay: 0.45s; }
.hero-content > *:nth-child(6) { animation-delay: 0.55s; }
@keyframes fade-up {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: none; }
}

.eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  margin: 0;
  padding: 0.45rem 1.05rem;
  border-radius: 999px;
  border: 1px solid rgba(125, 232, 245, 0.3);
  background: rgba(125, 232, 245, 0.06);
  color: var(--cyan);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.22em;
  text-transform: uppercase;
}
.eyebrow::before {
  content: "";
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--cyan);
  box-shadow: 0 0 12px var(--cyan);
}

.hero-content h1 {
  margin: 0;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: clamp(2.3rem, 4.6vw + 1rem, 4.3rem);
  line-height: 1.12;
  text-wrap: balance;
}
.hero-content h1 em {
  font-style: italic;
  font-weight: 500;
  background: linear-gradient(100deg, #FFB3C9 5%, #FF5E94 50%, #8FE9F7 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
}

.lead {
  margin: 0;
  max-width: 640px;
  color: var(--ink-dim);
  font-size: clamp(1.02rem, 0.4vw + 0.95rem, 1.2rem);
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 1rem;
}

.hero-note {
  margin: 0;
  color: var(--ink-faint);
  font-size: 0.88rem;
  letter-spacing: 0.04em;
}

.hero-preview { display: grid; gap: 0.8rem; justify-items: center; margin-top: 0.4rem; }
.gateway-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  margin: 0;
  padding: 0.8rem 1.45rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 143, 177, 0.32);
  font-weight: 600;
  letter-spacing: 0.02em;
  box-shadow: 0 0 32px rgba(255, 94, 148, 0.16);
}
.pulse-heart {
  display: grid;
  place-items: center;
  color: var(--pink-strong);
  animation: pulse 1.8s ease-in-out infinite;
}
.pulse-heart svg { width: 18px; height: 18px; }
@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.28); }
}
.hero-preview figcaption {
  color: var(--ink-faint);
  font-size: 0.92rem;
  font-style: italic;
}

/* ================= Seksi ================= */
.section { position: relative; padding: clamp(4rem, 9vw, 7rem) 0; }
.section-alt {
  background: radial-gradient(60% 90% at 50% 0%, rgba(255, 94, 148, 0.06), transparent 65%);
}

.section-head {
  max-width: 680px;
  margin: 0 auto 3rem;
  text-align: center;
  display: grid;
  gap: 0.9rem;
}
.section-eyebrow {
  margin: 0;
  color: var(--pink);
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.26em;
  text-transform: uppercase;
}
.section-head h2 {
  margin: 0;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: clamp(1.9rem, 2.8vw + 0.9rem, 2.8rem);
  line-height: 1.15;
  text-wrap: balance;
}
.section-sub { margin: 0; color: var(--ink-dim); }

/* ================= Kartu ================= */
.steps-grid, .cards-grid {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(255px, 1fr));
  gap: 1.3rem;
}
.steps-grid > li, .cards-grid > li { display: flex; }

.glass {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  -webkit-backdrop-filter: blur(14px);
  backdrop-filter: blur(14px);
  position: relative;
}

.step-card, .feature-card {
  width: 100%;
  padding: 1.7rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  transition: transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
}
.step-card::before, .feature-card::before {
  content: "";
  position: absolute;
  inset: 0 0 auto 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
}
.step-card:hover, .feature-card:hover {
  transform: translateY(-5px);
  border-color: rgba(255, 143, 177, 0.35);
  box-shadow: 0 18px 50px rgba(255, 63, 127, 0.14);
}

.card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.icon-chip {
  width: 46px;
  height: 46px;
  display: grid;
  place-items: center;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(255, 143, 177, 0.16), rgba(125, 232, 245, 0.10));
  border: 1px solid rgba(255, 143, 177, 0.28);
  color: var(--pink);
}
.icon-chip svg { width: 22px; height: 22px; }
.step-num {
  font-family: var(--font-display);
  font-size: 2rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.14);
  line-height: 1;
}
.step-card h3, .feature-card h3 { margin: 0; font-size: 1.18rem; font-weight: 700; }
.step-card p, .feature-card p { margin: 0; color: var(--ink-dim); font-size: 0.98rem; }

/* ================= Pill ketangguhan ================= */
.resilience { margin-top: 2.6rem; display: flex; justify-content: center; }
.resilience-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  max-width: 620px;
  padding: 0.85rem 1.45rem;
  border-radius: 999px;
  background: rgba(125, 232, 245, 0.05);
  border: 1px solid rgba(125, 232, 245, 0.25);
  color: var(--ink-dim);
  font-size: 0.95rem;
  text-align: left;
}
.resilience-pill svg { width: 20px; height: 20px; flex: none; color: var(--cyan); }

/* ================= CTA akhir ================= */
.cta-panel {
  position: relative;
  overflow: hidden;
  text-align: center;
  padding: clamp(2.5rem, 6vw, 4.5rem);
  border-radius: 28px;
  border: 1px solid rgba(255, 143, 177, 0.28);
  background:
    radial-gradient(70% 120% at 50% 110%, rgba(255, 94, 148, 0.16), transparent 60%),
    linear-gradient(160deg, rgba(255, 94, 148, 0.10), rgba(13, 2, 8, 0.6) 45%, rgba(125, 232, 245, 0.07));
  box-shadow: 0 30px 80px rgba(255, 63, 127, 0.12);
  display: grid;
  gap: 1.1rem;
  justify-items: center;
}
.cta-panel::before {
  content: "";
  position: absolute;
  inset: 0 0 auto 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.35), transparent);
}
.cta-panel h2 {
  margin: 0;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: clamp(1.8rem, 2.6vw + 0.9rem, 2.7rem);
  line-height: 1.18;
  text-wrap: balance;
}
.cta-panel p { margin: 0; max-width: 560px; color: var(--ink-dim); }

/* ================= Footer ================= */
.site-footer {
  border-top: 1px solid rgba(255, 255, 255, 0.07);
  background: rgba(13, 2, 8, 0.6);
  padding: 3rem 0 calc(2.2rem + env(safe-area-inset-bottom, 0px));
}
.footer-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.05rem;
  text-align: center;
}
.footer-brand {
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1.15rem;
}
.footer-brand svg { width: 18px; height: 18px; color: var(--pink-strong); }
.footer-tagline { margin: 0; color: var(--ink-dim); font-size: 0.98rem; }
.footer-nav { display: flex; flex-wrap: wrap; justify-content: center; gap: 1.6rem; }
.footer-nav a { color: var(--ink-dim); text-decoration: none; font-size: 0.95rem; transition: color 0.2s ease; }
.footer-nav a:hover { color: var(--pink); }
.copyright { margin: 0; color: var(--ink-faint); font-size: 0.85rem; }
.heart-inline { color: var(--pink-strong); }

/* ================= Reveal on scroll (hanya saat JS aktif) ================= */
html.js .reveal {
  opacity: 0;
  transform: translateY(22px);
  transition: opacity 0.65s ease, transform 0.45s ease;
}
html.js .reveal.is-visible { opacity: 1; transform: none; }

/* ================= Reduced motion ================= */
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
  .float-heart { display: none; }
  .orb, .pulse-heart { animation: none !important; }
}
</style>
</head>

<body>
<a class="skip-link" href="#konten-utama">Langsung ke konten utama</a>

<header class="site-header">
  <div class="container header-inner">
    <a class="brand" href="index.html" aria-current="page">
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
      </svg>
      Romance Engine
    </a>
    <nav class="main-nav" aria-label="Navigasi utama">
      <a href="#cara-kerja">Cara Kerja</a>
      <a href="#fitur">Fitur</a>
      <a class="btn btn-primary btn-sm" href="create.html">Buat Deklarasi</a>
    </nav>
  </div>
</header>

<main id="konten-utama" tabindex="-1">

  <!-- ================= HERO ================= -->
  <section class="hero" aria-label="Pembuka">
    <div class="hero-bg" aria-hidden="true">
      <div class="orb orb--pink"></div>
      <div class="orb orb--cyan"></div>
      <div class="hearts-field">
        <span class="float-heart" style="--x:5%;  --size:20px; --dur:15s;   --delay:-2s;   --sway:28px;  --alpha:.45"><svg viewBox="0 0 24 24" fill="currentColor" focusable="false"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg></span>
        <span class="float-heart" style="--x:16%; --size:14px; --dur:12s;   --delay:-5s;   --sway:-22px; --alpha:.35"><svg viewBox="0 0 24 24" fill="currentColor" focusable="false"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg></span>
        <span class="float-heart" style="--x:28%; --size:26px; --dur:18s;   --delay:-9s;   --sway:34px;  --alpha:.5"><svg viewBox="0 0 24 24" fill="currentColor" focusable="false"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg></span>
        <span class="float-heart" style="--x:42%; --size:16px; --dur:13s;   --delay:-1s;   --sway:-18px; --alpha:.38"><svg viewBox="0 0 24 24" fill="currentColor" focusable="false"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg></span>
        <span class="float-heart" style="--x:55%; --size:22px; --dur:16s;   --delay:-7s;   --sway:24px;  --alpha:.42"><svg viewBox="0 0 24 24" fill="currentColor" focusable="false"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg></span>
        <span class="float-heart" style="--x:67%; --size:15px; --dur:12.5s; --delay:-11s;  --sway:-26px; --alpha:.34"><svg viewBox="0 0 24 24" fill="currentColor" focusable="false"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg></span>
        <span class="float-heart" style="--x:79%; --size:24px; --dur:17s;   --delay:-4s;   --sway:30px;  --alpha:.48"><svg viewBox="0 0 24 24" fill="currentColor" focusable="false"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg></span>
        <span class="float-heart" style="--x:91%; --size:18px; --dur:14s;   --delay:-12.5s;--sway:-20px; --alpha:.4"><svg viewBox="0 0 24 24" fill="currentColor" focusable="false"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg></span>
      </div>
    </div>

    <div class="container hero-content">
      <p class="eyebrow">Romance Engine · Surat Cinta Digital</p>

      <h1>Sampaikan cintamu sebagai <em>pengalaman sinematik</em>, bukan sekadar pesan.</h1>

      <p class="lead">
        Romance Engine merangkai nama, pesan, lagu, dan tanggal spesial kalian
        menjadi satu tautan hidup — lengkap dengan musik yang mengalun,
        kelopak hati yang melayang, dan sebuah pertanyaan besar untuknya.
      </p>

      <div class="hero-actions">
        <a class="btn btn-primary" href="create.html">
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
          Buat Deklarasi Cinta
        </a>
        <a class="btn btn-ghost" href="#cara-kerja">Lihat Cara Kerja</a>
      </div>

      <p class="hero-note">Tanpa install &nbsp;·&nbsp; Tanpa ubah kode &nbsp;·&nbsp; Satu tautan siap dibagikan</p>

      <figure class="hero-preview">
        <p class="gateway-chip">
          <span class="pulse-heart" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="currentColor" focusable="false">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          </span>
          Tap to Open My Heart
        </p>
        <figcaption>— seperti inilah pasanganmu membuka tautan darimu nanti.</figcaption>
      </figure>
    </div>
  </section>

  <!-- ================= CARA KERJA ================= -->
  <section class="section" id="cara-kerja" aria-labelledby="cara-kerja-title">
    <div class="container">
      <div class="section-head reveal">
        <p class="section-eyebrow">Cara Kerja</p>
        <h2 id="cara-kerja-title">Tiga langkah menuju hatinya</h2>
        <p class="section-sub">Dari kata-kata sederhana menjadi pengalaman yang akan ia buka dengan senyum.</p>
      </div>

      <ol class="steps-grid" role="list">
        <li class="reveal">
          <article class="step-card glass">
            <div class="card-top">
              <span class="icon-chip" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" focusable="false">
                  <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/>
                </svg>
              </span>
              <span class="step-num" aria-hidden="true">01</span>
            </div>
            <h3>Tulis ceritamu</h3>
            <p>Isi nama pasangan, pesan paling dalam, tanggal spesial kalian, foto kenangan, dan lagu yang penuh arti.</p>
          </article>
        </li>

        <li class="reveal" style="transition-delay: 0.1s;">
          <article class="step-card glass">
            <div class="card-top">
              <span class="icon-chip" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" focusable="false">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                </svg>
              </span>
              <span class="step-num" aria-hidden="true">02</span>
            </div>
            <h3>Terima tautan unikmu</h3>
            <p>Deklarasimu tersimpan rapi dan kamu mendapatkan satu URL istimewa — siap dikirim lewat chat apa pun.</p>
          </article>
        </li>

        <li class="reveal" style="transition-delay: 0.2s;">
          <article class="step-card glass">
            <div class="card-top">
              <span class="icon-chip" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" focusable="false">
                  <path d="M12 2.5l2.1 5.1 5.4 1.9-5.4 1.9L12 16.5l-2.1-5.1-5.4-1.9 5.4-1.9Z"/>
                  <path d="M19 15l1 2.4 2.5 1-2.5 1-1 2.4-1-2.4-2.5-1 2.5-1Z"/>
                </svg>
              </span>
              <span class="step-num" aria-hidden="true">03</span>
            </div>
            <h3>Biarkan dia merasakannya</h3>
            <p>Ia mengetuk pintu hati: musik mengalun, visual tiga dimensi bernyala, penghitung hari berjalan, dan pertanyaan itu muncul.</p>
          </article>
        </li>
      </ol>
    </div>
  </section>

  <!-- ================= FITUR ================= -->
  <section class="section section-alt" id="fitur" aria-labelledby="fitur-title">
    <div class="container">
      <div class="section-head reveal">
        <p class="section-eyebrow">Fitur</p>
        <h2 id="fitur-title">Sebuah panggung untuk perasaanmu</h2>
        <p class="section-sub">Setiap detail dirancang agar momen itu terasa personal, hangat, dan tak terlupakan.</p>
      </div>

      <ul class="cards-grid" role="list">
        <li class="reveal">
          <article class="feature-card glass">
            <div class="card-top">
              <span class="icon-chip" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" focusable="false">
                  <path d="M12 20.5s-7-4.6-9.3-8.6C.8 8.4 2.6 4.5 6 4.5c2 0 3.6 1 4.6 2.5.3.5 1.5.5 1.8 0 1-1.5 2.6-2.5 4.6-2.5 3.4 0 5.2 3.9 3.3 7.4-2.3 4-8.3 8.6-8.3 8.6Z"/>
                </svg>
              </span>
            </div>
            <h3>Panggung tiga dimensi</h3>
            <p>Hati, kelopak, dan bintang melayang di atas palet obsidian dan deep crimson, berkilau lembut dalam glassmorphism.</p>
          </article>
        </li>

        <li class="reveal" style="transition-delay: 0.1s;">
          <article class="feature-card glass">
            <div class="card-top">
              <span class="icon-chip" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" focusable="false">
                  <path d="M12 2.5l2.1 5.1 5.4 1.9-5.4 1.9L12 16.5l-2.1-5.1-5.4-1.9 5.4-1.9Z"/>
                  <path d="M19 15l1 2.4 2.5 1-2.5 1-1 2.4-1-2.4-2.5-1 2.5-1Z"/>
                </svg>
              </span>
            </div>
            <h3>Pertanyaan YES / NO</h3>
            <p>Tombol &ldquo;Tidak&rdquo; akan menghindar dengan jenaka. Jawaban &ldquo;Ya&rdquo; memicu konfeti, melodi kemenangan, dan surat cinta yang menanti.</p>
          </article>
        </li>

        <li class="reveal" style="transition-delay: 0.2s;">
          <article class="feature-card glass">
            <div class="card-top">
              <span class="icon-chip" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" focusable="false">
                  <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>
                </svg>
              </span>
            </div>
            <h3>Penghitung hari spesial</h3>
            <p>Setiap hari, jam, menit, dan detik yang telah kalian lalui bersama — diperbarui langsung di layar.</p>
          </article>
        </li>
      </ul>

      <div class="resilience reveal">
        <p class="resilience-pill">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
            <path d="M12 3l7 3v5c0 4.5-3 8.1-7 10-4-1.9-7-5.5-7-10V6Z"/><path d="M9 12l2 2 4-4"/>
          </svg>
          Dirancang tangguh — saat WebGL, audio, atau koneksi tidak sempurna, pengalaman tetap berlanjut dengan anggun.
        </p>
      </div>
    </div>
  </section>

  <!-- ================= CTA AKHIR ================= -->
  <section class="section" id="mulai" aria-labelledby="mulai-title">
    <div class="container">
      <div class="cta-panel reveal">
        <h2 id="mulai-title">Perasaanmu layak disampaikan dengan cara yang paling indah</h2>
        <p>Luangkan beberapa menit untuk menulisnya — satu tautan yang mungkin ia kenang selamanya.</p>
        <a class="btn btn-primary" href="create.html">
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
          Buat Deklarasi Sekarang
        </a>
      </div>
    </div>
  </section>

</main>

<footer class="site-footer">
  <div class="container footer-inner">
    <p class="footer-brand">
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
      </svg>
      Romance Engine
    </p>
    <p class="footer-tagline">Setiap tautan adalah pintu menuju perasaanmu.</p>
    <nav class="footer-nav" aria-label="Navigasi footer">
      <a href="index.html" aria-current="page">Beranda</a>
      <a href="#cara-kerja">Cara Kerja</a>
      <a href="#fitur">Fitur</a>
      <a href="create.html">Buat Deklarasi</a>
    </nav>
    <p class="copyright">Romance Engine V1 · Dibangun dengan <span class="heart-inline" aria-hidden="true">♥</span> di Cloudflare Pages &amp; Workers</p>
  </div>
</footer>

<script>
(function () {
  // Reveal-on-scroll dengan fallback: jika IntersectionObserver tidak
  // tersedia atau terjadi kesalahan, seluruh elemen langsung ditampilkan
  // agar konten tidak pernah terperangkap dalam state tersembunyi.
  var revealElements = document.querySelectorAll('.reveal');

  function showAll() {
    revealElements.forEach(function (el) { el.classList.add('is-visible'); });
  }

  try {
    if (!('IntersectionObserver' in window)) {
      showAll();
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });

    revealElements.forEach(function (el) { observer.observe(el); });
  } catch (err) {
    showAll();
  }
})();
</script>
</body>
</html>
```
4. **public/create.html**
```html
<!DOCTYPE html>
<html lang="id">
<head>
<!--
  ============================================================
  Romance Engine V1 — public/create.html (Dynamic Form Generator)
  ============================================================
  Fitur: F-001 Dynamic Form Generator

  Kontrak API (konsisten dengan src/index.js):
    POST {API_BASE}/api/save
    Body : { recipientName, message, specialDate, photoUrl, musicUrl }
    201  : { ok: true,  data: { id, viewUrl, payload } }
    4xx/5xx: { ok: false, error: { code, message, details? } }

  Fallback (sesuai spesifikasi §10):
    Jika API gagal, client membangun URL view.html?data=BASE64
    dari data form yang valid, sehingga user tetap mendapat
    tautan yang dapat dibagikan. Data form TIDAK pernah hilang.

  Keamanan:
    - Semua input dianggap untrusted; validasi client-side + server-side.
    - Tidak ada innerHTML dengan konten user (XSS-safe).
    - URL hanya http/https (javascript:/data: diblokir).
    - Encoding base64 UTF-8 aman.
-->
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="dark">
<meta name="theme-color" content="#0D0208">
<title>Buat Deklarasi Cinta ♥ Romance Engine</title>
<meta name="description" content="Tulis deklarasi cintamu dan dapatkan tautan sinematik untuk pasanganmu.">
<link rel="canonical" href="https://romance-engine.pages.dev/create.html">
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%23FF5E94' d='M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z'/%3E%3C/svg%3E">

<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/fontsource/css/playfair-display@latest/latin-700-normal.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/fontsource/css/playfair-display@latest/latin-500-italic.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/fontsource/css/manrope@latest/latin-400-normal.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/fontsource/css/manrope@latest/latin-600-normal.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/fontsource/css/manrope@latest/latin-700-normal.css">

<!-- Shared stylesheet (opsional; critical CSS inline di bawah menjamin
     form tetap usable meskipun file ini gagal dimuat). -->
<link rel="stylesheet" href="assets/css/style.css">

<style>
/* ================= Design tokens ================= */
:root {
  color-scheme: dark;
  --obsidian: #0D0208;
  --deep-crimson: #1A000C;
  --ink: #FDF2F6;
  --ink-dim: rgba(253, 242, 246, 0.74);
  --ink-faint: rgba(253, 242, 246, 0.5);
  --pink: #FF8FB1;
  --pink-strong: #FF5E94;
  --pink-deep: #F43F7F;
  --cyan: #7DE8F5;
  --glass-bg: rgba(255, 255, 255, 0.045);
  --glass-border: rgba(255, 255, 255, 0.10);
  --radius-lg: 22px;
  --radius-md: 14px;
  --font-display: "Playfair Display", Georgia, "Times New Roman", serif;
  --font-body: "Manrope", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}

*, *::before, *::after { box-sizing: border-box; }
html { scroll-behavior: smooth; }

body {
  margin: 0;
  font-family: var(--font-body);
  font-size: 1rem;
  line-height: 1.65;
  color: var(--ink);
  background-color: var(--obsidian);
  background-image:
    radial-gradient(1100px 700px at 82% -8%, rgba(244, 63, 127, 0.13), transparent 62%),
    radial-gradient(800px 600px at 4% 14%, rgba(125, 232, 245, 0.06), transparent 58%),
    radial-gradient(900px 700px at 50% 118%, rgba(122, 16, 62, 0.40), transparent 62%);
  min-height: 100vh;
  min-height: 100svh;
  overflow-x: hidden;
  -webkit-font-smoothing: antialiased;
}

img, svg { display: block; max-width: 100%; }
[hidden] { display: none !important; }
::selection { background: rgba(255, 94, 148, 0.45); color: #fff; }

.container {
  width: min(720px, 100% - 2rem);
  margin-inline: auto;
}

/* ================= Aksesibilitas ================= */
.skip-link {
  position: absolute;
  left: 1rem;
  top: -3.5rem;
  z-index: 80;
  background: var(--deep-crimson);
  color: var(--ink);
  padding: 0.65rem 1.1rem;
  border-radius: 12px;
  border: 1px solid var(--glass-border);
  text-decoration: none;
  font-weight: 600;
  transition: top 0.2s ease;
}
.skip-link:focus { top: 1rem; }

a:focus-visible, button:focus-visible, input:focus-visible, textarea:focus-visible {
  outline: 2px solid var(--cyan);
  outline-offset: 3px;
  border-radius: 6px;
}

/* ================= Header ================= */
.site-header {
  padding: calc(1.15rem + env(safe-area-inset-top, 0px)) 0 1rem;
}
.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}
.brand {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1.18rem;
  letter-spacing: 0.02em;
  color: var(--ink);
  text-decoration: none;
}
.brand svg {
  width: 22px;
  height: 22px;
  color: var(--pink-strong);
  filter: drop-shadow(0 0 10px rgba(255, 94, 148, 0.55));
}
.main-nav { display: flex; align-items: center; gap: 1.5rem; }
.main-nav a {
  color: var(--ink-dim);
  text-decoration: none;
  font-weight: 600;
  font-size: 0.95rem;
  transition: color 0.2s ease;
}
.main-nav a:hover { color: var(--pink); }
.main-nav a[aria-current="page"] { color: var(--pink); }

/* ================= Page heading ================= */
.page-head {
  text-align: center;
  padding: 2.5rem 0 2rem;
  display: grid;
  gap: 0.75rem;
  justify-items: center;
}
.page-head h1 {
  margin: 0;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: clamp(1.9rem, 3vw + 0.9rem, 2.8rem);
  line-height: 1.15;
  text-wrap: balance;
}
.page-head h1 em {
  font-style: italic;
  font-weight: 500;
  background: linear-gradient(100deg, #FFB3C9 5%, #FF5E94 55%, #8FE9F7 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
}
.page-sub {
  margin: 0;
  color: var(--ink-dim);
  max-width: 520px;
}

/* ================= Form card ================= */
.form-card {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  padding: clamp(1.5rem, 4vw, 2.5rem);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  position: relative;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
}
.form-card::before {
  content: "";
  position: absolute;
  inset: 0 0 auto 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  pointer-events: none;
}

.form-grid { display: grid; gap: 1.5rem; }

.field { display: grid; gap: 0.45rem; }
.field-label-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}
label {
  font-weight: 700;
  font-size: 0.98rem;
  color: var(--ink);
}
label .req { color: var(--pink-strong); margin-left: 2px; }
.optional-tag {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--ink-faint);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.char-count {
  font-size: 0.82rem;
  color: var(--ink-faint);
  font-variant-numeric: tabular-nums;
  transition: color 0.2s ease;
}
.char-count.warn { color: #FFC971; }
.char-count.over { color: var(--pink-strong); font-weight: 700; }

input[type="text"],
input[type="date"],
input[type="url"],
textarea {
  width: 100%;
  background: rgba(13, 2, 8, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: var(--radius-md);
  color: var(--ink);
  font-family: var(--font-body);
  font-size: 1rem;
  padding: 0.85rem 1rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  -webkit-appearance: none;
  appearance: none;
}
textarea {
  resize: vertical;
  min-height: 160px;
  line-height: 1.7;
}
input::placeholder, textarea::placeholder { color: var(--ink-faint); }
input:focus, textarea:focus {
  outline: none;
  border-color: rgba(255, 143, 177, 0.65);
  box-shadow: 0 0 0 3px rgba(255, 94, 148, 0.22);
}
input[aria-invalid="true"], textarea[aria-invalid="true"] {
  border-color: rgba(255, 94, 148, 0.8);
  box-shadow: 0 0 0 3px rgba(255, 94, 148, 0.18);
}
input[type="date"]::-webkit-calendar-picker-indicator {
  filter: invert(0.85);
  cursor: pointer;
}

.field-hint {
  margin: 0;
  font-size: 0.88rem;
  color: var(--ink-faint);
}
.field-error {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--pink-strong);
  display: flex;
  align-items: flex-start;
  gap: 0.4rem;
}
.field-error::before { content: "⚠"; flex: none; }

/* ================= Tombol ================= */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  min-height: 48px;
  padding: 0.9rem 1.7rem;
  border-radius: 999px;
  border: none;
  font-family: var(--font-body);
  font-size: 1rem;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
  transition: transform 0.25s ease, box-shadow 0.25s ease, background-color 0.25s ease, border-color 0.25s ease, opacity 0.2s ease;
}
.btn svg { width: 18px; height: 18px; flex: none; }
.btn-primary {
  color: #33061A;
  background: linear-gradient(135deg, #FFC1D4 0%, #FF5E94 55%, #FF8FD0 100%);
  box-shadow: 0 10px 34px rgba(255, 94, 148, 0.35), inset 0 0 0 1px rgba(255, 255, 255, 0.35);
}
.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 16px 46px rgba(255, 94, 148, 0.48), inset 0 0 0 1px rgba(255, 255, 255, 0.45);
}
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
.btn-ghost {
  color: var(--ink);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}
.btn-ghost:hover { transform: translateY(-2px); border-color: rgba(255, 143, 177, 0.5); }
.btn-block { width: 100%; }

.spinner {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid rgba(51, 6, 26, 0.35);
  border-top-color: #33061A;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ================= Alert global ================= */
.form-alert {
  border-radius: var(--radius-md);
  padding: 1rem 1.15rem;
  font-size: 0.95rem;
  line-height: 1.55;
  border: 1px solid;
  display: grid;
  gap: 0.35rem;
}
.form-alert.error {
  background: rgba(255, 94, 148, 0.10);
  border-color: rgba(255, 94, 148, 0.4);
  color: var(--ink);
}
.form-alert strong { color: var(--pink-strong); }

/* ================= Success panel ================= */
.success-panel {
  display: grid;
  gap: 1.25rem;
  text-align: center;
  justify-items: center;
}
.success-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, rgba(255, 143, 177, 0.2), rgba(125, 232, 245, 0.15));
  border: 1px solid rgba(255, 143, 177, 0.4);
  color: var(--pink-strong);
  box-shadow: 0 0 40px rgba(255, 94, 148, 0.3);
}
.success-icon svg { width: 30px; height: 30px; }
.success-panel h2 {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(1.6rem, 2.5vw + 0.8rem, 2.2rem);
  font-weight: 700;
}
.success-panel p { margin: 0; color: var(--ink-dim); max-width: 520px; }

.url-box {
  width: 100%;
  background: rgba(13, 2, 8, 0.6);
  border: 1px solid rgba(255, 143, 177, 0.35);
  border-radius: var(--radius-md);
  padding: 0.8rem 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.url-text {
  flex: 1 1 auto;
  min-width: 0;
  font-size: 0.92rem;
  color: var(--cyan);
  word-break: break-all;
  font-variant-numeric: tabular-nums;
  text-align: left;
}
.url-actions { display: flex; gap: 0.6rem; flex-wrap: wrap; }
.btn-sm { min-height: 44px; padding: 0.55rem 1.2rem; font-size: 0.92rem; }

.fallback-note {
  font-size: 0.88rem;
  color: var(--ink-faint);
  margin: 0;
  max-width: 560px;
}
.fallback-note.warn { color: #FFC971; }

/* ================= Footer ================= */
.site-footer {
  border-top: 1px solid rgba(255, 255, 255, 0.07);
  background: rgba(13, 2, 8, 0.6);
  padding: 2.5rem 0 calc(2rem + env(safe-area-inset-bottom, 0px));
  margin-top: 4rem;
  text-align: center;
}
.footer-inner { display: grid; gap: 0.9rem; justify-items: center; }
.footer-brand {
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--font-display);
  font-weight: 700;
}
.footer-brand svg { width: 18px; height: 18px; color: var(--pink-strong); }
.footer-nav { display: flex; flex-wrap: wrap; justify-content: center; gap: 1.6rem; }
.footer-nav a { color: var(--ink-dim); text-decoration: none; font-size: 0.95rem; }
.footer-nav a:hover { color: var(--pink); }
.copyright { margin: 0; color: var(--ink-faint); font-size: 0.85rem; }
.heart-inline { color: var(--pink-strong); }

/* ================= Responsive ================= */
@media (max-width: 640px) {
  .main-nav a:not(.brand-link) { display: none; }
  .url-actions { width: 100%; }
  .url-actions .btn { flex: 1 1 auto; }
}

/* ================= Reduced motion ================= */
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
</style>
</head>

<body>
<a class="skip-link" href="#konten-utama">Langsung ke konten utama</a>

<header class="site-header">
  <div class="container header-inner">
    <a class="brand" href="index.html">
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
      </svg>
      Romance Engine
    </a>
    <nav class="main-nav" aria-label="Navigasi utama">
      <a href="index.html">Beranda</a>
      <a href="create.html" aria-current="page">Buat Deklarasi</a>
    </nav>
  </div>
</header>

<main id="konten-utama">
  <div class="container">

    <div class="page-head">
      <h1>Tulis <em>deklarasi cintamu</em></h1>
      <p class="page-sub">Isi detail di bawah ini. Kami akan merangkainya menjadi satu tautan sinematik yang siap kamu kirimkan untuknya.</p>
    </div>

    <!-- ================= FORM (F-001) ================= -->
    <section id="form-section" aria-labelledby="form-heading">
      <h2 id="form-heading" class="skip-link" style="position:absolute;left:-9999px;">Form deklarasi cinta</h2>

      <div class="form-card">
        <!-- Alert global (aria-live agar pembaca layar mendengar) -->
        <div id="form-alert" class="form-alert error" role="alert" hidden></div>

        <form id="create-form" class="form-grid" novalidate>

          <!-- Nama pasangan -->
          <div class="field">
            <div class="field-label-row">
              <label for="recipientName">Nama Pasangan <span class="req" aria-hidden="true">*</span></label>
              <span id="name-count" class="char-count" aria-hidden="true">0/100</span>
            </div>
            <input
              type="text"
              id="recipientName"
              name="recipientName"
              maxlength="100"
              required
              autocomplete="off"
              placeholder="Contoh: Aisyah"
              aria-describedby="recipientName-hint recipientName-error"
            >
            <p id="recipientName-hint" class="field-hint">Nama yang akan tampil di layar experience.</p>
            <p id="recipientName-error" class="field-error" hidden></p>
          </div>

          <!-- Pesan deklarasi -->
          <div class="field">
            <div class="field-label-row">
              <label for="message">Pesan Deklarasi <span class="req" aria-hidden="true">*</span></label>
              <span id="message-count" class="char-count" aria-hidden="true">0/10000</span>
            </div>
            <textarea
              id="message"
              name="message"
              maxlength="10000"
              required
              placeholder="Tulis perasaanmu di sini… kamu bisa menekan Enter untuk membuat baris baru."
              aria-describedby="message-hint message-error"
            ></textarea>
            <p id="message-hint" class="field-hint">Pesan multi-paragraf. Akan ditampilkan sebagai surat cinta dengan animasi mengetik.</p>
            <p id="message-error" class="field-error" hidden></p>
          </div>

          <!-- Tanggal spesial -->
          <div class="field">
            <div class="field-label-row">
              <label for="specialDate">Tanggal Spesial / Jadian <span class="req" aria-hidden="true">*</span></label>
            </div>
            <input
              type="date"
              id="specialDate"
              name="specialDate"
              required
              aria-describedby="specialDate-hint specialDate-error"
            >
            <p id="specialDate-hint" class="field-hint">Tanggal jadian atau momen spesial kalian. Dipakai untuk penghitung hari real-time.</p>
            <p id="specialDate-error" class="field-error" hidden></p>
          </div>

          <!-- URL foto -->
          <div class="field">
            <div class="field-label-row">
              <label for="photoUrl">URL Foto Kenangan</label>
              <span class="optional-tag">Opsional</span>
            </div>
            <input
              type="url"
              id="photoUrl"
              name="photoUrl"
              maxlength="2048"
              autocomplete="off"
              placeholder="https://contoh.com/foto-kita.jpg"
              inputmode="url"
              aria-describedby="photoUrl-hint photoUrl-error"
            >
            <p id="photoUrl-hint" class="field-hint">Tempel URL gambar publik (jpg/png/webp). Jika gagal dimuat, experience tetap berjalan tanpa foto.</p>
            <p id="photoUrl-error" class="field-error" hidden></p>
          </div>

          <!-- URL musik -->
          <div class="field">
            <div class="field-label-row">
              <label for="musicUrl">URL Musik Latar</label>
              <span class="optional-tag">Opsional</span>
            </div>
            <input
              type="url"
              id="musicUrl"
              name="musicUrl"
              maxlength="2048"
              autocomplete="off"
              placeholder="https://contoh.com/lagu-kita.mp3"
              inputmode="url"
              aria-describedby="musicUrl-hint musicUrl-error"
            >
            <p id="musicUrl-hint" class="field-hint">Tempel URL file audio publik (mp3 disarankan). Jika gagal, musik default akan digunakan.</p>
            <p id="musicUrl-error" class="field-error" hidden></p>
          </div>

          <!-- Submit -->
          <button id="submit-btn" class="btn btn-primary btn-block" type="submit">
            <span id="submit-label">Buat Deklarasi Cinta</span>
            <svg id="submit-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          </button>

        </form>
      </div>
    </section>

    <!-- ================= SUCCESS PANEL ================= -->
    <section id="success-section" class="form-card success-panel" hidden aria-labelledby="success-heading">
      <div class="success-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" focusable="false">
          <path d="M20 6L9 17l-5-5"/>
        </svg>
      </div>

      <h2 id="success-heading">Deklarasimu Sudah Siap ♥</h2>
      <p id="success-description">Salin tautan di bawah ini dan kirimkan untuknya. Saat ia membuka tautan itu, experience romantis akan menantinya.</p>

      <div class="url-box">
        <span id="result-url" class="url-text"></span>
        <div class="url-actions">
          <button id="copy-btn" class="btn btn-primary btn-sm" type="button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            <span id="copy-label">Salin</span>
          </button>
          <button id="share-btn" class="btn btn-ghost btn-sm" type="button" hidden>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"/>
            </svg>
            Bagikan
          </button>
          <a id="open-btn" class="btn btn-ghost btn-sm" href="#" target="_blank" rel="noopener noreferrer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14L21 3"/>
            </svg>
            Buka
          </a>
        </div>
      </div>

      <p id="fallback-note" class="fallback-note" hidden></p>

      <button id="create-another-btn" class="btn btn-ghost btn-sm" type="button">Buat Deklarasi Lagi</button>

      <!-- Status live region untuk feedback copy/share -->
      <div id="action-status" role="status" aria-live="polite" style="position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden;"></div>
    </section>

  </div>
</main>

<footer class="site-footer">
  <div class="container footer-inner">
    <p class="footer-brand">
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
      </svg>
      Romance Engine
    </p>
    <nav class="footer-nav" aria-label="Navigasi footer">
      <a href="index.html">Beranda</a>
      <a href="create.html" aria-current="page">Buat Deklarasi</a>
    </nav>
    <p class="copyright">Romance Engine V1 · Dibangun dengan <span class="heart-inline" aria-hidden="true">♥</span> di Cloudflare Pages &amp; Workers</p>
  </div>
</footer>

<script>
(function () {
  'use strict';

  /* ============================================================
   * KONFIGURASI — konsisten dengan src/index.js dan view.html
   * ============================================================ */
  var API_BASE = 'https://romance-engine.azrielspace852.workers.dev';
  var SAVE_ENDPOINT = API_BASE + '/api/save';
  var VIEW_PAGE = 'view.html';
  var FETCH_TIMEOUT_MS = 10000;

  var LIMITS = {
    name: 100,
    message: 10000,
    date: 64,
    url: 2048
  };

  /* ============================================================
   * REFERENSI DOM
   * ============================================================ */
  var els = {
    form: document.getElementById('create-form'),
    formSection: document.getElementById('form-section'),
    formAlert: document.getElementById('form-alert'),
    submitBtn: document.getElementById('submit-btn'),
    submitLabel: document.getElementById('submit-label'),
    submitIcon: document.getElementById('submit-icon'),

    recipientName: document.getElementById('recipientName'),
    nameCount: document.getElementById('name-count'),
    recipientNameError: document.getElementById('recipientName-error'),

    message: document.getElementById('message'),
    messageCount: document.getElementById('message-count'),
    messageError: document.getElementById('message-error'),

    specialDate: document.getElementById('specialDate'),
    specialDateError: document.getElementById('specialDate-error'),

    photoUrl: document.getElementById('photoUrl'),
    photoUrlError: document.getElementById('photoUrl-error'),

    musicUrl: document.getElementById('musicUrl'),
    musicUrlError: document.getElementById('musicUrl-error'),

    successSection: document.getElementById('success-section'),
    successDescription: document.getElementById('success-description'),
    resultUrl: document.getElementById('result-url'),
    copyBtn: document.getElementById('copy-btn'),
    copyLabel: document.getElementById('copy-label'),
    shareBtn: document.getElementById('share-btn'),
    openBtn: document.getElementById('open-btn'),
    fallbackNote: document.getElementById('fallback-note'),
    createAnotherBtn: document.getElementById('create-another-btn'),
    actionStatus: document.getElementById('action-status')
  };

  var state = {
    submitting: false,
    finalUrl: '',
    usedFallback: false
  };

  /* ============================================================
   * UTIL
   * ============================================================ */

  function show(el) { if (el) el.hidden = false; }
  function hide(el) { if (el) el.hidden = true; }

  function setText(el, text) {
    if (el) el.textContent = text;
  }

  /**
   * Validasi URL: hanya http/https yang diizinkan.
   * Return string URL ternormalisasi, atau null jika kosong/invalid.
   */
  function validateUrl(value, maxLen) {
    if (typeof value !== 'string') return null;
    var candidate = value.trim();
    if (candidate.length === 0) return null;
    if (candidate.length > maxLen) return { error: 'URL terlalu panjang.' };
    try {
      var parsed = new URL(candidate);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return { error: 'URL harus menggunakan http atau https.' };
      }
      return parsed.toString();
    } catch (err) {
      return { error: 'Format URL tidak valid.' };
    }
  }

  /**
   * Encode string UTF-8 ke base64 URL-safe (tanpa padding issue).
   * Menggunakan TextEncoder untuk menjamin UTF-8 benar.
   */
  function encodeBase64Utf8(str) {
    var bytes = new TextEncoder().encode(str);
    var binary = '';
    for (var i = 0; i < bytes.length; i += 1) {
      binary += String.fromCharCode(bytes[i]);
    }
    var b64 = btoa(binary);
    // URL-safe: ganti +/ dan hapus padding
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  /**
   * Set error pada field tertentu.
   */
  function setFieldError(inputEl, errorEl, msg) {
    if (msg) {
      inputEl.setAttribute('aria-invalid', 'true');
      setText(errorEl, msg);
      show(errorEl);
    } else {
      inputEl.removeAttribute('aria-invalid');
      setText(errorEl, '');
      hide(errorEl);
    }
  }

  function showGlobalAlert(msg) {
    setText(els.formAlert, msg);
    show(els.formAlert);
    els.formAlert.focus();
  }

  function hideGlobalAlert() {
    hide(els.formAlert);
    setText(els.formAlert, '');
  }

  function setLoading(isLoading) {
    state.submitting = isLoading;
    els.submitBtn.disabled = isLoading;
    if (isLoading) {
      setText(els.submitLabel, 'Menyimpan…');
      hide(els.submitIcon);
      var spinner = document.createElement('span');
      spinner.className = 'spinner';
      spinner.setAttribute('aria-hidden', 'true');
      spinner.id = 'submit-spinner';
      els.submitBtn.insertBefore(spinner, els.submitLabel);
    } else {
      setText(els.submitLabel, 'Buat Deklarasi Cinta');
      show(els.submitIcon);
      var sp = document.getElementById('submit-spinner');
      if (sp) sp.remove();
    }
  }

  /* ============================================================
   * CHARACTER COUNTERS
   * ============================================================ */
  function updateCounter(inputEl, countEl, max) {
    var len = inputEl.value.length;
    setText(countEl, len + '/' + max);
    countEl.classList.remove('warn', 'over');
    if (len >= max) {
      countEl.classList.add('over');
    } else if (len >= max * 0.9) {
      countEl.classList.add('warn');
    }
  }

  els.recipientName.addEventListener('input', function () {
    updateCounter(els.recipientName, els.nameCount, LIMITS.name);
  });
  els.message.addEventListener('input', function () {
    updateCounter(els.message, els.messageCount, LIMITS.message);
  });

  /* ============================================================
   * CLIENT-SIDE VALIDATION
   * ============================================================ */
  function validateForm() {
    var valid = true;

    // Nama
    var name = els.recipientName.value.trim();
    if (name.length === 0) {
      setFieldError(els.recipientName, els.recipientNameError, 'Nama pasangan wajib diisi.');
      valid = false;
    } else if (name.length > LIMITS.name) {
      setFieldError(els.recipientName, els.recipientNameError, 'Nama maksimal ' + LIMITS.name + ' karakter.');
      valid = false;
    } else {
      setFieldError(els.recipientName, els.recipientNameError, null);
    }

    // Pesan
    var msg = els.message.value.trim();
    if (msg.length === 0) {
      setFieldError(els.message, els.messageError, 'Pesan deklarasi wajib diisi.');
      valid = false;
    } else if (msg.length > LIMITS.message) {
      setFieldError(els.message, els.messageError, 'Pesan maksimal ' + LIMITS.message + ' karakter.');
      valid = false;
    } else {
      setFieldError(els.message, els.messageError, null);
    }

    // Tanggal
    var dateVal = els.specialDate.value.trim();
    if (dateVal.length === 0) {
      setFieldError(els.specialDate, els.specialDateError, 'Tanggal spesial wajib diisi.');
      valid = false;
    } else if (isNaN(new Date(dateVal).getTime())) {
      setFieldError(els.specialDate, els.specialDateError, 'Tanggal tidak valid.');
      valid = false;
    } else {
      setFieldError(els.specialDate, els.specialDateError, null);
    }

    // Photo URL
    var photoResult = validateUrl(els.photoUrl.value, LIMITS.url);
    if (photoResult && typeof photoResult === 'object' && photoResult.error) {
      setFieldError(els.photoUrl, els.photoUrlError, photoResult.error);
      valid = false;
    } else {
      setFieldError(els.photoUrl, els.photoUrlError, null);
    }

    // Music URL
    var musicResult = validateUrl(els.musicUrl.value, LIMITS.url);
    if (musicResult && typeof musicResult === 'object' && musicResult.error) {
      setFieldError(els.musicUrl, els.musicUrlError, musicResult.error);
      valid = false;
    } else {
      setFieldError(els.musicUrl, els.musicUrlError, null);
    }

    return valid;
  }

  function collectPayload() {
    var photoResult = validateUrl(els.photoUrl.value, LIMITS.url);
    var musicResult = validateUrl(els.musicUrl.value, LIMITS.url);

    return {
      recipientName: els.recipientName.value.trim(),
      message: els.message.value.trim(),
      specialDate: els.specialDate.value.trim(),
      photoUrl: (typeof photoResult === 'string') ? photoResult : null,
      musicUrl: (typeof musicResult === 'string') ? musicResult : null
    };
  }

  /* ============================================================
   * SUBMIT HANDLER
   * ============================================================ */
  function fetchWithTimeout(url, options, ms) {
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, ms);
    return fetch(url, Object.assign({}, options, { signal: controller.signal }))
      .finally(function () { clearTimeout(timer); });
  }

  async function submitToApi(payload) {
    var response = await fetchWithTimeout(SAVE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload)
    }, FETCH_TIMEOUT_MS);

    var body = null;
    try {
      body = await response.json();
    } catch (err) {
      // Body bukan JSON — perlakukan sebagai error generic
    }

    if (response.ok && body && body.ok === true && body.data && body.data.viewUrl) {
      return { success: true, viewUrl: body.data.viewUrl, id: body.data.id };
    }

    // Extract pesan error dari server jika tersedia
    var serverMsg = '';
    if (body && body.error && typeof body.error.message === 'string') {
      serverMsg = body.error.message;
    }
    return { success: false, status: response.status, serverMessage: serverMsg };
  }

  /**
   * Bangun fallback URL base64 dari payload.
   * Dipanggil hanya jika API gagal.
   */
  function buildFallbackUrl(payload) {
    try {
      var json = JSON.stringify(payload);
      var encoded = encodeBase64Utf8(json);
      var url = VIEW_PAGE + '?data=' + encodeURIComponent(encoded);
      return url;
    } catch (err) {
      return null;
    }
  }

  function showSuccess(viewUrl, isFallback, noteMsg) {
    state.finalUrl = viewUrl;
    state.usedFallback = isFallback;

    setText(els.resultUrl, viewUrl);
    els.openBtn.href = viewUrl;

    // Tampilkan tombol share hanya jika Web Share API tersedia
    if (navigator.share) {
      show(els.shareBtn);
    } else {
      hide(els.shareBtn);
    }

    // Catatan fallback
    if (noteMsg) {
      setText(els.fallbackNote, noteMsg);
      show(els.fallbackNote);
    } else {
      hide(els.fallbackNote);
    }

    hide(els.formSection);
    show(els.successSection);

    // Fokus ke heading sukses agar screen reader langsung membaca
    document.getElementById('success-heading').setAttribute('tabindex', '-1');
    document.getElementById('success-heading').focus();
  }

  els.form.addEventListener('submit', function (event) {
    event.preventDefault();
    if (state.submitting) return;

    hideGlobalAlert();

    if (!validateForm()) {
      // Fokus ke field pertama yang error
      var firstInvalid = els.form.querySelector('[aria-invalid="true"]');
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    var payload = collectPayload();
    setLoading(true);

    submitToApi(payload)
      .then(function (result) {
        setLoading(false);
        if (result.success) {
          showSuccess(result.viewUrl, false, null);
        } else {
          // API gagal — coba fallback base64
          var fallbackUrl = buildFallbackUrl(payload);
          if (fallbackUrl) {
            var note = 'Server sedang tidak dapat menyimpan deklarasi. Tautan di atas dibuat langsung dari browser kamu (mode offline) dan tetap berfungsi penuh.';
            showSuccess(fallbackUrl, true, note);
          } else {
            showGlobalAlert('Terjadi kesalahan tak terduga. Data form kamu tetap aman — silakan coba lagi.');
          }
        }
      })
      .catch(function (err) {
        setLoading(false);
        var fallbackUrl = buildFallbackUrl(payload);
        if (fallbackUrl) {
          var note = 'Tidak dapat terhubung ke server. Tautan di atas dibuat langsung dari browser kamu (mode offline) dan tetap berfungsi penuh.';
          showSuccess(fallbackUrl, true, note);
        } else {
          showGlobalAlert('Tidak dapat terhubung ke server. Data form kamu tetap aman — silakan coba lagi.');
        }
      });
  });

  /* ============================================================
   * COPY & SHARE
   * ============================================================ */
  function announce(msg) {
    setText(els.actionStatus, msg);
    // Reset setelah beberapa detik agar bisa di-announce lagi
    setTimeout(function () { setText(els.actionStatus, ''); }, 4000);
  }

  function resetCopyLabel() {
    setText(els.copyLabel, 'Salin');
  }

  async function copyToClipboard(text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (err) {
      // Fallback ke execCommand
    }
    // Fallback: textarea + execCommand
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      ta.style.top = '-9999px';
      ta.setAttribute('readonly', '');
      document.body.appendChild(ta);
      ta.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (err) {
      return false;
    }
  }

  els.copyBtn.addEventListener('click', function () {
    if (!state.finalUrl) return;
    copyToClipboard(state.finalUrl).then(function (ok) {
      if (ok) {
        setText(els.copyLabel, 'Tersalin!');
        announce('Tautan berhasil disalin ke clipboard.');
        setTimeout(resetCopyLabel, 2500);
      } else {
        setText(els.copyLabel, 'Gagal');
        announce('Gagal menyalin. Silakan salin tautan secara manual.');
        setTimeout(resetCopyLabel, 2500);
      }
    });
  });

  els.shareBtn.addEventListener('click', function () {
    if (!state.finalUrl || !navigator.share) return;
    navigator.share({
      title: 'Untukmu ♥ — Romance Engine',
      text: 'Ada sesuatu yang ingin kusampaikan untukmu…',
      url: state.finalUrl
    }).then(function () {
      announce('Berhasil dibagikan.');
    }).catch(function (err) {
      // User membatalkan share — bukan error, cukup diamkan
      if (err && err.name !== 'AbortError') {
        announce('Berbagi dibatalkan.');
      }
    });
  });

  /* ============================================================
   * CREATE ANOTHER
   * ============================================================ */
  els.createAnotherBtn.addEventListener('click', function () {
    els.form.reset();
    updateCounter(els.recipientName, els.nameCount, LIMITS.name);
    updateCounter(els.message, els.messageCount, LIMITS.message);
    hideGlobalAlert();
    hide(els.successSection);
    show(els.formSection);
    els.recipientName.focus();
  });

})();
</script>
</body>
</html>
```

5. **public/view.html**
```html
<!DOCTYPE html>
<html lang="id">
<head>
<!--
  ============================================================
  Romance Engine V1 — public/view.html (Romantic Experience)
  ============================================================
  Fitur yang diorkestrasikan halaman ini:
    F-002 Startup & fallback data (API -> ?data= base64 -> recovery)
    F-003 Gesture audio gateway ("Tap to Open My Heart")
    F-004 WebGL scene (didelegasikan ke assets/js/3d-hearts.js)
    F-005 Interaksi YES/NO (didelegasikan ke assets/js/interactive.js)
    F-006 YES celebration + love letter modal (typing aman)
    F-007 Real-time special day counter (interval tunggal)

  KONTRAK MODUL (wajib dipenuhi file lain — jangan diubah sepihak):
    window.RomanceAudio.init({ musicUrl, defaultBgmSrc, chimeSrc })
      -> { unlock(), toggleMute(), playChime(), isMuted, destroy() }
    window.RomanceScene.init(container, { reducedMotion })
      -> { start(), celebrate(), destroy() } | null
    window.RomanceInteractive.init({ yesButton, noButton,
      playground, reducedMotion, onYes })

  KEPUTUSAN KEAMANAN:
    - Seluruh konten user dirender via textContent, tidak pernah innerHTML.
    - photoUrl/musicUrl divalidasi ulang di client (http/https saja).
    - Base64 fallback di-decode UTF-8 secara aman (TextDecoder, non-fatal).
    - <meta robots noindex> : halaman berisi surat pribadi.

  LAPISAN Z (kontrak visual — dijaga oleh style.css):
    #scene-container / #css-hearts : 0
    .screen / experience           : 1
    #btn-sound                     : 30
    #letter-modal                  : 50
-->
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="dark">
<meta name="theme-color" content="#0D0208">
<meta name="robots" content="noindex, nofollow">
<title>Untukmu ♥ Romance Engine</title>
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%23FF5E94' d='M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z'/%3E%3C/svg%3E">

<!-- Desain lengkap ada di assets/css/style.css.
     Blok kritis ini hanya menjamin layout dasar tetap benar
     seandainya style.css gagal dimuat. -->
<link rel="stylesheet" href="assets/css/style.css">
<style>
  :root { color-scheme: dark; }
  html, body { margin: 0; padding: 0; }
  body {
    background: #0D0208;
    color: #FDF2F6;
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    min-height: 100vh;
    min-height: 100svh;
    overflow-x: hidden;
  }
  [hidden] { display: none !important; }
  #scene-container, #css-hearts { position: fixed; inset: 0; z-index: 0; pointer-events: none; }
  .screen {
    position: fixed; inset: 0; z-index: 1;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    text-align: center; padding: 1.5rem; box-sizing: border-box;
  }
  #screen-experience {
    position: relative; inset: auto; display: block;
    min-height: 100vh; min-height: 100svh;
  }
  #letter-modal { position: fixed; inset: 0; z-index: 50; }
  #btn-sound { position: fixed; top: 1rem; right: 1rem; z-index: 30; }
  body.modal-open { overflow: hidden; }
</style>
</head>

<body>

<!-- Lapisan visual: WebGL canvas (di-mount oleh 3d-hearts.js) -->
<div id="scene-container" aria-hidden="true"></div>

<!-- Lapisan visual fallback CSS — hanya terlihat saat body.webgl-off -->
<div id="css-hearts" class="css-hearts" aria-hidden="true">
  <span></span><span></span><span></span><span></span>
  <span></span><span></span><span></span><span></span>
</div>

<main id="konten-utama">

  <!-- ================= BOOT / LOADING ================= -->
  <section id="screen-boot" class="screen" aria-label="Memuat">
    <div class="boot-heart" aria-hidden="true">♥</div>
    <p class="boot-title">Menyiapkan kejutan…</p>
    <p class="boot-sub">Mohon tunggu sebentar. Jika terlalu lama, coba muat ulang halaman ini.</p>
  </section>

  <!-- ================= RECOVERY ================= -->
  <section id="screen-recovery" class="screen" hidden aria-labelledby="recovery-title">
    <div class="boot-heart" aria-hidden="true">♡</div>
    <h1 id="recovery-title" class="recovery-title">Surat ini belum bisa dibuka</h1>
    <p class="recovery-text">
      Tautan mungkin tidak lengkap, data tidak ditemukan, atau koneksi sedang tidak baik.
      Jangan khawatir — perasaan selalu bisa ditulis ulang.
    </p>
    <div class="recovery-actions">
      <a class="btn btn-primary" href="create.html">Buat Deklarasi Baru</a>
      <a class="btn btn-ghost" href="index.html">Kembali ke Beranda</a>
    </div>
  </section>

  <!-- ================= GATEWAY (F-003) ================= -->
  <section id="screen-gateway" class="screen" hidden aria-labelledby="gateway-label">
    <p class="gateway-eyebrow">Ada sesuatu untukmu</p>
    <p id="gateway-name" class="gateway-name"></p>
    <button id="gateway-button" class="gateway-button" type="button" aria-label="Buka pengalaman. Tap to Open My Heart">
      <span class="gateway-heart" aria-hidden="true">♥</span>
      <span id="gateway-label" class="gateway-label">Tap to Open My Heart</span>
    </button>
    <p class="gateway-hint">Gunakan earphone untuk pengalaman terbaik 🎧</p>
  </section>

  <!-- ================= EXPERIENCE ================= -->
  <section id="screen-experience" class="experience" hidden aria-label="Pengalaman romantis">

    <header class="re-hero">
      <p class="re-eyebrow">Sebuah pesan untukmu</p>
      <h1 class="re-title">Untuk <span id="experience-name"></span></h1>
      <p class="re-sub">Ada sesuatu yang ingin kusampaikan sejak lama…</p>
    </header>

    <!-- Foto kenangan (opsional — hanya tampil jika URL valid & berhasil dimuat) -->
    <figure id="photo-frame" class="re-photo" hidden>
      <img id="photo-img" alt="" loading="lazy" referrerpolicy="no-referrer">
      <figcaption class="re-photo-caption">Salah satu kenangan favorit kita</figcaption>
    </figure>

    <!-- F-007: Special day counter -->
    <section class="re-counter" aria-labelledby="counter-title">
      <h2 id="counter-title" class="re-section-title">Perjalanan Kita</h2>
      <p id="counter-label" class="counter-label">…</p>
      <div class="counter-grid" role="timer" aria-live="off">
        <div class="counter-cell">
          <span id="counter-days" class="counter-value">–</span>
          <span class="counter-unit">Hari</span>
        </div>
        <div class="counter-cell">
          <span id="counter-hours" class="counter-value">–</span>
          <span class="counter-unit">Jam</span>
        </div>
        <div class="counter-cell">
          <span id="counter-minutes" class="counter-value">–</span>
          <span class="counter-unit">Menit</span>
        </div>
        <div class="counter-cell">
          <span id="counter-seconds" class="counter-value">–</span>
          <span class="counter-unit">Detik</span>
        </div>
      </div>
    </section>

    <!-- F-005: Pertanyaan YES / NO -->
    <section class="re-question" aria-labelledby="question-heading">
      <h2 id="question-heading" class="re-question-title" tabindex="-1">
        Maukah kamu terus berjalan bersamaku?
      </h2>
      <p class="re-question-sub">Jawablah dengan jujur, dari hatimu.</p>
      <div id="no-playground" class="no-playground">
        <button id="btn-yes" class="btn btn-yes" type="button">Ya, Aku Mau ♥</button>
        <button id="btn-no" class="btn btn-no" type="button">Tidak</button>
      </div>
    </section>

    <footer class="re-footer">
      <a href="index.html">Romance Engine</a>
    </footer>
  </section>

</main>

<!-- Toggle musik (muncul jika audio tersedia) -->
<button id="btn-sound" class="sound-toggle" type="button" aria-pressed="false" hidden>
  <span id="sound-toggle-label">Musik: Nyala</span>
</button>

<!-- ================= F-006: LOVE LETTER MODAL ================= -->
<div id="letter-modal" role="dialog" aria-modal="true" aria-labelledby="letter-title" hidden>
  <div id="letter-backdrop" class="letter-backdrop"></div>
  <article id="letter-paper" class="letter-paper">
    <header class="letter-head">
      <h2 id="letter-title">Sebuah Surat Untukmu</h2>
      <button id="letter-close" class="letter-close" type="button" aria-label="Tutup surat">✕</button>
    </header>
    <div id="letter-body" class="letter-body"></div>
    <footer class="letter-sign">
      <p>Dengan seluruh cinta,</p>
      <p class="letter-from">— dari seseorang yang menyayangi <span id="letter-for"></span></p>
    </footer>
    <p id="letter-hint" class="letter-hint" hidden>Ketuk surat untuk menyelesaikan</p>
  </article>
</div>

<noscript>
  <div class="screen" style="position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#0D0208;color:#FDF2F6;z-index:99;">
    <p>Experience ini membutuhkan JavaScript. Aktifkan JavaScript di browser kamu, lalu muat ulang halaman.</p>
  </div>
</noscript>

<!-- ============ Dependency CDN (pinned; kegagalan tidak mematikan halaman) ============ -->
<script src="https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js"></script>

<!-- ============ Modul lokal (diimplementasikan terpisah sesuai kontrak) ============ -->
<script src="assets/js/audio-player.js"></script>
<script src="assets/js/3d-hearts.js"></script>
<script src="assets/js/interactive.js"></script>

<!-- ============ ORKESTRATOR VIEW ============ -->
<script>
(function () {
  'use strict';

  /* ---------------- Konfigurasi ---------------- */
  var API_BASE = 'https://romance-engine.azrielspace852.workers.dev';
  var FETCH_TIMEOUT_MS = 8000;
  var DEFAULT_BGM_SRC = 'assets/audio/default-bgm.mp3';
  var CHIME_SRC = 'assets/audio/success-chime.mp3';
  var LIMITS = { name: 100, message: 10000, date: 64, url: 2048, dataParam: 400000 };
  var TYPING_SPEED_MS = 18;

  var prefersReducedMotion = false;
  try {
    prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (err) { /* aman: animasi penuh tetap di-guard per-fitur */ }

  /* ---------------- Referensi DOM ---------------- */
  var els = {
    boot: document.getElementById('screen-boot'),
    gateway: document.getElementById('screen-gateway'),
    recovery: document.getElementById('screen-recovery'),
    experience: document.getElementById('screen-experience'),
    gatewayName: document.getElementById('gateway-name'),
    gatewayButton: document.getElementById('gateway-button'),
    experienceName: document.getElementById('experience-name'),
    photoFrame: document.getElementById('photo-frame'),
    photoImg: document.getElementById('photo-img'),
    counterLabel: document.getElementById('counter-label'),
    counterDays: document.getElementById('counter-days'),
    counterHours: document.getElementById('counter-hours'),
    counterMinutes: document.getElementById('counter-minutes'),
    counterSeconds: document.getElementById('counter-seconds'),
    questionHeading: document.getElementById('question-heading'),
    noPlayground: document.getElementById('no-playground'),
    yesButton: document.getElementById('btn-yes'),
    noButton: document.getElementById('btn-no'),
    soundToggle: document.getElementById('btn-sound'),
    soundToggleLabel: document.getElementById('sound-toggle-label'),
    sceneContainer: document.getElementById('scene-container'),
    letterModal: document.getElementById('letter-modal'),
    letterBackdrop: document.getElementById('letter-backdrop'),
    letterPaper: document.getElementById('letter-paper'),
    letterClose: document.getElementById('letter-close'),
    letterBody: document.getElementById('letter-body'),
    letterFor: document.getElementById('letter-for'),
    letterHint: document.getElementById('letter-hint')
  };

  var state = {
    payload: null,
    source: null,
    booted: false,
    revealed: false,
    celebrated: false,
    scene: null,
    sceneInitialized: false,
    audio: null,
    counterTimerId: null,
    counterTarget: null,
    typingTimerId: null,
    typingParagraphs: [],
    typingElements: [],
    lastFocused: null
  };

  /* ---------------- Util dasar ---------------- */
  function show(el) { if (el) el.hidden = false; }
  function hide(el) { if (el) el.hidden = true; }

  function showScreen(name) {
    hide(els.boot); hide(els.gateway); hide(els.recovery); hide(els.experience);
    if (name === 'boot') show(els.boot);
    else if (name === 'gateway') show(els.gateway);
    else if (name === 'recovery') show(els.recovery);
    else if (name === 'experience') show(els.experience);
  }

  /* ---------------- Validasi payload (defense in depth) ---------------- */
  function safeUrl(value) {
    if (typeof value !== 'string') return null;
    var candidate = value.trim();
    if (candidate.length === 0) return null;
    if (candidate.length > LIMITS.url) return null;
    try {
      var parsed = new URL(candidate);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
      return parsed.toString();
    } catch (err) {
      return null;
    }
  }

  function sanitizePayload(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

    var name = typeof raw.recipientName === 'string' ? raw.recipientName.trim() : '';
    var message = typeof raw.message === 'string' ? raw.message.trim() : '';
    var specialDate = typeof raw.specialDate === 'string' ? raw.specialDate.trim() : '';

    if (name.length === 0 || name.length > LIMITS.name) return null;
    if (message.length === 0 || message.length > LIMITS.message) return null;
    if (specialDate.length === 0 || specialDate.length > LIMITS.date) return null;

    return {
      id: typeof raw.id === 'string' ? raw.id.slice(0, 64) : '',
      recipientName: name,
      message: message,
      specialDate: specialDate,
      photoUrl: safeUrl(raw.photoUrl),
      musicUrl: safeUrl(raw.musicUrl),
      createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : '',
      version: typeof raw.version === 'number' ? raw.version : 1
    };
  }

  /* ---------------- F-002: pipeline data ---------------- */
  function fetchWithTimeout(url, ms) {
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, ms);
    return fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } })
      .finally(function () { clearTimeout(timer); });
  }

  async function loadFromApi(id) {
    var response = await fetchWithTimeout(API_BASE + '/api/get/' + encodeURIComponent(id), FETCH_TIMEOUT_MS);
    if (!response.ok) {
      throw new Error('API status ' + response.status);
    }
    var body = await response.json();
    if (!body || body.ok !== true || !body.data || !body.data.payload) {
      throw new Error('Struktur respons API tidak dikenal');
    }
    return body.data.payload;
  }

  function decodeBase64Utf8(input) {
    var base64 = String(input).replace(/-/g, '+').replace(/_/g, '/').trim();
    while (base64.length % 4 !== 0) base64 += '=';
    var binary = atob(base64);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  }

  async function resolvePayload() {
    var params;
    try {
      params = new URLSearchParams(window.location.search);
    } catch (err) {
      return null;
    }

    var id = params.get('id');
    var data = params.get('data');

    // 1) Sumber utama: API + KV
    if (id) {
      try {
        var apiPayload = await loadFromApi(id);
        var validApi = sanitizePayload(apiPayload);
        if (validApi) return { payload: validApi, source: 'api' };
      } catch (err) {
        console.warn('[RomanceEngine] API gagal, mencoba fallback base64.', err);
      }
    }

    // 2) Fallback: ?data=BASE64
    if (data && data.length <= LIMITS.dataParam) {
      try {
        var decoded = decodeBase64Utf8(data);
        var parsed = JSON.parse(decoded);
        var validFallback = sanitizePayload(parsed);
        if (validFallback) return { payload: validFallback, source: 'fallback' };
      } catch (err) {
        console.warn('[RomanceEngine] Fallback base64 tidak valid.', err);
      }
    }

    // 3) Semua sumber gagal -> recovery ditangani pemanggil
    return null;
  }

  /* ---------------- Render konten statis (XSS-safe) ---------------- */
  function renderStaticContent(payload) {
    var name = payload.recipientName;

    document.title = 'Untuk ' + name + ' ♥ Romance Engine';
    els.gatewayName.textContent = 'Untuk ' + name;
    els.experienceName.textContent = name;
    els.letterFor.textContent = name;
    els.photoImg.alt = 'Foto kenangan untuk ' + name;

    if (payload.photoUrl) {
      els.photoImg.addEventListener('load', function () { show(els.photoFrame); });
      els.photoImg.addEventListener('error', function () {
        hide(els.photoFrame);
        console.warn('[RomanceEngine] Foto tidak dapat dimuat; experience dilanjutkan tanpa foto.');
      });
      els.photoImg.src = payload.photoUrl;
    }
  }

  /* ---------------- F-007: special day counter (interval tunggal) ---------------- */
  function padTwo(n) { return n < 10 ? '0' + n : String(n); }

  function renderCounter() {
    var target = state.counterTarget;
    if (!target) {
      els.counterLabel.textContent = 'Tanggal spesial tidak dapat dibaca.';
      els.counterDays.textContent = '–';
      els.counterHours.textContent = '–';
      els.counterMinutes.textContent = '–';
      els.counterSeconds.textContent = '–';
      return;
    }
    var diff = Date.now() - target.getTime();
    var future = diff < 0;
    if (future) diff = -diff;

    var totalSeconds = Math.floor(diff / 1000);
    var days = Math.floor(totalSeconds / 86400);
    var hours = Math.floor((totalSeconds % 86400) / 3600);
    var minutes = Math.floor((totalSeconds % 3600) / 60);
    var seconds = totalSeconds % 60;

    els.counterLabel.textContent = future
      ? 'Menghitung hari menuju momen spesial kalian'
      : 'Kalian telah bersama selama';
    els.counterDays.textContent = String(days);
    els.counterHours.textContent = padTwo(hours);
    els.counterMinutes.textContent = padTwo(minutes);
    els.counterSeconds.textContent = padTwo(seconds);
  }

  function startCounter(specialDateStr) {
    if (state.counterTimerId !== null) return; // cegah interval ganda

    var parsed = new Date(specialDateStr);
    state.counterTarget = Number.isNaN(parsed.getTime()) ? null : parsed;

    renderCounter();

    if (state.counterTarget) {
      state.counterTimerId = window.setInterval(function () {
        if (document.hidden) return; // hemat resource saat tab tidak aktif
        renderCounter();
      }, 1000);
    }
  }

  /* ---------------- F-004: scene 3D + fallback CSS ---------------- */
  function enableCssBackground() {
    document.body.classList.add('webgl-off');
  }

  function initScene() {
    if (state.sceneInitialized) return;
    state.sceneInitialized = true;

    try {
      if (window.RomanceScene && typeof window.RomanceScene.init === 'function') {
        var controller = window.RomanceScene.init(els.sceneContainer, {
          reducedMotion: prefersReducedMotion
        });
        if (controller && typeof controller.start === 'function') {
          state.scene = controller;
          controller.start();
          return;
        }
      }
    } catch (err) {
      console.warn('[RomanceEngine] WebGL scene gagal; memakai fallback CSS.', err);
    }
    enableCssBackground();
  }

  /* ---------------- F-003: audio ---------------- */
  function initAudio() {
    try {
      if (window.RomanceAudio && typeof window.RomanceAudio.init === 'function') {
        state.audio = window.RomanceAudio.init({
          musicUrl: state.payload.musicUrl,
          defaultBgmSrc: DEFAULT_BGM_SRC,
          chimeSrc: CHIME_SRC
        });
        if (state.audio) {
          show(els.soundToggle);
          updateSoundToggleUI();
        }
      }
    } catch (err) {
      console.warn('[RomanceEngine] Audio tidak tersedia; experience dilanjutkan tanpa suara.', err);
      state.audio = null;
    }
  }

  function unlockAudio() {
    if (!state.audio || typeof state.audio.unlock !== 'function') return;
    try {
      state.audio.unlock();
    } catch (err) {
      console.warn('[RomanceEngine] Unlock audio gagal; experience dilanjutkan tanpa suara.', err);
    }
  }

  function updateSoundToggleUI() {
    if (!state.audio) return;
    var muted = !!state.audio.isMuted;
    els.soundToggle.setAttribute('aria-pressed', muted ? 'true' : 'false');
    els.soundToggleLabel.textContent = muted ? 'Musik: Mati' : 'Musik: Nyala';
  }

  /* ---------------- Gateway -> Experience ---------------- */
  function openExperience() {
    if (state.revealed) return;
    state.revealed = true;

    unlockAudio(); // harus dipanggil langsung di dalam user gesture

    var finish = function () {
      hide(els.gateway);
      show(els.experience);
      els.experience.classList.add('is-open');
      startCounter(state.payload.specialDate);
      initScene();
      initInteraction();
      try { els.questionHeading.focus({ preventScroll: true }); }
      catch (err) { els.questionHeading.focus(); }
    };

    var gsapReady = window.gsap && typeof window.gsap.to === 'function';
    if (gsapReady && !prefersReducedMotion) {
      try {
        window.gsap.to(els.gateway, {
          opacity: 0,
          scale: 1.04,
          duration: 0.8,
          ease: 'power2.inOut',
          onComplete: function () {
            try { window.gsap.set(els.gateway, { opacity: 1, scale: 1 }); } catch (e) {}
            finish();
          }
        });
        return;
      } catch (err) {
        console.warn('[RomanceEngine] Animasi GSAP gagal; memakai transisi CSS.', err);
      }
    }
    finish();
  }

  /* ---------------- F-005: interaksi ---------------- */
  function initInteraction() {
    try {
      if (window.RomanceInteractive && typeof window.RomanceInteractive.init === 'function') {
        window.RomanceInteractive.init({
          yesButton: els.yesButton,
          noButton: els.noButton,
          playground: els.noPlayground,
          reducedMotion: prefersReducedMotion,
          onYes: celebrateYes
        });
        return;
      }
    } catch (err) {
      console.warn('[RomanceEngine] Modul interaksi gagal; memakai handler dasar.', err);
    }
    // Fallback minimal: YES tetap berfungsi tanpa modul interaksi
    els.yesButton.addEventListener('click', celebrateYes);
  }

  /* ---------------- F-006: celebration ---------------- */
  function fireConfetti() {
    try {
      if (typeof window.confetti !== 'function') return;
      var colors = ['#FF8FB1', '#FF5E94', '#7DE8F5', '#FFF1F6'];
      var power = prefersReducedMotion ? 0.4 : 1;
      window.confetti({
        particleCount: Math.round(90 * power),
        spread: 75,
        origin: { x: 0.5, y: 0.6 },
        colors: colors,
        zIndex: 9999
      });
      window.setTimeout(function () {
        try {
          if (typeof window.confetti !== 'function') return;
          window.confetti({ particleCount: Math.round(50 * power), angle: 60, spread: 60, origin: { x: 0, y: 0.7 }, colors: colors, zIndex: 9999 });
          window.confetti({ particleCount: Math.round(50 * power), angle: 120, spread: 60, origin: { x: 1, y: 0.7 }, colors: colors, zIndex: 9999 });
        } catch (innerErr) {
          console.warn('[RomanceEngine] Confetti lanjutan dilewati.', innerErr);
        }
      }, 300);
    } catch (err) {
      console.warn('[RomanceEngine] Confetti dilewati.', err);
    }
  }

  function celebrateYes() {
    if (state.celebrated) return;
    state.celebrated = true;

    try {
      if (state.audio && typeof state.audio.playChime === 'function') state.audio.playChime();
    } catch (err) {
      console.warn('[RomanceEngine] Chime dilewati.', err);
    }

    fireConfetti();

    try {
      if (state.scene && typeof state.scene.celebrate === 'function') state.scene.celebrate();
    } catch (err) {
      console.warn('[RomanceEngine] Efek scene celebration dilewati.', err);
    }

    openLetterModal();
  }

  /* ---------------- Love letter + typing animation ---------------- */
  function stopTyping() {
    if (state.typingTimerId !== null) {
      window.clearInterval(state.typingTimerId);
      state.typingTimerId = null;
    }
  }

  function fillLetterInstantly() {
    stopTyping();
    state.typingParagraphs.forEach(function (text, idx) {
      var el = state.typingElements[idx];
      if (el) el.textContent = text; // textContent = XSS-safe
    });
    hide(els.letterHint);
  }

  function startTyping(message) {
    stopTyping();
    els.letterBody.textContent = '';
    state.typingElements = [];

    var paragraphs = String(message)
      .split(/\r?\n+/)
      .map(function (s) { return s.trim(); })
      .filter(function (s) { return s.length > 0; });

    state.typingParagraphs = paragraphs;

    paragraphs.forEach(function () {
      var el = document.createElement('p');
      els.letterBody.appendChild(el);
      state.typingElements.push(el);
    });

    if (prefersReducedMotion) { fillLetterInstantly(); return; }

    show(els.letterHint);
    var pIdx = 0;
    var cIdx = 0;
    state.typingTimerId = window.setInterval(function () {
      if (document.hidden) return;
      if (pIdx >= paragraphs.length) { fillLetterInstantly(); return; }
      cIdx += 1;
      var current = paragraphs[pIdx];
      state.typingElements[pIdx].textContent = current.slice(0, cIdx);
      if (cIdx >= current.length) { pIdx += 1; cIdx = 0; }
    }, TYPING_SPEED_MS);
  }

  function trapTabKey(event) {
    var focusables = els.letterModal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusables || focusables.length === 0) return;
    var first = focusables[0];
    var last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function onModalKeydown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeLetterModal();
      return;
    }
    if (event.key === 'Tab') trapTabKey(event);
  }

  function openLetterModal() {
    state.lastFocused = document.activeElement;
    show(els.letterModal);
    document.body.classList.add('modal-open');
    startTyping(state.payload.message);
    document.addEventListener('keydown', onModalKeydown);
    try { els.letterClose.focus({ preventScroll: true }); }
    catch (err) { els.letterClose.focus(); }
  }

  function closeLetterModal() {
    stopTyping();
    hide(els.letterModal);
    document.body.classList.remove('modal-open');
    document.removeEventListener('keydown', onModalKeydown);
    if (state.lastFocused && typeof state.lastFocused.focus === 'function') {
      try { state.lastFocused.focus({ preventScroll: true }); }
      catch (err) { state.lastFocused.focus(); }
    }
  }

  /* ---------------- Event binding (sekali, tidak terduplikasi) ---------------- */
  function bindEvents() {
    els.gatewayButton.addEventListener('click', openExperience);

    els.soundToggle.addEventListener('click', function () {
      if (!state.audio || typeof state.audio.toggleMute !== 'function') return;
      try {
        state.audio.toggleMute();
        updateSoundToggleUI();
      } catch (err) {
        console.warn('[RomanceEngine] Toggle audio gagal.', err);
      }
    });

    els.letterClose.addEventListener('click', function (event) {
      event.stopPropagation();
      closeLetterModal();
    });
    els.letterBackdrop.addEventListener('click', closeLetterModal);
    els.letterPaper.addEventListener('click', fillLetterInstantly);

    window.addEventListener('pagehide', function () {
      if (state.counterTimerId !== null) {
        window.clearInterval(state.counterTimerId);
        state.counterTimerId = null;
      }
      stopTyping();
      try { if (state.scene && typeof state.scene.destroy === 'function') state.scene.destroy(); } catch (e) {}
      try { if (state.audio && typeof state.audio.destroy === 'function') state.audio.destroy(); } catch (e) {}
    });
  }

  /* ---------------- Bootstrap ---------------- */
  async function init() {
    if (state.booted) return;
    state.booted = true;
    bindEvents();

    var result = await resolvePayload();

    if (!result) {
      showScreen('recovery');
      return;
    }

    state.payload = result.payload;
    state.source = result.source;

    renderStaticContent(result.payload);
    initAudio();
    showScreen('gateway');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { init(); });
  } else {
    init();
  }
})();
</script>
</body>
</html>
```

6. **public/assets/css/style.css**
```css
/* ============================================================
   Romance Engine V1 — assets/css/style.css
   ============================================================
   Stylesheet utama untuk create.html dan view.html.
   (index.html self-contained dengan style inline-nya sendiri.)

   KONTRAK VISUAL (dijaga ketat — jangan diubah sepihak):
     z-index 0  : #scene-container, #css-hearts
     z-index 1  : .screen, .experience
     z-index 30 : #btn-sound
     z-index 50 : #letter-modal
     body.webgl-off  -> menampilkan fallback #css-hearts
     body.modal-open -> overflow hidden saat modal terbuka

   PRINSIP (sesuai spesifikasi romance-engine.xml):
     - §17 Performance  : animasi hanya transform/opacity,
                          tidak memicu layout/reflow berlebihan.
     - §18 Responsive   : mobile-first, tanpa horizontal overflow,
                          safe-area mobile diperhatikan.
     - §19 Accessibility: focus-visible jelas, kontras cukup,
                          respect prefers-reduced-motion.
     - §20 Visual       : obsidian + deep crimson, glassmorphism,
                          soft glow cyan/pink, cinematic gradients.
     - §22 Degradation  : WebGL fallback visual via CSS tetap elegan.
   ============================================================ */

/* ================= 1. DESIGN TOKENS ================= */
:root {
  color-scheme: dark;

  /* Palet inti (§20) */
  --obsidian: #0D0208;
  --deep-crimson: #1A000C;
  --crimson-soft: #2A0516;
  --ink: #FDF2F6;
  --ink-dim: rgba(253, 242, 246, 0.74);
  --ink-faint: rgba(253, 242, 246, 0.5);
  --pink: #FF8FB1;
  --pink-strong: #FF5E94;
  --pink-deep: #F43F7F;
  --cyan: #7DE8F5;
  --success: #7DE8A5;
  --danger: #FF6B6B;

  /* Glassmorphism */
  --glass-bg: rgba(255, 255, 255, 0.05);
  --glass-bg-strong: rgba(255, 255, 255, 0.08);
  --glass-border: rgba(255, 255, 255, 0.12);
  --glass-border-strong: rgba(255, 255, 255, 0.2);

  /* Glow */
  --glow-pink: rgba(255, 94, 148, 0.35);
  --glow-cyan: rgba(125, 232, 245, 0.3);

  /* Radius */
  --radius-sm: 12px;
  --radius-md: 16px;
  --radius-lg: 22px;
  --radius-full: 999px;

  /* Tipografi — fallback sistem selalu tersedia jika CDN font gagal */
  --font-display: "Playfair Display", Georgia, "Times New Roman", serif;
  --font-body: "Manrope", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;

  /* Gradien sinematik */
  --gradient-accent: linear-gradient(100deg, #FFB3C9 0%, #FF5E94 50%, #8FE9F7 100%);
  --gradient-button: linear-gradient(135deg, #FFC1D4 0%, #FF5E94 55%, #FF8FD0 100%);
  --gradient-page:
    radial-gradient(1100px 700px at 82% -8%, rgba(244, 63, 127, 0.14), transparent 62%),
    radial-gradient(800px 600px at 4% 14%, rgba(125, 232, 245, 0.07), transparent 58%),
    radial-gradient(900px 700px at 50% 118%, rgba(122, 16, 62, 0.42), transparent 62%);

  /* Durasi animasi */
  --ease-smooth: cubic-bezier(0.22, 0.61, 0.36, 1);
  --dur-fast: 0.2s;
  --dur-med: 0.4s;
}

/* ================= 2. BASE & RESET ================= */
*,
*::before,
*::after { box-sizing: border-box; }

html {
  scroll-behavior: smooth;
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
}

body {
  margin: 0;
  font-family: var(--font-body);
  font-size: 1rem;
  line-height: 1.65;
  color: var(--ink);
  background-color: var(--obsidian);
  background-image: var(--gradient-page);
  background-attachment: fixed;
  overflow-x: hidden;
  min-height: 100vh;
  min-height: 100svh;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

img, svg, video { display: block; max-width: 100%; }
figure { margin: 0; }
ul, ol { margin: 0; }
h1, h2, h3, h4, p { margin: 0; }

::selection { background: rgba(255, 94, 148, 0.45); color: #fff; }

[hidden] { display: none !important; }

main:focus { outline: none; }

/* Scrollbar halus untuk modal & area scroll */
.letter-body::-webkit-scrollbar { width: 8px; }
.letter-body::-webkit-scrollbar-track { background: transparent; }
.letter-body::-webkit-scrollbar-thumb {
  background: rgba(255, 143, 177, 0.3);
  border-radius: 4px;
}

/* ================= 3. ACCESSIBILITY ================= */
.skip-link {
  position: absolute;
  left: 1rem;
  top: -3.5rem;
  z-index: 100;
  background: var(--deep-crimson);
  color: var(--ink);
  padding: 0.65rem 1.1rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--glass-border);
  text-decoration: none;
  font-weight: 600;
  transition: top var(--dur-fast) ease;
}
.skip-link:focus { top: 1rem; }

a:focus-visible,
button:focus-visible,
input:focus-visible,
textarea:focus-visible,
select:focus-visible,
[tabindex]:focus-visible {
  outline: 2px solid var(--cyan);
  outline-offset: 3px;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* ================= 4. TYPOGRAPHY & UTILITIES ================= */
.container {
  width: min(1080px, 100% - 2.5rem);
  margin-inline: auto;
}

.eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.45rem 1.05rem;
  border-radius: var(--radius-full);
  border: 1px solid rgba(125, 232, 245, 0.3);
  background: rgba(125, 232, 245, 0.06);
  color: var(--cyan);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.22em;
  text-transform: uppercase;
}

.gradient-text {
  background: var(--gradient-accent);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
}

.glass {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  -webkit-backdrop-filter: blur(14px);
  backdrop-filter: blur(14px);
}

/* ================= 5. BUTTONS ================= */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  min-height: 48px; /* target sentuh yang nyaman (§18) */
  padding: 0.9rem 1.7rem;
  border-radius: var(--radius-full);
  border: none;
  font-family: var(--font-body);
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.2;
  text-decoration: none;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: transform var(--dur-med) var(--ease-smooth),
              box-shadow var(--dur-med) var(--ease-smooth),
              background-color var(--dur-med) var(--ease-smooth),
              border-color var(--dur-med) var(--ease-smooth),
              opacity var(--dur-fast) ease;
}
.btn svg { width: 18px; height: 18px; flex: none; }

.btn-primary {
  color: #33061A;
  background: var(--gradient-button);
  box-shadow: 0 10px 34px var(--glow-pink), inset 0 0 0 1px rgba(255, 255, 255, 0.35);
}
.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 16px 46px rgba(255, 94, 148, 0.48), inset 0 0 0 1px rgba(255, 255, 255, 0.45);
}
.btn-primary:active { transform: translateY(0); }

.btn-ghost {
  color: var(--ink);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
}
.btn-ghost:hover {
  transform: translateY(-2px);
  border-color: rgba(255, 143, 177, 0.5);
  background: rgba(255, 143, 177, 0.09);
}

.btn-sm { min-height: 44px; padding: 0.6rem 1.25rem; font-size: 0.92rem; }

.btn:disabled,
.btn[aria-disabled="true"] {
  opacity: 0.55;
  cursor: not-allowed;
  pointer-events: none;
}

/* Tombol YES — primary action yang menonjol (§13) */
.btn-yes {
  color: #33061A;
  background: var(--gradient-button);
  box-shadow: 0 12px 40px var(--glow-pink), inset 0 0 0 1px rgba(255, 255, 255, 0.4);
  font-size: 1.15rem;
  padding: 1.1rem 2.4rem;
  min-height: 56px;
}
.btn-yes:hover {
  transform: translateY(-3px) scale(1.02);
  box-shadow: 0 20px 60px rgba(255, 94, 148, 0.55), inset 0 0 0 1px rgba(255, 255, 255, 0.5);
}

/* Tombol NO — playful, posisi diatur oleh interactive.js (§13) */
.btn-no {
  color: var(--ink-dim);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  font-size: 0.95rem;
  padding: 0.7rem 1.5rem;
  min-height: 44px;
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
}
.btn-no:hover { color: var(--ink); border-color: var(--glass-border-strong); }

/* ================= 6. HEADER & BRAND (create page) ================= */
.site-header {
  position: sticky;
  top: 0;
  z-index: 20;
  padding: 1rem 0;
  background: rgba(13, 2, 8, 0.6);
  -webkit-backdrop-filter: blur(16px);
  backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}
.brand {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1.18rem;
  color: var(--ink);
  text-decoration: none;
}
.brand svg {
  width: 22px;
  height: 22px;
  color: var(--pink-strong);
  filter: drop-shadow(0 0 10px var(--glow-pink));
}

/* ================= 7. CREATE PAGE — FORM (§8) ================= */
.create-page {
  padding: 3rem 0 5rem;
}
.create-head {
  max-width: 640px;
  margin: 0 auto 2.5rem;
  text-align: center;
  display: grid;
  gap: 0.9rem;
  justify-items: center;
}
.create-head h1 {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: clamp(1.9rem, 3vw + 0.9rem, 2.8rem);
  line-height: 1.15;
  text-wrap: balance;
}
.create-head p { color: var(--ink-dim); }

.form-card {
  max-width: 640px;
  margin: 0 auto;
  padding: clamp(1.5rem, 4vw, 2.5rem);
  display: grid;
  gap: 1.5rem;
  position: relative;
}
.form-card::before {
  content: "";
  position: absolute;
  inset: 0 0 auto 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
}

.field { display: grid; gap: 0.5rem; }
.field label {
  font-weight: 600;
  font-size: 0.95rem;
  color: var(--ink);
}
.field .label-hint {
  display: block;
  font-weight: 400;
  font-size: 0.82rem;
  color: var(--ink-faint);
  margin-top: 0.15rem;
}

.field input[type="text"],
.field input[type="url"],
.field input[type="date"],
.field input[type="datetime-local"],
.field textarea {
  width: 100%;
  padding: 0.85rem 1rem;
  min-height: 48px;
  font-family: var(--font-body);
  font-size: 1rem;
  color: var(--ink);
  background: rgba(13, 2, 8, 0.5);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  transition: border-color var(--dur-fast) ease, box-shadow var(--dur-fast) ease;
  -webkit-appearance: none;
  appearance: none;
}
.field textarea {
  min-height: 160px;
  resize: vertical;
  line-height: 1.6;
}
.field input::placeholder,
.field textarea::placeholder { color: var(--ink-faint); }

.field input:focus,
.field textarea:focus {
  border-color: var(--pink-strong);
  box-shadow: 0 0 0 3px rgba(255, 94, 148, 0.2);
  outline: none;
}

.field.has-error input,
.field.has-error textarea {
  border-color: var(--danger);
  box-shadow: 0 0 0 3px rgba(255, 107, 107, 0.15);
}

.field-error {
  display: none;
  font-size: 0.85rem;
  color: var(--danger);
  line-height: 1.4;
}
.field.has-error .field-error { display: block; }

.char-count {
  font-size: 0.78rem;
  color: var(--ink-faint);
  text-align: right;
}

.form-actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

/* Alert status (sukses/gagal kirim) */
.form-alert {
  display: none;
  padding: 0.9rem 1.1rem;
  border-radius: var(--radius-md);
  font-size: 0.95rem;
  line-height: 1.5;
}
.form-alert.is-visible { display: block; }
.form-alert--error {
  background: rgba(255, 107, 107, 0.12);
  border: 1px solid rgba(255, 107, 107, 0.35);
  color: #FFB3B3;
}
.form-alert--success {
  background: rgba(125, 232, 165, 0.1);
  border: 1px solid rgba(125, 232, 165, 0.35);
  color: var(--success);
}

/* Panel hasil: URL deklarasi yang siap dibagikan */
.result-panel {
  max-width: 640px;
  margin: 0 auto;
  padding: clamp(1.5rem, 4vw, 2.5rem);
  text-align: center;
  display: grid;
  gap: 1.4rem;
  justify-items: center;
}
.result-panel h2 {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: clamp(1.5rem, 2.5vw + 0.8rem, 2.1rem);
}
.result-panel .result-desc { color: var(--ink-dim); }

.url-box {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  padding: 0.7rem 0.7rem 0.7rem 1rem;
  background: rgba(13, 2, 8, 0.6);
  border: 1px solid var(--glass-border-strong);
  border-radius: var(--radius-md);
}
.url-box input {
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  color: var(--cyan);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.85rem;
}
.url-box input:focus { outline: none; }

.result-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.9rem;
}

/* Spinner loading pada tombol submit */
.btn .spinner {
  display: none;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(51, 6, 26, 0.3);
  border-top-color: #33061A;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
.btn.is-loading .spinner { display: inline-block; }
.btn.is-loading .btn-label { opacity: 0.7; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ================= 8. VIEW — SCREENS (F-002) ================= */
.screen {
  background: transparent;
  gap: 1rem;
}

/* --- Boot / loading --- */
#screen-boot { background: radial-gradient(80% 80% at 50% 40%, rgba(122, 16, 62, 0.25), transparent 70%); }

.boot-heart {
  font-size: 3rem;
  color: var(--pink-strong);
  text-shadow: 0 0 30px var(--glow-pink);
  animation: pulse 1.6s ease-in-out infinite;
}
.boot-title {
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 700;
}
.boot-sub {
  color: var(--ink-dim);
  max-width: 320px;
  font-size: 0.95rem;
}

/* --- Recovery state --- */
#screen-recovery { background: radial-gradient(80% 80% at 50% 40%, rgba(122, 16, 62, 0.2), transparent 70%); }
.recovery-title {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: clamp(1.5rem, 2.5vw + 0.8rem, 2rem);
}
.recovery-text {
  color: var(--ink-dim);
  max-width: 420px;
  line-height: 1.7;
}
.recovery-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.9rem;
  margin-top: 0.5rem;
}

/* --- Gateway (F-003) --- */
#screen-gateway {
  background:
    radial-gradient(90% 70% at 50% 100%, rgba(122, 16, 62, 0.5), transparent 60%),
    radial-gradient(60% 50% at 50% 0%, rgba(255, 94, 148, 0.12), transparent 65%);
}

.gateway-eyebrow {
  color: var(--cyan);
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.28em;
  text-transform: uppercase;
}
.gateway-name {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: clamp(1.8rem, 3.5vw + 1rem, 3rem);
  margin-bottom: 1rem;
  text-wrap: balance;
}

.gateway-button {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 0.9rem;
  padding: 2rem 2.5rem;
  background: var(--glass-bg-strong);
  border: 1px solid rgba(255, 143, 177, 0.4);
  border-radius: var(--radius-lg);
  color: var(--ink);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  -webkit-backdrop-filter: blur(16px);
  backdrop-filter: blur(16px);
  box-shadow: 0 0 50px rgba(255, 94, 148, 0.2), inset 0 0 0 1px rgba(255, 255, 255, 0.08);
  transition: transform var(--dur-med) var(--ease-smooth),
              box-shadow var(--dur-med) var(--ease-smooth),
              border-color var(--dur-med) var(--ease-smooth);
}
.gateway-button:hover {
  transform: translateY(-4px) scale(1.02);
  box-shadow: 0 0 80px rgba(255, 94, 148, 0.35), inset 0 0 0 1px rgba(255, 255, 255, 0.15);
  border-color: var(--pink-strong);
}
.gateway-heart {
  font-size: 2.6rem;
  color: var(--pink-strong);
  text-shadow: 0 0 30px var(--glow-pink);
  animation: pulse 1.8s ease-in-out infinite;
}
.gateway-label {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 1.2rem;
  letter-spacing: 0.04em;
}
.gateway-hint {
  margin-top: 1.2rem;
  color: var(--ink-faint);
  font-size: 0.85rem;
  letter-spacing: 0.04em;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.18); opacity: 0.85; }
}

/* ================= 9. VIEW — EXPERIENCE ================= */
.experience {
  display: flex;
  flex-direction: column;
  gap: clamp(3rem, 6vw, 4.5rem);
  padding: clamp(3rem, 6vw, 4.5rem) 1.25rem;
  padding-bottom: calc(clamp(3rem, 6vw, 4.5rem) + env(safe-area-inset-bottom, 0px));
  max-width: 760px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
}

.re-hero { text-align: center; display: grid; gap: 0.9rem; }
.re-eyebrow {
  color: var(--cyan);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.3em;
  text-transform: uppercase;
}
.re-title {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: clamp(2rem, 4vw + 1rem, 3.4rem);
  line-height: 1.12;
  text-wrap: balance;
}
.re-title span { color: var(--pink-strong); }
.re-sub { color: var(--ink-dim); font-size: 1.05rem; }

/* Foto kenangan */
.re-photo {
  margin: 0 auto;
  max-width: 560px;
  width: 100%;
  border-radius: var(--radius-lg);
  overflow: hidden;
  border: 1px solid var(--glass-border-strong);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(255, 94, 148, 0.12);
}
.re-photo img {
  width: 100%;
  height: auto;
  object-fit: cover;
}
.re-photo-caption {
  padding: 0.8rem 1rem;
  text-align: center;
  font-size: 0.88rem;
  color: var(--ink-dim);
  background: rgba(13, 2, 8, 0.7);
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
}

/* ================= 10. SPECIAL DAY COUNTER (F-007) ================= */
.re-counter {
  text-align: center;
  padding: clamp(1.8rem, 4vw, 2.5rem) 1.5rem;
  border-radius: var(--radius-lg);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  -webkit-backdrop-filter: blur(14px);
  backdrop-filter: blur(14px);
  position: relative;
}
.re-counter::before {
  content: "";
  position: absolute;
  inset: 0 0 auto 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.25), transparent);
}

.re-section-title {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: clamp(1.4rem, 2vw + 0.8rem, 1.9rem);
  margin-bottom: 0.5rem;
}
.counter-label {
  color: var(--ink-dim);
  font-size: 0.95rem;
  margin-bottom: 1.5rem;
}

.counter-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.75rem;
}
.counter-cell {
  display: grid;
  gap: 0.3rem;
  padding: 1rem 0.5rem;
  background: rgba(13, 2, 8, 0.5);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
}
.counter-value {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: clamp(1.4rem, 3vw + 0.6rem, 2.4rem);
  color: var(--pink);
  font-variant-numeric: tabular-nums;
  text-shadow: 0 0 20px var(--glow-pink);
}
.counter-unit {
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ink-faint);
}

@media (max-width: 420px) {
  .counter-grid { grid-template-columns: repeat(2, 1fr); }
}

/* ================= 11. YES / NO (F-005) ================= */
.re-question {
  text-align: center;
  display: grid;
  gap: 0.9rem;
}
.re-question-title {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: clamp(1.6rem, 2.5vw + 0.9rem, 2.4rem);
  text-wrap: balance;
}
.re-question-sub { color: var(--ink-dim); }

/* Playground: container relatif tempat tombol NO dapat berpindah (§13) */
.no-playground {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-top: 1.5rem;
  min-height: 120px;
  /* Batas aman agar teleport NO tidak keluar area (§13) */
  overflow: visible;
}
.no-playground .btn-no {
  /* interactive.js dapat override posisi via transform/absolute.
     Nilai awal tetap inline flow agar layout tidak overflow permanen. */
  position: relative;
  will-change: transform;
}

/* ================= 12. FOOTER EXPERIENCE ================= */
.re-footer {
  text-align: center;
  padding-top: 1rem;
}
.re-footer a {
  color: var(--ink-faint);
  font-size: 0.85rem;
  text-decoration: none;
  transition: color var(--dur-fast) ease;
}
.re-footer a:hover { color: var(--pink); }

/* ================= 13. SOUND TOGGLE ================= */
.sound-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1.1rem;
  min-height: 44px;
  background: var(--glass-bg-strong);
  border: 1px solid var(--glass-border-strong);
  border-radius: var(--radius-full);
  color: var(--ink);
  font-family: var(--font-body);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
  transition: border-color var(--dur-fast) ease, background-color var(--dur-fast) ease;
  /* posisi fixed diatur inline di view.html (top:1rem; right:1rem; z:30) */
}
.sound-toggle:hover {
  border-color: rgba(255, 143, 177, 0.5);
  background: rgba(255, 143, 177, 0.1);
}

/* ================= 14. LOVE LETTER MODAL (F-006) ================= */
#letter-modal {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  /* inset & z diatur inline di view.html */
}
#letter-modal[hidden] { display: none; }

.letter-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(13, 2, 8, 0.75);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
}

.letter-paper {
  position: relative;
  width: min(560px, 100%);
  max-height: min(85vh, 85svh);
  display: flex;
  flex-direction: column;
  padding: clamp(1.5rem, 4vw, 2.5rem);
  background: linear-gradient(160deg, rgba(42, 5, 22, 0.92), rgba(13, 2, 8, 0.95));
  border: 1px solid rgba(255, 143, 177, 0.35);
  border-radius: var(--radius-lg);
  box-shadow: 0 30px 90px rgba(0, 0, 0, 0.6), 0 0 60px rgba(255, 94, 148, 0.18);
  -webkit-backdrop-filter: blur(20px);
  backdrop-filter: blur(20px);
  animation: letter-in 0.5s var(--ease-smooth) both;
}
@keyframes letter-in {
  from { opacity: 0; transform: translateY(24px) scale(0.97); }
  to { opacity: 1; transform: none; }
}

.letter-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}
.letter-title {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: clamp(1.3rem, 2vw + 0.7rem, 1.8rem);
}
.letter-close {
  flex: none;
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-full);
  color: var(--ink-dim);
  font-size: 1.1rem;
  cursor: pointer;
  transition: color var(--dur-fast) ease, border-color var(--dur-fast) ease;
}
.letter-close:hover { color: var(--ink); border-color: var(--pink-strong); }

.letter-body {
  overflow-y: auto;
  padding-right: 0.5rem;
  display: grid;
  gap: 1rem;
  font-size: 1.02rem;
  line-height: 1.8;
  color: var(--ink);
  flex: 1;
}
.letter-body p { margin: 0; }

.letter-sign {
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  text-align: right;
  color: var(--ink-dim);
}
.letter-from {
  font-family: var(--font-display);
  font-weight: 600;
  color: var(--pink);
  margin-top: 0.3rem;
}
.letter-hint {
  margin-top: 1rem;
  text-align: center;
  font-size: 0.8rem;
  color: var(--ink-faint);
  letter-spacing: 0.06em;
}

/* ================= 15. CSS HEARTS FALLBACK (F-004 degradation) ================= */
/* Tersembunyi secara default; hanya tampil saat body.webgl-off */
.css-hearts {
  display: none;
  overflow: hidden;
}
body.webgl-off .css-hearts { display: block; }

.css-hearts span {
  position: absolute;
  bottom: -10%;
  width: 18px;
  height: 18px;
  color: var(--pink-strong);
  opacity: 0;
  animation: heart-rise 14s linear infinite;
}
.css-hearts span::before {
  content: "♥";
  font-size: inherit;
  text-shadow: 0 0 12px var(--glow-pink);
}
.css-hearts span:nth-child(1) { left: 6%;  font-size: 16px; animation-duration: 15s; animation-delay: -2s; }
.css-hearts span:nth-child(2) { left: 18%; font-size: 12px; animation-duration: 12s; animation-delay: -6s; }
.css-hearts span:nth-child(3) { left: 32%; font-size: 22px; animation-duration: 18s; animation-delay: -10s; }
.css-hearts span:nth-child(4) { left: 47%; font-size: 14px; animation-duration: 13s; animation-delay: -1s; }
.css-hearts span:nth-child(5) { left: 61%; font-size: 20px; animation-duration: 16s; animation-delay: -8s; }
.css-hearts span:nth-child(6) { left: 74%; font-size: 13px; animation-duration: 12.5s; animation-delay: -11s; }
.css-hearts span:nth-child(7) { left: 86%; font-size: 24px; animation-duration: 17s; animation-delay: -4s; }
.css-hearts span:nth-child(8) { left: 94%; font-size: 15px; animation-duration: 14s; animation-delay: -13s; }

@keyframes heart-rise {
  0%   { transform: translateY(0) rotate(-6deg); opacity: 0; }
  10%  { opacity: 0.5; }
  88%  { opacity: 0.5; }
  100% { transform: translateY(-108vh) rotate(10deg); opacity: 0; }
}

/* ================= 16. BODY STATES ================= */
body.modal-open { overflow: hidden; }

/* ================= 17. RESPONSIVE (§18) ================= */
@media (max-width: 640px) {
  .experience { padding-left: 1rem; padding-right: 1rem; }
  .gateway-button { padding: 1.6rem 2rem; }
  .letter-paper {
    max-height: min(90vh, 90svh);
    border-radius: var(--radius-md);
  }
  .btn-yes { font-size: 1.05rem; padding: 1rem 2rem; }
  .result-actions { flex-direction: column; width: 100%; }
  .result-actions .btn { width: 100%; }
}

@media (min-width: 768px) {
  .form-actions { flex-direction: row; justify-content: center; }
}

/* ================= 18. REDUCED MOTION (§22) ================= */
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
  .css-hearts { display: none !important; }
  .boot-heart, .gateway-heart { animation: none !important; }
}
```

7. **public/assets/js/3d-hearts.js**
```javascript
/**
 * ============================================================
 * Romance Engine V1 — assets/js/3d-hearts.js
 * Modul F-004: WebGL 3D Particle Scene (Three.js)
 * ============================================================
 *
 * KONTRAK PUBLIK (dipakai oleh view.html — jangan diubah sepihak):
 *   window.RomanceScene.init(container, { reducedMotion })
 *     -> { start(), celebrate(), destroy() }  jika WebGL tersedia
 *     -> null                                 jika WebGL gagal/tidak ada
 *        (view.html kemudian mengaktifkan fallback CSS via body.webgl-off)
 *
 * KEPUTUSAN TEKNIS TERDOKUMENTASI (NN-007):
 *  1. devicePixelRatio dibatasi maksimal 2 (spesifikasi §12/§17).
 *  2. Jumlah objek dibedakan untuk device mobile vs desktop
 *     agar GPU mobile tidak terbebani.
 *  3. Animation loop dihentikan total saat tab hidden
 *     (visibilitychange), bukan sekadar throttle.
 *  4. `webglcontextlost` ditangani: loop dihentikan, scene dibersihkan,
 *     dan fallback CSS diaktifkan — experience tidak berhenti.
 *  5. prefers-reduced-motion: scene dirender sebagai satu frame statis
 *     (tanpa loop). celebrate() pada mode ini hanya menaikkan intensitas
 *     cahaya lalu merender ulang satu frame — tanpa animasi berjalan.
 *  6. Renderer memakai alpha=true sehingga gradien obsidian dari CSS
 *     body tetap terlihat menembus canvas (konsisten palet §20).
 *  7. PointLight menggunakan decay=0 agar intensitas deterministik
 *     pada Three.js r150+ (legacy lights tidak dipakai).
 *  8. Hero heart + seluruh floating objects memakai geometry bersama
 *     (shared) untuk meminimalkan memory & draw call.
 */
(function () {
  'use strict';

  /* ==================== KONFIGURASI ==================== */

  var CELEBRATE_DURATION_SECONDS = 3.5;
  var MAX_DELTA_SECONDS = 0.05; // clamp delta agar tidak lompat setelah tab hidden
  var MAX_PIXEL_RATIO = 2;

  var COLORS = Object.freeze({
    fog: 0x0D0208,
    ambient: 0xFF8FB1,
    keyLight: 0xFFF1F6,
    pinkGlow: 0xFF5E94,
    cyanGlow: 0x7DE8F5,
    heroHeart: 0xFF5E94,
    heroEmissive: 0x7A0D35,
    hearts: [0xFF8FB1, 0xFF5E94, 0xF43F7F, 0x7DE8F5],
    petal: 0xFFB3C9,
    petalEmissive: 0x531026,
    stars: ['#FFB3C9', '#FF5E94', '#7DE8F5', '#FFF1F6']
  });

  /* ==================== UTILITAS ==================== */

  function isWebGLAvailable() {
    try {
      var canvas = document.createElement('canvas');
      return Boolean(
        window.WebGLRenderingContext &&
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
      );
    } catch (err) {
      return false;
    }
  }

  function randomBetween(min, max) {
    return min + Math.random() * (max - min);
  }

  function pick(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  /** Membungkus nilai agar tetap berada di antara min..max (untuk loop jatuh kelopak). */
  function wrapRange(value, min, max) {
    var span = max - min;
    return min + (((value - min) % span) + span) % span;
  }

  function detectLowPowerDevice() {
    try {
      return window.matchMedia('(max-width: 768px), (pointer: coarse)').matches;
    } catch (err) {
      return false; // aman: gunakan profil desktop
    }
  }

  /* ==================== FACTORY GEOMETRY ==================== */

  /**
   * Bentuk hati klasik (pola resmi three.js examples), dinormalisasi
   * sehingga tingginya = 1 satuan world. Semua heart berbagi geometry ini.
   */
  function createUnitHeartGeometry() {
    var shape = new THREE.Shape();
    var x = 0;
    var y = 0;

    shape.moveTo(x + 5, y + 5);
    shape.bezierCurveTo(x + 5, y + 5, x + 4, y, x, y);
    shape.bezierCurveTo(x - 6, y, x - 6, y + 7, x - 6, y + 7);
    shape.bezierCurveTo(x - 6, y + 11, x - 3, y + 15.4, x + 5, y + 19);
    shape.bezierCurveTo(x + 12, y + 15.4, x + 16, y + 11, x + 16, y + 7);
    shape.bezierCurveTo(x + 16, y + 7, x + 16, y, x + 10, y);
    shape.bezierCurveTo(x + 7, y, x + 5, y + 5, x + 5, y + 5);

    var geometry = new THREE.ExtrudeGeometry(shape, {
      depth: 4,
      bevelEnabled: true,
      bevelThickness: 2,
      bevelSize: 2,
      bevelSegments: 2,
      curveSegments: 10
    });

    geometry.center();
    geometry.computeBoundingBox();
    var height = geometry.boundingBox.max.y - geometry.boundingBox.min.y;
    if (height > 0) {
      var scale = 1 / height;
      geometry.scale(scale, scale, scale);
    }
    return geometry;
  }

  /** Kelopak sederhana (dua kurva kuadratik), tinggi ~1 satuan. */
  function createPetalGeometry() {
    var shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.quadraticCurveTo(0.38, 0.28, 0, 0.95);
    shape.quadraticCurveTo(-0.38, 0.28, 0, 0);

    var geometry = new THREE.ShapeGeometry(shape, 6);
    geometry.center();
    return geometry;
  }

  /** Bintang sebagai Points dengan warna acak dari palet cyan/pink. */
  function createStarField(count) {
    var positions = new Float32Array(count * 3);
    var colors = new Float32Array(count * 3);
    var color = new THREE.Color();

    for (var i = 0; i < count; i += 1) {
      // Sebaran spherical shell agar bintang mengelilingi scene.
      var radius = randomBetween(6, 24);
      var theta = Math.random() * Math.PI * 2;
      var phi = Math.acos(randomBetween(-1, 1));

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      color.set(pick(COLORS.stars));
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    var geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    var material = new THREE.PointsMaterial({
      size: 0.14,
      transparent: true,
      opacity: 0.85,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    return new THREE.Points(geometry, material);
  }

  /* ==================== ENTRY POINT ==================== */

  /**
   * Inisialisasi scene. Return controller, atau null jika WebGL
   * tidak tersedia — view.html menangani fallback CSS.
   * Tidak pernah melempar exception keluar.
   */
  function init(container, options) {
    if (!container || typeof THREE === 'undefined' || !isWebGLAvailable()) {
      return null;
    }

    try {
      return createSceneController(container, options);
    } catch (err) {
      console.warn('[RomanceScene] Inisialisasi WebGL gagal; fallback CSS akan dipakai.', err);
      return null;
    }
  }

  function createSceneController(container, options) {
    /* ---------- State ---------- */
    var reducedMotion = Boolean(options && options.reducedMotion);
    var lowPower = detectLowPowerDevice();

    var counts = lowPower
      ? { hearts: 10, petals: 14, stars: 320 }
      : { hearts: 18, petals: 24, stars: 650 };

    var renderer = null;
    var scene = null;
    var camera = null;
    var clock = null;

    var heroHeart = null;
    var heartGroup = null;
    var petalGroup = null;
    var starField = null;
    var pinkLight = null;
    var cyanLight = null;

    var floatingHearts = [];
    var fallingPetals = [];

    var rafId = null;
    var running = false;
    var started = false;
    var destroyed = false;
    var elapsed = 0;
    var celebrateUntil = -1;
    var staticCelebrate = false; // untuk mode reduced-motion

    /* ---------- Renderer & scene dasar ---------- */

    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: !lowPower,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.domElement.style.display = 'block';
    container.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(COLORS.fog, 14, 34);

    camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      60
    );
    camera.position.set(0, 0.4, 13);
    camera.lookAt(0, 0.2, 0);

    clock = new THREE.Clock(false);

    /* ---------- Cahaya (sinematik, glow cyan/pink) ---------- */

    scene.add(new THREE.AmbientLight(COLORS.ambient, 0.5));

    var keyLight = new THREE.DirectionalLight(COLORS.keyLight, 1.1);
    keyLight.position.set(5, 8, 6);
    scene.add(keyLight);

    // decay=0: intensitas konstan & deterministik pada Three.js r150+.
    pinkLight = new THREE.PointLight(COLORS.pinkGlow, 2.6, 0, 0);
    pinkLight.position.set(0, 1.5, 4);
    scene.add(pinkLight);

    cyanLight = new THREE.PointLight(COLORS.cyanGlow, 1.6, 0, 0);
    cyanLight.position.set(-5, -2, 3);
    scene.add(cyanLight);

    /* ---------- Objek: hero heart + hati kecil ---------- */

    var heartGeometry = createUnitHeartGeometry();

    var heroMaterial = new THREE.MeshPhysicalMaterial({
      color: COLORS.heroHeart,
      emissive: COLORS.heroEmissive,
      emissiveIntensity: 0.6,
      metalness: 0.1,
      roughness: 0.18,
      clearcoat: 1,
      clearcoatRoughness: 0.25,
      transparent: true,
      opacity: 0.84
    });

    var HERO_BASE_SCALE = 2.3;
    heroHeart = new THREE.Mesh(heartGeometry, heroMaterial);
    heroHeart.scale.set(HERO_BASE_SCALE, HERO_BASE_SCALE, HERO_BASE_SCALE);
    scene.add(heroHeart);

    heartGroup = new THREE.Group();
    var heartMaterials = COLORS.hearts.map(function (hex) {
      return new THREE.MeshStandardMaterial({
        color: hex,
        emissive: hex,
        emissiveIntensity: 0.25,
        metalness: 0.15,
        roughness: 0.35,
        transparent: true,
        opacity: 0.78
      });
    });

    for (var hi = 0; hi < counts.hearts; hi += 1) {
      var heartMesh = new THREE.Mesh(heartGeometry, pick(heartMaterials));
      var heartScale = randomBetween(0.16, 0.5);
      heartMesh.scale.set(heartScale, heartScale, heartScale);

      var baseX = randomBetween(-7, 7);
      var baseY = randomBetween(-3.5, 3.5);
      var baseZ = randomBetween(-6, 2);
      heartMesh.position.set(baseX, baseY, baseZ);
      heartMesh.rotation.set(
        randomBetween(-0.4, 0.4),
        randomBetween(0, Math.PI * 2),
        randomBetween(-0.3, 0.3)
      );

      heartGroup.add(heartMesh);
      floatingHearts.push({
        mesh: heartMesh,
        baseX: baseX,
        baseY: baseY,
        floatAmp: randomBetween(0.4, 1.1),
        floatSpeed: randomBetween(0.4, 0.9),
        driftAmp: randomBetween(0.2, 0.7),
        driftSpeed: randomBetween(0.2, 0.5),
        phase: randomBetween(0, Math.PI * 2),
        spinX: randomBetween(-0.4, 0.4),
        spinY: randomBetween(-0.5, 0.5)
      });
    }
    scene.add(heartGroup);

    /* ---------- Objek: kelopak jatuh ---------- */

    var petalGeometry = createPetalGeometry();
    var petalMaterials = [
      new THREE.MeshStandardMaterial({
        color: COLORS.petal,
        emissive: COLORS.petalEmissive,
        emissiveIntensity: 0.35,
        roughness: 0.6,
        metalness: 0,
        transparent: true,
        opacity: 0.72,
        side: THREE.DoubleSide
      }),
      new THREE.MeshStandardMaterial({
        color: 0xFF8FB1,
        emissive: COLORS.petalEmissive,
        emissiveIntensity: 0.3,
        roughness: 0.6,
        metalness: 0,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide
      })
    ];

    petalGroup = new THREE.Group();
    for (var pi = 0; pi < counts.petals; pi += 1) {
      var petalMesh = new THREE.Mesh(petalGeometry, pick(petalMaterials));
      var petalScale = randomBetween(0.35, 0.8);
      petalMesh.scale.set(petalScale, petalScale, petalScale);
      petalMesh.position.set(randomBetween(-8, 8), randomBetween(-6.5, 6.5), randomBetween(-5, 2));
      petalMesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);

      petalGroup.add(petalMesh);
      fallingPetals.push({
        mesh: petalMesh,
        baseY: petalMesh.position.y,
        swayAmp: randomBetween(0.3, 1),
        swaySpeed: randomBetween(0.3, 0.8),
        fallSpeed: randomBetween(0.35, 0.85),
        phase: randomBetween(0, Math.PI * 2),
        tumbleX: randomBetween(-1.2, 1.2),
        tumbleZ: randomBetween(-1.2, 1.2)
      });
    }
    scene.add(petalGroup);

    /* ---------- Objek: bintang ---------- */

    starField = createStarField(counts.stars);
    scene.add(starField);

    /* ---------- Nilai dasar untuk efek celebrate ---------- */

    var baseStarSize = starField.material.size;
    var basePinkIntensity = pinkLight.intensity;
    var baseCyanIntensity = cyanLight.intensity;

    /* ---------- Update per-frame ---------- */

    function currentBoost() {
      var remaining = celebrateUntil - elapsed;
      return remaining > 0 ? remaining / CELEBRATE_DURATION_SECONDS : 0;
    }

    function updateScene(dt) {
      var boost = currentBoost();
      var speedFactor = 1 + boost * 1.6;

      // Denyut hero heart (lebih kuat saat celebration).
      var pulse = 1 + 0.05 * Math.sin(elapsed * 2.4) + boost * 0.22 * Math.sin(elapsed * 7);
      heroHeart.scale.set(
        HERO_BASE_SCALE * pulse,
        HERO_BASE_SCALE * pulse,
        HERO_BASE_SCALE * pulse
      );
      heroHeart.rotation.y = Math.sin(elapsed * 0.35) * 0.25;

      // Hati kecil melayang.
      for (var i = 0; i < floatingHearts.length; i += 1) {
        var item = floatingHearts[i];
        item.mesh.position.y = item.baseY + Math.sin(elapsed * item.floatSpeed + item.phase) * item.floatAmp;
        item.mesh.position.x = item.baseX + Math.sin(elapsed * item.driftSpeed + item.phase) * item.driftAmp;
        item.mesh.rotation.x += dt * item.spinX * speedFactor;
        item.mesh.rotation.y += dt * item.spinY * speedFactor;
      }

      // Kelopak jatuh perlahan dengan goyangan.
      for (var j = 0; j < fallingPetals.length; j += 1) {
        var petal = fallingPetals[j];
        petal.mesh.position.y = wrapRange(
          petal.baseY - elapsed * petal.fallSpeed * speedFactor,
          -6.5,
          6.5
        );
        petal.mesh.position.x += Math.sin(elapsed * petal.swaySpeed + petal.phase) * petal.swayAmp * dt;
        petal.mesh.rotation.x += dt * petal.tumbleX;
        petal.mesh.rotation.z += dt * petal.tumbleZ;
      }

      // Grup berputar lembut; bintang berputar paling lambat.
      heartGroup.rotation.y = Math.sin(elapsed * 0.1) * 0.12 + boost * 0.15;
      starField.rotation.y += dt * 0.02 * speedFactor;
      starField.material.opacity = 0.75 + 0.15 * Math.sin(elapsed * 0.8) + boost * 0.15;
      starField.material.size = baseStarSize * (1 + boost * 0.6);

      // Cahaya naik saat celebration.
      pinkLight.intensity = basePinkIntensity + boost * 2.2;
      cyanLight.intensity = baseCyanIntensity + boost * 1.2;

      // Kamera bergeser halus (parallax sinematik tanpa input listener).
      camera.position.x = Math.sin(elapsed * 0.18) * 0.6;
      camera.position.y = 0.4 + Math.sin(elapsed * 0.13) * 0.3;
      camera.lookAt(0, 0.2, 0);
    }

    function tick() {
      if (!running || destroyed) {
        return;
      }
      rafId = requestAnimationFrame(tick);

      var dt = Math.min(clock.getDelta(), MAX_DELTA_SECONDS);
      elapsed += dt;

      updateScene(dt);
      renderer.render(scene, camera);
    }

    /* ---------- Render statis (prefers-reduced-motion) ---------- */

    function renderStaticFrame() {
      // Posisi objek tetap dihitung sekali agar scene tidak kosong.
      updateScene(0);
      if (staticCelebrate) {
        pinkLight.intensity = basePinkIntensity + 1.8;
        cyanLight.intensity = baseCyanIntensity + 1;
        starField.material.opacity = 1;
      }
      renderer.render(scene, camera);
    }

    /* ---------- Kontrol loop ---------- */

    function startLoop() {
      if (running || destroyed || reducedMotion) {
        return;
      }
      running = true;
      clock.start();
      rafId = requestAnimationFrame(tick);
    }

    function stopLoop() {
      running = false;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      clock.stop();
    }

    /* ---------- Event handlers ---------- */

    function handleResize() {
      if (destroyed || !renderer) {
        return;
      }
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));
      renderer.setSize(window.innerWidth, window.innerHeight);
      if (started && reducedMotion) {
        renderStaticFrame();
      }
    }

    function handleVisibilityChange() {
      if (destroyed || !started || reducedMotion) {
        return;
      }
      if (document.hidden) {
        stopLoop();
      } else {
        startLoop();
      }
    }

    function handleContextLost(event) {
      // Context hilang (GPU reset, dsb.): aktifkan fallback CSS,
      // lalu bersihkan scene. Experience tetap berlanjut tanpa WebGL.
      event.preventDefault();
      console.warn('[RomanceScene] WebGL context lost; beralih ke fallback CSS.');
      document.body.classList.add('webgl-off');
      destroy();
    }

    window.addEventListener('resize', handleResize);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost, false);

    /* ---------- Cleanup ---------- */

    function disposeResources() {
      scene.traverse(function (object) {
        if (object.geometry) {
          object.geometry.dispose();
        }
        if (Array.isArray(object.material)) {
          object.material.forEach(function (material) {
            material.dispose();
          });
        } else if (object.material) {
          object.material.dispose();
        }
      });
      renderer.dispose();
      if (renderer.domElement && renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    }

    function destroy() {
      if (destroyed) {
        return;
      }
      destroyed = true;
      stopLoop();

      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (renderer && renderer.domElement) {
        renderer.domElement.removeEventListener('webglcontextlost', handleContextLost, false);
      }

      try {
        disposeResources();
      } catch (err) {
        console.warn('[RomanceScene] Cleanup resource dilewati.', err);
      }

      renderer = null;
      scene = null;
      camera = null;
      floatingHearts = [];
      fallingPetals = [];
    }

    /* ---------- API publik controller ---------- */

    function start() {
      if (started || destroyed) {
        return;
      }
      started = true;

      if (reducedMotion) {
        renderStaticFrame();
        return;
      }
      startLoop();
    }

    function celebrate() {
      if (destroyed) {
        return;
      }
      if (reducedMotion) {
        // Mode reduced-motion: tanpa animasi berjalan, cukup satu frame
        // dengan cahaya lebih terang sebagai feedback celebration.
        staticCelebrate = true;
        renderStaticFrame();
        return;
      }
      celebrateUntil = elapsed + CELEBRATE_DURATION_SECONDS;
      if (started && !running) {
        startLoop(); // jaga-jaga jika tab baru kembali visible
      }
    }

    return Object.freeze({
      start: start,
      celebrate: celebrate,
      destroy: destroy
    });
  }

  /* ==================== EXPORT ==================== */

  window.RomanceScene = Object.freeze({
    init: init
  });
})();
```
8. **public/assets/js/interactive.js**
```javascript
/**
 * ============================================================
 * Romance Engine V1 — assets/js/interactive.js
 * Modul F-005: YES / NO Interaction System
 * ============================================================
 *
 * KONTRAK PUBLIK (dipakai oleh view.html — jangan diubah sepihak):
 *   window.RomanceInteractive.init({
 *     yesButton,     // elemen tombol YES
 *     noButton,      // elemen tombol NO
 *     playground,    // container relatif tempat NO menghindar
 *     reducedMotion, // boolean — hormati prefers-reduced-motion
 *     onYes          // callback saat YES dipilih (celebration)
 *   })
 *   -> controller { destroy() }  jika inisialisasi berhasil
 *   -> null                      jika elemen/kontrak tidak terpenuhi
 *      (view.html kemudian memasang fallback handler YES dasar)
 *
 * KEPUTUSAN TEKNIS TERDOKUMENTASI (NN-007):
 *  1. Tombol NO dipindahkan menggunakan `transform: translate3d`,
 *     BUKAN mengubah top/left/position. Transform tidak memicu layout
 *     ulang dan tidak mengubah flow, sehingga tidak ada overflow
 *     permanen (spesifikasi §13 & §17).
 *  2. Batas perpindahan dihitung dari rect `playground` dan viewport,
 *     sehingga NO selalu berada di area aman (tidak pernah keluar layar).
 *     Batas dihitung ulang setiap dodge → otomatis adaptif saat resize.
 *  3. Cooldown singkat + jumlah kandidat posisi terbatas (bounded)
 *     menjamin tidak ada event loop tak terbatas atau thrashing.
 *  4. Mekanisme menghindar:
 *     - pointerenter (mouse/pen)      → menghindar
 *     - touchstart (passive: false)   → menghindar + preventDefault
 *       agar click sintetis tidak sempat mendarat
 *     - keyboard (Enter/Space)        → TIDAK menghindar; click diterima
 *       dan diberi feedback shake ringan (graceful behavior untuk
 *       input method yang tidak mendukung mekanisme teleport, §13).
 *  5. Setelah MAX_DODGES, tombol NO "menyerah" dan berhenti menghindar —
 *     playful, tetapi tidak pernah memblokir atau membuat dead state.
 *  6. reduced-motion: perpindahan diterapkan instan tanpa tween,
 *     dan shake dilewati sepenuhnya.
 *  7. GSAP bersifat opsional. Jika CDN GSAP gagal dimuat, perpindahan
 *     tetap berjalan via set transform langsung (isolasi kegagalan §21).
 *  8. init() idempoten: pemanggilan berulang pada elemen yang sama
 *     mengembalikan controller yang sama, mencegah listener duplikat.
 */
(function () {
  'use strict';

  /* ==================== KONFIGURASI ==================== */

  var MAX_DODGES = 6;            // setelah ini, NO berhenti menghindar
  var DODGE_COOLDOWN_MS = 180;   // jeda antar dodge (anti event-loop)
  var ESCAPE_PADDING = 8;        // jarak aman dari tepi area
  var POINTER_AVOID_DISTANCE = 70; // jarak minimum posisi baru dari pointer
  var CANDIDATE_ATTEMPTS = 5;    // jumlah kandidat posisi (bounded)
  var DODGE_DURATION = 0.35;     // durasi tween GSAP (detik)

  /* ==================== UTILITAS ==================== */

  function isElement(value) {
    return Boolean(value && typeof value === 'object' && value.nodeType === 1);
  }

  function isGsapAvailable() {
    return Boolean(window.gsap && typeof window.gsap.to === 'function');
  }

  function randomBetween(min, max) {
    return min + Math.random() * (max - min);
  }

  /* ==================== ENTRY POINT ==================== */

  /**
   * Inisialisasi sistem interaksi YES/NO.
   * Return controller, atau null jika kontrak tidak terpenuhi.
   * Tidak pernah melempar exception keluar.
   */
  function init(config) {
    try {
      return createController(config);
    } catch (err) {
      console.warn('[RomanceInteractive] Inisialisasi gagal; fallback dasar akan dipakai.', err);
      return null;
    }
  }

  function createController(config) {
    if (!config || typeof config !== 'object') {
      return null;
    }

    var yesButton = config.yesButton;
    var noButton = config.noButton;
    var playground = config.playground;
    var reducedMotion = Boolean(config.reducedMotion);
    var onYes = typeof config.onYes === 'function' ? config.onYes : null;

    if (!isElement(yesButton) || !isElement(noButton) || !isElement(playground)) {
      console.warn('[RomanceInteractive] Elemen interaksi tidak lengkap.');
      return null;
    }

    // Idempotensi: cegah listener duplikat jika init dipanggil ulang.
    if (noButton.__romanceInteractiveController) {
      return noButton.__romanceInteractiveController;
    }

    /* ---------- State ---------- */
    var dx = 0;
    var dy = 0;
    var dodgeCount = 0;
    var exhausted = false;   // NO sudah "menyerah" setelah MAX_DODGES
    var accepted = false;    // YES sudah dipilih
    var destroyed = false;
    var cooldownUntil = 0;
    var activeTween = null;

    /* ---------- Transform ---------- */

    function applyTransform() {
      noButton.style.transform = 'translate3d(' + dx + 'px, ' + dy + 'px, 0)';
    }

    function killActiveTween() {
      if (activeTween && typeof activeTween.kill === 'function') {
        try {
          activeTween.kill();
        } catch (err) {
          // best-effort
        }
      }
      activeTween = null;
    }

    /**
     * Pindahkan NO ke (targetDx, targetDy) dengan tween jika tersedia,
     * atau instan jika reduced-motion / GSAP tidak ada.
     */
    function animateTo(targetDx, targetDy) {
      killActiveTween();

      if (reducedMotion || !isGsapAvailable()) {
        dx = targetDx;
        dy = targetDy;
        applyTransform();
        return;
      }

      var proxy = { px: dx, py: dy };
      activeTween = window.gsap.to(proxy, {
        px: targetDx,
        py: targetDy,
        duration: DODGE_DURATION,
        ease: 'back.out(1.4)',
        onUpdate: function () {
          dx = proxy.px;
          dy = proxy.py;
          applyTransform();
        },
        onComplete: function () {
          activeTween = null;
        }
      });
    }

    /* ---------- Batas area aman ---------- */

    /**
     * Hitung batas translate agar NO tetap berada di dalam playground
     * dan tetap terlihat di viewport. Return null jika area terlalu
     * sempit untuk menghindar (graceful: dodge dilewati).
     */
    function computeEscapeBounds() {
      var playRect = playground.getBoundingClientRect();
      var noRect = noButton.getBoundingClientRect();

      // Posisi dasar (tanpa transform) dihitung dari rect saat ini.
      var baseLeft = noRect.left - dx;
      var baseTop = noRect.top - dy;
      var width = noRect.width;
      var height = noRect.height;

      var viewWidth = window.innerWidth;
      var viewHeight = window.innerHeight;

      var minDx = Math.max(playRect.left + ESCAPE_PADDING, ESCAPE_PADDING) - baseLeft;
      var maxDx = Math.min(playRect.right - ESCAPE_PADDING, viewWidth - ESCAPE_PADDING) - baseLeft - width;
      var minDy = Math.max(playRect.top + ESCAPE_PADDING, ESCAPE_PADDING) - baseTop;
      var maxDy = Math.min(playRect.bottom - ESCAPE_PADDING, viewHeight - ESCAPE_PADDING) - baseTop - height;

      if (minDx > maxDx || minDy > maxDy) {
        return null;
      }
      return { minDx: minDx, maxDx: maxDx, minDy: minDy, maxDy: maxDy };
    }

    /* ---------- Pemilihan posisi kabur ---------- */

    /**
     * Pilih posisi acak dalam batas, dengan preferensi menjauh dari
     * pointer. Jumlah kandidat dibatasi (bounded) — tidak ada loop
     * tak terbatas.
     */
    function pickEscapeTarget(bounds, pointerX, pointerY) {
      var bestX = randomBetween(bounds.minDx, bounds.maxDx);
      var bestY = randomBetween(bounds.minDy, bounds.maxDy);
      var bestScore = -1;

      for (var attempt = 0; attempt < CANDIDATE_ATTEMPTS; attempt += 1) {
        var candidateX = randomBetween(bounds.minDx, bounds.maxDx);
        var candidateY = randomBetween(bounds.minDy, bounds.maxDy);

        if (typeof pointerX !== 'number' || typeof pointerY !== 'number') {
          bestX = candidateX;
          bestY = candidateY;
          break;
        }

        // Jarak posisi baru terhadap pointer di koordinat layar.
        var noRect = noButton.getBoundingClientRect();
        var candidateCenterX = noRect.left - dx + candidateX + noRect.width / 2;
        var candidateCenterY = noRect.top - dy + candidateY + noRect.height / 2;
        var distance = Math.sqrt(
          Math.pow(candidateCenterX - pointerX, 2) +
          Math.pow(candidateCenterY - pointerY, 2)
        );

        if (distance > bestScore) {
          bestScore = distance;
          bestX = candidateX;
          bestY = candidateY;
        }

        if (bestScore >= POINTER_AVOID_DISTANCE) {
          break; // sudah cukup jauh — tidak perlu coba lagi
        }
      }

      return { x: bestX, y: bestY };
    }

    /* ---------- Dodge (menghindar) ---------- */

    function dodge(pointerX, pointerY) {
      if (destroyed || exhausted) {
        return;
      }

      var now = Date.now();
      if (now < cooldownUntil) {
        return;
      }
      cooldownUntil = now + DODGE_COOLDOWN_MS;

      var bounds = computeEscapeBounds();
      if (!bounds) {
        // Area terlalu sempit — graceful: lewati dodge, jangan paksakan.
        return;
      }

      var target = pickEscapeTarget(bounds, pointerX, pointerY);
      dodgeCount += 1;

      if (dodgeCount >= MAX_DODGES) {
        exhausted = true;
      }

      animateTo(target.x, target.y);
    }

    /* ---------- Feedback saat NO berhasil diaktifkan ---------- */

    /**
     * Click pada NO hanya mungkin terjadi via keyboard, atau setelah
     * NO menyerah. Tidak ada perayaan — hanya feedback shake ringan.
     * Shake dilewati sepenuhnya pada reduced-motion.
     */
    function shakeNo() {
      if (destroyed || reducedMotion) {
        return;
      }

      if (typeof noButton.animate !== 'function') {
        return;
      }

      try {
        var frames = [
          'translate3d(' + dx + 'px, ' + dy + 'px, 0)',
          'translate3d(' + (dx + 7) + 'px, ' + dy + 'px, 0)',
          'translate3d(' + (dx - 7) + 'px, ' + dy + 'px, 0)',
          'translate3d(' + (dx + 4) + 'px, ' + dy + 'px, 0)',
          'translate3d(' + dx + 'px, ' + dy + 'px, 0)'
        ];
        noButton.animate(
          frames.map(function (transform) { return { transform: transform }; }),
          { duration: 320, easing: 'ease-in-out' }
        );
      } catch (err) {
        console.warn('[RomanceInteractive] Animasi shake dilewati.', err);
      }
    }

    /* ---------- Event handlers (named reference untuk cleanup) ---------- */

    function handlePointerEnter(event) {
      // Touch ditangani terpisah via touchstart (dengan preventDefault).
      if (event.pointerType === 'touch') {
        return;
      }
      dodge(event.clientX, event.clientY);
    }

    function handleTouchStart(event) {
      if (destroyed || exhausted) {
        return;
      }
      var touch = event.touches && event.touches[0];
      var touchX = touch ? touch.clientX : undefined;
      var touchY = touch ? touch.clientY : undefined;

      // Cegah click sintetis mendarat setelah tombol berpindah.
      event.preventDefault();
      dodge(touchX, touchY);
    }

    function handleNoClick() {
      if (destroyed) {
        return;
      }
      // Keyboard activation, atau click setelah NO menyerah:
      // tidak ada perayaan, hanya feedback ringan. Experience berlanjut.
      shakeNo();
    }

    function handleYesClick() {
      if (destroyed || accepted) {
        return;
      }
      accepted = true;

      if (onYes) {
        try {
          onYes();
        } catch (err) {
          // Celebration tidak boleh menyebabkan uncaught exception (§14).
          console.warn('[RomanceInteractive] Callback onYes gagal; celebration mungkin parsial.', err);
        }
      }
    }

    /* ---------- Pemasangan listener ---------- */

    noButton.addEventListener('pointerenter', handlePointerEnter);
    noButton.addEventListener('touchstart', handleTouchStart, { passive: false });
    noButton.addEventListener('click', handleNoClick);
    yesButton.addEventListener('click', handleYesClick);

    /* ---------- Cleanup ---------- */

    function destroy() {
      if (destroyed) {
        return;
      }
      destroyed = true;

      killActiveTween();

      noButton.removeEventListener('pointerenter', handlePointerEnter);
      noButton.removeEventListener('touchstart', handleTouchStart);
      noButton.removeEventListener('click', handleNoClick);
      yesButton.removeEventListener('click', handleYesClick);

      // Kembalikan tombol NO ke posisi semula.
      dx = 0;
      dy = 0;
      noButton.style.transform = '';

      delete noButton.__romanceInteractiveController;
    }

    /* ---------- Controller ---------- */

    var controller = Object.freeze({
      destroy: destroy
    });

    noButton.__romanceInteractiveController = controller;
    return controller;
  }

  /* ==================== EXPORT ==================== */

  window.RomanceInteractive = Object.freeze({
    init: init
  });
})();
```

9. **public/assets/js/audio-player.js**
```javascript
/**
 * ============================================================
 * Romance Engine V1 — assets/js/audio-player.js
 * Modul F-003: Gesture Audio Gateway
 * ============================================================
 *
 * KONTRAK PUBLIK (dipakai oleh view.html — jangan diubah sepihak):
 *   window.RomanceAudio.init({ musicUrl, defaultBgmSrc, chimeSrc })
 *     -> controller { unlock(), toggleMute(), playChime(), destroy(), isMuted }
 *     -> null jika audio tidak tersedia / inisialisasi gagal
 *        (view.html melanjutkan experience tanpa suara)
 *
 * KEPUTUSAN TEKNIS TERDOKUMENTASI (NN-007):
 *  1. Tidak ada autoplay sebelum user gesture. `unlock()` adalah satu-satunya
 *     titik yang memanggil `HTMLMediaElement.play()`, dan view.html menjamin
 *     pemanggilannya terjadi langsung di dalam click handler gateway (F-003).
 *  2. Prioritas sumber BGM: custom musicUrl -> default-bgm.mp3.
 *     Pergantian ke fallback terjadi via event 'error' pada elemen BGM;
 *     flag `usingFallback` mencegah loop fallback berulang.
 *  3. Keputusan mute: mute memengaruhi BGM dan chime sekaligus.
 *     Label tombol adalah "Musik" sehingga user mengharapkan seluruh audio
 *     halaman ikut diam saat dimatikan. Celebration tetap memiliki feedback
 *     visual penuh (confetti + scene) tanpa bergantung pada suara.
 *  4. `crossOrigin` sengaja TIDAK diset. Menyetelnya dapat mengubah request
 *     menjadi CORS request dan menggagalkan playback URL yang servernya
 *     tidak mengirim header CORS — padahal playback audio tidak membutuhkannya.
 *  5. Semua operasi audio dibungkus try/catch dan promise rejection ditangani,
 *     sehingga kegagalan audio tidak pernah menjadi uncaught exception (NN-010).
 *  6. Event listener disimpan sebagai named reference dan dilepas di destroy()
 *     untuk menghindari memory leak (§17).
 */
(function () {
  'use strict';

  /* ==================== KONFIGURASI ==================== */

  var BGM_VOLUME = 0.6;
  var CHIME_VOLUME = 0.85;

  /* ==================== UTILITAS ==================== */

  function isNonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0;
  }

  /* ==================== ENTRY POINT ==================== */

  /**
   * Inisialisasi audio controller. Return controller, atau null jika
   * audio tidak tersedia. Tidak pernah melempar exception keluar.
   */
  function init(config) {
    try {
      return createAudioController(config);
    } catch (err) {
      console.warn('[RomanceAudio] Inisialisasi audio gagal; experience dilanjutkan tanpa suara.', err);
      return null;
    }
  }

  function createAudioController(config) {
    if (typeof document === 'undefined' || typeof document.createElement !== 'function') {
      return null;
    }

    var customMusicUrl = config && isNonEmptyString(config.musicUrl)
      ? config.musicUrl.trim()
      : null;
    var defaultBgmSrc = config && isNonEmptyString(config.defaultBgmSrc)
      ? config.defaultBgmSrc.trim()
      : null;
    var chimeSrc = config && isNonEmptyString(config.chimeSrc)
      ? config.chimeSrc.trim()
      : null;

    if (!customMusicUrl && !defaultBgmSrc) {
      return null;
    }

    /* ---------- State ---------- */
    var muted = false;
    var unlocked = false;
    var destroyed = false;
    var usingFallback = !customMusicUrl;

    /* ---------- Elemen audio ---------- */

    var bgm = document.createElement('audio');
    bgm.loop = true;
    bgm.preload = 'auto';
    bgm.volume = BGM_VOLUME;

    var chime = null;
    if (chimeSrc) {
      chime = document.createElement('audio');
      chime.preload = 'auto';
      chime.volume = CHIME_VOLUME;
      chime.src = chimeSrc;
      chime.load();
    }

    function setBgmSource(src) {
      bgm.src = src;
      bgm.load();
    }

    if (customMusicUrl) {
      setBgmSource(customMusicUrl);
    } else {
      setBgmSource(defaultBgmSrc);
    }

    /* ---------- Playback helper ---------- */

    function tryPlay() {
      if (destroyed) {
        return;
      }
      try {
        var playPromise = bgm.play();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch(function (err) {
            if (err && err.name === 'NotAllowedError') {
              console.warn('[RomanceAudio] Autoplay diblokir browser; audio menunggu gesture berikutnya.');
            } else if (err && err.name === 'AbortError') {
              // Sumber diganti saat play sedang berjalan — tidak perlu ditindaklanjuti.
            } else {
              console.warn('[RomanceAudio] Playback BGM gagal.', err);
            }
          });
        }
      } catch (err) {
        console.warn('[RomanceAudio] play() melempar exception; audio dilewati.', err);
      }
    }

    function switchToFallback() {
      if (destroyed || usingFallback || !defaultBgmSrc) {
        return;
      }
      usingFallback = true;
      setBgmSource(defaultBgmSrc);
      if (unlocked) {
        tryPlay();
      }
    }

    /* ---------- Event handler (named reference untuk cleanup) ---------- */

    function handleBgmError() {
      if (destroyed) {
        return;
      }
      if (!usingFallback) {
        console.warn('[RomanceAudio] Sumber musik custom gagal; beralih ke default-bgm.mp3.');
        switchToFallback();
      } else {
        console.warn('[RomanceAudio] BGM tidak dapat diputar; experience dilanjutkan tanpa musik.');
      }
    }

    bgm.addEventListener('error', handleBgmError);

    /* ---------- API publik ---------- */

    /**
     * Memulai playback BGM. HARUS dipanggil langsung di dalam user gesture.
     */
    function unlock() {
      if (unlocked || destroyed) {
        return;
      }
      unlocked = true;
      tryPlay();
    }

    /**
     * Toggle mute untuk seluruh audio (BGM + chime).
     * Return state mute terbaru.
     */
    function toggleMute() {
      if (destroyed) {
        return muted;
      }
      muted = !muted;
      try {
        bgm.muted = muted;
        if (chime) {
          chime.muted = muted;
        }
      } catch (err) {
        console.warn('[RomanceAudio] Toggle mute gagal.', err);
      }
      return muted;
    }

    /**
     * Memainkan success chime (sekali). Tidak melempar exception.
     */
    function playChime() {
      if (destroyed || !chime) {
        return;
      }
      try {
        chime.currentTime = 0;
        chime.muted = muted;
        var chimePromise = chime.play();
        if (chimePromise && typeof chimePromise.catch === 'function') {
          chimePromise.catch(function (err) {
            console.warn('[RomanceAudio] Chime gagal diputar; celebration tetap berjalan.', err);
          });
        }
      } catch (err) {
        console.warn('[RomanceAudio] Chime dilewati.', err);
      }
    }

    /**
     * Bersihkan seluruh resource audio dan listener.
     */
    function destroy() {
      if (destroyed) {
        return;
      }
      destroyed = true;

      try {
        bgm.removeEventListener('error', handleBgmError);
        bgm.pause();
        bgm.removeAttribute('src');
        bgm.load();
      } catch (err) {
        // best-effort cleanup
      }

      if (chime) {
        try {
          chime.pause();
          chime.removeAttribute('src');
          chime.load();
        } catch (err) {
          // best-effort cleanup
        }
      }
    }

    return Object.freeze({
      unlock: unlock,
      toggleMute: toggleMute,
      playChime: playChime,
      destroy: destroy,
      get isMuted() {
        return muted;
      }
    });
  }

  /* ==================== EXPORT ==================== */

  window.RomanceAudio = Object.freeze({
    init: init
  });
})();
```
