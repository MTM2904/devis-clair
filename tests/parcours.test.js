// Tests de bout en bout de Devis Clair (Chromium via Playwright).
// Lancer : npm test   (prérequis : npm install, puis npx playwright install chromium)
'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { chromium } = require('playwright');
const { creerServeur } = require('../scripts/serve.js');

const RACINE = path.resolve(__dirname, '..');
const URL_FICHIER = 'file://' + path.join(RACINE, 'index.html');
const AXE = require.resolve('axe-core/axe.min.js');

let navigateur;
let serveur;
let urlHttp;

before(async () => {
  navigateur = await chromium.launch();
  serveur = creerServeur();
  await new Promise((ok) => serveur.listen(0, '127.0.0.1', ok));
  urlHttp = `http://127.0.0.1:${serveur.address().port}/`;
});

after(async () => {
  await navigateur?.close();
  await new Promise((ok) => serveur.close(ok));
});

// Ouvre une page en enregistrant les erreurs, les requêtes réseau et les appels à window.print().
async function ouvrir(options = {}) {
  const contexte = await navigateur.newContext(options.contexte || {});
  const page = await contexte.newPage();
  const journal = { erreurs: [], requetes: [] };
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') journal.erreurs.push(m.text()); });
  page.on('pageerror', (e) => journal.erreurs.push(e.message));
  page.on('request', (r) => journal.requetes.push(r.url()));
  await page.addInitScript(() => {
    window.__impressions = 0;
    window.print = () => { window.__impressions += 1; };
  });
  await page.goto(options.url || URL_FICHIER);
  return { page, contexte, journal };
}

// La boîte de confirmation applique le choix à l'événement « close », qui est asynchrone.
async function attendreFermeture(page) {
  await page.waitForFunction(() => !document.getElementById('confirmation').open);
  await page.evaluate(() => new Promise((ok) => setTimeout(ok, 0)));
}

async function textesListe(page, section) {
  return page.locator(`.sheet-section-${section} li`).allInnerTexts();
}

async function analyseAxe(page) {
  await page.addScriptTag({ path: AXE });
  return page.evaluate(async () => {
    const r = await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] });
    return r.violations.map((v) => `${v.id} (${v.nodes.length}) : ${v.help}`);
  });
}

function texteDuPdf(tampon) {
  const fichier = path.join(os.tmpdir(), `devis-clair-${process.pid}-${Date.now()}.pdf`);
  fs.writeFileSync(fichier, tampon);
  try {
    const texte = execFileSync('pdftotext', ['-layout', fichier, '-'], { encoding: 'utf8' });
    const pages = texte.split('\f').filter((p) => p.trim() !== '');
    return { texte, pages };
  } finally {
    fs.unlinkSync(fichier);
  }
}

function pdftotextDisponible() {
  try { execFileSync('pdftotext', ['-v'], { stdio: 'ignore' }); return true; } catch { return false; }
}

test('la page se charge sans erreur, sans requête externe, en fichier local comme en http', async () => {
  for (const url of [URL_FICHIER, null]) {
    const { page, contexte, journal } = await ouvrir({ url: url || urlHttp });
    await page.click('#btn-exemple');
    await page.fill('#titre', 'Test réseau');
    assert.deepEqual(journal.erreurs, [], 'aucune erreur ni violation CSP');
    const base = url ? 'file://' : urlHttp;
    const externes = journal.requetes.filter((r) => !r.startsWith(base));
    assert.deepEqual(externes, [], 'aucune requête hors des fichiers de l\'application');
    await contexte.close();
  }
});

test('fiche vide : message d\'attente et erreurs accessibles à l\'impression', async () => {
  const { page, contexte } = await ouvrir();
  assert.match(await page.locator('#fiche').innerText(), /apparaîtront ici/);

  await page.click('#btn-imprimer');
  assert.equal(await page.evaluate(() => window.__impressions), 0, 'pas d\'impression avec un formulaire vide');
  assert.equal(await page.locator('#resume-erreurs').isVisible(), true);
  assert.equal(await page.evaluate(() => document.activeElement.id), 'resume-erreurs', 'le résumé reçoit le focus');
  assert.equal(await page.getAttribute('#titre', 'aria-invalid'), 'true');
  assert.match(await page.locator('#titre-erreur').innerText(), /titre du projet/);
  assert.equal(await page.locator('#liste-erreurs li').count(), 2);

  // Le lien du résumé amène au champ concerné.
  await page.click('#liste-erreurs li:first-child a');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'titre');

  // Les erreurs disparaissent au fil des corrections.
  await page.fill('#titre', 'Salle de bains');
  assert.equal(await page.getAttribute('#titre', 'aria-invalid'), null);
  assert.equal(await page.locator('#liste-erreurs li').count(), 1);
  await page.fill('#exclusions', 'Carrelage');
  assert.equal(await page.locator('#resume-erreurs').isVisible(), false);

  await page.click('#btn-imprimer');
  assert.equal(await page.evaluate(() => window.__impressions), 1);
  await contexte.close();
});

test('la fiche reprend fidèlement la saisie, sans rien ajouter', async () => {
  const { page, contexte } = await ouvrir();
  await page.fill('#titre', '  Cuisine équipée  ');
  await page.fill('#reference', 'D-2026/042');
  await page.fill('#inclus', 'Pose des meubles\n\n- Raccordement de l\'évier\n   \n• Plan de travail stratifié');
  await page.fill('#etapes', '1. Signature\n2) Métré\nLivraison');

  assert.equal(await page.locator('.sheet-title').innerText(), 'Cuisine équipée');
  assert.equal(await page.locator('.sheet-ref').innerText(), 'Devis n°\u00a0D-2026/042');
  assert.match(await page.locator('.sheet-disclaimer').innerText(), /accompagne le devis n°\u00a0D-2026\/042 et ne le remplace pas/);
  assert.deepEqual(await textesListe(page, 'inclus'), ['Pose des meubles', 'Raccordement de l\'évier', 'Plan de travail stratifié']);
  assert.deepEqual(await textesListe(page, 'etapes'), ['Signature', 'Métré', 'Livraison']);
  assert.equal(await page.locator('.sheet-section-etapes ol').count(), 1, 'les étapes sont numérotées');
  // Les rubriques vides n'apparaissent pas.
  for (const s of ['options', 'exclusions', 'confirmer']) {
    assert.equal(await page.locator(`.sheet-section-${s}`).count(), 0);
  }
  // Aucun chiffre ajouté : tous les chiffres de la fiche viennent de la saisie ou de la date.
  const corps = await page.locator('#fiche').innerText();
  const sansPied = corps.replace(/Fiche préparée le .*/, '');
  const chiffres = (sansPied.match(/\d+/g) || []).sort();
  assert.deepEqual(chiffres, ['042', '2026', '042', '2026'].sort(), 'aucun montant ni délai inventé');
  assert.doesNotMatch(corps, /€|HT|TTC|jours|semaines/);
  await contexte.close();
});

test('une saisie qui ressemble à du HTML est affichée comme du texte, jamais exécutée', async () => {
  const { page, contexte, journal } = await ouvrir();
  const pieges = [
    '<img src=x onerror="window.__xss=1">',
    '<script>window.__xss=2</script>',
    '"><svg onload="window.__xss=3">',
    '<a href="javascript:window.__xss=4">clic</a>',
    '<b>gras</b> &amp; &lt;i&gt; &#60;u&#62;',
    '{{7*7}} ${7*7} <!-- commentaire -->',
    '<style>body{display:none}</style>'
  ];
  await page.fill('#titre', pieges[0]);
  await page.fill('#reference', pieges[2]);
  await page.fill('#inclus', pieges.join('\n'));
  await page.waitForTimeout(200);

  assert.equal(await page.evaluate(() => window.__xss), undefined);
  assert.equal(await page.locator('#fiche img, #fiche script, #fiche svg, #fiche a, #fiche b, #fiche style').count(), 0);
  assert.equal(await page.locator('.sheet-title').innerText(), pieges[0]);
  assert.deepEqual(await textesListe(page, 'inclus'), pieges);
  assert.equal(await page.title(), pieges[0] + ' · Devis Clair · par MB Explain');
  assert.equal(await page.locator('body').isVisible(), true);
  assert.deepEqual(journal.erreurs, []);
  await contexte.close();
});

test('caractères spéciaux : accents, symboles, émojis, écritures non latines', async () => {
  const { page, contexte } = await ouvrir();
  const lignes = [
    'Œuvre « clé en main » — façade, cœur, ÇÀÉÈÊËÎÏÔÙÛÜŸ',
    'Prix indiqué sur le devis : 1 250,00 € HT (texte saisi)',
    'Émojis 🪟🔧✅ et symboles ½ ¾ ² ° ± × ÷ ≥ ≤ ‰',
    'Guillemets "droits" et \'simples\', barres \\ / | et tabulation\tici',
    'Écritures : 日本語, العربية, Ελληνικά, עברית',
    'Espace insécable : 15 m² et caractère invisible ​ ici'
  ];
  await page.fill('#titre', 'Fenêtres & volets — l\'atelier « Été »');
  await page.fill('#options', lignes.join('\n'));
  assert.equal(await page.locator('.sheet-title').innerText(), 'Fenêtres & volets — l\'atelier « Été »');
  const affiche = await page.locator('.sheet-section-options li').evaluateAll((els) => els.map((e) => e.textContent));
  assert.deepEqual(affiche, lignes);
  await contexte.close();
});

test('exemple fictif : chargé, signalé sur l\'écran et sur le PDF, puis effacé', async () => {
  const { page, contexte } = await ouvrir();
  await page.click('#btn-exemple');
  assert.equal(await page.inputValue('#titre'), 'Remplacement de deux fenêtres');
  assert.equal(await page.locator('#notice-exemple').isVisible(), true);
  assert.equal(await page.locator('.sheet-example').count(), 1);
  assert.equal(await page.locator('.sheet-footer-example').count(), 1);
  // Aucun montant dans l'exemple.
  assert.doesNotMatch(await page.locator('#fiche').innerText(), /€|\bHT\b|TTC/);

  // La mention reste même après modification du texte.
  await page.fill('#titre', 'Autre titre');
  assert.equal(await page.locator('.sheet-example').count(), 1);

  if (pdftotextDisponible()) {
    await page.emulateMedia({ media: 'print' });
    const { pages } = texteDuPdf(await page.pdf({ format: 'A4', preferCSSPageSize: true, printBackground: true }));
    assert.match(pages[0], /EXEMPLE FICTIF/);
    assert.match(pages.at(-1), /Exemple fictif\s?: ne correspond à aucun client/);
    assert.match(pages[0], /ne le remplace pas/);
    await page.emulateMedia({ media: 'screen' });
  }

  page.once('dialog', () => assert.fail('pas de boîte native attendue'));
  await page.click('#btn-vider');
  assert.equal(await page.locator('#confirmation').isVisible(), true);
  await page.click('#confirmation-ok');
  await attendreFermeture(page);
  assert.equal(await page.inputValue('#titre'), '');
  assert.equal(await page.locator('#notice-exemple').isVisible(), false);
  assert.equal(await page.locator('.sheet-example').count(), 0);
  await contexte.close();
});

test('confirmation avant d\'écraser une saisie : Échap ou Annuler conservent tout', async () => {
  const { page, contexte } = await ouvrir();
  // Formulaire vide : pas de question inutile.
  await page.click('#btn-exemple');
  assert.equal(await page.locator('#confirmation').isVisible(), false);
  await page.click('#btn-vider');
  await page.click('#confirmation-ok');
  await attendreFermeture(page);

  await page.fill('#inclus', 'Ma saisie importante');
  await page.click('#btn-exemple');
  assert.equal(await page.locator('#confirmation').isVisible(), true);
  assert.equal(await page.evaluate(() => document.activeElement.id), 'confirmation-annuler', 'le choix prudent a le focus');
  await page.keyboard.press('Escape');
  await attendreFermeture(page);
  assert.equal(await page.locator('#confirmation').isVisible(), false);
  assert.equal(await page.inputValue('#inclus'), 'Ma saisie importante');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'btn-exemple', 'le focus revient au bouton');

  await page.click('#btn-vider');
  await page.click('#confirmation-annuler');
  await attendreFermeture(page);
  assert.equal(await page.inputValue('#inclus'), 'Ma saisie importante');

  await page.click('#btn-exemple');
  await page.click('#confirmation-ok');
  await attendreFermeture(page);
  assert.equal(await page.inputValue('#titre'), 'Remplacement de deux fenêtres');
  await contexte.close();
});

test('parcours complet au clavier seul', async () => {
  const { page, contexte } = await ouvrir();
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement.className), 'skip-link');
  const ordre = [];
  for (let i = 0; i < 12; i += 1) {
    await page.keyboard.press('Tab');
    ordre.push(await page.evaluate(() => document.activeElement.id || document.activeElement.textContent.trim()));
  }
  assert.deepEqual(ordre.slice(0, 10), [
    'btn-exemple', 'btn-vider', 'titre', 'reference', 'inclus', 'options', 'exclusions', 'confirmer', 'etapes',
    'Imprimer ou enregistrer en PDF'
  ]);

  // Saisie et impression sans souris.
  await page.focus('#titre');
  await page.keyboard.type('Terrasse bois');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.type('Lames en pin');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Lambourdes');
  assert.deepEqual(await textesListe(page, 'inclus'), ['Lames en pin', 'Lambourdes']);
  await page.focus('#titre');
  await page.keyboard.press('Enter'); // Entrée dans un champ texte envoie le formulaire = impression
  assert.equal(await page.evaluate(() => window.__impressions), 1);

  // Boîte de confirmation au clavier.
  await page.focus('#btn-vider');
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('#confirmation').isVisible(), true);
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'confirmation-ok');
  await page.keyboard.press('Enter');
  await attendreFermeture(page);
  assert.equal(await page.inputValue('#titre'), '');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'titre');

  // Lien d'évitement vers l'aperçu, depuis une page fraîchement chargée.
  await page.goto(URL_FICHIER);
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'apercu');
  await contexte.close();
});

test('mobile (390 px) : pas de défilement horizontal, cibles tactiles suffisantes', async () => {
  const { page, contexte } = await ouvrir({
    contexte: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
  });
  await page.click('#btn-exemple');
  await page.fill('#confirmer', 'Mot très long sans espace : ' + 'Aluminiumbeschichtungsverfahren'.repeat(8));
  const largeur = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, vue: window.innerWidth }));
  assert.ok(largeur.doc <= largeur.vue, `largeur ${largeur.doc} > ${largeur.vue}`);
  const petites = await page.$$eval('button, a.btn, input, textarea', (els) => els
    .filter((e) => e.offsetParent !== null)
    .map((e) => ({ id: e.id || e.textContent.trim(), h: e.getBoundingClientRect().height }))
    .filter((t) => t.h < 40));
  assert.deepEqual(petites, []);
  // L'aperçu est sous le formulaire et joignable par le bouton dédié.
  await page.tap('a.mobile-only');
  await page.waitForTimeout(800);
  const haut = await page.locator('#apercu').evaluate((e) => e.getBoundingClientRect().top);
  assert.ok(Math.abs(haut) < 60, `aperçu en haut d'écran (top=${haut})`);
  await contexte.close();
});

test('contenu long : impression A4 sur plusieurs pages, sans texte coupé ni perdu', async (t) => {
  if (!pdftotextDisponible()) { t.skip('pdftotext absent'); return; }
  const { page, contexte } = await ouvrir();
  const lignes = Array.from({ length: 70 }, (_, i) => `Prestation n° ${i + 1} : ${'description détaillée de la prestation '.repeat(3).trim()}`);
  await page.fill('#titre', 'Rénovation complète d\'une maison de ville avec un titre volontairement long pour vérifier le retour à la ligne');
  await page.fill('#inclus', lignes.join('\n'));
  await page.fill('#exclusions', 'Motsansespace'.repeat(30));
  await page.fill('#etapes', Array.from({ length: 25 }, (_, i) => `Étape ${i + 1}`).join('\n'));

  await page.emulateMedia({ media: 'print' });
  assert.equal(await page.locator('#formulaire').isVisible(), false, 'le formulaire n\'est pas imprimé');
  assert.equal(await page.locator('.site-header').isVisible(), false);
  const debord = await page.locator('#fiche').evaluate((e) => e.scrollWidth - e.clientWidth);
  assert.ok(debord <= 0, `débordement horizontal de ${debord}px`);

  const tampon = await page.pdf({ format: 'A4', preferCSSPageSize: true, printBackground: true });
  fs.mkdirSync(path.join(RACINE, 'test-results'), { recursive: true });
  fs.writeFileSync(path.join(RACINE, 'test-results', 'fiche-longue.pdf'), tampon);
  const { texte, pages } = texteDuPdf(tampon);
  assert.ok(pages.length >= 3, `au moins 3 pages A4 (obtenu ${pages.length})`);
  const compact = texte.replace(/\s+/g, '');
  for (const n of [1, 35, 70]) assert.ok(compact.includes(`Prestationn°${n}:`), `prestation ${n} présente`);
  assert.ok(compact.includes('Étape25'));
  assert.ok(compact.includes('Motsansespace'.repeat(30)), 'le mot très long est entier');
  assert.ok(compact.includes('Fichepréparéele'), 'le pied de fiche est imprimé');
  assert.match(pages[0], /ne le remplace pas/);
  await contexte.close();
});

test('un long texte collé n\'est jamais tronqué', async () => {
  const { page, contexte } = await ouvrir();
  const long = Array.from({ length: 400 }, (_, i) => `Ligne ${i + 1} ${'x'.repeat(60)}`).join('\n');
  await page.fill('#inclus', long);
  assert.equal((await page.inputValue('#inclus')).length, long.length);
  assert.equal(await page.locator('.sheet-section-inclus li').count(), 400);
  assert.match(await page.locator('.sheet-section-inclus li').last().innerText(), /^Ligne 400 /);
  await contexte.close();
});

test('aucun stockage : ni localStorage, ni sessionStorage, ni cookies, ni IndexedDB', async () => {
  const { page, contexte } = await ouvrir({ url: urlHttp });
  await page.click('#btn-exemple');
  await page.fill('#titre', 'Donnée sensible fictive');
  const etat = await page.evaluate(async () => ({
    local: localStorage.length,
    session: sessionStorage.length,
    cookies: document.cookie,
    idb: indexedDB.databases ? (await indexedDB.databases()).length : 0
  }));
  assert.deepEqual(etat, { local: 0, session: 0, cookies: '', idb: 0 });
  const etatContexte = await contexte.storageState();
  assert.deepEqual(etatContexte.cookies, []);
  assert.ok(etatContexte.origins.every((o) => o.localStorage.length === 0));
  // Après rechargement, rien n'est revenu.
  page.on('dialog', (d) => d.accept());
  await page.reload();
  assert.equal(await page.inputValue('#titre'), '');
  await contexte.close();
});

test('accessibilité automatique (axe-core) : aucun problème détecté dans les états clés', async () => {
  // bypassCSP permet d'injecter axe-core pour l'analyse ; l'application elle-même reste sous CSP stricte.
  const { page, contexte } = await ouvrir({ url: urlHttp, contexte: { bypassCSP: true } });
  assert.deepEqual(await analyseAxe(page), [], 'état initial');
  await page.click('#btn-imprimer');
  assert.deepEqual(await analyseAxe(page), [], 'état avec erreurs');
  await page.click('#btn-exemple');
  assert.deepEqual(await analyseAxe(page), [], 'exemple chargé');
  await page.click('#btn-vider');
  assert.deepEqual(await analyseAxe(page), [], 'boîte de confirmation ouverte');
  await page.keyboard.press('Escape');
  await attendreFermeture(page);
  await page.setViewportSize({ width: 390, height: 844 });
  assert.deepEqual(await analyseAxe(page), [], 'format mobile');
  await contexte.close();
});
