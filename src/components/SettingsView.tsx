
import React, { useState } from 'react';
import { Bell, Moon, Shield, Layout, Check, Server, RefreshCw, Save, RotateCcw, Activity, Sun, Monitor, Zap, Infinity, Trash } from 'lucide-react';
import { ModelLog } from '../types';

interface SettingsViewProps {
  onOpenConfig: () => void;
  themeMode: 'light' | 'dark' | 'system';
  setThemeMode: (mode: 'light' | 'dark' | 'system') => void;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean) => void;
  emailFetchCount: number;
  setEmailFetchCount: (count: number) => void;
  modelLogs: ModelLog[];
  onSync: () => void;
  isSyncing: boolean;
  syncProgress?: { current: number, total: number };
  onSaveSettings: () => void;
  onResetDefaults: () => void;
  onClearSystemEmails?: () => void; 
}

export const SettingsView: React.FC<SettingsViewProps> = ({ 
  onOpenConfig, 
  themeMode, 
  setThemeMode,
  notificationsEnabled,
  setNotificationsEnabled,
  emailFetchCount,
  setEmailFetchCount,
  modelLogs,
  onSync,
  isSyncing,
  syncProgress = { current: 0, total: 0 },
  onSaveSettings,
  onResetDefaults,
  onClearSystemEmails
}) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleNotificationToggle = async () => {
    if (typeof Notification === 'undefined') {
      showToast("Notifications not supported");
      return;
    }

    if (!notificationsEnabled) {
      if (Notification.permission === 'granted') {
         setNotificationsEnabled(true);
         showToast("Notifications Enabled");
      } else if (Notification.permission === 'denied') {
         showToast("Permission Blocked. Enable in Browser Settings.");
      } else {
         try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
              setNotificationsEnabled(true);
              showToast("Notifications Enabled");
            } else {
              setNotificationsEnabled(false);
              showToast("Permission Denied by User");
            }
          } catch (error) {
            console.error(error);
            showToast("Error enabling notifications");
          }
      }
    } else {
      setNotificationsEnabled(false);
      showToast("Notifications Disabled");
    }
  };

  const handleSave = () => {
    onSaveSettings();
    showToast("Settings Saved Successfully");
  };

  const handleReset = () => {
    if (window.confirm("Are you sure you want to reset all settings to default?")) {
      onResetDefaults();
      showToast("Settings Reset to Defaults");
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseInt(e.target.value);
      // If slider is at max (1000), set to -1 (All)
      setEmailFetchCount(val === 1000 ? -1 : val);
  };

  const ToggleSwitch = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation(); 
        onChange();
      }}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${
        checked ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
      }`}
      role="switch"
      aria-checked={checked}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );

  // Calculate Progress Percentage
  const progressPercent = syncProgress.total > 0 
    ? Math.round((syncProgress.current / syncProgress.total) * 100) 
    : 0;

  // Visual value for slider (1000 if -1)
  const sliderValue = emailFetchCount === -1 ? 1000 : emailFetchCount;

  return (
    <div className="flex-1 h-screen overflow-y-auto p-8 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 relative transition-colors duration-300">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-8 right-8 z-[100] animate-in fade-in slide-in-from-top-2">
            <div className="bg-slate-800 text-white px-4 py-3 rounded-lg shadow-2xl flex items-center gap-3 border border-slate-700">
                <div className={`${toastMessage.includes('Blocked') || toastMessage.includes('Denied') ? 'bg-red-500' : 'bg-green-500'} rounded-full p-1`}>
                    <Check className="w-3 h-3 text-white" />
                </div>
                <span className="text-sm font-medium">{toastMessage}</span>
            </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto pb-12">
        <h2 className="text-2xl font-bold mb-2 text-slate-800 dark:text-white">Settings</h2>
        <p className="mb-8 text-slate-500 dark:text-slate-400">Manage your account preferences and system configurations.</p>

        <div className="space-y-6">
          
          {/* General Preferences */}
          <div className="rounded-xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm transition-colors duration-300">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700">
              <h3 className="font-semibold flex items-center gap-2 text-slate-800 dark:text-white">
                <Layout className="w-5 h-5 text-indigo-600" />
                General Preferences
              </h3>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              
              {/* Theme Selection */}
              <div className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                    <Moon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-slate-200">Appearance</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Customize how SecureMail looks on your device</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                    <button
                        onClick={() => setThemeMode('light')}
                        className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border transition-all ${
                            themeMode === 'light' 
                            ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300' 
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                        }`}
                    >
                        <Sun className="w-4 h-4" />
                        <span className="text-sm font-medium">Light</span>
                    </button>
                    <button
                        onClick={() => setThemeMode('dark')}
                        className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border transition-all ${
                            themeMode === 'dark' 
                            ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300' 
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                        }`}
                    >
                        <Moon className="w-4 h-4" />
                        <span className="text-sm font-medium">Dark</span>
                    </button>
                    <button
                        onClick={() => setThemeMode('system')}
                        className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border transition-all ${
                            themeMode === 'system' 
                            ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300' 
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                        }`}
                    >
                        <Monitor className="w-4 h-4" />
                        <span className="text-sm font-medium">System</span>
                    </button>
                </div>
              </div>

              {/* Notifications Toggle */}
              <div 
                className="p-6 flex items-center justify-between transition-colors cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50"
                onClick={handleNotificationToggle}
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-slate-200">Notifications</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Receive alerts for high-priority emails</p>
                  </div>
                </div>
                <ToggleSwitch checked={notificationsEnabled} onChange={handleNotificationToggle} /> 
              </div>

              {/* Email Fetch Count & Sync - IMPROVED SLIDER */}
              <div className="p-6">
                <div className="flex items-start gap-4 mb-6">
                    <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 mt-1">
                      <Server className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                          <div>
                              <p className="font-medium text-slate-900 dark:text-slate-200">Sync Batch Limit</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">Number of emails to fetch per synchronization cycle.</p>
                          </div>
                          <span className={`text-sm font-bold px-3 py-1 rounded-full border flex items-center gap-2 ${emailFetchCount === -1 ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-300' : 'bg-blue-50 border-blue-100 text-blue-700 dark:bg-blue-900/30 dark:border-blue-900/50 dark:text-blue-400'}`}>
                              {emailFetchCount === -1 ? <Infinity className="w-4 h-4" /> : emailFetchCount}
                              {emailFetchCount === -1 ? "All Emails" : " emails"}
                          </span>
                      </div>
                      
                      <div className="py-4">
                          <input
                            type="range"
                            min="10"
                            max="1000"
                            step="10"
                            value={sliderValue}
                            onChange={handleSliderChange}
                            className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600 hover:accent-blue-500 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                          />
                          <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-2 px-1">
                              <span>10</span>
                              <span>250</span>
                              <span>500</span>
                              <span>750</span>
                              <span className={emailFetchCount === -1 ? 'text-indigo-600 dark:text-indigo-400' : ''}>All (∞)</span>
                          </div>
                      </div>
                    </div>
                </div>
                
                {/* Sync Actions & Progress */}
                <div className="pl-[52px]">
                   <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50">
                        <button 
                            onClick={onSync}
                            disabled={isSyncing}
                            className={`px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-80 disabled:cursor-not-allowed text-white text-sm font-bold rounded-lg flex items-center gap-2 transition-all duration-200 active:scale-95 shadow-sm hover:shadow ${isSyncing ? 'animate-pulse' : ''}`}
                        >
                            {isSyncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 fill-current" />}
                            {isSyncing ? 'Syncing...' : 'Run Sync Now'}
                        </button>
                        
                        {isSyncing ? (
                            <div className="flex-1">
                                <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                                    <span>Processing...</span>
                                    <span className="font-mono">{syncProgress.current} / {syncProgress.total}</span>
                                </div>
                                <div className="h-2 w-full bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-blue-600 rounded-full transition-all duration-300 ease-out" 
                                        style={{ width: `${progressPercent}%` }}
                                    ></div>
                                </div>
                            </div>
                        ) : (
                            <p className="text-xs text-slate-500 dark:text-slate-400 flex-1 leading-relaxed">
                                {emailFetchCount === -1 
                                    ? "Syncing ALL emails. This may take a while depending on your inbox size." 
                                    : "Manually trigger a sync to fetch the latest emails based on the batch size."}
                            </p>
                        )}
                   </div>
                </div>
              </div>

            </div>
          </div>

          {/* Data Cleanup */}
          <div className="rounded-xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm transition-colors duration-300">
             <div className="p-6 border-b border-slate-100 dark:border-slate-700">
                <h3 className="font-semibold flex items-center gap-2 text-slate-800 dark:text-white">
                  <Trash className="w-5 h-5 text-red-600" />
                  Data Cleanup
                </h3>
             </div>
             <div className="p-6">
                <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
                   If you are seeing too many "Login Verification Code" emails due to the app sending them repeatedly during development, you can clear them here.
                </p>
                <button 
                   onClick={onClearSystemEmails}
                   className="px-4 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                   <Trash className="w-4 h-4" />
                   Clear Verification Emails (Dev Tool)
                </button>
             </div>
          </div>

          {/* Security Logs */}
          <div className="rounded-xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm transition-colors duration-300">
             <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
              <h3 className="font-semibold flex items-center gap-2 text-slate-800 dark:text-white">
                <Shield className="w-5 h-5 text-green-600" />
                Recent System Activities
              </h3>
              <div className="flex items-center gap-2 px-2 py-1 bg-green-50 dark:bg-green-900/20 rounded-full border border-green-100 dark:border-green-900/30">
                 <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                 <span className="text-[10px] font-bold text-green-700 dark:text-green-400 uppercase tracking-wide">Live Session</span>
              </div>
            </div>
            <div className="p-0 max-h-[300px] overflow-y-auto">
              <table className="w-full text-sm text-left text-slate-600 dark:text-slate-300">
                <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-900/50 sticky top-0 z-10 backdrop-blur-sm">
                  <tr>
                    <th className="px-6 py-3">Timestamp</th>
                    <th className="px-6 py-3">Action</th>
                    <th className="px-6 py-3">Details</th>
                    <th className="px-6 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {modelLogs.length === 0 ? (
                      <tr>
                          <td colSpan={4} className="px-6 py-8 text-center text-slate-400 italic">No activity recorded in this session yet.</td>
                      </tr>
                  ) : (
                      modelLogs.map((log, index) => (
                        <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 animate-in fade-in slide-in-from-left-2 duration-300">
                          <td className="px-6 py-3 whitespace-nowrap text-xs text-slate-500">{log.timestamp.toLocaleTimeString()}</td>
                          <td className="px-6 py-3 font-medium text-slate-800 dark:text-white">{log.action}</td>
                          <td className="px-6 py-3 max-w-xs truncate" title={log.details}>{log.details}</td>
                          <td className="px-6 py-3">
                            <span className={`${
                              log.status === 'Success' ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30' :
                              log.status === 'Error' ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30' :
                              'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30'
                            } px-2 py-1 rounded-full text-xs font-semibold`}>
                              {log.status}
                            </span>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Footer - IMPROVED LAYOUT */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-6 border-t border-slate-200 dark:border-slate-800">
             <button 
               onClick={handleReset}
               className="px-6 py-3 text-sm font-medium text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 transition-colors flex items-center justify-center gap-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/50"
             >
               <RotateCcw className="w-4 h-4" />
               Reset Defaults
             </button>

             <button 
               onClick={handleSave}
               className="flex items-center justify-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 transition-all duration-200 active:scale-[0.98] w-full sm:w-auto"
             >
               <Save className="w-4 h-4" />
               Save Changes
             </button>
          </div>

          <div className="text-center text-xs text-slate-400 pt-4 pb-8">
            SecureMail AI Version 1.2.0 • Local Heuristics Engine • Optimized for Privacy
          </div>

        </div>
      </div>
    </div>
  );
};