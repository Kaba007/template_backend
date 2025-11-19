import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from typing import List, Optional
import logging
from pathlib import Path

from backend.core.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)


class EmailService:
    """
    Jednoduchá služba pro odesílání emailů přes SMTP.
    """

    def __init__(
        self,
        smtp_host: str = None,
        smtp_port: int = None,
        smtp_user: str = None,
        smtp_password: str = None,
        from_email: str = None,
        from_name: str = None
    ):
        """
        Inicializace email služby.
        Pokud nejsou parametry poskytnuty, použijí se z settings.
        """
        self.smtp_host = smtp_host or settings.smtp_host
        self.smtp_port = smtp_port or settings.smtp_port
        self.smtp_user = smtp_user or settings.smtp_user
        self.smtp_password = smtp_password or settings.smtp_password
        self.from_email = from_email or settings.smtp_from_email
        self.from_name = from_name or settings.smtp_from_name

    def send_email(
        self,
        to_email: str | List[str],
        subject: str,
        body: str,
        html: bool = False,
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None,
        attachments: Optional[List[str]] = None
    ) -> bool:
        """
        Odešle email.

        Args:
            to_email: Email příjemce nebo seznam příjemců
            subject: Předmět emailu
            body: Tělo emailu (text nebo HTML)
            html: True pokud je body HTML
            cc: Seznam CC adres
            bcc: Seznam BCC adres
            attachments: Seznam cest k přílohám

        Returns:
            True pokud byl email úspěšně odeslán
        """
        try:
            # Vytvoř zprávu
            msg = MIMEMultipart()
            msg['From'] = f"{self.from_name} <{self.from_email}>"
            msg['To'] = to_email if isinstance(to_email, str) else ", ".join(to_email)
            msg['Subject'] = subject

            if cc:
                msg['Cc'] = ", ".join(cc)
            if bcc:
                msg['Bcc'] = ", ".join(bcc)

            # Přidej tělo
            mime_type = 'html' if html else 'plain'
            msg.attach(MIMEText(body, mime_type, 'utf-8'))

            # Přidej přílohy
            if attachments:
                for file_path in attachments:
                    self._attach_file(msg, file_path)

            # Připoj se k SMTP a odešli
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_user, self.smtp_password)

                # Získej všechny příjemce
                all_recipients = []
                if isinstance(to_email, str):
                    all_recipients.append(to_email)
                else:
                    all_recipients.extend(to_email)
                if cc:
                    all_recipients.extend(cc)
                if bcc:
                    all_recipients.extend(bcc)

                server.send_message(msg, to_addrs=all_recipients)

            logger.info(f"Email sent successfully to {to_email}")
            return True

        except Exception as e:
            logger.error(f"Failed to send email: {e}")
            return False

    def _attach_file(self, msg: MIMEMultipart, file_path: str):
        """Přidá přílohu k emailu."""
        path = Path(file_path)

        if not path.exists():
            logger.warning(f"Attachment not found: {file_path}")
            return

        with open(file_path, 'rb') as f:
            part = MIMEBase('application', 'octet-stream')
            part.set_payload(f.read())

        encoders.encode_base64(part)
        part.add_header(
            'Content-Disposition',
            f'attachment; filename={path.name}'
        )
        msg.attach(part)

    def send_simple_email(self, to_email: str, subject: str, body: str) -> bool:
        """
        Zkrácená verze pro jednoduchý text email.
        """
        return self.send_email(to_email, subject, body, html=False)

    def send_html_email(self, to_email: str, subject: str, html_body: str) -> bool:
        """
        Zkrácená verze pro HTML email.
        """
        return self.send_email(to_email, subject, html_body, html=True)


# Globální instance pro snadné použití
email_service = EmailService()
