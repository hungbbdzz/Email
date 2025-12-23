
import React, { useState, useRef } from 'react';
import { 
  Inbox, 
  Archive, 
  User, 
  Tag, 
  AlertOctagon, 
  Trash2, 
  BarChart2, 
  Settings,
  ShieldAlert,
  ChevronRight,
  Briefcase,
  Star,
  PenSquare,
  SendHorizontal,
  Mail,
  Layers,
  MessageSquare,
  Video,
  Plus,
  AtSign,
  Home,
  Keyboard,
  Menu,
  Pencil,
  Users,
  BookOpen
} from 'lucide-react';
import { Email, EmailLabel, UserProfile, AppModule, ChatSession } from '../types';
import { useOutsideClick } from '../hooks/useOutsideClick';

// --- Optimized Label Component ---
// Keeps icon stationary, animates text width/opacity
const TextLabel = ({ children, count, highlight, isOpen }: { children?: React.ReactNode, count?: number, highlight?: boolean, isOpen: boolean }) => (
  <div 
      className={`flex items-center justify-between flex-1 overflow-hidden whitespace-nowrap transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          isOpen ? 'opacity-100 max-w-[200px] ml-4' : 'opacity-0 max-w-0 ml-0'
      }`}
  >
      <span className="truncate">{children}</span>
      {count !== undefined && count > 0 && (
          <span className={`text-xs ${highlight ? 'font-bold text-blue-600' : ''} ml-2 pr-4`}>
              {count}
          </span>
      )}
  </div>
);

interface SidebarProps {
  isOpen: boolean; 
  notificationsEnabled: boolean;
  currentView: string;
  setCurrentView: (view: string) => void;
  setFilter: (label: EmailLabel | 'STARRED' | null) => void;
  user: UserProfile | null;
  onOpenProfile: () => void;
  emails: Email[];
  onCompose: () => void;
  activeModule: AppModule;
  setActiveModule: (module: AppModule) => void;
  onToggleSidebar: () => void;
  chatSessions: ChatSession[];
  onSelectChatSession: (sessionId: string) => void;
  onNewChat: () => void;
  currentChatSessionId: string | null;
  onOpenCreateSpace: () => void;
  onBrowseSpaces: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  isOpen, 
  currentView, 
  setCurrentView, 
  setFilter, 
  user, 
  onOpenProfile,
  emails,
  onCompose,
  activeModule,
  setActiveModule,
  onToggleSidebar,
  chatSessions,
  onSelectChatSession,
  onNewChat,
  currentChatSessionId,
  onOpenCreateSpace,
  onBrowseSpaces
}) => {
  const [showSpaceMenu, setShowSpaceMenu] = useState(false);
  const spaceMenuRef = useRef<HTMLDivElement>(null);

  useOutsideClick(spaceMenuRef, () => setShowSpaceMenu(false));
  
  const inboxEmails = emails.filter(e => !e.isDeleted && !e.isArchived);
  const totalInboxCount = inboxEmails.length;
  const unreadReceivedCount = emails.filter(e => e.senderEmail !== user?.email && !e.isRead && !e.isDeleted && !e.isArchived).length;
  const trashCount = emails.filter(e => e.isDeleted).length;
  const phishCount = emails.filter(e => e.label === EmailLabel.PHISHING && !e.isDeleted).length;
  const starredCount = emails.filter(e => e.isStarred && !e.isDeleted).length;
  const unreadAllCount = inboxEmails.filter(e => !e.isRead).length;

  const displayAvatar = user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.full_name || 'User')}&background=random`;

  const NavItem = ({ 
      viewName, 
      icon: Icon, 
      label, 
      count, 
      highlight, 
      onClick, 
      colorClass = "text-slate-600 dark:text-slate-400" 
  }: any) => {
      const isActive = currentView === viewName;
      return (
        <div 
            onClick={onClick}
            className={`flex items-center h-9 px-0 mx-0 cursor-pointer transition-colors duration-200 text-sm group relative rounded-r-full overflow-hidden ${
                isActive
                ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-100 font-bold' 
                : `${colorClass} hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200`
            }`}
            title={!isOpen ? label : ""}
        >
            <div className="w-[68px] flex justify-center flex-shrink-0">
                <Icon className={`w-5 h-5 ${isActive ? 'fill-current' : ''}`} />
            </div>
            <TextLabel count={count} highlight={highlight} isOpen={isOpen}>{label}</TextLabel>
        </div>
      );
  };

  const RailButton = ({ module, icon: Icon, label, notificationCount }: { module: AppModule, icon: any, label: string, notificationCount?: number }) => (
    <div className="flex flex-col items-center gap-1 mb-6 group cursor-pointer" onClick={() => setActiveModule(module)}>
      <div className={`relative p-3 rounded-2xl transition-all duration-200 group-hover:bg-blue-50 dark:group-hover:bg-slate-800 ${activeModule === module ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-200' : 'text-slate-500 dark:text-slate-400'}`}>
        <Icon className={`w-6 h-6 ${activeModule === module ? 'fill-current' : ''}`} strokeWidth={activeModule === module ? 2.5 : 2} />
        {notificationCount && notificationCount > 0 && (
          <div className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></div>
        )}
      </div>
      <span className={`text-[10px] font-medium ${activeModule === module ? 'text-blue-700 dark:text-blue-300' : 'text-slate-500'}`}>{label}</span>
    </div>
  );

  return (
    <div className="flex h-screen flex-shrink-0 z-20">
      
      {/* 1. App Switcher Rail (Far Left) */}
      <div className="w-[72px] bg-slate-50 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 flex flex-col items-center py-2 flex-shrink-0 z-30">
         <div className="mb-4 mt-2">
             <button 
               onClick={onToggleSidebar}
               className="p-3 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full text-slate-600 dark:text-slate-300 transition-colors"
               title="Toggle Menu"
             >
               <Menu className="w-6 h-6" />
             </button>
         </div>
         
         <RailButton module="mail" icon={Mail} label="Mail" notificationCount={unreadAllCount} />
         <RailButton module="chat" icon={MessageSquare} label="Chat" />
         <RailButton module="meet" icon={Video} label="Meet" />
         
         <div className="mt-auto pb-4">
            <div 
              onClick={onOpenProfile}
              className="w-10 h-10 rounded-full overflow-hidden cursor-pointer hover:ring-4 hover:ring-slate-100 dark:hover:ring-slate-800 transition-all border border-slate-200 dark:border-slate-700"
            >
               <img src={displayAvatar} alt="User" className="w-full h-full object-cover" />
            </div>
         </div>
      </div>

      {/* 2. Context Navigation Drawer (Mini-Sidebar) */}
      <div 
        className={`bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 h-full flex flex-col transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden ${
          isOpen ? 'w-64' : 'w-[72px]'
        }`}
      >
        {/* Header Logo */}
        <div className="h-16 flex items-center px-0 flex-shrink-0 overflow-hidden whitespace-nowrap">
           <div className={`flex items-center gap-3 text-blue-600 dark:text-blue-400 pl-[18px]`}>
              <div className="p-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex-shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <span className={`text-xl font-medium text-slate-800 dark:text-white tracking-tight transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
                SecureMail
              </span>
           </div>
        </div>

        {/* --- MAIL MODULE --- */}
        {activeModule === 'mail' && (
          <>
            <div className={`pb-4 px-3 flex transition-all duration-300 ${isOpen ? 'justify-start' : 'justify-center'}`}>
              <button 
                onClick={onCompose}
                className={`flex items-center bg-blue-100 dark:bg-[#c2e7ff] text-[#001d35] hover:shadow-md transition-all duration-300 group h-14 rounded-2xl overflow-hidden ${isOpen ? 'w-full px-4 gap-3' : 'w-14 justify-center px-0'}`}
                title="Compose"
              >
                {isOpen ? <PenSquare className="w-5 h-5 flex-shrink-0" /> : <Pencil className="w-6 h-6 flex-shrink-0" />}
                <span className={`font-semibold text-sm whitespace-nowrap transition-all duration-300 ${isOpen ? 'opacity-100 max-w-full' : 'opacity-0 max-w-0'}`}>Compose</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-0.5 custom-scrollbar pb-4 pr-2">
                <NavItem viewName="all" icon={Layers} label="Inbox" count={totalInboxCount} onClick={() => { setCurrentView('all'); setFilter(null); }} />
                <NavItem viewName="received" icon={Inbox} label="Received" count={unreadReceivedCount} highlight onClick={() => { setCurrentView('received'); setFilter(null); }} />
                <NavItem viewName="favorites" icon={Star} label="Starred" count={starredCount} onClick={() => { setCurrentView('all'); setFilter('STARRED'); }} />
                <NavItem viewName="sent" icon={SendHorizontal} label="Sent" onClick={() => { setCurrentView('sent'); setFilter(null); }} />
                <NavItem viewName="archived" icon={Archive} label="Archived" onClick={() => { setCurrentView('archived'); setFilter(null); }} />
                <NavItem viewName="trash" icon={Trash2} label="Trash" count={trashCount} onClick={() => { setCurrentView('trash'); setFilter(null); }} />

                <div className={`mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 px-4 pb-2 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 hidden'}`}>
                     <p className="text-xs font-medium text-slate-500 uppercase">Labels</p>
                </div>
                
                <NavItem viewName="work" icon={Briefcase} label="Work" colorClass="text-blue-500" onClick={() => { setCurrentView('all'); setFilter(EmailLabel.WORK); }} />
                <NavItem viewName="personal" icon={User} label="Personal" colorClass="text-green-500" onClick={() => { setCurrentView('all'); setFilter(EmailLabel.PERSONAL); }} />
                <NavItem viewName="education" icon={BookOpen} label="Education" colorClass="text-cyan-500" onClick={() => { setCurrentView('all'); setFilter(EmailLabel.EDUCATION); }} />
                <NavItem viewName="social" icon={Users} label="Social" colorClass="text-pink-500" onClick={() => { setCurrentView('all'); setFilter(EmailLabel.SOCIAL); }} />
                <NavItem viewName="promo" icon={Tag} label="Promotions" colorClass="text-orange-500" onClick={() => { setCurrentView('all'); setFilter(EmailLabel.PROMOTION); }} />
                <NavItem viewName="phishing" icon={AlertOctagon} label="Phishing Alert" count={phishCount} highlight colorClass="text-red-500" onClick={() => { setCurrentView('all'); setFilter(EmailLabel.PHISHING); }} />

                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                   <NavItem viewName="stats" icon={BarChart2} label="Analytics" onClick={() => setCurrentView('stats')} />
                   <NavItem viewName="settings" icon={Settings} label="Settings" onClick={() => setCurrentView('settings')} />
                </div>
            </div>
          </>
        )}

        {/* --- CHAT MODULE --- */}
        {activeModule === 'chat' && (
          <>
             <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 pt-2">
                <div className={`px-4 py-2 flex items-center justify-between group cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-all ${isOpen ? 'opacity-100' : 'opacity-0 h-0 py-0 overflow-hidden'}`}>
                     <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400 font-medium text-sm">
                        <ChevronRight className="w-4 h-4" /> Shortcuts
                     </div>
                </div>
                
                <div>
                   <NavItem viewName="chat-home" icon={Home} label="Home" onClick={() => setCurrentView('chat-home')} />
                   <NavItem viewName="chat-mentions" icon={AtSign} label="Mentions" onClick={() => setCurrentView('chat-mentions')} />
                </div>

                {/* DMs */}
                <div className={`mt-4 px-4 py-2 flex items-center justify-between group cursor-pointer transition-all ${isOpen ? 'opacity-100' : 'opacity-0 h-0 py-0 overflow-hidden'}`}>
                     <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400 font-medium text-sm">
                        <ChevronRight className="w-4 h-4 rotate-90" /> Direct messages
                     </div>
                     <button onClick={onNewChat} className="text-slate-400 hover:text-slate-600">
                        <Plus className="w-4 h-4" />
                     </button>
                </div>
                
                {/* Always show DM list, but icons only when closed */}
                <div className="space-y-0.5">
                   {chatSessions.map((session) => (
                      <div 
                        key={session.id} 
                        onClick={() => onSelectChatSession(session.id)}
                        className={`flex items-center py-2 cursor-pointer text-sm transition-colors rounded-r-full h-9 ${
                            currentChatSessionId === session.id 
                            ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-100 font-bold' 
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`} 
                        title={!isOpen ? (session.title || "Chat") : ""}
                      >
                         <div className="w-[68px] flex justify-center flex-shrink-0">
                            <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                                {session.title ? session.title[0].toUpperCase() : 'C'}
                            </div>
                         </div>
                         <TextLabel isOpen={isOpen}>
                             {session.title || "New Chat"}
                         </TextLabel>
                      </div>
                   ))}
                </div>

                {/* Spaces */}
                <div className={`mt-4 px-4 py-2 flex items-center justify-between group cursor-pointer relative transition-all ${isOpen ? 'opacity-100' : 'opacity-0 h-0 py-0 overflow-hidden'}`} ref={spaceMenuRef}>
                     <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400 font-medium text-sm">
                        <ChevronRight className="w-4 h-4 rotate-90" /> Spaces
                     </div>
                     <button 
                        onClick={() => setShowSpaceMenu(!showSpaceMenu)} 
                        className="text-slate-400 hover:text-slate-600"
                     >
                        <Plus className="w-4 h-4" />
                     </button>

                     {showSpaceMenu && (
                        <div className="absolute top-8 right-0 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-50 py-1">
                           <button 
                              onClick={() => { onOpenCreateSpace(); setShowSpaceMenu(false); }}
                              className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                           >
                              <Plus className="w-4 h-4" /> Create a space
                           </button>
                           <button 
                              onClick={() => { onBrowseSpaces(); setShowSpaceMenu(false); }}
                              className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                           >
                              <Users className="w-4 h-4" /> Browse spaces
                           </button>
                        </div>
                     )}
                </div>
                
                {/* Fallback space icon when closed */}
                {!isOpen && (
                    <div 
                        className="flex items-center h-9 justify-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 rounded-r-full text-slate-500"
                        onClick={() => { if(!isOpen) onToggleSidebar(); }}
                        title="Spaces"
                    >
                        <Users className="w-5 h-5" />
                    </div>
                )}
             </div>
          </>
        )}

        {/* --- MEET MODULE --- */}
        {activeModule === 'meet' && (
          <>
             <div className="pt-4">
                 <div className={`px-4 transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
                     <h1 className="text-xl font-normal text-slate-700 dark:text-slate-200 whitespace-nowrap">Meet</h1>
                 </div>
                 
                 <div className={`px-3 pb-6 space-y-3 transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0 hidden'}`}>
                     <button className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-full py-2 px-4 text-sm font-medium transition-colors shadow-sm whitespace-nowrap" onClick={() => window.open('https://meet.google.com/new', '_blank')}>
                       New meeting
                     </button>
                     <div className="flex gap-2">
                        <div className="relative flex-1">
                           <Keyboard className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                           <input 
                             placeholder="Code or link" 
                             className="w-full pl-9 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-transparent dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                           />
                        </div>
                        <button className="text-blue-600 dark:text-blue-400 font-medium text-sm px-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                          Join
                        </button>
                     </div>
                 </div>
                 
                 <div className={`px-2 pb-4 flex flex-col gap-2 items-center transition-opacity duration-200 ${!isOpen ? 'opacity-100' : 'opacity-0 hidden'}`}>
                        <button className="p-3 bg-blue-600 rounded-full text-white hover:bg-blue-700 shadow-md" title="New Meeting" onClick={() => window.open('https://meet.google.com/new', '_blank')}>
                           <Video className="w-5 h-5" />
                        </button>
                        <button className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-600 dark:text-slate-400" title="Join with Code">
                           <Keyboard className="w-5 h-5" />
                        </button>
                 </div>

                 <div className={`flex-1 px-4 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 hidden'}`}>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 whitespace-nowrap">My Meetings</p>
                      <div className="text-center py-8 text-slate-400 text-sm whitespace-nowrap">
                         No meetings scheduled.
                      </div>
                 </div>
             </div>
          </>
        )}

      </div>
    </div>
  );
};