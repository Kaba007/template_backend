from enum import Enum

class VatMode(str, Enum):
    WITH_VAT = "with_vat"
    WITHOUT_VAT = "without_vat"
    REVERSE_CHARGE = "reverse_charge"
    OSS = "oss"
    EXEMPT = "exempt"

class CompanyType(str, Enum):
    SUPPLIER = "supplier"
    CUSTOMER = "customer"
    BOTH = "both"

class PaymentMethod(str, Enum):
    BANK_TRANSFER = "bank_transfer"
    CASH = "cash"
    CARD = "card"
    PAYPAL = "paypal"
    CRYPTO = "crypto"
    OTHER = "other"

