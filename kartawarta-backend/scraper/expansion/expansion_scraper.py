from scraper.base_scraper import BaseScraper
from bs4 import BeautifulSoup
from typing import List
from data_models.card_types import CardData
from strategies.base import CardmarketStrategy

class ExpansionScraper(BaseScraper):
    def __init__(self, strategy: CardmarketStrategy, min_delay=5.0, max_delay=10.5):
        super().__init__(min_delay, max_delay)
        self.strategy = strategy

    def scrape(self, url: str, max_pages: int = 10) -> List[CardData]:
        current_url = url
        all_cards: List[CardData] = []
        page = 1
        while current_url and page <= max_pages:
            html = self.fetch(current_url)
            soup = BeautifulSoup(html, 'html.parser')
            cards = self.strategy.parse_cards(soup)
            for card in cards:
                all_cards.append(card)
                print(f"Grabbed card: {card['name']}")
            current_url = self.strategy.get_next_page_url(soup)
            page += 1
        return all_cards
