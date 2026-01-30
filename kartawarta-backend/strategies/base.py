from urllib.parse import quote
from bs4 import BeautifulSoup
from typing import List, Optional
from data_models.card_types import CardData
from typing import Tuple
import db as db
from typing import Any
import requests
from pathlib import Path
import cloudscraper
import re
from datetime import datetime


class CardmarketStrategy:

    tcg_name: str = ""
    tcg_cm_name: str = ""
    cm_products_json_path: str = ""
    cm_price_guide_json_path: str = ""
    tcg_id: str = ""  # Will be set in __init__

    def __init__(self):
        """
        Initializes the strategy, ensuring required attributes are set 
        and performing configuration steps like fetching the TCG ID.
        """
        if not self.tcg_name:
            raise NotImplementedError(
                f"Subclass {self.__class__.__name__} must define 'tcg_name'."
            )

        self.tcg_id = db.get_or_create_tcg(self.tcg_name)
        print(
            f"Initialized strategy for TCG '{self.tcg_name}' with ID {self.tcg_id}.")

    def get_url(self, expansion_code: str) -> str:
        """
        Generates a Cardmarket product page URL using the subclass's tcg_cm_name.
        """
        return (
            f"https://www.cardmarket.com/en/{self.tcg_cm_name}/Products/Singles/"
            f"{expansion_code}?idRarity=0"
        )

    def parse_cards(self, soup: BeautifulSoup) -> List[CardData]:
        cards = []
        for row in soup.select('.table-body > .row.g-0'):
            # Extract cardMarketId from row id (e.g., productRow759989)
            card_market_id = None
            row_id = row.get('id', '')
            if row_id.startswith('productRow'):
                try:
                    card_market_id = int(row_id.replace('productRow', ''))
                except ValueError:
                    card_market_id = None
            image_url = ''
            img_span = row.select_one('.col-icon span[data-bs-title]')
            if img_span and img_span.has_attr('data-bs-title'):
                import re
                m = re.search(r'src=\\?"(.*?)\\?"', img_span['data-bs-title'])
                if m:
                    image_url = m.group(1)

            expansion_tag_el = row.select_one('.col-icon.small span')
            expansion_tag = expansion_tag_el.get_text(
                strip=True) if expansion_tag_el else ''

            name_anchor = row.select_one('.col .col-10 a')
            name = name_anchor.get_text(strip=True) if name_anchor else ''
            card_url = f"https://www.cardmarket.com{name_anchor['href']}" if name_anchor and name_anchor.has_attr(
                'href') else ''

            number_el = row.select_one('.col-md-2')
            number = number_el.get_text(strip=True) if number_el else ''

            rarity_svg = row.select_one('.col-sm-2.d-none.d-sm-flex svg')
            rarity = rarity_svg['title'] if rarity_svg and rarity_svg.has_attr(
                'title') else ''

            available_el = row.select_one('.col-availability.px-2')
            available = available_el.get_text(
                strip=True) if available_el else ''

            price_el = row.select_one('.col-price')
            price = price_el.get_text(strip=True) if price_el else ''

            available_foil_el = row.select_one(
                '.col-availability.d-none.d-lg-flex')
            available_foil = available_foil_el.get_text(
                strip=True) if available_foil_el else ''

            price_foil_el = row.select_one('.col-price.d-none.d-lg-flex')
            price_foil = price_foil_el.get_text(
                strip=True) if price_foil_el else ''

            cards.append({
                'image_url': image_url,
                'expansion_tag': expansion_tag,
                'name': name,
                'card_url': card_url,
                'number': number,
                'rarity': rarity,
                'available': available,
                'price': price,
                'available_foil': available_foil,
                'price_foil': price_foil,
                'cardMarketId': card_market_id
            })
        return cards

    def get_next_page_url(self, soup: BeautifulSoup) -> Optional[str]:
        next_btn = soup.select_one(
            '#pagination a[data-direction="next"]:not(.disabled)')
        if next_btn and next_btn.has_attr('href'):
            return f"https://www.cardmarket.com{next_btn['href']}"
        return None

    def get_expansion_codes(self) -> List[Any]:
        """Return a list of expansion codes (or values) to iterate.

        Default behaviour:
        - If subclass defines `EXPANSIONS` attribute, return it (converting dicts to their 'code' if needed).
        - Else if subclass sets `tcg_id`, query the DB for Expansion.code values for that tcg_id.
        - Otherwise return an empty list.
        """
        # 1) EXPANSIONS attribute on subclass
        if hasattr(self, 'EXPANSIONS'):
            ex = getattr(self, 'EXPANSIONS') or []
            # If entries are dict-like with 'code', extract it
            codes = []
            for e in ex:
                if isinstance(e, dict) and 'code' in e:
                    codes.append(e['code'])
                else:
                    codes.append(e)
            return codes

        # 2) Query DB if tcg_id present
        if getattr(self, 'tcg_id', None):
            with db.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "SELECT code FROM Expansion WHERE tcg_id=%s", (self.tcg_id,))
                rows = cursor.fetchall()
                return [r[0] for r in rows if r and r[0]]

        return []

    def get_all_expansion_url_and_codes(self) -> List[Tuple[str, Any]]:
        """Return list of tuples (url, expansion_code) for all expansions this strategy should scrape."""
        codes = self.get_expansion_codes()
        result: List[Tuple[str, Any]] = []
        for code in codes:
            try:
                url = self.get_url(code)
                result.append((url, code))
            except Exception:
                # skip problematic expansion
                continue

    def import_images_from_products_json(self, products_json_url: str, dest_dir: str | Path, id_field: str = 'idProduct', expansion_field: str = 'idExpansion', id_category_field: str = 'idCategory') -> dict:
        """Fetch product list JSON and download product images into `dest_dir`.

        Behavior:
        - Resolves `tcg_id` similarly to other helpers.
        - Looks up `cardMarketExpansionCode` from DB using `cardMarketExpansionId` and caches results.
        - For each product builds candidate variants in this order: [code, code+'X', code+'S'] and checks extensions in order `png`, `jpg`.
        - Saves first successful image as `{id}_{variant}.{ext}`.
        """
        dest_path = Path(dest_dir)
        dest_path.mkdir(parents=True, exist_ok=True)

        scraper = cloudscraper.create_scraper()
        # prime cloudflare/session
        try:
            scraper.get('https://www.cardmarket.com/', timeout=10)
        except Exception:
            pass

        resp = scraper.get(products_json_url, timeout=30)

        resp.raise_for_status()
        data = resp.json()
        products = data.get('products') if isinstance(
            data, dict) else data or []
        
        # only expansion id 4284
        # products = [p for p in products if p.get('idExpansion') == 6006]

        # OnePiece
        if self.tcg_id == 3:
            expansions = db.get_expansions_by_tcg_id(self.tcg_id)
            valid_expansion_ids = {e['cardMarketExpansionId']
                                   for e in expansions}
            products = [
                p for p in products
                if p.get('idExpansion') in valid_expansion_ids
            ]

        # Fusion World filtering
        if self.tcg_id == 1:
            expansions = db.get_expansions_by_tcg_id(self.tcg_id)
            valid_expansion_ids = {e['cardMarketExpansionId']
                                   for e in expansions}
            products = [
                p for p in products
                if p.get('idExpansion') in valid_expansion_ids
                or "[Fusion World]" in p.get('name', "") and p.get('idExpansion') == 4326
            ]

        success = skipped = failed = 0

        # cache: cmExpansionId -> (expansion_id, cardMarketExpansionCode) or None
        expansion_cache_by_cm_id = {}

        headers = {
            'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br, zstd',
            'Accept-Language': 'en',
            'Referer': 'https://www.cardmarket.com/',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        }

        p_index = 0

        download_jobs = []
        print(f"Processing {len(products)} products for image download..."  )

        for p in products:
            p_index += 1

            product_id = p.get(id_field)
            id_cat = p.get(id_category_field)
            id_exp = p.get(expansion_field)

            if not product_id or not id_cat or not id_exp:
                skipped += 1
                continue
            # --- EXCEPTION HANDLING ---
            # If it's the mislabeled Fusion World expansion, map to the correct one
            is_exception = (id_exp == 4326)
            lookup_id = 5645 if is_exception else id_exp
            # ---------------------------

            cached = expansion_cache_by_cm_id.get(id_exp)

            cached = expansion_cache_by_cm_id.get(lookup_id)
            if cached is None and lookup_id not in expansion_cache_by_cm_id:
                with db.get_connection() as conn:
                    cursor = conn.cursor()
                    cursor.execute(
                        "SELECT cardMarketExpansionCode FROM Expansion "
                        "WHERE cardMarketExpansionId=%s AND tcg_id=%s",
                        (lookup_id, self.tcg_id),
                    )
                    row = cursor.fetchone()
                    cached = row[0] if row else None

                expansion_cache_by_cm_id[lookup_id] = cached

            if not cached:
                skipped += 1
                continue

            # --- URL CODE EXCEPTION ---
            # Even though we mapped to 5645 for the DB, the images are stored 
            # under 'UP' in the S3 bucket for these specific cards.
            final_exp_code = "UP" if is_exception else cached
            # ---------------------------

            download_jobs.append({
                "product_id": product_id,
                "id_cat": id_cat,
                "exp_code": final_exp_code,
            })

        from requests.exceptions import RequestException

        EXTS = ['jpg', 'png']
        TIMEOUT = 15
        CHUNK_SIZE = 65536

        print(skipped + len(download_jobs), "total products to process.")

        def download_product_image(job) -> str:
            product_id = job["product_id"]
            id_cat = job["id_cat"]
            exp_code = job["exp_code"]

            session = requests.Session()
            session.headers.update(headers)

            # Skip if already exists
            for ext in EXTS:
                if (dest_path / f"{product_id}.{ext}").exists():
                    return "skipped"

            for ext in EXTS:
                fname = dest_path / f"{product_id}.{ext}"
                url = (
                    f"https://product-images.s3.cardmarket.com/"
                    f"{id_cat}/{exp_code}/{product_id}/{product_id}.{ext}"
                )

                try:
                    r = session.get(url, stream=True, timeout=TIMEOUT)

                    if r.status_code == 404:
                        continue
                    if r.status_code != 200:
                        return "failed"

                    save_path = dest_path / f"{product_id}.png"
                    with open(save_path, "wb") as fh:
                        for chunk in r.iter_content(CHUNK_SIZE):
                            fh.write(chunk)

                    return "success"

                except RequestException:
                    return "failed"

            return "failed"
        

        success = skipped = failed = 0
        MAX_WORKERS = 12
        from concurrent.futures import ThreadPoolExecutor, as_completed
        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
            futures = [
                executor.submit(download_product_image, job)
                for job in download_jobs
            ]

            for i, future in enumerate(as_completed(futures), 1):
                result = future.result()

                if result == "success":
                    success += 1
                elif result == "skipped":
                    skipped += 1
                else:
                    failed += 1

                if i % 50 == 0 or i == len(futures):
                    print(
                        f"[{i}/{len(futures)}] "
                        f"OK={success} SKIP={skipped} FAIL={failed}",
                        end="\r",
                        flush=True
                    )
        return {'success': success, 'skipped': skipped, 'failed': failed, 'total': len(products)}

    def import_products_json_to_db(self, products_json_url: str, id_field: str = 'idProduct', expansion_field: str = 'idExpansion') -> dict:
        print(f"Importing products from: {products_json_url}")
        resp = requests.get(products_json_url, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        products = data.get('products') if isinstance(
            data, dict) else data or []


        # OnePiece
        if self.tcg_id == 3:
            expansions = db.get_expansions_by_tcg_id(self.tcg_id)
            valid_expansion_ids = {e['cardMarketExpansionId']
                                   for e in expansions}
            products = [
                p for p in products
                if p.get('idExpansion') in valid_expansion_ids
            ]
            
        # Fusion World filtering
        if self.tcg_id == 1:
            expansions = db.get_expansions_by_tcg_id(self.tcg_id)
            valid_expansion_ids = {e['cardMarketExpansionId']
                                   for e in expansions}
            products = [
                p for p in products
                if p.get('idExpansion') in valid_expansion_ids
                or "[Fusion World]" in p.get('name', "") and p.get('idExpansion') == 4326
            ]

        print("")
        expansion_cache = {}
        batch_data = []
        skipped = 0

        # 1. Pre-fetch relevant expansions to minimize DB hits in the loop
        # (Optional but faster: Fetch all expansions for this TCG once)

        for p in products:
            pid = p.get(id_field)
            id_exp = p.get(expansion_field)

            # 1. Map the 'wrong' expansion ID to the target ID (5645)
            is_exception = (id_exp == 4326)
            lookup_id = 5645 if is_exception else id_exp

            if pid is None or lookup_id is None:
                skipped += 1
                continue

            # 2. Cache lookup using the target ID
            if lookup_id not in expansion_cache:
                with db.get_connection() as conn:
                    cursor = conn.cursor()
                    cursor.execute(
                        "SELECT id, cardMarketExpansionCode FROM Expansion WHERE cardMarketExpansionId=%s AND tcg_id=%s", 
                        (lookup_id, self.tcg_id)
                    )
                    row = cursor.fetchone()
                    expansion_cache[lookup_id] = (int(row[0]), row[1]) if row else None

            cached = expansion_cache[lookup_id]
            if not cached:
                skipped += 1
                continue

            exp_id, exp_code = cached

            # 3. Handle the specific "UP" URL exception
            # If it's our exception case, force the code to 'UP' for the image path
            url_code = "UP" if is_exception else exp_code

            # Prepare record
            record = (
                int(pid),
                exp_id,             # Points to 5645 in your DB
                self.tcg_id,
                p.get('name'),
                None,
                None,
                # image_url uses 'UP' for the exception cards
                f"https://product-images.s3.cardmarket.com/{p.get('idCategory')}/{url_code}/{pid}/{pid}.png",
                f"https://www.cardmarket.com/{self.tcg_cm_name}/Products?idProduct={pid}"
            )
            batch_data.append(record)

        if batch_data:
            db.bulk_upsert_cards(batch_data)

        return {
            'success': len(batch_data),
            'skipped': skipped,
            'total': len(products)
        }

    def import_json_prices_to_db(self, price_guide_url: str) -> dict:
        """Fetch a Cardmarket price guide JSON and upsert CardDetail rows.

        Parameters:
        - price_guide_url: URL to Cardmarket price guide JSON (productCatalog/priceGuide).
        - tcg_id / tcg_name: numeric tcg id or name to resolve via DB (prefers explicit tcg_id).

        Returns: summary dict {success, skipped, failed, total}.
        """
        def safe_float(v):
            try:
                if v is None:
                    return None
                return float(v)
            except Exception:
                return None

        resp = requests.get(price_guide_url, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        guides = data.get('priceGuides', []) if isinstance(
            data, dict) else data
        guides = guides or []

        # Build map: product id -> guide
        guide_map = {}
        for g in guides:
            try:
                pid = int(g.get('idProduct'))
            except Exception:
                continue
            guide_map[pid] = g

        # Get all cards for this TCG
        cards = db.get_cards_by_tcg_id(self.tcg_id)
        success = skipped = failed = 0
        batch_data = []
        for card in cards:
            card_market_id = card.get('cardMarketId')
            if card_market_id is None:
                skipped += 1
                continue
            try:
                pid = int(card_market_id)
            except Exception:
                skipped += 1
                continue

            guide = guide_map.get(pid)
            if not guide:
                skipped += 1
                continue

            record = (
                card['id'],  # card_id
                None,  # available (not provided in guide JSON)
                safe_float(guide.get('avg')) or safe_float(
                    guide.get('low')),  # price
                safe_float(guide.get('avg-foil')),  # price_foil
                safe_float(guide.get('low')) or safe_float(
                    guide.get('avg')),  # from_price
                safe_float(guide.get('trend')),  # price_trend
                safe_float(guide.get('avg30')),  # avg_30d
                safe_float(guide.get('avg7')),   # avg_7d
                safe_float(guide.get('avg1')),   # avg_1d
                safe_float(guide.get('avg')),   # avg
                safe_float(guide.get('low-foil')),  # low-foil
                safe_float(guide.get('trend-foil')),  # trend-foil
                safe_float(guide.get('avg1-foil')),   # avg_1d_foil
                safe_float(guide.get('avg7-foil')),   # avg_7d_foil
                safe_float(guide.get('avg30-foil')),  # avg_30d_foil
            )
            batch_data.append(record)

        # Call the new batch upsert function
        if batch_data:
            db.bulk_upsert_card_details(batch_data)
            success = len(batch_data)

        return {'success': success, 'skipped': skipped, 'failed': failed, 'total': len(cards)}

    def import_tcg_and_expansions_to_db(self, lang="en"):
        scraper = cloudscraper.create_scraper()

        cardmarkettcg_name = db.get_tcg_cardmarketname_by_id(self.tcg_id)

        # Step 1: Get expansions
        exp_url = f"https://www.cardmarket.com/{lang}/{quote(cardmarkettcg_name)}/Expansions?order=chronological"
        print(f"Fetching expansions from {exp_url}")
        exp_html = scraper.get(exp_url).text
        exp_soup = BeautifulSoup(exp_html, "html.parser")

        expansions = []
        for row in exp_soup.select('div.expansion-row'):
            name = row.get('data-local-name')
            code = row.get('data-url').split('/')[-1]
            date = row.select_one('.col-3.text-center.d-none.d-md-block').text.strip() if row.select_one('.col-3.text-center.d-none.d-md-block') else None
            print(f"Parsing expansion: name='{name}', code='{code}', date='{date}'")
            try:
                # Remove 'st', 'nd', 'rd', or 'th' if they follow a digit
                clean_date = re.sub(r'(?<=\d)(st|nd|rd|th)', '', date)
                
                # Now parse the cleaned string: "31 October, 2025"
                date_obj = datetime.strptime(clean_date, '%d %B, %Y')
                formatted_date = date_obj.strftime('%Y-%m-%d')
                print(formatted_date)  # Output: 2025-10-31
                
            except Exception as e:
                formatted_date = None
            symbol_el = row.select_one('.expansion-symbol span')
            cardmarketexpansioncode = None
            if symbol_el and symbol_el.text.strip():
                cardmarketexpansioncode = symbol_el.text.strip()
                print(f"Found expansion code '{cardmarketexpansioncode}' for expansion '{name}'")
                print(f"Symbol element text: {symbol_el.text.strip()}")
                print(f"Symbol element HTML: {symbol_el.text}")
            else:
                # try to find a product image URL in the row and extract the expansion code segment
                img = row.find('img')
                src = None
                if img:
                    for attr in ('src', 'data-src', 'data-original', 'data-lazy', 'data-srcset', 'data-echo'):
                        if img.has_attr(attr):
                            src = img[attr]
                            if src == "/img/transparent.gif":
                                continue
                            break
                if src:
                    m = re.search(r'product-images\.s3\.cardmarket\.com/[^/]+/([^/]+)/', src)
                    if m:
                        cardmarketexpansioncode = m.group(1)
            expansions.append({
                'name': name,
                'code': code,
                'cardmarketexpansioncode': cardmarketexpansioncode,
                'release_date': formatted_date
            })

        # Step 2: Get expansion IDs
        singles_url = f"https://www.cardmarket.com/{lang}/{quote(cardmarkettcg_name)}/Products/Singles"
        singles_html = scraper.get(singles_url).text
        singles_soup = BeautifulSoup(singles_html, "html.parser")

        exp_id_map = {}
        for opt in singles_soup.select('select[name="idExpansion"] option'):
            val = opt.get('value')
            if val and val != '0':
                exp_id_map[opt.text.strip()] = val

        # Step 3: Match and combine
        for exp in expansions:
            exp['cardmarketexpansionid'] = exp_id_map.get(exp['name'])


        # exception for onepiece. Only expansions that are not having (Non-English) or (Japanese) in their name are valid.
        if self.tcg_name == "One Piece":
            expansions = [
                e for e in expansions if '(Non-English)' not in e['name'] and '(Japanese)' not in e['name']]

        # exception for fusion world. Only expansions that are ending with [Fusion World] in their name are valid.
        if self.tcg_name == "Dragon Ball Fusion World":
            expansions = [
                e for e in expansions if e['name'].endswith('[Fusion World]')]

        # summary so far
        print(f"Found {len(expansions)} expansions for TCG '{self.tcg_name}':")
        for exp in expansions:
            print(
                f" - {exp['name']}: id={exp.get('cardmarketexpansionid')}, code={exp.get('cardmarketexpansioncode')}, release_date={exp.get('release_date')}")

        # List expansions already in DB that are missing cardMarketExpansionId or cardMarketExpansionCode
        with db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT id, name, cardMarketExpansionId, cardMarketExpansionCode, release_date
                FROM Expansion
                WHERE tcg_id = %s
                """,
                (self.tcg_id,)
            )
            rows = cursor.fetchall()

        db_names = {
            row[1]: {'id': row[0], 'cardMarketExpansionId': row[2],
                     'cardMarketExpansionCode': row[3], 'release_date': row[4]}
            for row in rows
        }
        print(
            f"Found {len(db_names)} expansions in DB for TCG id {self.tcg_id}.")

        # 1. First, process all expansions and collect IDs
        update_data = []

        for exp in expansions:
            # Get the ID from your existing upsert method
            expansion_id = db.upsert_expansion(self.tcg_id, exp['name'], exp['code'], exp.get('release_date'))
            
            # Prepare a tuple of (CardmarketID, CardmarketCode, InternalID)
            update_data.append((
                exp.get('cardmarketexpansionid'),
                exp.get('cardmarketexpansioncode'),
                expansion_id
            ))

        # 2. Perform a single batch update
        if update_data:
            with db.get_connection() as conn:
                cursor = conn.cursor()
                query = """
                    UPDATE Expansion 
                    SET cardMarketExpansionId = %s, 
                        cardMarketExpansionCode = %s 
                    WHERE id = %s
                """
                # executemany is significantly faster for large lists
                cursor.executemany(query, update_data)
                conn.commit()

        # return missing

