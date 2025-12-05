
from enum import Enum as PyEnum

class PaymentMethod(str, PyEnum):
    """Způsob platby"""
    BANK_TRANSFER = "bank_transfer"  # Bankovním převodem
    CASH = "cash"                    # Hotově
    CARD = "card"                    # Kartou
    PAYPAL = "paypal"                # PayPal
    CRYPTO = "crypto"                # Kryptoměny
    OTHER = "other"                  # Jiné


class VatMode(str, PyEnum):
    """Režim DPH na faktuře"""
    WITH_VAT = "with_vat"            # Faktura s DPH (plátce DPH)
    WITHOUT_VAT = "without_vat"      # Faktura bez DPH (neplátce DPH)
    REVERSE_CHARGE = "reverse_charge"  # Přenesená daňová povinnost
    OSS = "oss"                      # One Stop Shop (EU)
    EXEMPT = "exempt"                # Osvobozeno od DPH
