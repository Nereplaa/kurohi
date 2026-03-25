from datetime import date
from pydantic import BaseModel, Field, field_validator


class SubscriptionCreate(BaseModel):
    plan_name: str = Field(..., min_length=1, max_length=100)
    start_date: date
    end_date: date

    @field_validator("end_date")
    @classmethod
    def end_after_start(cls, v: date, info) -> date:
        start = info.data.get("start_date")
        if start and v <= start:
            raise ValueError("end_date, start_date'den buyuk olmalidir.")
        return v


class SubscriptionOut(BaseModel):
    subscription_id: int
    user_id: int
    plan_name: str
    start_date: date
    end_date: date

    model_config = {"from_attributes": True}
