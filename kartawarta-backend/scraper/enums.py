
from enum import Enum

class TCG(Enum):
    DRAGON_BALL_SUPER = 'DragonBallSuper'
    ONE_PIECE = 'OnePiece'
    # Add more TCGs as needed

# Abstract base for expansions (for type safety and future extension)
class Expansion(Enum):
    pass

class DragonBallSuperExpansion(Expansion):
    AWAKENED_PULSE_FUSION_WORLD = 'Awakened-Pulse-Fusion-World'
    BLAZING_AURA_FUSION_WORLD = 'Blazing-Aura-Fusion-World'
    RAGING_ROAR_FUSION_WORLD = 'Raging-Roar'
    ULTRA_LIMIT_FUSION_WORLD = 'Ultra-Limit'
    NEW_ADVENTURE_FUSION_WORLD = 'New-Adventure-Fusion-World'
    RIVALS_CLASH_FUSION_WORLD = 'Rivals-Clash'
    MANGA_BOOSTER_01_FUSION_WORLD = 'Manga-Booster-01-Fusion-World'
    ENERGY_MARKERS_FUSION_WORLD = 'Energy-Markers'
    JUDGE_PROMOS_FUSION_WORLD = 'Judge-Promos-Fusion-World'
    PROMOS_FUSION_WORLD = 'Promos-Fusion-World'
    PROMOS_AWAKENED_PULSE_FUSION_WORLD = 'Promos-Awakened-Pulse-Fusion-World'
    PROMOS_BLAZING_AURA_FUSION_WORLD = 'Promos-Blazing-Aura-Fusion-World'
    PROMOS_NEW_ADVENTURE_FUSION_WORLD = 'Promos-New-Adventure-Fusion-World'
    PROMOS_RAGING_ROAR_FUSION_WORLD = 'Promos-Raging-Roar-Fusion-World'
    PROMOS_ULTRA_LIMIT_FUSION_WORLD = 'Promos-Ultra-Limit-Fusion-World'
    SPECIAL_TOURNAMENT_PROMOS_FUSION_WORLD = 'Special-Tournament-Promos-Fusion-World'
    STARTER_DECK_BARDOCK_FUSION_WORLD = 'Starter-Deck-Bardock-Fusion-World'
    STARTER_DECK_BROLY_FUSION_WORLD = 'Starter-Deck-Broly-Fusion-World'
    STARTER_DECK_EX_GIBLET_FUSION_WORLD = 'Starter-Deck-EX-Giblet'
    STARTER_DECK_EX_SHALLOT_FUSION_WORLD = 'Starter-Deck-EX-Shallot'
    STARTER_DECK_FRIEZA_FUSION_WORLD = 'Starter-Deck-Frieza-Fusion-World'
    STARTER_SON_GOKU_MINI_FUSION_WORLD = 'Son-Goku-Mini'
    STARTER_DECK_SON_GOKU_FUSION_WORLD = 'Starter-Deck-Son-Goku-Fusion-World'
    STARTER_VEGETA_MINI_FUSION_WORLD = 'Vegeta-Mini'
    STARTER_DECK_VEGETA_MINI_SUPER_SAIYAN_3_FUSION_WORLD = 'Starter-Deck-Vegeta-Mini-Super-Saiyan-3-Fusion-World'
    STARTER_DECK_VEGETA_FUSION_WORLD = 'Starter-Deck-Vegeta-Fusion-World'
    UNNUMBERED_PROMOS_FUSION_WORLD = 'Unnumbered-Promos-Fusion-World'

class OnePieceExpansion(Expansion):
    """
    Dynamic expansion list for One Piece, loaded from DB (tcg_id=3).
    Usage: OnePieceExpansion.codes() -> List[str]
    """
    @classmethod
    def codes(cls):
        import db as db
        with db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT name, code FROM Expansion WHERE tcg_id=%s", (3,))
            return [{"name": row[0], "code": row[1]} for row in cursor.fetchall() if row[0] and row[1]]

class Rarity(Enum):
    COMMON = 'Common'
    LEADER = 'Leader'
    UNCOMMON = 'Uncommon'
    ONLINE_CODE_CARD = 'Online Code Card'
    RARE = 'Rare'
    ALTERNATE_ART = 'Alternate Art'
    SUPER_RARE = 'Super Rare'
    SECRET_RARE = 'Secret Rare'
    GOD_RARE = 'God Rare'
    FEATURE_RARE = 'Feature Rare'
    SPECIAL_RARE = 'Special Rare'
    TOKEN = 'Token'
    PROMO = 'Promo'
