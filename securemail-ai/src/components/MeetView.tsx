
import React, { useState } from 'react';
import { Video, Keyboard, Settings, HelpCircle, Info, Clock, Calendar } from 'lucide-react';

export const MeetView: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [meetingCode, setMeetingCode] = useState('');
  const [error, setError] = useState('');

  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const handleNewMeeting = () => {
      window.open('https://meet.google.com/new', '_blank');
  };

  const handleJoin = () => {
      // Basic validation for Google Meet codes (usually abc-defg-hij or similar)
      // We'll accept anything that looks somewhat like a code
      const cleanCode = meetingCode.trim().replace(/\s/g, '');
      
      if (cleanCode.length < 3) {
          setError("Please enter a valid code.");
          return;
      }

      // Check format roughly (optional, but good for UX)
      // Valid codes don't contain special chars besides hyphens
      if (!/^[a-zA-Z0-9-]+$/.test(cleanCode)) {
          setError("Meeting codes only contain letters, numbers, and hyphens.");
          return;
      }

      setError('');
      // If it's a full link, use it, otherwise append to base url
      const url = cleanCode.startsWith('http') 
        ? cleanCode 
        : `https://meet.google.com/${cleanCode}`;
      
      window.open(url, '_blank');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && meetingCode) {
          handleJoin();
      }
  };

  return (
    <div className="flex-1 h-screen flex flex-col bg-white dark:bg-slate-900 overflow-hidden relative">
        
      {/* Top Right Header */}
      <div className="absolute top-0 right-0 p-6 flex items-center gap-4 z-10 text-slate-600 dark:text-slate-400">
         <div className="flex flex-col items-end mr-4">
            <span className="text-lg text-slate-700 dark:text-slate-300 font-medium">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })} • {currentTime.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
         </div>
         <HelpCircle className="w-6 h-6 hover:text-slate-800 dark:hover:text-white cursor-pointer" />
         <Info className="w-6 h-6 hover:text-slate-800 dark:hover:text-white cursor-pointer" />
         <Settings className="w-6 h-6 hover:text-slate-800 dark:hover:text-white cursor-pointer" />
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
         <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            
            {/* Left Column: Actions */}
            <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-700">
               <div className="space-y-2">
                  <h1 className="text-4xl md:text-5xl font-normal text-slate-800 dark:text-white leading-tight">
                     Premium video meetings.
                     <br />
                     Now free for everyone.
                  </h1>
                  <p className="text-lg text-slate-500 dark:text-slate-400 max-w-md leading-relaxed">
                     We re-engineered the service we built for secure business meetings, Google Meet, to make it free and available for all.
                  </p>
               </div>

               <div className="flex flex-col gap-2">
                   <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      <button 
                        onClick={handleNewMeeting}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-colors flex-shrink-0"
                      >
                         <Video className="w-5 h-5" />
                         New meeting
                      </button>
                      
                      <div className="flex items-center gap-4 w-full sm:w-auto">
                          <div className="relative flex-1 sm:flex-none">
                             <Keyboard className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                             <input 
                                value={meetingCode}
                                onChange={(e) => { setMeetingCode(e.target.value); setError(''); }}
                                onKeyDown={handleKeyDown}
                                placeholder="Enter a code or link"
                                className={`pl-10 pr-4 py-3 border ${error ? 'border-red-500 focus:ring-red-200' : 'border-slate-300 dark:border-slate-600 focus:ring-blue-500'} rounded-lg text-slate-800 dark:text-white bg-transparent focus:ring-2 focus:border-transparent outline-none w-full sm:w-64 transition-all`}
                             />
                          </div>
                          <button 
                            onClick={handleJoin}
                            disabled={!meetingCode}
                            className={`font-medium transition-colors ${!meetingCode ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed' : 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-4 py-3 rounded-lg'}`}
                          >
                            Join
                          </button>
                      </div>
                   </div>
                   {error && <p className="text-red-500 text-sm pl-1">{error}</p>}
               </div>

               <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                  <a href="https://meet.google.com/about/redirect/landing-learn-more/?hl=en" target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline text-sm">Learn more</a> about Google Meet
               </div>
            </div>

            {/* Right Column: Illustration/Carousel */}
            <div className="flex flex-col items-center justify-center animate-in fade-in slide-in-from-right-4 duration-700">
               <div className="relative w-full max-w-md aspect-square flex flex-col items-center justify-center">
                  {/* Decorative Circle */}
                  <div className="absolute inset-0 bg-blue-50 dark:bg-blue-900/10 rounded-full scale-90"></div>
                  
                  {/* Image Placeholder - replicating the secure shield look */}
                  <div className="relative z-10 mb-8">
                      <div className="w-64 h-64 bg-white dark:bg-slate-800 rounded-full shadow-xl flex items-center justify-center border-4 border-white dark:border-slate-700">
                          <img 
                            src="https://www.gstatic.com/meet/user_edu_safety_light_e04a2bbb449524ef7e49ea36d5f25b65.svg"
                            alt="Security"
                            className="w-40 h-40"
                          />
                      </div>
                  </div>

                  <div className="text-center space-y-2 z-10 relative">
                     <h3 className="text-2xl font-normal text-slate-800 dark:text-white">Your meeting is safe</h3>
                     <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                        No one outside your organization can join a meeting unless invited or admitted by the host
                     </p>
                  </div>
                  
                  {/* Carousel Dots */}
                  <div className="flex gap-2 mt-6">
                     <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
                     <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700"></div>
                     <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700"></div>
                  </div>
               </div>
            </div>

         </div>
      </div>
    </div>
  );
};
