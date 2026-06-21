from db import get_cards_by_tcg_name
import cloudscraper
import os

# Set your TCG name
TCG_NAME = "Dragon Ball Fusion World"  # Change as needed

# Get cards from DB
cards = get_cards_by_tcg_name(TCG_NAME)

# Get _cfuvid cookie
scraper = cloudscraper.create_scraper()
main_url = "https://www.cardmarket.com/en/DragonBallSuper"
scraper.get(main_url)
cfuvid = scraper.cookies.get("_cfuvid")
if not cfuvid:
    raise Exception("Could not obtain _cfuvid cookie.")

headers = {
    "Cookie": f"_cfuvid={cfuvid}",
    "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
    "Accept-Encoding": "gzip, deflate, br, zstd",
    "Accept-Language": "pl",
    "Referer": "https://www.cardmarket.com/",
    "Sec-CH-UA": '"Not)A;Brand";v="8", "Chromium";v="138", "Google Chrome";v="138"',
    "Sec-CH-UA-Mobile": "?0",
    "Sec-CH-UA-Platform": '"Windows"',
    "Sec-Fetch-Dest": "image",
    "Sec-Fetch-Mode": "no-cors",
    "Sec-Fetch-Site": "same-site",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
}

os.makedirs("card_images", exist_ok=True)

for card in cards:
    image_url = card["image_url"]
    card_id = card["cardMarketId"]
    ext = os.path.splitext(image_url)[-1] or ".png"
    filename = f"card_images/{card_id}{ext}"
    resp = scraper.get(image_url, headers=headers)
    if resp.status_code == 200:
        with open(filename, "wb") as imgf:
            imgf.write(resp.content)
        print(f"Saved {filename}")
    else:
        print(f"Failed to fetch image for card {card_id}: {resp.status_code}")