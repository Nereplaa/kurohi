from datetime import date
from pydantic import BaseModel, Field


class InitiateRequest(BaseModel):
    """Sent by the frontend to start a checkout form session."""
    plan_name: str = Field(..., min_length=1, max_length=50)


class InitiateResponse(BaseModel):
    """Returned to the frontend after Iyzico session is created.

    - mock_mode=True  → no real Iyzico call; frontend shows mock confirm button.
    - mock_mode=False → checkout_form_content contains the Iyzico <script> HTML;
                        frontend injects it so Iyzico renders its payment overlay.
    """
    token: str
    mock_mode: bool
    checkout_form_content: str | None = None


class CheckoutResponse(BaseModel):
    """Subscription details returned after a successful payment (mock mode only).
    In real Iyzico mode the browser is redirected, not this schema."""
    subscription_id: int
    user_id: int
    plan_name: str
    start_date: date
    end_date: date
    payment_id: str

    model_config = {"from_attributes": True}
