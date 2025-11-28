
import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, Bot, Loader2, Trash2, MessageCircle, ChevronDown, 
  Sparkles, ExternalLink, Plus, Search, Menu, MessageSquare, Upload
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ai } from '../services/geminiService';
import { Message, ModelType, Email, EmailLabel, UserProfile, ChatSession } from '../types';
import { FunctionDeclaration, Type, Chat } from "@google/genai";
import { useOutsideClick } from '../hooks/useOutsideClick';
import { createChatSession, getChatMessages, saveChatMessage, deleteChatSession } from '../services/supabase';
import { ConfirmModal } from './ConfirmModal';

interface ChatbotProps {
  isOpen: boolean;
  onClose: () => void;
  emails: Email[];
  stats: any[];
  onFilter: (label: EmailLabel | 'STARRED' | null) => void;
  onSelectEmail: (id: string) => void;
  onDeleteEmail: (id: string) => void;
  user: UserProfile | null;
  addModelLog: (action: string, details: string, status: string) => void;
  currentSessionId: string | null;
  setCurrentSessionId: (id: string | null) => void;
  chatSessions: ChatSession[];
  onRefreshSessions: () => void;
}

const DEFAULT_SUGGESTIONS = [
  "📧 Tóm tắt mail chưa đọc",
  "🚨 Kiểm tra mail lừa đảo",
  "💼 Lọc mail công việc",
  "🎲 Đại đại (Random)",
];

export const Chatbot: React.FC<ChatbotProps> = ({ 
  isOpen,
  onClose,
  emails, 
  user, 
  onFilter, 
  onSelectEmail, 
  onDeleteEmail, 
  addModelLog,
  currentSessionId,
  setCurrentSessionId,
  chatSessions,
  onRefreshSessions
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [model, setModel] = useState<string>(ModelType.FLASH_2_0);
  const [suggestions, setSuggestions] = useState<string[]>(DEFAULT_SUGGESTIONS);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [activeEmailId, setActiveEmailId] = useState<string | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  
  // Drag & Drop State
  const [isDragging, setIsDragging] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatSessionRef = useRef<Chat | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Restore Outside Click
  useOutsideClick(chatContainerRef, () => {
      if (isOpen) {
          onClose();
      }
  });

  // Load Messages when sessionId changes
  useEffect(() => {
    if (currentSessionId) {
        loadMessages(currentSessionId);
    } else {
        setMessages([]); 
        setSuggestions(DEFAULT_SUGGESTIONS);
    }
  }, [currentSessionId]);

  const loadMessages = async (sessionId: string) => {
      const msgs = await getChatMessages(sessionId);
      if (msgs.length === 0) {
          const welcomeMsg: Message = {
              id: 'welcome',
              role: 'model',
              text: `Chào bạn ${user?.full_name || ''}! Tôi có thể giúp lọc mail, mở mail, tóm tắt hoặc soạn thảo trả lời.`,
              timestamp: Date.now()
          };
          setMessages([welcomeMsg]);
      } else {
          setMessages(msgs);
      }
      setTimeout(scrollToBottom, 200);
  };

  const handleCreateSession = async () => {
      if (!user) return;
      setMessages([]);
      setCurrentSessionId(null);
      setSuggestions(DEFAULT_SUGGESTIONS);
      const newSession = await createChatSession(user.id, "New Conversation");
      if (newSession) {
          onRefreshSessions();
          setCurrentSessionId(newSession.id);
      }
  };

  const handleDeleteClick = (sessionId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setSessionToDelete(sessionId);
  }

  const confirmDeleteSession = async () => {
      if (!sessionToDelete) return;
      
      await deleteChatSession(sessionToDelete);
      onRefreshSessions();
      
      if (currentSessionId === sessionToDelete) {
          setCurrentSessionId(null);
          setMessages([]);
      }
      setSessionToDelete(null);
  };

  const scrollToBottom = () => {
    setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  // Re-initialize chat session when emails change to update context
  useEffect(() => {
    if (isOpen && !isLoading) {
       initializeChatSession();
    }
  }, [emails, isOpen]);

  const getEmailContextSummary = () => {
    return emails.slice(0, 20).map(e => ({
      id: e.id,
      from: e.senderName,
      subject: e.subject,
      date: e.date,
      isRead: e.isRead,
      label: e.label,
      snippet: e.preview.substring(0, 60)
    }));
  };

  const initializeChatSession = () => {
    const tools: FunctionDeclaration[] = [
      {
        name: "filter_emails",
        description: "Filter the email list by a specific category label or status.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            category: {
              type: Type.STRING,
              description: "Values: 'Work', 'Personal', 'Promotion', 'Social', 'Spam', 'Phishing', 'Game', 'Education', 'STARRED', 'ALL'.",
            },
          },
          required: ["category"],
        },
      },
      {
        name: "open_email",
        description: "Open a specific email. REQUIRED when user asks to 'read', 'open', or 'view' an email.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            emailId: {
              type: Type.STRING,
              description: "The ID of the email to open.",
            },
          },
          required: ["emailId"],
        },
      },
      {
        name: "close_email",
        description: "Close the currently open email and return to the list view.",
        parameters: {
          type: Type.OBJECT,
          properties: {},
        },
      },
      {
        name: "delete_email",
        description: "Move an email to trash.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            emailId: {
              type: Type.STRING,
              description: "The ID of the email to delete.",
            },
          },
          required: ["emailId"],
        },
      },
      {
        name: "get_email_full_content",
        description: "Get the FULL content of an email. Use this BEFORE summarizing or drafting a reply.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            emailId: {
              type: Type.STRING,
              description: "The ID of the email.",
            },
          },
          required: ["emailId"],
        },
      },
      {
        name: "suggest_actions",
        description: "Update the UI suggestion chips for the user. Call this at the END of every turn to give the user relevant next steps.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            suggestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "A list of 3-4 short, concise action texts. Example: ['Yes', 'No'] or ['Reply', 'Delete'].",
            },
          },
          required: ["suggestions"],
        },
      }
    ];

    const systemInstruction = `
      You are an intelligent email assistant for ${user?.full_name || 'the user'}.
      
      CURRENT INBOX SNAPSHOT (Top 20 Ordered by Date):
      ${JSON.stringify(getEmailContextSummary())}

      BEHAVIOR RULES:
      1. **Context Awareness**: Use the snapshot to understand what the user sees.
      2. **Tool Execution**: When you execute a tool, your job is NOT done. You MUST return a text response summarizing what you just did.
         - **Opening Email**: If you run 'open_email', your text response MUST summarize who sent it and what the subject is. Do NOT say "I opened it" and stop.
         - **Filtering**: State "I have filtered the list to [Category]".
      3. **Suggestions (CRITICAL)**: You control the quick-action buttons. **You MUST call the 'suggest_actions' tool at the end of EVERY response.**
         - If you ask a Yes/No question, your suggestions MUST be ["✅ Có", "❌ Không"].
         - If you just opened an email, suggest ["Tóm tắt", "Soạn trả lời", "Đóng"].
         - Always include "🎲 Đại đại (Random)" as the last option if generic.
      
      4. **Opening Emails**: If user says "Open latest", pick the first ID from snapshot and call 'open_email'.
      5. **Drafting**: To reply, first 'get_email_full_content', then draft a response.
      6. **Link Format**: Use **[Subject](action:open_email?id=ID)** when listing emails.

      Be concise. Speak Vietnamese if the user speaks Vietnamese.
    `;

    try {
      chatSessionRef.current = ai.chats.create({
        model: model,
        config: {
          systemInstruction: systemInstruction,
          tools: [{ functionDeclarations: tools }],
        }
      });
    } catch (e) {
      console.error("Failed to init chat session", e);
    }
  };

  const executeTool = async (functionCall: any): Promise<any> => {
    const { name, args } = functionCall;
    console.log("Executing Tool:", name, args);
    addModelLog('Tool Execution', `Calling ${name}`, 'Pending');

    try {
      switch (name) {
        case "suggest_actions":
            // This tool updates the UI state directly
            if (args.suggestions && Array.isArray(args.suggestions)) {
                setSuggestions(args.suggestions);
            }
            return { result: "Suggestions updated on UI." };

        case "filter_emails":
          const cat = args.category;
          if (cat === 'ALL') onFilter(null);
          else onFilter(cat as any);
          
          setActiveEmailId(null);
          return { result: `Filtered view to ${cat}` };

        case "open_email":
          if (args.emailId) {
            onSelectEmail(args.emailId);
            setActiveEmailId(args.emailId);
            
            // Return the email details so model knows what it just opened
            const openedEmail = emails.find(e => e.id === args.emailId);
            if (openedEmail) {
                return { 
                    result: "SUCCESS: Email opened in UI.",
                    email_details: {
                        subject: openedEmail.subject,
                        sender: openedEmail.senderName,
                        preview: openedEmail.preview,
                        note: "Summarize this email for the user immediately."
                    }
                };
            }
            return { result: `Opened email ${args.emailId}.` };
          }
          return { error: "Email ID not found" };

        case "close_email":
          onSelectEmail(""); 
          setActiveEmailId(null);
          return { result: "Closed email and returned to list." };

        case "delete_email":
           const idToDelete = args.emailId || activeEmailId;
           if (idToDelete) {
             onDeleteEmail(idToDelete);
             setActiveEmailId(null);
             return { result: `Deleted email ${idToDelete}` };
           }
           return { error: "No email specified to delete" };

        case "get_email_full_content":
           const targetId = args.emailId || activeEmailId;
           const targetEmail = emails.find(e => e.id === targetId);
           if (targetEmail) {
             return { 
               subject: targetEmail.subject,
               sender: targetEmail.senderName,
               body: targetEmail.body.substring(0, 5000), 
               is_phishing: targetEmail.label === 'Phishing'
             };
           }
           return { error: "Email not found. User might need to open it first." };

        default:
          return { error: "Unknown tool" };
      }
    } catch (e: any) {
      addModelLog('Tool Error', e.message, 'Error');
      return { error: e.message };
    }
  };

  const handleSend = async (textOverride?: string) => {
    let textDisplay = textOverride || input;
    if (!textDisplay.trim() || isLoading) return;

    const lowerText = textDisplay.toLowerCase().trim();
    if (['đại đại', 'random', 'ngẫu nhiên', 'gì cũng được', 'chọn bừa đi'].includes(lowerText)) {
        const viableSuggestions = suggestions.filter(s => 
            !s.toLowerCase().includes('đại đại') && 
            !s.toLowerCase().includes('random')
        );
        
        if (viableSuggestions.length > 0) {
            const randomChoice = viableSuggestions[Math.floor(Math.random() * viableSuggestions.length)];
            textDisplay = randomChoice;
        } else {
            textDisplay = "Hãy giúp tôi làm gì đó ngẫu nhiên với hộp thư.";
        }
    }

    // 1. Create Session if needed
    let sessionIdToUse = currentSessionId;
    if (!sessionIdToUse) {
        if (!user) return;
        const newSession = await createChatSession(user.id, textDisplay.substring(0, 30) + "...");
        if (newSession) {
            onRefreshSessions();
            setCurrentSessionId(newSession.id);
            sessionIdToUse = newSession.id;
        } else {
            return;
        }
    }

    // 2. UI: Show User Message
    const userMessage: Message = {
      id: 'temp-user-' + Date.now(),
      role: 'user',
      text: textDisplay,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    if (!chatSessionRef.current) initializeChatSession();

    // 3. Logic: Inject Context
    let promptToSend = textDisplay;
    if (activeEmailId) {
       promptToSend = `[SYSTEM_CONTEXT: The user is currently viewing/reading email ID: "${activeEmailId}". If they say "this email", refer to this ID.]\n\n${textDisplay}`;
    }

    try {
      await saveChatMessage(sessionIdToUse!, 'user', textDisplay);

      let result = await chatSessionRef.current!.sendMessage({ message: promptToSend });
      
      let toolTurnCount = 0;
      const MAX_TOOL_TURNS = 3;
      let lastToolAction = "";

      while (result.functionCalls && result.functionCalls.length > 0) {
        if (toolTurnCount >= MAX_TOOL_TURNS) {
            console.warn("Max tool turns reached.");
            break;
        }
        toolTurnCount++;

        const functionCalls = result.functionCalls;
        const functionResponses = [];

        for (const call of functionCalls) {
           // Handle potential undefined call.name by defaulting to empty string
           lastToolAction = call.name || "";
           const toolResult = await executeTool(call);
           functionResponses.push({
             id: call.id,
             name: call.name,
             response: toolResult
           });
        }

        const parts = functionResponses.map(fr => ({
          functionResponse: {
            name: fr.name,
            response: fr.response,
            id: fr.id
          }
        }));

        result = await chatSessionRef.current!.sendMessage({ message: parts });
      }

      // Handle Empty Response scenarios where tool executed but no text returned
      let responseText = result.text;
      
      if (!responseText) {
          if (lastToolAction === 'open_email') {
              responseText = "Tôi đã mở email đó. Bạn có muốn tóm tắt nội dung không?";
          } else if (lastToolAction === 'filter_emails') {
              responseText = "Đã lọc danh sách email theo yêu cầu.";
          } else {
              responseText = "Đã thực hiện xong.";
          }
      }
      
      const botMsgDb = await saveChatMessage(sessionIdToUse!, 'model', responseText);

      const botMessage: Message = {
        id: botMsgDb?.id || Date.now().toString(),
        role: 'model',
        text: responseText,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, botMessage]);
      addModelLog('Chat Response', 'Success', 'Success');

    } catch (error: any) {
      console.error(error);
      let errorText = "Xin lỗi, đã có lỗi xảy ra.";
      
      if (error.message && error.message.includes("429")) {
          errorText = "Tôi đang bị quá tải (Rate Limit). Vui lòng đợi một chút trước khi thử lại.";
      } else if (error.message) {
          errorText += " " + error.message;
      }

      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'model',
        text: errorText,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
      // Simulate file upload message
      const msgText = `Sent file: ${file.name} (${Math.round(file.size/1024)} KB)`;
      await handleSend(msgText);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Safe filter to prevent crash on undefined text
  const filteredMessages = messages.filter(msg => {
    if (!msg.text) return false;
    return msg.text.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const MarkdownComponents = {
    a: ({ href, children, ...props }: any) => {
      if (href && href.startsWith('action:open_email')) {
        const urlParams = new URLSearchParams(href.split('?')[1]);
        const id = urlParams.get('id');
        
        return (
          <button 
            type="button"
            onClick={(e) => {
              e.preventDefault(); 
              e.stopPropagation();
              if (id) {
                onSelectEmail(id);
                setActiveEmailId(id);
              }
            }}
            className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium hover:underline inline-flex items-center gap-0.5 cursor-pointer bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded mx-1 text-xs align-middle"
          >
            <ExternalLink size={10} />
            {children}
          </button>
        );
      }
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline" {...props}>
          {children}
        </a>
      );
    }
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
          await handleFileUpload(e.dataTransfer.files[0]);
      }
  };

  return (
    <>
      <div 
          ref={chatContainerRef}
          className={`fixed bottom-6 right-6 z-50 h-[650px] max-h-[90vh] flex bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] origin-bottom-right ${
            isOpen 
              ? 'scale-100 opacity-100 translate-y-0 pointer-events-auto' 
              : 'scale-90 opacity-0 translate-y-8 pointer-events-none'
          } ${isSidebarVisible ? 'w-[750px]' : 'w-96'}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
      >
         
         {/* --- Drag Overlay --- */}
         {isDragging && (
            <div className="absolute inset-0 z-50 bg-indigo-600/10 backdrop-blur-sm border-4 border-indigo-600/50 border-dashed rounded-none flex flex-col items-center justify-center pointer-events-none animate-in fade-in duration-200">
                <div className="bg-white dark:bg-slate-900 p-4 rounded-full shadow-lg mb-4 animate-bounce">
                    <Upload className="w-8 h-8 text-indigo-600" />
                </div>
                <h3 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">Drop file to share</h3>
            </div>
         )}

         {isSidebarVisible && (
            <div className="w-64 bg-slate-50 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 flex flex-col flex-shrink-0 animate-in slide-in-from-left-2 duration-300">
                <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 uppercase">Library</span>
                    <button onClick={() => setIsSidebarVisible(false)} className="text-slate-400 hover:text-slate-600">
                        <Menu size={14} />
                    </button>
                </div>
                
                <div className="p-3">
                    <button 
                        onClick={handleCreateSession}
                        className="w-full flex items-center gap-2 bg-indigo-600 text-white p-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                        <Plus size={16} />
                        New Chat
                    </button>
                </div>

                <div className="px-3 pb-2">
                    <div className="relative">
                        <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                        <input 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search in chat..."
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg py-2 pl-8 pr-3 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-3 space-y-1 custom-scrollbar">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-4 mb-2">History</p>
                    
                    {chatSessions.map(session => (
                        <div 
                            key={session.id}
                            onClick={() => setCurrentSessionId(session.id)}
                            className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer group transition-colors ${
                                currentSessionId === session.id 
                                ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300' 
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                        >
                            <MessageSquare size={14} className="flex-shrink-0" />
                            <div className="text-xs font-medium truncate flex-1">
                                {session.title || 'Conversation'}
                            </div>
                            <button 
                                onClick={(e) => handleDeleteClick(session.id, e)}
                                className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-opacity"
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>
                    ))}

                    {chatSessions.length === 0 && (
                        <div className="text-center py-4 text-xs text-slate-400 italic">No history yet</div>
                    )}
                </div>
            </div>
         )}

         <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-900">
            <div className="px-4 py-3 bg-indigo-600 text-white flex justify-between items-center cursor-pointer flex-shrink-0" onClick={onClose}>
                <div className="flex items-center gap-2">
                    {!isSidebarVisible && (
                        <button onClick={(e) => { e.stopPropagation(); setIsSidebarVisible(true); }} className="mr-1 hover:bg-white/20 p-1 rounded">
                            <Menu size={16} />
                        </button>
                    )}
                    <Bot size={20} />
                    <h2 className="font-semibold text-sm">Gemini Assistant</h2>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="p-1 hover:bg-white/20 rounded-full">
                        <ChevronDown size={18} />
                    </button>
                </div>
            </div>

            <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center flex-shrink-0">
                <select 
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="text-xs bg-transparent border-none text-slate-600 dark:text-slate-300 focus:ring-0 cursor-pointer"
                >
                    <option value={ModelType.FLASH_2_0}>Gemini 2.0 Flash</option>
                    <option value={ModelType.FLASH}>Gemini 2.5 Flash</option>
                    <option value={ModelType.PRO}>Gemini 3 Pro</option>
                </select>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white dark:bg-slate-900 scroll-smooth">
                {filteredMessages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                    msg.role === 'user' 
                        ? 'bg-indigo-600 text-white rounded-br-none' 
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none border border-slate-200 dark:border-slate-700'
                    }`}>
                        {msg.role === 'user' ? (
                            <div className="whitespace-pre-wrap">{msg.text}</div>
                        ) : (
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                            <ReactMarkdown 
                                components={MarkdownComponents}
                                urlTransform={(url) => url}
                            >
                                {msg.text || ""}
                            </ReactMarkdown>
                            </div>
                        )}
                    </div>
                </div>
                ))}
                {isLoading && (
                <div className="flex justify-start">
                    <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-2xl rounded-bl-none border border-slate-200 dark:border-slate-700 flex items-center gap-2">
                        <Loader2 className="animate-spin text-indigo-600" size={14} />
                        <span className="text-xs text-slate-500">Thinking...</span>
                    </div>
                </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex gap-2 overflow-x-auto no-scrollbar flex-shrink-0 h-12 items-center">
                {suggestions.map((s, i) => (
                    <button
                        key={i}
                        onClick={() => handleSend(s)}
                        className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors whitespace-nowrap flex items-center gap-1 shadow-sm ${
                            s.includes('Có') || s.includes('làm ngay') 
                                ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800' 
                            : s.includes('Không') 
                                ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800'
                            : s.includes('Đại đại')
                                ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800'
                            : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-200 border-slate-200 dark:border-slate-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:border-indigo-200'
                        }`}
                    >
                        {s.includes('Đại đại') && <Sparkles size={10} className="text-purple-500" />}
                        {!s.includes('Đại đại') && <Sparkles size={10} className="text-indigo-500" />}
                        {s}
                    </button>
                ))}
            </div>

            <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex-shrink-0">
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-full px-4 py-2 border border-slate-200 dark:border-slate-700">
                    <input 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder="Nhập 'đại đại' để chọn ngẫu nhiên..."
                        className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400"
                    />
                    <button 
                        onClick={() => handleSend()}
                        disabled={!input.trim() || isLoading}
                        className={`p-1.5 rounded-full ${!input.trim() || isLoading ? 'text-slate-400' : 'text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30'}`}
                    >
                        <Send size={18} />
                    </button>
                </div>
            </div>
         </div>
      </div>

      <ConfirmModal 
        isOpen={!!sessionToDelete}
        onClose={() => setSessionToDelete(null)}
        onConfirm={confirmDeleteSession}
        title="Xóa đoạn chat này?"
        message="Hành động này sẽ xóa vĩnh viễn đoạn hội thoại này. Bạn có chắc chắn không?"
        confirmLabel="Xóa"
        cancelLabel="Hủy"
        isDestructive={true}
      />
    </>
  );
};
