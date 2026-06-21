import pymssql
from typing import Any, Dict, List
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

DB_CONFIG = {
    'server': os.getenv('DB_SERVER'),
    'port': os.getenv('DB_PORT'),
    'user': os.getenv('DB_USER'),
    'password': os.getenv('DB_PASSWORD'),
    'database': os.getenv('DB_DATABASE', 'cardmarket'),
}

# Get cards for a TCG whose details are missing or not updated today
def get_cards_needing_details(tcg_name: str) -> List[Dict[str, Any]]:
        """
        Returns cards for the given TCG whose CardDetail is missing
        or whose CardDetail.last_updated is not today.
        """
        today = datetime.now().date()
        with get_connection() as conn:
                cursor = conn.cursor(as_dict=True)
                cursor.execute("""
                        SELECT Card.*
                        FROM Card
                        JOIN Expansion ON Card.expansion_id = Expansion.id
                        JOIN TCG ON Expansion.tcg_id = TCG.id
                        LEFT JOIN CardDetail ON Card.id = CardDetail.card_id
                        WHERE TCG.name = %s
                            AND (
                                CardDetail.id IS NULL
                                OR CONVERT(date, CardDetail.last_updated) <> %s
                            )
                """, (tcg_name, today))
                return list(cursor.fetchall())

# Get card_id from Card table by cardMarketId
def get_card_id_by_market_id(card_market_id):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM Card WHERE cardMarketId=%s", (card_market_id,))
        row = cursor.fetchone()
        return row[0] if row else None
# Upsert card detail by card_id: update if exists, else insert
def upsert_card_detail(card_id: int, detail: Dict[str, Any]):
    with get_connection() as conn:
        cursor = conn.cursor()
        # Try update first
        cursor.execute("""
            UPDATE CardDetail SET
                available=%s,
                price=%s,
                available_foil=%s,
                price_foil=%s,
                from_price=%s,
                price_trend=%s,
                avg_30d=%s,
                avg_7d=%s,
                avg_1d=%s,
                versions_url=%s,
                printed_in=%s,
                reprints=%s,
                last_updated=GETDATE()
            WHERE card_id=%s
        """,
        (detail.get('Available items'), detail.get('price'), detail.get('available_foil'), detail.get('price_foil'),
         detail.get('From'), detail.get('Price Trend'), detail.get('30-days average price'), detail.get('7-days average price'),
         detail.get('1-day average price'), detail.get('versions_url'), detail.get('Printed in'), detail.get('Reprints'), card_id))
        if cursor.rowcount == 0:
            # Not found, insert
            cursor.execute("""
                INSERT INTO CardDetail (
                    card_id, available, price, available_foil, price_foil, from_price, price_trend, avg_30d, avg_7d, avg_1d, versions_url, printed_in, reprints, last_updated
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, GETDATE())
            """,
            (card_id, detail.get('Available items'), detail.get('price'), detail.get('available_foil'), detail.get('price_foil'),
                detail.get('From'), detail.get('Price Trend'), detail.get('30-days average price'), detail.get('7-days average price'),
                detail.get('1-day average price'), detail.get('versions_url'), detail.get('Printed in'), detail.get('Reprints')))
        conn.commit()

def bulk_upsert_card_details(batch_data: list):
    """
    batch_data: List of tuples (card_id, available, price, price_foil, from_price, price_trend, avg_30d, avg_7d, avg_1d)
    """
    with get_connection() as conn:
        cursor = conn.cursor()
        try:
            # 1. Create Staging Table
            cursor.execute("""
                CREATE TABLE #TempCardDetail (
                    card_id INT, 
                    available INT, 
                    price FLOAT, 
                    price_foil FLOAT, 
                    from_price FLOAT, 
                    price_trend FLOAT, 
                    avg_30d FLOAT, 
                    avg_7d FLOAT, 
                    avg_1d FLOAT,
                    avg FLOAT,
                    low_foil FLOAT,
                    trend_foil FLOAT,
                    avg1_foil FLOAT,
                    avg7_foil FLOAT,
                    avg30_foil FLOAT
                )
            """)

            # 2. Bulk Insert into temp table
            # pymssql uses %s for placeholders
            insert_query = "INSERT INTO #TempCardDetail VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
            cursor.executemany(insert_query, batch_data)

            # 3. Perform the MERGE
            # Note: We use GETDATE() for last_updated
            merge_sql = """
                DECLARE @SummaryOfChanges TABLE (ActionTaken NVARCHAR(10));

                MERGE CardDetail AS target
                USING #TempCardDetail AS source
                ON (target.card_id = source.card_id)
                WHEN MATCHED THEN
                    UPDATE SET 
                        price = source.price,
                        price_foil = source.price_foil,
                        from_price = source.from_price,
                        price_trend = source.price_trend,
                        avg_30d = source.avg_30d,
                        avg_7d = source.avg_7d,
                        avg_1d = source.avg_1d,
                        avg = source.avg,
                        low_foil = source.low_foil,
                        trend_foil = source.trend_foil,
                        avg1_foil = source.avg1_foil,
                        avg7_foil = source.avg7_foil,
                        avg30_foil = source.avg30_foil,
                        last_updated = GETDATE()
                WHEN NOT MATCHED THEN
                    INSERT (card_id, price, price_foil, from_price, price_trend, avg_30d, avg_7d, avg_1d, avg, low_foil, trend_foil, avg1_foil, avg7_foil, avg30_foil, last_updated)
                    VALUES (source.card_id, source.price, source.price_foil, source.from_price, source.price_trend, source.avg_30d, source.avg_7d, source.avg_1d, source.avg, source.low_foil, source.trend_foil, source.avg1_foil, source.avg7_foil, source.avg30_foil, GETDATE())
                OUTPUT $action INTO @SummaryOfChanges;

                SELECT ActionTaken, COUNT(*) AS Count
                FROM @SummaryOfChanges
                GROUP BY ActionTaken;
            """
            
            cursor.execute(merge_sql)
            
            # Fetch and print results
            print("\n--- Database Update Summary ---")
            results = cursor.fetchall()
            if not results:
                print("No changes made.")
            for row in results:
                print(f"{row[0]}: {row[1]} rows")

            conn.commit()

        except Exception as e:
            conn.rollback()
            print(f"Error during bulk upsert: {e}")
            raise e
        finally:
            # Cleanup temp table
            cursor.execute("IF OBJECT_ID('tempdb..#TempCardDetail') IS NOT NULL DROP TABLE #TempCardDetail")
# Upsert chart data by card_id and date
def upsert_chart_data(card_id: int, chart_data: List[Dict[str, Any]]):
    with get_connection() as conn:
        cursor = conn.cursor()
        for entry in chart_data:
            # Convert date from DD.MM.YYYY to YYYY-MM-DD
            date_str = entry['date']
            try:
                date_obj = datetime.strptime(date_str, "%d.%m.%Y")
                date_sql = date_obj.strftime("%Y-%m-%d")
            except Exception:
                date_sql = date_str  # fallback, may error if not valid
            # Try update first
            cursor.execute("""
                UPDATE ChartData SET price=%s, last_updated=GETDATE() WHERE card_id=%s AND date=%s
            """, (entry['price'], card_id, date_sql))
            if cursor.rowcount == 0:
                cursor.execute("INSERT INTO ChartData (card_id, date, price, last_updated) VALUES (%s, %s, %s, GETDATE())", (card_id, date_sql, entry['price']))
        conn.commit()
# Get all cards for a given TCG name, with expansion info
def get_cards_by_tcg_name(tcg_name: str):
    with get_connection() as conn:
        cursor = conn.cursor(as_dict=True)
        cursor.execute('''
            SELECT Card.*, Expansion.name AS expansion_name, Expansion.code AS expansion_code
            FROM Card
            JOIN Expansion ON Card.expansion_id = Expansion.id
            JOIN TCG ON Expansion.tcg_id = TCG.id
            WHERE TCG.cardMarketName = %s
        ''', (tcg_name,))
        return list(cursor.fetchall())

def get_cards_with_prices_by_tcg_name(tcg_name: str):
    with get_connection() as conn:
        cursor = conn.cursor(as_dict=True)
        cursor.execute('''
            SELECT Card.*, Expansion.name AS expansion_name, Expansion.code AS expansion_code, Expansion.release_date,
                   CardDetail.available, CardDetail.available_foil, CardDetail.price_foil, CardDetail.from_price, CardDetail.price_trend, CardDetail.id as card_detail_id, CardDetail.avg_30d, CardDetail.avg_7d, CardDetail.avg_1d,
                   CardDetail.avg, CardDetail.low_foil, CardDetail.trend_foil, CardDetail.avg1_foil, CardDetail.avg7_foil, CardDetail.avg30_foil
            FROM Card
            JOIN Expansion ON Card.expansion_id = Expansion.id
            JOIN TCG ON Expansion.tcg_id = TCG.id
            LEFT JOIN CardDetail ON Card.id = CardDetail.card_id
            WHERE TCG.cardMarketName = %s
        ''', (tcg_name,))
        return list(cursor.fetchall())


def get_cards_by_tcg_id(tcg_id: int):
    """Return all cards for a given tcg id (Card.* plus expansion_name/code)."""
    with get_connection() as conn:
        cursor = conn.cursor(as_dict=True)
        cursor.execute('''
            SELECT Card.*, Expansion.name AS expansion_name, Expansion.code AS expansion_code
            FROM Card
            JOIN Expansion ON Card.expansion_id = Expansion.id
            WHERE Expansion.tcg_id = %s
        ''', (tcg_id,))
        return list(cursor.fetchall())

def get_tcg_id_by_name(tcg_name: str) -> Any:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM TCG WHERE name=%s", (tcg_name,))
        row = cursor.fetchone()
        return int(row[0]) if row else None
    
def get_expansions_by_tcg_id(tcg_id: int) -> List[Dict[str, Any]]:
    with get_connection() as conn:
        cursor = conn.cursor(as_dict=True)
        cursor.execute("SELECT * FROM Expansion WHERE tcg_id=%s", (tcg_id,))
        return list(cursor.fetchall())


# -----------------
# User collection APIs
# -----------------
def get_user_collection(user_id: int, tcg_id: int = None) -> List[Dict[str, Any]]:
    """Return the user's collection. If tcg_id is provided, filter cards to that TCG."""
    with get_connection() as conn:
        cursor = conn.cursor(as_dict=True)
        # Return card + expansion + card detail + user collection quantity in a single result
        if tcg_id:
            cursor.execute('''
                SELECT
                    uc.id AS user_collection_id,
                    uc.quantity,
                    uc.quantity_foil,
                    uc.last_updated AS collection_last_updated,       
                    c.*,
                    e.name AS expansion_name,
                    e.code AS expansion_code,
                    d.available,
                    d.available_foil,
                    d.price_foil,
                    d.from_price,
                    d.price_trend,
                    d.id AS card_detail_id,
                    d.avg_30d,
                    d.avg_7d,
                    d.avg_1d,
                    d.avg,
                    d.low_foil,
                    d.trend_foil,
                    d.avg1_foil,
                    d.avg7_foil,
                    d.avg30_foil
                FROM UserCollection uc
                JOIN Card c ON uc.card_id = c.id
                JOIN Expansion e ON c.expansion_id = e.id
                LEFT JOIN CardDetail d ON c.id = d.card_id
                WHERE uc.user_id = %s AND c.tcg_id = %s
            ''', (user_id, tcg_id))
        else:
            cursor.execute('''
                SELECT
                    uc.id AS user_collection_id,
                    uc.quantity,
                    uc.quantity_foil,
                    uc.last_updated AS collection_last_updated,
                    c.*,
                    e.name AS expansion_name,
                    e.code AS expansion_code,
                    d.available,
                    d.available_foil,
                    d.price_foil,
                    d.from_price,
                    d.price_trend,
                    d.id AS card_detail_id,
                    d.avg_30d,
                    d.avg_7d,
                    d.avg_1d,
                    d.avg,
                    d.low_foil,
                    d.trend_foil,
                    d.avg1_foil,
                    d.avg7_foil,
                    d.avg30_foil
                FROM UserCollection uc
                JOIN Card c ON uc.card_id = c.id
                JOIN Expansion e ON c.expansion_id = e.id
                LEFT JOIN CardDetail d ON c.id = d.card_id
                WHERE uc.user_id = %s
            ''', (user_id,))
        return list(cursor.fetchall())


def get_user_id_by_username(username: str) -> Any:
    """Return the user id for a given username, or None if not found."""
    with get_connection() as conn:
        cursor = conn.cursor()
        # Try the [User] table first (per schema)
        cursor.execute("SELECT id FROM [User] WHERE username=%s", (username,))
        row = cursor.fetchone()
        if row:
            return int(row[0])
        return int(row[0]) if row else None


def add_card_to_user_collection(user_id: int, card_id: int, quantity: int = 1, quantity_foil: int = 0) -> int:
    """Add quantity (and/or foil) of a card to a user's collection. Returns the UserCollection id."""
    with get_connection() as conn:
        cursor = conn.cursor()
        # Check if entry exists
        cursor.execute("SELECT id, quantity, quantity_foil FROM UserCollection WHERE user_id=%s AND card_id=%s", (user_id, card_id))
        row = cursor.fetchone()
        if row:
            uc_id, existing_q, existing_qf = int(row[0]), int(row[1] or 0), int(row[2] or 0)
            new_q = existing_q + (quantity or 0)
            new_qf = existing_qf + (quantity_foil or 0)
            cursor.execute("UPDATE UserCollection SET quantity=%s, quantity_foil=%s, last_updated=GETDATE() WHERE id=%s", (new_q, new_qf, uc_id))
            conn.commit()
            return uc_id
        else:
            cursor.execute("INSERT INTO UserCollection (user_id, card_id, quantity, quantity_foil, last_updated) VALUES (%s, %s, %s, %s, GETDATE())", (user_id, card_id, quantity, quantity_foil))
            conn.commit()
            cursor.execute("SELECT SCOPE_IDENTITY()")
            return int(cursor.fetchone()[0])


def remove_card_from_user_collection(user_id: int, card_id: int, quantity: int = 1, quantity_foil: int = 0) -> bool:
    """Remove quantity from user's collection. If totals drop to 0, delete the row. Returns True if changed."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, quantity, quantity_foil FROM UserCollection WHERE user_id=%s AND card_id=%s", (user_id, card_id))
        row = cursor.fetchone()
        if not row:
            return False
        uc_id, existing_q, existing_qf = int(row[0]), int(row[1] or 0), int(row[2] or 0)
        new_q = max(0, existing_q - (quantity or 0))
        new_qf = max(0, existing_qf - (quantity_foil or 0))
        if new_q == 0 and new_qf == 0:
            cursor.execute("DELETE FROM UserCollection WHERE id=%s", (uc_id,))
        else:
            cursor.execute("UPDATE UserCollection SET quantity=%s, quantity_foil=%s, last_updated=GETDATE() WHERE id=%s", (new_q, new_qf, uc_id))
        conn.commit()
        return True


def _resolve_card_id(cursor, card_id: int | None = None, card_market_id: int | None = None):
    if card_id is not None:
        return int(card_id)

    if card_market_id is None:
        return None

    cursor.execute("SELECT id FROM Card WHERE cardMarketId=%s", (card_market_id,))
    row = cursor.fetchone()
    return int(row[0]) if row else None


def bulk_add_cards_to_user_collection(user_id: int, items: List[Dict[str, Any]]):
    with get_connection() as conn:
        cursor = conn.cursor()
        changed = 0
        skipped = 0

        for item in items:
            card_id = _resolve_card_id(cursor, item.get("card_id"), item.get("card_market_id"))
            quantity = int(item.get("quantity") or 1)
            quantity_foil = int(item.get("quantity_foil") or 0)

            if not card_id or (quantity <= 0 and quantity_foil <= 0):
                skipped += 1
                continue

            cursor.execute("SELECT id, quantity, quantity_foil FROM UserCollection WHERE user_id=%s AND card_id=%s", (user_id, card_id))
            row = cursor.fetchone()
            if row:
                uc_id, existing_q, existing_qf = int(row[0]), int(row[1] or 0), int(row[2] or 0)
                new_q = existing_q + quantity
                new_qf = existing_qf + quantity_foil
                cursor.execute("UPDATE UserCollection SET quantity=%s, quantity_foil=%s, last_updated=GETDATE() WHERE id=%s", (new_q, new_qf, uc_id))
            else:
                cursor.execute("INSERT INTO UserCollection (user_id, card_id, quantity, quantity_foil, last_updated) VALUES (%s, %s, %s, %s, GETDATE())", (user_id, card_id, quantity, quantity_foil))
            changed += 1

        conn.commit()
        return {"success": True, "processed": len(items), "changed": changed, "skipped": skipped}


def bulk_remove_cards_from_user_collection(user_id: int, items: List[Dict[str, Any]]):
    with get_connection() as conn:
        cursor = conn.cursor()
        changed = 0
        skipped = 0

        for item in items:
            card_id = _resolve_card_id(cursor, item.get("card_id"), item.get("card_market_id"))
            quantity = int(item.get("quantity") or 1)
            quantity_foil = int(item.get("quantity_foil") or 0)

            if not card_id or (quantity <= 0 and quantity_foil <= 0):
                skipped += 1
                continue

            cursor.execute("SELECT id, quantity, quantity_foil FROM UserCollection WHERE user_id=%s AND card_id=%s", (user_id, card_id))
            row = cursor.fetchone()
            if not row:
                skipped += 1
                continue

            uc_id, existing_q, existing_qf = int(row[0]), int(row[1] or 0), int(row[2] or 0)
            new_q = max(0, existing_q - quantity)
            new_qf = max(0, existing_qf - quantity_foil)
            if new_q == 0 and new_qf == 0:
                cursor.execute("DELETE FROM UserCollection WHERE id=%s", (uc_id,))
            else:
                cursor.execute("UPDATE UserCollection SET quantity=%s, quantity_foil=%s, last_updated=GETDATE() WHERE id=%s", (new_q, new_qf, uc_id))
            changed += 1

        conn.commit()
        return {"success": True, "processed": len(items), "changed": changed, "skipped": skipped}

def get_connection():
    return pymssql.connect(
        server=DB_CONFIG['server'],
        port=DB_CONFIG['port'],
        user=DB_CONFIG['user'],
        password=DB_CONFIG['password'],
        database=DB_CONFIG['database']
    )

# Example insert functions (to be expanded for all tables)

def get_or_create_tcg(name: str) -> int:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM TCG WHERE name=%s", (name,))
        row = cursor.fetchone()
        if row:
            return int(row[0])
        cursor.execute("INSERT INTO TCG (name) VALUES (%s)", (name,))
        conn.commit()
        cursor.execute("SELECT SCOPE_IDENTITY()")
        return int(cursor.fetchone()[0])

def get_tcgs() -> List[Dict[str, Any]]:
    with get_connection() as conn:
        cursor = conn.cursor(as_dict=True)
        cursor.execute("SELECT * FROM TCG")
        return list(cursor.fetchall())

def get_tcg_cardmarketname_by_id(tcg_id: int) -> Any:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT cardMarketName FROM TCG WHERE id=%s", (tcg_id,))
        row = cursor.fetchone()
        return row[0] if row else None

def get_tcg_cardmarketname_by_name(tcg_name: str) -> Any:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT cardMarketName FROM TCG WHERE name=%s", (tcg_name,))
        row = cursor.fetchone()
        return row[0] if row else None

def get_or_create_expansion(tcg_id: int, name: str, code: str) -> int:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM Expansion WHERE tcg_id=%s AND name=%s AND code=%s", (tcg_id, name, code))
        row = cursor.fetchone()
        if row:
            return int(row[0])
        cursor.execute("INSERT INTO Expansion (tcg_id, name, code) VALUES (%s, %s, %s)", (tcg_id, name, code))
        conn.commit()
        cursor.execute("SELECT SCOPE_IDENTITY()")
        return int(cursor.fetchone()[0])

def upsert_expansion(tcg_id: int, name: str, code: str, release_date: str | None = None) -> int:
    with get_connection() as conn:
        cursor = conn.cursor()
        # Try update first
        cursor.execute("""
            UPDATE Expansion SET
                name=%s,
                code=%s,
                release_date=%s
            WHERE tcg_id=%s AND code=%s
        """, (name, code, release_date, tcg_id, code))
        if cursor.rowcount == 0:
            # Not found, insert
            cursor.execute("INSERT INTO Expansion (tcg_id, name, code, release_date) VALUES (%s, %s, %s, %s)", (tcg_id, name, code, release_date))
            conn.commit()
            cursor.execute("SELECT SCOPE_IDENTITY()")
            return int(cursor.fetchone()[0])
        else:
            conn.commit()
            # Updated, fetch id
            cursor.execute("SELECT id FROM Expansion WHERE tcg_id=%s AND name=%s", (tcg_id, name))
            return int(cursor.fetchone()[0])

def bulk_upsert_expansions(tcg_id: int, expansions: List[Dict[str, Any]]):
    with get_connection() as conn:
        cursor = conn.cursor()
        try:
            # 1. Create Staging Table
            cursor.execute("""
                CREATE TABLE #TempExpansionImport (
                    tcg_id INT,
                    name NVARCHAR(255),
                    code NVARCHAR(50),
                    release_date DATE
                )
            """)

            # 2. Bulk Insert into temp
            insert_sql = "INSERT INTO #TempExpansionImport VALUES (%s, %s, %s, %s)"
            batch_data = [(tcg_id, exp['name'], exp['code'], exp.get('release_date')) for exp in expansions]
            cursor.executemany(insert_sql, batch_data)

            # 3. MERGE Operation
            merge_sql = """
                DECLARE @Summary TABLE (ActionTaken NVARCHAR(10));

                MERGE Expansion AS target
                USING #TempExpansionImport AS source
                ON (target.tcg_id = source.tcg_id AND target.code = source.code)
                WHEN MATCHED THEN
                    UPDATE SET 
                        name = source.name,
                        release_date = source.release_date
                WHEN NOT MATCHED THEN
                    INSERT (tcg_id, name, code, release_date)
                    VALUES (source.tcg_id, source.name, source.code, source.release_date)
                OUTPUT $action INTO @Summary;

                SELECT ActionTaken, COUNT(*) FROM @Summary GROUP BY ActionTaken;
            """
            
            cursor.execute(merge_sql)
            results = cursor.fetchall()
            
            print("\n--- Expansion Import Results ---")
            for row in results:
                print(f"{row[0]}: {row[1]} expansions")
            
            conn.commit()

        except Exception as e:
            conn.rollback()
            print(f"Error in bulk_upsert_expansions: {e}")
            raise e
        finally:
            cursor.execute("IF OBJECT_ID('tempdb..#TempExpansionImport') IS NOT NULL DROP TABLE #TempExpansionImport")

# Upsert card by cardMarketId: update if exists, else insert
def upsert_card(expansion_id: int, tcg_id: int, card: Dict[str, Any]) -> int:
    with get_connection() as conn:
        cursor = conn.cursor()
        # Try update first
        card_market_id = int(card['cardMarketId'])
        cursor.execute("""
            UPDATE Card SET
                expansion_id=%s,
                tcg_id=%s,
                name=%s,
                number=%s,
                rarity=%s,
                image_url=%s,
                card_url=%s,
                last_updated=GETDATE()
            WHERE cardMarketId=%s
        """, (expansion_id, tcg_id, card['name'], card['number'], card['rarity'], card['image_url'], card['card_url'], card_market_id))
        if cursor.rowcount == 0:
            # Not found, insert
            cursor.execute("""
                INSERT INTO Card (expansion_id, tcg_id, cardMarketId, name, number, rarity, image_url, card_url, last_updated)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, GETDATE())
            """, (expansion_id, tcg_id, card['cardMarketId'], card['name'], card['number'], card['rarity'], card['image_url'], card['card_url']))
            conn.commit()
            cursor.execute("SELECT SCOPE_IDENTITY()")
            return int(cursor.fetchone()[0])
        else:
            conn.commit()
            # Updated, fetch id
            cursor.execute("SELECT id FROM Card WHERE cardMarketId=%s", (card['cardMarketId'],))
            return int(cursor.fetchone()[0])
def bulk_upsert_cards(batch_data: list):
    """
    batch_data: List of tuples (cardMarketId, expansion_id, tcg_id, name, number, rarity, image_url, card_url)
    """
    with get_connection() as conn:
        cursor = conn.cursor()
        try:
            # 1. Create Staging Table
            cursor.execute("""
                CREATE TABLE #TempCardImport (
                    cardMarketId INT,
                    expansion_id INT,
                    tcg_id INT,
                    name NVARCHAR(MAX),
                    number NVARCHAR(50),
                    rarity NVARCHAR(50),
                    image_url NVARCHAR(MAX),
                    card_url NVARCHAR(MAX)
                )
            """)

            # 2. Bulk Insert into temp
            insert_sql = "INSERT INTO #TempCardImport VALUES (%s, %s, %s, %s, %s, %s, %s, %s)"
            cursor.executemany(insert_sql, batch_data)

            # 3. MERGE Operation
            merge_sql = """
                DECLARE @Summary TABLE (ActionTaken NVARCHAR(10));

                MERGE Card AS target
                USING #TempCardImport AS source
                ON (target.cardMarketId = source.cardMarketId)
                WHEN MATCHED THEN
                    UPDATE SET 
                        expansion_id = source.expansion_id,
                        tcg_id = source.tcg_id,
                        name = source.name,
                        number = source.number,
                        rarity = source.rarity,
                        image_url = source.image_url,
                        card_url = source.card_url,
                        last_updated = GETDATE()
                WHEN NOT MATCHED THEN
                    INSERT (expansion_id, tcg_id, cardMarketId, name, number, rarity, image_url, card_url, last_updated)
                    VALUES (source.expansion_id, source.tcg_id, source.cardMarketId, source.name, source.number, source.rarity, source.image_url, source.card_url, GETDATE())
                OUTPUT $action INTO @Summary;

                SELECT ActionTaken, COUNT(*) FROM @Summary GROUP BY ActionTaken;
            """
            
            cursor.execute(merge_sql)
            results = cursor.fetchall()
            
            print("\n--- Card Import Results ---")
            for row in results:
                print(f"{row[0]}: {row[1]} cards")
            
            conn.commit()

        except Exception as e:
            conn.rollback()
            print(f"Error in bulk_upsert_cards: {e}")
            raise e
        finally:
            cursor.execute("IF OBJECT_ID('tempdb..#TempCardImport') IS NOT NULL DROP TABLE #TempCardImport")
def insert_card_detail(card_id: int, detail: Dict[str, Any]):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO CardDetail (
                card_id, available, price, available_foil, price_foil, from_price, price_trend, avg_30d, avg_7d, avg_1d, versions_url, printed_in, reprints
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (card_id, detail.get('available'), detail.get('price'), detail.get('available_foil'), detail.get('price_foil'),
            detail.get('From'), detail.get('Price Trend'), detail.get('30-days average price'), detail.get('7-days average price'),
            detail.get('1-day average price'), detail.get('versions_url'), detail.get('Printed in'), detail.get('Reprints')))
        conn.commit()

def insert_chart_data(card_id: int, chart_data: List[Dict[str, Any]]):
    with get_connection() as conn:
        cursor = conn.cursor()
        for entry in chart_data:
            cursor.execute("INSERT INTO ChartData (card_id, date, price) VALUES (%s, %s, %s)", (card_id, entry['date'], entry['price']))
        conn.commit()

def get_card_full_details_by_cardmarketid(card_market_id: int):
    """
    Returns all details for a card by cardMarketId, including Card, CardDetail, and ChartData (price history).
    """
    with get_connection() as conn:
        cursor = conn.cursor(as_dict=True)
        # Get card and details
        cursor.execute('''
            SELECT c.*, d.*
            FROM Card c
            LEFT JOIN CardDetail d ON c.id = d.card_id
            WHERE c.cardMarketId = %s
        ''', (card_market_id,))
        card = cursor.fetchone()
        if not card:
            return None
        # Get chart data (price history)
        cursor.execute('''
            SELECT date, price FROM ChartData WHERE card_id = %s ORDER BY date ASC
        ''', (card['id'],))
        chart_data = cursor.fetchall()
        card['chart_data'] = chart_data
        return card


# Get expansion by tcg_id and code/tag
def get_expansion_by_tag(tcg_id: int, tag: str):
    with get_connection() as conn:
        cursor = conn.cursor(as_dict=True)
        cursor.execute("SELECT * FROM Expansion WHERE tcg_id=%s AND cardMarketExpansionCode=%s", (tcg_id, tag))
        return cursor.fetchone()