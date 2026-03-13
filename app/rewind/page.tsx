"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../utils/supabase";
import { useRouter } from "next/navigation";
import { Play, SkipBack, SkipForward, ChevronRight, HomeIcon, Zap, Disc3, Trophy, Clock } from "lucide-react";

export default function Rewind() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [slide, setSlide] = useState(0);
  const [hasData, setHasData] = useState(false);

  const [stats, setStats] = useState({
    totalMinutes: 0,
    topArtist: "",
    topSongs: [] as any[],
  });

  useEffect(() => {
    const fetchAndAnalyzeData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push('/login');
        return;
      }

      // Fetch all history for this user
      const { data, error } = await supabase
        .from('play_history')
        .select('*')
        .eq('user_id', session.user.id);

      if (error || !data || data.length === 0) {
        setLoading(false);
        return;
      }

      setHasData(true);

      // ALGORITHM 1: Total Time
      const totalSecs = data.reduce((acc, curr) => acc + (curr.duration_seconds || 0), 0);
      const minutes = Math.floor(totalSecs / 60);

      // ALGORITHM 2: Top Artist
      const artistCounts: Record<string, number> = {};
      data.forEach(row => {
        artistCounts[row.artist] = (artistCounts[row.artist] || 0) + 1;
      });
      const topA = Object.entries(artistCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown';

      // ALGORITHM 3: Top Tracks
      const songCounts: Record<string, any> = {};
      data.forEach(row => {
        if (!songCounts[row.video_id]) {
          songCounts[row.video_id] = { ...row, count: 0 };
        }
        songCounts[row.video_id].count++;
      });
      const topS = Object.values(songCounts).sort((a: any, b: any) => b.count - a.count).slice(0, 5);

      setStats({
        totalMinutes: minutes,
        topArtist: topA,
        topSongs: topS,
      });

      setLoading(false);
    };

    fetchAndAnalyzeData();
  }, [router]);

  if (loading) {
    return (
      <div className="h-screen w-full bg-[#050505] flex flex-col items-center justify-center text-[#00E5FF]">
        <div className="w-16 h-16 border-4 border-[#00E5FF] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="font-extrabold tracking-widest uppercase animate-pulse">Compiling Neural Data...</p>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="h-screen w-full bg-[#050505] flex flex-col items-center justify-center text-white">
        <Disc3 size={64} className="text-gray-600 mb-6" />
        <h1 className="text-3xl font-bold mb-4">Insufficient Data</h1>
        <p className="text-gray-400 max-w-md text-center mb-8">The engine requires more playback history to generate an accurate Rewind profile. Continue listening to tracks on the main terminal.</p>
        <button onClick={() => router.push('/')} className="bg-[#00E5FF] text-black px-8 py-3 rounded-full font-bold uppercase tracking-widest hover:scale-105 transition">Return to Engine</button>
      </div>
    );
  }

  const slides = [
    // Slide 0: Intro
    <div key="0" className="flex flex-col items-center justify-center h-full text-center px-4 animate-in fade-in zoom-in duration-700">
      <Zap size={60} className="text-[#D4AF37] mb-6 drop-shadow-[0_0_20px_rgba(212,175,55,0.8)]" />
      <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-4 tracking-tighter uppercase">R Industries<br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00E5FF] to-[#D4AF37]">Rewind</span></h1>
      <p className="text-xl text-gray-300 font-medium tracking-wide max-w-lg">Your proprietary acoustic analysis is ready.</p>
    </div>,

    // Slide 1: Total Time
    <div key="1" className="flex flex-col items-center justify-center h-full text-center px-4 animate-in slide-in-from-bottom-10 fade-in duration-700">
      <Clock size={48} className="text-[#00E5FF] mb-6" />
      <p className="text-2xl text-gray-300 font-semibold mb-2 uppercase tracking-widest">Time In The Matrix</p>
      <h2 className="text-8xl md:text-[150px] font-extrabold text-white drop-shadow-[0_0_30px_rgba(0,229,255,0.4)]">
        {stats.totalMinutes}
      </h2>
      <p className="text-2xl text-[#00E5FF] font-bold tracking-widest uppercase mt-2">Minutes Logged</p>
    </div>,

    // Slide 2: Top Artist
    <div key="2" className="flex flex-col items-center justify-center h-full text-center px-4 animate-in slide-in-from-bottom-10 fade-in duration-700">
      <Trophy size={48} className="text-[#D4AF37] mb-6" />
      <p className="text-2xl text-gray-300 font-semibold mb-6 uppercase tracking-widest">Your Top Agent</p>
      <h2 className="text-6xl md:text-8xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] to-[#FFF8DC] drop-shadow-[0_0_20px_rgba(212,175,55,0.3)] px-4 leading-tight">
        {stats.topArtist}
      </h2>
      <p className="text-lg text-gray-400 font-medium mt-8">They dominated your comms network.</p>
    </div>,

    // Slide 3: Top Tracks
    <div key="3" className="flex flex-col items-center justify-center h-full w-full max-w-2xl mx-auto px-4 animate-in slide-in-from-bottom-10 fade-in duration-700">
      <p className="text-2xl text-[#00E5FF] font-bold mb-8 uppercase tracking-widest border-b border-[#00E5FF]/30 pb-4 w-full text-center">Top 5 Extractions</p>
      <div className="w-full space-y-4">
        {stats.topSongs.map((song, index) => (
          <div key={index} className="flex items-center gap-6 bg-gray-900/50 p-4 rounded-2xl border border-gray-800 hover:border-[#D4AF37]/50 transition-colors">
            <h3 className="text-3xl font-extrabold text-gray-600 w-8 text-right">#{index + 1}</h3>
            <img src={song.cover_url} alt="cover" className="w-16 h-16 rounded-xl object-cover shadow-lg" />
            <div className="text-left flex-1 overflow-hidden">
              <p className="text-white font-bold text-xl truncate">{song.title}</p>
              <p className="text-gray-400 text-sm truncate">{song.artist}</p>
            </div>
            <div className="text-right pl-4">
              <p className="text-[#D4AF37] font-bold text-lg">{song.count}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">Plays</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  ];

  const nextSlide = () => setSlide(s => Math.min(s + 1, slides.length - 1));
  const prevSlide = () => setSlide(s => Math.max(s - 1, 0));

  return (
    <div className="relative h-screen w-full bg-[#050505] overflow-hidden font-sans">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className={`absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#00E5FF]/10 blur-[150px] rounded-full transition-all duration-1000 ${slide % 2 === 0 ? 'opacity-100 scale-100' : 'opacity-30 scale-75'}`}></div>
        <div className={`absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-[#D4AF37]/10 blur-[150px] rounded-full transition-all duration-1000 ${slide % 2 !== 0 ? 'opacity-100 scale-100' : 'opacity-30 scale-75'}`}></div>
      </div>

      {/* Main Slide Content */}
      <div className="relative z-10 h-full w-full flex items-center justify-center">
        {slides[slide]}
      </div>

      {/* Navigation HUD */}
      <div className="absolute bottom-8 md:bottom-12 left-0 w-full px-4 md:px-12 z-[100] flex items-center justify-between">
        {/* FIX 7: Huge touch target (p-4), pulled left visually (-ml-2), high z-index, collapses to "Exit" on mobile */}
        <button onClick={() => router.push('/')} className="flex items-center gap-2 text-gray-400 hover:text-white transition font-bold uppercase tracking-widest text-[10px] md:text-xs p-4 -ml-2 z-[110]">
          <HomeIcon size={18} /> 
          <span className="hidden md:inline">Exit Matrix</span>
          <span className="md:hidden">Exit</span>
        </button>

        <div className="flex items-center gap-2 md:gap-4 scale-90 md:scale-100 origin-right z-[110]">
          <button 
            onClick={prevSlide} 
            disabled={slide === 0}
            className="w-12 h-12 rounded-full bg-gray-900/80 border border-gray-700 flex items-center justify-center text-white disabled:opacity-30 hover:border-[#00E5FF] transition"
          >
            <SkipBack size={20} />
          </button>
          
          <div className="flex gap-2">
            {slides.map((_, i) => (
              <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === slide ? 'w-8 bg-[#00E5FF]' : 'w-2 bg-gray-700'}`} />
            ))}
          </div>

          <button 
            onClick={nextSlide} 
            disabled={slide === slides.length - 1}
            className="w-12 h-12 rounded-full bg-[#00E5FF] text-black flex items-center justify-center disabled:opacity-30 hover:scale-105 transition shadow-[0_0_15px_rgba(0,229,255,0.4)]"
          >
            {slide === slides.length - 1 ? <ChevronRight size={24} /> : <SkipForward size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
}