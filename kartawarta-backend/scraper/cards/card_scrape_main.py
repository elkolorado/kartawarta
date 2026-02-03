from strategies.dragonballsuper import DragonBallSuperCardDetailsStrategy
from card_details_scraper import CardScraper
from scraper.details.reshape import reshape_cards


from utils.save import save_to_json, upsert_card_details_and_chart
from db import get_cards_by_tcg_name, get_card_id_by_market_id, get_cards_needing_details

if __name__ == "__main__":
    strategy = DragonBallSuperCardDetailsStrategy()
    TCG_NAME = strategy.tcg
    # db_cards = get_cards_by_tcg_name(TCG_NAME)
    db_cards = get_cards_needing_details(TCG_NAME)
    scraper = CardScraper(strategy)
    import time
    reshaped = []
    scrape_times = []
    total_cards = None
    for idx, db_card in enumerate(db_cards, 1):
        start = time.time()
        details = scraper.scrape(db_card)
        elapsed = time.time() - start
        if details:
            reshaped_card = reshape_cards([details])[0]
            reshaped.append(reshaped_card)
            card_market_id = reshaped_card.get('cardMarketId')
            card_id = get_card_id_by_market_id(card_market_id)
            if card_id:
                detail = reshaped_card.copy()
                chart_data = detail.pop('chart_data', [])
                upsert_card_details_and_chart(card_id, detail, chart_data)
        scrape_times.append(elapsed)
        if idx == 5:
            from db import get_connection
            with get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT COUNT(*) FROM Card")
                total_cards = cursor.fetchone()[0]
            avg_time = sum(scrape_times) / len(scrape_times)
            eta_sec = avg_time * total_cards
            eta_min = eta_sec / 60
            print(f"[ETA] Estimated time to scrape all {total_cards} cards: {eta_min:.1f} minutes ({eta_sec:.0f} seconds)")
    save_to_json(reshaped, 'card_details.json')
    print(f"Scraped details for {len(reshaped)} cards. Saved to card_details.json and database.")
