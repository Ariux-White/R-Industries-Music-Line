"use client"; // Required for interactive features like login state

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../utils/supabase";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  // This checks if you are logged in when the page loads
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // This listens for when you log in or log out
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Logout function
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <nav className="w-full p-4 border-b border-gray-800 bg-black/80 backdrop-blur-md fixed top-0 z-50">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        {/* Brand Logo */}
        <Link href="/" className="text-xl font-extrabold tracking-widest text-[#007AFF]">
          R-STREAM
        </Link>
        
        {/* Dynamic Button (Login vs Disconnect) */}
        <div>
          {user ? (
            <button 
              onClick={handleLogout} 
              className="px-4 py-2 text-sm font-semibold text-white bg-red-600/20 border border-red-600/50 rounded-full hover:bg-red-600 transition"
            >
              Disconnect
            </button>
          ) : (
            <Link 
              href="/login" 
              className="px-4 py-2 text-sm font-semibold text-black bg-[#007AFF] rounded-full hover:bg-blue-600 transition"
            >
              Admin Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}