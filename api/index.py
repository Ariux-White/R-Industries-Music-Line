from fastapi import FastAPI
from ytmusicapi import YTMusic
from pytubefix import YouTube

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
    url = f"https://www.youtube.com/watch?v={video_id}"
    
    # Cycle through clients known to bypass YouTube's IP-binding (403 errors).
    # TV and IOS clients typically provide URLs that can be played on any IP address.
    clients = ['TV', 'IOS', 'MWEB', 'WEB']
    
    for client in clients:
        try:
            yt_obj = YouTube(url, client=client)
            stream = yt_obj.streams.get_audio_only()
            if stream and stream.url:
                return {"url": stream.url, "title": yt_obj.title}
        except Exception:
            continue
            
    return {"error": "All client extraction methods failed on the server."}

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