"""
Storage Service

Gère l'upload et la suppression de fichiers.
- Développement: stockage local dans /uploads/
- Production (GCP): Google Cloud Storage
"""
import os
import shutil
import uuid
from pathlib import Path
from typing import Optional

from fastapi import HTTPException, UploadFile

try:
    from google.cloud import storage
    from google.api_core import exceptions as gcp_exceptions
    GCS_AVAILABLE = True
except ImportError:
    GCS_AVAILABLE = False
    storage = None
    gcp_exceptions = None

from app.config import settings


class StorageService:
    """
    Service de gestion des fichiers

    Fonctionnalités:
    - Upload de fichiers (avatars, receipts, etc.)
    - Validation (type, taille)
    - Génération URL publique
    - Suppression fichiers
    - Support GCS en production et local en dev
    """

    # Configuration
    MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB
    ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/jpg", "image/webp"}

    def __init__(self):
        """Initialise le service selon l'environnement"""
        self.environment = settings.ENVIRONMENT
        self.use_gcs = self.environment == "production" and GCS_AVAILABLE
        
        if self.use_gcs:
            # Production: Google Cloud Storage
            self.gcs_client = storage.Client()
            self.bucket_name = settings.GCS_BUCKET_UPLOADS
            self.bucket = self.gcs_client.bucket(self.bucket_name)
        else:
            # Développement: stockage local
            upload_dir = os.getenv("UPLOAD_DIR", "/app/uploads")
            self.UPLOAD_DIR = Path(upload_dir)
            self.AVATAR_DIR = self.UPLOAD_DIR / "avatars"
            self.RECEIPT_DIR = self.UPLOAD_DIR / "receipts"
            self.AVATAR_DIR.mkdir(parents=True, exist_ok=True)
            self.RECEIPT_DIR.mkdir(parents=True, exist_ok=True)

    async def upload_avatar(self, file: UploadFile, user_id: str) -> str:
        """
        Upload avatar utilisateur

        Args:
            file: Fichier uploadé (FastAPI UploadFile)
            user_id: ID de l'utilisateur

        Returns:
            URL relative de l'avatar (/uploads/avatars/...)

        Raises:
            HTTPException: Si validation échoue
        """
        # Validation type
        if file.content_type not in self.ALLOWED_IMAGE_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"Type de fichier non autorisé. Types acceptés: {', '.join(self.ALLOWED_IMAGE_TYPES)}"
            )

        # Validation taille
        file.file.seek(0, 2)  # Aller à la fin du fichier
        file_size = file.file.tell()
        file.file.seek(0)  # Retour au début

        if file_size > self.MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"Fichier trop volumineux. Taille max: {self.MAX_FILE_SIZE / 1024 / 1024} MB"
            )

        # Générer nom de fichier unique
        file_extension = Path(file.filename).suffix if file.filename else ".jpg"
        unique_filename = f"{user_id}_{uuid.uuid4()}{file_extension}"

        if self.use_gcs:
            # Production: upload vers GCS
            try:
                blob = self.bucket.blob(f"avatars/{unique_filename}")
                # Upload avec content type
                blob.upload_from_file(file.file, content_type=file.content_type)
                # Rendre public pour accès direct
                blob.make_public()
                return blob.public_url
            except gcp_exceptions.GoogleAPIError as e:
                raise HTTPException(status_code=500, detail=f"Erreur upload GCS: {str(e)}")
            finally:
                file.file.close()
        else:
            # Développement: stockage local
            file_path = self.AVATAR_DIR / unique_filename
            try:
                with open(file_path, "wb") as buffer:
                    shutil.copyfileobj(file.file, buffer)
            except Exception as e:
                raise HTTPException(
                    status_code=500,
                    detail=f"Erreur lors de l'upload: {str(e)}"
                )
            finally:
                file.file.close()
            return f"/uploads/avatars/{unique_filename}"

    def delete_avatar(self, avatar_url: str) -> None:
        """
        Supprime un avatar

        Args:
            avatar_url: URL de l'avatar (/uploads/avatars/... ou URL GCS)

        Raises:
            HTTPException: Si fichier introuvable ou erreur suppression
        """
        if not avatar_url:
            return

        # Extraire nom fichier de l'URL
        filename = avatar_url.split("/")[-1]

        if self.use_gcs:
            # Production: suppression GCS
            try:
                blob = self.bucket.blob(f"avatars/{filename}")
                if blob.exists():
                    blob.delete()
            except gcp_exceptions.GoogleAPIError as e:
                # Log l'erreur mais ne bloque pas (fichier peut déjà être supprimé)
                print(f"Erreur suppression GCS: {str(e)}")
        else:
            # Développement: suppression locale
            try:
                file_path = self.AVATAR_DIR / filename
                if file_path.exists():
                    file_path.unlink()
            except Exception as e:
                # Log l'erreur mais ne bloque pas
                print(f"Erreur suppression locale: {str(e)}")

    def get_avatar_path(self, avatar_url: str) -> Optional[str]:
        """
        Récupère le chemin/URL d'un avatar

        Args:
            avatar_url: URL de l'avatar

        Returns:
            Path local (dev) ou URL GCS (prod), ou None si inexistant
        """
        if not avatar_url:
            return None

        if self.use_gcs:
            # En prod, retourne l'URL GCS directement
            return avatar_url
        else:
            # En dev, vérifie l'existence locale
            filename = avatar_url.split("/")[-1]
            file_path = self.AVATAR_DIR / filename
            return str(file_path) if file_path.exists() else None
