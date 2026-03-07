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
    except Exception:
        # Return an empty list instead of an error string to prevent frontend crashes
        return []

@app.get("/api/stream")
def get_stream(video_id: str):
    try:
        # 1. Grab metadata to search the secondary network
        song_data = yt.get_song(video_id)
        title = song_data.get('videoDetails', {}).get('title', '')
        artist = song_data.get('videoDetails', {}).get('author', '')

        search_query = f"{title} {artist}".replace("Official Video", "").replace("Official Audio", "").strip()
        safe_query = urllib.parse.quote(search_query)

        # 2. Updated Saavn Endpoints for Guaranteed Audio
        saavn_apis = [
            f"https://saavn.sumit.co/api/search/songs?query={safe_query}",
            f"https://saavn.dev/api/search/songs?query={safe_query}"
        ]

        for api_url in saavn_apis:
            try:
                req = urllib.request.Request(api_url, headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(req, timeout=4) as response:
                    data = json.loads(response.read().decode())
                    
                    # Safely dig through the JSON structure
                    results = data.get("data", {}).get("results", []) if "data" in data else data.get("results", [])
                    
                    if results:
                        download_urls = results[0].get("downloadUrl", [])
                        if download_urls:
                            best_audio = download_urls[-1].get("url") # Grabs the 320kbps link
                            if best_audio:
                                return {"url": best_audio, "title": title}
            except Exception:
                continue
    except Exception:
        pass

    # 3. The Ultimate Fallback: Direct MP3 extraction via Cobalt public instance
    try:
        req = urllib.request.Request("https://co.wuk.sh/api/json", data=json.dumps({
            "url": f"https://www.youtube.com/watch?v={video_id}",
            "isAudioOnly": True,
            "aFormat": "mp3"
        }).encode('utf-8'), headers={
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        })
        with urllib.request.urlopen(req, timeout=5) as response:
            res = json.loads(response.read().decode())
            if "url" in res:
                return {"url": res["url"], "title": "Cobalt Stream"}
    except Exception:
        pass

    return {"error": "All audio extraction methods failed."}

@app.get("/api/radio")
def get_radio(video_id: str):
    tracks = []
    try:
        # Attempt standard YouTube radio extraction
        radio_data = yt.get_watch_playlist(video_id=video_id, limit=15)
        for track in radio_data.get('tracks', []):
            if track.get("videoId") == video_id: continue # Skip the currently playing song
            thumbs = track.get("thumbnails") or []
            tracks.append({
                "videoId": track.get("videoId"),
                "title": track.get("title"),
                "artists": [a["name"] for a in track.get("artists", [])],
                "thumbnail": thumbs[-1].get("url", "") if thumbs else ""
            })
    except Exception:
        pass

    # THE QUEUE FIX: If YouTube blocks the radio request, search for the artist instead
    if not tracks:
        try:
            song_data = yt.get_song(video_id)
            artist = song_data.get('videoDetails', {}).get('author', 'Music')
            backup_data = yt.search(artist, filter="songs", limit=10)
            
            for track in backup_data:
                if track.get("videoId") == video_id: continue
                thumbs = track.get("thumbnails") or []
                tracks.append({
                    "videoId": track.get("videoId"),
                    "title": track.get("title"),
                    "artists": [a["name"] for a in track.get("artists", [])],
                    "thumbnail": thumbs[-1].get("url", "") if thumbs else ""
                })
        except Exception:
            pass

    # Always return a list, so your frontend never crashes and the queue stays functional
    return tracks