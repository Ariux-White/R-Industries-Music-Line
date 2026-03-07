from fastapi import FastAPI
from ytmusicapi import YTMusic
import urllib.request
import json

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
    # An array of public proxy servers to guarantee a connection
    proxies = [
        "https://pipedapi.tokhmi.xyz",
        "https://pipedapi.syncpundit.io",
        "https://api-piped.mha.fi",
        "https://pipedapi.kavin.rocks"
    ]
    
    for proxy in proxies:
        try:
            url = f"{proxy}/streams/{video_id}"
            # Add a realistic User-Agent so the proxy doesn't think Vercel is a bot
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'})
            
            with urllib.request.urlopen(req, timeout=5) as response:
                data = json.loads(response.read().decode())
                audio_streams = data.get("audioStreams", [])
                
                if audio_streams:
                    # Prioritize M4A for universal browser compatibility
                    for stream in audio_streams:
                        if stream.get("format") == "M4A":
                            return {"url": stream["url"], "title": "R-Stream Audio"}
                    
                    # Fallback to the first available stream
                    return {"url": audio_streams[0]["url"], "title": "R-Stream Audio"}
        except Exception:
            # If this specific proxy fails or times out, seamlessly move to the next one
            continue
            
    return {"error": "All proxy servers failed to retrieve the stream."}

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