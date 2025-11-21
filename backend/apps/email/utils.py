from backend.apps.email.servis import email_service
import logging
logger = logging.getLogger(__name__)
def send_password_reset_email(email: str, client_id: str, new_password: str):
    """
    Background task pro odeslání emailu s novým heslem.

    Args:
        email: Email příjemce
        client_id: Client ID uživatele
        new_password: Nově vygenerované heslo (plain text)
    """
    try:
        email_subject = "Nové heslo pro váš účet"
        email_body = f"""
Dobrý den,

bylo vygenerováno nové heslo pro váš účet.

Client ID: {client_id}
Nové heslo: {new_password}

Z bezpečnostních důvodů doporučujeme heslo co nejdříve změnit v nastavení profilu.

S pozdravem,
Váš tým
        """

        success = email_service.send_simple_email(
            to_email=email,
            subject=email_subject,
            body=email_body
        )

        if success:
            logger.info(f"Password reset email sent successfully to {email}")
        else:
            logger.error(f"Failed to send password reset email to {email}")

    except Exception as e:
        logger.error(f"Error sending password reset email to {email}: {e}")
