from fastapi import FastAPI
from ytmusicapi import YTMusic
import urllib.request
import json
import random

app = FastAPI()
yt = YTMusic()

@app.get("/api/search")
def search_music(query: str):
    try:
        results = yt.search(query, filter="songs")
        clean_results = []
        for item in results[:10]:
            thumbs = item.get("thumbnails") or item.get("thumbnail") or []
            clean_results.append({
                "videoId": item.get("videoId"),
                "title": item.get("title"),
                "artists": [artist["name"] for artist in item.get("artists", [])],
                "thumbnail": thumbs[-1].get("url", "") if thumbs else "",
            })
        return clean_results
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/stream")
def get_stream(video_id: str):
    # The ultimate list of Piped APIs (JSON based, no HTML errors)
    piped_instances = [
        "https://pipedapi.kavin.rocks",
        "https://pipedapi.tokhmi.xyz",
        "https://api-piped.mha.fi",
        "https://piped-api.garudalinux.org",
        "https://pipedapi.drgns.space",
        "https://watchapi.whatever.social",
        "https://pipedapi.smnz.de",
        "https://piped.projectsegfau.lt/api"
    ]
    
    random.shuffle(piped_instances)
    
    # Strategy 1: Find a working Piped Proxy
    for proxy in piped_instances:
        try:
            url = f"{proxy}/streams/{video_id}"
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
            with urllib.request.urlopen(req, timeout=3) as response:
                data = json.loads(response.read().decode())
                if "audioStreams" in data and len(data["audioStreams"]) > 0:
                    streams = data["audioStreams"]
                    # Hunt down the highly compatible M4A format
                    for stream in streams:
                        if stream.get("format") == "M4A":
                            return {"url": stream["url"], "title": "R-Stream Audio"}
                    return {"url": streams[0]["url"], "title": "R-Stream Audio"}
        except Exception:
            continue
            
    # Strategy 2: If Piped is totally blocked, fallback to Cobalt APIs
    cobalt_instances = [
        "https://co.wuk.sh/api/json",
        "https://cobalt-api.kwiatekm.moe/api/json",
        "https://api.cobalt.tems.lol/api/json"
    ]
    
    random.shuffle(cobalt_instances)
    
    for proxy in cobalt_instances:
        try:
            data = json.dumps({
                "url": f"https://www.youtube.com/watch?v={video_id}",
                "isAudioOnly": True
            }).encode('utf-8')
            req = urllib.request.Request(proxy, data=data, headers={
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0'
            })
            with urllib.request.urlopen(req, timeout=3) as response:
                res = json.loads(response.read().decode())
                if res.get("url"):
                    return {"url": res.get("url"), "title": "R-Stream Audio"}
        except Exception:
            continue

    return {"error": "All proxy servers completely failed."}

@app.get("/api/radio")
def get_radio(video_id: str):
    try:
        radio_data = yt.get_watch_playlist(video_id=video_id, limit=10)
        tracks = []
        for track in radio_data.get('tracks', []):
            thumbs = track.get("thumbnails") or []
            tracks.append({
                "videoId": track.get("videoId"),
                "title": track.get("title"),
                "artists": [a["name"] for a in track.get("artists", [])],
                "thumbnail": thumbs[-1].get("url", "") if thumbs else ""
            })
        return tracks
    except Exception as e:
        return {"error": str(e)}