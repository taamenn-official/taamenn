/**
 * Static privacy invariants for the TAAMEN client.
 *
 * These are genuine "must not exist" checks on source and build output. Behavioural
 * guarantees (authentication, authorization, sessions, persistence) are covered by
 * the test suites, not by string matching.
 *
 * Exit code 1 means private material reached a place it must never reach.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();
const failures = [];
const notes = [];

function fail(message) {
  failures.push(message);
}

function walk(dir, filter) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, filter));
    else if (filter(full)) out.push(full);
  }
  return out;
}

const relative = file => path.relative(root, file).replaceAll('\\', '/');

const sourceFiles = walk(path.join(root, 'src'), file => /\.(ts|tsx|json)$/.test(file));
const publicFiles = walk(path.join(root, 'public'), () => true);
const distClient = path.join(root, 'dist/client');
const distRoot = fs.existsSync(distClient) ? distClient : path.join(root, 'dist');
const distFiles = walk(distRoot, file => /\.(js|css|html|json)$/.test(file));

// ---------------------------------------------------------------------------
// 1. Recognition codes must not exist in the client at all.
// ---------------------------------------------------------------------------
const CODE_PATTERN = /user#[A-Z0-9]{4,}/;
for (const file of [...sourceFiles, ...publicFiles, ...distFiles]) {
  const text = fs.readFileSync(file, 'utf8');
  const found = text.match(CODE_PATTERN);
  if (found) fail(`Recognition code ${found[0]} is present in ${relative(file)}`);
}

// ---------------------------------------------------------------------------
// 2. The historical archive must not be shipped to the browser.
// ---------------------------------------------------------------------------
if (fs.existsSync(path.join(root, 'src/data/historicalArchive.ts'))) {
  fail('src/data/historicalArchive.ts exists; historical records must not live in the client');
}
if (fs.existsSync(path.join(root, 'src/config/featuredMembers.ts'))) {
  fail('src/config/featuredMembers.ts exists; the member directory must not live in the client');
}
for (const file of [...sourceFiles, ...publicFiles, ...distFiles]) {
  const text = fs.readFileSync(file, 'utf8');
  if (text.includes('legacy-taamenn')) {
    fail(`Legacy historical marker "legacy-taamenn" is present in ${relative(file)}`);
  }
  if (text.includes('historicalArchive')) {
    fail(`Reference to the embedded historical archive is present in ${relative(file)}`);
  }
}

// ---------------------------------------------------------------------------
// 3. Cross-check against the real operator data when it is available locally.
//    Absent on a clean checkout, which is itself the desired state.
// ---------------------------------------------------------------------------
const legacyPath = path.join(root, 'backend/legacy-private-matches.json');
const clientText = [...sourceFiles, ...publicFiles, ...distFiles]
  .map(file => fs.readFileSync(file, 'utf8'))
  .join('\n');

if (fs.existsSync(legacyPath)) {
  const legacy = JSON.parse(fs.readFileSync(legacyPath, 'utf8'));
  if (!Array.isArray(legacy)) {
    fail('backend/legacy-private-matches.json must be a JSON array of historical matches');
  } else {
    const leaked = new Set();
    for (const match of legacy) {
      if (match.story && clientText.includes(match.story)) leaked.add(`story of ${match.id}`);
      if (match.id && new RegExp(`["'\`]${match.id}["'\`]`).test(clientText)) leaked.add(`id ${match.id}`);
    }
    if (leaked.size) fail(`Private historical content reached the client: ${[...leaked].join(', ')}`);
    else notes.push(`Cross-checked ${legacy.length} private historical records against the client: none present.`);
  }
} else {
  fail('backend/legacy-private-matches.json is missing; the canonical historical snapshot must be tracked.');
}

const dataPath = path.join(root, 'backend/data.json');
if (fs.existsSync(dataPath)) {
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  const leaked = new Set();
  for (const member of data.members || []) {
    if (member.memberCode && clientText.includes(member.memberCode)) leaked.add(member.memberCode);
    if (member.passwordHash?.digest && clientText.includes(member.passwordHash.digest)) leaked.add(`${member.username} hash`);
    if (member.arabicName && clientText.includes(member.arabicName)) leaked.add(member.arabicName);
  }
  if (leaked.size) fail(`Operator member data reached the client: ${[...leaked].join(', ')}`);
  else notes.push(`Cross-checked ${(data.members || []).length} operator member records against the client: none present.`);
} else {
  notes.push('backend/data.json is absent (expected on a clean checkout).');
}

// ---------------------------------------------------------------------------
// 4. Credential material must not appear in the client.
// ---------------------------------------------------------------------------
for (const file of [...sourceFiles, ...distFiles]) {
  const text = fs.readFileSync(file, 'utf8');
  if (/passwordHash|scryptSync/.test(text)) {
    fail(`Credential handling appears in client file ${relative(file)}`);
  }
  if (/\b[0-9a-f]{128}\b/.test(text)) {
    fail(`A 64-byte hex digest appears in client file ${relative(file)}`);
  }
}

// ---------------------------------------------------------------------------
// 5. The support recipient must be server-side only.
// ---------------------------------------------------------------------------
for (const file of sourceFiles) {
  const text = fs.readFileSync(file, 'utf8');
  const email = text.match(/[\w.+-]+@[\w-]+\.[\w.]{2,}/);
  if (email && !/name@example\.com|@[\w-]*example/.test(email[0])) {
    fail(`A real email address (${email[0]}) is hardcoded in ${relative(file)}`);
  }
  if (/to_email|supportRecipient/.test(text)) {
    fail(`${relative(file)} chooses an email recipient in the client; the server must own this`);
  }
}

const EMAILJS_CLIENT_LEAK = /7xyuge5ZLIgBevcbL|service_13mkb9h|api\.emailjs\.com|VITE_EMAILJS_/;
for (const file of [...sourceFiles, ...publicFiles, ...distFiles]) {
  const text = fs.readFileSync(file, 'utf8');
  if (EMAILJS_CLIENT_LEAK.test(text)) {
    fail(`Client EmailJS configuration reached ${relative(file)}; Support must use the backend contact route`);
  }
}

// ---------------------------------------------------------------------------
// 6. The service worker must never cache the API.
// ---------------------------------------------------------------------------
const swPath = path.join(root, 'public/sw.js');
if (!fs.existsSync(swPath)) {
  fail('public/sw.js is missing');
} else {
  const sw = fs.readFileSync(swPath, 'utf8');
  if (!/\/api\//.test(sw)) fail('public/sw.js does not mention /api/, so it cannot be bypassing it');
  if (!/url\.pathname\.startsWith\('\/api\/'\)/.test(sw)) {
    fail('public/sw.js must bypass requests whose path starts with /api/');
  }
  if (!/url\.pathname\.startsWith\('\/share\/'\)/.test(sw)) {
    fail('public/sw.js must not cache unique /share/ token URLs');
  }
  if (!/taamen-shell-v11/.test(sw) && !/VERSION='v11'/.test(sw)) {
    fail('public/sw.js cache version must stay pinned after the shell manifest bump');
  }
  const precache = sw.match(/const PRECACHE\s*=\s*\[(.*?)\]/s);
  if (precache && precache[1].includes('/api')) fail('public/sw.js precaches an /api path');
}

const spa404 = path.join(root, 'public/404.html');
if (!fs.existsSync(spa404)) {
  fail('public/404.html is missing');
} else {
  const html = fs.readFileSync(spa404, 'utf8');
  if (html.includes('/src/main.tsx')) {
    fail('public/404.html must not load Vite source /src/main.tsx in production');
  }
  if (!html.includes('taamen-spa-path')) {
    fail('public/404.html must preserve the original path for share/acquisition routes');
  }
}

// ---------------------------------------------------------------------------
// 7. Operator data must be ignored by git.
// ---------------------------------------------------------------------------
const gitignore = fs.existsSync(path.join(root, '.gitignore'))
  ? fs.readFileSync(path.join(root, '.gitignore'), 'utf8')
  : '';
for (const entry of ['backend/data.json', 'backend/sessions.json']) {
  if (!gitignore.split(/\r?\n/).some(line => line.trim() === entry)) {
    fail(`${entry} is not listed in .gitignore`);
  }
}
if (gitignore.split(/\r?\n/).some(line => line.trim() === 'backend/legacy-private-matches.json')) {
  fail('backend/legacy-private-matches.json is gitignored; the canonical historical snapshot must be tracked');
}

const wranglerPath = path.join(root, 'wrangler.jsonc');
if (!fs.existsSync(wranglerPath)) {
  fail('wrangler.jsonc is missing');
} else {
  const wrangler = fs.readFileSync(wranglerPath, 'utf8');
  if (!/"directory"\s*:\s*"dist\/client"/.test(wrangler)) {
    fail('wrangler.jsonc assets.directory must be dist/client (Vite client outDir)');
  }
  if (!/"not_found_handling"\s*:\s*"single-page-application"/.test(wrangler)) {
    fail('wrangler.jsonc must keep SPA not_found_handling');
  }
  if (!/"run_worker_first"\s*:\s*\[\s*"\/api\/\*"\s*\]/.test(wrangler)) {
    fail('wrangler.jsonc must keep run_worker_first ["/api/*"]');
  }
  if (!/"binding"\s*:\s*"TAAMEN_KV"/.test(wrangler)) {
    fail('wrangler.jsonc must bind TAAMEN_KV');
  }
  if (!/"id"\s*:\s*"7698f62403814e81b6f2ca13a8eb9cbc"/.test(wrangler)) {
    fail('wrangler.jsonc must use the confirmed TAAMEN_KV namespace id 7698f62403814e81b6f2ca13a8eb9cbc');
  }
  if (/taamen-kv-replace-before-deploy|taamen-kv-local-preview/.test(wrangler)) {
    fail('wrangler.jsonc still contains a placeholder KV namespace id');
  }
  if (!/"EMAILJS_SERVICE_ID"\s*:\s*"service_13mkb9h"/.test(wrangler)
    || !/"EMAILJS_CONTACT_TEMPLATE_ID"\s*:\s*"template_jsugxta"/.test(wrangler)
    || !/"EMAILJS_AUTOREPLY_TEMPLATE_ID"\s*:\s*"template_4pj4xlm"/.test(wrangler)
    || !/"EMAILJS_PUBLIC_KEY"\s*:\s*"7xyuge5ZLIgBevcbL"/.test(wrangler)) {
    fail('wrangler.jsonc must keep the authoritative EmailJS public IDs');
  }
  const productionEnv = wrangler.match(/"production"\s*:\s*\{[\s\S]*?\n    \}/);
  if (!productionEnv) {
    fail('wrangler.jsonc must define env.production for Cloudflare Vite CLOUDFLARE_ENV=production');
  } else {
    const block = productionEnv[0];
    if (!/"REQUIRE_HTTPS"\s*:\s*"true"/.test(block)) {
      fail('wrangler.jsonc env.production must set REQUIRE_HTTPS=true');
    }
    if (!/"NODE_ENV"\s*:\s*"production"/.test(block)) {
      fail('wrangler.jsonc env.production must set NODE_ENV=production');
    }
    if (!/"id"\s*:\s*"7698f62403814e81b6f2ca13a8eb9cbc"/.test(block)) {
      fail('wrangler.jsonc env.production must bind the confirmed TAAMEN_KV id');
    }
    if (!/"EMAILJS_SERVICE_ID"\s*:\s*"service_13mkb9h"/.test(block)
      || !/"EMAILJS_CONTACT_TEMPLATE_ID"\s*:\s*"template_jsugxta"/.test(block)
      || !/"EMAILJS_AUTOREPLY_TEMPLATE_ID"\s*:\s*"template_4pj4xlm"/.test(block)
      || !/"EMAILJS_PUBLIC_KEY"\s*:\s*"7xyuge5ZLIgBevcbL"/.test(block)) {
      fail('wrangler.jsonc env.production must keep the authoritative EmailJS public IDs');
    }
  }
  const topLevelVars = wrangler.match(/"vars"\s*:\s*\{[\s\S]*?\n  \}/);
  if (!topLevelVars || !/"REQUIRE_HTTPS"\s*:\s*"false"/.test(topLevelVars[0])) {
    fail('wrangler.jsonc top-level vars must keep REQUIRE_HTTPS=false for local Worker preview');
  }
  if (/"TAAMEN_SUPPORT_RECIPIENT"/.test(wrangler) || /"EMAILJS_PRIVATE_KEY"/.test(wrangler)) {
    fail('wrangler.jsonc must not declare secrets as vars');
  }
}

// ---------------------------------------------------------------------------
// 8. Official branding asset integrity.
//     SHA-256 of the supplied TAAMEN brand mark committed with the product.
//     Update this digest only when the product owner replaces that official asset.
// ---------------------------------------------------------------------------
const logoPath = path.join(root, 'public/assets/taamen-brand-mark.png');
const EXPECTED_LOGO_SHA256 = 'be96fd7400c6013efd5a53c4246e57286585a46fb0c3bc8fdbfd7c7c671ae251';
if (!fs.existsSync(logoPath)) {
  fail('public/assets/taamen-brand-mark.png is missing');
} else {
  const actual = crypto.createHash('sha256').update(fs.readFileSync(logoPath)).digest('hex');
  if (actual !== EXPECTED_LOGO_SHA256) fail('The official TAAMEN logo asset was modified');
}

// ---------------------------------------------------------------------------
if (!distFiles.length) {
  notes.push(`${path.relative(root, distRoot) || 'dist/'} is absent: build output was not inspected. Run \`npm run build\` then re-run this check.`);
}

for (const note of notes) console.log(`note: ${note}`);

if (failures.length) {
  console.error(`\nTAAMEN client privacy invariants: FAIL (${failures.length})`);
  for (const message of failures) console.error(`  - ${message}`);
  process.exit(1);
}

console.log(`\nTAAMEN client privacy invariants: PASS`);
console.log(`Inspected ${sourceFiles.length} source, ${publicFiles.length} public, ${distFiles.length} build files.`);
