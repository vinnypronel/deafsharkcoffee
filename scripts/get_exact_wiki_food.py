import urllib.request
import urllib.parse
import json

def get_wiki_url(query):
    endpoint = "https://commons.wikimedia.org/w/api.php"
    params = {
        "action": "query",
        "format": "json",
        "generator": "search",
        "gsrsearch": f"filetype:bitmap {query}",
        "gsrlimit": 5,
        "prop": "imageinfo",
        "iiprop": "url"
    }
    url = f"{endpoint}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={'User-Agent': 'DeafShark/1.0'})
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        pages = data.get("query", {}).get("pages", {})
        urls = []
        for pid, pdata in pages.items():
            for info in pdata.get("imageinfo", []):
                if "url" in info:
                    urls.append(info["url"])
        return urls

for q in ["Croissant", "Tequenos", "Waffles"]:
    u = get_wiki_url(q)
    print(f"{q}: {u[:2]}")
