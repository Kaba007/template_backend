# main.py
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.sessions import SessionMiddleware
import logging

from backend.core.config import get_settings
from backend.core.db import engine
from backend.core.models.base import Base
from backend.core.utils.init_db import init_database
from backend.apps.admin.admin import setup_admin
from backend.core.middleware.logging import APILoggingMiddleware


settings = get_settings()

# Logging setup
logging.basicConfig(
    level=settings.logging_level,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifecycle manager pro aplikaci.
    Spustí se při startu a shutdownu aplikace.
    """
    # Startup
    logger.info("Starting up application...")

    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.error(f"Error creating database tables: {e}")
        raise
    try:
        init_database()
    except Exception as e:
        logger.error(f"Error during database initialization: {e}")
        raise
    yield

    # Shutdown
    logger.info("Shutting down application...")
    engine.dispose()


def create_app() -> FastAPI:
    """
    Application factory pro vytvoření FastAPI instance.

    Returns:
        Nakonfigurovaná FastAPI aplikace
    """
    app = FastAPI(
        title=settings.app_name,
        description=settings.description,
        version=settings.version,
        lifespan=lifespan
    )

    # Registruj middlewares
    register_middlewares(app)

    # Registruj routers
    register_routers(app)

    # Registruj exception handlers
    register_exception_handlers(app)

    # Registruj event handlers
    register_events(app)

    #regsitruj admin interface
    setup_admin(app)
    # Health check endpoint
    return app


def register_middlewares(app: FastAPI) -> None:
    """Registruje všechny middlewares."""

    # CORS Middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allow_origins,  # V produkci specifikuj konkrétní originy
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(
        APILoggingMiddleware
    )
    # Session Middleware - pro JWT v cookies
    app.add_middleware(
        SessionMiddleware,
        secret_key=settings.secret_key,
        max_age=settings.access_token_expire_minutes * 60,
        same_site="lax"
    )


    logger.info("Middlewares registered")


def register_routers(app: FastAPI,prefix_="api",version='v1') -> None:
    """Registruje všechny API routers."""
    from backend.core.routers import auth,users,roles,modules,redis
    from backend.apps.email import router as email_router
    from backend.core.routers import leads as leads_router
    from backend.core.routers.invoices import router as invoices_router
    from backend.core.routers.customers import router as custemers_router
    from backend.core.routers.products import router as product_router
    from backend.core.routers.deals import router as deal_router


    prefix_arg=f"/{prefix_}/{version}"
    app.include_router(
        auth.router,
        prefix=f"{prefix_arg}/auth",
        tags=["Authentication"]
    )
    app.include_router(
        users.router,
         prefix=f"{prefix_arg}/users",
        tags=["Users"]
        )
    app.include_router(
        roles.router,
        prefix=f"{prefix_arg}/roles",
        tags=["Roles"]
        )
    app.include_router(
        modules.router,
        prefix=f"{prefix_arg}/modules",
        tags=["Modules"]
        )
    app.include_router(
        redis.router,
        prefix=f"{prefix_arg}/redis",
        tags=["Redis Management"]
    )
    app.include_router(
        email_router.router,
        prefix=f"{prefix_arg}/email",
        tags=["Email"]
    )
    app.include_router(
        leads_router.router,
        prefix=f"{prefix_arg}/leads",
        tags=["leads"]
    )
    app.include_router(
        custemers_router,
        prefix=f"{prefix_arg}/companies",
        tags=["customers"]
    )
    app.include_router(
        invoices_router,
        prefix=f"{prefix_arg}/invoices",
        tags=["invoices"]
    )
    app.include_router(
        product_router,
        prefix=f"{prefix_arg}/products",
        tags=["products"]
    )
    app.include_router(
        deal_router,
        prefix=f"{prefix_arg}/deals",
        tags=["deals"]
    )
    if settings.use_blob_storage:
        from backend.apps.doc.api import router as att_store_router
        app.include_router(
            att_store_router,
            prefix=f"{prefix_arg}/documents",
            tags=["documents"]
        )
    logger.info("Routers registered")


def register_exception_handlers(app: FastAPI) -> None:
    """Registruje custom exception handlers."""


    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        """Handler pro obecné chyby."""
        logger.error(f"Unexpected error on {request.url}: {str(exc)}", exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "detail": "Internal server error",
                "message": str(exc)
            }
        )

    logger.info("Exception handlers registered")


def register_events(app: FastAPI) -> None:
    """Registruje event handlers."""

    @app.on_event("startup")
    async def startup_event():
        """Event při startu aplikace."""
        logger.info("Application startup complete")

    @app.on_event("shutdown")
    async def shutdown_event():
        """Event při shutdownu aplikace."""
        logger.info("Application shutdown complete")


# Vytvoř aplikaci
app = create_app()


# Pro development server
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_level="info"
    )
