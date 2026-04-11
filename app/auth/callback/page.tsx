"use client";
import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../../utils/supabase";

// 1. Create a sub-component for the logic
function SpotifyCallbackLogic() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");

  useEffect(() => {
    if (!code) return;
    
    const exchangeToken = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.push("/login");

      // DYNAMIC REDIRECT URI: This ensures it works on Localhost AND Production
      const currentOrigin = window.location.origin;
      const redirect_uri = `${currentOrigin}/auth/callback`;

      // Exchange the code for an Access Token
      const res = await fetch("/api/spotify/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, redirect_uri })
      });
      
      const data = await res.json();
      if (data.access_token) {
        const { data: libData } = await supabase.from('user_library')
          .select('playback_settings')
          .eq('user_id', session.user.id)
          .single();
          
        const settings = libData?.playback_settings || {};
        
        settings.spotifyTokens = {
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expires_at: Date.now() + (data.expires_in * 1000)
        };
        
        await supabase.from('user_library')
          .update({ playback_settings: settings })
          .eq('user_id', session.user.id);
        
        router.push("/?spotify=connected");
      }
    };

    exchangeToken();
  }, [code, router]);

  return (
    <div className="h-screen w-full bg-[#050505] flex items-center justify-center flex-col gap-6">
       <div className="w-16 h-16 border-4 border-[#1DB954] border-t-transparent rounded-full animate-spin"></div>
       <div className="text-[#1DB954] font-extrabold text-xl uppercase tracking-widest animate-pulse">
         Establishing Spotify Neural Link...
       </div>
    </div>
  );
}

// 2. Wrap the whole thing in Suspense for the main export
export default function SpotifyCallback() {
  return (
    <Suspense fallback={
      <div className="h-screen w-full bg-[#050505] flex items-center justify-center">
        <div className="text-white">Loading Neural Link...</div>
      </div>
    }>
      <SpotifyCallbackLogic />
    </Suspense>
  );
}