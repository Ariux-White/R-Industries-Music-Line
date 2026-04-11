export async function getSpotifyRecommendations(songTitle: string, artistName: string) {
  try {
    // We use the AudioDB / LastFM open API (No Premium Needed)
    const query = encodeURIComponent(`${artistName}`);
    const res = await fetch(`http://ws.audioscrobbler.com/2.0/?method=artist.gettoptracks&artist=${query}&api_key=7da97e0344d93d5a4988f4e649887718&format=json&limit=10`);
    
    const data = await res.json();
    if (!data.toptracks?.track) return null;

    // Get 5 random top tracks from that artist or similar artists
    return data.toptracks.track
      .sort(() => 0.5 - Math.random())
      .slice(0, 5)
      .map((t: any) => `${t.name} ${t.artist.name}`);

  } catch (error) {
    console.error("Discovery Engine Error:", error);
    return null;
  }
}