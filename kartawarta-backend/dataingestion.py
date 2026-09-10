import argparse
import sys
from strategies.onepiece import OnePieceStrategy
from strategies.dragonballsuper import DragonBallSuperStrategy
from strategies.riftbound import RiftBoundStrategy
from strategies.pokemon import PokemonStrategy
from strategies.magic import MagicStrategy
from strategies.digimon import DigimonStrategy
from strategies.cyberpunk import CyberpunkStrategy
from strategies.base import CardmarketStrategy

STRATEGIES = {
    'onepiece': OnePieceStrategy,
    'dbs': DragonBallSuperStrategy,
    'riftbound': RiftBoundStrategy,
    'pokemon': PokemonStrategy,
    'magic': MagicStrategy,
    'digimon': DigimonStrategy,
    'cyberpunk': CyberpunkStrategy,
}

def run_scraper(strategy_name: str):
    strategy_cls = STRATEGIES.get(strategy_name.lower())
    if not strategy_cls:
        print(f"Error: Unknown strategy '{strategy_name}'.", file=sys.stderr)
        sys.exit(1)

    strategy: CardmarketStrategy = strategy_cls()
    img_path = f"card_images/{strategy.tcg_cm_name}"

    # strategy.import_tcg_and_expansions_to_db()
    # strategy.import_products_json_to_db(strategy.cm_products_json_path)
    # strategy.import_json_prices_to_db(strategy.cm_price_guide_json_path)
    strategy.import_images_from_products_json(strategy.cm_products_json_path, img_path)

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Scrape expansions with chosen strategy.')
    parser.add_argument('-s', '--strategy', required=True, choices=STRATEGIES.keys(),
                        help='The strategy to use for scraping')
    
    args = parser.parse_args()
    run_scraper(args.strategy)