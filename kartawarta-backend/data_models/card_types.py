from typing import TypedDict

class CardData(TypedDict):
    image_url: str
    expansion_tag: str
    name: str
    card_url: str
    number: str
    rarity: str
    available: str
    price: str
    available_foil: str
    price_foil: str
