# 📋 Gestionnaire de Nomenclatures Électriques & Approvisionnements (BOM)

Une application desktop professionnelle, moderne et fluide développée en **React / TypeScript / Electron / SQLite**, conçue pour simplifier la gestion, la consolidation, le tri et l'exportation des listes de matériel (BOM - Bill of Materials) et le suivi des approvisionnements sur les affaires industrielles.

---

## 🌟 Fonctionnalités Clés

### 1. Multi-vues Intelligentes & Consolidation Automatique
* **Vue Globale :** Consolidation automatique de toutes les listes du projet. Les doublons de références sont agrégés avec somme automatique des quantités pour une vision globale de l'affaire.
* **Vues Métier Spécialisées :** Répartition automatique du matériel dans des vues dédiées (`Tôlerie`, `Électronique`, `Canevas`, `U.F.`, `Autre`) pour simplifier le travail des différents ateliers.
* **Appro Anticipé & Fiche Achat :** Gestion et isolation des pièces commandées par anticipation et des achats standard.

### 2. État Préparatoire Dynamique & Suivi des Commandes
* **Calcul des Restes à Commander :** L'onglet **État préparatoire** identifie automatiquement les pièces déjà commandées en additionnant et en comparant le contenu de la "Liste achat" avec les autres listes d'approvisionnement anticipé.
* **Indicateurs de Statut Visuels en Temps Réel :**
  * `À commander` : Aucune quantité commandée pour cette référence.
  * `[X] Commandé` : Quantité commandée partielle (X).
  * `Commandé` : Quantité totalement approvisionnée.
* **Aide Visuelle Ergonomique :** Le fond des lignes intégralement commandées (`Commandé`) se grise automatiquement de manière subtile, tout en préservant la couleur de texte noire pour une lisibilité et un confort visuel optimaux.

### 3. Système de Tri Avancé (Tri Naturel Intelligent)
L'application intègre un moteur de tri ultra-précis conçu pour le matériel industriel, proposant 3 modes sélectionnables via des boutons ergonomiques (style contrôle segmenté premium) à gauche du champ de recherche :
1. **Tri Réf / Fab (Par défaut) :** Regroupe les pièces par **Code Fabricant**, puis les trie par **Référence** de manière naturelle.
2. **Tri Date d'ajout :** Trie les références selon leur **ordre chronologique d'ajout** dans le projet (les plus anciennes d'abord).
3. **Tri Statut (Exclusif à la vue État Préparatoire) :** Regroupe les lignes par ordre d'urgence opérationnelle :
   * `À commander` en premier (haut de la liste).
   * `Partiel` au milieu.
   * `Commandé` tout en bas (grisé).
   * *Tri secondaire automatique :* Les lignes ayant le même statut sont automatiquement ordonnées par **Code Fabricant** puis par **Référence**.
* **Algorithme de Tri Naturel :** Contrairement au tri informatique standard, l'application comprend la logique humaine des références complexes (ex: `750-8` est correctement classé **avant** `750-10`, et `000-2` est classé **avant** `000-100`).

### 4. Import Excel Intelligent & Flexible
* **Mapping Personnalisable :** Module d'importation robuste avec configuration visuelle des colonnes (Référence, Quantité, Localisation/Tableau).
* **Non Destructif :** Fusion automatique intelligente et incrémentation des quantités pour les références déjà existantes.

### 5. Exports Premium & Normalisés
L'application génère des exports haut de gamme indispensables pour la transmission aux services Achats ou aux clients.
* **Export PDF (jsPDF & AutoTable) :**
  * **Design d'excellence :** Cartouche de titre jaune vif contrasté avec bordures noires fines, reprenant l'ensemble des données d'affaire.
  * **Optimisation de l'espace :** Marges réduites de 1/3 (passant de 14mm à 9,33mm) pour maximiser le nombre de lignes par page et réduire la gâche papier.
  * **Rendu de Statut Épuré :** Quantités affichées sous forme d'**entiers** simples et nets (ex: `5` et `2 Commandé`).
  * **Numérotation Précise :** Numérotation au format `Page Actuelle / Total Pages` (ex: `3/5`) rigoureusement alignée à droite dans le pied de page, sur la même ligne que le sous-titre de l'affaire.
  * **Préservation Visuelle :** Les lignes totalement commandées apparaissent avec un fond grisé identique à l'application.
* **Export Excel (.xls) :**
  * Exportation brute pour traitement ultérieur par les ERP ou acheteurs.
  * Préserve la quantité globale pour ne pas être impacté par les statuts de préparation.
* **Tri de Livraison Systématique :** Peu importe le tri affiché à l'écran, **les fichiers générés (PDF & Excel) sont systématiquement et rigoureusement triés selon la hiérarchie logique `Code Fabricant` ➔ `Référence` (Tri Naturel)** pour garantir une structure de livraison parfaite.

### 6. Gestion Rigoureuse des Données d'Affaires
* **Nommage Automatique Normalisé :** Tous les fichiers générés prennent automatiquement la structure réglementaire :
  `"n°origine n°ligneOrigine NomListe NomTableau - NomAffaire (Client)"`
  *(Exemple : `12345 10 Liste achat Tableau Général - Affaire Rénovation (Client EDF).pdf`)*
* **Architecture Electron + SQLite :** Base de données SQLite locale ultra-rapide avec recherche de références en autocomplétion floue en temps réel.
* **Persistance Stable :** Suivi des fichiers de projets récents et sauvegarde continue.

### 7. Mises à jour Transparentes Intégrées (Auto-Update)
* **Téléchargement invisible :** À chaque lancement, l'application interroge les serveurs GitHub (`glouglou49/liste`). Si une mise à jour est trouvée, elle la télécharge silencieusement en arrière-plan sans interrompre le travail de l'utilisateur.
* **Interface fluide et premium :** Pendant le téléchargement, un élégant bandeau avec barre de progression dynamique s'affiche au sommet de l'écran.
* **Installation sans friction :** Une fois la mise à jour téléchargée et prête, l'application propose un simple bouton "Redémarrer et Installer". Un clic suffit pour écraser l'ancienne version, tout en conservant 100% des données et paramètres de l'utilisateur.
* **Mémoire de session :** Le bandeau peut être fermé temporairement ; l'application n'embêtera plus l'utilisateur pendant sa session active.

---

## 🛠️ Stack Technique

* **Frontend :** React 18, TypeScript, Tailwind CSS, Lucide React (Icônes)
* **Shell Desktop & Données :** Electron, SQLite, IPC (Inter-Process Communication) sécurisé
* **Gestion d'État :** Zustand
* **Exports :** jsPDF, jsPDF-AutoTable, XLSX (SheetJS)

---

## 🚀 Installation & Lancement en Développement

### Prérequis
* Node.js (version 16 ou supérieure)
* npm (installé par défaut avec Node)

### Instructions

1. **Cloner le dépôt ou ouvrir le dossier du projet :**
   ```bash
   cd "d:/App en dev/Liste"
   ```

2. **Installer les dépendances :**
   ```bash
   npm install
   ```

3. **Lancer le serveur de développement Electron :**
   ```bash
   npm run dev
   ```

4. **Lancer le linter pour vérifier la qualité du code :**
   ```bash
   npm run lint
   ```
