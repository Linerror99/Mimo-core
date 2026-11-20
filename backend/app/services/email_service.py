"""
Email service for sending transactional emails (password reset, invitations, alerts).
"""
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from app.config import settings
from app.core.logger import logger


class EmailService:
    @staticmethod
    def send_password_reset_code(email: str, code: str) -> bool:
        """
        Send a 6-digit password reset verification code by email.
        """
        subject = f"🔐 Votre code de réinitialisation Mimo Finance : {code}"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; }}
            .container {{ max-width: 540px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; padding: 32px; border: 1px solid #e2e8f0; }}
            .logo {{ text-align: center; margin-bottom: 24px; }}
            .title {{ font-size: 22px; font-weight: 700; color: #0f172a; margin-bottom: 12px; text-align: center; }}
            .text {{ font-size: 15px; color: #475569; line-height: 1.6; margin-bottom: 24px; }}
            .code-box {{ background: #f1f5f9; border-radius: 12px; padding: 18px; text-align: center; margin: 24px 0; }}
            .code {{ font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #4f46e5; }}
            .footer {{ font-size: 13px; color: #94a3b8; text-align: center; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px; }}
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">
              <h2 style="color: #4f46e5; margin: 0;">Mimo Finance</h2>
            </div>
            <div class="title">Réinitialisation de mot de passe</div>
            <p class="text">Bonjour,</p>
            <p class="text">Une demande de réinitialisation de mot de passe a été initiée pour votre compte. Voici votre code de validation sécurisé :</p>
            
            <div class="code-box">
              <div class="code">{code}</div>
            </div>

            <p class="text">Ce code est confidentiel et expirera dans <strong>15 minutes</strong>. Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email en toute sécurité.</p>
            
            <div class="footer">
              © {settings.APP_NAME} — Sécurité de vos finances
            </div>
          </div>
        </body>
        </html>
        """

        text_content = f"Bonjour,\n\nVotre code de réinitialisation Mimo Finance est : {code}\nCe code expire dans 15 minutes.\nSi vous n'êtes pas à l'origine de cette demande, ignorez ce message."

        # Check if SMTP settings are present
        smtp_host = getattr(settings, "SMTP_HOST", None)
        smtp_port = getattr(settings, "SMTP_PORT", 587)
        smtp_user = getattr(settings, "SMTP_USER", None)
        smtp_pass = getattr(settings, "SMTP_PASSWORD", None)
        from_email = getattr(settings, "SMTP_FROM_EMAIL", "noreply@mimofinance.com")

        if smtp_host and smtp_user and smtp_pass:
            try:
                msg = MIMEMultipart("alternative")
                msg["Subject"] = subject
                msg["From"] = f"Mimo Finance <{from_email}>"
                msg["To"] = email

                msg.attach(MIMEText(text_content, "plain"))
                msg.attach(MIMEText(html_content, "html"))

                with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
                    if getattr(settings, "SMTP_TLS", True):
                        server.starttls()
                    server.login(smtp_user, smtp_pass)
                    server.sendmail(from_email, [email], msg.as_string())
                
                logger.info(f"Password reset email sent to {email}")
                return True
            except Exception as e:
                logger.error(f"Failed to send email via SMTP: {e}")
        
        # Log clearly for local / dev environment
        logger.info(f"[EMAIL DEV] Code de réinitialisation pour {email} : {code}")
        print(f"\n=======================================================\n📧 [EMAIL REINITIALISATION] Pour {email}\n🔑 CODE A 6 CHIFFRES : {code}\n=======================================================\n")
        return True
