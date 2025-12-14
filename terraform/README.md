# Infrastructure Terraform - Mimo Finance Production

Infrastructure as Code pour le déploiement de Mimo Finance sur Google Cloud Platform.

## 📋 Pré-requis

- **gcloud CLI** installé et authentifié
- **Terraform** >= 1.6 installé
- **Compte Google Cloud** avec facturation activée
- **Droits d'accès** pour créer des projets et ressources GCP

## 🚀 Phase 1 : Setup GCP (5-10 minutes)

### Étape 1 : Authentification gcloud

```bash
# Authentification
gcloud auth login

# Authentification pour Application Default Credentials (utilisé par Terraform)
gcloud auth application-default login
```

### Étape 2 : Exécuter le script de setup automatique

```bash
cd scripts/
chmod +x setup-gcp-project.sh
./setup-gcp-project.sh
```

**Ce script va automatiquement :**
- ✅ Créer le projet GCP `mimo-finance-prod`
- ✅ Activer 15 APIs nécessaires
- ✅ Générer et stocker 3 secrets (JWT, DB password, Admin token)
- ✅ Créer le bucket Terraform state `gs://mimo-terraform-state`
- ✅ Créer l'Artifact Registry `mimo-repo`
- ✅ Configurer Docker

**⚠️ ACTION MANUELLE REQUISE :**
Le script va s'arrêter pour vous demander de **lier un compte de facturation**.  
Suivez le lien affiché et liez votre compte de facturation, puis revenez confirmer.

### Étape 3 : Copier l'ADMIN_TOKEN

À la fin du script, **copier l'ADMIN_TOKEN** affiché :

```
📝 Secrets à ajouter dans GitHub :
  ADMIN_TOKEN=abc123def456...
```

### Étape 4 : Ajouter le secret GitHub

1. Aller sur : https://github.com/Linerror99/Mimo-core/settings/secrets/actions
2. Cliquer sur **"New repository secret"**
3. Name: `ADMIN_TOKEN`
4. Value: (coller le token copié)
5. Cliquer sur **"Add secret"**

## 🏗️ Phase 2 : Déploiement Infrastructure Terraform (20-30 minutes)

### Étape 1 : Configurer terraform.tfvars

Editer le fichier `terraform/terraform.tfvars` :

```hcl
# MODIFIER CETTE LIGNE avec votre email
admin_email = "votre-email@example.com"
```

### Étape 2 : Initialiser Terraform

```bash
cd terraform/
terraform init
```

Sortie attendue :
```
✅ Terraform has been successfully initialized!
```

### Étape 3 : Planifier le déploiement

```bash
terraform plan -out=tfplan
```

Cette commande va :
- Afficher toutes les ressources qui seront créées (~40 ressources)
- Sauvegarder le plan dans le fichier `tfplan`

**Vérifier** que le plan ne contient pas d'erreurs.

### Étape 4 : Appliquer l'infrastructure

```bash
terraform apply tfplan
```

Durée estimée : **20-30 minutes**

Cette commande va créer :
- VPC et networking (subnets, NAT, firewall)
- Cloud SQL PostgreSQL (db-f1-micro)
- Cloud Memorystore Redis (1GB)
- 2 Cloud Run services (backend, frontend) - **vides pour l'instant**
- 2 Cloud Storage buckets (uploads, backups)
- 2 Cloud Scheduler jobs (validation, backup)
- Artifact Registry
- 3 Service Accounts avec IAM bindings
- Workload Identity Federation pour GitHub Actions
- Monitoring : uptime checks, alert policies, notification channel

### Étape 5 : Récupérer les outputs

```bash
# Afficher tous les outputs
terraform output

# Sauvegarder les URLs importantes
terraform output backend_url > ../backend-url.txt
terraform output frontend_url > ../frontend-url.txt

# Voir le résumé complet
terraform output -json deployment_summary | jq .
```

**Sauvegarder** les URLs affichées :
- `backend_url` : URL du backend Cloud Run
- `frontend_url` : URL du frontend Cloud Run
- `workload_identity_provider` : Provider pour GitHub Actions

## 📊 Infrastructure créée

### Compute
- **Cloud Run Backend** : 0-5 instances, 1 vCPU, 512MB RAM
- **Cloud Run Frontend** : 0-3 instances, 1 vCPU, 256MB RAM
- Scale to zero activé (économie de coûts)

### Database & Cache
- **Cloud SQL** : PostgreSQL 15, db-f1-micro (0.6GB RAM)
  - IP privée uniquement
  - Backups automatiques (4 weekly, PITR 7 jours)
  - Maintenance window : Dimanche 04h UTC
- **Redis** : Cloud Memorystore 1GB BASIC tier
  - IP privée dans le VPC
  - Maintenance window : Dimanche 04h UTC

### Storage
- **Bucket uploads** : `mimo-uploads-prod`
  - Lifecycle : 365 jours
  - CORS configuré
- **Bucket backups** : `mimo-backups-prod`
  - Versioning activé
  - Lifecycle : 90 jours

### Scheduled Jobs
- **Validation automatique** : Tous les jours à 06h UTC
- **Backup DB** : Tous les dimanches à 02h UTC

### Monitoring
- **Uptime check** : Backend `/health` toutes les 60s
- **Alert policies** :
  - 5xx errors > 5%
  - Latency P95 > 2s
  - Uptime check failure
- **Notifications** : Email

### Security
- **Workload Identity Federation** : Pas de clés JSON
- **Secrets Manager** : jwt-secret, db-password, admin-token
- **Private IPs** : Cloud SQL et Redis en VPC privé
- **IAM** : Permissions minimales (principe du moindre privilège)

## 🔄 Commandes utiles

### Voir l'état de l'infrastructure

```bash
terraform show
```

### Mettre à jour l'infrastructure

```bash
terraform plan
terraform apply
```

### Détruire l'infrastructure (⚠️ DANGER)

```bash
terraform destroy
```

**⚠️ ATTENTION** : Cela détruira TOUTE l'infrastructure, y compris la base de données !

### Voir les logs Terraform

```bash
export TF_LOG=DEBUG
terraform apply
```

### Forcer le refresh de l'état

```bash
terraform refresh
```

## 🐛 Troubleshooting

### Erreur : "API not enabled"

Si vous voyez une erreur d'API non activée :

```bash
gcloud services enable NOM_API.googleapis.com --project=mimo-finance-prod
```

### Erreur : "Quota exceeded"

Vérifier les quotas du projet :

```bash
gcloud compute project-info describe --project=mimo-finance-prod
```

### Erreur : "Permission denied"

Vérifier que vous avez les rôles nécessaires :

```bash
gcloud projects get-iam-policy mimo-finance-prod --flatten="bindings[].members" --filter="bindings.members:user:VOTRE_EMAIL"
```

Rôles requis :
- `roles/owner` OU
- `roles/editor` + `roles/iam.securityAdmin`

### Erreur : "Backend configuration changed"

Si vous changez la configuration du backend :

```bash
terraform init -reconfigure
```

### Voir les secrets créés

```bash
gcloud secrets list --project=mimo-finance-prod

# Voir la valeur d'un secret (attention à la sécurité !)
gcloud secrets versions access latest --secret="jwt-secret" --project=mimo-finance-prod
```

### Vérifier les services Cloud Run

```bash
gcloud run services list --project=mimo-finance-prod --region=europe-west1
```

### Vérifier Cloud SQL

```bash
gcloud sql instances list --project=mimo-finance-prod
gcloud sql databases list --instance=INSTANCE_NAME --project=mimo-finance-prod
```

### Vérifier les Cloud Scheduler jobs

```bash
gcloud scheduler jobs list --project=mimo-finance-prod --location=europe-west1
```

## 📝 Prochaines étapes

Après avoir déployé l'infrastructure :

1. **Phase 3** : Créer le workflow GitHub Actions (`.github/workflows/deploy-production.yml`)
2. **Phase 4** : Adapter le code backend pour la production
3. **Phase 5** : Premier déploiement des applications
4. **Phase 6** : Vérifier le monitoring et les alertes
5. **Phase 7** : Tester le CI/CD complet

Voir `docs/DEPLOYMENT-PLAN.md` pour le plan détaillé.

## 💰 Estimation des coûts

**Estimation mensuelle** : ~45-50€

Détails :
- Cloud Run : ~5-10€ (scale to zero)
- Cloud SQL db-f1-micro : ~7€
- Redis 1GB BASIC : ~25€
- Cloud Storage : ~0.50€
- Cloud Scheduler : ~0.10€
- Networking : ~3€
- Monitoring : ~2€

**Optimisations activées** :
- ✅ Scale to zero pour Cloud Run
- ✅ Tier db-f1-micro pour Cloud SQL
- ✅ Redis BASIC (pas de réplication)
- ✅ Lifecycle policies sur les buckets
- ✅ Pas de Load Balancer externe (économie ~18€/mois)

## 🔒 Sécurité

### Secrets

**⚠️ NE JAMAIS COMMITER** :
- Secrets (JWT, passwords, tokens)
- Fichiers `terraform.tfstate` (déjà dans le backend GCS)
- Fichiers `.tfvars` contenant des données sensibles

### Bonnes pratiques

- ✅ Utiliser Workload Identity (pas de clés JSON)
- ✅ Secrets dans Secret Manager
- ✅ IPs privées pour Cloud SQL et Redis
- ✅ IAM avec principe du moindre privilège
- ✅ Monitoring et alertes activés
- ✅ Backups automatiques

### Rotation des secrets

Pour régénérer le JWT secret :

```bash
cd scripts/
./generate-jwt-secret.sh

# Mettre à jour dans Secret Manager
echo -n "NOUVEAU_SECRET" | gcloud secrets versions add jwt-secret --data-file=- --project=mimo-finance-prod

# Redéployer le backend pour utiliser le nouveau secret
# (via GitHub Actions ou terraform apply)
```

## 📚 Documentation

- [DEPLOYMENT-PLAN.md](../docs/DEPLOYMENT-PLAN.md) - Plan complet de déploiement
- [SPRINT-PLANNING.md](../docs/SPRINT-PLANNING.md) - Planification Sprint 9
- [Terraform Google Provider](https://registry.terraform.io/providers/hashicorp/google/latest/docs)
- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Cloud SQL Documentation](https://cloud.google.com/sql/docs)

## 🆘 Support

En cas de problème :
1. Consulter les logs : `gcloud logging read --project=mimo-finance-prod --limit=50`
2. Vérifier le monitoring : [Cloud Console Monitoring](https://console.cloud.google.com/monitoring)
3. Consulter la documentation GCP

---

**Auteur** : GitHub Copilot  
**Version** : 1.0.0  
**Dernière mise à jour** : Sprint 9 - Phase 1
