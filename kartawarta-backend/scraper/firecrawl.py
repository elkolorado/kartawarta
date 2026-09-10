import os
from firecrawl import Firecrawl

class FirecrawlScraper:
    def __init__(self, api_key=None):
        self.api_key = api_key or os.environ.get("FIRECRAWL_API_KEY")
        self.firecrawl = Firecrawl(api_key=self.api_key)

    def scrape(self, url, formats=["rawHtml"]):
        doc = self.firecrawl.scrape(url, formats=formats)
        return doc.raw_html if hasattr(doc, 'raw_html') else None