import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DateTimePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (date: Date) => void;
  initialDate?: Date;
}

export const DateTimePickerModal: React.FC<DateTimePickerModalProps> = ({ 
  isOpen, onClose, onSave, initialDate 
}) => {
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate || new Date());
  const [viewDate, setViewDate] = useState<Date>(initialDate || new Date());
  const [timeInput, setTimeInput] = useState('');

  useEffect(() => {
    if (isOpen) {
      const d = initialDate || new Date();
      if (!initialDate) {
          d.setMinutes(0, 0, 0);
          d.setHours(d.getHours() + 1);
      }
      setSelectedDate(d);
      setViewDate(d);
      
      const hours = d.getHours().toString().padStart(2, '0');
      const minutes = d.getMinutes().toString().padStart(2, '0');
      setTimeInput(`${hours}:${minutes}`);
    }
  }, [isOpen, initialDate]);

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handleDayClick = (day: number) => {
    const newDate = new Date(selectedDate);
    newDate.setFullYear(viewDate.getFullYear());
    newDate.setMonth(viewDate.getMonth());
    newDate.setDate(day);
    setSelectedDate(newDate);
  };

  const handlePrevMonth = () => {
    const newView = new Date(viewDate);
    newView.setMonth(viewDate.getMonth() - 1);
    setViewDate(newView);
  };

  const handleNextMonth = () => {
    const newView = new Date(viewDate);
    newView.setMonth(viewDate.getMonth() + 1);
    setViewDate(newView);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTimeInput(e.target.value);
    const [h, m] = e.target.value.split(':').map(Number);
    if (!isNaN(h) && !isNaN(m)) {
        const newDate = new Date(selectedDate);
        newDate.setHours(h);
        newDate.setMinutes(m);
        setSelectedDate(newDate);
    }
  };

  const handleSave = () => {
    onSave(selectedDate);
    onClose();
  };

  if (!isOpen) return null;

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const days = daysInMonth(year, month);
  const startDay = firstDayOfMonth(year, month);
  
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const weekDays = ["S", "M", "T", "W", "T", "F", "S"];

  const calendarCells = [];
  for (let i = 0; i < startDay; i++) {
    calendarCells.push(<div key={`empty-${i}`} className="w-8 h-8"></div>);
  }
  for (let d = 1; d <= days; d++) {
    const isSelected = 
        selectedDate.getDate() === d && 
        selectedDate.getMonth() === month && 
        selectedDate.getFullYear() === year;
    
    const isToday = 
        new Date().getDate() === d && 
        new Date().getMonth() === month && 
        new Date().getFullYear() === year;

    calendarCells.push(
        <button 
            key={`day-${d}`}
            onClick={() => handleDayClick(d)}
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-colors
                ${isSelected 
                    ? 'bg-blue-600 text-white font-bold' 
                    : isToday 
                        ? 'text-blue-600 font-bold hover:bg-blue-50 dark:hover:bg-blue-900/30' 
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
        >
            {d}
        </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white dark:bg-[#1E1F20] rounded-[28px] shadow-2xl w-full max-w-[320px] md:max-w-[500px] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        
        <div className="p-6 pb-2">
            <h2 className="text-xl font-normal text-slate-800 dark:text-[#E3E3E3]">Pick date & time</h2>
        </div>

        <div className="flex flex-col md:flex-row p-6 pt-2 gap-6">
            
            {/* Left: Calendar */}
            <div className="flex-1">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium text-slate-700 dark:text-[#E3E3E3]">
                        {monthNames[month]} {year}
                    </span>
                    <div className="flex gap-1">
                        <button onClick={handlePrevMonth} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-500 dark:text-slate-400">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button onClick={handleNextMonth} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-500 dark:text-slate-400">
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-7 gap-1 mb-2">
                    {weekDays.map((day, i) => (
                        <div key={i} className="w-8 h-8 flex items-center justify-center text-xs font-medium text-slate-500 dark:text-slate-400">
                            {day}
                        </div>
                    ))}
                </div>
                
                <div className="grid grid-cols-7 gap-1">
                    {calendarCells}
                </div>
            </div>

            {/* Right: Inputs (Separated by Divider on Desktop) */}
            <div className="flex-1 flex flex-col justify-center gap-4 md:border-l border-slate-200 dark:border-slate-700 md:pl-6">
                <div>
                    <input 
                        type="text" 
                        readOnly 
                        value={selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        className="w-full px-3 py-3 border border-slate-300 dark:border-slate-600 rounded text-sm bg-transparent text-slate-800 dark:text-[#E3E3E3] focus:ring-2 focus:ring-blue-600 outline-none"
                    />
                </div>
                <div>
                    <input 
                        type="time" 
                        value={timeInput}
                        onChange={handleTimeChange}
                        className="w-full px-3 py-3 border border-slate-300 dark:border-slate-600 rounded text-sm bg-transparent text-slate-800 dark:text-[#E3E3E3] focus:ring-2 focus:ring-blue-600 outline-none"
                    />
                </div>
            </div>
        </div>

        {/* Footer */}
        <div className="p-4 flex justify-end gap-2">
            <button 
                onClick={onClose}
                className="px-6 py-2 text-sm font-medium text-blue-600 dark:text-[#A8C7FA] hover:bg-blue-50 dark:hover:bg-[#004A77]/30 rounded-full transition-colors"
            >
                Cancel
            </button>
            <button 
                onClick={handleSave}
                className="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 dark:bg-[#A8C7FA] dark:hover:bg-[#D3E3FD] dark:text-[#062E6F] rounded-full shadow-sm transition-colors"
            >
                Save
            </button>
        </div>

      </div>
    </div>
  );
};