import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Learner, SchoolSettings } from '../types';
import { DynamicQRService, DEFAULT_DYNAMIC_INTERVAL_SEC } from '../lib/dynamicQrService';
import { 
  Smartphone, 
  RefreshCw, 
  ShieldCheck, 
  Clock, 
  X, 
  User, 
  QrCode as QrIcon, 
  AlertTriangle,
  Sparkles,
  Lock
} from 'lucide-react';

interface StudentMobilePassModalProps {
  learners: Learner[];
  settings: SchoolSettings;
  isOpen: boolean;
  onClose: () => void;
  initialLearnerId?: string;
}

export const StudentMobilePassModal: React.FC<StudentMobilePassModalProps> = ({
  learners,
  settings,
  isOpen,
  onClose,
  initialLearnerId
}) => {
  const [selectedLearnerId, setSelectedLearnerId] = useState<string>(
    initialLearnerId || (learners[0]?.id ?? '')
  );
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [secondsRemaining, setSecondsRemaining] = useState<number>(30);
  const [currentToken, setCurrentToken] = useState<string>('');
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('');

  const currentLearner = learners.find(l => l.id === selectedLearnerId) || learners[0];
  const intervalSec = settings.dynamicQrIntervalSeconds || DEFAULT_DYNAMIC_INTERVAL_SEC;

  // Update clock & generate rotating QR every second / interval
  useEffect(() => {
    if (!isOpen || !currentLearner) return;

    const updatePass = async () => {
      const now = new Date();
      setCurrentTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

      const { payloadString, secondsRemaining: secRem } = DynamicQRService.generateDynamicPayload(
        currentLearner,
        intervalSec
      );
      setSecondsRemaining(secRem);

      try {
        const parsed = JSON.parse(payloadString);
        setCurrentToken(parsed.token);

        const url = await QRCode.toDataURL(payloadString, {
          width: 280,
          margin: 1.5,
          color: {
            dark: '#0f172a',
            light: '#ffffff'
          },
          errorCorrectionLevel: 'M'
        });
        setQrDataUrl(url);
      } catch (err) {
        console.error('Error generating dynamic QR image:', err);
      }
    };

    updatePass();
    const intervalTimer = setInterval(updatePass, 1000);
    return () => clearInterval(intervalTimer);
  }, [isOpen, currentLearner, intervalSec]);

  if (!isOpen || !currentLearner) return null;

  const progressPercent = ((intervalSec - secondsRemaining) / intervalSec) * 100;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 md:p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col my-auto">
        
        {/* Top Header / Student Selector */}
        <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm flex items-center gap-1.5">
                Student Mobile App Pass
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  LIVE
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">Anti-Proxy Rotating Dynamic QR (30s Cycle)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Learner Switcher */}
        <div className="px-4 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center gap-2 text-xs">
          <span className="text-slate-400 font-semibold shrink-0">Switch Learner:</span>
          <select
            value={selectedLearnerId}
            onChange={(e) => setSelectedLearnerId(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-purple-500 flex-1 truncate"
          >
            {learners.map(l => (
              <option key={l.id} value={l.id}>
                {l.lastName}, {l.firstName} ({l.grade} - {l.section})
              </option>
            ))}
          </select>
        </div>

        {/* Mobile Phone Mockup Body */}
        <div className="p-4 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center">
          
          {/* Virtual Phone Card Shell */}
          <div className="w-full max-w-[340px] rounded-2xl bg-white text-slate-900 shadow-2xl p-4 border-2 border-slate-200 relative overflow-hidden">
            
            {/* DepEd Official Header Ribbon */}
            <div className="text-center pb-2 border-b border-slate-200">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">
                Republic of the Philippines • Department of Education
              </span>
              <h4 className="font-black text-xs text-blue-900 uppercase tracking-tight">
                {settings.schoolName || 'SIRCAM Integrated School'}
              </h4>
              <span className="text-[10px] font-bold text-emerald-700 block">
                Official Digital Attendance Pass
              </span>
            </div>

            {/* Learner Header Card */}
            <div className="flex items-center gap-3 py-2.5 border-b border-slate-100">
              {currentLearner.photoUrl ? (
                <img
                  src={currentLearner.photoUrl}
                  alt={currentLearner.firstName}
                  className="w-12 h-12 rounded-xl object-cover border-2 border-blue-600 shadow-sm"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-blue-100 border-2 border-blue-600 flex items-center justify-center text-blue-800 font-black text-base">
                  {currentLearner.firstName[0]}{currentLearner.lastName[0]}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h5 className="font-black text-sm text-slate-900 leading-tight truncate">
                  {currentLearner.firstName} {currentLearner.lastName} {currentLearner.suffix || ''}
                </h5>
                <p className="text-[11px] font-mono font-bold text-blue-700">
                  LRN: {currentLearner.lrn}
                </p>
                <p className="text-[10px] text-slate-600 font-semibold truncate">
                  Grade {currentLearner.grade} • Section {currentLearner.section}
                </p>
              </div>
            </div>

            {/* LIVE ROTATING DYNAMIC QR CODE DISPLAY */}
            <div className="py-3 flex flex-col items-center justify-center relative">
              
              {/* Holographic glowing ring around QR */}
              <div className="relative p-2.5 rounded-2xl bg-slate-50 border-2 border-purple-500/60 shadow-inner flex items-center justify-center">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="Rotating QR Pass"
                    className="w-48 h-48 rounded-lg select-none"
                  />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center">
                    <RefreshCw className="w-8 h-8 text-purple-600 animate-spin" />
                  </div>
                )}

                {/* Center Badge Shield */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-9 h-9 rounded-full bg-white/95 border-2 border-purple-600 flex items-center justify-center shadow-lg">
                    <ShieldCheck className="w-5 h-5 text-purple-700" />
                  </div>
                </div>
              </div>

              {/* 30-Second Countdown Progress Bar */}
              <div className="w-full mt-3 space-y-1">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="flex items-center gap-1 font-bold text-purple-800">
                    <RefreshCw className={`w-3 h-3 ${secondsRemaining <= 5 ? 'animate-spin text-rose-600' : 'text-purple-600'}`} />
                    Expires in: <strong className={secondsRemaining <= 5 ? 'text-rose-600 font-black' : 'text-purple-700'}>{secondsRemaining}s</strong>
                  </span>
                  <span className="text-[10px] text-slate-500">{currentTimeStr}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-1000 ${
                      secondsRemaining <= 5 ? 'bg-rose-500' : secondsRemaining <= 10 ? 'bg-amber-500' : 'bg-purple-600'
                    }`}
                    style={{ width: `${100 - progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Token & Security Tag */}
              <div className="mt-2.5 flex items-center justify-between w-full text-[9px] font-mono text-slate-500 border-t border-slate-100 pt-2">
                <span className="flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5 text-purple-600" />
                  Token: {currentToken.slice(0, 8)}...
                </span>
                <span className="text-emerald-700 font-bold flex items-center gap-0.5">
                  <Sparkles className="w-2.5 h-2.5" /> Anti-Proxy Active
                </span>
              </div>
            </div>

            {/* Anti-Proxy Student Guidance */}
            <div className="mt-1 p-2 rounded-xl bg-purple-50 border border-purple-200 text-[10px] text-purple-900 leading-snug">
              <span className="font-bold flex items-center gap-1 text-purple-800">
                <ShieldCheck className="w-3 h-3 text-purple-600" /> Dynamic Anti-Proxy Enabled
              </span>
              This QR code auto-rotates every 30 seconds. Screenshots or forwarded photos will be automatically detected and rejected by the school scanner.
            </div>
          </div>
        </div>

        {/* Footer / Instructions */}
        <div className="bg-slate-950 p-4 border-t border-slate-800 flex items-center justify-between gap-3 text-xs">
          <div className="text-slate-400 text-[11px] leading-tight">
            <span>Tip: Point your webcam/scanner at this rotating QR code to test instant anti-proxy validation!</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition shadow shrink-0"
          >
            Close Pass
          </button>
        </div>

      </div>
    </div>
  );
};
