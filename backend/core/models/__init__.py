# Importuj Base
from backend.core.models.base import Base

#TOTO JE DŮLEŽITÉ - importuj všechny modely
# Tímto je řekneš SQLAlchemy, že existují
import backend.core.models.auth
import backend.core.models.invocie
import backend.core.models.deal
import backend.core.models.lead
import backend.core.models.company
import backend.core.models.product
import backend.apps.doc.model
