# Contribuer à Devis Clair

Merci de votre intérêt ! Devis Clair veut rester un outil simple, gratuit et entièrement local. Ce guide explique comment proposer une amélioration.

## Avant de commencer

- Pour un bug ou une idée, ouvrez d'abord une *issue* pour en discuter, surtout si le changement est important.
- **N'ajoutez jamais de vraies données** dans une issue, une capture, un test ou un exemple : pas de vrai devis, nom de client, adresse, téléphone ou montant réel. Recréez le problème avec des données inventées.
- Pour une faille de sécurité, ne créez pas d'issue publique : suivez [SECURITY.md](SECURITY.md).

## Les principes du projet

Toute contribution doit respecter ces règles :

1. **Tout reste local.** Aucun serveur, compte, appel réseau, outil de statistiques, police ou script externe, ni appel à une IA. La politique de sécurité du contenu (CSP) de `index.html` doit rester stricte (`connect-src 'none'`, pas de `'unsafe-inline'`).
2. **Rien n'est stocké automatiquement.** Pas de `localStorage`, `sessionStorage`, cookies ni IndexedDB. Une future sauvegarde devra être un choix explicite de l'utilisateur (par exemple un fichier qu'il télécharge).
3. **La saisie n'est jamais du HTML.** Utilisez `textContent` et `document.createElement`, jamais `innerHTML`, `insertAdjacentHTML`, `document.write` ou `eval` avec du texte saisi.
4. **La fiche est fidèle.** Elle n'ajoute aucun montant, délai, engagement ou détail technique. La mention « accompagne le devis et ne le remplace pas » reste visible.
5. **Accessible et sobre.** Champs étiquetés, navigation au clavier, contrastes suffisants, pas d'animation lourde.
6. **Peu de dépendances.** L'application fonctionne sans aucune dépendance ; les outils de développement doivent rester l'exception et être justifiés.

## Installer l'environnement

```bash
git clone https://github.com/MTM2904/devis-clair.git
cd devis-clair
npm install
npx playwright install chromium
npm start      # http://127.0.0.1:8080/
npm test
```

Le test d'impression longue utilise `pdftotext` (paquet `poppler-utils` sous Linux, `brew install poppler` sous macOS). Il est ignoré si l'outil est absent.

## Proposer un changement

1. Créez une branche depuis `main` (`git switch -c correction-impression`).
2. Faites un changement ciblé, dans le style du code existant (JavaScript sans framework, noms en français, commentaires courts).
3. Ajoutez ou adaptez un test dans `tests/` si le comportement change.
4. Lancez `npm test` et vérifiez l'aperçu et l'impression à la main dans au moins un navigateur.
5. Ouvrez une *pull request* qui explique le problème, la solution et ce que vous avez testé (navigateurs, mobile, clavier).

## Style

- Indentation de 2 espaces, fins de ligne LF, UTF-8 (voir `.editorconfig`).
- Textes de l'interface en français, avec la typographie française (espaces insécables avant `:`, `?`, `!` et dans les guillemets « »).
- Couleurs de la charte : anthracite `#292827`, jaune moutarde `#e3ab00`, blanc cassé `#f7f4ec`. Le jaune moutarde ne sert jamais de couleur de texte sur fond clair (contraste insuffisant).

## Licence

En contribuant, vous acceptez que votre contribution soit publiée sous la licence [MIT](LICENSE) du projet. Le nom et le logo MB Explain ne sont pas concernés : voir [MARQUE.md](MARQUE.md).
