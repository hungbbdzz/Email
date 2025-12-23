import React, { useState, useRef, useMemo, useEffect } from 'react';
import { X, Minus, Paperclip, Trash2, Loader2, Mic, Sparkles, Plus, Send, Smile, Users, MoreHorizontal } from 'lucide-react';
import { Email, ComposeMode } from '../types';
import { sendGmailMessage, SendEmailParams, supabase } from '../services/supabase';
import { useOutsideClick } from '../hooks/useOutsideClick';
import { generateEmailAutocomplete } from '../services/geminiService';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  allEmails: Email[];
  initialTo?: string;
  initialSubject?: string;
  initialBody?: string;
  mode?: ComposeMode;
}

const COMMON_EMOJIS = [
    "😀", "😂", "😅", "🥰", "😍", "🤩", "🤔", "🫡", 
    "😭", "😤", "👍", "👎", "👋", "🙏", "💪", "🎉", 
    "🔥", "❤️", "💯", "✅", "❌", "⚠️", "📧", "🚀"
];

export const ComposeModal: React.FC<ComposeModalProps> = ({ 
  isOpen, onClose, allEmails, initialTo = '', initialSubject = '', initialBody = '', mode = 'compose' 
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  
  // Fields
  const [to, setTo] = useState(initialTo);
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const [attachments, setAttachments] = useState<File[]>([]);
  
  // UI States
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showContactPicker, setShowContactPicker] = useState(false);
  
  // AI & Voice States
  const [suggestion, setSuggestion] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  
  // Refs
  const modalRef = useRef<HTMLDivElement>(null);
  const contactListRef = useRef<HTMLDivElement>(null);
  const toContainerRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any>(null);
  const editorRef = useRef<HTMLTextAreaElement | HTMLDivElement>(null);

  useEffect(() => {
      if (isOpen) {
          setIsMinimized(false);
          setTo(initialTo);
          setSubject(initialSubject);
          setBody(initialBody);
          setSuggestion('');
          setShowEmojiPicker(false);
          setShowContactPicker(false);
      }
  }, [isOpen, initialTo, initialSubject, initialBody, mode]);

  // Autocomplete Logic (Debounced)
  useEffect(() => {
      if (!body || body.length < 5) {
          setSuggestion('');
          return;
      }

      // Clear previous timeout
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

      // Set new timeout to query Gemini
      typingTimeoutRef.current = setTimeout(async () => {
          if (mode === 'forward') return; // Don't autocomplete on forwards usually
          setIsAiLoading(true);
          const suggestionText = await generateEmailAutocomplete(subject, to, body);
          setSuggestion(suggestionText);
          setIsAiLoading(false);
      }, 1000); // Wait 1s after typing stops

      return () => {
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      };
  }, [body, subject, to, mode]);

  useOutsideClick(modalRef, (e) => {
      if (contactListRef.current && contactListRef.current.contains(e.target as Node)) return;
      if (emojiPickerRef.current && emojiPickerRef.current.contains(e.target as Node)) return;
      if (isOpen && !isMinimized) {
          setIsMinimized(true);
      }
  });

  // Use toContainerRef to handle closing when clicking outside the input AND the dropdown
  useOutsideClick(toContainerRef, () => setShowContactPicker(false));
  useOutsideClick(emojiPickerRef, () => setShowEmojiPicker(false));

  // --- Voice Input ---
  const startListening = (lang: 'en-US' | 'vi-VN') => {
      if (!('webkitSpeechRecognition' in window)) {
          alert("Speech recognition not supported in this browser.");
          return;
      }
      
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = lang;
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      
      recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setBody(prev => prev + (prev ? ' ' : '') + transcript);
      };

      recognition.start();
  };

  // --- Drag & Drop ---
  const handleDragEnter = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          setAttachments(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
      }
  };

  const uniqueContacts = useMemo(() => {
    const contacts = new Map<string, string>();
    allEmails.forEach(e => {
        // Sender (From)
        if (e.senderEmail && !contacts.has(e.senderEmail)) {
            contacts.set(e.senderEmail, e.senderName || e.senderEmail);
        }
        
        // Recipient (To) - Parse potential multiple emails
        if (e.to) {
            const recipients = e.to.split(',');
            recipients.forEach(r => {
                const clean = r.trim();
                if(!clean) return;
                // Try to parse "Name <email>" format
                const match = clean.match(/(.*)<(.+)>/);
                if (match) {
                    const name = match[1].trim().replace(/^"|"$/g, '');
                    const email = match[2].trim();
                    if (email && !contacts.has(email)) {
                        contacts.set(email, name || email);
                    }
                } else {
                    // Assuming just an email address
                    if (!contacts.has(clean)) {
                        contacts.set(clean, clean);
                    }
                }
            });
        }
    });
    return Array.from(contacts.entries()).map(([email, name]) => ({ email, name }));
  }, [allEmails]);

  const getFilteredContacts = (query: string) => {
    const lower = query ? query.toLowerCase() : '';
    // Always return suggestions, filtered if query exists
    return uniqueContacts.filter(c => 
        !lower || c.name.toLowerCase().includes(lower) || c.email.toLowerCase().includes(lower)
    ).slice(0, 50); // Limit to 50 results
  };

  const handleSend = async () => {
    if (!to) { alert("Please add a recipient."); return; }
    setIsSending(true);
    try {
        const { data: { session } } = await supabase!.auth.getSession();
        if (!session?.provider_token) throw new Error("Authentication required");

        const params: SendEmailParams = {
            to,
            cc: showCc ? cc : undefined,
            bcc: showBcc ? bcc : undefined,
            subject,
            body: body.replace(/\n/g, '<br>'),
            attachments
        };
        await sendGmailMessage(session.provider_token, params);
        onClose(); 
    } catch (e: any) {
        alert("Failed to send: " + e.message);
    } finally {
        setIsSending(false);
    }
  };

  const acceptSuggestion = () => {
      if (suggestion) {
          setBody(prev => prev + " " + suggestion);
          setSuggestion('');
      }
  };

  const insertEmoji = (emoji: string) => {
      setBody(prev => prev + emoji);
      setShowEmojiPicker(false);
  };

  // Keyboard shortcut for accepting suggestion
  const handleKeyDown = (e: React.KeyboardEvent) => {
      if ((e.key === 'Tab' || e.key === 'ArrowRight') && suggestion) {
          e.preventDefault();
          acceptSuggestion();
      }
  };

  const ContactDropdown = ({ field, value, setValue }: { field: 'to'|'cc'|'bcc', value: string, setValue: (v: string) => void }) => {
      if (!showContactPicker || field !== 'to') return null; 
      
      const tokens = value.split(',').map(s => s.trim());
      const lastToken = tokens[tokens.length - 1];
      const suggestions = getFilteredContacts(lastToken); 
      
      if (suggestions.length === 0) return null;

      return (
          <div ref={contactListRef} className="absolute top-full right-0 mt-1 w-72 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl rounded-lg z-50 max-h-64 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-1">
              <div className="p-2 border-b border-slate-100 dark:border-slate-700 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Suggested Contacts
              </div>
              {suggestions.map((c) => (
                  <button
                      key={c.email}
                      className="w-full text-left px-4 py-2 hover:bg-blue-50 dark:hover:bg-slate-700 flex flex-col border-b border-slate-100 dark:border-slate-700 last:border-0 transition-colors"
                      onClick={() => {
                          const valWithoutLast = value.substring(0, value.lastIndexOf(lastToken));
                          const newVal = valWithoutLast ? valWithoutLast + c.email + ', ' : c.email + ', ';
                          setValue(newVal);
                          setShowContactPicker(false);
                      }}
                  >
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-0.5">{c.name}</span>
                      <span className="text-xs text-slate-500 break-all whitespace-normal leading-tight">{c.email}</span>
                  </button>
              ))}
          </div>
      );
  };

  if (!isOpen) return null;

  return (
    <div 
        ref={modalRef}
        className={`fixed z-[60] bg-white dark:bg-slate-900 shadow-2xl rounded-t-xl border border-slate-200 dark:border-slate-700 transition-all duration-300 overflow-hidden flex flex-col
        ${isMinimized 
            ? 'bottom-0 right-20 w-72 h-12' 
            : 'bottom-0 right-4 md:right-10 w-[95vw] md:w-[800px] h-[80vh] max-h-[800px]'}
    `}>
        {/* Header */}
        <div 
            className="flex items-center justify-between px-4 py-3 bg-slate-900 text-white cursor-pointer select-none"
            onClick={() => setIsMinimized(!isMinimized)}
        >
            <span className="font-semibold text-sm truncate flex-1">{mode === 'forward' ? 'Forward' : mode === 'reply' ? 'Reply' : 'New Message'}</span>
            <div className="flex items-center gap-2 ml-2">
                <button onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }} className="hover:bg-slate-700 rounded p-0.5">
                    <Minus className="w-4 h-4" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="hover:bg-red-600 rounded p-0.5">
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>

        {/* Body */}
        {!isMinimized && (
            <div className="flex-1 flex flex-col relative" onDragEnter={handleDragEnter}>
                {/* Drag Overlay */}
                {isDragging && (
                    <div 
                        className="absolute inset-0 z-50 bg-blue-500/20 backdrop-blur-sm border-4 border-dashed border-blue-500 rounded-lg flex flex-col items-center justify-center pointer-events-none"
                    >
                        <Plus className="w-16 h-16 text-blue-600 mb-2" />
                        <span className="text-xl font-bold text-blue-700 bg-white/80 px-4 py-1 rounded-full">Drop to Attach</span>
                    </div>
                )}

                {/* Drop Zone Interceptor */}
                <div 
                    className={`absolute inset-0 z-40 ${isDragging ? 'block' : 'hidden'}`}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                />

                <div className="p-3 space-y-2 border-b border-slate-100 dark:border-slate-800 relative bg-white dark:bg-slate-900">
                     {/* TO Field with Auto-Suggestion */}
                     <div className="relative" ref={toContainerRef}>
                         <div className="flex items-center border-b border-slate-100 dark:border-slate-800 pr-1">
                            <span className="text-slate-500 text-sm w-12 px-2">To</span>
                            <input 
                                className="flex-1 p-2 text-sm outline-none bg-transparent dark:text-white placeholder-slate-400" 
                                value={to}
                                onChange={(e) => { setTo(e.target.value); setShowContactPicker(true); }}
                                onFocus={() => setShowContactPicker(true)}
                                onClick={() => setShowContactPicker(true)}
                                autoFocus={mode === 'compose' || mode === 'forward'}
                            />
                            <div className="flex items-center gap-2">
                                <div className="flex text-xs font-medium text-slate-500 dark:text-slate-400 gap-2 mr-1">
                                    <button 
                                        onClick={() => setShowCc(!showCc)} 
                                        className={`hover:text-blue-600 transition-colors ${showCc ? 'text-blue-600 font-bold' : ''}`}
                                    >
                                        Cc
                                    </button>
                                    <button 
                                        onClick={() => setShowBcc(!showBcc)} 
                                        className={`hover:text-blue-600 transition-colors ${showBcc ? 'text-blue-600 font-bold' : ''}`}
                                    >
                                        Bcc
                                    </button>
                                </div>
                                <button 
                                    onClick={() => setShowContactPicker(!showContactPicker)}
                                    className={`p-1.5 rounded-full transition-colors ${showContactPicker ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-slate-100 text-slate-400'}`}
                                    title="Show Contacts"
                                >
                                    <MoreHorizontal className="w-4 h-4" />
                                </button>
                            </div>
                         </div>
                         <ContactDropdown field='to' value={to} setValue={setTo} />
                     </div>

                     {/* CC Field */}
                     {showCc && (
                         <div className="relative animate-in slide-in-from-top-2 fade-in">
                             <div className="flex items-center border-b border-slate-100 dark:border-slate-800">
                                <span className="text-slate-500 text-sm w-12 px-2">Cc</span>
                                <input 
                                    className="flex-1 p-2 text-sm outline-none bg-transparent dark:text-white placeholder-slate-400" 
                                    value={cc}
                                    onChange={(e) => setCc(e.target.value)}
                                />
                             </div>
                         </div>
                     )}

                     {/* BCC Field */}
                     {showBcc && (
                         <div className="relative animate-in slide-in-from-top-2 fade-in">
                             <div className="flex items-center border-b border-slate-100 dark:border-slate-800">
                                <span className="text-slate-500 text-sm w-12 px-2">Bcc</span>
                                <input 
                                    className="flex-1 p-2 text-sm outline-none bg-transparent dark:text-white placeholder-slate-400" 
                                    value={bcc}
                                    onChange={(e) => setBcc(e.target.value)}
                                />
                             </div>
                         </div>
                     )}

                     {/* Subject */}
                     <div className="flex items-center">
                        <span className="text-slate-500 text-sm w-12 px-2">Subject</span>
                        <input 
                            className="flex-1 p-2 text-sm outline-none bg-transparent dark:text-white placeholder-slate-400" 
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                        />
                     </div>
                </div>
                
                {/* Editor Area */}
                <div className="flex-1 relative bg-white dark:bg-slate-900 group">
                    {mode === 'forward' ? (
                        <div 
                            className="absolute inset-0 p-4 text-sm outline-none overflow-y-auto dark:text-slate-200 custom-scrollbar"
                            contentEditable
                            suppressContentEditableWarning
                            onInput={(e) => setBody(e.currentTarget.innerHTML)}
                            dangerouslySetInnerHTML={{ __html: initialBody }} 
                        />
                    ) : (
                        <textarea 
                            ref={editorRef as any}
                            className="absolute inset-0 w-full h-full p-4 text-sm outline-none resize-none bg-transparent dark:text-white custom-scrollbar pb-16"
                            placeholder="Write your email here..."
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            onKeyDown={handleKeyDown}
                        />
                    )}

                    {/* AI Suggestion Overlay (Ghost Text Alternative) */}
                    {suggestion && (
                        <div 
                            onClick={acceptSuggestion}
                            className="absolute bottom-4 left-4 right-4 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 rounded-lg p-2.5 flex items-center gap-3 cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors animate-in slide-in-from-bottom-2 fade-in shadow-sm"
                        >
                            <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
                            <span className="text-sm text-slate-600 dark:text-indigo-200 truncate flex-1">
                                <span className="font-bold text-indigo-600 dark:text-indigo-400 mr-2">Suggestion:</span> 
                                {suggestion}
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-white dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-700">Tab</span>
                        </div>
                    )}
                </div>

                {/* Attachments List */}
                {attachments.length > 0 && (
                    <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-2 bg-slate-50 dark:bg-slate-800/50">
                        {attachments.map((f, i) => (
                            <div key={i} className="flex items-center bg-white dark:bg-slate-700 px-3 py-1 rounded-md shadow-sm text-xs gap-2 border border-slate-200 dark:border-slate-600 dark:text-slate-200">
                                <span className="max-w-[150px] truncate">{f.name}</span>
                                <span className="text-slate-400">({Math.round(f.size/1024)}KB)</span>
                                <button onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}><X className="w-3 h-3 hover:text-red-500" /></button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Footer */}
                <div className="p-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 relative">
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={handleSend}
                            disabled={isSending}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full text-sm font-bold shadow-sm transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send size={16} /> Send</>}
                        </button>
                        
                        <div className="h-6 w-px bg-slate-300 dark:bg-slate-700 mx-1"></div>
                        
                        {/* Voice Controls */}
                        <div className="flex gap-1">
                            <button 
                                onClick={() => startListening('en-US')}
                                className={`p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors ${isListening ? 'text-red-500 animate-pulse bg-red-50 dark:bg-red-900/20' : ''}`}
                                title="Dictate (English)"
                            >
                                <Mic className="w-4 h-4" />
                                <span className="sr-only">EN</span>
                            </button>
                            <button 
                                onClick={() => startListening('vi-VN')}
                                className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-bold w-8 h-8 flex items-center justify-center transition-colors"
                                title="Dictate (Vietnamese)"
                            >
                                VI
                            </button>
                        </div>

                        <label className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full cursor-pointer text-slate-600 dark:text-slate-400 transition-colors" title="Attach files">
                            <Paperclip className="w-5 h-5" />
                            <input type="file" multiple className="hidden" onChange={(e) => e.target.files && setAttachments(prev => [...prev, ...Array.from(e.target.files!)])} />
                        </label>

                        {/* Emoji Picker Button */}
                        <div className="relative">
                            <button 
                                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                className={`p-2 rounded-full transition-colors ${showEmojiPicker ? 'bg-slate-200 dark:bg-slate-800 text-blue-600' : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
                                title="Insert Emoji"
                            >
                                <Smile className="w-5 h-5" />
                            </button>
                            {showEmojiPicker && (
                                <div ref={emojiPickerRef} className="absolute bottom-full left-0 mb-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-lg p-2 w-64 grid grid-cols-8 gap-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                                    {COMMON_EMOJIS.map(emoji => (
                                        <button 
                                            key={emoji} 
                                            onClick={() => insertEmoji(emoji)}
                                            className="w-7 h-7 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-lg transition-colors"
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <button 
                            onClick={async () => {
                                setIsAiLoading(true);
                                const suggestionText = await generateEmailAutocomplete(subject, to, body);
                                setSuggestion(suggestionText);
                                setIsAiLoading(false);
                            }}
                            disabled={isAiLoading}
                            className="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-full text-indigo-500 transition-colors" 
                            title="Force AI Suggestion"
                        >
                            {isAiLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                        </button>
                    </div>
                    
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full text-slate-500 hover:text-red-600 transition-colors" title="Discard">
                        <Trash2 className="w-5 h-5" />
                    </button>
                </div>
            </div>
        )}
    </div>
  );
};