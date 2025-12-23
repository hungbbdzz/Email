
import React, { useState, useEffect } from 'react';
import { X, Save, Database, Key, AlertTriangle, AlertCircle, Check, Copy, ExternalLink } from 'lucide-react';
import { AppConfig } from '../types';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: AppConfig) => void;
  initialConfig: AppConfig;
}

const ConfigModal: React.FC<ConfigModalProps> = ({ isOpen, onClose, onSave, initialConfig }) => {
  const [config, setConfig] = useState<AppConfig>(initialConfig);
  const [error, setError] = useState<string | null>(null);
  const [copiedCallback, setCopiedCallback] = useState(false);
  const [copiedOrigin, setCopiedOrigin] = useState(false);
  const [copiedSQL, setCopiedSQL] = useState(false);
  const [activeTab, setActiveTab] = useState<'google' | 'supabase' | 'schema'>('google');

  useEffect(() => {
    setConfig(initialConfig);
    setError(null);
  }, [initialConfig, isOpen]);

  const handleSave = () => {
    setError(null);
    if (!config.supabaseUrl.trim()) {
      setError("Supabase URL is required.");
      return;
    }
    if (!config.supabaseKey.trim()) {
      setError("Supabase Anon Key is required.");
      return;
    }
    try {
      new URL(config.supabaseUrl);
    } catch (e) {
      setError("Invalid URL format. Please ensure it starts with https://");
      return;
    }
    onSave(config);
  };

  const getCallbackUrl = () => {
    try {
      if (!config.supabaseUrl) return 'https://<your-project>.supabase.co/auth/v1/callback';
      const cleanUrl = config.supabaseUrl.replace(/\/$/, '');
      return `${cleanUrl}/auth/v1/callback`;
    } catch {
      return 'https://<your-project>.supabase.co/auth/v1/callback';
    }
  };

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://your-app-url.com';

  const copyToClipboard = (text: string, setCopied: (val: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const SCHEMA_SQL = `-- 1. Create PROFILES table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  email TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- 2. Create EMAILS table
CREATE TABLE IF NOT EXISTS emails (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  sender_name TEXT,
  sender_email TEXT,
  subject TEXT,
  preview TEXT,
  body TEXT,
  date TIMESTAMPTZ,
  label TEXT,
  confidence_score FLOAT,
  is_read BOOLEAN DEFAULT FALSE,
  is_starred BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  warnings TEXT[] DEFAULT '{}',
  is_correction BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE emails ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own emails" ON emails FOR ALL USING (auth.uid() = user_id);

-- 3. Create CHAT SESSIONS table (JOINED with auth.users)
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup by user
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON chat_sessions(user_id);

ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own chat sessions" ON chat_sessions FOR ALL USING (auth.uid() = user_id);

-- 4. Create CHAT MESSAGES table (JOINED with chat_sessions)
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL, -- 'user' or 'model'
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup of messages in a session
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own chat messages" ON chat_messages FOR ALL USING (
  exists (select 1 from chat_sessions where id = chat_messages.session_id and user_id = auth.uid())
);`;

  if (!isOpen) return null;
  const callbackUrl = getCallbackUrl();

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-5xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900 flex-shrink-0">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-600 dark:text-blue-500" />
            Backend Configuration
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-slate-900">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-5 space-y-6 border-r border-slate-100 dark:border-slate-800 pr-0 lg:pr-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 rounded-lg p-3 text-xs text-blue-800 dark:text-blue-300">
                To login with Google, you must connect your own Supabase project. The default credentials have been cleared.
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">1. Supabase Project URL</label>
                  <input
                    type="text"
                    value={config.supabaseUrl}
                    onChange={(e) => setConfig({ ...config, supabaseUrl: e.target.value.trim() })}
                    placeholder="https://xyz.supabase.co"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:outline-none text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white ${
                      error && error.includes('URL') ? 'border-red-500 focus:ring-red-200' : 'border-slate-300 dark:border-slate-600 focus:ring-blue-500'
                    }`}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">2. Supabase Anon Key</label>
                  <div className="relative">
                    <Key className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="password"
                      value={config.supabaseKey}
                      onChange={(e) => setConfig({ ...config, supabaseKey: e.target.value.trim() })}
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI..."
                      className={`w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:outline-none text-sm font-mono bg-white dark:bg-slate-800 text-slate-900 dark:text-white ${
                         error && error.includes('Key') ? 'border-red-500 focus:ring-red-200' : 'border-slate-300 dark:border-slate-600 focus:ring-blue-500'
                      }`}
                    />
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg flex items-start gap-2 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-7 flex flex-col h-full bg-slate-50/50 dark:bg-slate-800/50 rounded-xl overflow-hidden">
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-100 dark:border-yellow-900/30">
                <h3 className="font-bold text-yellow-800 dark:text-yellow-300 flex items-center gap-2 text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  Troubleshooting Guide
                </h3>
              </div>

              <div className="flex border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                <button onClick={() => setActiveTab('google')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wide border-b-2 transition-colors ${activeTab === 'google' ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50/30 dark:bg-blue-900/10' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>1. Google Cloud</button>
                <button onClick={() => setActiveTab('supabase')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wide border-b-2 transition-colors ${activeTab === 'supabase' ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50/30 dark:bg-blue-900/10' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>2. Supabase URL</button>
                <button onClick={() => setActiveTab('schema')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wide border-b-2 transition-colors ${activeTab === 'schema' ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50/30 dark:bg-blue-900/10' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>3. DB Schema (All)</button>
              </div>
              
              <div className="p-5 flex-1 overflow-y-auto bg-white dark:bg-slate-900">
                {activeTab === 'google' && (
                  <div className="space-y-6">
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-lg p-3 text-xs text-red-800 dark:text-red-300">
                      <strong>If you see a Google Robot 404:</strong> This means your Supabase URL is incorrect, or the project is deleted.
                    </div>

                    <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-900/30 rounded-lg p-3 text-xs text-orange-800 dark:text-orange-300">
                        <strong className="block mb-2">If you see "Access blocked: ... has not completed the Google verification process":</strong>
                        This app is in <strong>Testing</strong> mode. To fix this:
                        <ol className="list-decimal pl-4 mt-2 space-y-1">
                            <li>
                                Go to <a href="https://console.cloud.google.com/auth/audience" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-0.5 font-bold">Google Cloud Console (Audience) <ExternalLink size={10} /></a>
                            </li>
                            <li>Scroll down to <strong>Test users</strong>.</li>
                            <li>Click <strong>+ ADD USERS</strong>.</li>
                            <li>Enter your email (e.g. <em>velorise2206@gmail.com</em>).</li>
                            <li>Click <strong>SAVE</strong>.</li>
                        </ol>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wide">Copy THIS URL to Google Cloud Console:</label>
                      <div className="relative flex shadow-sm">
                        <code className="flex-1 bg-slate-800 dark:bg-slate-950 text-white px-3 py-3 rounded-l-lg border border-r-0 border-slate-700 dark:border-slate-800 text-xs font-mono break-all flex items-center">
                          {config.supabaseUrl ? callbackUrl : "Enter Supabase URL first..."}
                        </code>
                        <button onClick={() => config.supabaseUrl && copyToClipboard(callbackUrl, setCopiedCallback)} disabled={!config.supabaseUrl} className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-r-lg px-4 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50">
                          {copiedCallback ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-slate-500 dark:text-slate-400" />}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                {activeTab === 'supabase' && (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wide">Copy Your App URL:</label>
                      <div className="relative flex shadow-sm">
                        <code className="flex-1 bg-slate-50 dark:bg-slate-800 px-3 py-3 rounded-l-lg border border-r-0 border-slate-200 dark:border-slate-700 text-xs font-mono break-all text-slate-700 dark:text-slate-300 flex items-center">
                          {currentOrigin}/**
                        </code>
                        <button onClick={() => copyToClipboard(`${currentOrigin}/**`, setCopiedOrigin)} className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-r-lg px-4 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                          {copiedOrigin ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-slate-500 dark:text-slate-400" />}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                {activeTab === 'schema' && (
                  <div className="space-y-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 rounded-lg p-3 text-xs text-blue-800 dark:text-blue-300 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <div>
                        <strong>Full Database Reset:</strong><br/>
                        Copy this SQL to Supabase SQL Editor to create tables for Profiles, Emails, and Chat History.
                      </div>
                    </div>
                    <div className="relative">
                       <pre className="bg-slate-900 dark:bg-slate-950 text-slate-300 p-4 rounded-lg text-[10px] font-mono overflow-auto max-h-60 border border-slate-700 dark:border-slate-800 whitespace-pre-wrap">{SCHEMA_SQL}</pre>
                       <button onClick={() => copyToClipboard(SCHEMA_SQL, setCopiedSQL)} className="absolute top-2 right-2 bg-slate-700 hover:bg-slate-600 text-white p-1.5 rounded-md transition-colors" title="Copy SQL">
                          {copiedSQL ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors">Close</button>
          <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm"><Save className="w-4 h-4" /> Save Configuration</button>
        </div>
      </div>
    </div>
  );
};

export default ConfigModal;
