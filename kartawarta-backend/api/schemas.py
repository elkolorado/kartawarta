from pydantic import BaseModel
from typing import Optional
from typing import Literal


class LoginRequest(BaseModel):
    username: str
    password: str


class GoogleLoginRequest(BaseModel):
    credential: str


class TokenResponse(BaseModel):
    token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class BulkCollectionItem(BaseModel):
    card_id: Optional[int] = None
    card_market_id: Optional[int] = None
    quantity: int = 1
    quantity_foil: int = 0
    label_quantities: dict[int, int] = {}
    label_foil_quantities: dict[int, int] = {}


class BulkCollectionRequest(BaseModel):
    action: Literal["add", "remove"]
    items: list[BulkCollectionItem]
    label_ids: list[int] = []
    label_quantities: dict[int, int] = {}
    label_foil_quantities: dict[int, int] = {}


class BulkCollectionResponse(BaseModel):
    success: bool
    action: Literal["add", "remove"]
    processed: int
    changed: int
    skipped: int


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
    label_id: Optional[int] = None


class UserLabelCreateRequest(BaseModel):
    name: str


class UserLabelUpdateRequest(BaseModel):
    name: str


class UserCollectionLabelsRequest(BaseModel):
    label_ids: list[int]