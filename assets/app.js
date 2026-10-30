/*
 * Devis Clair · par MB Explain
 * Licence MIT (voir LICENSE). Le nom et le logo MB Explain ne sont pas couverts par cette licence.
 *
 * Règles de ce fichier :
 * - le texte saisi n'est jamais inséré comme HTML : uniquement textContent ;
 * - aucune donnée n'est stockée ni transmise (pas de localStorage, pas de réseau) ;
 * - la fiche reprend la saisie telle quelle, sans rien ajouter au contenu du devis.
 */
(function () {
  'use strict';

  var SECTIONS = [
    { id: 'inclus', titre: 'Inclus dans le devis', liste: 'ul' },
    { id: 'options', titre: 'Options proposées', liste: 'ul' },
    { id: 'exclusions', titre: 'Non inclus', liste: 'ul' },
    { id: 'confirmer', titre: 'À confirmer ensemble', liste: 'ul' },
    { id: 'etapes', titre: 'Prochaines étapes', liste: 'ol' }
  ];

  var CHAMPS = ['titre', 'reference'].concat(SECTIONS.map(function (s) { return s.id; }));

  // Exemple entièrement fictif : aucune entreprise, personne, adresse ni montant réels.
  var EXEMPLE = {
    titre: 'Remplacement de deux fenêtres',
    reference: 'EXEMPLE-0001',
    inclus: [
      'Dépose des deux fenêtres existantes (salon et chambre)',
      'Fourniture et pose de deux fenêtres PVC double vitrage, aux dimensions relevées lors de la visite',
      'Reprise de l\'étanchéité autour des nouvelles fenêtres',
      'Évacuation des anciennes fenêtres et nettoyage en fin de chantier'
    ].join('\n'),
    options: [
      'Volet roulant électrique sur la fenêtre du salon',
      'Poignées avec verrouillage à clé'
    ].join('\n'),
    exclusions: [
      'Peinture et tapisserie autour des fenêtres après la pose',
      'Reprise de maçonnerie si le support est abîmé (constat possible seulement à la dépose)',
      'Remplacement des appuis de fenêtre'
    ].join('\n'),
    confirmer: [
      'Couleur des fenêtres côté extérieur',
      'Sens d\'ouverture de la fenêtre de la chambre',
      'Accès et stationnement le jour de la pose'
    ].join('\n'),
    etapes: [
      'Signature du devis',
      'Visite technique pour confirmer les mesures',
      'Commande des fenêtres',
      'Pose',
      'Vérification du fonctionnement avec vous'
    ].join('\n')
  };

  var etat = { exemple: false };

  function $(id) { return document.getElementById(id); }

  function el(tag, className, texte) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (texte !== undefined) node.textContent = texte;
    return node;
  }

  // Découpe un champ en points : une ligne = un point. Les puces ou numéros
  // tapés en début de ligne sont retirés, la liste les remet d'elle-même.
  function versPoints(valeur) {
    return String(valeur || '')
      .split(/\r?\n/)
      .map(function (ligne) {
        return ligne.replace(/^\s*(?:[-*•–—]|\d{1,3}[.)])\s+/, '').trim();
      })
      .filter(function (ligne) { return ligne.length > 0; });
  }

  function lireFormulaire() {
    var donnees = {};
    CHAMPS.forEach(function (id) { donnees[id] = $(id).value; });
    return donnees;
  }

  function formulaireVide() {
    return CHAMPS.every(function (id) { return $(id).value.trim() === ''; });
  }

  function dateDuJour() {
    try {
      return new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch (e) {
      return new Date().toISOString().slice(0, 10);
    }
  }

  function rendreFiche() {
    var d = lireFormulaire();
    var fiche = $('fiche');
    var titre = d.titre.trim();
    var reference = d.reference.trim();
    var sectionsRemplies = SECTIONS
      .map(function (s) { return { section: s, points: versPoints(d[s.id]) }; })
      .filter(function (r) { return r.points.length > 0; });

    var contenu = document.createDocumentFragment();

    if (etat.exemple) {
      contenu.appendChild(el('p', 'sheet-example', 'Exemple fictif — données inventées pour la démonstration'));
    }

    var entete = el('header', 'sheet-header');
    entete.appendChild(el('p', 'sheet-kicker', 'Fiche explicative'));
    entete.appendChild(el('h3', 'sheet-title' + (titre ? '' : ' is-placeholder'), titre || 'Titre du projet'));
    if (reference) {
      entete.appendChild(el('p', 'sheet-ref', 'Devis n°\u00a0' + reference));
    }
    contenu.appendChild(entete);

    var mention = reference
      ? 'Cette fiche accompagne le devis n°\u00a0' + reference + ' et ne le remplace pas. Le devis reste le document de référence.'
      : 'Cette fiche accompagne le devis et ne le remplace pas. Le devis reste le document de référence.';
    contenu.appendChild(el('p', 'sheet-disclaimer', mention));

    if (sectionsRemplies.length === 0) {
      contenu.appendChild(el('p', 'sheet-empty', 'Les prestations, options, exclusions, points à confirmer et étapes apparaîtront ici au fil de la saisie.'));
    }

    sectionsRemplies.forEach(function (r) {
      var s = r.section;
      var bloc = el('section', 'sheet-section sheet-section-' + s.id);
      bloc.appendChild(el('h4', 'sheet-section-title', s.titre));
      var liste = el(s.liste, 'sheet-list');
      r.points.forEach(function (point) {
        liste.appendChild(el('li', null, point));
      });
      bloc.appendChild(liste);
      contenu.appendChild(bloc);
    });

    var pied = el('footer', 'sheet-footer');
    pied.appendChild(el('p', null, 'Fiche préparée le ' + dateDuJour() + ' avec Devis Clair · par MB Explain.'));
    if (etat.exemple) {
      pied.appendChild(el('p', 'sheet-footer-example', 'Exemple fictif\u00a0: ne correspond à aucun client ni aucune entreprise réels.'));
    }
    contenu.appendChild(pied);

    fiche.replaceChildren ? fiche.replaceChildren(contenu) : (fiche.textContent = '', fiche.appendChild(contenu));
    fiche.classList.toggle('is-example', etat.exemple);

    document.title = (titre ? titre + ' · ' : '') + 'Devis Clair · par MB Explain';
  }

  // --- Erreurs accessibles -------------------------------------------------

  function verifier() {
    var erreurs = [];
    var titre = $('titre');
    if (titre.value.trim() === '') {
      erreurs.push({ champ: titre, message: 'Indiquez le titre du projet.' });
    }
    var sectionsRemplies = SECTIONS.some(function (s) { return versPoints($(s.id).value).length > 0; });
    if (!sectionsRemplies) {
      erreurs.push({ champ: $('inclus'), message: 'Remplissez au moins une rubrique\u00a0: prestations, options, exclusions, points à confirmer ou étapes.' });
    }
    return erreurs;
  }

  function afficherErreurs(erreurs, donnerFocus) {
    var resume = $('resume-erreurs');
    var liste = $('liste-erreurs');
    liste.textContent = '';

    var titre = $('titre');
    var erreurTitre = $('titre-erreur');
    var surTitre = erreurs.filter(function (e) { return e.champ === titre; })[0];
    if (surTitre) {
      erreurTitre.textContent = surTitre.message;
      erreurTitre.hidden = false;
      titre.setAttribute('aria-invalid', 'true');
    } else {
      erreurTitre.textContent = '';
      erreurTitre.hidden = true;
      titre.removeAttribute('aria-invalid');
    }

    if (erreurs.length === 0) {
      resume.hidden = true;
      return;
    }
    erreurs.forEach(function (e) {
      var li = el('li');
      var lien = el('a', null, e.message);
      lien.href = '#' + e.champ.id;
      lien.addEventListener('click', function (evt) {
        evt.preventDefault();
        e.champ.focus();
      });
      li.appendChild(lien);
      liste.appendChild(li);
    });
    resume.hidden = false;
    if (donnerFocus !== false) resume.focus();
  }

  function imprimer() {
    var erreurs = verifier();
    afficherErreurs(erreurs);
    if (erreurs.length > 0) return;
    rendreFiche();
    window.print();
  }

  // --- Confirmation avant d'écraser ----------------------------------------

  function confirmer(texteBouton, suite) {
    if (formulaireVide()) {
      suite();
      return;
    }
    var dialog = $('confirmation');
    if (!dialog || typeof dialog.showModal !== 'function') {
      if (window.confirm('Le texte déjà saisi sera effacé. Continuer\u00a0?')) suite();
      return;
    }
    $('confirmation-ok').textContent = texteBouton;
    var declencheur = document.activeElement;
    dialog.returnValue = '';
    dialog.addEventListener('close', function surFermeture() {
      dialog.removeEventListener('close', surFermeture);
      if (dialog.returnValue === 'ok') {
        suite();
      } else if (declencheur && typeof declencheur.focus === 'function') {
        // Annulation : le focus revient sur le bouton qui a ouvert la boîte.
        declencheur.focus();
      }
    });
    dialog.showModal();
    $('confirmation-annuler').focus();
  }

  function remplir(donnees, exemple) {
    CHAMPS.forEach(function (id) { $(id).value = donnees[id] || ''; });
    etat.exemple = exemple;
    $('notice-exemple').hidden = !exemple;
    afficherErreurs([]);
    rendreFiche();
  }

  // --- Démarrage -----------------------------------------------------------

  function init() {
    var formulaire = $('formulaire');

    formulaire.addEventListener('input', function () {
      rendreFiche();
      // Les erreurs affichées se mettent à jour dès qu'elles sont corrigées.
      if (!$('resume-erreurs').hidden) afficherErreurs(verifier(), false);
    });

    formulaire.addEventListener('submit', function (evt) {
      evt.preventDefault();
      imprimer();
    });

    $('btn-imprimer').addEventListener('click', imprimer);

    $('btn-exemple').addEventListener('click', function () {
      confirmer('Charger l\'exemple', function () { remplir(EXEMPLE, true); $('titre').focus(); });
    });

    $('btn-vider').addEventListener('click', function () {
      confirmer('Vider le formulaire', function () { remplir({}, false); $('titre').focus(); });
    });

    // Rien n'est enregistré : on prévient avant de quitter la page avec une saisie en cours.
    window.addEventListener('beforeunload', function (evt) {
      if (!formulaireVide()) {
        evt.preventDefault();
        evt.returnValue = '';
      }
    });

    rendreFiche();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
