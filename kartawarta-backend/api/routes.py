from fastapi import APIRouter, Query, HTTPException
from db import (
    get_cards_by_tcg_name,
    get_expansions_by_tcg_id,
    get_tcg_id_by_name,
    get_card_full_details_by_cardmarketid,
    get_cards_with_prices_by_tcg_name,
    get_tcgs,
)
from functools import lru_cache

router = APIRouter()


@router.get("/cards/")
def get_cards(tcg_name: str = Query(..., description="Name of the TCG")):
    return get_cards_by_tcg_name(tcg_name)


@router.get("/cards-with-prices/")
def get_cards_with_prices(tcg_name: str = Query(..., description="Name of the TCG")):
    return get_cards_with_prices_by_tcg_name(tcg_name)


@router.get("/expansions/")
def get_expansions(tcg_name: str = Query(..., description="Name of the TCG")):
    tcg_id = get_tcg_id_by_name(tcg_name)
    if not tcg_id:
        return {"error": "TCG not found"}
    return get_expansions_by_tcg_id(tcg_id)



# To sprawi, że 1000 najpopularniejszych kart będzie siedzieć w RAMie
@lru_cache(maxsize=1000)
def get_card_full_details_cached(card_market_id: int):
    return get_card_full_details_by_cardmarketid(card_market_id)

@router.get("/card/{card_market_id}")
async def get_card(card_market_id: int):
    # Najpierw sprawdzamy w pamięci RAM
    card = get_card_full_details_cached(card_market_id)
    if not card:
        return {"error": "Card not found"}
    return card


@router.get("/tcgs")
def get_tcgs_list():
    tcgs = get_tcgs()
    if not tcgs:
        return {"error": "No TCGs found"}
    return tcgs
