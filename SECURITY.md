# Sécurité

Devis Clair fonctionne entièrement dans le navigateur et ne transmet aucune donnée. Une faille reste possible, par exemple un texte saisi qui serait interprété comme du HTML, ou une modification qui ferait sortir des données de la page. Merci de nous aider à les corriger.

## Signaler un problème

**Ne publiez pas le détail d'une faille dans une issue publique.**

Utilisez le signalement privé de GitHub : onglet **Security** du dépôt, puis **Report a vulnerability**. Seuls les responsables du dépôt verront votre message.

Si ce bouton n'est pas disponible, ouvrez une issue publique intitulée « Demande de contact sécurité », **sans aucun détail technique**, pour demander un canal privé.

## Ce qu'il faut joindre, et ce qu'il ne faut pas joindre

- Décrivez le problème, le navigateur et les étapes pour le reproduire.
- Utilisez uniquement des données inventées. **N'envoyez jamais** de vrai devis, nom de client, adresse, numéro de téléphone, montant réel, PDF de client ou capture contenant ces informations.
- Ne joignez aucun mot de passe, jeton ou clé.

## Versions concernées

Seule la dernière version de la branche `main` est suivie.

## Périmètre

Sont notamment dans le périmètre :

- l'exécution d'un texte saisi comme HTML ou script ;
- toute transmission ou tout stockage de la saisie sans action explicite de l'utilisateur ;
- un contournement de la politique de sécurité du contenu (CSP) de la page.

Hors périmètre : la sécurité de l'ordinateur ou du navigateur de l'utilisateur, et des PDF qu'il enregistre lui-même.
