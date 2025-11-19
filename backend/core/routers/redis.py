from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List, Optional, Dict, Any
import redis
from pydantic import BaseModel

from backend.core.config import get_settings
from backend.core.services.auth import get_current_user, PermissionChecker
from backend.core.models.auth import User, PermissionType

settings = get_settings()
router = APIRouter()

# Redis client
redis_client = redis.Redis(
    host=settings.redis_host ,
    port=settings.redis_port,
    db=settings.redis_db,
    decode_responses=True
)


# Response models
class RedisKeyInfo(BaseModel):
    key: str
    type: str
    ttl: int
    value: Optional[Any] = None


class RedisStats(BaseModel):
    total_keys: int
    used_memory: str
    connected_clients: int
    uptime_days: int


class DeleteResponse(BaseModel):
    deleted_count: int
    keys: List[str]


# Endpoints
@router.get("/keys", response_model=List[str])
async def get_redis_keys(
    pattern: str = Query("*", description="Pattern pro filtrování klíčů"),
    limit: int = Query(100, ge=1, le=1000, description="Max počet klíčů"),
    current_user: User = Depends(get_current_user)
):
    """
    Získá seznam Redis klíčů podle patternu.

    Příklady patternů:
    - "*" - všechny klíče
    - "rate_limit:*" - všechny rate limit klíče
    - "rate_limit:user:*" - rate limity pro uživatele
    """
    try:
        keys = redis_client.keys(pattern)
        return keys[:limit]
    except redis.RedisError as e:
        raise HTTPException(status_code=500, detail=f"Redis error: {str(e)}")


@router.get("/key/{key:path}", response_model=RedisKeyInfo)
async def get_redis_key(
    key: str,
    current_user: User = Depends(get_current_user)
):
    """
    Získá detailní informace o konkrétním Redis klíči.
    """
    try:
        # Zkontroluj existenci
        if not redis_client.exists(key):
            raise HTTPException(status_code=404, detail=f"Key '{key}' not found")

        # Získej typ a TTL
        key_type = redis_client.type(key)
        ttl = redis_client.ttl(key)

        # Získej hodnotu podle typu
        value = None
        if key_type == "string":
            value = redis_client.get(key)
        elif key_type == "hash":
            value = redis_client.hgetall(key)
        elif key_type == "list":
            value = redis_client.lrange(key, 0, -1)
        elif key_type == "set":
            value = list(redis_client.smembers(key))
        elif key_type == "zset":
            value = redis_client.zrange(key, 0, -1, withscores=True)

        return RedisKeyInfo(
            key=key,
            type=key_type,
            ttl=ttl,
            value=value
        )
    except redis.RedisError as e:
        raise HTTPException(status_code=500, detail=f"Redis error: {str(e)}")


@router.delete("/key/{key:path}", response_model=DeleteResponse)
async def delete_redis_key(
    key: str,
    current_user: User = Depends(get_current_user)
):
    """
    Smaže konkrétní Redis klíč.
    """
    try:
        if not redis_client.exists(key):
            raise HTTPException(status_code=404, detail=f"Key '{key}' not found")

        deleted = redis_client.delete(key)
        return DeleteResponse(
            deleted_count=deleted,
            keys=[key]
        )
    except redis.RedisError as e:
        raise HTTPException(status_code=500, detail=f"Redis error: {str(e)}")


@router.delete("/keys", response_model=DeleteResponse)
async def delete_redis_keys_by_pattern(
    pattern: str = Query(..., description="Pattern pro mazání klíčů"),
    confirm: bool = Query(False, description="Potvrzení mazání"),
    current_user: User = Depends(get_current_user)
):
    """
    Smaže všechny Redis klíče podle patternu.
    POZOR: Toto je destruktivní operace!

    Příklady:
    - "rate_limit:*" - smaže všechny rate limit klíče
    - "rate_limit:user:admin:*" - smaže rate limity pro konkrétního usera
    """
    if not confirm:
        raise HTTPException(
            status_code=400,
            detail="Musíte potvrdit mazání nastavením confirm=true"
        )

    try:
        keys = redis_client.keys(pattern)

        if not keys:
            return DeleteResponse(deleted_count=0, keys=[])

        deleted = redis_client.delete(*keys)
        return DeleteResponse(
            deleted_count=deleted,
            keys=keys
        )
    except redis.RedisError as e:
        raise HTTPException(status_code=500, detail=f"Redis error: {str(e)}")


@router.get("/stats", response_model=RedisStats)
async def get_redis_stats(
    current_user: User = Depends(get_current_user)
):
    """
    Získá základní statistiky Redis serveru.
    """
    try:
        info = redis_client.info()

        return RedisStats(
            total_keys=redis_client.dbsize(),
            used_memory=info.get("used_memory_human", "N/A"),
            connected_clients=info.get("connected_clients", 0),
            uptime_days=info.get("uptime_in_days", 0)
        )
    except redis.RedisError as e:
        raise HTTPException(status_code=500, detail=f"Redis error: {str(e)}")


@router.post("/flush-db")
async def flush_redis_db(
    confirm: bool = Query(False, description="Potvrzení vymazání celé DB"),
    current_user: User = Depends(get_current_user)
):
    """
    VAROVÁNÍ: Vymaže VŠECHNA data z aktuální Redis databáze!
    Pouze pro development/testing!
    """
    if not confirm:
        raise HTTPException(
            status_code=400,
            detail="Musíte potvrdit vymazání celé DB nastavením confirm=true"
        )

    try:
        redis_client.flushdb()
        return {"message": "Redis database flushed successfully"}
    except redis.RedisError as e:
        raise HTTPException(status_code=500, detail=f"Redis error: {str(e)}")
