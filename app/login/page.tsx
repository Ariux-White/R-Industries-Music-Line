"use client";

import { useState } from "react";
import { supabase } from "../../utils/supabase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    // 1. Authenticate the user
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setMessage(authError.message);
      setLoading(false);
      return;
    }

    // 2. Check their Role in the database
    if (authData.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, name')
        .eq('id', authData.user.id)
        .single();

      if (profile?.role === 'admin') {
        setMessage(`Welcome back, Admin ${profile.name || ''}. Initializing Override...`);
      } else {
        setMessage("Authentication successful. Loading stream...");
      }

      setTimeout(() => router.push("/"), 1500);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md p-10 rounded-3xl border border-[#00E5FF]/20 bg-black/60 backdrop-blur-xl shadow-[0_0_50px_rgba(0,229,255,0.1)] relative overflow-hidden">
        
        {/* Decorative Top Accent */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent"></div>

        <h2 className="text-3xl font-bold text-white mb-2 text-center tracking-wide">R Industries Music Line</h2>
        <p className="text-[#00E5FF] text-center mb-8 text-xs uppercase tracking-[0.3em] font-semibold">Unified Access Portal</p>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1 tracking-wider">Credentials</label>
            <input
              type="email"
              placeholder="user@r-industries.com"
              className="w-full p-4 bg-gray-900/50 border border-gray-700 rounded-xl focus:outline-none focus:border-[#D4AF37] transition text-white placeholder-gray-600"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <input
              type="password"
              placeholder="Security Key"
              className="w-full p-4 bg-gray-900/50 border border-gray-700 rounded-xl focus:outline-none focus:border-[#D4AF37] transition text-white placeholder-gray-600"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-[#00E5FF] to-[#00B3CC] text-black font-extrabold tracking-widest uppercase rounded-xl hover:scale-[1.02] transition-all disabled:opacity-50 shadow-[0_0_20px_rgba(0,229,255,0.3)]"
          >
            {loading ? "Verifying..." : "Initialize"}
          </button>

          {message && (
            <p className={`text-center text-sm mt-4 p-3 rounded-lg border ${message.includes('Welcome') || message.includes('successful') ? 'bg-[#D4AF37]/10 border-[#D4AF37]/30 text-[#D4AF37]' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
              {message}
            </p>
          )}
        </form>
      </div>
    </main>
  );
}