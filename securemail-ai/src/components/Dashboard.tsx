import React, { useMemo } from 'react';
import { 
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend 
} from 'recharts';
import { Email, EmailLabel, AccuracyData } from '../types';
import { ShieldCheck, AlertTriangle, Activity, Mail } from 'lucide-react';

interface DashboardProps {
  emails: Email[]; 
  accuracyData: AccuracyData[];
}

export const Dashboard: React.FC<DashboardProps> = ({ emails }) => {
  
  // 1. Classification & Totals Stats
  const stats = useMemo(() => {
    const counts = {
      [EmailLabel.WORK]: 0,
      [EmailLabel.PERSONAL]: 0,
      [EmailLabel.PROMOTION]: 0,
      [EmailLabel.SPAM]: 0,
      [EmailLabel.PHISHING]: 0,
      [EmailLabel.GAME]: 0,
      [EmailLabel.EDUCATION]: 0,
      [EmailLabel.SOCIAL]: 0,
    };

    let totalThreats = 0;
    // Filter active emails (not deleted/trash for general stats)
    const activeEmails = emails.filter(e => !e.isDeleted);

    activeEmails.forEach(email => {
      if (counts[email.label] !== undefined) {
        counts[email.label]++;
      }
      if (email.label === EmailLabel.PHISHING || email.label === EmailLabel.SPAM) {
        totalThreats++;
      }
    });

    const chartData = [
      { name: 'Work', value: counts[EmailLabel.WORK], fill: '#3b82f6' },
      { name: 'Personal', value: counts[EmailLabel.PERSONAL], fill: '#22c55e' },
      { name: 'Promo', value: counts[EmailLabel.PROMOTION], fill: '#eab308' },
      { name: 'Spam', value: counts[EmailLabel.SPAM], fill: '#f97316' },
      { name: 'Phishing', value: counts[EmailLabel.PHISHING], fill: '#ef4444' },
      { name: 'Game', value: counts[EmailLabel.GAME], fill: '#8b5cf6' },
      { name: 'Education', value: counts[EmailLabel.EDUCATION], fill: '#14b8a6' },
    ].filter(d => d.value > 0);

    return { chartData, totalEmails: activeEmails.length, totalThreats };
  }, [emails]);

  // 2. Weekly Activity Stats (Last 7 Days)
  const weeklyActivity = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const last7Days = Array.from({length: 7}, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d;
    }).reverse();

    return last7Days.map(date => {
      const dayName = days[date.getDay()];
      // Normalize to compare dates ignoring time
      const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
      const endOfDay = startOfDay + 86400000;

      // Filter all emails (including deleted) received on this day
      const dailyEmails = emails.filter(e => {
          const emailTime = new Date(e.date).getTime();
          return emailTime >= startOfDay && emailTime < endOfDay;
      });

      return {
        day: dayName,
        received: dailyEmails.length,
        threats: dailyEmails.filter(e => e.label === EmailLabel.SPAM || e.label === EmailLabel.PHISHING).length
      };
    });
  }, [emails]);

  return (
    <div className="flex-1 bg-slate-50 dark:bg-slate-900 p-8 overflow-y-auto h-screen transition-colors duration-300">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">System Analytics</h2>
          <p className="text-slate-500 dark:text-slate-400">Real-time monitoring of email classification and threat detection.</p>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center space-x-4 transition-colors overflow-hidden">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex-shrink-0">
              <Mail className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium truncate">Active Emails</p>
              <h3 className="text-2xl font-bold text-slate-800 dark:text-white truncate">{stats.totalEmails}</h3>
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center space-x-4 transition-colors overflow-hidden">
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium truncate">Threats Detected</p>
              <h3 className="text-2xl font-bold text-slate-800 dark:text-white truncate">{stats.totalThreats}</h3>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center space-x-4 transition-colors overflow-hidden">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg flex-shrink-0">
              <ShieldCheck className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium truncate">Model Status</p>
              <h3 className="text-2xl font-bold text-slate-800 dark:text-white truncate">Online</h3>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center space-x-4 transition-colors overflow-hidden">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex-shrink-0">
              <Activity className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium truncate">Last Sync</p>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white truncate">{new Date().toLocaleTimeString()}</h3>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Classification Distribution */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-colors">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-6">Classification Distribution</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {stats.chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Legend verticalAlign="bottom" height={36} formatter={(value) => <span className="text-slate-600 dark:text-slate-300">{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Weekly Activity (Bar Chart) */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-colors">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-6">Emails vs Threats (Last 7 Days)</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyActivity}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#475569" opacity={0.3} vertical={false} />
                  <XAxis dataKey="day" stroke="#94a3b8" axisLine={false} tickLine={false} />
                  <YAxis stroke="#94a3b8" axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                    cursor={{fill: 'transparent'}}
                  />
                  <Legend verticalAlign="top" align="right" height={36} />
                  <Bar dataKey="received" name="Received" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                  <Bar dataKey="threats" name="Threats" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* Recent System Logs - Real Data from Emails */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden transition-colors">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Recent Security Events</h3>
          </div>
          <table className="w-full text-sm text-left text-slate-600 dark:text-slate-300">
            <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-900/50">
              <tr>
                <th className="px-6 py-3">Time</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Subject</th>
                <th className="px-6 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {emails
                 .filter(e => e.label === EmailLabel.PHISHING || e.label === EmailLabel.SPAM)
                 .slice(0, 5) // Show last 5 threats
                 .map((email) => (
                  <tr key={email.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="px-6 py-4">{new Date(email.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                    <td className="px-6 py-4 font-medium">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${email.label === EmailLabel.PHISHING ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                           {email.label}
                        </span>
                    </td>
                    <td className="px-6 py-4 truncate max-w-xs">{email.subject}</td>
                    <td className="px-6 py-4">
                        <span className="text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-full text-xs font-semibold">Flagged</span>
                    </td>
                  </tr>
              ))}
              {emails.filter(e => e.label === EmailLabel.PHISHING || e.label === EmailLabel.SPAM).length === 0 && (
                 <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-400 italic">No recent threats detected.</td>
                 </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};