from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.core.models.base import Base
# Tabulka pro ukládání dokumentů s polymorfním vztahem
class Document(Base):
    __tablename__ = 'documents'

    id = Column(Integer, primary_key=True)

    # Polymorfní vztah - umožňuje napojení na libovolnou tabulku
    entity_type = Column(String(50), nullable=False)  # např. 'invoice', 'deal', 'lead'
    entity_id = Column(Integer, nullable=False)        # ID záznamu v cílové tabulce

    # Informace o dokumentu
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    minio_path = Column(String(500), nullable=False)   # Cesta v MinIO
    minio_bucket = Column(String(100), nullable=False) # Bucket v MinIO

    # Metadata
    file_size = Column(Integer)  # Velikost v bytech
    mime_type = Column(String(100))
    description = Column(String(500))

    # Časové razítka
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    uploaded_by = Column(Integer, ForeignKey('users.id'))  # Pokud máš tabulku users

    # Indexy pro rychlé vyhledávání
    __table_args__ = (
        Index('idx_entity', 'entity_type', 'entity_id'),
    )
