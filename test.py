import requests

TMDB_ID = "1007757"

url = "https://api.videasy.net/mb-flix/sources-with-title"

params = {
    "tmdbId": TMDB_ID,
    "mediaType": "movie",
}

headers = {
    "Referer": "https://www.cineby.sc/",
    "Origin": "https://www.cineby.sc",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
}

print(f"Hitting: {url}")
print(f"Params: {params}\n")

response = requests.get(url, params=params, headers=headers)

print(f"Status Code: {response.status_code}")
print(f"Content-Type: {response.headers.get('Content-Type')}")
print(f"\nRaw Response:\n{response.text[:2000]}")  # first 2000 chars so it doesn't flood terminal