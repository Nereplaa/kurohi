"""
Iyzico Checkout Form payment endpoints.

Mock mode  (IYZICO_API_KEY is empty in .env):
  POST /initiate  → creates a local token, returns mock_mode=True
  POST /mock-confirm → confirms the pending token, creates subscription, returns JSON

Live mode  (IYZICO_API_KEY is set in .env):
  POST /initiate  → calls Iyzico CheckoutFormInitialize via custom HTTP client,
                    returns checkout_form_content
  POST /callback  → Iyzico POSTs here after payment; verifies & creates subscription;
                    redirects browser to FRONTEND_URL/subscription?payment=success|failed
"""
import logging
import json
from datetime import date, timedelta
from typing import Annotated
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from pydantic import BaseModel

from app.database import get_db
from app.models import Subscription, User, PendingCheckout
from app.schemas.payment import InitiateRequest, InitiateResponse, CheckoutResponse
from app.core.deps import get_active_user
from app.core.config import settings
from app.services.iyzico_client import IyzicoClient, IyzicoError

logger = logging.getLogger(__name__)


class MockConfirmRequest(BaseModel):
    token: str

router = APIRouter(prefix="/payments", tags=["Payments"])

# ── Plan config ────────────────────────────────────────────────────────────────
PLAN_CONFIG: dict[str, dict] = {
    "Aylik":  {"price": "29.99",  "days": 30},
    "Yillik": {"price": "249.99", "days": 365},
}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _check_overlap(db: Session, user_id: int, today: date, end_date: date) -> Subscription | None:
    return (
        db.query(Subscription)
        .filter(
            Subscription.user_id == user_id,
            Subscription.start_date < end_date,
            Subscription.end_date > today,
        )
        .first()
    )


def _build_subscription(db: Session, user_id: int, plan_name: str) -> Subscription:
    """Add a Subscription to the session. Caller must commit."""
    plan = PLAN_CONFIG.get(plan_name, {"days": 30})
    today = date.today()
    end_date = today + timedelta(days=plan["days"])
    sub = Subscription(user_id=user_id, plan_name=plan_name, start_date=today, end_date=end_date)
    db.add(sub)
    return sub


# ── POST /payments/initiate ───────────────────────────────────────────────────

@router.post("/initiate", response_model=InitiateResponse, status_code=200)
def initiate_checkout(
    payload: InitiateRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_active_user)],
):
    """
    Start a checkout form session.

    - Validates plan and checks for overlapping active subscription.
    - Mock mode: generates a local token, no external call.
    - Live mode: calls Iyzico API via custom HTTP client, stores the Iyzico token.
    """
    plan = PLAN_CONFIG.get(payload.plan_name)
    if not plan:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=f"Geçersiz plan: {payload.plan_name}")

    today = date.today()
    end_date = today + timedelta(days=plan["days"])

    overlap = _check_overlap(db, current_user.user_id, today, end_date)
    if overlap:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            detail=(
                f"Zaten aktif bir aboneliğiniz var: "
                f"{overlap.plan_name} ({overlap.start_date} → {overlap.end_date})."
            ),
        )

    token: str = f"MOCK-{uuid4().hex[:20].upper()}"
    checkout_form_content: str | None = None

    if settings.IYZICO_API_KEY:
        client = IyzicoClient(
            api_key=settings.IYZICO_API_KEY,
            secret_key=settings.IYZICO_SECRET_KEY,
            base_url=settings.IYZICO_BASE_URL,
        )

        request_body = {
            "locale": "tr",
            "conversationId": str(uuid4()),
            "price": plan["price"],
            "paidPrice": plan["price"],
            "currency": "TRY",
            "basketId": f"kurohi-{current_user.user_id}-{uuid4().hex[:8]}",
            "paymentGroup": "SUBSCRIPTION",
            "callbackUrl": settings.CALLBACK_URL,
            "enabledInstallments": [1],
            "buyer": {
                "id": str(current_user.user_id),
                "name": getattr(current_user, "name", "Ad"),
                "surname": getattr(current_user, "surname", "Soyad"),
                "email": current_user.email,
                "identityNumber": "74300864791",
                "registrationAddress": "Sandbox Test Address",
                "city": "Istanbul",
                "country": "Turkey",
                "ip": "85.34.78.112",
            },
            "shippingAddress": {
                "contactName": f"{getattr(current_user, 'name', 'Ad')} {getattr(current_user, 'surname', 'Soyad')}",
                "city": "Istanbul",
                "country": "Turkey",
                "address": "Sandbox Test Address",
            },
            "billingAddress": {
                "contactName": f"{getattr(current_user, 'name', 'Ad')} {getattr(current_user, 'surname', 'Soyad')}",
                "city": "Istanbul",
                "country": "Turkey",
                "address": "Sandbox Test Address",
            },
            "basketItems": [
                {
                    "id": f"plan-{payload.plan_name}",
                    "name": f"Kurohi {payload.plan_name} Abonelik",
                    "category1": "Subscription",
                    "itemType": "VIRTUAL",
                    "price": plan["price"],
                }
            ],
        }

        try:
            result = client.checkout_form_initialize(request_body)
        except IyzicoError as exc:
            logger.warning("Iyzico error [%s]: %s", exc.error_code, exc.error_message)
            if exc.error_code == "1001":
                detail = (
                    "Iyzico sandbox hesabınız henüz ödeme işlemleri için aktif edilmemiş "
                    "(hata 1001). Lütfen sandbox-merchant.iyzipay.com üzerinden başvuru "
                    "durumunuzu kontrol edin veya entegrasyon@iyzico.com ile iletişime geçin."
                )
            else:
                detail = f"Ödeme formu başlatılamadı: {exc.error_message}"
            raise HTTPException(status.HTTP_402_PAYMENT_REQUIRED, detail=detail)
        except Exception as exc:
            logger.exception("Iyzico connection error")
            raise HTTPException(
                status.HTTP_502_BAD_GATEWAY,
                detail=f"Ödeme servisi ile bağlantı kurulamadı: {exc}",
            )

        token = result["token"]
        checkout_form_content = result.get("checkoutFormContent")

    # Persist pending session so callback can look up user + plan
    db.add(PendingCheckout(token=token, user_id=current_user.user_id, plan_name=payload.plan_name))
    db.commit()

    return InitiateResponse(
        token=token,
        mock_mode=not bool(settings.IYZICO_API_KEY),
        checkout_form_content=checkout_form_content,
    )


# ── POST /payments/callback ───────────────────────────────────────────────────

@router.post("/callback")
async def payment_callback(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
):
    """
    Iyzico browser callback (POST redirect after payment form is submitted).

    Iyzico redirects the user's browser here with form data containing:
      - token: the checkout session token
      - status: "success" or "failure"

    This endpoint verifies the payment, creates the subscription on success,
    then redirects the browser back to the frontend.
    """
    form_data = await request.form()
    token = str(form_data.get("token", ""))
    iyzico_status = str(form_data.get("status", ""))
    frontend_base = settings.FRONTEND_URL

    pending = db.query(PendingCheckout).filter(PendingCheckout.token == token).first()
    if not pending:
        return RedirectResponse(
            f"{frontend_base}/subscription?payment=failed&reason=token_not_found",
            status_code=302,
        )

    # ── Live mode: verify with Iyzico ─────────────────────────────────────────
    payment_id = f"MOCK-{uuid4().hex[:10].upper()}"

    if settings.IYZICO_API_KEY:
        client = IyzicoClient(
            api_key=settings.IYZICO_API_KEY,
            secret_key=settings.IYZICO_SECRET_KEY,
            base_url=settings.IYZICO_BASE_URL,
        )

        try:
            result = client.checkout_form_retrieve(token)
        except IyzicoError as exc:
            logger.warning("Iyzico callback verify error [%s]: %s", exc.error_code, exc.error_message)
            db.delete(pending)
            db.commit()
            return RedirectResponse(
                f"{frontend_base}/subscription?payment=failed&reason=verification_error",
                status_code=302,
            )
        except Exception:
            logger.exception("Iyzico connection error during callback")
            db.delete(pending)
            db.commit()
            return RedirectResponse(
                f"{frontend_base}/subscription?payment=failed&reason=verification_error",
                status_code=302,
            )

        if result.get("paymentStatus") != "SUCCESS":
            db.delete(pending)
            db.commit()
            error_msg = result.get("errorMessage", "Ödeme_başarısız")
            return RedirectResponse(
                f"{frontend_base}/subscription?payment=failed&reason={error_msg}",
                status_code=302,
            )

        payment_id = str(result.get("paymentId", payment_id))
    else:
        # Mock mode safety check — only succeed if status is "success"
        if iyzico_status != "success":
            db.delete(pending)
            db.commit()
            return RedirectResponse(
                f"{frontend_base}/subscription?payment=failed&reason=cancelled",
                status_code=302,
            )

    # ── Create subscription + delete pending in one transaction ───────────────
    sub = _build_subscription(db, pending.user_id, pending.plan_name)
    db.delete(pending)
    db.commit()
    db.refresh(sub)

    return RedirectResponse(
        f"{frontend_base}/subscription?payment=success&plan={sub.plan_name}&until={sub.end_date}",
        status_code=302,
    )


# ── POST /payments/mock-confirm ───────────────────────────────────────────────

@router.post("/mock-confirm", response_model=CheckoutResponse, status_code=200)
def mock_confirm(
    payload: MockConfirmRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_active_user)],
):
    """
    Mock mode only: confirms a pending checkout session and creates a subscription.
    Returns JSON (no browser redirect) so the frontend modal can handle success inline.
    """
    if settings.IYZICO_API_KEY:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail="Bu endpoint yalnızca mock modda kullanılabilir.",
        )

    token = payload.token
    pending = (
        db.query(PendingCheckout)
        .filter(
            PendingCheckout.token == token,
            PendingCheckout.user_id == current_user.user_id,
        )
        .first()
    )
    if not pending:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Bekleyen ödeme oturumu bulunamadı.")

    sub = _build_subscription(db, pending.user_id, pending.plan_name)
    db.delete(pending)
    db.commit()
    db.refresh(sub)

    return CheckoutResponse(
        subscription_id=sub.subscription_id,
        user_id=sub.user_id,
        plan_name=sub.plan_name,
        start_date=sub.start_date,
        end_date=sub.end_date,
        payment_id=f"MOCK-{uuid4().hex[:10].upper()}",
    )
