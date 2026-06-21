from strategies.base import CardmarketStrategy


class DragonBallSuperStrategy(CardmarketStrategy):
    tcg_name = "Dragon Ball Fusion World"
    tcg_cm_name = "DragonBallSuper"
    tcgpowertools_game_id = 13
    cm_products_json_path = "https://downloads.s3.cardmarket.com/productCatalog/productList/products_singles_13.json"
    cm_price_guide_json_path = "https://downloads.s3.cardmarket.com/productCatalog/priceGuide/price_guide_13.json"     
