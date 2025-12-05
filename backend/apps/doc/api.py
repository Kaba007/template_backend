from fastapi import FastAPI, UploadFile, File, Depends, HTTPException, APIRouter
from fastapi.responses import StreamingResponse, Response
from sqlalchemy.orm import Session
from urllib.parse import quote
import uuid
import io
from typing import List, Dict, Any, Optional
from backend.core.config import get_settings
from backend.core.db import get_db
from backend.core.services.auth import get_current_user, require_permissions
from backend.core.models.auth import User, PermissionType
from .model import Document
from .utils import verify_entity_exists, get_entity_info
from minio import Minio


settings = get_settings()
router = APIRouter()

# MinIO konfigurace
minio_client = Minio(
    settings.minio_origin,
    access_key=settings.minio_access_key,
    secret_key=settings.minio_secret_key,
    secure=settings.minio_secure
)

found = minio_client.bucket_exists(settings.minio_doc_bucket_name)
if not found:
    minio_client.make_bucket(settings.minio_doc_bucket_name)
    print("Created bucket", settings.minio_doc_bucket_name)
else:
    print("Bucket", settings.minio_doc_bucket_name, "already exists")


# Nový endpoint pro stromovou strukturu
@router.get("/storage/tree",
            dependencies=[Depends(require_permissions("documents", PermissionType.READ))]
            )
async def get_storage_tree(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)

):
    """
    Vrací stromovou strukturu MinIO storage s obohacenými daty o entitách

    Struktura:
    {
        "user": {
            "1": {
                "entity_info": {"id": 1, "name": "Jan Novák", "email": "..."},
                "documents": [...]
            },
            "2": {...}
        },
        "invoice": {...},
        "deal": {...}
    }
    """
    try:
        # Získání všech objektů z MinIO
        objects = minio_client.list_objects(
            settings.minio_doc_bucket_name,
            recursive=True
        )

        # Vytvoření stromové struktury
        tree = {}

        for obj in objects:
            # obj.object_name je např. "user/1/uuid.pdf"
            parts = obj.object_name.split('/')

            if len(parts) < 3:
                continue  # Přeskočit nevalidní cesty

            entity_type = parts[0]  # např. "user"
            entity_id = parts[1]     # např. "1"
            filename = parts[2]      # např. "uuid.pdf"

            # Inicializace struktury
            if entity_type not in tree:
                tree[entity_type] = {}

            if entity_id not in tree[entity_type]:
                tree[entity_type][entity_id] = {
                    "entity_info": None,
                    "documents": []
                }

            # Získání informací o dokumentu z DB
            document = db.query(Document).filter(
                Document.entity_type == entity_type,
                Document.entity_id == int(entity_id),
                Document.filename == filename
            ).first()

            if document:
                tree[entity_type][entity_id]["documents"].append({
                    "id": document.id,
                    "filename": document.original_filename,
                    "file_size": document.file_size,
                    "mime_type": document.mime_type,
                    "uploaded_at": document.uploaded_at.isoformat() if document.uploaded_at else None,
                    "description": document.description,
                    "minio_path": document.minio_path,
                    "preview_url": f"/api/v1/documents/{document.id}/preview",
                    "download_url": f"/api/v1/documents/{document.id}/download"
                })

        # Obohacení o informace o entitách
        for entity_type in tree:
            for entity_id in tree[entity_type]:
                entity_info = get_entity_info(db, entity_type, int(entity_id))
                tree[entity_type][entity_id]["entity_info"] = entity_info

        return {
            "success": True,
            "tree": tree,
            "summary": {
                "total_entity_types": len(tree),
                "entity_counts": {
                    entity_type: len(tree[entity_type])
                    for entity_type in tree
                }
            }
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get storage tree: {str(e)}")


# Alternativní endpoint - plochý seznam s entity info
@router.get("/storage/list",
             dependencies=[Depends(require_permissions("documents", PermissionType.READ))]
             )
async def get_storage_list(
    entity_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Vrací plochý seznam všech dokumentů s informacemi o entitách
    Lze filtrovat podle entity_type
    """
    try:
        # Získání dokumentů z DB
        query = db.query(Document)
        if entity_type:
            query = query.filter(Document.entity_type == entity_type)

        documents = query.all()

        result = []
        for doc in documents:
            # Získání info o entitě
            entity_info = get_entity_info(db, doc.entity_type, doc.entity_id)

            result.append({
                "document": {
                    "id": doc.id,
                    "filename": doc.original_filename,
                    "file_size": doc.file_size,
                    "mime_type": doc.mime_type,
                    "uploaded_at": doc.uploaded_at.isoformat() if doc.uploaded_at else None,
                    "description": doc.description,
                    "preview_url": f"/api/v1/documents/{doc.id}/preview",
                    "download_url": f"/api/v1/documents/{doc.id}/download"
                },
                "entity": {
                    "type": doc.entity_type,
                    "id": doc.entity_id,
                    "info": entity_info
                }
            })

        return {
            "success": True,
            "count": len(result),
            "documents": result
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get storage list: {str(e)}")

# Download dokumentu (force download)
@router.get("/{document_id}/download",
             dependencies=[Depends(require_permissions("documents", PermissionType.READ))]
            )
async def download_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Stažení dokumentu z MinIO (force download)
    Podporuje všechny typy souborů včetně MS Office a obrázků
    """
    document = db.query(Document).filter(Document.id == document_id).first()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    try:
        # Stažení souboru z MinIO
        response = minio_client.get_object(document.minio_bucket, document.minio_path)
        content = response.read()
        response.close()
        response.release_conn()

        # Použití RFC 5987 encoding pro filename (podporuje UTF-8)
        encoded_filename = quote(document.original_filename)

        return Response(
            content=content,
            media_type=document.mime_type,
            headers={
                "Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}",
                "Content-Length": str(len(content))
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Download failed: {str(e)}")

# Preview dokumentu (vrací raw data pro zobrazení)
@router.get("/{document_id}/preview",
            dependencies=[Depends(require_permissions("documents", PermissionType.READ))]
            )
async def preview_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Náhled dokumentu - vrací soubor pro zobrazení v prohlížeči
    Vhodné pro obrázky, PDF, MS Office dokumenty (Excel, Word, PowerPoint), atd.
    """
    document = db.query(Document).filter(Document.id == document_id).first()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    try:
        # Stažení souboru z MinIO
        response = minio_client.get_object(document.minio_bucket, document.minio_path)
        content = response.read()
        response.close()
        response.release_conn()

        # Použití RFC 5987 encoding pro filename (podporuje UTF-8)
        # Tento formát podporují všechny moderní prohlížeče
        encoded_filename = quote(document.original_filename)

        return Response(
            content=content,
            media_type=document.mime_type,
            headers={
                "Content-Disposition": f"inline; filename*=UTF-8''{encoded_filename}",
                "Content-Length": str(len(content))
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Preview failed: {str(e)}")

# Upload dokumentu
@router.post("/{entity_type}/{entity_id}",
            dependencies=[Depends(require_permissions("documents", PermissionType.WRITE))]
            )
async def upload_document(
    entity_type: str,
    entity_id: int,
    file: UploadFile = File(...),
    description: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Upload dokumentu k entitě (invoice, deal, lead, atd.)
    """
    # Ověření existence záznamu
    if not verify_entity_exists(db, entity_type, entity_id):
        raise HTTPException(status_code=404, detail=f"Entity{entity_type} not found")

    # Generování unikátního jména
    file_extension = file.filename.split('.')[-1]
    unique_filename = f"{uuid.uuid4()}.{file_extension}"
    minio_path = f"{entity_type}/{entity_id}/{unique_filename}"

    # Upload do MinIO
    try:
        file_content = await file.read()
        minio_client.put_object(
            settings.minio_doc_bucket_name,
            minio_path,
            io.BytesIO(file_content),
            length=len(file_content),
            content_type=file.content_type
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"MinIO upload failed: {str(e)}")

    # Uložení záznamu do DB
    document = Document(
        entity_type=entity_type,
        entity_id=entity_id,
        filename=unique_filename,
        original_filename=file.filename,
        minio_path=minio_path,
        minio_bucket=settings.minio_doc_bucket_name,
        file_size=len(file_content),
        mime_type=file.content_type,
        description=description,
        uploaded_by=current_user.id
    )

    db.add(document)
    db.commit()
    db.refresh(document)

    return {"id": document.id, "filename": document.original_filename}

# Hromadné smazání dokumentů pro entitu
@router.delete("/{entity_type}/{entity_id}",
                dependencies=[Depends(require_permissions("documents", PermissionType.WRITE))]
               )
async def delete_entity_documents(
    entity_type: str,
    entity_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Smazání všech dokumentů pro danou entitu
    Užitečné při mazání celého záznamu (Invoice, Deal, Lead)
    """
    documents = db.query(Document).filter(
        Document.entity_type == entity_type,
        Document.entity_id == entity_id
    ).all()

    if not documents:
        return {"message": "No documents found", "deleted_count": 0}

    deleted_count = 0
    for document in documents:
        try:
            # Smazání z MinIO
            minio_client.remove_object(document.minio_bucket, document.minio_path)
            # Smazání z DB
            db.delete(document)
            deleted_count += 1
        except Exception as e:
            print(f"Failed to delete document {document.id}: {str(e)}")

    db.commit()

    return {
        "message": f"Deleted {deleted_count} documents",
        "deleted_count": deleted_count
    }

# Získání dokumentů pro entitu
@router.get("/{entity_type}/{entity_id}",
            dependencies=[Depends(require_permissions("documents", PermissionType.READ))]
            )
async def get_documents(
    entity_type: str,
    entity_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Získání všech dokumentů pro danou entitu
    """
    documents = db.query(Document).filter(
        Document.entity_type == entity_type,
        Document.entity_id == entity_id
    ).all()

    return documents


@router.delete("/{document_id}",
               dependencies=[Depends(require_permissions("documents", PermissionType.WRITE))]
               )
async def delete_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Smazání dokumentu z databáze i MinIO
    """
    document = db.query(Document).filter(Document.id == document_id).first()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    # Smazání z MinIO
    try:
        minio_client.remove_object(document.minio_bucket, document.minio_path)
    except Exception as e:
        # Logování chyby, ale pokračujeme v mazání z DB
        print(f"MinIO deletion failed: {str(e)}")

    # Smazání z databáze
    db.delete(document)
    db.commit()

    return {"message": "Document deleted successfully", "id": document_id}





# Získání informací o dokumentu (metadata)
@router.get("/{document_id}",
             dependencies=[Depends(require_permissions("documents", PermissionType.READ))]
            )
async def get_document_info(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Získání metadat o dokumentu (bez stahování samotného souboru)
    Užitečné pro FE před načtením preview
    """
    document = db.query(Document).filter(Document.id == document_id).first()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    return {
        "id": document.id,
        "filename": document.original_filename,
        "file_size": document.file_size,
        "mime_type": document.mime_type,
        "description": document.description,
        "uploaded_at": document.uploaded_at,
        "entity_type": document.entity_type,
        "entity_id": document.entity_id,
        # URL pro preview a download
        "preview_url": f"/api/v1/documents/{document.id}/preview",
        "download_url": f"/api/v1/documents/{document.id}/download"
    }
