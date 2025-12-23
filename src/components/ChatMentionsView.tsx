
import React from 'react';
import { AtSign } from 'lucide-react';

export const ChatMentionsView: React.FC = () => {
  return (
    <div className="flex-1 h-screen flex flex-col bg-white dark:bg-slate-900 overflow-hidden">
      {/* Header */}
      <div className="h-16 px-6 border-b border-slate-200 dark:border-slate-800 flex items-center flex-shrink-0 bg-white dark:bg-slate-900">
         <h1 className="text-xl font-normal text-slate-800 dark:text-white">Mentions</h1>
      </div>

      {/* Empty State */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in-95 duration-300">
         <div className="w-48 h-48 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
            <img 
              src="https://www.gstatic.com/dynamite/images/bar/mentions_empty.png" 
              alt="No Mentions"
              className="w-32 h-32 opacity-80 dark:opacity-60 grayscale"
              onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  // Fallback icon if image fails
                  e.currentTarget.parentElement!.innerHTML = '<svg class="w-24 h-24 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"/></svg>';
              }}
            />
         </div>
         <h2 className="text-xl font-medium text-slate-800 dark:text-white mb-2">
            You don't have any mentions yet
         </h2>
         <p className="text-slate-500 dark:text-slate-400 max-w-sm">
            When people mention you in conversations or spaces, you'll see them here.
         </p>
      </div>
    </div>
  );
};
