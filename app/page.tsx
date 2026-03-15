"use client";
import { useEffect, useState, useRef } from "react";
import { supabase } from "../utils/supabase";
import { useRouter } from "next/navigation";
import { 
 HomeIcon, Search, Library, Settings, LogOut, ShieldAlert, X, 
 Shuffle, Repeat, Repeat1, Play, Pause, SkipBack, SkipForward, Volume2, Clock, Users,
 MoreVertical, Heart, ListPlus, ListMusic, Ban, Plus, Mic2, UserPlus, Trash2, Activity, List, ChevronDown,
 History as HistoryIcon, MonitorSpeaker
} from "lucide-react";
import { invoke } from '@tauri-apps/api/core';

export default function Home() {
 const [user, setUser] = useState<any>(null);
 const [profile, setProfile] = useState<any>(null);
 const [loading, setLoading] = useState(true);
 const router = useRouter();
  
 const [activeTab, setActiveTab] = useState("home");
 const [showSettings, setShowSettings] = useState(false);
 const [activeMenu, setActiveMenu] = useState<string | null>(null);
 const [showLyrics, setShowLyrics] = useState(false);
 const [showQueue, setShowQueue] = useState(false);
 const [viewingPlaylist, setViewingPlaylist] = useState<string | null>(null);
 const [isMobilePlayerOpen, setIsMobilePlayerOpen] = useState(false);
  
 const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); 

 const [recommendations, setRecommendations] = useState<any[]>([]);
 const [searchQuery, setSearchQuery] = useState("");
 const [liveResults, setLiveResults] = useState<any[]>([]);
 const [recentSearches, setRecentSearches] = useState<string[]>([]);
  
 const [currentSong, setCurrentSong] = useState<any>(null);
 const [isPlaying, setIsPlaying] = useState(false);
 const [volume, setVolume] = useState(1);
 const [currentTime, setCurrentTime] = useState(0);
 const [duration, setDuration] = useState(0);
 const [isShuffle, setIsShuffle] = useState(false);
 const [repeatMode, setRepeatMode] = useState<0|1|2>(0); 
 const [playHistory, setPlayHistory] = useState<any[]>([]);
 const [fadeTime, setFadeTime] = useState(3); 
  
 const [lyrics, setLyrics] = useState<string | null>(null);
 const [parsedLyrics, setParsedLyrics] = useState<{time: number, text: string}[] | null>(null);
 const [isFetchingLyrics, setIsFetchingLyrics] = useState(false);
 const [nextAudioCache, setNextAudioCache] = useState<{id: string, url: string} | null>(null);
  
 const audioRef = useRef<HTMLAudioElement>(null);
 const phantomRef = useRef<HTMLAudioElement>(null); 
 const crossfadeFired = useRef(false);
 const hasLoggedCurrentSong = useRef(false);
 const isSkippingRef = useRef(false); 

 const [queue, setQueue] = useState<any[]>([]);
 const [contextQueue, setContextQueue] = useState<any[]>([]);
 const [likedSongs, setLikedSongs] = useState<any[]>([]);
 const [playlists, setPlaylists] = useState<Record<string, any[]>>({});
 const [newPlaylistName, setNewPlaylistName] = useState("");
 const [renamingPlaylist, setRenamingPlaylist] = useState<string | null>(null);
 const [newRenameValue, setNewRenameValue] = useState("");

 const [newPassword, setNewPassword] = useState("");
 const [passwordMsg, setPasswordMsg] = useState("");
 const [allUsers, setAllUsers] = useState<any[]>([]);
 const [newUserEmail, setNewUserEmail] = useState("");
 const [newUserPass, setNewUserPass] = useState("");
 const [newUserName, setNewUserName] = useState("");
 const [addUserMsg, setAddUserMsg] = useState("");

 const [showImportModal, setShowImportModal] = useState(false);
 const [importUrl, setImportUrl] = useState("");
 const [isImporting, setIsImporting] = useState(false);

 const [remoteSession, setRemoteSession] = useState<any>(null);
 const [deviceId] = useState(() => typeof window !== 'undefined' ? (window.innerWidth < 768 ? 'Mobile' : 'Desktop') : 'Device');
 const channelRef = useRef<any>(null);
 const lastBroadcastTime = useRef(0);

 const [blocklist, setBlocklist] = useState<string[]>([]);
 const cloudSettingsRef = useRef<any>({});
 const discordRpcFired = useRef<string | null>(null);

 const isAdmin = profile?.role?.toLowerCase()?.trim() === 'admin';
 const getApiUrl = () => 'https://ariuxwhite-r-stream-engine-pro.hf.space/api';

 const decodeHtml = (text: string) => {
    if (typeof document === 'undefined') return text;
    const txt = document.createElement("textarea");
    txt.innerHTML = text;
    return txt.value;
 };

 const syncSettings = (newSettings: any) => {
      if (!user?.id) return;
      cloudSettingsRef.current = { ...cloudSettingsRef.current, ...newSettings };
      supabase.from('user_library').update({ playback_settings: cloudSettingsRef.current }).eq('user_id', user.id).then();
 };

 useEffect(() => {
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        
        const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        setProfile(data);
        if (data?.role?.toLowerCase()?.trim() === 'admin') {
          const { data: usersData } = await supabase.from('profiles').select('*');
          if (usersData) setAllUsers(usersData);
        }

        const { data: blockData } = await supabase.from('user_blocklist').select('video_id').eq('user_id', session.user.id);
        const userBlocklist = blockData ? blockData.map(b => b.video_id) : [];
        setBlocklist(userBlocklist);

        let { data: libData } = await supabase.from('user_library').select('*').eq('user_id', session.user.id).single();
        if (!libData) {
            await supabase.from('user_library').insert([{ user_id: session.user.id }]);
            libData = { liked_songs: [], playlists: {}, recent_searches: [], playback_settings: {} };
        }

        setLikedSongs(libData.liked_songs || []);
        setPlaylists(libData.playlists || {});
        setRecentSearches(libData.recent_searches || []);
        
        const settings = libData.playback_settings || {};
        cloudSettingsRef.current = settings;
        
        if (settings.volume !== undefined) { setVolume(settings.volume); if (audioRef.current) audioRef.current.volume = settings.volume; }
        if (settings.fadeTime !== undefined) setFadeTime(settings.fadeTime);
        if (settings.isShuffle !== undefined) setIsShuffle(settings.isShuffle);
        if (settings.repeatMode !== undefined) setRepeatMode(settings.repeatMode);
        if (settings.contextQueue) setContextQueue(settings.contextQueue);
        if (settings.queue) setQueue(settings.queue);
        if (settings.quickPicks) setRecommendations(settings.quickPicks);
        if (settings.currentSong) {
            setCurrentSong(settings.currentSong);
            if (audioRef.current) audioRef.current.src = settings.currentSong.streamUrl;
        }

        const { data: historyData } = await supabase.from('play_history').select('*').eq('user_id', session.user.id).order('played_at', { ascending: false }).limit(40);
        if (historyData) {
            const formattedHistory = historyData.map(h => ({
                videoId: h.video_id,
                title: decodeHtml(h.title),
                artists: [h.artist],
                thumbnail: h.cover_url
            }));
            const uniqueHistory = formattedHistory.filter((v,i,a)=>a.findIndex(t=>(t.videoId === v.videoId))===i);
            setPlayHistory(uniqueHistory);

            if (uniqueHistory.length > 0 && (!settings.quickPicks || settings.quickPicks.length === 0)) {
                 fetch(`${getApiUrl()}/radio?video_id=${uniqueHistory[0].videoId}&blocked_ids=${userBlocklist.join(',')}`)
                 .then(r=>r.json()).then(data => {
                     if (!data.error && Array.isArray(data)) {
                         const uniquePicks = data.filter((v:any,i:number,a:any[])=>a.findIndex((t:any)=>(t.videoId === v.videoId))===i).slice(0, 20);
                         setRecommendations(uniquePicks);
                         syncSettings({ quickPicks: uniquePicks });
                     }
                 }).catch(console.error);
            }
        }

        const channel = supabase.channel(`sync_${session.user.id}`);
        channel.on('broadcast', { event: 'sync' }, ({ payload }) => {
          if (payload.deviceId !== deviceId) {
             setRemoteSession(payload);
          }
        });
        channel.on('broadcast', { event: 'takeover' }, ({ payload }) => {
          if (payload.targetDeviceId === deviceId) {
             if (audioRef.current) audioRef.current.pause();
             setIsPlaying(false);
          }
        });
        channel.subscribe();
        channelRef.current = channel;

      } else {
        router.push('/login');
      }
      setLoading(false);
    };
    fetchSession();

    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); }
 }, [router, deviceId]);

 // THE MOBILE BACKGROUND FIX: Prevents mobile browsers from killing the audio thread when locked
 useEffect(() => {
    const preventSleep = () => {
      if (isPlaying && audioRef.current) {
        if ('mediaSession' in navigator) {
          navigator.mediaSession.playbackState = 'playing';
          navigator.mediaSession.setActionHandler('play', () => audioRef.current?.play());
          navigator.mediaSession.setActionHandler('pause', () => audioRef.current?.pause());
        }
      }
    };
    const interval = setInterval(preventSleep, 1000);
    return () => clearInterval(interval);
 }, [isPlaying]);

 useEffect(() => {
    if (channelRef.current && currentSong) {
       channelRef.current.send({
          type: 'broadcast',
          event: 'sync',
          payload: { deviceId, song: currentSong, isPlaying, currentTime, duration }
       });
    }
 }, [isPlaying]);

 useEffect(() => {
    if (searchQuery.length < 2) { setLiveResults([]); return; }
    const delay = setTimeout(async () => {
      try {
        const res = await fetch(`${getApiUrl()}/search?query=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        setLiveResults(data.map((s: any) => ({...s, title: decodeHtml(s.title)})));
      } catch (e) { console.error(e); }
    }, 400);
    return () => delay && clearTimeout(delay);
 }, [searchQuery]);

 useEffect(() => {
    if (currentSong && showLyrics) {
      setIsFetchingLyrics(true);
      setLyrics(null);
      setParsedLyrics(null);
      const cleanTitle = currentSong.title.replace(/(\(.*?\)|\[.*?\]|-.*|official video|lyric video|audio)/gi, '').trim();
      const cleanArtist = currentSong.artists[0].split(/[,&]/)[0].trim();
      
      fetch(`https://lrclib.net/api/search?track_name=${encodeURIComponent(cleanTitle)}&artist_name=${encodeURIComponent(cleanArtist)}`)
        .then(r => r.json())
        .then(data => {
          if (data && data.length > 0) {
            if (data[0].syncedLyrics) {
              const lines = data[0].syncedLyrics.split('\n');
              const parsed = lines.map((line: string) => {
                  const match = line.match(/\[(\d+):(\d+\.\d+)\](.*)/);
                  if (match) {
                      return { time: parseInt(match[1]) * 60 + parseFloat(match[2]), text: match[3].trim() };
                  }
                  return null;
              }).filter(Boolean);
              setParsedLyrics(parsed as any);
            } else if (data[0].plainLyrics) {
              setLyrics(data[0].plainLyrics);
            } else {
              setLyrics("Lyrics not currently available in the global database for this track.");
            }
          } else {
            setLyrics("Lyrics not currently available in the global database for this track.");
          }
          setIsFetchingLyrics(false);
        })
        .catch(() => {
          setLyrics("Lyrics extraction failed. The neural link could not connect.");
          setIsFetchingLyrics(false);
        });
    }
 }, [currentSong, showLyrics]);

 const handleNavClick = (tab: string) => {
    setActiveTab(tab);
    setShowSettings(false);
    setViewingPlaylist(null);
    setShowLyrics(false);
    setIsMobilePlayerOpen(false);
    setShowQueue(false);
    setIsMobileMenuOpen(false);
 };

 const getHighRes = (url: string) => {
    if (!url || url.trim() === "") return '/r-logo.jpg';
    return url.replace(/w\d+-h\d+/g, 'w1080-h1080');
 };

 const prefetchNext = (currentList: any[], currentVideoId: string) => {
    let nextIndex = isShuffle ? Math.floor(Math.random() * currentList.length) : currentList.findIndex(s => s.videoId === currentVideoId) + 1;
    if (nextIndex >= currentList.length) nextIndex = 0;
    const nextSong = currentList[nextIndex];
    if (nextSong) {
      fetch(`${getApiUrl()}/stream?video_id=${nextSong.videoId}`)
        .then(res => res.json())
        .then(data => setNextAudioCache({ id: nextSong.videoId, url: data.url }))
        .catch(console.error);
    }
 };

 const changeVolume = (newVol: number) => {
    if (newVol > 1) newVol = 1;
    if (newVol < 0) newVol = 0;
    setVolume(newVol);
    syncSettings({ volume: newVol });
    if (audioRef.current) audioRef.current.volume = newVol;
 };

 const handleBlockSong = async (song: any) => {
    if (!user) return;
    
    setBlocklist(prev => [...prev, song.videoId]);
    
    setQueue(prev => {
        const nQ = prev.filter(s => s.videoId !== song.videoId);
        syncSettings({ queue: nQ });
        return nQ;
    });
    setContextQueue(prev => {
        const nCQ = prev.filter(s => s.videoId !== song.videoId);
        syncSettings({ contextQueue: nCQ });
        return nCQ;
    });
    
    await supabase.from('user_blocklist').insert([{ user_id: user.id, video_id: song.videoId }]);
 };

 const playSong = async (song: any, addToHistory = true, sourceList: any[] | null = null) => {
    crossfadeFired.current = true; 
    hasLoggedCurrentSong.current = false; 
    
    if (remoteSession?.isPlaying) {
        channelRef.current?.send({ type: 'broadcast', event: 'takeover', payload: { targetDeviceId: remoteSession.deviceId } });
        setRemoteSession(null);
    }

    const cleanSong = { ...song, title: decodeHtml(song.title) };
    setCurrentSong({ ...cleanSong, isLoading: true });

    let initialQueue = sourceList ? sourceList.map(s => ({...s, title: decodeHtml(s.title)})) : [cleanSong];
    setContextQueue(initialQueue);
    syncSettings({ contextQueue: initialQueue });

    if (addToHistory && song) {
      setPlayHistory(prev => {
        const updated = [cleanSong, ...prev].filter((v,i,a)=>a.findIndex(t=>(t.videoId === v.videoId))===i).slice(0, 30);
        return updated;
      });
    }
    syncSettings({ currentSong: cleanSong });

    if (!sourceList) {
       fetch(`${getApiUrl()}/radio?video_id=${song.videoId}&blocked_ids=${blocklist.join(',')}`)
       .then(r=>r.json()).then(data => { 
           if (!data.error && Array.isArray(data)) {
               const decodedRadio = data.map((d: any) => ({...d, title: decodeHtml(d.title)}));
               const combinedQueue = [cleanSong, ...decodedRadio.filter((d:any) => d.videoId !== song.videoId)];
               setContextQueue(combinedQueue);
               syncSettings({ contextQueue: combinedQueue });
           }
       }).catch(console.error);
    }

    if (nextAudioCache && nextAudioCache.id === song.videoId) {
        setCurrentSong({ ...cleanSong, streamUrl: nextAudioCache.url, isLoading: false, highResThumb: getHighRes(song.thumbnail) });
        syncSettings({ currentSong: { ...cleanSong, streamUrl: nextAudioCache.url } });
        
        if (audioRef.current) {
            audioRef.current.src = nextAudioCache.url;
            audioRef.current.volume = volume;
            const playPromise = audioRef.current.play();
            if (playPromise !== undefined) { playPromise.catch(e => console.warn("Background play blocked:", e)); }
            setIsPlaying(true);
        }
        prefetchNext(initialQueue, song.videoId);
        return; 
    }

    try {
      const res = await fetch(`${getApiUrl()}/stream?video_id=${song.videoId}`);
      const data = await res.json();
      const finalUrl = data.url;

      setCurrentSong({ ...cleanSong, streamUrl: finalUrl, isLoading: false, highResThumb: getHighRes(song.thumbnail) });
      syncSettings({ currentSong: { ...cleanSong, streamUrl: finalUrl } });
      
      if (audioRef.current) {
        audioRef.current.src = finalUrl;
        audioRef.current.volume = volume; 
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) { playPromise.catch(e => console.warn("Playback safely interrupted:", e)); }
        setIsPlaying(true);
      }
      prefetchNext(initialQueue, song.videoId);

    } catch (error) {
      console.error(error);
      setCurrentSong(null);
    }
 };

 const handleTakeover = () => {
      if (!remoteSession) return;
      channelRef.current?.send({ type: 'broadcast', event: 'takeover', payload: { targetDeviceId: remoteSession.deviceId } });
      const songToPlay = remoteSession.song;
      const timeToSeek = remoteSession.currentTime;
      setRemoteSession(null);
      
      playSong(songToPlay, false, null).then(() => {
          setTimeout(() => {
              if (audioRef.current) {
                  audioRef.current.currentTime = timeToSeek;
                  setCurrentTime(timeToSeek);
              }
          }, 300); 
      });
 };

 const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        if (!audioRef.current.src || audioRef.current.src.endsWith("undefined") || audioRef.current.readyState === 0) {
            if (currentSong) playSong(currentSong, false, contextQueue);
        } else {
            const playPromise = audioRef.current.play();
            if (playPromise !== undefined) {
                playPromise.then(() => setIsPlaying(true)).catch(e => {
                    if (currentSong) playSong(currentSong, false, contextQueue);
                });
            } else {
                setIsPlaying(true);
            }
        }
      }
    }
 };

 const handleNext = async () => {
    if (isSkippingRef.current) return;
    isSkippingRef.current = true;
    
    const unlock = () => {
      setTimeout(() => {
        isSkippingRef.current = false;
      }, 1000);
    };

    if (repeatMode === 2 && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
      unlock();
      return;
    }
    
    if (queue.length > 0) {
      const nextSong = queue[0];
      const newQ = queue.slice(1);
      setQueue(newQ);
      syncSettings({ queue: newQ });
      playSong(nextSong, true, contextQueue); 
      unlock();
      return;
    }
    
    if (!currentSong || contextQueue.length === 0) {
      setIsPlaying(false);
      unlock();
      return;
    }
    
    let nextIndex = isShuffle ? Math.floor(Math.random() * contextQueue.length) : contextQueue.findIndex((s:any) => s.videoId === currentSong.videoId) + 1;
    
    if (nextIndex >= contextQueue.length || nextIndex === 0) {
      try {
          const r = await fetch(`${getApiUrl()}/radio?video_id=${currentSong.videoId}&blocked_ids=${blocklist.join(',')}`);
          const data = await r.json();
          if (!data.error && Array.isArray(data) && data.length > 0) {
              const decodedRadio = data.map((d: any) => ({...d, title: decodeHtml(d.title)}));
              const newRadioSongs = decodedRadio.filter((d:any) => !contextQueue.find((c:any) => c.videoId === d.videoId));
              const newQueue = [...contextQueue, ...newRadioSongs];
              
              setContextQueue(newQueue);
              syncSettings({ contextQueue: newQueue });
              
              const nextFromRadio = newQueue[contextQueue.length];
              if (nextFromRadio) {
                  playSong(nextFromRadio, true, newQueue);
                  unlock();
                  return;
              }
          }
      } catch (e) {}
      
      if (repeatMode === 0) {
        setIsPlaying(false);
        unlock();
        return;
      }
      nextIndex = 0;
    }
    
    playSong(contextQueue[nextIndex], true, contextQueue);
    unlock();
 };

 const handleBack = () => {
    if (!audioRef.current) return;
    if (audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
    } else if (playHistory.length > 1) {
      const newHistory = [...playHistory];
      newHistory.shift(); 
      const prevSong = newHistory[0];
      setPlayHistory(newHistory);
      if (prevSong) playSong(prevSong, false, contextQueue);
    }
 };

 useEffect(() => {
    if ('mediaSession' in navigator && currentSong) {
      const artistString = currentSong.artists.join(", ");
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentSong.title,
        artist: `${artistString} | R Industries Music Line`, 
        album: "R Industries Music Line", 
        artwork: [{ src: currentSong.highResThumb || getHighRes(currentSong.thumbnail), sizes: '512x512', type: 'image/jpeg' }]
      });
    }
 }, [currentSong?.videoId]); 

 useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
      navigator.mediaSession.setActionHandler('play', togglePlayPause);
      navigator.mediaSession.setActionHandler('pause', togglePlayPause);
      navigator.mediaSession.setActionHandler('nexttrack', handleNext);
      navigator.mediaSession.setActionHandler('previoustrack', handleBack);
    }
 }, [isPlaying, handleNext, handleBack]);

 const handleTimeUpdate = (e: any) => {
    const ct = e.currentTarget.currentTime;
    const dur = e.currentTarget.duration;
    setCurrentTime(ct);
    setDuration(dur);

    if (!dur || isNaN(dur)) return;

    if (isPlaying && dur > 0) {
        if (discordRpcFired.current !== currentSong?.videoId) {
            discordRpcFired.current = currentSong?.videoId;
            try {
                if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
                    const nowSec = Math.floor(Date.now() / 1000);
                    const startSec = nowSec - Math.floor(ct);
                    invoke('update_discord_status', { 
                        song: currentSong.title, 
                        artist: currentSong.artists.join(", "),
                        thumbnail: getHighRes(currentSong.thumbnail),
                        start: startSec
                    });
                }
            } catch (err) {}
        }
    } else if (!isPlaying) {
        invoke('clear_discord_status');
        discordRpcFired.current = null; 
    }

    if (isPlaying && (ct - lastBroadcastTime.current > 1 || ct < lastBroadcastTime.current)) {
        lastBroadcastTime.current = ct;
        if (channelRef.current && currentSong) {
            channelRef.current.send({
                type: 'broadcast',
                event: 'sync',
                payload: { deviceId, song: currentSong, isPlaying: true, currentTime: ct, duration: dur }
            });
        }
    }

    if (ct > 15 && !hasLoggedCurrentSong.current && currentSong && user) {
        hasLoggedCurrentSong.current = true;
        supabase.from('play_history').insert([{
            user_id: user.id,
            video_id: currentSong.videoId,
            title: currentSong.title,
            artist: currentSong.artists.join(", "),
            cover_url: getHighRes(currentSong.thumbnail),
            duration_seconds: Math.floor(dur || 0)
        }]).then(({error}) => { if (error) console.error("Rewind log error:", error) });
    }

    const timeRemaining = dur - ct;

    if (crossfadeFired.current && timeRemaining > fadeTime + 1) {
        crossfadeFired.current = false;
    }
    
    if (deviceId === 'Desktop') {
        if (fadeTime > 0 && timeRemaining <= fadeTime && timeRemaining > 0.5 && dur > 0) {
            if (!crossfadeFired.current) {
                crossfadeFired.current = true;
                if (audioRef.current) {
                    const phantom = new Audio(audioRef.current.src);
                    phantom.currentTime = ct;
                    phantom.volume = volume;
                    phantom.play().catch(()=>{});
                    
                    const steps = 20;
                    const intervalTime = (fadeTime * 1000) / steps;
                    const volStep = volume / steps;
                    
                    const fadeInt = setInterval(() => {
                        if (phantom.volume - volStep > 0) {
                            phantom.volume -= volStep;
                        } else {
                            phantom.volume = 0;
                            phantom.pause();
                            phantom.remove();
                            clearInterval(fadeInt);
                        }
                    }, intervalTime);
                }
                handleNext();
            }
        } 
        else if (ct <= fadeTime && ct > 0 && fadeTime > 0) {
            if (audioRef.current) audioRef.current.volume = Math.min(volume, volume * (ct / fadeTime));
        } 
        else {
            if (audioRef.current) audioRef.current.volume = volume;
        }
    } else {
        if (audioRef.current) audioRef.current.volume = volume;
    }
 };

 const formatTime = (t: number) => {
    if (!t || isNaN(t)) return "0:00";
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
 };

 const handleLike = (song: any) => {
    const exists = likedSongs.find(s => s.videoId === song.videoId);
    const updated = exists ? likedSongs.filter(s => s.videoId !== song.videoId) : [...likedSongs, song];
    setLikedSongs(updated);
    if (user) supabase.from('user_library').update({ liked_songs: updated }).eq('user_id', user.id).then();
 };

 const handleAddToPlaylist = (song: any, pName: string) => {
    const list = playlists[pName] || [];
    if (!list.find((s: any) => s.videoId === song.videoId)) {
      const updated = { ...playlists, [pName]: [...list, song] };
      setPlaylists(updated);
      if (user) supabase.from('user_library').update({ playlists: updated }).eq('user_id', user.id).then();
    }
 };

 const deletePlaylist = (pName: string) => {
    if (!confirm(`Are you sure you want to delete "${pName}"? This action is permanent.`)) return;
    const { [pName]: removed, ...rest } = playlists;
    setPlaylists(rest);
    if (user) supabase.from('user_library').update({ playlists: rest }).eq('user_id', user.id).then();
    setViewingPlaylist(null);
 };

 const removeSongFromPlaylist = (videoId: string, pName: string) => {
    const updatedList = playlists[pName].filter((s: any) => s.videoId !== videoId);
    const updatedPlaylists = { ...playlists, [pName]: updatedList };
    setPlaylists(updatedPlaylists);
    if (user) supabase.from('user_library').update({ playlists: updatedPlaylists }).eq('user_id', user.id).then();
 };

 const handleRenamePlaylist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRenameValue || newRenameValue === viewingPlaylist || !viewingPlaylist) return;
    const updated = { ...playlists };
    updated[newRenameValue] = updated[viewingPlaylist];
    delete updated[viewingPlaylist];
    setPlaylists(updated);
    if (user) supabase.from('user_library').update({ playlists: updated }).eq('user_id', user.id).then();
    setViewingPlaylist(newRenameValue);
    setRenamingPlaylist(null);
 };

 const createPlaylist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName) return;
    const updated = { ...playlists, [newPlaylistName]: [] };
    setPlaylists(updated);
    if (user) supabase.from('user_library').update({ playlists: updated }).eq('user_id', user.id).then();
    setNewPlaylistName("");
 };

 const handleImportPlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importUrl) return;
    setIsImporting(true);
    try {
        let listId = importUrl;
        try {
            const urlObj = new URL(importUrl);
            listId = urlObj.searchParams.get("list") || importUrl;
        } catch(e) {} 
        
        const res = await fetch(`${getApiUrl()}/playlist?playlist_id=${listId}`);
        const data = await res.json();
        if (data.error) {
            alert("Import failed: " + data.error);
        } else if (data.tracks && data.tracks.length > 0) {
            let pName = data.title || "Imported Playlist";
            if (playlists[pName]) pName = pName + " (Imported)";
            
            const updated = { ...playlists, [pName]: data.tracks };
            setPlaylists(updated);
            if (user) supabase.from('user_library').update({ playlists: updated }).eq('user_id', user.id).then();
            setShowImportModal(false);
            setImportUrl("");
            setViewingPlaylist(pName);
        } else {
            alert("No tracks found or invalid YouTube/YT Music Playlist URL.");
        }
    } catch (err) {
        alert("Failed to connect to the import engine.");
    }
    setIsImporting(false);
 };

 const toggleUserRole = async (targetId: string, currentRole: string) => {
    const newRole = currentRole?.toLowerCase() === 'admin' ? 'user' : 'admin';
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', targetId);
    if (!error) {
      const { data } = await supabase.from('profiles').select('*');
      if (data) setAllUsers(data);
    }
 };

 const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddUserMsg("Initializing new neural link...");
    const { data, error } = await supabase.auth.signUp({
      email: newUserEmail,
      password: newUserPass,
    });
    if (error) {
       setAddUserMsg(`Error: ${error.message}`);
    } else {
       if (data.user) {
          await supabase.from('profiles').update({ name: newUserName, role: 'user' }).eq('id', data.user.id);
       }
       setAddUserMsg("Personnel successfully added.");
       setNewUserEmail(""); setNewUserPass(""); setNewUserName("");
       const { data: usersData } = await supabase.from('profiles').select('*');
       if (usersData) setAllUsers(usersData);
    }
 };

 if (loading || !user) return null;

 const isRemoteActive = !isPlaying && remoteSession?.isPlaying && remoteSession?.deviceId !== deviceId;
 const displaySong = isRemoteActive ? remoteSession.song : currentSong;
 const displayTime = isRemoteActive ? remoteSession.currentTime : currentTime;
 const displayDuration = isRemoteActive ? remoteSession.duration : duration;

 const displayListenAgain = playHistory.slice(0, 10);
 const activeIdx = currentSong ? contextQueue.findIndex((s:any) => s.videoId === currentSong?.videoId) : -1;
 const autoQueue = activeIdx !== -1 && activeIdx < contextQueue.length - 1 ? contextQueue.slice(activeIdx + 1, activeIdx + 21) : [];

 const renderSongCard = (song: any, currentList: any[] | null) => (
    <div key={song.videoId} className={`bg-gray-900/40 hover:bg-gray-800/80 p-4 rounded-2xl transition group border border-gray-800/50 hover:border-gray-600 backdrop-blur-sm relative ${activeMenu === song.videoId ? 'z-[50]' : ''}`}>
      <div className="relative mb-4 aspect-square cursor-pointer" onClick={() => playSong(song, true, currentList)}>
        <img src={getHighRes(song.thumbnail)} alt="cover" className="w-full h-full object-cover rounded-xl shadow-lg" />
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-xl transition">
          <Play size={24} fill="currentColor" className="text-[#00E5FF]"/>
        </div>
      </div>
      <div className="flex justify-between items-start">
        <div className="overflow-hidden cursor-pointer flex-1 pr-2" onClick={() => playSong(song, true, currentList)}>
          <p className="text-white font-bold truncate text-sm hover:underline">{decodeHtml(song.title)}</p>
          <p className="text-gray-400 text-xs truncate mt-1">{song.artists.join(", ")}</p>
        </div>
        <button 
          onClick={(e) => { 
            e.stopPropagation(); 
            setActiveMenu(activeMenu === song.videoId ? null : song.videoId); 
          }} 
          className="text-gray-400 hover:text-white p-1 z-20 relative"
        >
          <MoreVertical size={16} />
        </button>
      </div>

      {activeMenu === song.videoId && (
        <div 
          className="absolute top-10 right-4 mt-2 w-48 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-[55] py-2" 
          onClick={e => e.stopPropagation()}
        >
          <button onClick={(e) => { 
              e.preventDefault(); e.stopPropagation();
              const nQ = [...queue, song];
              setQueue(nQ); 
              syncSettings({ queue: nQ });
              setActiveMenu(null);
          }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-800 flex items-center gap-2 text-white">
              <ListPlus size={16}/> Add to Queue
          </button>
          
          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleLike(song); setActiveMenu(null); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-800 flex items-center gap-2 text-white">
             <Heart size={16} fill={likedSongs.some(s=>s.videoId===song.videoId) ? "#00E5FF" : "none"} className={likedSongs.some(s=>s.videoId===song.videoId) ? "text-[#00E5FF]" : ""}/> 
             {likedSongs.some(s=>s.videoId===song.videoId) ? "Unlike" : "Like Song"}
          </button>
          
          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleBlockSong(song); setActiveMenu(null); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-800 flex items-center gap-2 text-white hover:text-red-400">
             <Ban size={16} className="text-red-500"/> Don't Recommend
          </button>
          
          {viewingPlaylist && viewingPlaylist !== 'Liked Songs' && (
            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeSongFromPlaylist(song.videoId, viewingPlaylist); setActiveMenu(null); }} className="w-full text-left px-4 py-2 text-sm hover:bg-red-900/40 flex items-center gap-2 text-red-400"><Trash2 size={16}/> Remove from Playlist</button>
          )}

          <div className="border-t border-gray-800 my-1"></div>
          <p className="px-4 py-1 text-[10px] text-gray-500 font-bold uppercase tracking-wider">Add to Playlist</p>
          {Object.keys(playlists).map(p => (
            <button key={p} onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleAddToPlaylist(song, p); setActiveMenu(null); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-800 flex items-center gap-2 text-gray-300"><ListMusic size={14}/> {p}</button>
          ))}
          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleNavClick("library"); setActiveMenu(null); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-800 flex items-center gap-2 text-[#00E5FF]"><Plus size={14}/> Create New...</button>
        </div>
      )}
    </div>
 );

 return (
    <div className="flex flex-col h-screen text-white relative overflow-hidden bg-[#050505]">
      
      <div className="absolute inset-0 z-0 pointer-events-none">
        <img src="/r-logo.jpg" alt="bg" className="w-full h-full object-cover opacity-25" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-[#050505]/90"></div>
      </div>

      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[110] bg-[#050505] flex flex-col p-6 animate-in slide-in-from-right duration-300 shadow-2xl">
            <div className="flex justify-between items-center mb-8 border-b border-gray-800 pb-4 mt-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#00E5FF] to-[#D4AF37] flex items-center justify-center font-bold text-black text-xl shadow-inner">
                        {profile?.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div>
                        <h2 className="text-white font-bold text-xl">{profile?.name || 'User'}</h2>
                        <p className="text-gray-400 text-xs font-mono">ID: {profile?.id?.slice(0,8)}</p>
                    </div>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="text-gray-400 hover:text-white p-2"><X size={28} /></button>
            </div>
            
            <div className="flex flex-col space-y-2">
                <button onClick={() => { setIsMobileMenuOpen(false); router.push('/rewind'); }} className="flex items-center space-x-4 w-full text-left p-4 rounded-2xl font-bold text-[#00E5FF] bg-gray-900/50 hover:bg-gray-800 transition tracking-widest uppercase text-sm shadow-md">
                    <Activity size={24} /> <span>Rewind</span>
                </button>

                <button onClick={() => { setIsMobileMenuOpen(false); setShowSettings(true); }} className="flex items-center space-x-4 w-full text-left p-4 rounded-2xl font-semibold text-gray-200 bg-gray-900/50 hover:bg-gray-800 transition">
                    <Settings size={24} /> <span>Settings</span>
                </button>
                
                {isAdmin && (
                    <button onClick={() => { setIsMobileMenuOpen(false); handleNavClick("admin"); }} className="flex items-center space-x-4 w-full text-left p-4 rounded-2xl font-bold text-[#D4AF37] bg-[#D4AF37]/10 border border-[#D4AF37]/30 transition mt-4">
                        <ShieldAlert size={24} /> <span>Admin Console</span>
                    </button>
                )}
            </div>

            <div className="mt-auto pt-8 border-t border-gray-800">
                <button onClick={async () => { await supabase.auth.signOut(); router.push("/login"); }} className="flex items-center space-x-4 w-full text-left p-4 rounded-2xl font-bold text-red-500 bg-red-500/10 border border-red-500/30 transition">
                    <LogOut size={24} /> <span>Disconnect Device</span>
                </button>
            </div>
        </div>
      )}
      
      <div className="flex flex-1 overflow-hidden pb-32 md:pb-24 z-10 relative">
        
        <div className="w-64 bg-black/40 backdrop-blur-2xl border-r border-gray-800/50 flex flex-col p-6 hidden md:flex shadow-2xl">
          <div className="mb-8 pl-2 flex items-center gap-3">
            <img 
              src="/r-logo-main.png" 
              alt="Logo" 
              className="w-10 h-10 object-contain" 
              onError={(e) => e.currentTarget.style.display = 'none'} 
            />
            <div>
              <h1 className="text-xl font-extrabold tracking-widest text-[#D4AF37] leading-tight uppercase">Music Line</h1>
              <p className="text-[#00E5FF] text-[10px] uppercase tracking-widest font-bold">R Industries</p>
            </div>
          </div>

          <nav className="space-y-2 flex-1">
            {["home", "search", "library", "history"].map((tab) => (
              <button key={tab} onClick={() => handleNavClick(tab)} className={`flex items-center space-x-4 w-full text-left p-3 rounded-xl transition-all font-semibold capitalize ${activeTab === tab && !showSettings && !viewingPlaylist ? 'text-white bg-gray-800/80 shadow-inner border border-gray-700' : 'text-gray-400 hover:text-white hover:bg-gray-900/50'}`}>
                {tab === "home" ? <HomeIcon size={20} /> : tab === "search" ? <Search size={20} /> : tab === "history" ? <HistoryIcon size={20}/> : <Library size={20} />} <span>{tab.replace('library', 'Your Library')}</span>
              </button>
            ))}
          </nav>

          <div className="border-t border-gray-800/80 pt-4 space-y-2">
            <button onClick={() => router.push('/rewind')} className="flex items-center space-x-4 transition w-full text-left p-3 rounded-xl font-bold text-[#00E5FF] hover:bg-[#00E5FF]/10 border border-transparent hover:border-[#00E5FF]/30 tracking-widest uppercase text-xs shadow-[0_0_10px_rgba(0,229,255,0.1)]">
              <Activity size={20} /> <span>Rewind</span>
            </button>

            <button onClick={() => { handleNavClick(activeTab); setShowSettings(true); }} className={`flex items-center space-x-4 transition w-full text-left p-3 rounded-xl font-semibold ${showSettings ? 'text-white bg-gray-800/80 border border-gray-700' : 'text-gray-400 hover:text-white hover:bg-gray-900/50'}`}>
              <Settings size={20} /> <span>Settings</span>
            </button>
            
            {isAdmin && (
              <button onClick={() => handleNavClick("admin")} className={`flex items-center space-x-4 transition w-full text-left p-3 rounded-xl font-bold ${activeTab === "admin" && !showSettings ? 'bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/50' : 'text-[#D4AF37] hover:bg-[#D4AF37]/10'}`}>
                <ShieldAlert size={20} /> <span>Admin Console</span>
              </button>
            )}

            <button onClick={async () => { await supabase.auth.signOut(); router.push("/login"); }} className="flex items-center space-x-4 text-red-500 hover:bg-red-500/10 hover:text-red-400 rounded-xl transition w-full text-left p-3 font-semibold">
              <LogOut size={20} /> <span>Disconnect</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 relative scroll-smooth">
          {activeMenu && (
            <div className="fixed inset-0 z-[40] cursor-default" onClick={() => setActiveMenu(null)} />
          )}
          
          <div 
            onClick={() => { if (window.innerWidth < 768) setIsMobileMenuOpen(true); }}
            className="absolute top-4 md:top-8 right-4 md:right-8 flex items-center space-x-3 bg-black/80 border border-gray-700/80 rounded-full pl-2 pr-4 py-1.5 backdrop-blur-xl z-30 shadow-2xl md:cursor-default cursor-pointer md:hover:scale-100 hover:scale-105 transition"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00E5FF] to-[#D4AF37] flex items-center justify-center font-bold text-black shadow-inner">
              {profile?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <span className="text-sm font-semibold text-gray-200 tracking-wide hidden md:block">{profile?.name || 'User'}</span>
            {isAdmin && <span className="text-[10px] bg-[#D4AF37] text-black px-2.5 py-0.5 rounded-full font-extrabold ml-2 shadow-[0_0_10px_rgba(212,175,55,0.4)] hidden md:inline-block">ADMIN</span>}
          </div>

          {showSettings ? (
            <div className="max-w-xl w-full bg-gray-900/80 border border-gray-700 p-6 md:p-8 rounded-3xl backdrop-blur-2xl mt-16 relative shadow-2xl">
              <button onClick={() => setShowSettings(false)} className="absolute top-6 right-6 text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 p-2 rounded-full transition"><X size={20} /></button>
              <h2 className="text-2xl md:text-3xl font-bold mb-8 text-white flex items-center gap-3 border-b border-gray-800 pb-4"><Settings size={28} className="text-[#00E5FF]"/> Settings & Prefs</h2>
              
              <div className="mb-8">
                <h3 className="text-sm text-gray-400 font-bold uppercase tracking-widest mb-4">Playback Engine</h3>
                <div className="flex flex-col md:flex-row md:items-center justify-between bg-black/50 p-4 rounded-xl border border-gray-800 gap-4">
                  <div>
                    <p className="font-bold">Audio Crossfade</p>
                    <p className="text-xs text-gray-500">Smoothly blend songs together.</p>
                  </div>
                  <div className="flex items-center gap-3 w-full md:w-40">
                    <span className="text-xs font-bold text-[#00E5FF]">{fadeTime}s</span>
                    <input 
                      type="range" 
                      min="0" max="12" 
                      value={fadeTime} 
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setFadeTime(val);
                        syncSettings({ fadeTime: val });
                      }} 
                      className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 md:[&::-webkit-slider-thumb]:w-3 md:[&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-[#00E5FF] [&::-webkit-slider-thumb]:rounded-full transition-all" 
                    />
                  </div>
                </div>
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault();
                const { error } = await supabase.auth.updateUser({ password: newPassword });
                if (error) setPasswordMsg("Error: " + error.message);
                else { setPasswordMsg("Security Key Updated Successfully."); setNewPassword(""); }
              }} className="space-y-4">
                <h3 className="text-sm text-gray-400 font-bold uppercase tracking-widest mb-2 border-t border-gray-800 pt-6">Security Override</h3>
                <div>
                  <input type="password" placeholder="Enter New Key..." value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} className="w-full p-4 bg-black border border-gray-700 rounded-xl focus:border-[#D4AF37] text-white outline-none shadow-inner" />
                </div>
                <button type="submit" className="w-full py-4 bg-gradient-to-r from-[#D4AF37] to-[#e8c655] text-black font-extrabold rounded-xl hover:scale-[1.02] transition shadow-[0_0_15px_rgba(212,175,55,0.3)] tracking-widest uppercase">Update Password</button>
                {passwordMsg && <p className="text-center text-sm font-semibold text-[#00E5FF] mt-4 bg-[#00E5FF]/10 py-2 rounded-lg border border-[#00E5FF]/30">{passwordMsg}</p>}
              </form>
            </div>
          ) : (
            <div className="mt-12 md:mt-16">
              
              {activeTab === "admin" && isAdmin && (
                <div className="max-w-5xl">
                  <h2 className="text-3xl md:text-4xl font-extrabold mb-8 text-[#D4AF37] drop-shadow-lg">Authorization Matrix</h2>
                  
                  <div className="bg-black/60 border border-gray-700 p-4 md:p-8 rounded-3xl backdrop-blur-2xl shadow-2xl mb-8 overflow-x-auto">
                    <div className="flex items-center gap-3 mb-6 text-gray-400 border-b border-gray-800 pb-4">
                      <Users size={20} /> <span className="font-bold uppercase tracking-widest text-sm">Registered Personnel</span>
                    </div>
                    <div className="space-y-4 min-w-[500px]">
                      {allUsers.map((u) => (
                        <div key={u.id} className="flex items-center justify-between bg-gray-900/50 p-5 rounded-2xl border border-gray-800 transition shadow-lg">
                          <div>
                            <p className="font-bold text-white text-lg">{u.name || 'Unnamed Agent'}</p>
                            <p className="text-xs text-gray-500 font-mono mt-1">ID: {u.id}</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className={`text-xs px-4 py-1.5 rounded-full font-bold tracking-widest uppercase ${u.role?.toLowerCase() === 'admin' ? 'bg-[#D4AF37] text-black shadow-[0_0_10px_rgba(212,175,55,0.4)]' : 'bg-gray-800 text-gray-300'}`}>
                              {u.role || 'user'}
                            </span>
                            {profile?.id !== u.id && (
                              <button onClick={() => toggleUserRole(u.id, u.role)} className="text-xs font-semibold border border-gray-600 hover:border-[#00E5FF] hover:text-[#00E5FF] px-4 py-2 rounded-lg transition">
                                {u.role?.toLowerCase() === 'admin' ? 'Revoke Admin' : 'Make Admin'}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-black/60 border border-gray-700 p-4 md:p-8 rounded-3xl backdrop-blur-2xl shadow-2xl">
                    <div className="flex items-center gap-3 mb-6 text-gray-400 border-b border-gray-800 pb-4">
                      <UserPlus size={20} /> <span className="font-bold uppercase tracking-widest text-sm">Recruit New Personnel</span>
                    </div>
                    <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input type="email" placeholder="Email Address" value={newUserEmail} onChange={(e)=>setNewUserEmail(e.target.value)} required className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-white focus:border-[#00E5FF] outline-none" />
                      <input type="password" placeholder="Temporary Security Key" value={newUserPass} onChange={(e)=>setNewUserPass(e.target.value)} required minLength={6} className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-white focus:border-[#00E5FF] outline-none" />
                      <input type="text" placeholder="Agent Name" value={newUserName} onChange={(e)=>setNewUserName(e.target.value)} required className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-white focus:border-[#00E5FF] outline-none" />
                      <button type="submit" className="bg-[#D4AF37] text-black font-extrabold tracking-widest uppercase rounded-xl p-4 hover:scale-[1.02] transition shadow-[0_0_15px_rgba(212,175,55,0.3)]">Authorize Access</button>
                    </form>
                    {addUserMsg && <p className="mt-4 text-sm font-semibold text-[#00E5FF]">{addUserMsg}</p>}
                  </div>
                </div>
              )}

              {/* MAIN HEADER */}
              {activeTab === "home" && !viewingPlaylist && (
                <div>
                  <h2 className="text-4xl md:text-5xl font-extrabold mb-8 md:mb-10 pb-2 md:pb-4 pt-2 leading-[1.4] text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-gray-500 drop-shadow-sm">R Industries Music Line</h2>
                  
                  {displayListenAgain.length === 0 && recommendations.length === 0 && (
                    <div className="flex flex-col items-center justify-center mt-16 md:mt-24 opacity-40 text-center px-4">
                      <div className="w-20 h-20 bg-gray-900 rounded-full flex items-center justify-center mb-6 shadow-inner border border-gray-800">
                        <Play size={32} className="text-[#00E5FF] ml-2" />
                      </div>
                      <h3 className="text-xl md:text-2xl font-extrabold uppercase tracking-widest text-white mb-2">Engine Idle</h3>
                      <p className="text-sm md:text-base text-gray-400 font-medium">Search and play a track to initialize your custom feed.</p>
                    </div>
                  )}

                  {displayListenAgain.length > 0 && (
                    <div className="mb-10 md:mb-14">
                      <h3 className="text-xl md:text-2xl font-bold mb-6 text-white tracking-wide flex items-center gap-2">Listen again</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                        {displayListenAgain.map((song:any) => renderSongCard(song, null))}
                      </div>
                    </div>
                  )}

                  {recommendations.length > 0 && (
                    <div className="mb-10 md:mb-14">
                      <h3 className="text-xl md:text-2xl font-bold mb-6 text-[#00E5FF] tracking-wide flex items-center gap-2">Quick picks</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                        {recommendations.slice(0, 10).map(song => renderSongCard(song, null))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* HISTORY TAB */}
              {activeTab === "history" && !viewingPlaylist && (
                <div className="max-w-6xl">
                  <h2 className="text-4xl md:text-5xl font-extrabold mb-8 md:mb-10 tracking-wide flex items-center gap-4">
                     <HistoryIcon size={40} className="text-[#00E5FF] drop-shadow-[0_0_10px_rgba(0,229,255,0.4)]" /> 
                     Your History
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                     {playHistory.length === 0 ? (
                       <p className="col-span-full text-gray-500 italic text-sm md:text-base">No recorded network activity found.</p>
                     ) : (
                       playHistory.map(song => renderSongCard(song, null))
                     )}
                  </div>
                </div>
              )}

              {/* SEARCH TAB */}
              {activeTab === "search" && (
                <div className="max-w-4xl relative">
                  <div className="relative mb-8 group">
                    <input 
                      type="text" 
                      value={searchQuery} 
                      onChange={(e) => setSearchQuery(e.target.value)} 
                      onKeyDown={(e) => { 
                        if (e.key === 'Enter' && searchQuery.trim()) { 
                          const term = searchQuery.trim();
                          const filtered = recentSearches.filter(t => t.toLowerCase() !== term.toLowerCase());
                          const u = [term, ...filtered].slice(0, 10);
                          setRecentSearches(u); 
                          if (user) supabase.from('user_library').update({ recent_searches: u }).eq('user_id', user.id).then();
                        } 
                      }} 
                      placeholder="What do you want to play?" 
                      autoFocus 
                      className="w-full bg-gray-900/80 border border-gray-700 rounded-full py-4 md:py-5 px-6 pl-14 md:pl-16 focus:outline-none focus:border-[#00E5FF] focus:bg-gray-900 transition-all text-white shadow-2xl text-lg md:text-xl placeholder-gray-500 backdrop-blur-md" 
                    />
                    <Search className="absolute left-5 md:left-6 top-4 md:top-5 text-gray-400 group-focus-within:text-[#00E5FF] transition-colors" size={24} />
                  </div>

                  {liveResults.length > 0 && searchQuery.length > 1 ? (
                    /* THE FIX: Added relative z-[100] isolate to keep search results on top layer */
                    <div className="bg-black/80 border border-gray-700 rounded-3xl backdrop-blur-2xl p-4 md:p-6 shadow-2xl relative z-[100] isolate">
                      <h3 className="text-lg md:text-xl font-bold mb-6 text-[#00E5FF] ml-2">Live Results</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {liveResults.map((song) => (
                          /* THE FIX: Each search card boosts to z-[110] when active */
                          <div key={song.videoId} className={`flex items-center gap-4 p-2 md:p-3 rounded-2xl hover:bg-gray-800/80 transition group border border-transparent hover:border-gray-700 relative ${activeMenu === song.videoId ? 'z-[110] bg-gray-800' : 'z-10'}`}>
                            <div className="relative w-14 h-14 md:w-16 md:h-16 shrink-0 cursor-pointer" onClick={() => playSong(song, true, null)}>
                               <img src={getHighRes(song.thumbnail)} alt="cover" className="w-full h-full rounded-xl object-cover shadow-lg" />
                               <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-xl transition">
                                 <Play size={20} className="text-[#00E5FF]" fill="currentColor" />
                               </div>
                            </div>
                            <div className="flex-1 overflow-hidden cursor-pointer" onClick={() => playSong(song, true, null)}>
                              <p className="text-white font-bold truncate text-base md:text-lg group-hover:text-[#00E5FF] transition-colors">{decodeHtml(song.title)}</p>
                              <p className="text-gray-400 text-xs md:text-sm truncate mt-0.5">{song.artists.join(", ")}</p>
                            </div>
                            
                            <button 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                setActiveMenu(activeMenu === song.videoId ? null : song.videoId); 
                              }} 
                              className="text-gray-400 hover:text-white p-2 z-20 relative"
                            >
                              <MoreVertical size={20} />
                            </button>

                            {activeMenu === song.videoId && (
                              <div 
                                className="absolute top-14 right-4 mt-2 w-48 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-[120] py-2" 
                                onClick={e => e.stopPropagation()}
                              >
                                <button onClick={(e) => { 
                                    e.preventDefault(); e.stopPropagation();
                                    const nQ = [...queue, song];
                                    setQueue(nQ); 
                                    syncSettings({ queue: nQ });
                                    setActiveMenu(null);
                                }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-800 flex items-center gap-2 text-white">
                                    <ListPlus size={16}/> Add to Queue
                                </button>
                                
                                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleLike(song); setActiveMenu(null); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-800 flex items-center gap-2 text-white">
                                    <Heart size={16} fill={likedSongs.some(s=>s.videoId===song.videoId) ? "#00E5FF" : "none"} className={likedSongs.some(s=>s.videoId===song.videoId) ? "text-[#00E5FF]" : ""}/> 
                                    {likedSongs.some(s=>s.videoId===song.videoId) ? "Unlike" : "Like Song"}
                                </button>
                                
                                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleBlockSong(song); setActiveMenu(null); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-800 flex items-center gap-2 text-white hover:text-red-400">
                                   <Ban size={16} className="text-red-500"/> Don't Recommend
                                </button>

                                <div className="border-t border-gray-800 my-1"></div>
                                <p className="px-4 py-1 text-[10px] text-gray-500 font-bold uppercase tracking-wider">Add to Playlist</p>
                                {Object.keys(playlists).map(p => (
                                  <button key={p} onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleAddToPlaylist(song, p); setActiveMenu(null); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-800 flex items-center gap-2 text-gray-300"><ListMusic size={14}/> {p}</button>
                                ))}
                                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleNavClick("library"); setActiveMenu(null); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-800 flex items-center gap-2 text-[#00E5FF]"><Plus size={14}/> Create New...</button>
                              </div>
                            )}

                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    recentSearches.length > 0 && !searchQuery && (
                      <div className="mb-10 mt-8 bg-black/40 p-4 md:p-6 rounded-3xl border border-gray-800/50 backdrop-blur-md">
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="text-lg md:text-xl font-bold tracking-wide">Recent Extractions</h3>
                          <button onClick={() => { setRecentSearches([]); if (user) supabase.from('user_library').update({ recent_searches: [] }).eq('user_id', user.id).then(); }} className="text-[10px] md:text-xs font-bold text-gray-400 hover:text-red-400 uppercase tracking-widest transition px-3 py-1 border border-gray-700 rounded-full hover:border-red-400">Clear All</button>
                        </div>
                        <div className="flex flex-wrap gap-2 md:gap-3">
                          {recentSearches.map((term, i) => (
                            <div key={i} onClick={() => setSearchQuery(term)} className="flex items-center gap-2 bg-gray-800/80 hover:bg-gray-700 px-4 py-2 md:px-5 md:py-2.5 rounded-full cursor-pointer transition border border-gray-700 hover:border-gray-500 shadow-lg">
                              <Clock size={14} className="text-[#00E5FF]" />
                              <span className="text-xs md:text-sm font-semibold text-white tracking-wide">{term}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}

              {activeTab === "library" && !viewingPlaylist && (
                <div className="max-w-6xl">
                   <h2 className="text-4xl md:text-5xl font-extrabold mb-8 md:mb-10 tracking-wide">Your Library</h2>
                   
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mb-10 md:mb-12">
                     <div onClick={() => setViewingPlaylist('Liked Songs')} className="col-span-1 bg-gradient-to-br from-[#00E5FF]/20 to-blue-900/40 p-6 md:p-8 rounded-3xl border border-[#00E5FF]/30 backdrop-blur-xl flex flex-col justify-end min-h-[160px] md:min-h-[200px] shadow-2xl hover:scale-[1.02] transition cursor-pointer">
                        <Heart size={32} className="text-white mb-3 md:mb-4 drop-shadow-lg" fill="currentColor"/>
                        <h3 className="text-2xl md:text-3xl font-bold text-white mb-1 md:mb-2">Liked Songs</h3>
                        <p className="text-[#00E5FF] text-sm md:text-base font-semibold">{likedSongs.length} verified tracks</p>
                     </div>

                     <div className="col-span-1 md:col-span-2 bg-gray-900/60 p-6 md:p-8 rounded-3xl border border-gray-700 backdrop-blur-xl shadow-xl flex flex-col justify-center">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg md:text-2xl font-bold flex items-center gap-2"><ListPlus size={20} className="text-[#D4AF37]"/> Initialize New Playlist</h3>
                            <button onClick={() => setShowImportModal(true)} className="text-[9px] md:text-[10px] font-bold text-[#00E5FF] border border-[#00E5FF]/30 px-2 md:px-3 py-1.5 rounded-lg hover:bg-[#00E5FF]/10 transition uppercase tracking-widest">Import Playlist</button>
                        </div>
                        <form onSubmit={createPlaylist} className="flex flex-col sm:flex-row gap-3 md:gap-4">
                           <input type="text" value={newPlaylistName} onChange={(e)=>setNewPlaylistName(e.target.value)} placeholder="E.g., Workout Mix..." className="flex-1 bg-black border border-gray-600 rounded-xl px-4 py-3 md:px-6 md:py-4 focus:outline-none focus:border-[#D4AF37] text-white text-base md:text-lg"/>
                           <button type="submit" className="py-3 px-6 md:px-8 bg-[#D4AF37] text-black font-extrabold rounded-xl hover:bg-[#e8c655] transition tracking-widest uppercase shadow-[0_0_15px_rgba(212,175,55,0.3)]">Create</button>
                        </form>
                     </div>
                   </div>

                   <h3 className="text-xl md:text-2xl font-bold mb-6 tracking-wide">User Playlists</h3>
                   {Object.keys(playlists).length === 0 ? (
                      <div className="text-gray-500 border border-dashed border-gray-700 p-6 md:p-8 rounded-2xl text-center max-w-2xl bg-black/40 text-sm md:text-base">No custom playlists generated yet.</div>
                   ) : (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                        {Object.entries(playlists).map(([name, songs]) => (
                          <div key={name} onClick={() => setViewingPlaylist(name)} className="bg-gray-900/80 p-4 md:p-6 rounded-3xl border border-gray-700 hover:border-gray-500 transition cursor-pointer group shadow-lg">
                            <div className="w-full aspect-square bg-black/50 rounded-xl mb-3 md:mb-4 flex items-center justify-center border border-gray-800 shadow-inner group-hover:bg-black/30 transition">
                               {songs.length > 0 ? <img src={getHighRes(songs[0].thumbnail)} className="w-full h-full object-cover rounded-xl opacity-80 group-hover:opacity-100 transition"/> : <ListMusic size={32} className="text-gray-600"/>}
                            </div>
                            <h4 className="text-lg md:text-xl font-bold text-white truncate">{name}</h4>
                            <p className="text-gray-400 text-xs md:text-sm mt-1">{songs.length} tracks</p>
                          </div>
                        ))}
                      </div>
                   )}
                </div>
              )}

              {viewingPlaylist && (
                <div className="max-w-6xl">
                  <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-8 gap-4">
                    <div className="flex flex-col gap-2 w-full">
                      <button onClick={() => setViewingPlaylist(null)} className="text-gray-400 hover:text-[#00E5FF] flex items-center gap-2 font-bold tracking-widest uppercase text-xs transition w-max">
                         <SkipBack size={16}/> Back to Library
                      </button>
                      {renamingPlaylist === viewingPlaylist ? (
                          <form onSubmit={handleRenamePlaylist} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center mt-2 w-full max-w-2xl">
                              <input type="text" value={newRenameValue} onChange={e => setNewRenameValue(e.target.value)} className="bg-black border border-[#D4AF37] rounded-xl px-4 py-2 focus:outline-none text-white text-2xl md:text-4xl font-extrabold w-full sm:flex-1" autoFocus />
                              <div className="flex gap-2">
                                <button type="submit" className="bg-[#D4AF37] text-black px-4 py-2 rounded-xl font-bold uppercase text-xs hover:bg-[#e8c655] transition">Save</button>
                                <button type="button" onClick={() => setRenamingPlaylist(null)} className="bg-gray-800 text-white px-4 py-2 rounded-xl font-bold uppercase text-xs hover:bg-gray-700 transition">Cancel</button>
                              </div>
                          </form>
                      ) : (
                          <h2 className="text-3xl md:text-5xl font-extrabold text-white flex items-center gap-3 md:gap-4 truncate">
                             {viewingPlaylist === 'Liked Songs' ? <Heart className="text-[#00E5FF] shrink-0" fill="currentColor" size={32}/> : <ListMusic className="text-[#D4AF37] shrink-0" size={32}/>}
                             {viewingPlaylist}
                          </h2>
                      )}
                    </div>
                    {viewingPlaylist !== 'Liked Songs' && renamingPlaylist !== viewingPlaylist && (
                      <div className="flex gap-3 mt-2 md:mt-6">
                        <button 
                          onClick={() => { setRenamingPlaylist(viewingPlaylist); setNewRenameValue(viewingPlaylist); }}
                          className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 md:px-6 md:py-3 rounded-xl border border-gray-600 transition font-bold uppercase tracking-widest text-[10px] md:text-xs whitespace-nowrap"
                        >
                          Edit Name
                        </button>
                        <button 
                          onClick={() => deletePlaylist(viewingPlaylist)}
                          className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 px-4 py-2 md:px-6 md:py-3 rounded-xl border border-red-500/30 transition font-bold uppercase tracking-widest text-[10px] md:text-xs whitespace-nowrap"
                        >
                          <Trash2 size={16}/> Delete
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                     {(viewingPlaylist === 'Liked Songs' ? likedSongs : playlists[viewingPlaylist]).length === 0 ? (
                       <p className="col-span-full text-gray-500 italic text-sm md:text-base">No tracks saved in this directory.</p>
                     ) : (
                       (viewingPlaylist === 'Liked Songs' ? likedSongs : playlists[viewingPlaylist]).map(song => renderSongCard(song, viewingPlaylist === 'Liked Songs' ? likedSongs : playlists[viewingPlaylist]))
                     )}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* IMPORT PLAYLIST MODAL OVERLAY */}
          {showImportModal && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                <div className="bg-gray-900 border border-gray-700 p-6 md:p-8 rounded-3xl w-full max-w-lg shadow-2xl relative">
                    <button onClick={() => {setShowImportModal(false); setImportUrl("");}} className="absolute top-4 right-4 md:top-6 md:right-6 text-gray-400 hover:text-white transition"><X size={24}/></button>
                    <h3 className="text-xl md:text-2xl font-bold mb-2 text-white flex items-center gap-2"><ListPlus className="text-[#00E5FF]"/> Import Data</h3>
                    
                    <p className="text-gray-400 text-xs md:text-sm mb-6">
                        Paste a YouTube or YouTube Music playlist link below.<br/><br/>
                        <span className="text-[#D4AF37] font-semibold tracking-wide">
                            To import from Spotify, please use a free converter like TuneMyMusic.com to generate a YouTube link first.
                        </span>
                    </p>

                    <form onSubmit={handleImportPlaylist} className="flex flex-col gap-4">
                        <input type="text" value={importUrl} onChange={(e)=>setImportUrl(e.target.value)} placeholder="e.g., https://music.youtube.com/playlist?list=..." className="w-full bg-black border border-gray-600 rounded-xl px-4 py-3 focus:outline-none focus:border-[#00E5FF] text-white text-sm md:text-base" required />
                        <button type="submit" disabled={isImporting} className="w-full bg-[#00E5FF] text-black font-extrabold rounded-xl py-3 md:py-4 hover:bg-cyan-400 transition tracking-widest uppercase disabled:opacity-50 shadow-[0_0_15px_rgba(0,229,255,0.3)] text-xs md:text-base">
                            {isImporting ? "Extracting Neural Data..." : "Initialize Import"}
                        </button>
                    </form>
                </div>
            </div>
          )}
        </div>
        
        {/* SYNced NEON LYRICS PANEL */}
        {showLyrics && (
           <div className="absolute right-0 top-0 w-full md:w-[450px] h-full bg-[#050505] border-l border-gray-800/80 z-[60] flex flex-col shadow-[-30px_0_50px_rgba(0,0,0,0.8)]">
               <div className="flex justify-between items-center border-b border-gray-800 p-6 md:p-8 bg-[#050505] shrink-0">
                   <h3 className="text-lg md:text-xl font-extrabold text-[#00E5FF] tracking-widest uppercase flex items-center gap-2"><Mic2 size={20}/> Live Lyrics</h3>
                   <button onClick={() => setShowLyrics(false)} className="text-gray-400 hover:text-white transition"><X size={24}/></button>
               </div>
               
               <div className="flex-1 overflow-y-auto p-6 md:p-8 scroll-smooth relative">
                   {currentSong ? (
                       <div className="text-left mt-2">
                           <p className="text-[#D4AF37] font-bold text-xl md:text-2xl drop-shadow-md">{currentSong.title}</p>
                           <p className="text-gray-400 text-xs md:text-sm mb-10 font-medium">{currentSong.artists?.join(", ")}</p>
                           
                           {isFetchingLyrics ? (
                              <div className="py-10 text-center">
                                <div className="w-8 h-8 md:w-10 md:h-10 border-4 border-[#00E5FF] border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
                                <p className="text-gray-200 text-base md:text-lg animate-pulse font-semibold">Syncing Global Engine...</p>
                              </div>
                           ) : parsedLyrics ? (
                              <div className="space-y-6 pb-32">
                                  {parsedLyrics.map((line, i) => {
                                      const isActive = currentTime >= line.time && (!parsedLyrics[i+1] || currentTime < parsedLyrics[i+1].time);
                                      return (
                                          <p 
                                            key={i} 
                                            ref={(el) => { if (isActive && el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }}
                                            className={`transition-all duration-500 ease-out ${isActive ? 'text-[#00E5FF] text-2xl md:text-3xl font-extrabold drop-shadow-[0_0_15px_rgba(0,229,255,0.8)] origin-left scale-[1.02]' : 'text-gray-500 text-lg md:text-xl font-medium'}`}
                                          >
                                              {line.text || "♪"}
                                          </p>
                                      )
                                  })}
                              </div>
                           ) : (
                              <div className="text-gray-200 text-base md:text-lg leading-loose font-medium text-left whitespace-pre-wrap bg-gray-900/50 p-4 md:p-6 rounded-2xl border border-gray-800">
                                 {lyrics}
                              </div>
                           )}
                       </div>
                   ) : (
                       <p className="text-gray-500 text-center mt-10 font-bold uppercase tracking-widest text-sm">Engine Idle.</p>
                   )}
               </div>
           </div>
        )}

        {/* QUEUE PANEL */}
        {showQueue && (
          <>
             <div className="fixed inset-0 z-[55] cursor-default" onClick={(e) => { e.stopPropagation(); setShowQueue(false); }} />
             <div className="absolute bottom-20 md:bottom-28 right-2 md:right-8 w-[calc(100%-16px)] md:w-96 max-h-[400px] md:max-h-[500px] bg-[#0a0a0a]/95 backdrop-blur-3xl border border-gray-800 rounded-2xl z-[60] p-4 md:p-6 overflow-y-auto shadow-[0_0_40px_rgba(0,0,0,0.9)]">
                <div className="flex justify-between items-center mb-4 border-b border-gray-800 pb-2">
                   <h3 className="text-base md:text-lg font-bold text-white flex items-center gap-2"><Activity size={18} className="text-[#00E5FF]"/> Up Next</h3>
                   <button onClick={() => setShowQueue(false)} className="md:hidden text-gray-400"><X size={20}/></button>
                </div>
                
                {queue.length > 0 && (
                   <div className="mb-4">
                     <p className="text-[10px] md:text-xs font-bold text-[#D4AF37] uppercase tracking-wider mb-2">User Queue</p>
                     <div className="space-y-2">
                        {queue.map((qSong, idx) => (
                           <div 
                             key={idx} 
                             onClick={() => {
                               setQueue(queue.slice(idx + 1));
                               playSong(qSong, true, contextQueue);
                             }}
                             className="flex justify-between items-center group bg-gray-900/40 p-2 rounded-lg hover:bg-gray-800 transition cursor-pointer"
                           >
                              <div className="overflow-hidden flex-1 pr-2 pointer-events-none">
                                 <p className="text-white text-xs md:text-sm font-bold truncate">{decodeHtml(qSong.title)}</p>
                                 <p className="text-gray-400 text-[10px] md:text-xs truncate">{qSong.artists.join(", ")}</p>
                              </div>
                              <button onClick={(e) => { 
                                  e.stopPropagation(); 
                                  const nQ = queue.filter((_, i) => i !== idx);
                                  setQueue(nQ); 
                                  syncSettings({ queue: nQ });
                              }} className="text-gray-400 hover:text-red-500 transition p-2 z-10 bg-gray-800/50 rounded-full md:bg-transparent opacity-100 md:opacity-0 md:group-hover:opacity-100"><Trash2 size={16}/></button>
                           </div>
                        ))}
                     </div>
                   </div>
                )}

                {autoQueue.length > 0 ? (
                   <div>
                     <p className="text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Auto-Play Selection</p>
                     <div className="space-y-2 opacity-80">
                        {autoQueue.map((aSong: any, idx: number) => (
                           <div 
                             key={idx} 
                             onClick={() => playSong(aSong, true, contextQueue)}
                             className="flex justify-between items-center bg-gray-900/20 hover:bg-gray-800/50 p-2 rounded-lg cursor-pointer transition"
                           >
                              <div className="overflow-hidden flex-1 pr-2 pointer-events-none">
                                 <p className="text-gray-300 text-xs md:text-sm font-semibold truncate">{decodeHtml(aSong.title)}</p>
                                 <p className="text-gray-500 text-[10px] md:text-xs truncate">{aSong.artists.join(", ")}</p>
                              </div>
                           </div>
                        ))}
                     </div>
                   </div>
                ) : (
                   queue.length === 0 && <p className="text-gray-500 text-xs md:text-sm text-center py-4">Engine Queue is empty.</p>
                )}
             </div>
          </>
        )}
      </div>

      {/* REMOTE SESSION TAKEOVER PILL */}
      {isRemoteActive && (
         <div className="fixed bottom-36 md:bottom-28 left-1/2 transform -translate-x-1/2 bg-[#00E5FF] text-black text-[10px] md:text-xs font-extrabold py-2 px-6 rounded-full z-[65] flex items-center gap-3 shadow-[0_0_20px_rgba(0,229,255,0.6)] animate-in fade-in slide-in-from-bottom-5 cursor-pointer hover:scale-105 transition" onClick={handleTakeover}>
            <MonitorSpeaker size={16} /> Listening on {remoteSession.deviceId}. Click to Play Here.
         </div>
      )}

      {/* FIXED MOBILE BOTTOM NAVIGATION BAR */}
      <div className="md:hidden fixed bottom-0 left-0 w-full h-16 bg-[#0a0a0a] border-t border-gray-900 flex items-center justify-around z-[70] pb-1">
        <button onClick={() => handleNavClick("home")} className={`flex flex-col items-center gap-1 ${activeTab === 'home' && !showSettings && !viewingPlaylist ? 'text-white' : 'text-gray-500'}`}>
            <HomeIcon size={22} />
            <span className="text-[9px] font-semibold">Home</span>
        </button>
        <button onClick={() => handleNavClick("search")} className={`flex flex-col items-center gap-1 ${activeTab === 'search' && !showSettings ? 'text-white' : 'text-gray-500'}`}>
            <Search size={22} />
            <span className="text-[9px] font-semibold">Search</span>
        </button>
        <button onClick={() => handleNavClick("library")} className={`flex flex-col items-center gap-1 ${(activeTab === 'library' || viewingPlaylist) && !showSettings ? 'text-white' : 'text-gray-500'}`}>
            <Library size={22} />
            <span className="text-[9px] font-semibold">Library</span>
        </button>
        <button onClick={() => handleNavClick("history")} className={`flex flex-col items-center gap-1 ${activeTab === 'history' && !showSettings && !viewingPlaylist ? 'text-white' : 'text-gray-500'}`}>
            <HistoryIcon size={22} />
            <span className="text-[9px] font-semibold">History</span>
        </button>
      </div>

      {/* RESPONSIVE BOTTOM PLAYER BAR */}
      <div className="fixed bottom-16 md:bottom-0 left-0 w-full h-16 md:h-24 bg-[#050505]/95 md:backdrop-blur-3xl border-t border-gray-800 flex items-center justify-between px-4 md:px-8 z-[60] shadow-[0_-10px_40px_rgba(0,0,0,0.8)]">
        
        <audio ref={phantomRef} className="hidden" />
        <audio 
          ref={audioRef} 
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleNext} 
        />

        {/* LEFT SECTION: Track Info */}
        <div 
          className="w-full md:w-1/3 flex items-center gap-3 md:gap-5 cursor-pointer md:cursor-default"
          onClick={() => { if (window.innerWidth < 768 && displaySong) setIsMobilePlayerOpen(true); }}
        >
          {displaySong ? (
            <>
              {displaySong.isLoading ? (
                <div className="w-10 h-10 md:w-16 md:h-16 bg-gray-900 rounded-lg md:rounded-xl flex items-center justify-center border border-[#00E5FF]/20 shadow-inner shrink-0">
                  <div className="w-4 h-4 md:w-6 md:h-6 border-2 border-[#00E5FF] border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <div className="relative group cursor-pointer w-10 h-10 md:w-16 md:h-16 shrink-0">
                  <img src={getHighRes(displaySong.thumbnail)} alt="cover" className="w-full h-full rounded-lg md:rounded-xl object-cover shadow-[0_0_20px_rgba(0,229,255,0.15)] group-hover:opacity-80 transition" />
                </div>
              )}
              <div className="overflow-hidden flex-1 md:flex-none">
                <p className="text-white font-bold truncate text-sm md:text-base hover:underline cursor-pointer tracking-wide">{decodeHtml(displaySong.title)}</p>
                <p className="text-gray-400 text-xs truncate hover:underline cursor-pointer md:mt-0.5">{displaySong.artists?.join(", ")}</p>
              </div>
              {!displaySong.isLoading && (
                 <button onClick={(e) => { e.stopPropagation(); handleLike(displaySong); }} className="ml-1 md:ml-2 hover:scale-110 transition hidden md:block">
                    <Heart size={18} fill={likedSongs.some(s=>s.videoId===displaySong.videoId) ? "#00E5FF" : "none"} className={likedSongs.some(s=>s.videoId===displaySong.videoId) ? "text-[#00E5FF]" : "text-gray-400 hover:text-white"}/>
                 </button>
              )}
            </>
          ) : (
             <div className="flex items-center gap-3 md:gap-5 opacity-40">
               <div className="w-10 h-10 md:w-16 md:h-16 bg-gray-900 rounded-lg md:rounded-xl border border-gray-800 shadow-inner"></div>
               <div><p className="text-gray-500 text-[10px] md:text-xs font-bold uppercase tracking-[0.2em]">Engine Idle</p></div>
             </div>
          )}
        </div>

        {/* MOBILE ONLY: Quick Controls */}
        <div className="md:hidden flex items-center pr-2">
            {isRemoteActive ? (
                <button onClick={(e) => { e.stopPropagation(); handleTakeover(); }} className="bg-[#00E5FF] text-black px-4 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest shadow-[0_0_10px_rgba(0,229,255,0.5)]">
                    Play Here
                </button>
            ) : (
                <button onClick={(e) => { e.stopPropagation(); togglePlayPause(); }} disabled={!displaySong || displaySong.isLoading} className="text-white p-2">
                  {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
                </button>
            )}
        </div>

        {/* CENTER SECTION: Controls (Desktop Only) */}
        <div className="hidden md:flex w-1/3 flex-col items-center justify-center gap-2">
          {isRemoteActive ? (
              <div className="flex flex-col items-center justify-center gap-1 w-full mt-2">
                  <p className="text-[10px] text-[#00E5FF] font-bold tracking-widest uppercase">Listening on {remoteSession.deviceId}</p>
                  <button onClick={handleTakeover} className="bg-[#00E5FF] text-black text-[10px] font-extrabold uppercase tracking-widest px-6 py-2 rounded-full hover:scale-105 transition shadow-[0_0_15px_rgba(0,229,255,0.4)]">
                      Play Here
                  </button>
                  <div className="w-full max-w-md flex items-center gap-3 text-[11px] text-gray-400 font-bold tracking-wider opacity-50 pointer-events-none mt-1">
                      <span className="w-10 text-right">{formatTime(displayTime)}</span>
                      <div className="relative flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                         <div className="absolute top-0 left-0 h-full bg-[#00E5FF] rounded-full" style={{ width: `${(displayTime/(displayDuration||1))*100}%` }}></div>
                      </div>
                      <span className="w-10 text-left">{formatTime(displayDuration)}</span>
                  </div>
              </div>
          ) : (
              <>
                  <div className="flex items-center gap-6">
                    <button 
                      onClick={() => { 
                        const val = !isShuffle; 
                        setIsShuffle(val); 
                        syncSettings({ isShuffle: val });
                      }} 
                      className={`${isShuffle ? 'text-[#00E5FF]' : 'text-gray-400 hover:text-white'} transition hover:scale-110`}
                    >
                      <Shuffle size={18} />
                    </button>
                    <button onClick={handleBack} className="text-gray-300 hover:text-white transition hover:scale-110"><SkipBack size={22} fill="currentColor" /></button>
                    <button onClick={togglePlayPause} disabled={!currentSong || currentSong.isLoading} className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100 shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                      {isPlaying ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" className="ml-1" />}
                    </button>
                    <button onClick={handleNext} disabled={!currentSong} className="text-gray-300 hover:text-white transition hover:scale-110 disabled:opacity-50"><SkipForward size={22} fill="currentColor" /></button>
                    <button 
                      onClick={() => { 
                        const val = (repeatMode === 2 ? 0 : repeatMode + 1) as 0|1|2; 
                        setRepeatMode(val); 
                        syncSettings({ repeatMode: val });
                      }} 
                      className={`${repeatMode > 0 ? 'text-[#00E5FF]' : 'text-gray-400 hover:text-white'} transition hover:scale-110 relative`}
                    >
                       {repeatMode === 2 ? <Repeat1 size={18} /> : <Repeat size={18} />}
                       {repeatMode > 0 && <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#00E5FF] rounded-full"></span>}
                    </button>
                  </div>
                  
                  <div className="w-full max-w-md flex items-center gap-3 text-[11px] text-gray-400 font-bold tracking-wider relative group">
                    <span className="w-10 text-right">{formatTime(currentTime)}</span>
                    <div className="relative flex-1 h-1.5 bg-gray-800 rounded-full cursor-pointer overflow-hidden">
                       <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#00E5FF] to-[#D4AF37] rounded-full shadow-[0_0_10px_#00E5FF] transition-all duration-200 ease-linear" style={{ width: `${(currentTime/(duration||1))*100}%` }}></div>
                       <input 
                         type="range" min={0} max={duration || 100} value={currentTime} 
                         onChange={(e) => {
                           const val = Number(e.target.value);
                           setCurrentTime(val);
                           if (audioRef.current) audioRef.current.currentTime = val;
                         }}
                         className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                       />
                    </div>
                    <span className="w-10 text-left">{formatTime(duration)}</span>
                  </div>
              </>
          )}
        </div>

        {/* RIGHT SECTION: Tools & Volume (Desktop Only) */}
        <div className="hidden md:flex w-1/3 items-center justify-end gap-5 pr-2 text-gray-400">
          <button onClick={() => setShowQueue(!showQueue)} className={`${showQueue ? 'text-[#00E5FF]' : 'hover:text-white'} transition hover:scale-110`} title="Queue"><List size={20} /></button>
          <button onClick={() => setShowLyrics(!showLyrics)} className={`${showLyrics ? 'text-[#00E5FF]' : 'hover:text-white'} transition hover:scale-110`} title="Lyrics"><Mic2 size={20} /></button>
          
          <div 
            className="relative w-10 h-10 group flex items-center justify-center cursor-ns-resize" 
            title="Volume (Scroll to adjust)"
            onWheel={(e) => {
              e.preventDefault();
              const delta = e.deltaY < 0 ? 0.05 : -0.05;
              changeVolume(volume + delta);
            }}
          >
             <svg className="w-10 h-10 transform -rotate-[135deg] pointer-events-none" viewBox="0 0 36 36">
               <circle cx="18" cy="18" r="14" fill="none" className="stroke-gray-800" strokeWidth="3" strokeLinecap="round" strokeDasharray="66 100" />
               <circle cx="18" cy="18" r="14" fill="none" className="stroke-[#00E5FF] transition-all duration-150 ease-out" strokeWidth="3" strokeLinecap="round" strokeDasharray={`${volume * 66} 100`} />
             </svg>
             <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
               <Volume2 size={14} className={`${volume > 0 ? 'text-[#00E5FF]' : 'text-gray-600'} transition-colors drop-shadow-[0_0_5px_rgba(0,229,255,0.5)]`} />
             </div>
             <input 
               type="range" min="0" max="1" step="0.01" value={volume} 
               onChange={(e) => changeVolume(parseFloat(e.target.value))} 
               className="absolute inset-0 w-full h-full opacity-0 cursor-ns-resize" 
             />
          </div>
        </div>

      </div>

      {/* FULL SCREEN MOBILE PLAYER OVERLAY */}
      {isMobilePlayerOpen && displaySong && (
        <div className="md:hidden fixed inset-0 z-[100] bg-gradient-to-b from-gray-900 to-[#050505] flex flex-col px-6 pt-12 pb-8 animate-in slide-in-from-bottom-full duration-300">
            {/* Top Bar */}
            <div className="flex justify-between items-center mb-8">
                <button onClick={() => setIsMobilePlayerOpen(false)} className="text-white p-2 -ml-2"><ChevronDown size={32} /></button>
                <div className="text-center">
                    <span className="text-[10px] font-bold tracking-widest text-gray-400 uppercase block">Playing from</span>
                    <span className="text-xs font-bold text-white uppercase tracking-wider">{activeTab}</span>
                </div>
                <button onClick={() => { setIsMobilePlayerOpen(false); setShowQueue(true); }} className="text-white p-2 -mr-2"><List size={24} /></button>
            </div>

            {/* Album Art */}
            <div className="flex-1 flex items-center justify-center mb-8">
                <img src={getHighRes(displaySong.thumbnail)} alt="cover" className="w-full max-w-[350px] aspect-square object-cover rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.6)]" />
            </div>

            {/* Track Info & Like Button */}
            <div className="flex justify-between items-center mb-6">
                <div className="overflow-hidden pr-4 flex-1">
                    <h2 className="text-2xl font-bold text-white truncate">{decodeHtml(displaySong.title)}</h2>
                    <p className="text-gray-400 text-lg truncate mt-1">{displaySong.artists?.join(", ")}</p>
                </div>
                <button onClick={() => handleLike(displaySong)} className="p-2 -mr-2">
                    <Heart size={28} fill={likedSongs.some(s=>s.videoId===displaySong.videoId) ? "#00E5FF" : "none"} className={likedSongs.some(s=>s.videoId===displaySong.videoId) ? "text-[#00E5FF]" : "text-gray-400"}/>
                </button>
            </div>

            {/* Progress Bar */}
            <div className="w-full mb-6">
                <div className={`relative w-full h-1.5 bg-gray-700 rounded-full cursor-pointer mb-2 ${isRemoteActive ? 'pointer-events-none opacity-50' : ''}`}>
                    <div className="absolute top-0 left-0 h-full bg-white rounded-full transition-all duration-200" style={{ width: `${(displayTime/(displayDuration||1))*100}%` }}></div>
                    <input type="range" min={0} max={displayDuration || 100} value={displayTime} onChange={(e) => { const val = Number(e.target.value); setCurrentTime(val); if (audioRef.current) audioRef.current.currentTime = val; }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"/>
                </div>
                <div className="flex justify-between text-xs text-gray-400 font-medium tracking-wide">
                    <span>{formatTime(displayTime)}</span>
                    <span>{formatTime(displayDuration)}</span>
                </div>
            </div>

            {/* Main Controls */}
            {isRemoteActive ? (
                <div className="flex flex-col items-center justify-center mb-8 gap-4 w-full">
                    <p className="text-[10px] text-[#00E5FF] font-bold tracking-widest uppercase text-center border border-[#00E5FF]/30 bg-[#00E5FF]/10 py-2 px-6 rounded-full w-full">
                        <MonitorSpeaker size={14} className="inline mr-2 -mt-0.5" />
                        Listening on {remoteSession.deviceId}
                    </p>
                    <button onClick={handleTakeover} className="bg-white text-black text-sm font-extrabold uppercase tracking-widest py-4 rounded-full hover:scale-105 transition w-full shadow-lg">
                        Play Here
                    </button>
                </div>
            ) : (
                <div className="flex justify-between items-center mb-8">
                    <button onClick={() => { const val = !isShuffle; setIsShuffle(val); syncSettings({ isShuffle: val }); }} className={isShuffle ? 'text-[#00E5FF]' : 'text-gray-400'}>
                        <Shuffle size={24} />
                    </button>
                    <button onClick={handleBack} className="text-white"><SkipBack size={40} fill="currentColor" /></button>
                    <button onClick={togglePlayPause} className="w-16 h-16 bg-white text-black rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform">
                        {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
                    </button>
                    <button onClick={handleNext} className="text-white"><SkipForward size={40} fill="currentColor" /></button>
                    <button onClick={() => { const val = (repeatMode === 2 ? 0 : repeatMode + 1) as 0|1|2; setRepeatMode(val); syncSettings({ repeatMode: val }); }} className={`relative ${repeatMode > 0 ? 'text-[#00E5FF]' : 'text-gray-400'}`}>
                        {repeatMode === 2 ? <Repeat1 size={24} /> : <Repeat size={24} />}
                        {repeatMode > 0 && <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#00E5FF] rounded-full"></span>}
                    </button>
                </div>
            )}
            
            {/* Standard Mobile Volume Slider & Lyrics Button */}
            <div className="flex items-center gap-4 justify-between">
                <div className={`flex items-center gap-3 flex-1 bg-gray-900/50 p-3 rounded-2xl border border-gray-800 ${isRemoteActive ? 'opacity-50 pointer-events-none' : ''}`}>
                    <Volume2 size={18} className="text-gray-400" />
                    <input type="range" min="0" max="1" step="0.01" value={volume} onChange={(e) => changeVolume(parseFloat(e.target.value))} className="w-full h-1 bg-gray-700 rounded-lg appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full cursor-pointer" />
                </div>
                <button onClick={() => { setIsMobilePlayerOpen(false); setShowLyrics(true); }} className="bg-[#00E5FF] text-black px-4 py-3 rounded-2xl font-bold uppercase tracking-widest text-[10px] flex items-center gap-2 shadow-[0_0_15px_rgba(0,229,255,0.3)] shrink-0">
                    <Mic2 size={16}/> Lyrics
                </button>
            </div>
        </div>
      )}

    </div>
 );
}