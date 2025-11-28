import React, { useState } from 'react';
import { ShieldCheck, Loader2, AlertCircle, UserCircle, ArrowLeft } from 'lucide-react';
import { supabase } from '../services/supabase';

interface LoginProps {
  onGuestLogin?: () => void;
  onCancel?: () => void;
}

export const Login: React.FC<LoginProps> = ({ onGuestLogin, onCancel }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    setIsLoading(true);
    
    if (!supabase) {
      const msg = "Supabase not configured in .env file.";
      setErrorMsg(msg);
      setIsLoading(false);
      return;
    }

    try {
      const redirectUrl = window.location.origin;
      
      // Request Full Gmail Scope. 
      // Removed skipBrowserRedirect: true to allow immediate redirect.
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          scopes: 'https://mail.google.com/',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) throw error;
      // The browser will redirect, so no further state updates needed here usually.

    } catch (error: any) {
      console.error("Login Error:", error);
      const msg = error.message || "Authentication failed";
      setErrorMsg(msg);
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-50 dark:bg-slate-950 flex flex-col items-center overflow-y-auto transition-colors duration-300">
      
      <div className="w-full max-w-md flex flex-col items-center py-12 px-4">
        
        {/* Main Card */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-xl w-full border border-slate-100 dark:border-slate-800 relative z-10">
          <div className="mb-8 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200 dark:shadow-blue-900/50">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">SecureMail AI</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Sign in to your protected inbox</p>
          </div>

          {errorMsg && (
            <div className="mb-6 w-full p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-xl text-sm border border-red-100 dark:border-red-900/30 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Login Warning</p>
                <p className="text-red-600/90 dark:text-red-300/90">{errorMsg}</p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {/* Action Area */}
            <button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full h-12 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-xl transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-3 group"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  <span>Sign in with Google</span>
                </>
              )}
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-slate-900 px-2 text-slate-400">Or continue as</span>
              </div>
            </div>

            <button
              onClick={onGuestLogin}
              className="w-full h-12 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
            >
              <UserCircle className="w-5 h-5 text-slate-400" />
              <span>Guest User (Demo)</span>
            </button>

            {onCancel && (
              <button
                onClick={onCancel}
                className="w-full py-2 text-sm text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to App</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};