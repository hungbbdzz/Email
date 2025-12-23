
import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { EmailList } from './components/EmailList';
import { EmailDetail } from './components/EmailDetail';
import { Dashboard } from './components/Dashboard';
import { Login } from './components/Login';
import { Chatbot } from './components/Chatbot';
import { SettingsView } from './components/SettingsView';
import { UserProfileModal } from './components/UserProfileModal';
import { ChatView } from './components/ChatView';
import { ChatMentionsView } from './components/ChatMentionsView'; 
import { MeetView } from './components/MeetView';
import { BrowseSpaces } from './components/BrowseSpaces';
import { mockEmails, mockAccuracy } from './services/mockData';
import { ComposeModal } from './components/ComposeModal';
import { ConfirmModal } from './components/ConfirmModal';
import { CreateSpaceModal } from './components/CreateSpaceModal';
import { VerificationModal } from './components/VerificationModal'; 
import ConfigModal from './components/ConfigModal';
import { 
  supabase, 
  subscribeToEmails, 
  fetchGmailWithToken, 
  classifyAndSyncEmails,
  learnFromCorrection,
  markEmailAsRead,
  toggleGmailStar,
  sendGmailMessage,
  updateEmailStarStatus,
  trashGmailMessage,
  deleteGmailMessage,
  saveSupabaseConfig,
  updateUserProfile,
  getChatSessions,
  createChatSession,
  saveChatMessage
} from './services/supabase';
import { vsmService } from './services/vsmService';
import { Email, EmailLabel, UserProfile, ComposeMode, AppModule, ChatSession } from './types';
import { Loader2, ShieldCheck, X, AlertTriangle, MessageCircle, Settings } from 'lucide-react';

// Undo Action Types
type UndoAction = {
  type: 'delete' | 'snooze' | 'archive';
  emailIds: string[];
  message: string;
};

export const App: React.FC = () => {
  const [showProfileModal, setShowProfileModal] = useState(false);
  
  // Sidebar State
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  
  // App Module State (Mail / Chat / Meet)
  const [activeModule, setActiveModule] = useState<AppModule>('mail');

  // Compose Modal State
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeData, setComposeData] = useState<{ to?: string, subject?: string, body?: string, mode?: ComposeMode }>({});

  // Chat State (Lifted Up)
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentChatSessionId, setCurrentChatSessionId] = useState<string | null>(null);
  const [isSpaceModalOpen, setIsSpaceModalOpen] = useState(false);

  // Notifications
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    if (typeof window !== 'undefined' && typeof Notification !== 'undefined') {
      return Notification.permission !== 'denied'; 
    }
    return false;
  });

  const [currentView, setCurrentView] = useState('all'); 
  const [filterLabel, setFilterLabel] = useState<EmailLabel | 'STARRED' | null>(null);
  
  // CHANGED: Initialize with empty array instead of mockEmails
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  
  const isProcessingSession = useRef(false);
  const syncIntervalRef = useRef<any>(null);

  // Undo State
  const [undoAction, setUndoAction] = useState<UndoAction | null>(null);
  const undoTimeoutRef = useRef<any>(null);

  // Delete Confirmation State
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; emailId: string | null }>({ isOpen: false, emailId: null });

  // Notification Permission State
  const [showNotificationRequest, setShowNotificationRequest] = useState(false);

  const [emailFetchCount, setEmailFetchCount] = useState(() => {
    const saved = localStorage.getItem('emailFetchCount');
    return saved ? parseInt(saved, 10) : 50;
  });
  
  const [modelLogs, setModelLogs] = useState<{ timestamp: Date, action: string, details: string, status: string }[]>([]);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  // --- VERIFICATION STATE ---
  const [showVerification, setShowVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState<string | null>(null);
  const [verificationExpiry, setVerificationExpiry] = useState<number>(0); // Timestamp
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [tempSessionData, setTempSessionData] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  
  // Ref to track if we just sent a code (to prevent spam on re-renders/tab switches)
  const isCodeSentRef = useRef(false);

  const addModelLog = (action: string, details: string, status: string) => {
    setModelLogs(prev => [{ timestamp: new Date(), action, details, status }, ...prev]);
  };
  
  // --- THEME LOGIC ---
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'system'>(() => {
    if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('themeMode');
        return (saved === 'light' || saved === 'dark' || saved === 'system') ? saved : 'system';
    }
    return 'system';
  });

  useEffect(() => {
    const applyTheme = () => {
        const root = document.documentElement;
        if (themeMode === 'dark') {
            root.classList.add('dark');
        } else if (themeMode === 'light') {
            root.classList.remove('dark');
        } else {
            if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                root.classList.add('dark');
            } else {
                root.classList.remove('dark');
            }
        }
        localStorage.setItem('themeMode', themeMode);
    };

    applyTheme();

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
        if (themeMode === 'system') applyTheme();
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [themeMode]);

  // --- AUTOMATIC INIT & AUTH ---
  useEffect(() => {
    const initialize = async () => {
      if (!supabase) {
        console.warn("Supabase client not initialized.");
        setIsLoadingSession(false);
        return;
      }

      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
           console.warn("Session check error (stale token):", error.message);
           if (window.location.hash) window.history.replaceState(null, '', window.location.pathname);
           setIsLoadingSession(false);
        } else if (data.session) {
          await handleSessionFound(data.session);
        } else {
          const isRedirect = window.location.hash && window.location.hash.includes('access_token');
          if (!isRedirect) {
            setIsLoadingSession(false);
          } else {
             setTimeout(() => {
                 if (!isProcessingSession.current) setIsLoadingSession(false);
             }, 5000);
          }
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
            handleSessionFound(session);
          } else if (event === 'SIGNED_OUT') {
            if (!isAddingAccount) {
               setUser(null);
               setEmails([]); // CHANGED: Clear emails on sign out
            }
            setIsLoadingSession(false);
            isProcessingSession.current = false;
            sessionStorage.removeItem('is_verified'); // Clear verification on logout
            // We use localStorage for magic link persistence now, but clear it on logout
            localStorage.removeItem('temp_otp_code');
            localStorage.removeItem('temp_otp_expiry');
            isCodeSentRef.current = false; // Reset code sent flag
            if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
            if (window.location.hash) window.history.replaceState(null, '', window.location.pathname);
          }
        });

        return () => subscription.unsubscribe();
      } catch (err) {
        console.error("Auth check error:", err);
        setIsLoadingSession(false);
      }
    };

    initialize();
  }, []);

  // --- BACKGROUND SYNC ---
  useEffect(() => {
    if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);

    if (user && user.id !== 'guest' && supabase) {
        syncIntervalRef.current = setInterval(async () => {
            if (isSyncing) return; 
            
            const { data: { session } } = await supabase!.auth.getSession();
            if (session?.provider_token) {
                try {
                    const count = 20; 
                    const gmailMessages = await fetchGmailWithToken(session.provider_token, count);
                    if (gmailMessages.length > 0) {
                        await classifyAndSyncEmails(gmailMessages, user.id, addModelLog);
                    }
                } catch (e) {
                    console.warn("Background sync error (silent)", e);
                }
            }
        }, 60000); 
    }

    return () => {
        if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    };
  }, [user, isSyncing]);

  useEffect(() => {
    if (user && typeof Notification !== 'undefined' && Notification.permission === 'default') {
      const hasDismissed = sessionStorage.getItem('notification_prompt_dismissed');
      if (!hasDismissed) {
        setTimeout(() => setShowNotificationRequest(true), 1500);
      }
    }
  }, [user]);

  // --- Chat Session Management ---
  const refreshChatSessions = async () => {
      if (user) {
          const sessions = await getChatSessions(user.id);
          setChatSessions(sessions);
      }
  };

  useEffect(() => {
      if (user) {
          refreshChatSessions();
      }
  }, [user]);

  const handleNewChat = async () => {
      if (!user) return;
      setIsChatbotOpen(true);
      setCurrentChatSessionId(null);
  };

  const handleOpenChat = (sessionId: string) => {
      if (sessionId === '') {
          setCurrentChatSessionId(null);
          return;
      }
      const session = chatSessions.find(s => s.id === sessionId);
      if (session) {
          if (session.type === 'space') {
              setIsChatbotOpen(false);
              setActiveModule('chat');
              setCurrentView('chat-home'); 
              setCurrentChatSessionId(sessionId);
          } else {
              setIsChatbotOpen(true);
              setCurrentChatSessionId(sessionId);
          }
      } else {
          setIsChatbotOpen(true);
          setCurrentChatSessionId(sessionId);
      }
  };

  const handleCreateSpace = async (name: string, members: string[]) => {
      if (!user) return;
      const newSession = await createChatSession(user.id, name, 'space', members);
      if (newSession) {
          if (members.length > 0) {
              await saveChatMessage(newSession.id, 'model', `**System:** Added members: ${members.join(', ')}`);
          } else {
              await saveChatMessage(newSession.id, 'model', `**System:** Space created.`);
          }
          await refreshChatSessions();
          setActiveModule('chat'); 
          setCurrentView('chat-home'); 
          setCurrentChatSessionId(newSession.id); 
          setIsChatbotOpen(false); 
      }
  };

  const handleRequestNotificationPermission = async () => {
    setShowNotificationRequest(false);
    try {
      const result = await Notification.requestPermission();
      if (result === 'granted') {
        setNotificationsEnabled(true);
        new Notification('SecureMail AI', { 
          body: 'Notifications enabled successfully!',
          icon: '/vite.svg'
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDismissNotificationRequest = () => {
    setShowNotificationRequest(false);
    sessionStorage.setItem('notification_prompt_dismissed', 'true');
  };

  // --- SESSION HANDLING WITH VERIFICATION ---
  const handleSessionFound = async (session: any) => {
    setIsAddingAccount(false);

    // If verification modal is already open, do not trigger again
    if (showVerification || isProcessingSession.current || (user?.id === session.user.id)) return;
    
    // Check if verification is needed
    const isVerified = sessionStorage.getItem('is_verified') === 'true';
    
    if (!isVerified && session.provider_token) {
        setTempSessionData(session);

        // --- MAGIC LINK CHECK ---
        const params = new URLSearchParams(window.location.search);
        const magicCode = params.get('verify_code');

        if (magicCode && /^\d{6}$/.test(magicCode)) {
            // Check stored code from localStorage (to support new tab opening)
            const storedCode = localStorage.getItem('temp_otp_code');
            const storedExpiry = localStorage.getItem('temp_otp_expiry');
            
            // Only validate if we have a stored code
            let isValid = false;
            if (storedCode === magicCode && storedExpiry && parseInt(storedExpiry) > Date.now()) {
                isValid = true;
            } else if (!storedCode) {
                isValid = true;
            }

            if (isValid) {
                // Clean up URL
                window.history.replaceState({}, document.title, window.location.pathname);
                
                setIsVerifying(true);
                setVerificationCode(magicCode); 
                setShowVerification(true); 

                await new Promise(resolve => setTimeout(resolve, 1500));
                
                sessionStorage.setItem('is_verified', 'true');
                localStorage.removeItem('temp_otp_code');
                localStorage.removeItem('temp_otp_expiry');
                
                setShowVerification(false);
                finalizeLogin(session);
                return;
            }
        }
        // -----------------------

        await sendVerificationCode(session);
    } else {
        await finalizeLogin(session);
    }
  };

  const sendVerificationCode = async (session: any) => {
      const storedCode = localStorage.getItem('temp_otp_code');
      const storedExpiry = localStorage.getItem('temp_otp_expiry');

      if (storedCode && storedExpiry) {
          const expiryTime = parseInt(storedExpiry, 10);
          if (expiryTime > Date.now()) {
              setVerificationCode(storedCode);
              setVerificationExpiry(expiryTime);
              setShowVerification(true);
              setIsLoadingSession(false);
              return;
          } else {
              localStorage.removeItem('temp_otp_code');
              localStorage.removeItem('temp_otp_expiry');
          }
      }

      if (isCodeSentRef.current) return;
      isCodeSentRef.current = true;

      setIsLoadingSession(true);
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiry = Date.now() + 120000; // 2 minutes

      setVerificationCode(code);
      setVerificationExpiry(expiry);
      localStorage.setItem('temp_otp_code', code);
      localStorage.setItem('temp_otp_expiry', expiry.toString());
      
      console.log("DEV DEBUG CODE:", code); 

      const magicLink = `${window.location.origin}${window.location.pathname}?verify_code=${code}`;

      const email = session.user.email;
      const subject = "SecureMail AI - Login Verification Code";
      const body = `
        <div style="font-family: sans-serif; padding: 20px; text-align: center;">
            <h2 style="color: #2563EB;">SecureMail AI Login Request</h2>
            <p>We detected a new login session.</p>
            <p>Your verification code is:</p>
            <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0; color: #1E293B;">${code}</div>
            <p style="margin: 20px 0;">
                <a href="${magicLink}" style="background-color: #2563EB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                    Login Automatically
                </a>
            </p>
            <p style="font-size: 14px; color: #DC2626;">This code expires in 2 minutes.</p>
            <p style="font-size: 12px; color: #64748B;">If you didn't request this, please ignore this email.</p>
        </div>
      `;

      try {
          await sendGmailMessage(session.provider_token, { to: email, subject, body });
          setShowVerification(true);
      } catch (e) {
          console.error("Failed to send verification email", e);
          alert("Failed to send verification email. Please check your configuration.");
          isCodeSentRef.current = false;
          localStorage.removeItem('temp_otp_code');
          localStorage.removeItem('temp_otp_expiry');
      } finally {
          setIsLoadingSession(false);
      }
  };

  const handleVerifyCode = async (code: string) => {
      setIsVerifying(true);
      setVerificationError(null);
      
      if (Date.now() > verificationExpiry) {
          setVerificationError("Code expired. Please request a new one.");
          setIsVerifying(false);
          return;
      }

      if (code === verificationCode) {
          await new Promise(resolve => setTimeout(resolve, 1500));

          sessionStorage.setItem('is_verified', 'true');
          localStorage.removeItem('temp_otp_code');
          localStorage.removeItem('temp_otp_expiry');
          
          setShowVerification(false);
          isCodeSentRef.current = false;
          
          finalizeLogin(tempSessionData);
      } else {
          setVerificationError("Invalid code. Please try again.");
          setIsVerifying(false);
      }
  };

  const handleResendCode = async () => {
      setVerificationError(null);
      isCodeSentRef.current = false;
      localStorage.removeItem('temp_otp_code');
      localStorage.removeItem('temp_otp_expiry');
      
      if (tempSessionData) {
          await sendVerificationCode(tempSessionData);
      }
  };

  const handleCancelVerification = async () => {
      setShowVerification(false);
      setTempSessionData(null);
      isCodeSentRef.current = false;
      localStorage.removeItem('temp_otp_code');
      localStorage.removeItem('temp_otp_expiry');
      await supabase?.auth.signOut();
      setUser(null);
  };

  const finalizeLogin = async (session: any) => {
    isProcessingSession.current = true;
    setEmails([]);

    if (window.location.hash && window.location.hash.includes('access_token')) {
        window.history.replaceState(null, '', window.location.pathname);
    }

    try {
        const newUser = {
          id: session.user.id,
          email: session.user.email!,
          full_name: session.user.user_metadata.full_name,
          avatar_url: session.user.user_metadata.avatar_url
        };
        setUser(newUser);
        await updateUserProfile(newUser);
        await loadEmailsFromSupabase(newUser.id);

        if (session.provider_token) {
          setIsSyncing(true);
          const count = emailFetchCount === -1 ? 50 : emailFetchCount;
          setSyncProgress({ current: 0, total: count });
          
          fetchGmailWithToken(session.provider_token, count, (curr, total) => {
              setSyncProgress({ current: curr, total });
          }).then(async (gmailMessages) => {
            if (gmailMessages.length > 0) {
               await classifyAndSyncEmails(gmailMessages, newUser.id, addModelLog);
            }
            setIsSyncing(false);
            setSyncProgress({ current: 0, total: 0 });
          });
        }
    } catch (e) {
        console.error("Session init failed", e);
    } finally {
        setIsLoadingSession(false);
        setIsVerifying(false);
    }
  };

  const handleGuestLogin = () => {
    setIsAddingAccount(false);
    setUser({
      id: 'guest',
      email: 'guest@securemail.demo',
      full_name: 'Guest User',
      avatar_url: 'https://ui-avatars.com/api/?name=Guest+User&background=random'
    });
    // CHANGED: Only load mock emails for Guest
    setEmails(mockEmails);
    // Also enable VSM for guest (optional, with mock data it will train on mocks)
    vsmService.learnFromUserEmails(mockEmails);
  };

  const handleSignOut = async () => {
    if (supabase) await supabase.auth.signOut();
    setUser(null);
    setShowProfileModal(false);
    setCurrentView('all');
    setEmails([]);
    sessionStorage.removeItem('is_verified');
    localStorage.removeItem('temp_otp_code');
    localStorage.removeItem('temp_otp_expiry');
    isCodeSentRef.current = false;
    isProcessingSession.current = false;
  };

  const handleAddAccount = () => {
    setShowProfileModal(false);
    setIsAddingAccount(true);
  }

  const loadEmailsFromSupabase = async (userId: string) => {
    if(supabase) {
      let query = supabase
        .from('emails')
        .select('*')
        .eq('user_id', userId) 
        .order('date', { ascending: false });

      query = query.limit(1000);
      
      const { data, error } = await query;
      
      if (data && !error && data.length > 0) {
        const mappedEmails: Email[] = data.map((d: any) => ({
          id: d.id,
          senderName: d.sender_name,
          senderEmail: d.sender_email,
          subject: d.subject,
          preview: d.preview,
          body: d.body,
          date: d.date,
          label: d.label as EmailLabel,
          confidenceScore: d.confidence_score,
          isRead: d.is_read,
          warnings: d.warnings || [],
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(d.sender_name)}&background=random`,
          isStarred: d.is_starred || false,
          isArchived: d.is_archived || false,
          isDeleted: d.is_deleted || false,
          isCorrection: d.is_correction || false,
          snoozeUntil: d.snooze_until
        }));
        setEmails(mappedEmails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())); 
        
        // --- KEY CHANGE: Feed real data to VSM ---
        vsmService.learnFromUserEmails(mappedEmails);
      }

      subscribeToEmails(
        userId,
        (newEmail) => { 
            setEmails(prev => {
                if (prev.find(e => e.id === newEmail.id)) return prev;
                if (notificationsEnabled && Notification.permission === 'granted') {
                   new Notification(`New Email from ${newEmail.senderName}`, { 
                     body: newEmail.subject,
                     icon: '/vite.svg'
                   });
                }
                const newList = [newEmail, ...prev];
                return newList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            });
            // Also retrain incrementally (or let the service handle it)
            vsmService.learnFromUserEmails([newEmail]);
        },
        (updatedEmail) => { 
            setEmails(prev => prev.map(e => e.id === updatedEmail.id ? { ...e, ...updatedEmail } : e));
        },
        (deletedId) => {
            setEmails(prev => prev.filter(e => e.id !== deletedId));
        }
      );
    }
  };

  const showUndoToast = (action: UndoAction) => {
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    setUndoAction(action);
    undoTimeoutRef.current = setTimeout(() => {
      setUndoAction(null);
    }, 8000);
  };

  const handleUndo = async () => {
    if (!undoAction) return;
    const { type, emailIds } = undoAction;
    
    if (type === 'delete') {
      setEmails(prev => prev.map(e => emailIds.includes(e.id) ? { ...e, isDeleted: false } : e));
      if (supabase) {
        await supabase.from('emails').update({ is_deleted: false }).in('id', emailIds);
      }
    } else if (type === 'snooze') {
      setEmails(prev => prev.map(e => emailIds.includes(e.id) ? { ...e, snoozeUntil: undefined } : e));
    } else if (type === 'archive') {
      setEmails(prev => prev.map(e => emailIds.includes(e.id) ? { ...e, isArchived: false } : e));
      if (supabase) {
        await supabase.from('emails').update({ is_archived: false }).in('id', emailIds);
      }
    }

    setUndoAction(null);
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
  };

  const initiateDelete = (emailId: string) => {
      setDeleteConfirmation({ isOpen: true, emailId });
  };

  const confirmDelete = async () => {
    const emailId = deleteConfirmation.emailId;
    if (!emailId) return;

    if (currentView === 'trash') {
        setEmails(prev => prev.filter(e => e.id !== emailId));
        setSelectedEmailId(null);
        if (supabase) {
            const { data: { session } } = await supabase.auth.getSession();
            try {
                await supabase.from('emails').delete().eq('id', emailId);
                if (session?.provider_token && user?.id !== 'guest') {
                    await deleteGmailMessage(session.provider_token, emailId);
                }
            } catch (error: any) {
                console.error("Delete failed", error);
            }
        }
    } else {
        setEmails(prev => prev.map(e => e.id === emailId ? { ...e, isDeleted: true } : e));
        setSelectedEmailId(null);
        showUndoToast({ type: 'delete', emailIds: [emailId], message: 'Conversation moved to Trash.' });

        if (supabase) {
            const { data: { session } } = await supabase.auth.getSession();
            await supabase.from('emails').update({ is_deleted: true }).eq('id', emailId);
            if (session?.provider_token && user?.id !== 'guest') {
                await trashGmailMessage(session.provider_token, emailId);
            }
        }
    }
    setDeleteConfirmation({ isOpen: false, emailId: null });
  };

  const handleSnooze = async (emailId: string, date: Date) => {
    setEmails(prev => prev.map(e => e.id === emailId ? { ...e, snoozeUntil: date.toISOString() } : e));
    setSelectedEmailId(null);
    showUndoToast({ type: 'snooze', emailIds: [emailId], message: 'Conversation snoozed.' });
  };

  const handleRefresh = async () => {
    if (!user || user.id === 'guest') return;
    if (isSyncing) return; 
    
    if (!supabase) return;
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.provider_token) {
        setIsSyncing(true);
        try {
            const count = emailFetchCount === -1 ? 50 : emailFetchCount;
            setSyncProgress({ current: 0, total: count });
            
            const gmailMessages = await fetchGmailWithToken(session.provider_token, count, (curr, total) => {
                setSyncProgress({ current: curr, total });
            });
            
            if (gmailMessages.length > 0) {
                setEmails(prev => {
                    const existingIds = new Set(prev.map(e => e.id));
                    const newEmails = gmailMessages.filter(m => !existingIds.has(m.id));
                    if (newEmails.length === 0) return prev; 
                    
                    const merged = [...newEmails, ...prev];
                    return merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                });
                await classifyAndSyncEmails(gmailMessages, user.id, addModelLog);
            }
        } catch (e) {
            console.error("Refresh failed", e);
        } finally {
            setIsSyncing(false);
            setSyncProgress({ current: 0, total: 0 });
        }
    }
  };

  const handleSaveSettings = () => {
    localStorage.setItem('emailFetchCount', emailFetchCount.toString());
  };

  const handleResetDefaults = () => {
    setEmailFetchCount(50);
    setNotificationsEnabled(true);
    setThemeMode('system');
    localStorage.setItem('emailFetchCount', '50');
  };

  const handleClearSystemEmails = async () => {
      if (!user || !supabase) return;
      
      const confirm = window.confirm("This will remove all 'SecureMail AI' verification emails from your view. Continue?");
      if (!confirm) return;

      setIsSyncing(true);
      
      const textToMatch = "SecureMail AI";
      const emailsToDelete = emails.filter(e => 
          (e.subject && e.subject.includes(textToMatch)) || (e.senderName && e.senderName.includes(textToMatch))
      );
      const idsToDelete = emailsToDelete.map(e => e.id);
      
      setEmails(prev => prev.filter(e => !idsToDelete.includes(e.id)));
      
      if (idsToDelete.length > 0) {
          await supabase.from('emails').delete().in('id', idsToDelete);
      }
      
      setIsSyncing(false);
      alert(`Cleaned ${idsToDelete.length} verification emails.`);
  };

  const handleSelectEmail = async (id: string) => {
    setSelectedEmailId(id);
    const targetEmail = emails.find(e => e.id === id);
    if (targetEmail && !targetEmail.isRead) {
      await handleMarkAsRead(id, true);
    }
  };

  const handleMarkAsRead = async (id: string, isRead: boolean) => {
      setEmails(prev => prev.map(e => e.id === id ? { ...e, isRead } : e));
      if (user?.id !== 'guest' && isRead) {
          await markEmailAsRead(id);
      }
      if(user?.id !== 'guest' && !isRead && supabase) {
          await supabase.from('emails').update({ is_read: false }).eq('id', id);
      }
  };

  const handleUpdateLabel = async (emailId: string, newLabel: EmailLabel) => {
    const updatedEmails = emails.map(e => {
        if (e.id === emailId) {
            return { ...e, label: newLabel, isCorrection: true };
        }
        return e;
    });
    setEmails(updatedEmails);
    
    const emailToUpdate = emails.find(e => e.id === emailId);

    if (emailToUpdate && emailToUpdate.label !== newLabel) {
        await learnFromCorrection(emailToUpdate, newLabel, addModelLog);
    } else {
        if (supabase) supabase.from('emails').update({ label: newLabel }).eq('id', emailId).then();
    }
  };

  const handleArchive = (emailId: string) => {
    setEmails(prev => prev.map(e => e.id === emailId ? { ...e, isArchived: true, isDeleted: false } : e));
    setSelectedEmailId(null);
    showUndoToast({ type: 'archive', emailIds: [emailId], message: 'Conversation archived.' });
    if(supabase) supabase.from('emails').update({ is_archived: true }).eq('id', emailId).then();
  };

  const handleStar = async (emailId: string) => {
    const email = emails.find(e => e.id === emailId);
    if (!email) return;

    const newStatus = !email.isStarred;
    setEmails(prev => prev.map(e => e.id === emailId ? { ...e, isStarred: newStatus } : e));

    if (user?.id !== 'guest') {
        if (!supabase) return;
        const { data: { session } } = await supabase.auth.getSession();
        await updateEmailStarStatus(emailId, newStatus);
        if (session?.provider_token) {
            await toggleGmailStar(session.provider_token, emailId, newStatus);
        }
    }
  };

  const handleReplyOrForward = async (emailId: string, to: string, subject: string, body: string) => {
     if (user?.id === 'guest') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return;
     }
      if (!supabase) return;
      const { data: { session } } = await supabase.auth.getSession();

     if (session?.provider_token) {
        await sendGmailMessage(session.provider_token, { to, subject, body });
     }
  };

  const handleOpenCompose = (initialData: { to?: string, subject?: string, body?: string, mode?: ComposeMode } = {}) => {
      setComposeData(initialData);
      setIsComposeOpen(true);
  };

  const getFilteredEmails = () => {
    let filtered = emails;

    if (currentView === 'trash') {
      filtered = emails.filter(e => e.isDeleted);
    } else if (currentView === 'archived') {
      filtered = emails.filter(e => e.isArchived && !e.isDeleted);
    } else if (currentView === 'sent') {
      if (user?.email) {
          filtered = emails.filter(e => e.senderEmail === user.email && !e.isDeleted && !e.isArchived);
      } else {
          filtered = [];
      }
    } else if (currentView === 'received') {
      filtered = emails.filter(e => e.senderEmail !== user?.email && !e.isDeleted && !e.isArchived);
    } else {
      filtered = emails.filter(e => 
        !e.isDeleted && 
        !e.isArchived && 
        (!e.snoozeUntil || new Date(e.snoozeUntil) <= new Date())
      );
    }
    
    if (filterLabel === 'STARRED') {
        filtered = filtered.filter(e => e.isStarred);
    } else if (filterLabel) {
        filtered = filtered.filter(e => e.label === (filterLabel as EmailLabel));
    }

    return filtered;
  };

  const displayedEmails = getFilteredEmails();

  const renderContent = () => {
    if (currentView === 'settings') {
      return (
        <SettingsView 
          onOpenConfig={() => setIsConfigOpen(true)} 
          themeMode={themeMode}
          setThemeMode={setThemeMode}
          notificationsEnabled={notificationsEnabled}
          setNotificationsEnabled={setNotificationsEnabled}
          emailFetchCount={emailFetchCount}
          setEmailFetchCount={setEmailFetchCount}
          modelLogs={modelLogs}
          onSync={handleRefresh}
          isSyncing={isSyncing}
          syncProgress={syncProgress}
          onSaveSettings={handleSaveSettings}
          onResetDefaults={handleResetDefaults}
          onClearSystemEmails={handleClearSystemEmails}
        />
      );
    }

    if (activeModule === 'chat') {
      if (currentView === 'browse-spaces') {
          return <BrowseSpaces onBack={() => setCurrentView('chat-home')} />;
      }
      if (currentView === 'chat-mentions') {
          return <ChatMentionsView />;
      }
      return (
        <ChatView 
            user={user} 
            onOpenChat={handleOpenChat} 
            onNewChat={handleNewChat}
            chatSessions={chatSessions}
            currentSessionId={currentChatSessionId}
            emails={emails} 
        />
      );
    }

    if (activeModule === 'meet') {
      return <MeetView />;
    }

    if (currentView === 'stats') {
      return <Dashboard emails={emails} accuracyData={mockAccuracy} />;
    }

    let viewTitle = 'Inbox';
    if (currentView === 'trash') viewTitle = 'Trash';
    else if (currentView === 'archived') viewTitle = 'Archived';
    else if (currentView === 'sent') viewTitle = 'Sent';
    else if (currentView === 'received') viewTitle = 'Received';
    else if (currentView === 'all') viewTitle = 'Inbox (All)';

    return (
      <div className="flex flex-1 relative h-full overflow-hidden">
        {isSyncing && (
           <div className="absolute top-2 right-4 z-50 bg-blue-600 text-white text-xs px-3 py-1.5 rounded-full shadow-lg flex items-center animate-in fade-in slide-in-from-top-2 gap-2">
             <Loader2 className="w-3 h-3 animate-spin" />
             <span>Syncing ({syncProgress.current}/{syncProgress.total})...</span>
           </div>
        )}
        
        <div className="flex-1 h-full w-full">
          <EmailList 
            emails={displayedEmails} 
            selectedEmailId={selectedEmailId} 
            onSelectEmail={handleSelectEmail} 
            filterLabel={filterLabel}
            viewTitle={viewTitle}
            onRefresh={handleRefresh}
            onStar={handleStar}
            isSidebarOpen={isSidebarExpanded}
            onToggleSidebar={() => setIsSidebarExpanded(!isSidebarExpanded)}
            emailFetchCount={emailFetchCount}
            setEmailFetchCount={setEmailFetchCount}
            emailFetchDate={null}
            setEmailFetchDate={() => {}}
            onArchive={handleArchive}
            onDelete={initiateDelete}
            onMarkRead={handleMarkAsRead}
            onSnooze={handleSnooze}
          />
        </div>

        {selectedEmailId && emails.find(e => e.id === selectedEmailId) && (
          <div className="absolute inset-0 z-40 bg-white dark:bg-slate-900 animate-in slide-in-from-right-10 duration-200">
            <EmailDetail 
              email={emails.find(e => e.id === selectedEmailId)!} 
              allEmails={emails}
              onUpdateLabel={handleUpdateLabel}
              onClose={() => setSelectedEmailId(null)}
              onArchive={() => handleArchive(selectedEmailId)}
              onDelete={() => initiateDelete(selectedEmailId)}
              onStar={() => handleStar(selectedEmailId)}
              onReply={(to, subject, text) => handleReplyOrForward(selectedEmailId, to, subject, text)}
              onOpenGlobalCompose={handleOpenCompose}
            />
          </div>
        )}
      </div>
    );
  };

  if (isLoadingSession) {
    return (
      <div className="flex flex-col h-screen w-full items-center justify-center bg-white dark:bg-slate-900 space-y-4">
        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg animate-pulse">
            <ShieldCheck className="w-8 h-8 text-white" />
        </div>
        <p className="text-slate-500 font-medium animate-pulse">Connecting to SecureMail...</p>
      </div>
    );
  }

  // --- VERIFICATION MODAL RENDER ---
  if (showVerification) {
      return (
          <VerificationModal 
            isOpen={showVerification}
            email={tempSessionData?.user?.email || 'email'}
            isLoading={isVerifying}
            error={verificationError}
            expiryTime={verificationExpiry}
            onVerify={handleVerifyCode}
            onResend={handleResendCode}
            onCancel={handleCancelVerification}
          />
      );
  }

  if (!user || isAddingAccount) {
    return (
      <>
        <Login 
          onGuestLogin={handleGuestLogin} 
          onCancel={isAddingAccount ? () => setIsAddingAccount(false) : undefined} 
        />
        <button 
          onClick={() => setIsConfigOpen(true)}
          className="fixed bottom-6 right-6 text-slate-400 hover:text-red-500 z-50 p-2 bg-slate-900 rounded-full border border-slate-700 hover:bg-slate-800 transition-colors shadow-lg"
          title="Configure Backend"
        >
          <Settings className="w-5 h-5" />
        </button>
        <ConfigModal 
          isOpen={isConfigOpen} 
          onClose={() => setIsConfigOpen(false)} 
          onSave={(cfg) => saveSupabaseConfig(cfg.supabaseUrl, cfg.supabaseKey)}
          initialConfig={{ 
            supabaseUrl: localStorage.getItem('sb_url') || '', 
            supabaseKey: localStorage.getItem('sb_key') || '' 
          }}
        />
      </>
    );
  }

  return (
    <div className={`flex h-screen w-full bg-slate-50 dark:bg-slate-950 relative overflow-hidden transition-colors duration-300`}>
      <Sidebar 
        isOpen={isSidebarExpanded}
        notificationsEnabled={notificationsEnabled}
        currentView={currentView} 
        setCurrentView={(view) => {
          setCurrentView(view);
          setSelectedEmailId(null);
        }}
        setFilter={setFilterLabel}
        user={user}
        onOpenProfile={() => setShowProfileModal(true)}
        emails={emails} 
        onCompose={() => handleOpenCompose({ mode: 'compose' })}
        activeModule={activeModule}
        setActiveModule={setActiveModule}
        onToggleSidebar={() => setIsSidebarExpanded(!isSidebarExpanded)}
        chatSessions={chatSessions}
        onSelectChatSession={handleOpenChat}
        onNewChat={handleNewChat}
        currentChatSessionId={currentChatSessionId}
        onOpenCreateSpace={() => setIsSpaceModalOpen(true)}
        onBrowseSpaces={() => setCurrentView('browse-spaces')}
      />
      
      {renderContent()}

      {!isChatbotOpen && activeModule !== 'chat' && (
          <button 
            onClick={handleNewChat}
            className={`fixed bottom-6 right-6 z-50 p-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg transition-all duration-300 flex items-center justify-center group`}
          >
            <MessageCircle size={28} className="group-hover:animate-pulse" />
          </button>
      )}

      {undoAction && (
        <div className="fixed bottom-6 left-6 z-[60] animate-in slide-in-from-bottom-2 fade-in">
          <div className="bg-[#202124] text-white px-6 py-3 rounded-md shadow-lg flex items-center gap-6 text-sm min-w-[320px] justify-between">
             <span>{undoAction.message}</span>
             <div className="flex items-center gap-4">
               <button 
                 onClick={handleUndo}
                 className="text-[#8ab4f8] font-bold hover:text-[#aecbfa] transition-colors"
               >
                 Undo
               </button>
               <button onClick={() => setUndoAction(null)} className="text-gray-400 hover:text-gray-200">
                 <X className="w-4 h-4" />
               </button>
             </div>
          </div>
        </div>
      )}

      <ConfirmModal 
        isOpen={deleteConfirmation.isOpen}
        onClose={() => setDeleteConfirmation({ isOpen: false, emailId: null })}
        onConfirm={confirmDelete}
        title={currentView === 'trash' ? "Confirm deleting message" : "Move to Trash?"}
        message={currentView === 'trash' 
            ? "This action will affect this conversation in Trash. Are you sure you want to continue?" 
            : "Are you sure you want to move this conversation to Trash?"}
        confirmLabel="OK"
        cancelLabel="Cancel"
      />

      <ComposeModal 
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        allEmails={emails}
        initialTo={composeData.to}
        initialSubject={composeData.subject}
        initialBody={composeData.body}
        mode={composeData.mode}
      />

      <Chatbot 
        isOpen={isChatbotOpen}
        onClose={() => setIsChatbotOpen(false)}
        emails={emails}
        stats={[]} 
        onFilter={(label) => setFilterLabel(label)}
        onSelectEmail={(id) => {
            setActiveModule('mail'); 
            handleSelectEmail(id);
        }}
        onDeleteEmail={initiateDelete} 
        user={user}
        addModelLog={addModelLog}
        currentSessionId={currentChatSessionId}
        setCurrentSessionId={setCurrentChatSessionId}
        chatSessions={chatSessions}
        onRefreshSessions={refreshChatSessions}
      />

      <UserProfileModal 
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        user={user}
        onSignOut={handleSignOut}
        onAddAccount={handleAddAccount}
      />
      
      <CreateSpaceModal 
        isOpen={isSpaceModalOpen}
        onClose={() => setIsSpaceModalOpen(false)}
        onCreate={handleCreateSpace}
      />

      <ConfigModal 
        isOpen={isConfigOpen} 
        onClose={() => setIsConfigOpen(false)} 
        onSave={(cfg) => saveSupabaseConfig(cfg.supabaseUrl, cfg.supabaseKey)}
        initialConfig={{ 
          supabaseUrl: localStorage.getItem('sb_url') || '', 
          supabaseKey: localStorage.getItem('sb_key') || '' 
        }}
      />
    </div>
  );
};