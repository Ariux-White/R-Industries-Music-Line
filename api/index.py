from fastapi import FastAPI
from ytmusicapi import YTMusic
import urllib.request
import urllib.parse
import json

app = FastAPI()
yt = YTMusic()

@app.get("/api/search")
def search_music(query: str):
    try:
        results = yt.search(query, filter="songs")
        return [{
            "videoId": i.get("videoId"),
            "title": i.get("title"),
            "artists": [a["name"] for a in i.get("artists", [])],
            "thumbnail": i.get("thumbnails", [{}])[-1].get("url", ""),
        } for i in results[:10]]
    except: return []

@app.get("/api/stream")
def get_stream(video_id: str):
    try:
        # 1. Get the actual song name from YouTube
        song = yt.get_song(video_id)
        title = song['videoDetails']['title']
        artist = song['videoDetails']['author']
        
        # 2. Search for this exact song on the Saavn network (Unblocked)
        query = urllib.parse.quote(f"{title} {artist}")
        # Using a specialized bypass API
        saavn_url = f"https://saavn.dev/api/search/songs?query={query}"
        
        req = urllib.request.Request(saavn_url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=5) as res:
            data = json.loads(res.read().decode())
            results = data.get("data", {}).get("results", [])
            if results:
                # Grab the highest quality 320kbps link
                link = results[0].get("downloadUrl", [])[-1].get("url")
                return {"url": link, "title": title}
    except:
        pass
    
    # Final Fallback: Cobalt API (High stability)
    try:
        cobalt_url = "https://api.cobalt.tools/api/json"
        body = json.dumps({"url": f"https://www.youtube.com/watch?v={video_id}", "isAudioOnly": True}).encode()
        req = urllib.request.Request(cobalt_url, data=body, headers={'Content-Type': 'application/json', 'Accept': 'application/json'})
        with urllib.request.urlopen(req, timeout=5) as res:
            return {"url": json.loads(res.read())["url"], "title": "Fallback Stream"}
    except:
        return {"error": "All extraction methods blocked by firewall."}

@app.get("/api/radio")
def get_radio(video_id: str):
    try:
        # Try YouTube Radio first
        radio = yt.get_watch_playlist(video_id=video_id, limit=12)
        tracks = []
        for t in radio.get('tracks', []):
            if t.get("videoId") == video_id: continue
            tracks.append({
                "videoId": t.get("videoId"),
                "title": t.get("title"),
                "artists": [a["name"] for a in t.get("artists", [])],
                "thumbnail": t.get("thumbnails", [{}])[-1].get("url", "")
            })
        if tracks: return tracks
    except: pass

    # QUEUE FIX: If Radio fails, search for the artist's other songs
    try:
        song = yt.get_song(video_id)
        artist = song['videoDetails']['author']
        backup = yt.search(artist, filter="songs")
        return [{
            "videoId": i.get("videoId"),
            "title": i.get("title"),
            "artists": [a["name"] for a in i.get("artists", [])],
            "thumbnail": i.get("thumbnails", [{}])[-1].get("url", ""),
        } for i in backup if i.get("videoId") != video_id]
    except: return []