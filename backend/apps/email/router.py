from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from pydantic import BaseModel, EmailStr
from typing import List, Optional

from backend.apps.email.servis import email_service, EmailService
from backend.core.services.auth import get_current_user, require_permissions
from backend.core.models.auth import User, PermissionType

router = APIRouter()


# Request models
class SimpleEmailRequest(BaseModel):
    to_email: EmailStr
    subject: str
    body: str


class EmailRequest(BaseModel):
    to_email: EmailStr | List[EmailStr]
    subject: str
    body: str
    html: bool = False
    cc: Optional[List[EmailStr]] = None
    bcc: Optional[List[EmailStr]] = None


class EmailResponse(BaseModel):
    success: bool
    message: str


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
