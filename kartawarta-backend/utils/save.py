import json
from typing import List
from data_models.card_types import CardData

def save_to_json(cards: List[CardData], filename: str) -> None:
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(cards, f, ensure_ascii=False, indent=2)

# Placeholder for future DB saving logic


# Save only TCG, Expansion, and Card (no details or chart data)
def save_cards_basic(cards: List[CardData], tcg_name: str, expansion_name: str, expansion_code: str) -> None:
    from db import get_or_create_tcg, get_or_create_expansion, upsert_card
    tcg_id = get_or_create_tcg(tcg_name)
    expansion_id = get_or_create_expansion(tcg_id, expansion_name, expansion_code)
    for card in cards:
        upsert_card(expansion_id, card)



# Upsert only card details and chart data for a given card_id
def upsert_card_details_and_chart(card_id: int, detail: dict, chart_data: list):
    from db import upsert_card_detail, upsert_chart_data
    upsert_card_detail(card_id, detail)
    if chart_data:
        upsert_chart_data(card_id, chart_data)
