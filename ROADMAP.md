# Feuille de route

## Livré (version 0.1.0)

- Formulaire : titre, référence facultative, prestations incluses, options, exclusions, points à confirmer, prochaines étapes.
- Aperçu de la fiche pendant la saisie, rubriques vides masquées.
- Impression A4 et enregistrement en PDF par le navigateur, contenus longs sur plusieurs pages.
- Mention « accompagne le devis et ne le remplace pas » sur chaque fiche.
- Exemple fictif signalé à l'écran et à l'impression, bouton « Formulaire vide », confirmation avant d'écraser une saisie.
- Fonctionnement 100 % local : aucun serveur, compte, suivi ni stockage, CSP stricte.
- Accessibilité de base : clavier, étiquettes, erreurs accessibles, contrastes ; adapté au mobile.
- Tests de bout en bout dans Chromium (Playwright, axe-core).

## Idées pour la suite (non engagées)

Ces pistes ne sont ni promises ni datées. Elles restent soumises aux principes de [CONTRIBUTING.md](CONTRIBUTING.md) : local, sans stockage automatique, fiche fidèle.

- Exporter et réimporter sa saisie dans un fichier, à la demande de l'utilisateur, pour la reprendre plus tard.
- Ajouter le nom de l'entreprise et son logo sur la fiche, à partir d'un fichier choisi par l'utilisateur.
- Courtes explications facultatives sous chaque point (« pourquoi c'est inclus »).
- Lexique facultatif pour expliquer un terme technique saisi par l'utilisateur.
- Modèles de rubriques par métier (menuiserie, plomberie, électricité…), uniquement comme aide à la saisie.
- Version anglaise de l'interface et de la fiche.
- Tests automatiques dans Firefox et WebKit, et vérification sur papier.
- Fonctionnement hors ligne installable (PWA), sans aucun envoi de données.
