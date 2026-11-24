# Sable Doré : mettre le site en ligne

Le site contient deux parties :
- **La boutique** (`index.html`) : catalogue, commande par couleur, paiement Juice, envoi de la preuve de paiement, reçu.
- **L'espace gérant** (`admin.html`) : commandes, validation des paiements, factures, ventes du jour et du mois, catalogue, prix et informations de la société.

Tant que `assets/config.js` est vide, le site fonctionne en **mode démonstration** : les commandes restent dans le navigateur et le mot de passe admin est `demo`.

---

## Étape 1 : préparer Supabase (la base de données)

1. Dans ton projet Supabase, ouvre **SQL Editor** puis **New query**.
2. Ouvre le fichier `supabase/schema.sql`, copie **tout** son contenu, colle-le et clique sur **Run**. Le message « Success » doit s'afficher.
   - Tout en bas du fichier, l'e-mail admin est `marieyanna@kmpmoris.com`. Si tu veux te connecter avec un autre e-mail, change-le avant de cliquer sur Run.
3. Crée ton compte admin : **Authentication**, puis **Users**, **Add user** et **Create new user**. Mets le même e-mail et un mot de passe solide, et coche **Auto Confirm User**.
4. Ferme les inscriptions : **Authentication**, puis **Sign In / Providers** (ou *Settings*). Désactive **Allow new users to sign up**.
5. Récupère tes clés : **Project Settings**, puis **API** (ou *API Keys*).
   - Copie **Project URL**.
   - Copie la clé **anon public** (elle peut aussi s'appeler **Publishable key**).
   - ⚠️ Ne copie jamais la clé `service_role` / `secret`.
6. Ouvre `assets/config.js` et colle les deux valeurs entre les guillemets :
   ```js
   SUPABASE_URL: "https://xxxxx.supabase.co",
   SUPABASE_ANON_KEY: "eyJ...ou sb_publishable_..."
   ```

## Étape 2 : mettre les fichiers sur GitHub

1. Sur github.com, crée un **New repository** nommé `sable-dore`, en mode **Public**.
2. Clique sur **uploading an existing file**. Glisse **tout le contenu** du dossier : `index.html`, `admin.html`, le dossier `assets` et le dossier `supabase`. Termine avec **Commit changes**.
3. Va dans **Settings**, puis **Pages**. Dans *Source*, choisis **Deploy from a branch**, puis la branche **main** et le dossier **/(root)**, et clique sur **Save**.
4. Toujours dans **Pages**, à la ligne **Custom domain**, écris ton domaine (par exemple `www.sabledore.mu`) et clique sur **Save**.

## Étape 3 : relier ton domaine (chez ton fournisseur de domaine)

Dans la zone DNS de ton domaine, ajoute :

| Type  | Nom / Hôte | Valeur |
|-------|-----------|--------|
| CNAME | `www`     | `TON-NOM-GITHUB.github.io` |
| A     | `@`       | `185.199.108.153` |
| A     | `@`       | `185.199.109.153` |
| A     | `@`       | `185.199.110.153` |
| A     | `@`       | `185.199.111.153` |

Supprime d'abord les anciens enregistrements A ou CNAME qui portent les mêmes noms (`@` et `www`).
Le domaine devient actif en général en quelques heures, parfois jusqu'à 24 h. Retourne ensuite dans **Settings**, puis **Pages**, et coche **Enforce HTTPS**.

---

## Au quotidien

- **Espace gérant** : `https://ton-domaine/admin.html` (le lien « Espace gérant » se trouve aussi en bas de la boutique).
- **Nouvelle commande avec preuve envoyée** : elle apparaît dans *À vérifier*. Vérifie sur ton appli Juice que le montant est bien arrivé, puis clique sur **Valider le paiement et émettre la facture**. La facture `FAC-2026-0001`, `0002`… est créée et la vente est comptée.
- **Client qui n'arrive pas à envoyer sa capture** : ouvre sa commande (onglet *Attente de paiement*), joins la capture reçue par WhatsApp ou e-mail, puis valide.
- **Coordonnées de la société, Juice, compte bancaire, prix** : onglet *Société, paiement, prix*.
- **Textes et photo d'accueil** : onglet *Mon site*. Tous les textes de la page d'accueil se modifient ici, et tu peux choisir la grande photo du haut de page.
- **Idées à créer** : onglet *Idées*. Remplace chaque illustration par ta propre photo, modifie les textes ou ajoute de nouvelles idées.
- **Couleurs et photos** : onglet *Catalogue*. Ajoute une vraie photo de ton sable pour chaque couleur, c'est ce qui donne le plus envie.
- **Factures du mois** : onglet *Factures*. Le bouton *Exporter (CSV)* donne un fichier qui s'ouvre dans Excel, pour ton comptable.

## Bon à savoir

- Un projet Supabase gratuit se met en pause après 7 jours **sans aucune activité**. Si ça arrive, un clic sur *Restore* dans Supabase suffit. Dès que le site reçoit des visites régulières, la question ne se pose plus.
- La clé « anon/publishable » est faite pour être publique : la sécurité vient des règles de la base. Les commandes, les preuves et les factures ne sont lisibles que par le compte admin.
- Le prix est **recalculé par le serveur** à chaque commande : un client ne peut pas modifier son total.
