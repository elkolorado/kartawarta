import json
from card_details_scraper import scrape_all_card_details

if __name__ == "__main__":
    # Load cards.json
    with open("cards.json", "r", encoding="utf-8") as f:
        cards = json.load(f)
    # Scrape details for all cards
    all_details = scrape_all_card_details(cards)
    # Save to card_details.json
    with open("card_details.json", "w", encoding="utf-8") as f:
        json.dump(all_details, f, ensure_ascii=False, indent=2)
    print(f"Scraped details for {len(all_details)} cards. Saved to card_details.json.")
