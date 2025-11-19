import redis
from typing import Optional
from fastapi import Request, HTTPException, status
from datetime import datetime
import logging

from backend.core.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

# Redis client
redis_client = redis.Redis(
    host=settings.redis_host,
    port=settings.redis_port,
    db=settings.redis_db,
    decode_responses=True
)

class RateLimiter:
    """
    Rate limiter založený na Redis.
    Používá fixed window algoritmus.
    """

    def __init__(
        self,
        requests: int = 250,
        window: int = 60,
        prefix: str = "rate_limit"
    ):
        """
        Args:
            requests: Maximální počet requestů
            window: Časové okno v sekundách
            prefix: Prefix pro Redis klíče
        """
        self.requests = requests
        self.window = window
        self.prefix = prefix

    def _get_identifier(self, request: Request, user_id: Optional[str] = None) -> str:
        """
        Získá identifikátor pro rate limiting (user_id nebo IP).
        """
        if user_id:
            return f"user:{user_id}"

        # Získej IP z headers (pro proxy/load balancer)
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return f"ip:{forwarded.split(',')[0].strip()}"

        # Fallback na client IP
        client_ip = request.client.host if request.client else "unknown"
        return f"ip:{client_ip}"

    def _get_redis_key(self, identifier: str) -> str:
        """Vytvoří Redis klíč."""
        window_start = int(datetime.now().timestamp() / self.window) * self.window
        return f"{self.prefix}:{identifier}:{window_start}"

    async def check_rate_limit(
        self,
        request: Request,
        user_id: Optional[str] = None
    ) -> bool:
        """
        Zkontroluje rate limit.

        Returns:
            True pokud je request povolen

        Raises:
            HTTPException: Pokud je překročen limit
        """
        identifier = self._get_identifier(request, user_id)
        key = self._get_redis_key(identifier)

        try:
            # Inkrementuj počítadlo
            current = redis_client.incr(key)

            # Nastav expiraci při prvním requestu v okně
            if current == 1:
                redis_client.expire(key, self.window)

            # Zkontroluj limit
            if current > self.requests:
                logger.warning(
                    f"Rate limit exceeded for {identifier}: "
                    f"{current}/{self.requests} in {self.window}s"
                )
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail={
                        "error": "Rate limit exceeded",
                        "limit": self.requests,
                        "window": self.window,
                        "retry_after": self.window
                    }
                )

            return True

        except redis.RedisError as e:
            logger.error(f"Redis error in rate limiter: {e}")
            # Při chybě Redis povolit request (fail open)
            return True


# Globální instance pro různé use cases
default_limiter = RateLimiter(requests=500, window=60)  # 100 req/min
strict_limiter = RateLimiter(requests=150, window=60)    # 10 req/min
auth_limiter = RateLimiter(requests=500, window=60)      # 5 req/5min


# Dependency pro FastAPI
async def rate_limit_dependency(
    request: Request,
    limiter: RateLimiter = default_limiter
):
    """
    FastAPI dependency pro rate limiting.
    Použije user_id pokud je dostupný, jinak IP adresu.
    """
    user_id = None

    # Zkus získat user_id ze session nebo tokenu
    if hasattr(request, "session") and "access_token" in request.session:
        from backend.core.services.auth import verify_token
        token = request.session.get("access_token")
        payload = verify_token(token)
        if payload:
            user_id = payload.get("sub")

    await limiter.check_rate_limit(request, user_id)


# Helper pro vytvoření custom rate limit dependency
def create_rate_limiter(requests: int, window: int, prefix: str = "reate_limit"):
    """
    Vytvoří custom rate limiter dependency.

    Args:
        requests: Maximální počet requestů
        window: Časové okno v sekundách

    Example:
        rate_limit_10_per_min = create_rate_limiter(10, 60)

        @app.get("/endpoint", dependencies=[Depends(rate_limit_10_per_min)])
        async def endpoint():
            ...
    """
    limiter = RateLimiter(requests=requests, window=window,prefix=prefix)

    async def custom_limiter(request: Request):
        await rate_limit_dependency(request, limiter)

    return custom_limiter
