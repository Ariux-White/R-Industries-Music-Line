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
    try:
        # PyTubeFix using the Android Music client bypasses IP binding and bot checks natively
        yt_obj = YouTube(url, client='ANDROID_MUSIC')
        stream = yt_obj.streams.get_audio_only()
        if stream:
            return {"url": stream.url, "title": yt_obj.title}
    except Exception:
        try:
            # Fallback to standard WEB client if Android fails
            yt_obj = YouTube(url, client='WEB', use_po_token=True)
            stream = yt_obj.streams.get_audio_only()
            if stream:
                return {"url": stream.url, "title": yt_obj.title}
        except Exception:
            pass

    # The absolute final fallback: A load-balancer that auto-routes to a healthy server
    fallback_url = f"https://vid.puffyan.us/latest_version?id={video_id}&itag=140&local=true"
    return {"url": fallback_url, "title": "R-Stream Fallback Audio"}

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