from strategies.base import CardmarketStrategy

class OnePieceStrategy(CardmarketStrategy):
    tcg_name = "One Piece"
    tcg_cm_name = "OnePiece"
    cm_products_json_path = "https://downloads.s3.cardmarket.com/productCatalog/productList/products_singles_18.json"
    cm_price_guide_json_path = "https://downloads.s3.cardmarket.com/productCatalog/priceGuide/price_guide_18.json"    