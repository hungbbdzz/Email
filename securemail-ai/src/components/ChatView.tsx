
import React, { useState, useEffect } from 'react';
import { Search, Settings, HelpCircle, MessageSquarePlus, AtSign, Filter, MessageSquare, Users, Grid } from 'lucide-react';
import { UserProfile, ChatSession, Email } from '../types';
import { CreateSpaceModal } from './CreateSpaceModal';
import { ChatSpaceView } from './ChatSpaceView';

interface ChatViewProps {
  user: UserProfile | null;
  onOpenChat: (sessionId: string) => void;
  onNewChat: () => void;
  chatSessions: ChatSession[];
  currentSessionId?: string | null;
  emails: Email[]; // Add emails prop
}

export const ChatView: React.FC<ChatViewProps> = ({ user, onOpenChat, onNewChat, chatSessions, currentSessionId, emails }) => {
  const [isSpaceModalOpen, setIsSpaceModalOpen] = useState(false);
  const [activeSession, setActiveSession] = useState<ChatSession | undefined>(undefined);

  useEffect(() => {
      if (currentSessionId) {
          const session = chatSessions.find(s => s.id === currentSessionId);
          setActiveSession(session);
      } else {
          setActiveSession(undefined);
      }
  }, [currentSessionId, chatSessions]);

  if (activeSession) {
      return (
          <ChatSpaceView 
            session={activeSession} 
            user={user} 
            onBack={() => onOpenChat('')} // Go back logic if needed, or just standard nav
            emails={emails} // Pass emails to Space View
          />
      );
  }

  return (
    <div className="flex-1 h-screen flex flex-col bg-white dark:bg-slate-900 overflow-hidden">
      
      {/* Header */}
      <div className="h-16 px-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between flex-shrink-0 bg-white dark:bg-slate-900">
         <div className="relative flex-1 max-w-2xl">
            <Search className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
            <input 
              placeholder="Search in chat" 
              className="w-full bg-slate-100 dark:bg-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:shadow-md transition-all outline-none border border-transparent focus:border-slate-200 dark:focus:border-slate-700"
            />
         </div>
         <div className="flex items-center gap-4 ml-4 text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-3 py-1.5 rounded-full text-xs font-bold cursor-pointer hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors">
               <div className="w-2 h-2 rounded-full bg-green-500"></div>
               <span>Active</span>
            </div>
            <HelpCircle className="w-6 h-6 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer" />
            <Settings className="w-6 h-6 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer" />
         </div>
      </div>

      {/* Main Content - Home View */}
      <div className="flex-1 overflow-y-auto flex flex-col items-center custom-scrollbar">
         
         <div className="w-full max-w-5xl p-8 mt-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-10 text-center md:text-left">
                <h1 className="text-3xl font-normal text-slate-800 dark:text-white mb-2">
                Welcome, {user?.full_name?.split(' ')[0] || 'User'}
                </h1>
                <p className="text-slate-500 dark:text-slate-400">
                Ready to set things in motion?
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Card 1: Start a chat */}
                <div className="group bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col overflow-hidden cursor-pointer" onClick={onNewChat}>
                   <div className="h-32 bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors">
                      <div className="w-16 h-16 bg-blue-200 dark:bg-blue-800 rounded-full flex items-center justify-center">
                        <MessageSquare className="w-8 h-8 text-blue-700 dark:text-blue-300" />
                      </div>
                   </div>
                   <div className="p-6 text-center flex-1 flex flex-col">
                      <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">Start a chat</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 flex-1">
                         Message a person or group to collaborate instantly.
                      </p>
                      <button className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6 py-2 text-sm font-medium transition-colors w-full">
                         New Chat
                      </button>
                   </div>
                </div>

                {/* Card 2: Create a space */}
                <div className="group bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col overflow-hidden cursor-pointer" onClick={() => setIsSpaceModalOpen(true)}>
                   <div className="h-32 bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center group-hover:bg-purple-100 dark:group-hover:bg-purple-900/30 transition-colors">
                      <div className="w-16 h-16 bg-purple-200 dark:bg-purple-800 rounded-full flex items-center justify-center">
                        <Users className="w-8 h-8 text-purple-700 dark:text-purple-300" />
                      </div>
                   </div>
                   <div className="p-6 text-center flex-1 flex flex-col">
                      <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">Create a space</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 flex-1">
                         Organize people, topics, and projects in one place.
                      </p>
                      <button className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-blue-600 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-slate-600 rounded-full px-6 py-2 text-sm font-medium transition-colors w-full">
                         Create Space
                      </button>
                   </div>
                </div>

                {/* Card 3: Explore apps */}
                <div className="group bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col overflow-hidden cursor-pointer" onClick={() => window.open('https://workspace.google.com/u/2/marketplace/appfinder?host=chat', '_blank')}>
                   <div className="h-32 bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center group-hover:bg-amber-100 dark:group-hover:bg-amber-900/30 transition-colors">
                      <div className="w-16 h-16 bg-amber-200 dark:bg-amber-800 rounded-full flex items-center justify-center">
                        <Grid className="w-8 h-8 text-amber-700 dark:text-amber-300" />
                      </div>
                   </div>
                   <div className="p-6 text-center flex-1 flex flex-col">
                      <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">Explore apps</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 flex-1">
                         Add tools like Jira, Trello, and more to your workflow.
                      </p>
                      <button className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-blue-600 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-slate-600 rounded-full px-6 py-2 text-sm font-medium transition-colors w-full">
                         Browse Apps
                      </button>
                   </div>
                </div>
            </div>

            <div className="mt-12 w-full">
               <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Recent Conversations</h2>
                  <Filter className="w-4 h-4 text-slate-400 cursor-pointer hover:text-slate-600" />
               </div>
               
               {chatSessions.length > 0 ? (
                   <div className="grid grid-cols-1 gap-2">
                       {chatSessions.map(s => (
                           <div 
                                key={s.id} 
                                onClick={() => onOpenChat(s.id)}
                                className="p-4 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between hover:bg-blue-50 dark:hover:bg-slate-700 transition-all cursor-pointer group shadow-sm hover:shadow-md"
                           >
                               <div className="flex items-center gap-4">
                                   <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-sm ${s.type === 'space' ? 'bg-indigo-600 text-white rounded-lg' : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white'}`}>
                                        {s.title ? s.title[0].toUpperCase() : 'C'}
                                   </div>
                                   <div>
                                       <div className="font-medium text-sm text-slate-900 dark:text-white group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">{s.title || 'Conversation'}</div>
                                       <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                                           <span>Active</span>
                                           <span>•</span>
                                           <span>{new Date(s.created_at).toLocaleString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                       </div>
                                   </div>
                               </div>
                               <MessageSquarePlus className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors" />
                           </div>
                       ))}
                   </div>
               ) : (
                   <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-10 flex flex-col items-center justify-center text-center border border-dashed border-slate-200 dark:border-slate-700">
                      <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center mb-3">
                         <AtSign className="w-6 h-6 text-slate-400" />
                      </div>
                      <p className="text-slate-900 dark:text-white font-medium text-sm">No recent chats</p>
                      <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">Start a conversation with Gemini to see it here.</p>
                   </div>
               )}
            </div>

         </div>
      </div>

      <CreateSpaceModal 
        isOpen={isSpaceModalOpen}
        onClose={() => setIsSpaceModalOpen(false)}
        onCreate={(name, members) => { 
            // Triggered from cards if prop is provided, but mostly handled by Sidebar
            alert("Create space via Sidebar for full functionality."); 
        }}
      />
    </div>
  );
};
