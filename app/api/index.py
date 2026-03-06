from fastapi import FastAPI
from mangum import Mangum
from ytmusicapi import YTMusic
import yt_dlp

app = FastAPI()
handler = Mangum(app)
yt = YTMusic()

@app.get("/api/search")
def search_music(query: str):
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

@app.get("/api/stream")
def get_stream(video_id: str):
    ydl_opts = {
        'format': 'bestaudio/best',
        'quiet': True,
        'nocheckcertificate': True,
        'addheader': [('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36')],
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(f"https://www.youtube.com/watch?v={video_id}", download=False)
        return {"url": info['url'], "title": info['title']}