import urllib.request
import json
import os
from PIL import Image

def search_unsplash(query):
    url = f"https://unsplash.com/napi/search/photos?query={urllib.parse.quote(query)}&per_page=10"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode())
            return data.get('results', [])
    except Exception as e:
        print(f"Error searching unsplash for {query}: {e}")
        return []

def search_wikimedia(query):
    url = f"https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch={urllib.parse.quote(query)}&gsrlimit=10&prop=imageinfo&iiprop=url|dimensions&format=json"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode())
            pages = data.get('query', {}).get('pages', {})
            results = []
            for k, v in pages.items():
                info = v.get('imageinfo', [{}])[0]
                if 'url' in info:
                    results.append({'title': v.get('title'), 'url': info.get('url')})
            return results
    except Exception as e:
        print(f"Error searching wikimedia for {query}: {e}")
        return []

print("Searching Unsplash and Wikimedia...")
waffle_results = search_unsplash("waffle sandwich white background")
print("Waffle:", len(waffle_results), [r['urls']['regular'] for r in waffle_results[:3]])

croissant_results = search_unsplash("croissant sandwich white plate")
print("Croissant:", len(croissant_results), [r['urls']['regular'] for r in croissant_results[:3]])

tequenos_wiki = search_wikimedia("tequeños")
print("Tequenos wiki:", tequenos_wiki[:3])

cachito_wiki = search_wikimedia("cachito de jamon")
print("Cachito wiki:", cachito_wiki[:3])
