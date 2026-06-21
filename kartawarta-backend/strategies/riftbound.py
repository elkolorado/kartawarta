from strategies.base import CardmarketStrategy


class RiftBoundStrategy(CardmarketStrategy):
    tcg_name = "Riftbound"
    tcg_cm_name = "Riftbound"
    tcgpowertools_game_id = 22
    cm_products_json_path = "https://downloads.s3.cardmarket.com/productCatalog/productList/products_singles_22.json"
    cm_price_guide_json_path = "https://downloads.s3.cardmarket.com/productCatalog/priceGuide/price_guide_22.json"
