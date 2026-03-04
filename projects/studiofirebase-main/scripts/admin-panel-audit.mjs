import { promises as fs } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();

function parseArgs(argv) {
  const args = { seed: 'italosantos', outDir: 'docs' };
  for (const raw of argv) {
    if (raw.startsWith('--seed=')) args.seed = raw.slice('--seed='.length);
    if (raw.startsWith('--outDir=')) args.outDir = raw.slice('--outDir='.length);
  }
  return args;
}

function mulberry32(seedInt) {
  return function () {
    let t = (seedInt += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashToInt(str) {
  // Simple FNV-1a 32-bit
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

async function walk(dirAbs) {
  const entries = await fs.readdir(dirAbs, { withFileTypes: true });
  const results = [];
  for (const ent of entries) {
    const full = path.join(dirAbs, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === 'dist') continue;
      results.push(...(await walk(full)));
    } else {
      results.push(full);
    }
  }
  return results;
}

function toPosix(p) {
  return p.split(path.sep).join('/');
}

function cleanRouteFromFile(fileAbs) {
  const relFromApp = toPosix(path.relative(path.join(repoRoot, 'src/app'), fileAbs));
  const withoutSuffix = relFromApp.replace(/\/page\.(t|j)sx?$/, '');
  return '/' + withoutSuffix;
}

function extractTabs(fileText) {
  const tabs = [];
  const re = /<TabsTrigger\b[^>]*\bvalue=\"([^\"]+)\"[^>]*>([\s\S]*?)<\/TabsTrigger>/g;
  let m;
  while ((m = re.exec(fileText)) !== null) {
    const value = m[1]?.trim();
    const rawInner = (m[2] || '').trim();
    const label = rawInner.replace(/\s+/g, ' ').replace(/<[^>]+>/g, '').trim() || null;
    if (value) tabs.push({ value, label });
  }
  return tabs;
}

function seededShuffle(items, seedStr) {
  const rng = mulberry32(hashToInt(seedStr));
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const adminDir = path.join(repoRoot, 'src/app/admin');
  const allFiles = await walk(adminDir);
  const pageFiles = allFiles.filter((f) => /\/page\.tsx$/.test(f));

  const pages = [];
  for (const fileAbs of pageFiles) {
    const route = cleanRouteFromFile(fileAbs);
    const rel = toPosix(path.relative(repoRoot, fileAbs));
    const text = await fs.readFile(fileAbs, 'utf8');
    const tabs = extractTabs(text);
    pages.push({ route, file: rel, tabs });
  }

  pages.sort((a, b) => a.route.localeCompare(b.route));

  const manifest = {
    generatedAt: new Date().toISOString(),
    seed: args.seed,
    pages,
  };

  const outDirAbs = path.join(repoRoot, args.outDir);
  await fs.mkdir(outDirAbs, { recursive: true });

  const manifestPath = path.join(outDirAbs, 'admin-panel-manifest.json');
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');

  const randomized = seededShuffle(
    pages.flatMap((p) => {
      if (!p.tabs?.length) return [{ route: p.route, tab: null, file: p.file }];
      return p.tabs.map((t) => ({ route: p.route, tab: t.value, file: p.file, label: t.label }));
    }),
    args.seed
  );

  const lines = [];
  lines.push('# Admin Panel — Páginas e Abas (gerado automaticamente)');
  lines.push('');
  lines.push(`Gerado em: ${manifest.generatedAt}`);
  lines.push(`Seed de randomização: ${args.seed}`);
  lines.push('');

  lines.push('## Páginas (rotas)');
  lines.push('');
  for (const p of pages) {
    const tabsPart = p.tabs?.length
      ? ` (tabs: ${p.tabs.map((t) => t.value).join(', ')})`
      : '';
    lines.push(`- ${p.route} — ${p.file}${tabsPart}`);
  }

  lines.push('');
  lines.push('## Ordem randômica de validação (rota + tab)');
  lines.push('');
  for (const item of randomized) {
    if (item.tab) {
      lines.push(`- ${item.route} [tab=${item.tab}] — ${item.file}${item.label ? ` (${item.label})` : ''}`);
    } else {
      lines.push(`- ${item.route} — ${item.file}`);
    }
  }

  const mdPath = path.join(outDirAbs, 'ADMIN_PANEL_PAGES_AND_TABS.md');
  await fs.writeFile(mdPath, lines.join('\n') + '\n', 'utf8');

  console.log(`✅ Manifest: ${toPosix(path.relative(repoRoot, manifestPath))}`);
  console.log(`✅ Report:   ${toPosix(path.relative(repoRoot, mdPath))}`);
  console.log(`ℹ️ Pages:   ${pages.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
