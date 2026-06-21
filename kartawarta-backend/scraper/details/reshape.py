import re
from typing import Any, Dict, List

def parse_price(price_str: str) -> float:
    # Converts '0,02 €' or '1,234.56 €' to float (euro)
    if not price_str or price_str == 'N/A':
        return None
    price_str = price_str.replace('€', '').replace(' ', '').replace('.', '').replace(',', '.')
    try:
        return float(price_str)
    except Exception:
        return None

def parse_int(num_str: str) -> int:
    if not num_str or num_str == 'N/A':
        return None
    try:
        return int(num_str.replace(',', '').replace('.', ''))
    except Exception:
        return None

def reshape_card(card: Dict[str, Any]) -> Dict[str, Any]:
    card = card.copy()
    # Price fields
    for key in [
        'price', 'price_foil', 'From', 'Price Trend', '30-days average price', '7-days average price', '1-day average price'
    ]:
        if key in card:
            card[key + '_raw'] = card[key]
            card[key] = parse_price(card[key])
    # Available items fields
    for key in ['available', 'available_foil', 'Available items']:
        if key in card:
            card[key + '_raw'] = card[key]
            card[key] = parse_int(card[key])
    # Chart data
    if 'chart_data' in card:
        for entry in card['chart_data']:
            if 'price' in entry:
                entry['price'] = float(entry['price'])

    # id data
    if 'cardMarketId' in card:
        card['cardMarketId_raw'] = card['cardMarketId']
        card['cardMarketId'] = parse_int(card['cardMarketId'])
    return card

def reshape_cards(cards: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    return [reshape_card(card) for card in cards]
