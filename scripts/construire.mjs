/* TalentCI — scripts/construire.mjs
   Prépare la version publiée du site dans _site/ (lancé par GitHub Actions).

   Les fichiers sources restent séparés pour le travail ; le téléphone, lui,
   reçoit beaucoup moins de fichiers :
   - les 5 feuilles CSS → 1 seule, compressée (css/app.<empreinte>.css) ;
   - supabase-js + les 15 scripts → 1 seul, compressé (js/app.<empreinte>.js),
     chargé avec `defer` pour ne plus bloquer l'affichage de la page ;
   - sw.js reçoit la nouvelle liste de fichiers et une VERSION liée à
     l'empreinte, pour renouveler le cache de l'application installée.

   L'ordre des fichiers est lu dans index.html : pour ajouter un fichier,
   il suffit de l'ajouter dans index.html comme avant.

   Utilisation : npm ci && npm run construire */
import { readFile, writeFile, mkdir, rm, cp } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { transform } from 'esbuild';

const RACINE = fileURLToPath(new URL('..', import.meta.url));
const SORTIE = join(RACINE, '_site');
const A_COPIER = ['manifest.webmanifest', 'icons', 'images'];

const lire = (chemin) => readFile(join(RACINE, chemin), 'utf8');
const empreinte = (texte) => createHash('sha256').update(texte).digest('hex').slice(0, 10);

let html = await lire('index.html');

// ── Feuilles de style ────────────────────────────────────────
const RE_CSS = /^[ \t]*<link rel="stylesheet" href="(css\/[^"]+)"\/>\r?\n/gm;
const fichiersCss = [...html.matchAll(RE_CSS)].map(m => m[1]);
if (fichiersCss.length === 0) throw new Error('Aucune feuille CSS trouvée dans index.html');
const cssBrut = (await Promise.all(fichiersCss.map(lire))).join('\n');
const { code: css } = await transform(cssBrut, { loader: 'css', minify: true });
const nomCss = `css/app.${empreinte(css)}.css`;

// ── Scripts ──────────────────────────────────────────────────
// Scripts classiques (pas des modules) : ils partagent leurs variables
// globales, donc les mettre bout à bout ne change pas leur comportement.
// esbuild ne renomme pas les noms globaux d'un script classique, ce qui
// garde les onclick="..." de index.html fonctionnels.
const RE_JS = /^[ \t]*<script src="(js\/[^"]+)"><\/script>\r?\n/gm;
const fichiersJs = [...html.matchAll(RE_JS)].map(m => m[1]);
if (fichiersJs.length === 0) throw new Error('Aucun script trouvé dans index.html');
const vendeurs = fichiersJs.filter(f => f.startsWith('js/vendor/'));
const nosScripts = fichiersJs.filter(f => !f.startsWith('js/vendor/'));
const vendeursCode = (await Promise.all(vendeurs.map(lire))).join('\n;\n');
const nosScriptsBrut = (await Promise.all(nosScripts.map(lire))).join('\n;\n');
const { code: nosScriptsCode } = await transform(nosScriptsBrut, {
  loader: 'js', minify: true, target: 'es2020', legalComments: 'none'
});
const js = `${vendeursCode}\n;\n${nosScriptsCode}`;
const nomJs = `js/app.${empreinte(js)}.js`;

// ── index.html ───────────────────────────────────────────────
let premierCss = true;
html = html.replace(RE_CSS, () => {
  if (!premierCss) return '';
  premierCss = false;
  return `  <link rel="stylesheet" href="${nomCss}"/>\n`;
});
html = html.replace(RE_JS, '');
html = html.replace(/^[ \t]*<!-- supabase-js[^\n]*-->\r?\n/m, '');
html = html.replace('</head>', `  <script src="${nomJs}" defer></script>\n</head>`);

// ── Service worker ───────────────────────────────────────────
let sw = await lire('sw.js');
const coquille = ['./', 'index.html', nomCss, nomJs, 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];
sw = sw.replace(/const VERSION = '[^']*';/, `const VERSION = 'talentci-${empreinte(css + js + html)}';`);
sw = sw.replace(/const APP_SHELL = \[[\s\S]*?\];/,
  `const APP_SHELL = ${JSON.stringify(coquille, null, 2)};`);
if (!sw.includes(nomJs)) throw new Error('Liste APP_SHELL introuvable dans sw.js');

// ── Écriture ─────────────────────────────────────────────────
await rm(SORTIE, { recursive: true, force: true });
await mkdir(join(SORTIE, 'css'), { recursive: true });
await mkdir(join(SORTIE, 'js'), { recursive: true });
await writeFile(join(SORTIE, nomCss), css);
await writeFile(join(SORTIE, nomJs), js);
await writeFile(join(SORTIE, 'index.html'), html);
await writeFile(join(SORTIE, 'sw.js'), sw);
await writeFile(join(SORTIE, '.nojekyll'), '');
for (const f of A_COPIER) await cp(join(RACINE, f), join(SORTIE, f), { recursive: true });

const ko = (s) => (Buffer.byteLength(s) / 1024).toFixed(0) + ' Ko';
console.log(`CSS : ${fichiersCss.length} fichiers → ${nomCss} (${ko(cssBrut)} → ${ko(css)})`);
console.log(`JS  : ${fichiersJs.length} fichiers → ${nomJs} (${ko(vendeursCode + nosScriptsBrut)} → ${ko(js)})`);
