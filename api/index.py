from fastapi import FastAPI
from ytmusicapi import YTMusic
import yt_dlp

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
    # This setup spoofs an iOS device to bypass the "Bot" check
    ydl_opts = {
        'format': 'bestaudio/best',
        'quiet': True,
        'nocheckcertificate': True,
        'no_warnings': True,
        'extractor_args': {
            'youtube': {
                'player_client': ['ios'],
                'skip': ['dash', 'hls']
            }
        },
        'http_headers': {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-us',
        }
    }
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(f"https://www.youtube.com/watch?v={video_id}", download=False)
            return {"url": info['url'], "title": info['title']}
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/radio")
def get_radio(video_id: str):
    try:
        # Get watch playlist (radio) based on the song videoId
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