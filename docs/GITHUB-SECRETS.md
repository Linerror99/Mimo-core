# GitHub Secrets & Variables Configuration

Ce fichier liste tous les secrets et variables à configurer dans GitHub Actions pour le CI/CD.

## 📍 Où configurer?

**Repository Settings → Secrets and variables → Actions**

## 🔐 Secrets (Obligatoires)

### 1. SONAR_TOKEN (OBLIGATOIRE)
- **Description**: Token d'authentification SonarCloud
- **Comment obtenir**:
  1. Aller sur https://sonarcloud.io/
  2. Se connecter avec GitHub
  3. Importer le projet `Mimo-core`
  4. Account → Security → Generate Token
  5. Type: Project Analysis Token
  6. Copier le token généré
- **Exemple**: `sqp_1234567890abcdef1234567890abcdef12345678`

## 🔧 Secrets (Optionnels - valeurs par défaut disponibles)

Si non configurés, les valeurs par défaut seront utilisées (suffisant pour la plupart des cas).

### 2. TEST_DB_USER (Optionnel)
- **Description**: Utilisateur PostgreSQL pour tests CI
- **Valeur par défaut**: `test_user`
- **Quand changer**: Si tu veux un nom d'utilisateur spécifique

### 3. TEST_DB_PASSWORD (Optionnel)
- **Description**: Mot de passe PostgreSQL pour tests CI
- **Valeur par défaut**: `test_password`
- **Quand changer**: Pour renforcer la sécurité

### 4. TEST_DB_NAME (Optionnel)
- **Description**: Nom de la base de données de test
- **Valeur par défaut**: `test_db`
- **Quand changer**: Si tu veux un nom de DB spécifique

### 5. TEST_JWT_SECRET (Optionnel)
- **Description**: Secret JWT pour tests unitaires
- **Valeur par défaut**: `test_secret_key_for_ci_testing_only`
- **Quand changer**: Pour renforcer la sécurité des tests

### 6. INTEGRATION_DB_USER (Optionnel)
- **Description**: Utilisateur PostgreSQL pour tests d'intégration
- **Valeur par défaut**: `duoflow`
- **Quand changer**: Si tu veux un nom d'utilisateur spécifique

### 7. INTEGRATION_DB_PASSWORD (Optionnel)
- **Description**: Mot de passe PostgreSQL pour tests d'intégration
- **Valeur par défaut**: `duoflow`
- **Quand changer**: Pour renforcer la sécurité

### 8. INTEGRATION_DB_NAME (Optionnel)
- **Description**: Nom de la base de données d'intégration
- **Valeur par défaut**: `duoflow`
- **Quand changer**: Si tu veux un nom de DB spécifique

### 9. INTEGRATION_JWT_SECRET (Optionnel)
- **Description**: Secret JWT pour tests d'intégration
- **Valeur par défaut**: `test_secret_key_for_ci_testing_only`
- **Quand changer**: Pour renforcer la sécurité des tests

## 📊 Variables (Optionnelles)

### 1. SONAR_ORGANIZATION (Optionnel)
- **Description**: Organisation SonarCloud
- **Valeur par défaut**: `linerror99`
- **Quand changer**: Si tu changes d'organisation SonarCloud

### 2. SONAR_PROJECT_KEY (Optionnel)
- **Description**: Clé du projet SonarCloud
- **Valeur par défaut**: `Linerror99_Mimo-core`
- **Quand changer**: Si tu renommes le projet SonarCloud

## 🚀 Configuration Minimale (Démarrage Rapide)

Pour démarrer, tu n'as besoin que de:

1. **SONAR_TOKEN** (obligatoire)

Toutes les autres valeurs utiliseront leurs valeurs par défaut.

## 📝 Comment ajouter un secret sur GitHub

1. Va sur: https://github.com/Linerror99/Mimo-core/settings/secrets/actions
2. Clique sur **"New repository secret"**
3. **Name**: `SONAR_TOKEN` (ou autre nom du secret)
4. **Value**: Colle la valeur du secret
5. Clique sur **"Add secret"**

## 📝 Comment ajouter une variable sur GitHub

1. Va sur: https://github.com/Linerror99/Mimo-core/settings/variables/actions
2. Clique sur **"New repository variable"**
3. **Name**: `SONAR_ORGANIZATION` (ou autre nom)
4. **Value**: `linerror99` (ou ta valeur)
5. Clique sur **"Add variable"**

## ✅ Vérification

Une fois configuré, vérifie que:

1. ✅ `SONAR_TOKEN` est ajouté dans Secrets
2. ✅ Les workflows CI/CD se lancent sans erreur
3. ✅ SonarCloud reçoit les rapports de coverage

## 🔒 Sécurité

- ❌ **Ne jamais** commit les secrets dans le code
- ✅ Utiliser GitHub Secrets pour toutes les valeurs sensibles
- ✅ Les secrets ne sont jamais affichés dans les logs
- ✅ Seuls les admins du repo peuvent voir/modifier les secrets

## 📚 Documentation

- **GitHub Secrets**: https://docs.github.com/en/actions/security-guides/encrypted-secrets
- **GitHub Variables**: https://docs.github.com/en/actions/learn-github-actions/variables
- **SonarCloud Setup**: Voir [CI-CD-SETUP.md](./CI-CD-SETUP.md)

---

**Last Updated**: December 12, 2024  
**Version**: 1.0.0
