from strategies.base import CardmarketStrategy


class CyberpunkStrategy(CardmarketStrategy):
    tcg_name = "Cyberpunk"
    tcg_cm_name = "Cyberpunk"
    tcg_db_id = 1008
    tcgpowertools_game_id = 23
    cm_products_json_path = "https://downloads.s3.cardmarket.com/productCatalog/productList/products_singles_23.json"
    cm_price_guide_json_path = "https://downloads.s3.cardmarket.com/productCatalog/priceGuide/price_guide_23.json"