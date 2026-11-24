/* Sable Doré — textes de la page d'accueil, modifiables dans l'espace gérant (onglet « Mon site »).
   Les mots entre accolades sont remplacés automatiquement :
   {min} {heures} {meches} {compte} {banque} {titulaire} {juice} {juice_nom} {virement} {email} {tel} {marque} {societe} */
(function () {
  const F = [
    ["Haut de page", [
      ["hero_t1", "Titre (1re ligne)", "Le temps s'arrête."],
      ["hero_t2", "Titre (2e ligne, en doré)", "Vous créez."],
      ["hero_lead", "Texte d'introduction", "Une cire en sable de couleur que l'on verse, couche après couche, dans un simple bocal. On plante une mèche, on allume, et la bougie brûle. Choisissez vos couleurs, on vous livre en {heures} heures.", 1],
      ["hero_btn1", "Bouton principal", "Découvrir les couleurs"],
      ["hero_btn2", "Bouton secondaire", "Comment ça marche"]
    ]],
    ["Le rituel", [
      ["rit_title", "Titre", "Un rituel lent, fait de vos mains"],
      ["rit_lead", "Introduction", "Pas de cuisson, pas de moule, pas de cire chaude. Juste du sable de cire, un contenant que vous aimez et quelques minutes pour soi.", 1],
      ["s1_t", "Étape 1 : titre", "Versez"],
      ["s1_p", "Étape 1 : texte", "Choisissez un verre, une coupelle, un pot de confiture. Versez la première couleur, doucement.", 1],
      ["s2_t", "Étape 2 : titre", "Superposez"],
      ["s2_p", "Étape 2 : texte", "Ajoutez les couches, jouez avec les vagues et les contrastes. Il n'y a pas d'erreur possible.", 1],
      ["s3_t", "Étape 3 : titre", "Allumez"],
      ["s3_p", "Étape 3 : texte", "Plantez la mèche, allumez. Quand la bougie est finie, écrasez les morceaux durcis : ils redeviennent du sable, prêt à resservir.", 1],
      ["quote", "Citation", "« Quelques minutes où l'on ne fait qu'une chose : regarder le sable couler. »", 1]
    ]],
    ["La cire végétale", [
      ["veg_title", "Titre", "Une cire d'origine végétale"],
      ["veg_lead", "Introduction", "Notre sable de cire est fabriqué à partir d'huile de palme, une matière première végétale et renouvelable. Une bougie que l'on allume l'esprit tranquille.", 1],
      ["veg1_t", "Point 1 : titre", "D'origine végétale"],
      ["veg1_p", "Point 1 : texte", "Issue d'huile végétale renouvelable : l'huile de palme.", 1],
      ["veg2_t", "Point 2 : titre", "Sans paraffine"],
      ["veg2_p", "Point 2 : texte", "Aucune paraffine ni dérivé du pétrole.", 1],
      ["veg3_t", "Point 3 : titre", "Biosourcée et biodégradable"],
      ["veg3_p", "Point 3 : texte", "Une matière d'origine naturelle, qui se dégrade naturellement.", 1],
      ["veg4_t", "Point 4 : titre", "Vegan"],
      ["veg4_p", "Point 4 : texte", "Sans cire d'abeille ni ingrédient d'origine animale.", 1],
      ["reuse_t", "Réutilisable : titre", "Une bougie qui se réutilise"],
      ["reuse_p", "Réutilisable : texte", "Quand la bougie est finie, récupérez les morceaux de cire durcis, glissez-les dans un sachet en plastique et écrasez-les : ils redeviennent de la poudre. Ajoutez une nouvelle mèche, et votre sable est prêt à resservir. Rien ne se perd.", 1],
      ["veg_tip_t", "Astuce : titre", "Envie d'une bougie parfumée ?"],
      ["veg_tip", "Astuce : texte", "Comme c'est une matière naturelle, vous pouvez ajouter quelques gouttes de votre huile essentielle préférée au sable avant de le verser. Lavande pour le soir, citronnelle pour la terrasse, ylang-ylang pour la douceur : à vous de créer votre parfum.", 1]
    ]],
    ["Catalogue et idées", [
      ["cat_title", "Titre du catalogue", "Le catalogue des couleurs"],
      ["cat_lead", "Texte du catalogue", "Chaque couleur se commande à partir de {min}, ou en paquet d'1 kg. Mélangez-en autant que vous voulez : c'est le poids total qui fait baisser le prix. {meches} mèches sont offertes avec chaque commande ; vous pouvez en ajouter d'autres si besoin.", 1],
      ["cat_btn", "Bouton vers les idées", "Besoin d'inspiration ? Voir les idées à créer"],
      ["ideas_title", "Titre des idées", "Idées à créer"],
      ["ideas_lead", "Texte des idées", "Quelques idées pour vous inspirer. Choisissez ensuite vos couleurs dans le catalogue : chaque commande comprend {meches} mèches offertes.", 1],
      ["ideas_note", "Mention sous les idées", "Images d'inspiration. Votre commande comprend le sable de cire et les mèches ; contenants, fleurs et décoration ne sont pas inclus.", 1]
    ]],
    ["Bandeau d'appel à commander", [
      ["cta_title", "Titre", "Offrez-vous un moment qui ne ressemble qu'à vous"],
      ["cta_lead", "Texte", "Choisissez vos couleurs, on s'occupe du reste. Livraison en {heures} heures, {meches} mèches offertes.", 1],
      ["cta_btn", "Bouton", "Composer ma bougie"]
    ]],
    ["Tarifs et commande", [
      ["tarifs_title", "Titre des tarifs", "Plus vous composez, plus le gramme est doux"],
      ["tarifs_lead", "Texte des tarifs", "Le prix au gramme dépend du poids total de sable au détail dans votre commande, toutes couleurs confondues.", 1],
      ["order_title", "Titre de la commande", "Composer ma commande"],
      ["order_lead", "Texte de la commande", "Réglez la quantité de chaque couleur. Le bocal se remplit avec vos choix.", 1]
    ]],
    ["Paiement, livraison, service", [
      ["liv_title", "Titre de la section", "Paiement, livraison, service"],
      ["pay_t", "Paiement : titre", "Paiement par Juice ou virement"],
      ["pay_p", "Paiement : texte", "Payez le montant exact par Juice ou par virement sur notre compte {banque} n° {compte} ({titulaire}), en indiquant votre numéro de commande. Envoyez ensuite la capture d'écran ou le reçu sur le site : votre reçu de commande s'affiche aussitôt.", 1],
      ["del_t", "Livraison : titre", "Livraison en {heures} h maximum"],
      ["del_p", "Livraison : texte", "Votre commande est préparée dès la vérification de votre paiement et livrée à l'adresse indiquée en {heures} heures au plus.", 1],
      ["sup_t", "Support : titre", "Facture et support"],
      ["sup_p", "Support : texte", "Une facture est établie pour chaque commande payée. Une question, un souci de paiement ? Écrivez-nous à {email} ou appelez le {tel}.", 1]
    ]],
    ["La maison", [
      ["maison_title", "Titre", "La maison"],
      ["maison_p", "Présentation de la marque", "{marque} est une marque distribuée par {societe}. Une cire en sable importée, choisie pour ses couleurs, pour créer chez soi.", 1]
    ]]
  ].map(([group, fields]) => ({ group, fields: fields.map(f => ({ k: f[0], label: f[1], def: f[2], multi: !!f[3] })) }));
  const DEF = {}; F.forEach(g => g.fields.forEach(f => DEF[f.k] = f.def));

  function tokens(S) {
    const b = S.bank || {}, c = S.company;
    return {
      min: S.pricing.min_grams + " g", heures: S.delivery.hours, meches: +S.included_wicks || 0,
      juice: S.juice.number, juice_nom: S.juice.name, email: c.email, tel: c.phone, marque: c.brand, societe: c.name,
      compte: b.account_number || S.juice.number, banque: b.name || "bancaire", titulaire: b.account_name || c.name,
      virement: b.account_number ? ` ou par virement${b.name ? " " + b.name : ""}, compte n° ${b.account_number}` : ""
    };
  }
  const fill = (txt, T) => String(txt).replace(/\{(\w+)\}/g, (m, k) => k in T ? T[k] : m);

  /* Applique les textes sur la page (en texte brut, jamais en HTML) */
  function apply(S) {
    const C = S.content || {}, T = tokens(S);
    document.querySelectorAll("[data-c]").forEach(el => {
      const k = el.dataset.c, v = (C[k] && String(C[k]).trim()) ? C[k] : DEF[k];
      if (v != null) el.textContent = fill(v, T);
    });
  }
  window.SD.content = { FIELDS: F, DEF, apply, fill, tokens };
})();
