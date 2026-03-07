from fastapi import FastAPI
from ytmusicapi import YTMusic
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
    # An array of highly stable instances. 
    # Vercel won't contact these; it will just hand one to your browser!
    instances = [
        "https://invidious.flokinet.to",
        "https://inv.tux.pizza",
        "https://invidious.nerdvpn.de",
        "https://invidious.projectsegfau.lt"
    ]
    
    # Pick a random instance to prevent overloading a single server
    instance = random.choice(instances)
    
    # itag=140 is the 128kbps m4a stream.
    # local=true forces the audio to proxy directly to your phone/laptop.
    direct_url = f"{instance}/latest_version?id={video_id}&itag=140&local=true"
    
    # Vercel instantly hands this URL to your website's audio player
    return {"url": direct_url, "title": "R-Stream Direct Audio"}

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