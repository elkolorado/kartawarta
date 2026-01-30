import json
from scraper.details.reshape import reshape_cards
from utils.save import save_to_json
from strategies.dragonballsuper import DragonBallSuperCardDetailsStrategy
from card_details_scraper import CardScraper
import time

if __name__ == "__main__":
    with open("cards.json", "r", encoding="utf-8") as f:
        cards = json.load(f)
    strategy = DragonBallSuperCardDetailsStrategy()
    scraper = CardScraper(strategy)
    total_all_cards = len(cards)
    
    start_time = time.time()
    
    all_details = scraper.scrape_all_parallel(cards, max_workers=1)
    elapsed = time.time() - start_time

    # Estimate total time for all cards
    total_cards = len(cards)

    if total_cards > 0:
        eta_seconds = (elapsed / total_cards) * total_all_cards
        eta_minutes = eta_seconds / 60
        print(f"Time taken for {total_cards} cards: {elapsed:.2f} seconds.")
        print(f"Estimated time for {total_all_cards} cards: {eta_seconds:.2f} seconds ({eta_minutes:.2f} minutes).")
    else:
        print("No cards to process, cannot estimate ETA.")

    reshaped = reshape_cards(all_details)
    save_to_json(reshaped, 'card_details.json')
    print(f"Scraped details for {len(reshaped)} cards. Saved to card_details.json.")
