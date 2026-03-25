from pydantic import BaseModel


class RoleOut(BaseModel):
    role_id: int
    role_name: str

    model_config = {"from_attributes": True}
