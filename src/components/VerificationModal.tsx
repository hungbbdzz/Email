
import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, ArrowRight, Loader2, RefreshCw, Clock } from 'lucide-react';

interface VerificationModalProps {
  isOpen: boolean;
  email: string;
  isLoading: boolean;
  error: string | null;
  expiryTime: number; // Timestamp when code expires
  onVerify: (code: string) => void;
  onResend: () => void;
  onCancel: () => void;
}

export const VerificationModal: React.FC<VerificationModalProps> = ({ 
  isOpen, email, isLoading, error, expiryTime, onVerify, onResend, onCancel 
}) => {
  const [otp, setOtp] = useState<string[]>(new Array(6).fill(""));
  const [timeLeft, setTimeLeft] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Timer Logic
  useEffect(() => {
    if (!isOpen) return;
    
    const interval = setInterval(() => {
      const seconds = Math.max(0, Math.floor((expiryTime - Date.now()) / 1000));
      setTimeLeft(seconds);
      if (seconds <= 0) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, expiryTime]);

  // Auto focus first input on open
  useEffect(() => {
    if (isOpen) {
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
        setOtp(new Array(6).fill(""));
    }
  }, [isOpen]);

  const handleChange = (element: HTMLInputElement, index: number) => {
    if (isNaN(Number(element.value))) return false;

    const newOtp = [...otp];
    newOtp[index] = element.value;
    setOtp(newOtp);

    // Focus next input
    if (element.value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto submit if filled
    if (index === 5 && element.value && newOtp.every(val => val !== "")) {
        onVerify(newOtp.join(""));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace") {
        if (!otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
        const newOtp = [...otp];
        newOtp[index] = "";
        setOtp(newOtp);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, 6).split("");
    if (pastedData.some(char => isNaN(Number(char)))) return;

    const newOtp = [...otp];
    pastedData.forEach((char, index) => {
        if (index < 6) newOtp[index] = char;
    });
    setOtp(newOtp);
    
    // Focus appropriate input or submit
    if (pastedData.length === 6) {
        inputRefs.current[5]?.focus();
        onVerify(newOtp.join(""));
    } else {
        inputRefs.current[pastedData.length]?.focus();
    }
  };

  const handleVerifyClick = () => {
      onVerify(otp.join(""));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop with blur */}
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md transition-opacity" />
      
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-[420px] rounded-3xl shadow-2xl p-8 border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4 ring-8 ring-blue-50/50 dark:ring-blue-900/10">
            <ShieldCheck size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Identity Verification</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            Enter the 6-digit code sent to <br/>
            <span className="font-semibold text-slate-700 dark:text-slate-200">{email}</span>
          </p>
        </div>

        {/* OTP Inputs */}
        <div className="flex justify-between gap-2 mb-6">
            {otp.map((data, index) => (
                <input
                    key={index}
                    type="text"
                    maxLength={1}
                    ref={(el) => { inputRefs.current[index] = el; }}
                    value={data}
                    onChange={e => handleChange(e.target, index)}
                    onKeyDown={e => handleKeyDown(e, index)}
                    onPaste={handlePaste}
                    className={`w-12 h-14 border-2 rounded-xl text-center text-2xl font-bold bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none transition-all duration-200
                        ${error ? 'border-red-500 focus:border-red-500' : 'border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'}
                        disabled:opacity-50
                    `}
                    disabled={isLoading || timeLeft === 0}
                />
            ))}
        </div>

        {/* Error Message */}
        {error && (
            <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center justify-center text-xs font-medium text-red-600 dark:text-red-400 animate-in fade-in slide-in-from-top-1">
                {error}
            </div>
        )}

        {/* Timer & Resend */}
        <div className="flex items-center justify-between text-sm mb-8">
            <div className={`flex items-center gap-1.5 ${timeLeft < 10 ? 'text-red-500' : 'text-slate-500 dark:text-slate-400'}`}>
                <Clock size={16} />
                <span className="font-mono font-medium">{timeLeft > 0 ? `00:${timeLeft.toString().padStart(2, '0')}` : 'Expired'}</span>
            </div>
            
            <button 
                onClick={() => {
                    setOtp(new Array(6).fill(""));
                    onResend();
                }}
                disabled={timeLeft > 0 || isLoading}
                className={`flex items-center gap-1.5 font-medium transition-colors ${
                    timeLeft > 0 
                        ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed' 
                        : 'text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300'
                }`}
            >
                <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                Resend Code
            </button>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
            <button
              onClick={handleVerifyClick}
              disabled={isLoading || timeLeft === 0 || otp.some(v => v === "")}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-xl font-semibold shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2 transition-all duration-200"
            >
              {isLoading ? <Loader2 size={20} className="animate-spin" /> : <>Verify <ArrowRight size={20} /></>}
            </button>
            
            <button
              onClick={onCancel}
              className="w-full py-3.5 text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
            >
              Logout & Return
            </button>
        </div>
      </div>
    </div>
  );
};
