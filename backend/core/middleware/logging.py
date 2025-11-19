# backend/core/middleware/logging.py
import time
import uuid
import json
from typing import Callable, Optional
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import StreamingResponse
import logging

from backend.core.models.auth import ApiLog
from backend.core.db import SessionLocal
from backend.core.services.auth import verify_token

logger = logging.getLogger(__name__)


class APILoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware pro logování všech API requestů do databáze.
    Zaznamenává: metodu, cestu, status, timing, IP, user_id, request/response data.
    """

    def __init__(self, app, exclude_paths: Optional[list[str]] = None):
        """
        Args:
            app: FastAPI aplikace
            exclude_paths: Cesty které se nemají logovat (např. /health, /metrics)
        """
        super().__init__(app)
        self.exclude_paths = exclude_paths or [
            "/docs",
            "/redoc",
            "/openapi.json",
            "/health",
            "/metrics",
            "/favicon.ico"
        ]

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Zpracuje request a zaloguje ho do databáze."""

        # Vygeneruj unikátní request ID
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id

        # Skipni excluded paths
        if any(request.url.path.startswith(path) for path in self.exclude_paths):
            return await call_next(request)

        # Začni měřit čas
        start_time = time.time()

        # Získej request data
        ip_address = self._get_client_ip(request)
        path = request.url.path
        method = request.method
        query_params = dict(request.query_params) if request.query_params else None
        path_params = dict(request.path_params) if request.path_params else None

        # Získej user_id z tokenu (pokud existuje)
        user_id = await self._get_user_id(request)

        # Získej request body (s opatrností na velikost)
        request_body = await self._get_request_body(request)

        # Zpracuj request
        response = await call_next(request)

        # Spočítej process time
        process_time = time.time() - start_time

        # Získej response body (jen pro malé responsy)
        response_body = await self._get_response_body(response)

        # Ulož do databáze (async bez blokování)
        self._log_to_database(
            request_id=request_id,
            ip_address=ip_address,
            path=path,
            method=method,
            status_code=response.status_code,
            request_body=request_body,
            response_body=response_body,
            query_params=query_params,
            path_params=path_params,
            process_time=process_time,
            user_id=user_id
        )

        # Přidej request_id do response headers
        response.headers["X-Request-ID"] = request_id

        return response

    def _get_client_ip(self, request: Request) -> str:
        """Získá IP adresu klienta (support pro proxy)."""
        # Zkus X-Forwarded-For (proxy/load balancer)
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()

        # Zkus X-Real-IP
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip

        # Fallback na přímou IP
        if request.client:
            return request.client.host

        return "unknown"

    async def _get_user_id(self, request: Request) -> Optional[str]:
        """Získá user_id z JWT tokenu pokud existuje."""
        try:
            # Zkus Authorization header
            auth_header = request.headers.get("Authorization")
            if auth_header and auth_header.startswith("Bearer "):
                token = auth_header.replace("Bearer ", "")
                payload = verify_token(token)
                if payload:
                    return payload.get("sub")

            # Zkus session cookie
            if hasattr(request, "session") and "access_token" in request.session:
                token = request.session.get("access_token")
                payload = verify_token(token)
                if payload:
                    return payload.get("sub")
        except Exception as e:
            logger.debug(f"Could not extract user_id: {e}")

        return None

    async def _get_request_body(self, request: Request) -> Optional[dict]:
        """
        Získá request body (pokud je JSON a není příliš velký).
        POZOR: Filtruje citlivá data jako hesla!
        """
        try:
            # Jen pro JSON content type
            content_type = request.headers.get("content-type", "")
            if "application/json" not in content_type:
                return None

            # Přečti body
            body = await request.body()

            # Limit velikosti (max 10KB pro log)
            if len(body) > 10240:
                return {"_note": "Body too large to log"}

            # Parsuj JSON
            if body:
                body_json = json.loads(body.decode("utf-8"))

                # BEZPEČNOST: Odstraň citlivá data
                return self._sanitize_data(body_json)

            return None
        except Exception as e:
            logger.debug(f"Could not parse request body: {e}")
            return None

    async def _get_response_body(self, response: Response) -> Optional[dict]:
        """
        Získá response body (pokud je JSON a není příliš velký).
        POZOR: Toto je složitější kvůli streaming responses.
        """
        try:
            # Pouze pro malé JSON responses
            if isinstance(response, StreamingResponse):
                return {"_note": "Streaming response not logged"}

            # Zkontroluj content type
            content_type = response.headers.get("content-type", "")
            if "application/json" not in content_type:
                return None

            # Pro FastAPI JSONResponse
            if hasattr(response, "body"):
                body = response.body
                if len(body) > 10240:  # Max 10KB
                    return {"_note": "Response too large to log"}

                try:
                    body_json = json.loads(body.decode("utf-8"))
                    return self._sanitize_data(body_json)
                except:
                    return None

            return None
        except Exception as e:
            logger.debug(f"Could not parse response body: {e}")
            return None

    def _sanitize_data(self, data: dict) -> dict:
        """
        Odstraní citlivá data z logu (hesla, tokeny, atd.).
        """
        if not isinstance(data, dict):
            return data

        sanitized = data.copy()
        sensitive_keys = [
            "password",
            "client_secret",
            "token",
            "access_token",
            "refresh_token",
            "secret",
            "api_key",
            "authorization"
        ]

        for key in sensitive_keys:
            if key in sanitized:
                sanitized[key] = "***REDACTED***"

        # Rekurzivně pro nested objekty
        for key, value in sanitized.items():
            if isinstance(value, dict):
                sanitized[key] = self._sanitize_data(value)
            elif isinstance(value, list):
                sanitized[key] = [
                    self._sanitize_data(item) if isinstance(item, dict) else item
                    for item in value
                ]

        return sanitized

    def _log_to_database(
        self,
        request_id: str,
        ip_address: str,
        path: str,
        method: str,
        status_code: int,
        process_time: float,
        user_id: Optional[str] = None,
        request_body: Optional[dict] = None,
        response_body: Optional[dict] = None,
        query_params: Optional[dict] = None,
        path_params: Optional[dict] = None
    ) -> None:
        """Uloží log entry do databáze (non-blocking)."""
        db = SessionLocal()
        try:
            log_entry = ApiLog(
                request_id=request_id,
                ip_address=ip_address,
                path=path,
                method=method,
                status_code=status_code,
                request_body=request_body,
                response_body=response_body,
                query_params=query_params,
                path_params=path_params,
                process_time=round(process_time, 4),
                user_id=user_id
            )
            db.add(log_entry)
            db.commit()

            logger.debug(
                f"API Log: {method} {path} - {status_code} "
                f"({process_time*1000:.2f}ms) - User: {user_id or 'anonymous'}"
            )
        except Exception as e:
            logger.error(f"Failed to log API request to database: {e}")
            db.rollback()
        finally:
            db.close()
