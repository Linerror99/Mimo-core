# 🗺️ Mimo Finance — Spécifications & Roadmap V2

Ce document synthétise la feuille de route complète pour la **Version 2 (V2)** de Mimo Finance. Il combine la refonte esthétique (passage d'un style "générique" à une **Fintech haut de gamme**) et l'ajout de **fonctionnalités financières stratégiques et prédictives**.

---

## 🎯 Vision V2 : Devenir le meilleur cockpit de trésorerie personnelle & de couple

La force distinctive de Mimo par rapport aux applications bancaires traditionnelles (Bankin, Linxo, Finary) est sa **vision prospective et temporelle**. 
En V2, Mimo ne se contente plus d'enregistrer le passé : elle devient un **assistant prédictif de décision financière**.

---

## 🎨 Axe 1 : Métamorphose Frontend & Design System "Fintech Pro"

### 1. Objectif : Casser le "look IA générique"
| ❌ Look Actuel (Template SaaS classique) | 💎 Nouveau Look V2 (Fintech Haut de Gamme) |
| :--- | :--- |
| Palette pastel indigo/violette omniprésente | Thème **Slate & Onyx** feutré, contrasté, élégant |
| Emojis colorés dispersés (💰, 💸, 🔄) | Iconographie vectorielle fine et monochrome (**Lucide Icons**) |
| Boutons arrondis violets saturés | Boutons épurés, bordures 1px subtiles, micro-transitions |
| Typographie système standard | Typographie moderne (**Plus Jakarta Sans** / **Geist**) |
| Chiffres à chasse variable (qui bougent) | **Chiffres Tabulaires (`tabular-nums`)** pour un alignement comptable parfait |

### 2. Spécifications du Design System V2
* **Tokens de couleurs** :
  * **Fond & Surfaces** : `#090D16` (Dark), `#F8FAFC` (Light), surfaces glassmorphism légères avec bordures `rgba(255,255,255,0.08)`.
  * **Accents Financiers** :
    * Revenus / Positif : Vert Émeraude (`#10B981` / `#059669`)
    * Dépenses / Négatif : Corail Doux (`#F43F5E` / `#E11D48`)
    * Virements internes : Bleu Cobalt (`#3B82F6`)
    * Alertes / Vigilance : Ambre Doré (`#F59E0B`)
* **Palette de Commande Rapide (`Ctrl+K` / `Cmd+K`)** :
  * Permet de créer une transaction, basculer de mois ou rechercher une opération au clavier en moins de 2 secondes.
* **Support PWA (Progressive Web App)** :
  * Installable sur smartphone (iOS / Android) comme une application native sans passer par les stores.

---

## 💡 Axe 2 : Fonctionnalités Financières Stratégiques & Utiles

### 1. Le « Reste à Vivre Réel » (*Safe-to-Spend*)
* **Problème résolu** : Le solde bancaire au jour J est trompeur car il ne tient pas compte des charges fixes qui vont tomber avant la prochaine paie.
* **Fonctionnement** :
  $$\text{Safe-to-Spend} = \text{Solde Actuel} - \sum \text{Charges à venir jusqu'au prochain salaire} - \text{Objectif d'Épargne}$$
* **Affichage** : Jauge dynamique en haut du Dashboard et de la Timeline indiquant la somme réelle disponible par jour / par semaine sans risquer le découvert.

### 2. Le Module « Projets & Enveloppes » avec Simulateur What-If (✅ Implémenté en V2)
* **Concept** : Planifier des projets majeurs (Vacances, Travaux, Véhicule, Événement) et tester la faisabilité financière avant d'engager les dépenses.
* **Fonctionnement** :
  1. L'utilisateur crée un projet avec un budget cible, une couleur et une icône dédiée.
  2. Il liste les dépenses prévues avec date d'échéance et compte bancaire débité.
  3. Le moteur **What-If** génère instantanément la courbe d'évolution de trésorerie sur les comptes concernés sans altérer les vraies transactions.
  4. L'app délivre un verdict de viabilité (aucun découvert ou alertes de solde négatif).
  5. Bouton **« Valider le projet »** : injecte automatiquement les dépenses dans la Timeline officielle, avec possibilité de **Rollback** instantané.
  6. Menu contextuel : modification, suppression et duplication complète en un clic.

### 3. Détecteur de « Fuites Financières » & Audit d'Abonnements
* **Concept** : Isoler et surveiller les coûts fixes récurrents (Netflix, Spotify, assurances, abonnements oubliés).
* **Fonctionnement** :
  * Agrégation annuelle : *"Vos abonnements représentent 240 €/mois, soit 2 880 €/an (24% de vos dépenses obligatoires)"*.
  * Bouton d'action pour résilier ou ajuster la récurrence en un clic.

### 4. Partage Équitable en Couple (*Splitwise-like*)
* **Concept** : Pour les utilisateurs en mode `Household` (Couple/Foyer), éliminer les calculs manuels de fin de mois.
* **Fonctionnement** :
  * Gestion de la clé de répartition : **50/50** ou **au prorata des revenus** (ex : 60/40).
  * Vue dédiée "Qui doit combien à qui" sur les dépenses communes.
  * Bouton *"Régulariser par virement"* qui prépare la transaction de compensation.

### 5. Enveloppes Virtuelles & Épargne Dédiée (✅ Intégré dans le Module Projets)
* **Concept** : Découper son budget en enveloppes dédiées avec suivi Dépenses prévues vs Budget fixé et jauges de consommation.

### 6. Import & Réconciliation de Relevés Bancaires (CSV / OFX)
* **Concept** : Alimenter son historique rapidement sans dépendre d'un agrégateur bancaire payant.
* **Fonctionnement** :
  * Import glisser-déposer de fichiers CSV exportés depuis n'importe quelle banque (BoursoBank, SG, BNP, Crédit Agricole, etc.).
  * Détection automatique des doublons avec les transactions récurrentes projetées.

---

## 🏗️ Axe 3 : Architecture Technique V2 & Organisation des Sprints

```
┌────────────────────────────────────────────────────────────────────────┐
│                                MIMO V2                                 │
├──────────────────────────────────┬─────────────────────────────────────┤
│ 🎨 SPRINT 1 : UI/UX FINTECH PRO  │ ⚙️ SPRINT 2 : SAFE-TO-SPEND & AUDIT │
│ • Nouveau Design System Slate    │ • Algorithme Safe-to-Spend          │
│ • Typo Plus Jakarta Sans + tnum  │ • Module Fuites & Abonnements       │
│ • Icônes Lucide Vectorielles     │ • Export & Reporting V2             │
│ • Timeline Mobile Compacte (✅)  │                                     │
├──────────────────────────────────┼─────────────────────────────────────┤
│ 🧪 SPRINT 3 : PROJETS & WHAT-IF  │ 👥 SPRINT 4 : GESTION FOYER & CSV   │
│ • Module Projets & Enveloppes(✅)│ • Équilibrage dépenses de couple    │
│ • Moteur Sandbox What-If (✅)    │ • Import CSV / Relevés bancaires    │
│ • Commit & Rollback Timeline (✅)│ • Mode PWA offline                  │
│ • Range API 1 mois à 5 ans (✅)  │                                     │
└──────────────────────────────────┴─────────────────────────────────────┘
```

---

## 📌 Checklist de Lancement V2

- [x] **Étape 1 :** Mise en place du thème global `Fintech Dark/Light` et refonte des composants de base (boutons, cartes, tableaux).
- [x] **Étape 2 :** Remplacement systématique des emojis par la suite `lucide-react` et menu d'options `MoreVertical`.
- [x] **Étape 3 :** Module complet **Projets & Enveloppes** avec simulateur What-If et injection Timeline (commit/rollback).
- [x] **Étape 4 :** Moteur de **Projections multi-années** (1 mois à 5 ans) avec Range API optimisée sans N+1 requêtes.
- [x] **Étape 5 :** Refonte responsive mobile de la Timeline (>300px verticaux libérés, cartes ultra-compactes).
- [ ] **Étape 6 :** Intégration du widget **Safe-to-Spend** (Reste à vivre) sur le Dashboard.
- [ ] **Étape 7 :** Module d'équilibrage des dépenses de couple (Foyer).
- [ ] **Étape 8 :** Module d'importation de relevés bancaires CSV.
