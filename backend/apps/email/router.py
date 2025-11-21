from fastapi import APIRouter, HTTPException, Depends,status,BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import  EmailStr
import secrets
from backend.apps.email.servis import email_service
from backend.apps.email.utils import send_password_reset_email
from backend.core.services.auth import get_current_user, require_permissions
from backend.core.models.auth import User, PermissionType
from backend.apps.email.schemas import ForgotPasswordRequest, ForgotPasswordResponse, EmailRequest, EmailResponse, SimpleEmailRequest
from sqlalchemy.orm import Session
import logging
from backend.core.db import get_db
from backend.core.services.auth import (
    get_current_user,
    get_password_hash
)
router = APIRouter()
logger = logging.getLogger(__name__)


# Endpointy
@router.post("/send", response_model=EmailResponse ,dependencies=[Depends(require_permissions("email", PermissionType.WRITE))])
async def send_email(
    email_data: SimpleEmailRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Odešle jednoduchý text email.

    Example:
    ```json
    {
        "to_email": "user@example.com",
        "subject": "Hello",
        "body": "This is a test email"
    }
    ```
    """
    success = email_service.send_simple_email(
        to_email=email_data.to_email,
        subject=email_data.subject,
        body=email_data.body
    )

    if not success:
        raise HTTPException(status_code=500, detail="Failed to send email")

    return EmailResponse(
        success=True,
        message=f"Email sent to {email_data.to_email}"
    )


@router.post("/send-advanced", response_model=EmailResponse ,dependencies=[Depends(require_permissions("email", PermissionType.WRITE))])
async def send_email_advanced(
    email_data: EmailRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Odešle email s pokročilými možnostmi (HTML, CC, BCC).

    Example:
    ```json
    {
        "to_email": "user@example.com",
        "subject": "Newsletter",
        "body": "<h1>Hello!</h1><p>This is HTML email</p>",
        "html": true,
        "cc": ["manager@example.com"],
        "bcc": ["archive@example.com"]
    }
    ```
    """
    success = email_service.send_email(
        to_email=email_data.to_email,
        subject=email_data.subject,
        body=email_data.body,
        html=email_data.html,
        cc=email_data.cc,
        bcc=email_data.bcc
    )

    if not success:
        raise HTTPException(status_code=500, detail="Failed to send email")

    return EmailResponse(
        success=True,
        message="Email sent successfully"
    )


@router.post("/send-html", response_model=EmailResponse,dependencies=[Depends(require_permissions("email", PermissionType.WRITE))])
async def send_html_email(
    email_data: SimpleEmailRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Odešle HTML email.

    Example:
    ```json
    {
        "to_email": "user@example.com",
        "subject": "Welcome!",
        "body": "<html><body><h1>Welcome to our app!</h1></body></html>"
    }
    ```
    """
    success = email_service.send_html_email(
        to_email=email_data.to_email,
        subject=email_data.subject,
        html_body=email_data.body
    )

    if not success:
        raise HTTPException(status_code=500, detail="Failed to send email")

    return EmailResponse(
        success=True,
        message=f"HTML email sent to {email_data.to_email}"
    )


@router.post("/test",dependencies=[Depends(require_permissions("email", PermissionType.WRITE))])
async def test_email(
    to_email: EmailStr,
    current_user: User = Depends(get_current_user)
):
    """
    Odešle testovací email pro ověření SMTP konfigurace.

    Usage: POST /email/test?to_email=test@example.com
    """
    success = email_service.send_simple_email(
        to_email=to_email,
        subject="Test Email",
        body=f"This is a test email sent from your app.\n\nUser: {current_user.client_id}"
    )

    if not success:
        raise HTTPException(
            status_code=500,
            detail="Failed to send test email. Check SMTP configuration."
        )

    return EmailResponse(
        success=True,
        message=f"Test email sent to {to_email}"
    )

@router.post("/forgot-password", response_model=ForgotPasswordResponse)
async def forgot_password(
    request_data: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Vygeneruje nové heslo a odešle ho na email uživatele (background job).

    Vyžaduje email pro ověření identity.
    Email se odesílá na pozadí, takže endpoint vrátí odpověď okamžitě.
    """

    # Najdi uživatele podle emailu
    user = db.query(User).filter(User.email == request_data.email).first()

    if not user:
        error_msg = ForgotPasswordResponse(
            success=False,
            message=f"User with email {request_data.email} not found."
        )
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content=error_msg.model_dump()
        )


    # Vygeneruj nové náhodné heslo (20 znaků, bezpečné)
    new_password = secrets.token_urlsafe(20)

    # Ulož nové heslo (hashované)
    user.client_secret = get_password_hash(new_password)
    db.commit()

    # Přidej úlohu na odeslání emailu do background tasks
    background_tasks.add_task(
        send_password_reset_email,
        email=request_data.email,
        client_id=user.client_id,
        new_password=new_password
    )

    logger.info(f"Password reset initiated for user {user.client_id}")

    return ForgotPasswordResponse(
        success=True,
        message=f"If an account with {request_data.email} exists, a password reset email has been sent."
    )
