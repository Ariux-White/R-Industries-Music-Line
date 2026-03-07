from fastapi import FastAPI
import urllib.request
import urllib.parse
import json

app = FastAPI()

# A list of stable Piped instances to ensure 100% uptime
PIPED_INSTANCES = [
    "https://pipedapi.kavin.rocks",
    "https://api.piped.victr.me",
    "https://piped-api.garudalinux.org"
]

def fetch_from_piped(endpoint):
    """Helper to try multiple instances if one is down/blocked"""
    for instance in PIPED_INSTANCES:
        try:
            url = f"{instance}{endpoint}"
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=4) as response:
                return json.loads(response.read().decode())
        except Exception:
            continue
    return None

@app.get("/api/search")
def search_music(query: str):
    data = fetch_from_piped(f"/search?q={urllib.parse.quote(query)}&filter=music_songs")
    if not data: return []
    
    results = []
    for item in data.get("items", [])[:10]:
        results.append({
            "videoId": item.get("url", "").split("=")[-1],
            "title": item.get("title"),
            "artists": [item.get("uploaderName")],
            "thumbnail": item.get("thumbnail"),
        })
    return results

@app.get("/api/stream")
def get_stream(video_id: str):
    # This fetches the raw audio link directly from the Piped Shield
    data = fetch_from_piped(f"/streams/{video_id}")
    if not data:
        return {"error": "Stream blocked by YouTube's cloud firewall."}

    # Find the best audio-only stream
    audio_streams = data.get("audioStreams", [])
    if audio_streams:
        # Piped audio links are NOT IP-bound, so they will play on any device
        return {
            "url": audio_streams[-1].get("url"), 
            "title": data.get("title")
        }
    
    return {"error": "No audio stream found."}

@app.get("/api/radio")
def get_radio(video_id: str):
    # This is the "Queue Fix": Piped's /next endpoint returns 
    # the exact 'Related' songs YouTube would show in a Radio.
    data = fetch_from_piped(f"/next/{video_id}")
    if not data: return []
    
    tracks = []
    for item in data.get("relatedItems", []):
        if item.get("type") == "stream":
            tracks.append({
                "videoId": item.get("url", "").split("=")[-1],
                "title": item.get("title"),
                "artists": [item.get("uploaderName")],
                "thumbnail": item.get("thumbnail")
            })
    return tracks