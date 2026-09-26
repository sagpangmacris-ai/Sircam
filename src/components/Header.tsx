import React, { useEffect, useState } from 'react';
import { SyncState, storage } from '../lib/storage';
import { SchoolSettings } from '../types';
import { 
  Cloud, 
  CloudOff, 
  RefreshCw, 
  Clock, 
  Maximize2, 
  Minimize2, 
  QrCode, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';

interface HeaderProps {
  settings: SchoolSettings;
  onOpenScanner: () => void;
  isKiosk: boolean;
  onToggleKiosk: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  onOpenScanner,
  isKiosk,
  onToggleKiosk
}) => {
  const [syncState, setSyncState] = useState<SyncState>(storage.getSyncState());
  const [queueCount, setQueueCount] = useState<number>(storage.getSyncQueue().length);
  const [isSyncing, setIsSyncing] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [syncMessage, setSyncMessage] = useState<string>('');

  useEffect(() => {
    const unsubState = storage.subscribeSyncState(state => {
      setSyncState(state);
    });

    const unsubQueue = storage.subscribeQueueCount(count => {
      setQueueCount(count);
    });

    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setCurrentDate(now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }));
    };

    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => {
      unsubState();
      unsubQueue();
      clearInterval(timer);
    };
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncMessage('Draining offline queue & syncing Firestore...');
    try {
      const queueRes = await storage.processSyncQueue();
      const result = await storage.syncWithCloud();
      setSyncMessage(`Uploaded ${queueRes.processed} queued items & synced ${result.learners} learners`);
      setTimeout(() => setSyncMessage(''), 3000);
    } catch {
      setSyncMessage('Cloud sync offline or queued locally');
      setTimeout(() => setSyncMessage(''), 3000);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white px-4 py-3 sticky top-0 z-30 shadow-md">
      <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto">
        {/* Brand & School */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-lg tracking-wider shadow-md border border-blue-400/30">
            SC
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-base md:text-lg tracking-tight bg-gradient-to-r from-blue-400 to-teal-300 bg-clip-text text-transparent">
                SIRCAM
              </h1>
              <span className="hidden sm:inline-block text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                DepEd Compatible
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate max-w-[200px] md:max-w-[320px]">
              {settings.schoolName || 'Student Attendance & Records'}
            </p>
          </div>
        </div>

        {/* Live Clock & Date */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-200">
          <Clock className="w-4 h-4 text-blue-400 animate-pulse" />
          <div className="text-xs font-mono font-medium">
            <span className="text-white font-bold">{currentTime}</span>
            <span className="text-slate-400 ml-2">| {currentDate}</span>
          </div>
        </div>

        {/* Actions & Status */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Cloud Sync Status Indicator */}
          <div className="flex items-center gap-1.5">
            {queueCount > 0 && (
              <span className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40" title={`${queueCount} changes queued in local offline queue`}>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span>{queueCount} Queued</span>
              </span>
            )}

            {syncState === 'online_synced' && queueCount === 0 && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" title="Connected to Cloud Firestore (Real-time sync)">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <Cloud className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Cloud Synced</span>
              </span>
            )}
            {syncState === 'syncing' && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span className="hidden sm:inline">Syncing...</span>
              </span>
            )}
            {syncState === 'offline' && queueCount === 0 && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30" title="Offline SQLite mode active - local changes saved">
                <CloudOff className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Offline Mode</span>
              </span>
            )}
            {syncState === 'error' && queueCount === 0 && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30" title="Cloud sync issue - local database functional">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Local Only</span>
              </span>
            )}
          </div>

          {/* Sync Now Button */}
          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
            title="Force Cloud Sync"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-blue-400' : ''}`} />
          </button>

          {/* Quick Scanner Action */}
          <button
            onClick={onOpenScanner}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-500 hover:to-teal-500 text-white font-medium text-xs sm:text-sm shadow-md transition transform active:scale-95"
          >
            <QrCode className="w-4 h-4" />
            <span className="hidden sm:inline">Scan QR</span>
          </button>

          {/* Kiosk Mode Toggle */}
          <button
            onClick={onToggleKiosk}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
            title={isKiosk ? 'Exit Kiosk Mode' : 'Enter Kiosk Stand Mode'}
          >
            {isKiosk ? <Minimize2 className="w-4 h-4 text-amber-400" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {syncMessage && (
        <div className="text-center text-xs py-1 text-teal-300 bg-slate-800/90 border-t border-slate-700/50 flex items-center justify-center gap-2 mt-2">
          <CheckCircle2 className="w-3.5 h-3.5" />
          {syncMessage}
        </div>
      )}
    </header>
  );
};
