from pydantic import BaseModel
from typing import Optional


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    token: str
    token_type: str = "bearer"


class Card(BaseModel):
    id: str
    name: str
    image: str
    quantity: int
    set: str

class AddCardRequest(BaseModel):
    card_market_id: Optional[int] = None
    card_id: Optional[int] = None
    quantity: int = 1
    quantity_foil: int = 0


class RemoveCardRequest(BaseModel):
    card_market_id: Optional[int] = None
    card_id: Optional[int] = None
    quantity: int = 1
    quantity_foil: int = 0