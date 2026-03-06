from fastapi import FastAPI
from ytmusicapi import YTMusic
import yt_dlp

# We define the app, but we don't use Mangum here for Vercel's latest runtime
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
    ydl_opts = {
        'format': 'bestaudio/best',
        'quiet': True,
        'nocheckcertificate': True,
        'addheader': [('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36')],
    }
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(f"https://www.youtube.com/watch?v={video_id}", download=False)
            return {"url": info['url'], "title": info['title']}
    except Exception as e:
        return {"error": str(e)}

# IMPORTANT: Vercel's Python runtime looks for 'app' at the module level
# We don't need 'handler = Mangum(app)' anymore.