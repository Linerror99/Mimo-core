"""
PDF Service

Service de génération de rapports financiers mensuels professionnels en PDF (Executive Financial Statement)
"""
import calendar
import os
from datetime import datetime
from decimal import Decimal
from io import BytesIO
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.pdfgen import canvas
from reportlab.platypus import HRFlowable, Image, KeepTogether, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from sqlalchemy import and_, extract, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.account import Account
from app.models.category import Category
from app.models.transaction import Transaction, TransactionState, TransactionType
from app.models.user import User


class NumberedCanvas(canvas.Canvas):
    """Canvas personnalisé pour ajouter automatiquement la pagination 'Page X sur Y' et le pied de page."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_footer(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_footer(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))

        # Ligne de séparation de pied de page
        self.setStrokeColor(colors.HexColor("#e2e8f0"))
        self.setLineWidth(0.6)
        self.line(1.5 * cm, 1.3 * cm, 19.5 * cm, 1.3 * cm)

        # Mentions légales & pagination
        self.drawString(1.5 * cm, 0.8 * cm, "Mimo Finance Core — Document récapitulatif mensuel confidentiel")
        page_text = f"Page {self._pageNumber} / {page_count}"
        self.drawRightString(19.5 * cm, 0.8 * cm, page_text)
        self.restoreState()


class PDFService:
    """Service de génération de rapports financiers PDF haute qualité"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def generate_monthly_report(
        self,
        user_id: str,
        year: int,
        month: int
    ) -> bytes:
        """
        Génère un rapport financier mensuel officiel en PDF
        """
        if month < 1 or month > 12:
            raise ValueError(f"Mois invalide: {month}. Doit être entre 1 et 12.")

        # Récupérer l'utilisateur
        user = await self.db.get(User, user_id)
        if not user:
            raise Exception(f"Utilisateur non trouvé: {user_id}")

        # Récupérer les transactions du mois pour l'utilisateur / foyer
        transactions = await self._get_monthly_transactions(user, year, month)

        # Calculer les statistiques complètes
        stats = self._calculate_statistics(transactions)

        # Générer le PDF
        pdf_bytes = self._create_pdf(user, year, month, transactions, stats)

        return pdf_bytes

    async def _get_monthly_transactions(
        self,
        user: User,
        year: int,
        month: int
    ) -> list[Transaction]:
        """Récupère toutes les transactions actives du mois pour le compte/foyer de l'utilisateur"""
        conditions = [
            Transaction.deleted_at.is_(None),
            Transaction.state != TransactionState.CANCELLED,
            extract('year', Transaction.transaction_date) == year,
            extract('month', Transaction.transaction_date) == month,
        ]

        if user.household_id:
            conditions.append(
                or_(
                    Transaction.household_id == user.household_id,
                    Transaction.owner_user_id == user.id
                )
            )
        else:
            conditions.append(Transaction.owner_user_id == user.id)

        stmt = select(Transaction).where(
            and_(*conditions)
        ).options(
            selectinload(Transaction.category),
            selectinload(Transaction.account),
            selectinload(Transaction.destination_account),
        ).order_by(Transaction.transaction_date.asc(), Transaction.created_at.asc())

        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    def _calculate_statistics(self, transactions: list[Transaction]) -> dict:
        """Calcule l'ensemble des indicateurs financiers et la ventilation par catégorie"""
        total_income = Decimal("0")
        total_expense = Decimal("0")
        total_transfer = Decimal("0")

        expenses_by_category = {}
        incomes_by_category = {}

        for tx in transactions:
            amt = abs(Decimal(str(tx.amount)))
            if tx.type == TransactionType.INCOME:
                total_income += amt
                cat_name = tx.category.name if tx.category else "Autres revenus"
                incomes_by_category[cat_name] = incomes_by_category.get(cat_name, Decimal("0")) + amt
            elif tx.type == TransactionType.EXPENSE:
                total_expense += amt
                cat_name = tx.category.name if tx.category else "Autres dépenses"
                expenses_by_category[cat_name] = expenses_by_category.get(cat_name, Decimal("0")) + amt
            elif tx.type == TransactionType.TRANSFER:
                total_transfer += amt

        net_balance = total_income - total_expense
        savings_rate = Decimal("0")
        if total_income > Decimal("0"):
            savings_rate = round((net_balance / total_income) * Decimal("100"), 1)

        return {
            "total_income": total_income,
            "total_expense": total_expense,
            "total_transfer": total_transfer,
            "net_balance": net_balance,
            "savings_rate": savings_rate,
            "transaction_count": len(transactions),
            "expenses_by_category": expenses_by_category,
            "incomes_by_category": incomes_by_category,
        }

    def _create_pdf(
        self,
        user: User,
        year: int,
        month: int,
        transactions: list[Transaction],
        stats: dict
    ) -> bytes:
        """Construit le document PDF avec mise en page exécutive et moderne"""
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            leftMargin=1.5 * cm,
            rightMargin=1.5 * cm,
            topMargin=1.5 * cm,
            bottomMargin=1.8 * cm
        )
        story = []

        # Palette de couleurs
        C_PRIMARY = colors.HexColor("#1e3a8a")     # Bleu marine institutionnel
        C_SECONDARY = colors.HexColor("#4f46e5")   # Indigo vif
        C_DARK = colors.HexColor("#0f172a")        # Noir ardoise
        C_GRAY_LIGHT = colors.HexColor("#f8fafc")  # Fond très clair
        C_GRAY_ALT = colors.HexColor("#f1f5f9")    # Fond alterné
        C_BORDER = colors.HexColor("#e2e8f0")      # Bordure subtile
        C_TEXT_MUTED = colors.HexColor("#64748b")  # Texte gris
        C_SUCCESS = colors.HexColor("#059669")     # Vert émeraude
        C_DANGER = colors.HexColor("#dc2626")      # Rouge vif
        C_SKY = colors.HexColor("#0284c7")         # Bleu ciel pour virements

        # Styles typographiques
        styles = getSampleStyleSheet()
        
        style_header_title = ParagraphStyle(
            'HeaderDocTitle',
            parent=styles['Heading1'],
            fontName='Helvetica-Bold',
            fontSize=16,
            leading=20,
            textColor=C_PRIMARY,
            alignment=2  # Align Right
        )

        style_brand = ParagraphStyle(
            'HeaderBrand',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=20,
            leading=24,
            textColor=C_SECONDARY,
        )

        style_brand_sub = ParagraphStyle(
            'HeaderBrandSub',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=8.5,
            leading=11,
            textColor=C_TEXT_MUTED,
        )

        style_period = ParagraphStyle(
            'HeaderPeriod',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=9.5,
            leading=13,
            textColor=C_TEXT_MUTED,
            alignment=2
        )

        style_section_title = ParagraphStyle(
            'SectionTitle',
            parent=styles['Heading2'],
            fontName='Helvetica-Bold',
            fontSize=11,
            leading=14,
            textColor=C_PRIMARY,
            spaceAfter=6,
        )

        style_cell_header = ParagraphStyle(
            'CellHeader',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=8,
            leading=10,
            textColor=colors.white,
        )

        style_cell = ParagraphStyle(
            'CellText',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=8,
            leading=11,
            textColor=C_DARK,
        )

        style_cell_bold = ParagraphStyle(
            'CellTextBold',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=8,
            leading=11,
            textColor=C_DARK,
        )

        style_cell_right = ParagraphStyle(
            'CellTextRight',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=8,
            leading=11,
            textColor=C_DARK,
            alignment=2
        )

        style_cell_green = ParagraphStyle(
            'CellTextGreen',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=8,
            leading=11,
            textColor=C_SUCCESS,
            alignment=2
        )

        style_cell_red = ParagraphStyle(
            'CellTextRed',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=8,
            leading=11,
            textColor=C_DANGER,
            alignment=2
        )

        style_cell_blue = ParagraphStyle(
            'CellTextBlue',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=8,
            leading=11,
            textColor=C_SKY,
            alignment=2
        )

        # -------------------------------------------------------------
        # 1. EN-TÊTE DU RAPPORT (HEADER BANNER AVEC LOGO)
        # -------------------------------------------------------------
        month_names = [
            "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
            "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
        ]
        month_name = month_names[month - 1]
        _, last_day = calendar.monthrange(year, month)
        period_str = f"Période du 01/{month:02d}/{year} au {last_day:02d}/{month:02d}/{year}"

        # Recherche du fichier logo
        logo_candidates = [
            Path("/app/app/static/mimo-logo.jpg"),
            Path(__file__).parent.parent / "static" / "mimo-logo.jpg",
            Path("app/static/mimo-logo.jpg"),
            Path("frontend/public/mimo-logo.jpg"),
        ]
        logo_path = None
        for p in logo_candidates:
            if p.exists():
                logo_path = str(p)
                break

        if logo_path:
            logo_flowable = Image(logo_path, width=1.4 * cm, height=1.4 * cm)
            brand_block = Table(
                [
                    [
                        logo_flowable,
                        [
                            Paragraph("<b>Mimo Finance</b>", style_brand),
                            Paragraph("Plateforme de Pilotage Budgétaire", style_brand_sub)
                        ]
                    ]
                ],
                colWidths=[1.6 * cm, 7.4 * cm]
            )
            brand_block.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('LEFTPADDING', (0, 0), (-1, -1), 0),
                ('RIGHTPADDING', (0, 0), (-1, -1), 0),
                ('TOPPADDING', (0, 0), (-1, -1), 0),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
            ]))
        else:
            brand_block = [
                Paragraph("<b>Mimo Finance</b>", style_brand),
                Paragraph("Plateforme de Pilotage Budgétaire", style_brand_sub)
            ]

        header_data = [
            [
                brand_block,
                Paragraph(f"RAPPORT FINANCIER MENSUEL", style_header_title)
            ],
            [
                "",
                Paragraph(f"<b>{month_name.upper()} {year}</b> — {period_str}", style_period)
            ]
        ]
        header_table = Table(header_data, colWidths=[9.0 * cm, 9.0 * cm])
        header_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('SPAN', (0, 0), (0, 1)),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
            ('TOPPADDING', (0, 0), (-1, -1), 0),
        ]))
        story.append(header_table)
        story.append(Spacer(1, 0.4 * cm))
        story.append(HRFlowable(width="100%", thickness=1.5, color=C_PRIMARY, spaceAfter=14))

        # -------------------------------------------------------------
        # 2. CARTOUCHE CLIENT & RÉFÉRENCES (2 COLONNES)
        # -------------------------------------------------------------
        gen_date = datetime.now().strftime("%d/%m/%Y à %H:%M")
        user_full_name = f"{user.first_name} {user.last_name}".strip()
        ref_id = f"MIMO-{year}{month:02d}-{user.id[:8].upper()}"

        meta_col1 = (
            f"<b>RÉFÉRENCE RAPPORT :</b> {ref_id}<br/>"
            f"<b>Date d'édition :</b> {gen_date}<br/>"
            f"<b>Devise de compte :</b> EUR (€)"
        )
        meta_col2 = (
            f"<b>TITULAIRE DU COMPTE :</b> {user_full_name}<br/>"
            f"<b>Identifiant email :</b> {user.email}<br/>"
            f"<b>Statut Foyer :</b> {'Mode Foyer Partagé' if user.household_id else 'Compte Individuel'}"
        )

        cartouche_data = [
            [
                Paragraph(meta_col1, style_cell),
                Paragraph(meta_col2, style_cell)
            ]
        ]
        cartouche_table = Table(cartouche_data, colWidths=[9.0 * cm, 9.0 * cm])
        cartouche_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), C_GRAY_LIGHT),
            ('BOX', (0, 0), (-1, -1), 0.8, C_BORDER),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, C_BORDER),
            ('TOPPADDING', (0, 0), (-1, -1), 7),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ]))
        story.append(cartouche_table)
        story.append(Spacer(1, 0.5 * cm))

        # -------------------------------------------------------------
        # 3. SYNTHÈSE BUDGÉTAIRE (INDICATEURS CLÉS)
        # -------------------------------------------------------------
        story.append(Paragraph("SYNTHÈSE BUDGÉTAIRE & SOLDE DU MOIS", style_section_title))

        kpi_headers = ["TOTAL REVENUS (+)", "TOTAL DÉPENSES (-)", "VIREMENTS / ÉPARGNE", "RÉSULTAT NET DU MOIS"]
        kpi_values = [
            f"+ {stats['total_income']:,.2f} €".replace(',', ' ').replace('.', ','),
            f"- {stats['total_expense']:,.2f} €".replace(',', ' ').replace('.', ','),
            f"{stats['total_transfer']:,.2f} €".replace(',', ' ').replace('.', ','),
            f"{'+ ' if stats['net_balance'] >= 0 else ''}{stats['net_balance']:,.2f} €".replace(',', ' ').replace('.', ',')
        ]

        kpi_table_data = [
            [
                Paragraph(f"<font size=7 color='#64748b'><b>{kpi_headers[0]}</b></font>", style_cell),
                Paragraph(f"<font size=7 color='#64748b'><b>{kpi_headers[1]}</b></font>", style_cell),
                Paragraph(f"<font size=7 color='#64748b'><b>{kpi_headers[2]}</b></font>", style_cell),
                Paragraph(f"<font size=7 color='#64748b'><b>{kpi_headers[3]}</b></font>", style_cell),
            ],
            [
                Paragraph(f"<b><font size=11 color='#059669'>{kpi_values[0]}</font></b>", style_cell),
                Paragraph(f"<b><font size=11 color='#dc2626'>{kpi_values[1]}</font></b>", style_cell),
                Paragraph(f"<b><font size=11 color='#0284c7'>{kpi_values[2]}</font></b>", style_cell),
                Paragraph(f"<b><font size=11 color='{'#059669' if stats['net_balance'] >= 0 else '#dc2626'}'>{kpi_values[3]}</font></b>", style_cell),
            ]
        ]
        kpi_table = Table(kpi_table_data, colWidths=[4.5 * cm, 4.5 * cm, 4.5 * cm, 4.5 * cm])
        kpi_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), C_GRAY_LIGHT),
            ('BOX', (0, 0), (-1, -1), 0.8, C_BORDER),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, C_BORDER),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ]))
        story.append(kpi_table)
        story.append(Spacer(1, 0.6 * cm))

        # -------------------------------------------------------------
        # 4. VENTILATION PAR CATÉGORIE (TABLEAU SYNTHÉTIQUE)
        # -------------------------------------------------------------
        if stats['expenses_by_category'] or stats['incomes_by_category']:
            cat_table_data = [
                [
                    Paragraph("<b>POSTE / CATÉGORIE</b>", style_cell_header),
                    Paragraph("<b>NATURE</b>", style_cell_header),
                    Paragraph("<b>MONTANT TOTAL</b>", style_cell_header),
                    Paragraph("<b>PART DU BUDGET</b>", style_cell_header)
                ]
            ]

            # Incomes
            for cat_name, amt in sorted(stats['incomes_by_category'].items(), key=lambda x: x[1], reverse=True):
                pct = (amt / stats['total_income'] * 100) if stats['total_income'] > 0 else 0
                cat_table_data.append([
                    Paragraph(cat_name, style_cell_bold),
                    Paragraph("Revenu", style_cell_green),
                    Paragraph(f"+ {amt:,.2f} €".replace(',', ' ').replace('.', ','), style_cell_green),
                    Paragraph(f"{pct:.1f} %", style_cell_right)
                ])

            # Expenses
            for cat_name, amt in sorted(stats['expenses_by_category'].items(), key=lambda x: x[1], reverse=True):
                pct = (amt / stats['total_expense'] * 100) if stats['total_expense'] > 0 else 0
                cat_table_data.append([
                    Paragraph(cat_name, style_cell),
                    Paragraph("Dépense", style_cell_red),
                    Paragraph(f"- {amt:,.2f} €".replace(',', ' ').replace('.', ','), style_cell_red),
                    Paragraph(f"{pct:.1f} %", style_cell_right)
                ])

            cat_table = Table(cat_table_data, colWidths=[7.0 * cm, 3.5 * cm, 4.0 * cm, 3.5 * cm])
            cat_table_style = [
                ('BACKGROUND', (0, 0), (-1, 0), C_PRIMARY),
                ('BOX', (0, 0), (-1, -1), 0.8, C_BORDER),
                ('INNERGRID', (0, 0), (-1, -1), 0.5, C_BORDER),
                ('TOPPADDING', (0, 0), (-1, -1), 5),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
                ('LEFTPADDING', (0, 0), (-1, -1), 8),
                ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ]
            for i in range(1, len(cat_table_data)):
                bg = colors.white if i % 2 == 1 else C_GRAY_LIGHT
                cat_table_style.append(('BACKGROUND', (0, i), (-1, i), bg))

            cat_table.setStyle(TableStyle(cat_table_style))
            
            story.append(KeepTogether([
                Paragraph("VENTILATION PAR CATÉGORIE", style_section_title),
                cat_table,
                Spacer(1, 0.6 * cm)
            ]))

        # -------------------------------------------------------------
        # 5. GRAND LIVRE DES OPÉRATIONS DÉTAILLÉES
        # -------------------------------------------------------------
        story.append(Paragraph(f"DÉTAIL DES OPÉRATIONS ({len(transactions)} transaction{'s' if len(transactions) > 1 else ''})", style_section_title))

        if transactions:
            tx_table_data = [
                [
                    Paragraph("<b>DATE</b>", style_cell_header),
                    Paragraph("<b>LIBELLÉ DE L'OPÉRATION</b>", style_cell_header),
                    Paragraph("<b>COMPTE BANCAIRE</b>", style_cell_header),
                    Paragraph("<b>CATÉGORIE</b>", style_cell_header),
                    Paragraph("<b>DÉBIT (-)</b>", style_cell_header),
                    Paragraph("<b>CRÉDIT (+)</b>", style_cell_header)
                ]
            ]

            total_debits = Decimal("0")
            total_credits = Decimal("0")

            for tx in transactions:
                t_date = tx.transaction_date.strftime("%d/%m/%Y")
                desc = tx.description or "Sans libellé"
                
                # Compte source / destination
                acc_name = tx.account.name if tx.account else "Compte principal"
                if tx.type == TransactionType.TRANSFER and tx.destination_account:
                    acc_name = f"{acc_name} → {tx.destination_account.name}"

                cat_name = tx.category.name if tx.category else ("Virement interne" if tx.type == TransactionType.TRANSFER else "Général")

                amt = abs(Decimal(str(tx.amount)))
                debit_str = ""
                credit_str = ""

                if tx.type == TransactionType.EXPENSE:
                    debit_str = f"{amt:,.2f} €".replace(',', ' ').replace('.', ',')
                    total_debits += amt
                    style_amt_d = style_cell_red
                    style_amt_c = style_cell_right
                elif tx.type == TransactionType.INCOME:
                    credit_str = f"{amt:,.2f} €".replace(',', ' ').replace('.', ',')
                    total_credits += amt
                    style_amt_d = style_cell_right
                    style_amt_c = style_cell_green
                else: # TRANSFER
                    credit_str = f"{amt:,.2f} €".replace(',', ' ').replace('.', ',')
                    style_amt_d = style_cell_right
                    style_amt_c = style_cell_blue

                tx_table_data.append([
                    Paragraph(t_date, style_cell),
                    Paragraph(desc, style_cell_bold),
                    Paragraph(acc_name, style_cell),
                    Paragraph(cat_name, style_cell),
                    Paragraph(debit_str, style_amt_d),
                    Paragraph(credit_str, style_amt_c)
                ])

            # Ligne de totaux finaux
            tx_table_data.append([
                Paragraph("<b>TOTAL</b>", style_cell_bold),
                Paragraph(f"<b>{len(transactions)} opérations</b>", style_cell_bold),
                Paragraph("", style_cell),
                Paragraph("", style_cell),
                Paragraph(f"<b>{total_debits:,.2f} €</b>".replace(',', ' ').replace('.', ','), style_cell_red),
                Paragraph(f"<b>{total_credits:,.2f} €</b>".replace(',', ' ').replace('.', ','), style_cell_green)
            ])

            tx_table = Table(
                tx_table_data,
                colWidths=[2.2 * cm, 5.0 * cm, 3.8 * cm, 2.8 * cm, 2.1 * cm, 2.1 * cm],
                repeatRows=1
            )

            tx_table_style = [
                ('BACKGROUND', (0, 0), (-1, 0), C_PRIMARY),
                ('BOX', (0, 0), (-1, -1), 0.8, C_BORDER),
                ('INNERGRID', (0, 0), (-1, -1), 0.4, C_BORDER),
                ('TOPPADDING', (0, 0), (-1, -1), 4.5),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4.5),
                ('LEFTPADDING', (0, 0), (-1, -1), 5),
                ('RIGHTPADDING', (0, 0), (-1, -1), 5),
                # Totals row style
                ('BACKGROUND', (0, -1), (-1, -1), C_GRAY_ALT),
                ('LINEABOVE', (0, -1), (-1, -1), 1.2, C_PRIMARY),
            ]

            for i in range(1, len(tx_table_data) - 1):
                bg = colors.white if i % 2 == 1 else C_GRAY_LIGHT
                tx_table_style.append(('BACKGROUND', (0, i), (-1, i), bg))

            tx_table.setStyle(TableStyle(tx_table_style))
            story.append(tx_table)
        else:
            empty_box = [
                [Paragraph("<i>Aucune transaction enregistrée pour ce mois.</i>", style_cell)]
            ]
            empty_table = Table(empty_box, colWidths=[18.0 * cm])
            empty_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), C_GRAY_LIGHT),
                ('BOX', (0, 0), (-1, -1), 0.8, C_BORDER),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('TOPPADDING', (0, 0), (-1, -1), 14),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 14),
            ]))
            story.append(empty_table)

        # Générer le document avec le canvas numéroté
        doc.build(story, canvasmaker=NumberedCanvas)
        pdf_bytes = buffer.getvalue()
        buffer.close()

        return pdf_bytes

    def get_filename(self, user_id: str, year: int, month: int) -> str:
        """Génère un nom de fichier standard pour le rapport PDF"""
        return f"rapport_financier_mimo_{year}_{month:02d}.pdf"
