from pydantic import BaseModel, EmailStr
from typing import Optional, List
class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ForgotPasswordResponse(BaseModel):
    success: bool
    message: str

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
