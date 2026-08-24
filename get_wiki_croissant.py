import urllib.request

headers = {'User-Agent': 'Mozilla/5.0'}
url = "https://upload.wikimedia.org/wikipedia/commons/2/28/2018_01_Croissant_01.jpg"

req = urllib.request.Request(url, headers=headers)
try:
    with urllib.request.urlopen(req) as resp, open('public/wiki-croissant.jpg', 'wb') as f:
        f.write(resp.read())
    print("Downloaded direct full croissant!")
except Exception as e:
    print(f"Error: {e}")
