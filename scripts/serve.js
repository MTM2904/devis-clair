#!/usr/bin/env node
// Petit serveur statique sans dépendance, pour tester Devis Clair en local.
// Il n'écoute que sur 127.0.0.1 et ne journalise aucune saisie (l'application n'envoie rien).
'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const RACINE = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT) || 8080;
const HOTE = '127.0.0.1';
const PUBLIC = new Set(['/index.html', '/assets/app.js', '/assets/styles.css', '/assets/icon.svg']);
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml'
};

function creerServeur() {
  return http.createServer((req, res) => {
    let chemin;
    try {
      chemin = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    } catch {
      res.writeHead(400).end();
      return;
    }
    if (chemin === '/') chemin = '/index.html';
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405).end();
      return;
    }
    if (!PUBLIC.has(chemin)) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Introuvable');
      return;
    }
    const fichier = path.join(RACINE, chemin);
    fs.readFile(fichier, (err, contenu) => {
      if (err) {
        res.writeHead(500).end();
        return;
      }
      res.writeHead(200, {
        'Content-Type': TYPES[path.extname(fichier)],
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer'
      });
      res.end(req.method === 'HEAD' ? undefined : contenu);
    });
  });
}

if (require.main === module) {
  creerServeur().listen(PORT, HOTE, () => {
    console.log(`Devis Clair : http://${HOTE}:${PORT}/  (Ctrl+C pour arrêter)`);
  });
}

module.exports = { creerServeur };
