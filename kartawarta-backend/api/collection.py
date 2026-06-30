from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Optional
from .schemas import AddCardRequest, RemoveCardRequest, BulkCollectionRequest, UserLabelCreateRequest, UserLabelUpdateRequest, UserCollectionLabelsRequest
from db import (
    get_user_collection,
    add_card_to_user_collection,
    remove_card_from_user_collection,
    get_card_id_by_market_id,
    get_user_id_by_username,
    bulk_add_cards_to_user_collection,
    bulk_remove_cards_from_user_collection,
    get_user_labels,
    create_user_label,
    update_user_label,
    delete_user_label,
    set_user_collection_labels,
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


@router.get("/labels")
def list_labels(current_user: str = Depends(get_current_user)):
    user_id = get_user_id_by_username(current_user)
    if not user_id:
        raise HTTPException(status_code=404, detail="User not found")
    return get_user_labels(user_id)


@router.post("/labels")
def add_label(req: UserLabelCreateRequest, current_user: str = Depends(get_current_user)):
    user_id = get_user_id_by_username(current_user)
    if not user_id:
        raise HTTPException(status_code=404, detail="User not found")

    label_name = req.name.strip()
    if not label_name:
        raise HTTPException(status_code=400, detail="Label name is required")

    return create_user_label(user_id, label_name)


@router.put("/labels/{label_id}")
def rename_label(label_id: int, req: UserLabelUpdateRequest, current_user: str = Depends(get_current_user)):
    user_id = get_user_id_by_username(current_user)
    if not user_id:
        raise HTTPException(status_code=404, detail="User not found")

    label_name = req.name.strip()
    if not label_name:
        raise HTTPException(status_code=400, detail="Label name is required")

    label = update_user_label(user_id, label_id, label_name)
    if not label:
        raise HTTPException(status_code=404, detail="Label not found")
    return label


@router.delete("/labels/{label_id}")
def remove_label(label_id: int, current_user: str = Depends(get_current_user)):
    user_id = get_user_id_by_username(current_user)
    if not user_id:
        raise HTTPException(status_code=404, detail="User not found")

    ok = delete_user_label(user_id, label_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Label not found")
    return {"success": True}


@router.put("/{user_collection_id}/labels")
def update_collection_labels(user_collection_id: int, req: UserCollectionLabelsRequest, current_user: str = Depends(get_current_user)):
    user_id = get_user_id_by_username(current_user)
    if not user_id:
        raise HTTPException(status_code=404, detail="User not found")

    ok = set_user_collection_labels(user_id, user_collection_id, req.label_ids)
    if not ok:
        raise HTTPException(status_code=404, detail="Collection entry not found")
    return {"success": True}


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

    ok = remove_card_from_user_collection(user_id, card_id, req.quantity, req.quantity_foil, req.label_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Collection entry not found")
    return {"success": True}


@router.post("/bulk")
def bulk_collection_action(req: BulkCollectionRequest, current_user: str = Depends(get_current_user)):
    user_id = get_user_id_by_username(current_user)
    if not user_id:
        raise HTTPException(status_code=404, detail="User not found")

    if req.action == "add":
        return bulk_add_cards_to_user_collection(user_id, [item.model_dump() for item in req.items], req.label_ids, req.label_quantities, req.label_foil_quantities)

    return bulk_remove_cards_from_user_collection(user_id, [item.model_dump() for item in req.items], req.label_quantities, req.label_foil_quantities)
