
import React, { useState } from 'react';
import { X, Smile, Users, Megaphone, Lock, Globe, Plus } from 'lucide-react';

interface CreateSpaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, members: string[]) => void;
}

export const CreateSpaceModal: React.FC<CreateSpaceModalProps> = ({ isOpen, onClose, onCreate }) => {
  const [spaceName, setSpaceName] = useState('');
  const [description, setDescription] = useState('');
  const [membersInput, setMembersInput] = useState('');
  const [type, setType] = useState<'collaboration' | 'announcement'>('collaboration');
  const [access, setAccess] = useState<'private' | 'public'>('private');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white dark:bg-[#1E1F20] w-full max-w-[500px] rounded-[28px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-normal text-slate-900 dark:text-[#E3E3E3]">Create a space</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 pb-6 flex-1 overflow-y-auto custom-scrollbar">
          
          {/* Avatar & Name Input */}
          <div className="flex gap-4 mb-6">
            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center flex-shrink-0 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
               <Smile className="text-slate-500 dark:text-slate-300" size={24} />
               <div className="absolute ml-8 mt-8 bg-white dark:bg-slate-800 rounded-full p-0.5">
                 <div className="bg-blue-600 rounded-full w-4 h-4 flex items-center justify-center">
                    <span className="text-white text-[10px] font-bold">+</span>
                 </div>
               </div>
            </div>
            <div className="flex-1 space-y-4">
               <div>
                   <input 
                     value={spaceName}
                     onChange={(e) => setSpaceName(e.target.value)}
                     placeholder="Space name"
                     className="w-full border-b border-slate-300 dark:border-slate-600 py-2 bg-transparent text-slate-900 dark:text-white placeholder-slate-500 outline-none focus:border-blue-600 transition-colors"
                     autoFocus
                   />
                   <div className="text-right text-xs text-slate-400 mt-1">0/128</div>
               </div>
            </div>
          </div>

          <div className="mb-6 space-y-4">
             <input 
                 value={description}
                 onChange={(e) => setDescription(e.target.value)}
                 placeholder="Description (optional)"
                 className="w-full border-b border-slate-300 dark:border-slate-600 py-2 bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-500 outline-none focus:border-blue-600 transition-colors"
             />
             
             <div className="relative">
                 <input 
                     value={membersInput}
                     onChange={(e) => setMembersInput(e.target.value)}
                     placeholder="Add people, emails, or groups"
                     className="w-full border-b border-slate-300 dark:border-slate-600 py-2 bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-500 outline-none focus:border-blue-600 transition-colors"
                 />
                 <div className="absolute right-0 top-2 text-slate-400">
                    <Plus size={16} />
                 </div>
             </div>
          </div>

          <div className="mb-4">
             <h3 className="text-sm font-medium text-slate-900 dark:text-[#E3E3E3] mb-2">What is this space for?</h3>
             <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Optimize your space with helpful settings and app suggestions.</p>
             
             <div className="space-y-4">
                <label className="flex items-start gap-3 cursor-pointer group">
                   <div className="pt-0.5">
                      <input 
                        type="radio" 
                        name="spaceType" 
                        checked={type === 'collaboration'} 
                        onChange={() => setType('collaboration')}
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                   </div>
                   <div>
                      <div className="flex items-center gap-2">
                         <Users size={16} className="text-slate-700 dark:text-slate-300" />
                         <span className="text-sm font-medium text-slate-900 dark:text-slate-200">Collaboration</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                         Collaborate on projects, plans, or topics. Easily share files, assign tasks, and organize conversations.
                      </p>
                   </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer group">
                   <div className="pt-0.5">
                      <input 
                        type="radio" 
                        name="spaceType" 
                        checked={type === 'announcement'} 
                        onChange={() => setType('announcement')}
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                   </div>
                   <div>
                      <div className="flex items-center gap-2">
                         <Megaphone size={16} className="text-slate-700 dark:text-slate-300" />
                         <span className="text-sm font-medium text-slate-900 dark:text-slate-200">Announcements</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                         Broadcast and share updates with your group. Only managers can post.
                      </p>
                   </div>
                </label>
             </div>
          </div>

          <div className="mb-4 pt-4 border-t border-slate-100 dark:border-slate-700">
             <h3 className="text-sm font-medium text-slate-900 dark:text-[#E3E3E3] mb-3">Access settings</h3>
             
             <div className="relative mb-4">
                <div className="flex items-center gap-2 mb-1">
                   {access === 'private' ? <Lock size={16} className="text-slate-600" /> : <Globe size={16} className="text-slate-600" />}
                   <select 
                     value={access}
                     onChange={(e) => setAccess(e.target.value as any)}
                     className="bg-transparent text-sm font-medium text-blue-600 dark:text-[#A8C7FA] outline-none cursor-pointer hover:underline"
                   >
                      <option value="private">Private</option>
                      <option value="public">Public</option>
                   </select>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 pl-6">
                   {access === 'private' ? 'Only added people and groups can join' : 'Anyone in your organization can find and join'}
                </p>
             </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-700">
           <button 
             onClick={onClose}
             className="px-5 py-2 text-sm font-medium text-blue-600 dark:text-[#A8C7FA] hover:bg-blue-50 dark:hover:bg-[#004A77]/30 rounded-full transition-colors"
           >
             Cancel
           </button>
           <button 
             disabled={!spaceName.trim()}
             onClick={() => { 
                 const members = membersInput.split(',').map(m => m.trim()).filter(Boolean);
                 onCreate(spaceName, members); 
                 onClose(); 
             }}
             className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-[#A8C7FA] dark:hover:bg-[#D3E3FD] dark:text-[#062E6F] rounded-full shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
           >
             Create
           </button>
        </div>

      </div>
    </div>
  );
};
