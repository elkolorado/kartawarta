from strategies.base import CardmarketStrategy

class PokemonStrategy(CardmarketStrategy):
    tcg_name = "Pokemon"
    tcg_cm_name = "Pokemon"
    cm_products_json_path = "https://downloads.s3.cardmarket.com/productCatalog/productList/products_singles_6.json"
    cm_price_guide_json_path = "https://downloads.s3.cardmarket.com/productCatalog/priceGuide/price_guide_6.json"     