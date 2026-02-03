from strategies.base import CardmarketStrategy


class MagicStrategy(CardmarketStrategy):
    tcg_name = "Magic: The Gathering"
    tcg_cm_name = "Magic"
    cm_products_json_path = "https://downloads.s3.cardmarket.com/productCatalog/productList/products_singles_1.json"
    cm_price_guide_json_path = "https://downloads.s3.cardmarket.com/productCatalog/priceGuide/price_guide_1.json"     