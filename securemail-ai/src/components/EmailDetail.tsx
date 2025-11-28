import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Email, EmailLabel, ComposeMode } from '../types';
import { 
  AlertTriangle, 
  Archive, 
  Trash2, 
  Reply, 
  Forward, 
  MoreHorizontal, 
  Star, 
  ShieldAlert,
  Sparkles,
  X,
  Paperclip,
  Check,
  ChevronDown,
  Printer,
  ExternalLink,
  Search
} from 'lucide-react';

interface EmailDetailProps {
  email: Email;
  allEmails: Email[]; 
  onUpdateLabel: (emailId: string, newLabel: EmailLabel) => void;
  onClose: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onStar: () => void;
  onReply: (to: string, subject: string, text: string) => Promise<void>; 
  onOpenGlobalCompose?: (initialData: { to?: string, subject?: string, body?: string, mode?: ComposeMode }) => void;
}

export const EmailDetail: React.FC<EmailDetailProps> = ({ 
  email, 
  allEmails,
  onUpdateLabel, 
  onClose,
  onArchive,
  onDelete,
  onStar,
  onReply,
  onOpenGlobalCompose
}) => {
  const [isQuickReplying, setIsQuickReplying] = useState(false);
  
  useEffect(() => {
    setIsQuickReplying(false);
  }, [email.id]);

  const handleForward = () => {
      // Forward with full HTML
      if (onOpenGlobalCompose) {
          const forwardBody = `<br><br>---------- Forwarded message ---------<br>From: ${email.senderName} &lt;${email.senderEmail}&gt;<br>Date: ${new Date(email.date).toLocaleString()}<br>Subject: ${email.subject}<br><br>${email.body || ''}`;
          onOpenGlobalCompose({
              subject: `Fwd: ${email.subject}`,
              body: forwardBody,
              mode: 'forward'
          });
      }
  };

  const handleReplyClick = () => {
      if (onOpenGlobalCompose) {
          onOpenGlobalCompose({
              to: email.senderEmail,
              subject: `Re: ${email.subject}`,
              body: '',
              mode: 'reply'
          });
      }
  };

  const renderEmailBody = () => {
    // Check if body exists, fallback to empty string to prevent crash
    const content = email.body || "";
    
    // Only remove dangerous scripts, preserve styles and structure
    const sanitized = content
        .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gmi, "")
        .replace(/\son\w+="[^"]*"/g, ''); 

    return (
        <div className="prose max-w-none dark:prose-invert">
             <div dangerouslySetInnerHTML={{ __html: sanitized }} />
        </div>
    );
  };

  const getBadgeColor = (label: EmailLabel) => {
    switch (label) {
      case EmailLabel.WORK: return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800';
      case EmailLabel.PERSONAL: return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800';
      case EmailLabel.PROMOTION: return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800';
      case EmailLabel.PHISHING: return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800';
      case EmailLabel.SPAM: return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800';
      default: return 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
    }
  };

  const isHighRisk = email.label === EmailLabel.PHISHING || email.label === EmailLabel.SPAM;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 relative transition-colors duration-300">
      
      {/* Top Toolbar */}
      <div className="h-14 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 bg-white dark:bg-slate-900 flex-shrink-0 sticky top-0 z-10">
        <div className="flex items-center space-x-4">
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-600 dark:text-slate-400 transition-colors">
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center space-x-1">
            <button onClick={onArchive} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-600 dark:text-slate-400" title="Archive"><Archive className="w-4 h-4" /></button>
            <button onClick={() => onUpdateLabel(email.id, EmailLabel.SPAM)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-600 dark:text-slate-400" title="Report Spam"><AlertTriangle className="w-4 h-4" /></button>
            <button onClick={onDelete} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-600 dark:text-slate-400" title="Delete"><Trash2 className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="flex items-center text-xs text-slate-400"><span className="hidden sm:inline">Secured by Gemini</span></div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-900 custom-scrollbar relative">
        <div className="max-w-4xl mx-auto py-6 px-4 sm:px-8 pb-32">
          
          {/* Header */}
          <div className="flex justify-between items-start mb-6 gap-4">
            <div className="flex items-center gap-3 flex-1 flex-wrap">
               <h1 className="text-xl sm:text-2xl font-normal text-slate-900 dark:text-white leading-tight">{email.subject}</h1>
               <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getBadgeColor(email.label)}`}>{email.label}</span>
            </div>
          </div>

          {/* Sender */}
          <div className="flex items-start justify-between mb-8">
            <div className="flex items-center space-x-3">
              <img 
                src={email.avatar} 
                alt="Sender" 
                className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-700 object-cover" 
              />
              <div className="flex flex-col">
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-slate-900 dark:text-white text-sm">{email.senderName}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">&lt;{email.senderEmail}&gt;</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                    <span>to me</span>
                    <ChevronDown className="w-3 h-3" />
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end">
               <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mb-1">
                  <span>{new Date(email.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                  <button onClick={onStar} className={`p-1 rounded ${email.isStarred ? 'text-yellow-400' : 'text-slate-300'}`}><Star className={`w-4 h-4 ${email.isStarred ? 'fill-current' : ''}`} /></button>
               </div>
            </div>
          </div>

          {/* Warning */}
          {isHighRisk && (
            <div className="mb-8 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-lg p-4 flex items-start space-x-4">
              <ShieldAlert className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm font-bold text-red-900 dark:text-red-300">Potential Threat Detected</h3>
                <p className="text-xs text-red-800/80 dark:text-red-300/80 mt-1">AI detected {email.label.toLowerCase()} patterns. Be careful.</p>
              </div>
            </div>
          )}

          {/* Body */}
          <div className="mb-10 text-slate-800 dark:text-slate-200 overflow-visible min-h-[200px]">
             {renderEmailBody()}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 mb-12">
               <button onClick={handleReplyClick} className="flex items-center gap-2 border border-slate-300 dark:border-slate-600 rounded-full px-6 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <Reply className="w-4 h-4" /> Reply
               </button>
               <button onClick={handleForward} className="flex items-center gap-2 border border-slate-300 dark:border-slate-600 rounded-full px-6 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <Forward className="w-4 h-4" /> Forward
               </button>
            </div>

        </div>
      </div>
    </div>
  );
};