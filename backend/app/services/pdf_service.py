"""
PDF Service

Service pour générer des rapports financiers mensuels en PDF
"""
from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from io import BytesIO

from sqlalchemy import select, and_, func, extract
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

from app.models import User, Transaction, TransactionType, TransactionState, Category


class PDFService:
    """Service de génération de rapports PDF"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def generate_monthly_report(
        self,
        user_id: str,
        year: int,
        month: int
    ) -> bytes:
        """
        Génère un rapport financier mensuel en PDF
        
        Args:
            user_id: ID de l'utilisateur
            year: Année (ex: 2025)
            month: Mois (1-12)
            
        Returns:
            bytes: Contenu du PDF
            
        Raises:
            ValueError: Si le mois est invalide
            Exception: Si l'utilisateur n'existe pas
        """
        # Validation du mois
        if month < 1 or month > 12:
            raise ValueError(f"Mois invalide: {month}. Doit être entre 1 et 12.")
        
        # Récupérer l'utilisateur
        user = await self.db.get(User, user_id)
        if not user:
            raise Exception(f"Utilisateur non trouvé: {user_id}")
        
        # Récupérer les transactions du mois
        transactions = await self._get_monthly_transactions(user_id, year, month)
        
        # Calculer les statistiques
        stats = self._calculate_statistics(transactions)
        
        # Générer le PDF
        pdf_bytes = self._create_pdf(user, year, month, transactions, stats)
        
        return pdf_bytes
    
    async def _get_monthly_transactions(
        self,
        user_id: str,
        year: int,
        month: int
    ) -> list[Transaction]:
        """Récupère les transactions d'un mois donné"""
        stmt = select(Transaction).where(
            and_(
                Transaction.owner_user_id == user_id,
                Transaction.deleted_at.is_(None),
                extract('year', Transaction.transaction_date) == year,
                extract('month', Transaction.transaction_date) == month
            )
        ).options(
            selectinload(Transaction.category)
        ).order_by(Transaction.transaction_date.desc())
        
        result = await self.db.execute(stmt)
        return result.scalars().all()
    
    def _calculate_statistics(self, transactions: list[Transaction]) -> dict:
        """Calcule les statistiques financières"""
        total_income = Decimal("0")
        total_expense = Decimal("0")
        
        for tx in transactions:
            if tx.type == TransactionType.INCOME:
                total_income += abs(tx.amount)
            elif tx.type == TransactionType.EXPENSE:
                total_expense += abs(tx.amount)
        
        balance = total_income - total_expense
        
        # Grouper par catégorie
        expenses_by_category = {}
        for tx in transactions:
            if tx.type == TransactionType.EXPENSE and tx.category:
                cat_name = tx.category.name
                if cat_name not in expenses_by_category:
                    expenses_by_category[cat_name] = Decimal("0")
                expenses_by_category[cat_name] += abs(tx.amount)
        
        return {
            "total_income": total_income,
            "total_expense": total_expense,
            "balance": balance,
            "transaction_count": len(transactions),
            "expenses_by_category": expenses_by_category
        }
    
    def _create_pdf(
        self,
        user: User,
        year: int,
        month: int,
        transactions: list[Transaction],
        stats: dict
    ) -> bytes:
        """Crée le document PDF"""
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        story = []
        
        # Styles
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#1a56db'),
            spaceAfter=30,
        )
        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            fontSize=16,
            textColor=colors.HexColor('#1a56db'),
            spaceAfter=12,
        )
        
        # Titre
        month_names = [
            "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
            "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
        ]
        title = f"Rapport Financier - {month_names[month-1]} {year}"
        story.append(Paragraph(title, title_style))
        story.append(Spacer(1, 0.5*cm))
        
        # Informations utilisateur
        user_info = f"<b>Utilisateur:</b> {user.first_name} {user.last_name}<br/>"
        user_info += f"<b>Email:</b> {user.email}<br/>"
        user_info += f"<b>Date de génération:</b> {datetime.now().strftime('%d/%m/%Y %H:%M')}"
        story.append(Paragraph(user_info, styles['Normal']))
        story.append(Spacer(1, 1*cm))
        
        # Résumé financier
        story.append(Paragraph("Résumé Financier", heading_style))
        summary_data = [
            ['Indicateur', 'Montant'],
            ['Revenus', f"{stats['total_income']:.2f} €"],
            ['Dépenses', f"{stats['total_expense']:.2f} €"],
            ['Solde', f"{stats['balance']:.2f} €"],
            ['Nombre de transactions', str(stats['transaction_count'])],
        ]
        
        summary_table = Table(summary_data, colWidths=[8*cm, 6*cm])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1a56db')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (1, 1), (1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ]))
        story.append(summary_table)
        story.append(Spacer(1, 1*cm))
        
        # Dépenses par catégorie
        if stats['expenses_by_category']:
            story.append(Paragraph("Dépenses par Catégorie", heading_style))
            category_data = [['Catégorie', 'Montant']]
            for cat_name, amount in sorted(
                stats['expenses_by_category'].items(),
                key=lambda x: x[1],
                reverse=True
            ):
                category_data.append([cat_name, f"{amount:.2f} €"])
            
            category_table = Table(category_data, colWidths=[8*cm, 6*cm])
            category_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1a56db')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('ALIGN', (1, 1), (1, -1), 'RIGHT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 12),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ]))
            story.append(category_table)
            story.append(Spacer(1, 1*cm))
        
        # Liste des transactions
        if transactions:
            story.append(Paragraph("Détail des Transactions", heading_style))
            tx_data = [['Date', 'Description', 'Catégorie', 'Montant']]
            
            for tx in transactions:
                tx_date = tx.transaction_date.strftime('%d/%m/%Y')
                description = tx.description or "-"
                category = tx.category.name if tx.category else "-"
                amount = f"{tx.amount:.2f} €"
                tx_data.append([tx_date, description, category, amount])
            
            tx_table = Table(tx_data, colWidths=[3*cm, 6*cm, 3*cm, 2*cm])
            tx_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1a56db')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('ALIGN', (3, 1), (3, -1), 'RIGHT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('FONTSIZE', (0, 1), (-1, -1), 9),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ]))
            story.append(tx_table)
        else:
            story.append(Paragraph("Aucune transaction pour ce mois.", styles['Normal']))
        
        # Générer le PDF
        doc.build(story)
        pdf_bytes = buffer.getvalue()
        buffer.close()
        
        return pdf_bytes
    
    def get_filename(self, user_id: str, year: int, month: int) -> str:
        """
        Génère un nom de fichier pour le rapport PDF
        
        Returns:
            str: Nom de fichier (ex: rapport_financier_2025_12.pdf)
        """
        return f"rapport_financier_{year}_{month:02d}.pdf"
