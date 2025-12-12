"""
Storage Service

Gère l'upload et la suppression de fichiers locaux.
Pour Sprint 7: stockage local dans /uploads/
Pour production GCP: migration vers Cloud Storage à faire ultérieurement.
"""
import os
import shutil
import uuid
from pathlib import Path
from typing import Optional

from fastapi import HTTPException, UploadFile


class StorageService:
    """
    Service de gestion des fichiers

    Fonctionnalités:
    - Upload de fichiers (avatars, receipts, etc.)
    - Validation (type, taille)
    - Génération URL publique
    - Suppression fichiers
    """

    # Configuration
    MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB
    ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/jpg", "image/webp"}

    def __init__(self):
        """Initialise les répertoires d'upload"""
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
        file_path = self.AVATAR_DIR / unique_filename

        # Sauvegarder fichier
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

        # Retourner URL relative
        return f"/uploads/avatars/{unique_filename}"

    def delete_avatar(self, avatar_url: str) -> None:
        """
        Supprime un avatar

        Args:
            avatar_url: URL de l'avatar (/uploads/avatars/...)

        Raises:
            HTTPException: Si fichier introuvable ou erreur suppression
        """
        if not avatar_url:
            return

        # Extraire nom fichier de l'URL
        try:
            filename = avatar_url.split("/")[-1]
            file_path = self.AVATAR_DIR / filename

            if file_path.exists():
                file_path.unlink()
            else:
                # Pas d'erreur si fichier n'existe pas (déjà supprimé)
                pass
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Erreur lors de la suppression: {str(e)}"
            )

    def get_avatar_path(self, avatar_url: str) -> Optional[Path]:
        """
        Récupère le chemin physique d'un avatar

        Args:
            avatar_url: URL de l'avatar

        Returns:
            Path du fichier ou None si inexistant
        """
        if not avatar_url:
            return None

        filename = avatar_url.split("/")[-1]
        file_path = self.AVATAR_DIR / filename

        return file_path if file_path.exists() else None
