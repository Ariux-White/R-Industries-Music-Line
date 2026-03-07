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
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/stream")
def get_stream(video_id: str):
    try:
        # 1. Ask YouTube for the actual name of the song
        song_data = yt.get_song(video_id)
        title = song_data.get('videoDetails', {}).get('title', '')
        artist = song_data.get('videoDetails', {}).get('author', '')

        # Clean the title to get a perfect match on the secondary network
        search_query = f"{title} {artist}".replace("Official Video", "").replace("Official Audio", "").strip()
        safe_query = urllib.parse.quote(search_query)

        # 2. Secretly query the JioSaavn open API for the unblocked audio file
        saavn_url = f"https://saavn.dev/api/search/songs?query={safe_query}"
        req = urllib.request.Request(saavn_url, headers={'User-Agent': 'Mozilla/5.0'})

        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode())
            results = data.get("data", {}).get("results", [])

            if results:
                # 3. Grab the highest quality direct download link (usually 320kbps)
                download_urls = results[0].get("downloadUrl", [])
                if download_urls:
                    best_audio = download_urls[-1].get("url")
                    return {"url": best_audio, "title": title}
    except Exception:
        pass

    # 4. Fallback: If it's a rare YouTube-only cover, force a direct Cobalt request
    try:
        cobalt_url = "https://api.cobalt.tools/api/json"
        payload = json.dumps({"url": f"https://www.youtube.com/watch?v={video_id}", "isAudioOnly": True}).encode('utf-8')
        req = urllib.request.Request(cobalt_url, data=payload, headers={
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0'
        })
        with urllib.request.urlopen(req, timeout=5) as response:
            res = json.loads(response.read().decode())
            if res.get("url"):
                return {"url": res.get("url"), "title": "Fallback Audio"}
    except Exception:
        return {"error": "Stream unavailable. Cloud server IP blocked."}

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