import cloudscraper
import random
import time

USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.1 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:102.0) Gecko/20100101 Firefox/102.0',
]

class BaseScraper:
    def __init__(self, min_delay=1.5, max_delay=3):
        self.min_delay = min_delay
        self.max_delay = max_delay

    def fetch(self, url: str) -> str:
        headers = {'User-Agent': random.choice(USER_AGENTS)}
        scraper = cloudscraper.create_scraper()
        res = scraper.get(url, headers=headers)
        if res.status_code == 429:
            print(f"429 Too Many Requests for {url}. Backing off...")
            time.sleep(10 + random.uniform(0, 5))
            return self.fetch(url)
        if res.status_code == 403:
            print(f"403 Forbidden for {url}. Changing session and backing off...")
            time.sleep(15 + random.uniform(0, 10))
            return self.fetch(url)
        if res.status_code != 200:
            raise Exception(f"Failed to fetch {url}: {res.status_code}")
        time.sleep(random.uniform(self.min_delay, self.max_delay))
        return res.text
