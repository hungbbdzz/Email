import React from 'react';
import { UserProfile } from '../types';
import { X, LogOut, UserPlus, Cloud } from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onSignOut: () => void;
  onAddAccount: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose, user, onSignOut, onAddAccount }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-end p-4 animate-in fade-in duration-200">
      <div 
        className="mt-16 mr-4 bg-[#F7F9FC] dark:bg-[#1E293B] rounded-[28px] shadow-2xl w-[400px] overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700 relative text-slate-900 dark:text-slate-100 flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Top Bar with Close */}
        <div className="flex items-center justify-between px-4 py-3 relative">
           <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors absolute left-4">
             <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
           </button>
           <div className="flex-1 text-center">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Google</span>
           </div>
           <div className="w-9"></div> {/* Spacer for centering */}
        </div>

        <div className="overflow-y-auto custom-scrollbar flex-1 px-4 pb-4">
            
            {/* Main Profile Card */}
            <div className="bg-white dark:bg-slate-800 rounded-[24px] p-6 text-center shadow-sm border border-slate-200 dark:border-slate-700 mb-2">
                <div className="relative inline-block mb-3">
                    <img 
                        src={user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || 'User')}`} 
                        alt="Avatar" 
                        className="w-20 h-20 rounded-full object-cover border border-slate-200 dark:border-slate-600"
                    />
                </div>
                <h2 className="text-xl font-normal text-slate-800 dark:text-white">{user.full_name || 'User'}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{user.email}</p>
                
                <a 
                    href="https://myaccount.google.com/" 
                    target="_blank" 
                    rel="noreferrer"
                    className="inline-block border border-slate-300 dark:border-slate-600 rounded-full px-6 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                >
                    Quản lý Tài khoản Google của bạn
                </a>
            </div>

            {/* Account Actions */}
            <div className="bg-white dark:bg-slate-800 rounded-[24px] overflow-hidden shadow-sm border border-slate-200 dark:border-slate-700 mb-2">
                {/* Add Account */}
                <button 
                    onClick={onAddAccount}
                    className="flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-left w-full transition-colors"
                >
                    <div className="w-8 flex justify-center">
                        <UserPlus className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                    </div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Thêm tài khoản khác</span>
                </button>

                <div className="border-t border-slate-100 dark:border-slate-700/50"></div>

                {/* Sign Out All */}
                <button 
                    onClick={onSignOut}
                    className="flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-left w-full transition-colors"
                >
                    <div className="w-8 flex justify-center">
                        <LogOut className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                    </div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Đăng xuất khỏi tất cả các tài khoản</span>
                </button>
            </div>

            {/* Storage Card (Linked to Google One) */}
            <a 
                href="https://one.google.com/storage" 
                target="_blank" 
                rel="noreferrer"
                className="bg-white dark:bg-slate-800 rounded-[24px] p-4 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors block"
            >
                <Cloud className="w-6 h-6 text-slate-400 flex-shrink-0" />
                <div className="flex-1">
                    <span className="text-sm text-slate-600 dark:text-slate-300">Đã dùng 0% trong 15 GB</span>
                    <div className="h-1 w-full bg-slate-200 dark:bg-slate-700 rounded-full mt-1 overflow-hidden">
                        <div className="h-full bg-blue-500 w-[1%]"></div>
                    </div>
                </div>
            </a>

            {/* Footer Links */}
            <div className="mt-6 flex justify-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer" className="hover:bg-slate-200 dark:hover:bg-slate-700 px-2 py-1 rounded transition-colors">Chính sách quyền riêng tư</a>
                <span>•</span>
                <a href="https://policies.google.com/terms" target="_blank" rel="noreferrer" className="hover:bg-slate-200 dark:hover:bg-slate-700 px-2 py-1 rounded transition-colors">Điều khoản dịch vụ</a>
            </div>
        </div>

      </div>
      
      {/* Click outside to close */}
      <div className="absolute inset-0 -z-10" onClick={onClose}></div>
    </div>
  );
};