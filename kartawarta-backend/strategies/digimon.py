from strategies.base import CardmarketStrategy


class DigimonStrategy(CardmarketStrategy):
    tcg_name = "Digimon"
    tcg_cm_name = "Digimon"
    cm_products_json_path = "https://downloads.s3.cardmarket.com/productCatalog/productList/products_singles_17.json"
    cm_price_guide_json_path = "https://downloads.s3.cardmarket.com/productCatalog/priceGuide/price_guide_17.json"     
