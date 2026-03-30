# 🏥 VitaGest — Frontend Angular

> Interface web moderne pour la gestion d'une pharmacie, développée avec **Angular 19**, **Bootstrap 5** et **Chart.js**.

---

## 📋 Table des Matières

- [Présentation](#-présentation)
- [Stack Technique](#-stack-technique)
- [Architecture du Projet](#-architecture-du-projet)
- [Prérequis](#-prérequis)
- [Installation & Lancement](#-installation--lancement)
- [Modules & Pages](#-modules--pages)
- [Authentification & Rôles](#-authentification--rôles)
- [Communication avec le Backend](#-communication-avec-le-backend)
- [Docker](#-docker)
- [Scripts Disponibles](#-scripts-disponibles)

---

## 📌 Présentation

**VitaGest Frontend** est l'interface utilisateur du système de gestion pharmaceutique VitaGest. Elle offre un tableau de bord intuitif et une navigation structurée par rôle permettant aux pharmaciens et administrateurs de gérer :

- 💊 Le catalogue de médicaments et les stocks (lots)
- 🧾 Les ventes et encaissements
- 🚚 Les commandes auprès des fournisseurs
- 👤 Les clients et leur historique
- 🏭 Les fournisseurs
- 👥 La gestion des comptes utilisateurs *(Admin uniquement)*
- 📊 Des tableaux de bord avec graphiques interactifs

---

## 🛠 Stack Technique

| Technologie | Version | Rôle |
|---|---|---|
| **Angular** | 19.2 | Framework SPA principal |
| **TypeScript** | 5.7 | Langage principal |
| **Bootstrap** | 5.3 | Composants UI & mise en page |
| **Angular CDK** | 19.2 | Primitives UI (Dialog, Overlay…) |
| **Chart.js** | 4.5 | Graphiques & statistiques |
| **ng2-charts** | 8.0 | Intégration Angular de Chart.js |
| **RxJS** | 7.8 | Programmation réactive (Observables) |
| **Angular Router** | 19.2 | Navigation & routes gardées |
| **HttpClient** | 19.2 | Appels API REST |
| **Nginx** | stable-alpine | Serveur web en production (Docker) |
| **Node.js** | 18 | Environnement de build |

---

## 🗂 Architecture du Projet

```
vitagest-frontend/
├── src/
│   ├── app/
│   │   ├── app.component.ts        # Composant racine
│   │   ├── app.config.ts           # Configuration (providers, HttpClient…)
│   │   ├── app.routes.ts           # Routes globales avec guards
│   │   │
│   │   ├── core/                   # Services transversaux & Guards
│   │   │   ├── services/
│   │   │   │   ├── auth.service.ts         # Gestion JWT, login, logout
│   │   │   │   ├── medicament.service.ts
│   │   │   │   ├── vente.service.ts
│   │   │   │   ├── commande.service.ts
│   │   │   │   ├── client.service.ts
│   │   │   │   ├── fournisseur.service.ts
│   │   │   │   ├── lot.service.ts
│   │   │   │   └── user.service.ts
│   │   │   ├── guards/
│   │   │   │   ├── auth.guard.ts           # Garde les routes authentifiées
│   │   │   │   └── role.guard.ts           # Garde les routes par rôle
│   │   │   └── interceptors/
│   │   │       └── jwt.interceptor.ts      # Injection du token JWT dans les requêtes
│   │   │
│   │   ├── components/             # Composants partagés (Sidebar, Navbar…)
│   │   │
│   │   └── features/               # Modules fonctionnels
│   │       ├── auth/               # Login / Register
│   │       ├── admin/              # Dashboard Admin
│   │       ├── medicaments/        # CRUD Médicaments
│   │       ├── stocks/             # Gestion des Lots / Stocks
│   │       ├── ventes/             # Gestion des Ventes
│   │       ├── commandes/          # Gestion des Commandes
│   │       ├── clients/            # Gestion des Clients
│   │       ├── fournisseurs/       # Gestion des Fournisseurs
│   │       ├── users/              # Gestion des Utilisateurs (Admin)
│   │       └── prescriptions/      # Module Prescriptions
│   │
│   ├── assets/                     # Images, icônes, fichiers statiques
│   ├── environments/               # Variables d'environnement Angular
│   └── styles.css                  # Styles CSS globaux
│
├── Dockerfile                      # Build multi-stage (Node → Nginx)
├── nginx.conf                      # Configuration Nginx (SPA routing)
├── angular.json                    # Configuration Angular CLI
├── package.json                    # Dépendances npm
└── tsconfig.json                   # Configuration TypeScript
```

---

## ✅ Prérequis

- **Node.js 18+** — [Télécharger](https://nodejs.org/)
- **Angular CLI 19** — `npm install -g @angular/cli@19`
- **Backend VitaGest** lancé sur `http://localhost:8080`

---

## 🚀 Installation & Lancement

### Option 1 — Lancement avec Docker (recommandé)

```bash
# Depuis la racine du projet VitaGest-Project/
docker-compose up --build
```

L'application sera disponible sur : `http://localhost:4200`

---

### Option 2 — Lancement local en développement

**1. Installer les dépendances :**

```bash
cd vitagest-frontend
npm install
```

**2. Lancer le serveur de développement :**

```bash
npm start
# ou
ng serve
```

L'application est disponible sur : `http://localhost:4200`

> ⚠️ Le backend doit être lancé sur `http://localhost:8080` pour que l'API fonctionne.

---

## 📱 Modules & Pages

### 🔐 Authentification (`/auth`)
- **Login** : Formulaire de connexion par email/mot de passe
- Après connexion, l'utilisateur est redirigé selon son rôle

### 📊 Dashboard Admin (`/admin`)
- Vue d'ensemble des statistiques
- Graphiques Chart.js : ventes, stocks, commandes
- Accès réservé au rôle `ADMIN`

### 💊 Médicaments (`/medicaments`)
- Liste paginée des médicaments
- Création, modification, suppression
- Recherche par nom / DCI / classe

### 📦 Stocks — Lots (`/stocks`)
- Suivi des lots par médicament
- Dates de fabrication et d'expiration
- Alertes visuelles pour les lots proches de péremption

### 🧾 Ventes (`/ventes`)
- Création d'une vente avec sélection de médicaments
- Gestion des lignes de vente (quantité, prix, remise)
- Modes de paiement : Espèces, Carte, etc.
- Historique des ventes

### 🚚 Commandes (`/commandes`)
- Création de commandes auprès des fournisseurs
- Suivi des statuts : `BROUILLON` → `ENVOYEE` → `RECUE`
- Validation et réception des commandes

### 👤 Clients (`/clients`)
- Fiche client avec allergies et consentement RGPD
- Historique des achats par client

### 🏭 Fournisseurs (`/fournisseurs`)
- Répertoire des fournisseurs
- Note et délai moyen de livraison

### 👥 Utilisateurs (`/users`) *(Admin uniquement)*
- Création et gestion des comptes employés
- Attribution du rôle (`ADMIN` / `PHARMACIEN`)
- Activation / désactivation des comptes
- Réinitialisation des mots de passe

---

## 🔒 Authentification & Rôles

### Flux de connexion

```
1. L'utilisateur soumet email + mot de passe
2. AuthService envoie POST /api/v1/auth/login
3. Le backend retourne un JWT token
4. Le token est stocké en localStorage
5. JwtInterceptor injecte le token dans chaque requête HTTP :
   Authorization: Bearer <token>
6. Les guards (auth.guard, role.guard) protègent les routes
```

### Protection des routes

```typescript
// Exemple de route gardée
{
  path: 'users',
  component: UsersComponent,
  canActivate: [AuthGuard, RoleGuard],
  data: { roles: ['ROLE_ADMIN'] }
}
```

### Rôles et accès

| Page | 👑 ADMIN | 💊 PHARMACIEN |
|---|:---:|:---:|
| Dashboard Admin | ✅ | ❌ |
| Médicaments | ✅ | ✅ |
| Stocks / Lots | ✅ | ✅ |
| Ventes | ✅ | ✅ |
| Commandes | ✅ | ✅ |
| Clients | ✅ | ✅ |
| Fournisseurs | ✅ | ✅ |
| Gestion Utilisateurs | ✅ | ❌ |

---

## 🌐 Communication avec le Backend

L'URL de base de l'API est configurée dans `environments/` :

```typescript
// environment.ts (développement)
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080/api/v1'
};
```

### Intercepteur JWT

Chaque requête HTTP est automatiquement enrichie du token JWT via `JwtInterceptor` :

```typescript
// jwt.interceptor.ts
const token = this.authService.getToken();
if (token) {
  request = request.clone({
    setHeaders: { Authorization: `Bearer ${token}` }
  });
}
```

---

## 🐳 Docker

### Build de l'image seule

```bash
cd vitagest-frontend
docker build -t vitagest-frontend .
```

### Détails du build multi-stage

| Stage | Image | Rôle |
|---|---|---|
| **Stage 1** | `node:18-alpine` | Installation npm + `ng build --production` |
| **Stage 2** | `nginx:stable-alpine` | Serveur de fichiers statiques |

Les fichiers compilés (`dist/`) sont copiés dans `/usr/share/nginx/html`.

### Configuration Nginx (SPA)

Le fichier `nginx.conf` redirige toutes les routes vers `index.html` pour que le routing Angular fonctionne correctement :

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

---

## 📜 Scripts Disponibles

| Commande | Description |
|---|---|
| `npm start` | Lance le serveur de développement sur `localhost:4200` |
| `npm run build` | Build de production dans `dist/` |
| `npm run watch` | Build en mode watch (développement) |
| `npm test` | Lance les tests unitaires Karma/Jasmine |
| `ng generate component <name>` | Génère un nouveau composant Angular |
| `ng generate service <name>` | Génère un nouveau service Angular |

---

## 👨‍💻 Auteur

Projet réalisé dans le cadre de la formation **YouCode** (Fil Rouge).

---

*Version : 0.0.0 | Angular 19.2 | Node.js 18*
