"use client";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../../utils/supabase"; // Adjust this path if your supabase.ts is located elsewhere

export default function SpotifyCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");

  useEffect(() => {
    if (!code) return;
    
    const exchangeToken = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.push("/login");

      // Exchange the code for an Access Token
      const res = await fetch("/api/spotify/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, redirect_uri: "http://127.0.0.1:3000/auth/callback" })
      });
      
      const data = await res.json();
      if (data.access_token) {
        // Save the Spotify token safely into the user's playback_settings in Supabase
        const { data: libData } = await supabase.from('user_library').select('playback_settings').eq('user_id', session.user.id).single();
        const settings = libData?.playback_settings || {};
        
        settings.spotifyTokens = {
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expires_at: Date.now() + (data.expires_in * 1000)
        };
        
        await supabase.from('user_library').update({ playback_settings: settings }).eq('user_id', session.user.id);
        
        // Blast them back to the Home page
        router.push("/?spotify=connected");
      }
    };

    exchangeToken();
  }, [code, router]);

  return (
    <div className="h-screen w-full bg-[#050505] flex items-center justify-center flex-col gap-6">
       <div className="w-16 h-16 border-4 border-[#1DB954] border-t-transparent rounded-full animate-spin"></div>
       <div className="text-[#1DB954] font-extrabold text-xl uppercase tracking-widest animate-pulse">Establishing Spotify Neural Link...</div>
    </div>
  );
}