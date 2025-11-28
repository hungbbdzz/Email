
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Search, Settings, ChevronDown, Plus, Smile, Image as ImageIcon, 
  Paperclip, Send, Bold, Italic, Underline, List, Link, Code, 
  MoreVertical, UserPlus, FileText, CheckSquare, X, Monitor, Calendar,
  Users, CheckCircle2, FolderOpen, ListTodo, Info, LogOut, Ban, Trash2,
  LayoutGrid, Bell, Clock, Pin, MessageSquare, Upload
} from 'lucide-react';
import { ChatSession, Message, UserProfile, Email } from '../types';
import { useOutsideClick } from '../hooks/useOutsideClick';
import { saveChatMessage, getChatMessages, deleteChatSession } from '../services/supabase';
import { ConfirmModal } from './ConfirmModal';
import ReactMarkdown from 'react-markdown';

interface ChatSpaceViewProps {
  session: ChatSession;
  user: UserProfile | null;
  onBack: () => void;
  emails: Email[];
}

export const ChatSpaceView: React.FC<ChatSpaceViewProps> = ({ session, user, onBack, emails }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [showFormatBar, setShowFormatBar] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'shared' | 'tasks'>('chat');
  
  // Modal States
  const [activeModal, setActiveModal] = useState<'none' | 'addMember' | 'assignTask'>('none');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);
  
  // Drag & Drop State
  const [isDragging, setIsDragging] = useState(false);
  
  // Menu States
  const [showSpaceMenu, setShowSpaceMenu] = useState(false);

  // Member Add States
  const [memberInput, setMemberInput] = useState('');
  const [showMemberSuggestions, setShowMemberSuggestions] = useState(false);
  
  // Task States
  const [taskTitle, setTaskTitle] = useState('');
  const [taskAssignee, setTaskAssignee] = useState('');

  const plusMenuRef = useRef<HTMLDivElement>(null);
  const spaceMenuRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const memberInputRef = useRef<HTMLDivElement>(null);

  useOutsideClick(plusMenuRef, () => setShowPlusMenu(false));
  useOutsideClick(spaceMenuRef, () => setShowSpaceMenu(false));
  useOutsideClick(modalRef, () => {
      setActiveModal('none');
  });
  
  useOutsideClick(memberInputRef, () => setShowMemberSuggestions(false));

  useEffect(() => {
    loadMessages();
  }, [session.id]);

  useEffect(() => {
    if (activeTab === 'chat') {
        scrollToBottom();
    }
  }, [messages, activeTab]);

  const loadMessages = async () => {
    const msgs = await getChatMessages(session.id);
    setMessages(msgs);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // --- Helpers for Suggestions ---
  const uniqueContacts = useMemo(() => {
    const contacts = new Map<string, string>();
    emails.forEach(e => {
        if (e.senderEmail && !contacts.has(e.senderEmail)) {
            contacts.set(e.senderEmail, e.senderName || e.senderEmail);
        }
    });
    return Array.from(contacts.entries()).map(([email, name]) => ({ email, name }));
  }, [emails]);

  const getFilteredContacts = (query: string) => {
    const lower = query.toLowerCase();
    if (!lower) return uniqueContacts.slice(0, 50);
    return uniqueContacts.filter(c => 
        c.name.toLowerCase().includes(lower) || c.email.toLowerCase().includes(lower)
    ).slice(0, 50);
  };

  // --- Actions ---

  const handleSend = async () => {
    if (!input.trim()) return;
    
    setIsLoading(true);
    const text = input;
    setInput('');
    
    // Optimistic Update
    const tempId = Date.now().toString();
    setMessages(prev => [...prev, { id: tempId, role: 'user', text: text, timestamp: Date.now() }]);

    await saveChatMessage(session.id, 'user', text);
    
    setTimeout(async () => {
        if (text.toLowerCase().includes('hello')) {
            const botText = "Hi there! Welcome to the space.";
            await saveChatMessage(session.id, 'model', botText);
            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: botText, timestamp: Date.now() }]);
        }
        loadMessages(); 
        setIsLoading(false);
    }, 1000);
  };

  const processFile = async (file: File) => {
      const msg = `**File Shared:** 📄 **${file.name}**\n*Size: ${Math.round(file.size/1024)} KB*`;
      await saveChatMessage(session.id, 'user', msg);
      loadMessages();
      setShowPlusMenu(false);
      
      // If we are in shared tab, switch to chat to see the msg
      if (activeTab !== 'chat') setActiveTab('chat');
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
  };

  const handleAddMember = async () => {
      if (!memberInput) return;
      const msg = `**System:** Added member: **${memberInput}**`;
      await saveChatMessage(session.id, 'model', msg);
      loadMessages();
      setMemberInput('');
      setShowMemberSuggestions(false);
      setActiveModal('none');
      setShowPlusMenu(false);
  };

  const handleAssignTask = async () => {
      if (!taskTitle) return;
      const msg = `
**Task Created** ✅
**Title:** ${taskTitle}
**Assignee:** ${taskAssignee || 'Unassigned'}
**Status:** Open
`;
      await saveChatMessage(session.id, 'model', msg);
      loadMessages();
      setTaskTitle('');
      setTaskAssignee('');
      setActiveModal('none');
      setShowPlusMenu(false);
      
      if (activeTab !== 'chat') setActiveTab('chat');
  };

  const showDemoAlert = () => {
      setShowDemoModal(true);
  };

  const handleDeleteSpace = async () => {
      await deleteChatSession(session.id);
      onBack();
  };

  // --- Drag & Drop Handlers ---
  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      // Only set to false if leaving the main container
      if (e.currentTarget.contains(e.relatedTarget as Node)) return;
      setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          processFile(e.dataTransfer.files[0]);
      }
  };

  return (
    <div 
        className="flex flex-col h-full w-full bg-white dark:bg-slate-900 relative"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
    >
      
      <ConfirmModal 
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteSpace}
        title="Delete Space?"
        message="This will delete the conversation and all of its contents for all members. This action cannot be undone."
        confirmLabel="Delete"
        isDestructive={true}
      />

      {/* --- Demo Popup Modal --- */}
      {showDemoModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowDemoModal(false)} />
              <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 max-w-sm w-full animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4 text-blue-600 dark:text-blue-400">
                      <Info size={24} />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Demo Version</h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-6 text-sm leading-relaxed">
                      This feature is currently part of the space model demo and has not been fully implemented yet.
                  </p>
                  <button 
                      onClick={() => setShowDemoModal(false)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-xl transition-colors shadow-sm"
                  >
                      Got it
                  </button>
              </div>
          </div>
      )}

      {/* --- Drag Overlay --- */}
      {isDragging && (
          <div className="absolute inset-0 z-50 bg-blue-600/10 backdrop-blur-sm border-4 border-blue-600/50 border-dashed rounded-none flex flex-col items-center justify-center pointer-events-none animate-in fade-in duration-200">
              <div className="bg-white dark:bg-slate-900 p-4 rounded-full shadow-lg mb-4 animate-bounce">
                  <Upload className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-blue-600 dark:text-blue-400">Drop file to share</h3>
          </div>
      )}

      {/* --- Modals Overlay --- */}
      {activeModal !== 'none' && (
          <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
              <div ref={modalRef} className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-[28px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700">
                  {/* Add Member Modal */}
                  {activeModal === 'addMember' && (
                      <div className="p-6">
                          <h3 className="text-xl font-normal text-slate-800 dark:text-white mb-6">Add people</h3>
                          
                          {/* Input with Dropdown */}
                          <div className="relative" ref={memberInputRef}>
                              <div className="flex items-center border border-slate-300 dark:border-slate-600 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all bg-slate-50 dark:bg-slate-900">
                                <input 
                                    autoFocus
                                    value={memberInput}
                                    onChange={(e) => { setMemberInput(e.target.value); setShowMemberSuggestions(true); }}
                                    onFocus={() => setShowMemberSuggestions(true)}
                                    placeholder="Enter name or email"
                                    className="flex-1 px-4 py-3 bg-transparent border-none text-sm text-slate-800 dark:text-white outline-none"
                                />
                                <button 
                                    onClick={() => setShowMemberSuggestions(!showMemberSuggestions)}
                                    className="p-2 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors mr-1 rounded-full"
                                    title="Show suggestions"
                                >
                                    <ChevronDown size={18} />
                                </button>
                              </div>

                              {/* Suggestion Dropdown */}
                              {showMemberSuggestions && (
                                  <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-20 max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2">
                                      <div className="px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-900/50 sticky top-0">
                                          Contacts
                                      </div>
                                      {getFilteredContacts(memberInput).length > 0 ? (
                                          getFilteredContacts(memberInput).map(c => (
                                            <div 
                                                key={c.email}
                                                onClick={() => { setMemberInput(c.email); setShowMemberSuggestions(false); }}
                                                className="px-4 py-2.5 hover:bg-blue-50 dark:hover:bg-slate-700 cursor-pointer border-b border-slate-100 dark:border-slate-800 last:border-0 flex flex-col"
                                            >
                                                <div className="text-sm font-medium text-slate-800 dark:text-white">{c.name}</div>
                                                <div className="text-xs text-slate-500 dark:text-slate-400">{c.email}</div>
                                            </div>
                                          ))
                                      ) : (
                                          <div className="px-4 py-3 text-sm text-slate-500 text-center italic">No contacts found</div>
                                      )}
                                  </div>
                              )}
                          </div>

                          <div className="mt-8 flex justify-end gap-2">
                              <button onClick={() => setActiveModal('none')} className="px-5 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors">Cancel</button>
                              <button onClick={handleAddMember} disabled={!memberInput} className="px-6 py-2 text-sm font-medium bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">Add</button>
                          </div>
                      </div>
                  )}

                  {/* Assign Task Modal */}
                  {activeModal === 'assignTask' && (
                      <div className="p-6 space-y-4">
                          <h3 className="text-xl font-normal text-slate-800 dark:text-white mb-4">Create Task</h3>
                          <div className="space-y-4">
                            <input 
                                autoFocus
                                value={taskTitle}
                                onChange={(e) => setTaskTitle(e.target.value)}
                                placeholder="Task title"
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            />
                            <input 
                                value={taskAssignee}
                                onChange={(e) => setTaskAssignee(e.target.value)}
                                placeholder="Assignee (optional)"
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            />
                          </div>
                          <div className="flex justify-end gap-2 pt-4">
                              <button onClick={() => setActiveModal('none')} className="px-5 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors">Cancel</button>
                              <button onClick={handleAssignTask} disabled={!taskTitle} className="px-6 py-2 text-sm font-medium bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">Assign</button>
                          </div>
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* Header */}
      <div className="h-16 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 flex-shrink-0 bg-white dark:bg-slate-900 z-10 w-full">
         <div className="flex items-center gap-2 relative" ref={spaceMenuRef}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm ${session.title ? 'bg-indigo-600' : 'bg-slate-500'}`}>
                {session.title ? session.title[0].toUpperCase() : 'S'}
            </div>
            <div className="flex flex-col">
                <button 
                    onClick={() => setShowSpaceMenu(!showSpaceMenu)}
                    className="flex items-center gap-1 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 px-2 py-0.5 rounded -ml-2 transition-colors outline-none"
                >
                    <span className="font-medium text-slate-900 dark:text-white">{session.title || 'Untitled Space'}</span>
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                </button>
                <span className="text-xs text-slate-500 dark:text-slate-400 -mt-0.5 flex items-center gap-1 px-2 -ml-2">
                    {session.members?.length || 1} member{(!session.members || session.members.length !== 1) ? 's' : ''} • Private
                </span>
            </div>

            {/* SPACE MENU DROPDOWN */}
            {showSpaceMenu && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-50 py-2 animate-in fade-in zoom-in-95 duration-100 origin-top-left overflow-hidden">
                    <button onClick={() => { setShowSpaceMenu(false); setActiveModal('addMember'); }} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3">
                        <Users size={18} className="text-slate-500" /> Manage members
                    </button>
                    <button onClick={() => { setShowSpaceMenu(false); showDemoAlert(); }} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3">
                        <Settings size={18} className="text-slate-500" /> Space settings
                    </button>
                    <button onClick={() => { setShowSpaceMenu(false); showDemoAlert(); }} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3">
                        <Info size={18} className="text-slate-500" /> Space details
                    </button>
                    <button onClick={() => { setShowSpaceMenu(false); showDemoAlert(); }} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3">
                        <LayoutGrid size={18} className="text-slate-500" /> Apps & integrations
                    </button>
                    <button onClick={() => { setShowSpaceMenu(false); showDemoAlert(); }} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3">
                        <Link size={18} className="text-slate-500" /> Copy link to this space
                    </button>
                    
                    <div className="my-1 border-t border-slate-100 dark:border-slate-700"></div>
                    
                    <button onClick={() => { setShowSpaceMenu(false); }} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3">
                        <MessageSquare size={18} className="text-slate-500" /> Mark as unread
                    </button>
                    <button onClick={() => { setShowSpaceMenu(false); }} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3">
                        <Pin size={18} className="text-slate-500" /> Pin
                    </button>
                    <button onClick={() => { setShowSpaceMenu(false); }} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3">
                        <Bell size={18} className="text-slate-500" /> Notifications
                    </button>
                    <button onClick={() => { setShowSpaceMenu(false); }} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3">
                        <Clock size={18} className="text-slate-500" /> Turn off history
                        <div className="ml-auto text-[10px] text-slate-400 max-w-[100px] leading-tight text-right">Deletes new messages in 24 hours</div>
                    </button>

                    <div className="my-1 border-t border-slate-100 dark:border-slate-700"></div>

                    <button onClick={() => { setShowSpaceMenu(false); alert("Left space"); }} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3">
                        <LogOut size={18} className="text-slate-500" /> Leave
                    </button>
                    <button onClick={() => { setShowSpaceMenu(false); alert("Blocked"); }} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3">
                        <Ban size={18} className="text-slate-500" /> Block
                    </button>
                    <button onClick={() => { setShowSpaceMenu(false); setShowDeleteConfirm(true); }} className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3">
                        <Trash2 size={18} /> Delete
                        <div className="ml-auto text-[10px] text-slate-400 max-w-[100px] leading-tight text-right hidden sm:block">Delete conversation and all contents</div>
                    </button>
                </div>
            )}
         </div>

         <div className="flex items-center gap-6 text-sm font-medium text-slate-500 dark:text-slate-400 h-16">
             <button 
                onClick={() => setActiveTab('chat')}
                className={`${activeTab === 'chat' ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400' : 'hover:text-slate-800 dark:hover:text-slate-200'} transition-colors h-full px-2 mt-0.5`}
             >
                Chat
             </button>
             <button 
                onClick={() => setActiveTab('shared')}
                className={`${activeTab === 'shared' ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400' : 'hover:text-slate-800 dark:hover:text-slate-200'} transition-colors h-full px-2 mt-0.5`}
             >
                Shared
             </button>
             <button 
                onClick={() => setActiveTab('tasks')}
                className={`${activeTab === 'tasks' ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400' : 'hover:text-slate-800 dark:hover:text-slate-200'} transition-colors h-full px-2 mt-0.5`}
             >
                Tasks
             </button>
         </div>

         <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
             <Search className="w-5 h-5 hover:text-slate-800 dark:hover:text-white cursor-pointer" />
             <Monitor className="w-5 h-5 hover:text-slate-800 dark:hover:text-white cursor-pointer" />
         </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden relative w-full">
        {/* --- CHAT TAB CONTENT --- */}
        {activeTab === 'chat' && (
            <>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 w-full">
                    {messages.length <= 1 ? (
                        // Welcome / Empty State
                        <div className="h-full flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-500 pb-12 w-full">
                            <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full text-xs font-bold mb-8">
                                <div className="bg-blue-600 rounded-full w-4 h-4 flex items-center justify-center">
                                    <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                </div>
                                History on
                            </div>

                            {/* REPLACED IMAGE WITH ICON */}
                            <div className="w-64 h-64 mb-6 opacity-20 dark:opacity-10 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center">
                                <Users size={80} className="text-slate-500 dark:text-slate-300" />
                            </div>

                            <div className="text-center max-w-lg mx-auto">
                                <span className="inline-block bg-slate-100 dark:bg-slate-800 text-xs px-2 py-1 rounded mb-2 text-slate-500">Today</span>
                                <h2 className="text-lg text-slate-900 dark:text-white font-medium mb-1">
                                    {user?.full_name || 'User'}, welcome to your new collaboration space!
                                </h2>
                                <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
                                    Let's get started:
                                </p>

                                <div className="flex flex-wrap justify-center gap-3">
                                    <button onClick={() => setActiveModal('addMember')} className="flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors">
                                        <UserPlus className="w-4 h-4" /> Add members
                                    </button>
                                    <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors">
                                        <FileText className="w-4 h-4" /> Share a file
                                    </button>
                                    <button onClick={() => setActiveModal('assignTask')} className="flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors">
                                        <CheckSquare className="w-4 h-4" /> Assign tasks
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4 w-full">
                            {messages.slice(1).map((msg) => ( 
                                <div key={msg.id} className="flex gap-4 group">
                                    <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center flex-shrink-0 text-indigo-600 dark:text-indigo-300 font-bold">
                                        {msg.role === 'user' ? (user?.full_name?.[0] || 'U') : <Monitor size={18} />}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-baseline gap-2">
                                            <span className="font-bold text-slate-900 dark:text-white text-sm">
                                                {msg.role === 'user' ? (user?.full_name || 'You') : 'System'}
                                            </span>
                                            <span className="text-xs text-slate-500 dark:text-slate-400">
                                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <div className="text-sm text-slate-800 dark:text-slate-200 mt-1 prose prose-sm dark:prose-invert max-w-none">
                                            <ReactMarkdown>{msg.text}</ReactMarkdown>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="p-4 bg-white dark:bg-slate-900 w-full flex-shrink-0">
                    <div className="flex items-end gap-3 max-w-5xl mx-auto w-full">
                        
                        {/* Plus Menu */}
                        <div className="relative" ref={plusMenuRef}>
                            <button 
                                onClick={() => setShowPlusMenu(!showPlusMenu)}
                                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors flex-shrink-0 mb-1 ${showPlusMenu ? 'bg-slate-200 dark:bg-slate-700 rotate-45' : 'bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-900/60 text-slate-700 dark:text-slate-200'}`}
                            >
                                <Plus className="w-5 h-5" />
                            </button>
                            
                            {showPlusMenu && (
                                <div className="absolute bottom-full left-0 mb-2 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in zoom-in-95 duration-100 z-50">
                                    <button onClick={() => { fileInputRef.current?.click(); }} className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200">
                                        <div className="p-2 bg-red-100 rounded-full text-red-600"><FileText size={16} /></div> Share a file
                                    </button>
                                    <button onClick={() => {}} className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200">
                                        <div className="p-2 bg-blue-100 rounded-full text-blue-600"><Calendar size={16} /></div> Calendar invite
                                    </button>
                                    <button onClick={() => setActiveModal('addMember')} className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200">
                                        <div className="p-2 bg-green-100 rounded-full text-green-600"><UserPlus size={16} /></div> Add members
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Hidden File Input */}
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            onChange={handleFileSelect}
                        />

                        {/* Rich Input Container */}
                        <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-2xl p-2 transition-all duration-200 focus-within:bg-white dark:focus-within:bg-slate-900 focus-within:ring-2 focus-within:ring-blue-100 dark:focus-within:ring-blue-900/30 focus-within:shadow-md border border-transparent focus-within:border-slate-200 dark:focus-within:border-slate-700 w-full">
                            {showFormatBar && (
                                <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-700 pb-2 mb-2 px-2 overflow-x-auto">
                                    <button className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300"><Bold size={16} /></button>
                                    <button className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300"><Italic size={16} /></button>
                                    <button className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300"><Underline size={16} /></button>
                                    <div className="w-px h-4 bg-slate-300 mx-1"></div>
                                    <button className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300"><List size={16} /></button>
                                    <button className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300"><Link size={16} /></button>
                                    <button className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300"><Code size={16} /></button>
                                </div>
                            )}
                            
                            <textarea 
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }}}
                                placeholder="History is on"
                                className="w-full bg-transparent border-none outline-none text-sm text-slate-800 dark:text-white px-3 py-2 resize-none max-h-32 min-h-[40px]"
                                rows={1}
                            />

                            <div className="flex items-center justify-between px-2 pt-1">
                                <div className="flex items-center gap-1">
                                    <button 
                                        onClick={() => setShowFormatBar(!showFormatBar)}
                                        className={`p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors ${showFormatBar ? 'bg-slate-200 dark:bg-slate-700 text-blue-600' : ''}`}
                                    >
                                        <div className="font-serif font-bold text-lg leading-none">A</div>
                                    </button>
                                    <button className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors">
                                        <Smile size={20} />
                                    </button>
                                    <button className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors">
                                        <ImageIcon size={20} />
                                    </button>
                                    <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors">
                                        <Paperclip size={20} />
                                    </button>
                                </div>
                                <button 
                                    onClick={handleSend}
                                    disabled={!input.trim()}
                                    className={`p-2 rounded-lg transition-colors ${input.trim() ? 'text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20' : 'text-slate-300 dark:text-slate-600 cursor-not-allowed'}`}
                                >
                                    <Send size={20} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </>
        )}

        {/* --- SHARED TAB CONTENT --- */}
        {activeTab === 'shared' && (
            <div className="flex-1 flex flex-col overflow-y-auto w-full relative">
                {/* Info Icon */}
                <button 
                    onClick={showDemoAlert}
                    className="absolute top-4 right-6 p-2 text-slate-400 hover:text-blue-600 dark:text-slate-500 dark:hover:text-blue-400 transition-colors z-20"
                    title="Demo Info"
                >
                    <Info size={20} />
                </button>

                {/* Action Bar */}
                <div className="px-6 py-4 flex-shrink-0">
                    <button onClick={() => fileInputRef.current?.click()} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full text-sm font-medium transition-colors">
                        Add
                    </button>
                </div>
                
                {/* Empty State */}
                <div className="flex-1 flex flex-col items-center justify-center p-8 animate-in fade-in zoom-in-95 duration-300 w-full">
                    {/* REPLACED IMAGE WITH ICON */}
                    <div className="w-64 h-64 mb-6 opacity-20 dark:opacity-10 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center">
                        <FolderOpen size={80} className="text-slate-500 dark:text-slate-300" />
                    </div>

                    <h2 className="text-xl font-normal text-slate-800 dark:text-white mb-2">
                        No shared files yet
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 mb-8 text-sm">
                        Files shared with the space show here
                    </p>
                    <button 
                        onClick={() => fileInputRef.current?.click()} 
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-full text-sm font-medium transition-colors shadow-sm"
                    >
                        Share a file
                    </button>
                </div>
            </div>
        )}

        {/* --- TASKS TAB CONTENT --- */}
        {activeTab === 'tasks' && (
            <div className="flex-1 flex flex-col overflow-y-auto w-full relative">
                {/* Info Icon */}
                <button 
                    onClick={showDemoAlert}
                    className="absolute top-4 right-6 p-2 text-slate-400 hover:text-blue-600 dark:text-slate-500 dark:hover:text-blue-400 transition-colors z-20"
                    title="Demo Info"
                >
                    <Info size={20} />
                </button>

                {/* Action Bar & Headers */}
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
                    <div className="flex justify-between text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">
                        <div className="flex-1">Title</div>
                        <div className="w-32 text-right">Date</div>
                        <div className="w-32 text-right">Assignee</div>
                        <div className="w-8"></div>
                    </div>
                    
                    <button 
                        onClick={() => setActiveModal('assignTask')}
                        className="flex items-center gap-2 text-blue-600 dark:text-blue-400 border border-slate-300 dark:border-slate-600 rounded-full px-4 py-2 text-sm font-medium hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                    >
                        <CheckCircle2 className="w-4 h-4" />
                        Add space task
                    </button>
                </div>

                {/* Empty State */}
                <div className="flex-1 flex flex-col items-center justify-center p-8 animate-in fade-in zoom-in-95 duration-300 w-full">
                    {/* REPLACED IMAGE WITH ICON */}
                    <div className="w-64 h-64 mb-6 opacity-20 dark:opacity-10 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center">
                        <ListTodo size={80} className="text-slate-500 dark:text-slate-300" />
                    </div>

                    <h2 className="text-xl font-normal text-slate-800 dark:text-white mb-2">
                        No tasks yet
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-center max-w-xs text-sm leading-relaxed">
                        Anyone can create and assign tasks that help keep the team on track
                    </p>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};
