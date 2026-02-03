from scraper.base_scraper import BaseScraper
from bs4 import BeautifulSoup
from typing import Dict, Any, List
from strategies.base import CardDetailsStrategy

class CardScraper(BaseScraper):
    def __init__(self, strategy: CardDetailsStrategy, min_delay=3.5, max_delay=4.5):
        super().__init__(min_delay, max_delay)
        self.strategy = strategy

    def scrape(self, card: Dict[str, Any]) -> Dict[str, Any]:
        url = card.get('card_url')
        if not url:
            print('No card_url found for card:', card)
            return {}
        print(f"Scraping details for: {card.get('name', url)}")
        html = self.fetch(url)
        soup = BeautifulSoup(html, 'html.parser')
        details = self.strategy.parse_details(soup)
        card_with_details = card.copy()
        card_with_details.update(details)
        return card_with_details

    def scrape_all(self, cards: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        return [self.scrape(card) for card in cards]


    #scrape_all in 2 parralel
    def scrape_all_parallel(self, cards: List[Dict[str, Any]], max_workers: int = None) -> List[Dict[str, Any]]:
        import concurrent.futures
        with concurrent.futures.ProcessPoolExecutor(max_workers=max_workers) as executor:
            results = list(executor.map(self.scrape, cards))
        return results