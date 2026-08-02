# AlphaG3n Bot v2.5 Ultra

**Bot Discord ultra-premium pour gestion de comptes avec architecture modulaire**

## 🚀 Fonctionnalités

✨ **Générateurs Free & Premium**
- Panels stylés sans ASCII avec emojis customs
- Auto-update toutes les 5 secondes pour panels status
- Support 35+ services (Netflix, Spotify, Disney+, Steam, etc.)

👑 **Système Avancé**
- Vérification OAuth2 automatique
- Cooldown intelligent (30s/1m/1h format)
- Limites journalières configurables
- Support tickets avec création automatique

📊 **Base de Données Hybride**
- PostgreSQL pour production
- SQLite fallback automatique
- Migrations automatiques

🎨 **Emojis Customs**
- Auto-import depuis dossier `/assets`
- Création automatique sur le serveur
- Fallback sur emojis par défaut

## 📦 Installation

```bash
# 1. Installer les dépendances
npm install

# 2. Configurer les variables d'environnement
# Copier .env.example vers .env et remplir:
# - DISCORD_TOKEN
# - DISCORD_CLIENT_ID
# - DATABASE_URL (PostgreSQL)
# - WEB_PORT (défaut: 3000)

# 3. Lancer le bot
npm start
# OU
node src/index.js
```

## 🎯 Commandes Disponibles

### Administration
- `/deploy` - Déployer panels (gen/status/verify/ticket)
- `/config` - Configuration interactive du bot
- `/services` - Gérer les services (tier free/premium)

### Gestion Stock
- `/addstock` - Ajouter des comptes rapidement
- `/restock` - Restock depuis fichier TXT/ULP
- `/stock` - Voir le stock actuel

### Checker
- `/check` - Vérifier un compte
- `/check-files` - Vérifier fichier complet

### Utilisateurs
- `/help` - Aide complète
- `/verified` - Pull members vérifiés

## 🏗️ Structure du Projet

```
NextGen/
├── src/
│   ├── commands/        # Commandes slash
│   ├── handlers/        # Event handlers
│   ├── services/        # Services (checker, panels, emojis)
│   ├── database/        # Modèles et connexions DB
│   ├── config/          # Configuration
│   ├── utils/           # Utilitaires
│   └── web/             # Serveur OAuth2
├── assets/              # Icônes PNG des services
├── data/                # Données SQLite
├── logs/                # Logs du bot
└── Alpha Services/      # Combos sources

