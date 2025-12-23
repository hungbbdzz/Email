
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Email, EmailLabel } from '../types';
import { Search, Star, Inbox, Trash2, Archive, ListFilter, RotateCcw, ArrowUpDown, Check, Menu, ChevronDown, Clock, Mail, MailOpen, MinusSquare, CheckSquare, Square, X, Loader2, Calendar } from 'lucide-react';
import { DateTimePickerModal } from './DateTimePickerModal';

interface EmailListProps {
  emails: Email[];
  selectedEmailId: string | null;
  onSelectEmail: (id: string) => void;
  filterLabel: EmailLabel | 'STARRED' | null;
  viewTitle?: string;
  onRefresh?: () => Promise<void>;
  onStar?: (id: string) => void;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  emailFetchCount: number;
  setEmailFetchCount: (count: number) => void;
  emailFetchDate: Date | null;
  setEmailFetchDate: (date: Date | null) => void;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
  onMarkRead?: (id: string, isRead: boolean) => void;
  onSnooze?: (id: string, date: Date) => void;
}

type SortOrder = 'newest' | 'oldest';
type FilterOption = 'all' | 'new' | 'read' | 'STARRED' | EmailLabel;
type SelectionType = 'all' | 'none' | 'read' | 'unread' | 'starred' | 'unstarred';

export const EmailList: React.FC<EmailListProps> = ({ 
  emails, 
  selectedEmailId, 
  onSelectEmail, 
  filterLabel,
  viewTitle = 'Inbox',
  onRefresh,
  onStar,
  isSidebarOpen,
  onToggleSidebar,
  emailFetchCount,
  setEmailFetchCount,
  emailFetchDate,
  setEmailFetchDate,
  onArchive,
  onDelete,
  onMarkRead,
  onSnooze
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterOption>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSelectMenuOpen, setIsSelectMenuOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [checkedEmailIds, setCheckedEmailIds] = useState<Set<string>>(new Set());
  
  // Snooze State
  const [snoozeMenuOpenId, setSnoozeMenuOpenId] = useState<string | null>(null);
  const [showCustomSnoozeModal, setShowCustomSnoozeModal] = useState(false);
  const [snoozeTargetId, setSnoozeTargetId] = useState<string | null>(null);
  const snoozeMenuRef = useRef<HTMLDivElement>(null);

  const filterRef = useRef<HTMLDivElement>(null);
  const selectMenuRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (filterLabel) {
      setActiveFilter(filterLabel);
    } else {
      setActiveFilter('all');
    }
    setCheckedEmailIds(new Set());
  }, [filterLabel]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
      if (selectMenuRef.current && !selectMenuRef.current.contains(event.target as Node)) {
        setIsSelectMenuOpen(false);
      }
      if (snoozeMenuRef.current && !snoozeMenuRef.current.contains(event.target as Node)) {
        setSnoozeMenuOpenId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleRefreshClick = async () => {
    if (onRefresh) {
      setIsRefreshing(true);
      await onRefresh();
      setTimeout(() => setIsRefreshing(false), 800);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
      const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
      if (scrollHeight - scrollTop <= clientHeight + 50) {
          // Infinite scroll placeholder
      }
  };

  const formatDisplayDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.getDate() === now.getDate() &&
                    date.getMonth() === now.getMonth() &&
                    date.getFullYear() === now.getFullYear();
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    }
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const getBadgeColor = (label: EmailLabel) => {
    switch (label) {
      case EmailLabel.WORK: return 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800';
      case EmailLabel.PERSONAL: return 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800';
      case EmailLabel.PROMOTION: return 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800';
      case EmailLabel.PHISHING: return 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800';
      case EmailLabel.SPAM: return 'bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800';
      case EmailLabel.GAME: return 'bg-violet-50 text-violet-600 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800';
      case EmailLabel.EDUCATION: return 'bg-cyan-50 text-cyan-600 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-800';
      default: return 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
    }
  };

  const getEmptyIcon = () => {
    if (viewTitle === 'Trash') return <Trash2 className="w-12 h-12 mb-3 opacity-20 dark:opacity-10 dark:text-white" />;
    if (viewTitle === 'Archived') return <Archive className="w-12 h-12 mb-3 opacity-20 dark:opacity-10 dark:text-white" />;
    return <Inbox className="w-12 h-12 mb-3 opacity-20 dark:opacity-10 dark:text-white" />;
  };

  // Group emails by threadId OR (subject + sender)
  const groupedThreads = useMemo(() => {
    const filtered = emails.filter(email => {
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        if (!(email.subject.toLowerCase().includes(term) ||
              email.senderName.toLowerCase().includes(term) ||
              email.preview.toLowerCase().includes(term))) {
          return false;
        }
      }
      if (activeFilter === 'new') return !email.isRead;
      if (activeFilter === 'read') return email.isRead;
      if (activeFilter === 'STARRED') return email.isStarred;
      if (activeFilter !== 'all') return email.label === activeFilter;
      return true;
    });

    const groups: Record<string, Email[]> = {};
    
    filtered.forEach(email => {
        // Prefer threadId, fallback to subject grouping for cases like your screenshot where threadId might be missing
        let key = email.threadId;
        if (!key) {
            // Simplify subject to ignore Re:, Fwd:, etc for cleaner grouping if needed, 
            // but for exact "spam" grouping shown in image, exact match is fine.
            key = `${email.subject}_${email.senderEmail}`;
        }
        
        if (!groups[key]) groups[key] = [];
        groups[key].push(email);
    });

    // Convert to array of threads (each thread is an array of emails)
    // Sort emails within thread by date (newest first)
    // Sort threads by date of newest email
    const threadArray = Object.values(groups).map(group => {
        return group.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });

    return threadArray.sort((a, b) => new Date(b[0].date).getTime() - new Date(a[0].date).getTime());
  }, [emails, searchTerm, activeFilter]);

  const handleCheckThread = (e: React.MouseEvent, threadEmails: Email[]) => {
    e.stopPropagation();
    const newSet = new Set(checkedEmailIds);
    const ids = threadEmails.map(e => e.id);
    
    // Check if all are currently selected
    const allSelected = ids.every(id => newSet.has(id));
    
    if (allSelected) {
        ids.forEach(id => newSet.delete(id));
    } else {
        ids.forEach(id => newSet.add(id));
    }
    setCheckedEmailIds(newSet);
  };

  const handleBatchSelect = (type: SelectionType) => {
    const newSet = new Set<string>();
    const allProcessedEmails = groupedThreads.flat();
    
    if (type === 'all') allProcessedEmails.forEach(e => newSet.add(e.id));
    else if (type === 'read') allProcessedEmails.filter(e => e.isRead).forEach(e => newSet.add(e.id));
    else if (type === 'unread') allProcessedEmails.filter(e => !e.isRead).forEach(e => newSet.add(e.id));
    else if (type === 'starred') allProcessedEmails.filter(e => e.isStarred).forEach(e => newSet.add(e.id));
    else if (type === 'unstarred') allProcessedEmails.filter(e => !e.isStarred).forEach(e => newSet.add(e.id));
    setCheckedEmailIds(newSet);
    setIsSelectMenuOpen(false);
  };

  // --- Snooze Logic ---
  const getSnoozeOptions = () => {
    // ... same as before
    const now = new Date();
    const laterToday = new Date();
    laterToday.setHours(18, 0, 0, 0);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(8, 0, 0, 0);
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + (1 + 7 - nextWeek.getDay()) % 7 || 7); 
    nextWeek.setHours(8, 0, 0, 0);

    const options = [];
    if (now.getHours() < 17) {
        options.push({ label: 'Later today', time: '6:00 PM', date: laterToday });
    }
    options.push({ label: 'Tomorrow', time: tomorrow.toLocaleDateString('en-US', { weekday: 'short' }) + ', 8:00 AM', date: tomorrow });
    options.push({ label: 'Next week', time: nextWeek.toLocaleDateString('en-US', { weekday: 'short' }) + ', 8:00 AM', date: nextWeek });
    return options;
  };

  const handleSnoozeOption = (id: string, date: Date) => {
      if (onSnooze) onSnooze(id, date);
      setSnoozeMenuOpenId(null);
  };

  const handleCustomSnooze = (date: Date) => {
      if (onSnooze && snoozeTargetId) onSnooze(snoozeTargetId, date);
      setShowCustomSnoozeModal(false);
      setSnoozeTargetId(null);
  }

  const flatProcessedEmails = groupedThreads.flat();
  const isAllSelected = flatProcessedEmails.length > 0 && checkedEmailIds.size === flatProcessedEmails.length;
  const isPartiallySelected = checkedEmailIds.size > 0 && checkedEmailIds.size < flatProcessedEmails.length;
  const isSelectionMode = checkedEmailIds.size > 0;

  const performBatchAction = (action: 'archive' | 'delete' | 'read' | 'unread') => {
     checkedEmailIds.forEach(id => {
         if (action === 'archive' && onArchive) onArchive(id);
         if (action === 'delete' && onDelete) onDelete(id);
         if (action === 'read' && onMarkRead) onMarkRead(id, true);
         if (action === 'unread' && onMarkRead) onMarkRead(id, false);
     });
     setCheckedEmailIds(new Set());
  };

  return (
    <div className="w-full flex flex-col bg-white dark:bg-slate-900 h-screen transition-colors duration-300">
      
      {/* Header */}
      <div className="px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 flex-shrink-0">
        {!isSelectionMode && (
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                {viewTitle}
                {activeFilter !== 'all' && (
                  <span className="text-slate-400 dark:text-slate-500 font-normal text-sm">
                    / {activeFilter === 'STARRED' ? 'Favorites' : activeFilter === 'new' ? 'Unread' : activeFilter === 'read' ? 'Read' : activeFilter}
                  </span>
                )}
              </h2>
            </div>
          </div>
        )}
        
        <div className="flex items-center gap-3">
           <div className={`relative flex items-center rounded-lg p-1 transition-colors ${isSelectionMode ? 'bg-blue-50 dark:bg-blue-900/30' : 'bg-slate-100 dark:bg-slate-800'}`} ref={selectMenuRef}>
              <div 
                className="p-2 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer text-slate-600 dark:text-slate-400"
                onClick={() => handleBatchSelect(isAllSelected ? 'none' : 'all')}
              >
                  {isAllSelected ? <CheckSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" /> : isPartiallySelected ? <MinusSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" /> : <Square className="w-5 h-5" />}
              </div>
              <button 
                onClick={() => setIsSelectMenuOpen(!isSelectMenuOpen)}
                className="p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400"
              >
                <ChevronDown className="w-4 h-4" />
              </button>

              {isSelectMenuOpen && (
                <div className="absolute left-0 top-full mt-2 w-40 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-20 py-1">
                  <button onClick={() => handleBatchSelect('all')} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700">All</button>
                  <button onClick={() => handleBatchSelect('none')} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700">None</button>
                  <button onClick={() => handleBatchSelect('read')} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700">Read</button>
                  <button onClick={() => handleBatchSelect('unread')} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700">Unread</button>
                </div>
              )}
           </div>

          {isSelectionMode ? (
            <div className="flex-1 flex items-center justify-between animate-in fade-in slide-in-from-left-2 duration-200 bg-blue-50 dark:bg-blue-900/20 rounded-xl px-4 py-2">
               <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                  {checkedEmailIds.size} selected
               </span>
               <div className="flex items-center gap-2">
                  <button onClick={() => performBatchAction('archive')} className="p-2 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded-lg" title="Archive">
                     <Archive className="w-5 h-5" />
                  </button>
                  <button onClick={() => performBatchAction('delete')} className="p-2 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded-lg" title="Delete">
                     <Trash2 className="w-5 h-5" />
                  </button>
                  <button onClick={() => performBatchAction('read')} className="p-2 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded-lg" title="Mark Read">
                     <MailOpen className="w-5 h-5" />
                  </button>
               </div>
            </div>
          ) : (
            <>
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search emails..."
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-slate-200"
                />
              </div>

              <div className="flex gap-2">
                <div className="relative" ref={filterRef}>
                  <button 
                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                    onDoubleClick={() => { setActiveFilter('all'); setIsFilterOpen(false); }}
                    className={`p-2.5 rounded-xl border transition-colors ${
                      isFilterOpen || activeFilter !== 'all' 
                        ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400' 
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                    }`}
                    title="Double-click to clear filter"
                  >
                    <ListFilter className="w-5 h-5" />
                  </button>
                  
                  {isFilterOpen && (
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-20 py-2">
                      <div className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</div>
                      <button onClick={() => { setActiveFilter('all'); setIsFilterOpen(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex justify-between dark:text-slate-200">
                        <span>All Emails</span>
                        {activeFilter === 'all' && <Check className="w-4 h-4 text-blue-600" />}
                      </button>
                      <button onClick={() => { setActiveFilter('new'); setIsFilterOpen(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex justify-between dark:text-slate-200">
                        <span>Unread</span>
                        {activeFilter === 'new' && <Check className="w-4 h-4 text-blue-600" />}
                      </button>
                      <button onClick={() => { setActiveFilter('read'); setIsFilterOpen(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex justify-between dark:text-slate-200">
                        <span>Read</span>
                        {activeFilter === 'read' && <Check className="w-4 h-4 text-blue-600" />}
                      </button>
                      
                      <div className="border-t border-slate-100 dark:border-slate-700 my-2"></div>
                      <div className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Labels</div>
                      {(Object.values(EmailLabel) as string[]).map(label => (
                         <button key={label} onClick={() => { setActiveFilter(label as any); setIsFilterOpen(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex justify-between dark:text-slate-200">
                          <span>{label}</span>
                          {activeFilter === label && <Check className="w-4 h-4 text-blue-600" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button 
                  onClick={handleRefreshClick}
                  className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  <RotateCcw className={`w-5 h-5 ${isRefreshing ? 'animate-spin text-blue-500' : ''}`} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* Pull Down Refresh Indicator */}
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isRefreshing ? 'max-h-16 opacity-100' : 'max-h-0 opacity-0'}`}>
         <div className="flex items-center justify-center p-4 gap-2 text-blue-600 bg-blue-50 dark:bg-blue-900/10 border-b border-blue-100 dark:border-blue-900/30">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm font-medium">Checking for new emails...</span>
         </div>
      </div>

      <div 
        className="flex-1 overflow-y-auto custom-scrollbar" 
        ref={scrollContainerRef}
        onScroll={handleScroll}
      >
        {groupedThreads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500 p-6 text-center">
            {getEmptyIcon()}
            <p className="text-lg font-semibold">{viewTitle} is empty</p>
            <p className="text-sm mt-1">No emails found matching your current filters.</p>
            {(activeFilter !== 'all' || searchTerm) && (
               <button 
                  onClick={() => { setActiveFilter('all'); setSearchTerm(''); }}
                  className="mt-4 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300"
               >
                  Clear Filters
               </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col relative">
            {groupedThreads.map((thread, index) => {
              // The newest email in the thread is the first one in the sorted array
              const email = thread[0];
              const threadCount = thread.length;
              
              // Determine if selected (checks only the latest email's id for simplicity, or check if ANY in thread selected)
              // For visual clarity, if any email in the thread is selected, we mark the thread row as checked
              const isSelected = thread.some(e => checkedEmailIds.has(e.id));
              
              const isSnoozeMenuOpen = snoozeMenuOpenId === email.id;
              
              return (
                <div
                  key={email.id}
                  onClick={() => onSelectEmail(email.id)}
                  className={`group relative flex items-center gap-4 p-4 cursor-pointer transition-all duration-150 border-b border-slate-100 dark:border-slate-800 ${
                    selectedEmailId === email.id
                      ? 'bg-blue-50/50 dark:bg-blue-900/10' 
                      : isSelected
                      ? 'bg-blue-50 dark:bg-blue-900/20'
                      : !email.isRead 
                        ? 'bg-white dark:bg-slate-900 hover:shadow-md hover:z-10' 
                        : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  {/* Unread Indicator Bar */}
                  {!email.isRead && (
                      <div className="absolute left-0 top-3 bottom-3 w-1 bg-blue-600 rounded-r-full"></div>
                  )}

                  {/* Avatar & Selection */}
                  <div className="flex-shrink-0 relative w-10 h-10 group/avatar pl-2 md:pl-0">
                      
                      <img 
                        src={email.avatar} 
                        alt="" 
                        className={`absolute inset-0 w-10 h-10 rounded-full object-cover border border-slate-100 dark:border-slate-700 transition-all duration-200 
                        ${isSelected ? 'opacity-0 scale-75' : 'group-hover:opacity-0 group-hover:scale-75'}`} 
                      />
                      
                      {/* Checkbox Overlay */}
                      <div 
                        className={`absolute inset-0 flex items-center justify-center rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-300 transition-all duration-200 cursor-pointer hover:bg-slate-300 dark:hover:bg-slate-600
                        ${isSelected 
                            ? 'opacity-100 scale-100 bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700' 
                            : 'opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100'}`}
                        onClick={(e) => handleCheckThread(e, thread)}
                      >
                          {isSelected ? <Check size={20} strokeWidth={3} /> : <Square size={20} />}
                      </div>
                  </div>
                  
                  {/* Main Content Container */}
                  <div className="flex-1 min-w-0 flex items-center gap-4">
                      
                      {/* Sender */}
                      <div className="w-20 md:w-32 flex-shrink-0 flex items-center gap-2 overflow-hidden">
                          <div className={`text-sm truncate flex items-center gap-1 ${!email.isRead ? 'font-bold text-slate-900 dark:text-white' : 'font-medium text-slate-700 dark:text-slate-300'}`}>
                              <span>{email.senderName}</span>
                              {threadCount > 1 && (
                                  <span className="text-xs font-normal text-slate-500 dark:text-slate-400">({threadCount})</span>
                              )}
                          </div>
                          {email.label === EmailLabel.PHISHING && <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" title="Phishing Alert"></div>}
                      </div>

                      {/* Subject & Snippet */}
                      <div className="flex-1 min-w-0 flex flex-col md:flex-row md:items-center gap-1 md:gap-2">
                        <span className={`text-sm truncate max-w-full ${!email.isRead ? 'font-bold text-slate-900 dark:text-white' : 'font-medium text-slate-800 dark:text-slate-300'}`}>
                            {email.subject}
                        </span>
                        <span className="text-sm text-slate-500 dark:text-slate-500 truncate flex-1 hidden md:block">
                            - {email.preview}
                        </span>
                        {/* Mobile Label */}
                        {email.label && (
                            <div className="md:hidden mt-1">
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getBadgeColor(email.label)}`}>
                                    {email.label}
                                </span>
                            </div>
                        )}
                      </div>

                      {/* Date & Labels */}
                      <div className="hidden md:flex flex-shrink-0 justify-end items-center gap-3 w-auto min-w-[80px]">
                          {/* Star */}
                          {email.isStarred && (
                             <div className="group-hover:hidden text-yellow-400">
                                <Star className="w-4 h-4 fill-current" />
                             </div>
                          )}

                          {email.label && (
                            <span className={`hidden lg:inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getBadgeColor(email.label)}`}>
                              {email.label}
                            </span>
                          )}
                          <span className={`text-xs whitespace-nowrap group-hover:hidden ${!email.isRead ? 'font-bold text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>
                              {formatDisplayDate(email.date)}
                          </span>
                      </div>
                  </div>

                  {/* Hover Actions */}
                  <div className={`absolute right-4 top-1/2 -translate-y-1/2 ${isSnoozeMenuOpen ? 'flex' : 'hidden group-hover:flex'} items-center gap-1 bg-white/95 dark:bg-slate-900/95 pl-4 shadow-[-8px_0_12px_-4px_rgba(255,255,255,1)] dark:shadow-none rounded-l-xl backdrop-blur-sm z-20`}>
                      <button 
                          onClick={(e) => { e.stopPropagation(); if (onStar) onStar(email.id); }} 
                          className={`p-2 rounded-full ${email.isStarred ? 'text-yellow-400 hover:text-yellow-500' : 'text-slate-400 hover:text-slate-700 dark:hover:text-white'} hover:bg-slate-100 dark:hover:bg-slate-700`}
                          title="Star"
                        >
                          <Star className={`w-4 h-4 ${email.isStarred ? 'fill-current' : ''}`} />
                      </button>
                      <button 
                          onClick={(e) => { e.stopPropagation(); if (onArchive) onArchive(email.id); }} 
                          className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full"
                          title="Archive"
                        >
                          <Archive className="w-4 h-4" />
                      </button>
                      <button 
                          onClick={(e) => { e.stopPropagation(); if (onDelete) onDelete(email.id); }} 
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                      </button>
                      <button 
                          onClick={(e) => { e.stopPropagation(); if (onMarkRead) onMarkRead(email.id, !email.isRead); }} 
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full"
                          title={email.isRead ? "Mark Unread" : "Mark Read"}
                        >
                          {email.isRead ? <Mail className="w-4 h-4" /> : <MailOpen className="w-4 h-4" />}
                      </button>
                      
                      <div className="relative">
                        <button 
                            onClick={(e) => { e.stopPropagation(); setSnoozeMenuOpenId(isSnoozeMenuOpen ? null : email.id); }} 
                            className={`p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${isSnoozeMenuOpen ? 'text-blue-600 bg-slate-100 dark:bg-slate-700' : 'text-slate-400 hover:text-slate-700 dark:hover:text-white'}`}
                            title="Snooze"
                        >
                            <Clock className="w-4 h-4" />
                        </button>
                        
                        {isSnoozeMenuOpen && (
                            <div ref={snoozeMenuRef} className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                                <div className="px-4 py-2 text-sm font-semibold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-700">
                                    Snooze until...
                                </div>
                                <div className="py-1">
                                    {getSnoozeOptions().map((opt, idx) => (
                                        <button 
                                            key={idx}
                                            onClick={(e) => { e.stopPropagation(); handleSnoozeOption(email.id, opt.date); }}
                                            className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 flex justify-between items-center group/opt"
                                        >
                                            <span className="text-sm text-slate-700 dark:text-slate-300">{opt.label}</span>
                                            <span className="text-xs text-slate-400 group-hover/opt:text-slate-500">{opt.time}</span>
                                        </button>
                                    ))}
                                    <div className="border-t border-slate-100 dark:border-slate-700 my-1"></div>
                                    <button 
                                        onClick={(e) => { 
                                            e.stopPropagation(); 
                                            setSnoozeTargetId(email.id); 
                                            setShowCustomSnoozeModal(true); 
                                            setSnoozeMenuOpenId(null); 
                                        }}
                                        className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300"
                                    >
                                        <Calendar className="w-4 h-4 text-slate-400" />
                                        <span>Pick date & time</span>
                                    </button>
                                </div>
                            </div>
                        )}
                      </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      <DateTimePickerModal 
        isOpen={showCustomSnoozeModal}
        onClose={() => { setShowCustomSnoozeModal(false); setSnoozeTargetId(null); }}
        onSave={handleCustomSnooze}
      />
    </div>
  );
};