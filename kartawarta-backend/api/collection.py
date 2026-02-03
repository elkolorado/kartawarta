from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Optional
from .schemas import AddCardRequest, RemoveCardRequest
from db import (
    get_user_collection,
    add_card_to_user_collection,
    remove_card_from_user_collection,
    get_card_id_by_market_id,
    get_user_id_by_username,
)
from .deps import get_current_user

router = APIRouter()





@router.get("/")
def list_collection(tcg_id: Optional[int] = Query(None), current_user: str = Depends(get_current_user)):
    """Return the collection for the current JWT user. If `tcg_id` provided, filter to that TCG."""
    user_id = get_user_id_by_username(current_user)
    if not user_id:
        raise HTTPException(status_code=404, detail="User not found")
    items = get_user_collection(user_id, tcg_id)
    return items


@router.post("/addCard")
def add_card(req: AddCardRequest, current_user: str = Depends(get_current_user)):
    # Resolve user
    user_id = get_user_id_by_username(current_user)
    if not user_id:
        raise HTTPException(status_code=404, detail="User not found")
    # Resolve card_id if needed
    card_id = req.card_id
    if card_id is None:
        if req.card_market_id is None:
            raise HTTPException(status_code=400, detail="card_id or card_market_id required")
        card_id = get_card_id_by_market_id(req.card_market_id)
        if not card_id:
            raise HTTPException(status_code=404, detail="Card not found")

    uc_id = add_card_to_user_collection(user_id, card_id, req.quantity, req.quantity_foil)
    return {"success": True, "user_collection_id": uc_id}


@router.post("/removeCard")
def remove_card(req: RemoveCardRequest, current_user: str = Depends(get_current_user)):
    user_id = get_user_id_by_username(current_user)
    if not user_id:
        raise HTTPException(status_code=404, detail="User not found")

    card_id = req.card_id
    if card_id is None:
        if req.card_market_id is None:
            raise HTTPException(status_code=400, detail="card_id or card_market_id required")
        card_id = get_card_id_by_market_id(req.card_market_id)
        if not card_id:
            raise HTTPException(status_code=404, detail="Card not found")

    ok = remove_card_from_user_collection(user_id, card_id, req.quantity, req.quantity_foil)
    if not ok:
        raise HTTPException(status_code=404, detail="Collection entry not found")
    return {"success": True}
