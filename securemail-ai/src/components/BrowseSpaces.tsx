
import React, { useState } from 'react';
import { Search, ArrowLeft, MoreVertical } from 'lucide-react';

interface SpaceItem {
  id: string;
  name: string;
  members: number;
  initial: string;
  color: string;
  description?: string;
}

const MOCK_SPACES: SpaceItem[] = [
  { id: '1', name: 'cc', members: 4, initial: 'c', color: 'bg-indigo-100 text-indigo-600' },
  { id: '2', name: 'Lớp THĐC nhóm 1.2', members: 1, initial: 'L', color: 'bg-amber-100 text-amber-700' },
  { id: '3', name: 'Test', members: 2, initial: 'T', color: 'bg-purple-100 text-purple-700' },
  { id: '4', name: '1', members: 2, initial: '1', color: 'bg-cyan-100 text-cyan-700' },
  { id: '5', name: 'lylta.21i@vku.udnn.vn', members: 1, initial: 'l', color: 'bg-rose-100 text-rose-700' },
  { id: '6', name: 'nhanlvt.21it@vku.udn.vn', members: 1, initial: 'n', color: 'bg-blue-100 text-blue-700' },
  { id: '7', name: 'Đề Án 5', members: 1, initial: 'Đ', color: 'bg-orange-100 text-orange-700' },
  { id: '8', name: 'Ob', members: 1, initial: 'O', color: 'bg-slate-100 text-slate-700' },
];

interface BrowseSpacesProps {
  onBack: () => void;
}

export const BrowseSpaces: React.FC<BrowseSpacesProps> = ({ onBack }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSpaces = MOCK_SPACES.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 h-screen flex flex-col bg-white dark:bg-slate-900 overflow-hidden">
      {/* Header */}
      <div className="h-16 px-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between flex-shrink-0 bg-white dark:bg-slate-900">
         <div className="flex items-center gap-4 flex-1">
            <button onClick={onBack} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-600 dark:text-slate-400">
               <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-normal text-slate-800 dark:text-white">Browse spaces</h1>
         </div>
      </div>

      {/* Toolbar */}
      <div className="px-6 py-4 flex items-center gap-4">
         <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
            <input 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search spaces" 
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-full pl-10 pr-4 py-2 text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none hover:shadow-sm transition-shadow"
            />
         </div>
         
         <div className="relative">
             <select className="appearance-none bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 pl-4 pr-10 py-2 rounded-lg text-sm font-medium border border-transparent hover:bg-blue-100 dark:hover:bg-blue-900/40 cursor-pointer outline-none focus:ring-2 focus:ring-blue-500">
                 <option>Spaces I haven't joined</option>
                 <option>All spaces</option>
             </select>
             <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-blue-700 dark:text-blue-300">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
             </div>
         </div>

         <div className="relative ml-4">
             <select className="appearance-none bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 pl-4 pr-10 py-2 rounded-lg text-sm outline-none cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700">
                 <option>Internal & external</option>
                 <option>Internal only</option>
             </select>
             <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
             </div>
         </div>

         <div className="ml-auto">
             <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500">
                 <MoreVertical className="w-5 h-5" />
             </button>
         </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
          <div className="space-y-1">
              {filteredSpaces.map(space => (
                  <div key={space.id} className="group flex items-center justify-between py-3 px-4 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors border-b border-transparent hover:border-slate-100 dark:hover:border-slate-700/50">
                      <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-lg ${space.color} flex items-center justify-center text-lg font-medium`}>
                              {space.initial}
                          </div>
                          <div>
                              <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{space.name}</div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                  {space.members} member{space.members !== 1 ? 's' : ''} {space.description && `• ${space.description}`}
                              </div>
                          </div>
                      </div>
                      
                      <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="text-blue-600 dark:text-blue-400 text-sm font-medium px-4 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                              Preview
                          </button>
                          <button className="bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200 text-sm font-medium px-6 py-2 rounded-full hover:shadow-md transition-all">
                              Join
                          </button>
                      </div>
                  </div>
              ))}
              
              {filteredSpaces.length === 0 && (
                  <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                      No spaces found matching "{searchTerm}"
                  </div>
              )}
          </div>
      </div>
    </div>
  );
};
