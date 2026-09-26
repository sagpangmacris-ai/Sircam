import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Learner, AttendanceRecord, SchoolSettings, AlertLog } from '../types';
import { soundEffects } from '../lib/audio';
import { AlertService, openFacebookMessenger, openNativeSms } from '../lib/alertService';
import { DynamicQRService } from '../lib/dynamicQrService';
import { StudentMobilePassModal } from './StudentMobilePassModal';
import { storage } from '../lib/storage';
import { 
  Camera, 
  CameraOff, 
  Volume2, 
  VolumeX, 
  CheckCircle2, 
  AlertCircle, 
  Send, 
  ArrowRight, 
  RotateCcw, 
  Sparkles,
  Search,
  MessageCircle,
  Phone,
  Smartphone,
  ShieldCheck,
  ShieldAlert,
  Mic,
  MicOff,
  CloudUpload,
  Wifi,
  WifiOff,
  Check
} from 'lucide-react';

interface QRScannerViewProps {
  learners: Learner[];
  attendanceRecords: AttendanceRecord[];
  settings: SchoolSettings;
  todayDate: string;
  onRecordAttendance: (record: AttendanceRecord, alert?: AlertLog) => void;
  isKiosk?: boolean;
}

type ScanMode = 'auto' | 'time_in' | 'time_out';

export const QRScannerView: React.FC<QRScannerViewProps> = ({
  learners,
  attendanceRecords,
  settings,
  todayDate,
  onRecordAttendance,
  isKiosk
}) => {
  const [scanMode, setScanMode] = useState<ScanMode>('auto');
  const [isScanning, setIsScanning] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(settings.soundChimeEnabled !== false);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(settings.voiceFeedbackEnabled !== false);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('environment');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [manualInput, setManualInput] = useState<string>('');
  
  // Student Mobile Pass Modal State
  const [isStudentPassOpen, setIsStudentPassOpen] = useState<boolean>(false);

  // Anti-Proxy Warning State
  const [antiProxyWarning, setAntiProxyWarning] = useState<{
    learnerName?: string;
    ageSeconds?: number;
    message: string;
  } | null>(null);

  // Offline Queue State
  const [queueCount, setQueueCount] = useState<number>(0);
  const [isSyncingQueue, setIsSyncingQueue] = useState<boolean>(false);
  const [syncToast, setSyncToast] = useState<string | null>(null);

  // Sync sound preferences with audio engine
  useEffect(() => {
    soundEffects.setPreferences(soundEnabled, voiceEnabled);
  }, [soundEnabled, voiceEnabled]);

  // Subscribe to offline sync queue count
  useEffect(() => {
    const unsub = storage.subscribeQueueCount(count => setQueueCount(count));
    return unsub;
  }, []);

  const handleManualSyncNow = async () => {
    if (isSyncingQueue) return;
    setIsSyncingQueue(true);
    try {
      const res = await storage.processSyncQueue();
      await storage.syncWithCloud();
      setSyncToast(`Synced ${res.processed} offline entries to Cloud Firestore!`);
      setTimeout(() => setSyncToast(null), 3500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sync check failed';
      setSyncToast(`Sync notice: ${msg}`);
      setTimeout(() => setSyncToast(null), 3500);
    } finally {
      setIsSyncingQueue(false);
    }
  };

  // Last scan result display modal/card
  const [lastScannedResult, setLastScannedResult] = useState<{
    learner: Learner;
    record: AttendanceRecord;
    actionType: 'time_in' | 'time_out';
    alertTriggered?: AlertLog;
    timestampStr: string;
    isDynamicPass?: boolean;
  } | null>(null);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const isProcessingRef = useRef<boolean>(false);
  const scannerContainerId = 'sircam-qr-reader';

  // Helper to format current time string with seconds (e.g. 07:29:45 AM)
  const getCurrentTimeFormatted = (): string => {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  // Determine if late based on school settings
  const checkIsLate = (now: Date): boolean => {
    const [startH, startM] = settings.schoolStartTime.split(':').map(Number);
    const lateThreshold = new Date(now);
    lateThreshold.setHours(startH, startM, 0, 0);
    return now.getTime() > lateThreshold.getTime();
  };

  // Process a scanned raw text (JSON or 12-digit LRN or Learner ID)
  const processScanCode = (decodedText: string) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    try {
      // 1. Check for Anti-Proxy Dynamic Rotating QR Pass
      const intervalSec = settings.dynamicQrIntervalSeconds || 30;
      const dynamicCheck = DynamicQRService.validateScannedPayload(decodedText, intervalSec);

      if (dynamicCheck.isDynamicPass && !dynamicCheck.isValid) {
        if (dynamicCheck.errorReason === 'EXPIRED_PROXY_PHOTO') {
          if (soundEnabled) soundEffects.playAntiProxyAlert();
          if (voiceEnabled) {
            soundEffects.speakAttendance(dynamicCheck.learnerName || 'Student', 'ExpiredProxy', settings.voiceSpeechRate || 1.0);
          }
          setAntiProxyWarning({
            learnerName: dynamicCheck.learnerName,
            ageSeconds: dynamicCheck.ageSeconds,
            message: `⚠️ PROXY CHECK-IN REJECTED! This dynamic pass expired ${dynamicCheck.ageSeconds || 30}s ago. DepEd Anti-Proxy Policy strictly requires students to show their live rotating mobile app pass, not a photograph or forwarded screenshot.`
          });
          setTimeout(() => {
            setAntiProxyWarning(null);
            isProcessingRef.current = false;
          }, 3800);
          return;
        } else {
          if (soundEnabled) soundEffects.playError();
          setErrorMessage('Invalid or tampered dynamic QR token.');
          setTimeout(() => {
            setErrorMessage('');
            isProcessingRef.current = false;
          }, 2500);
          return;
        }
      }

      let targetLearner: Learner | undefined;

      // Check if target is identified by dynamic check
      if (dynamicCheck.learnerId) {
        targetLearner = learners.find(l => l.id === dynamicCheck.learnerId || l.lrn === dynamicCheck.lrn);
      }

      // Check if it's JSON payload from SIRCAM static badge
      if (!targetLearner && decodedText.startsWith('{') && decodedText.endsWith('}')) {
        try {
          const parsed = JSON.parse(decodedText);
          if (parsed.id) {
            targetLearner = learners.find(l => l.id === parsed.id || l.lrn === parsed.lrn);
          }
        } catch {}
      }

      // Check by LRN (12 digits) or ID
      if (!targetLearner) {
        const clean = decodedText.trim();
        targetLearner = learners.find(l => l.lrn === clean || l.id === clean);
      }

      if (!targetLearner) {
        if (soundEnabled) soundEffects.playError();
        setErrorMessage(`QR Code unrecognized (${decodedText.substring(0, 18)}...). Learner not found.`);
        setTimeout(() => {
          setErrorMessage('');
          isProcessingRef.current = false;
        }, 2500);
        return;
      }

      // Found learner! Now determine Attendance Action
      const now = new Date();
      const timeStr = getCurrentTimeFormatted();
      const existingRecord = attendanceRecords.find(
        r => r.date === todayDate && (r.learnerId === targetLearner!.id || r.lrn === targetLearner!.lrn)
      );

      let action: 'time_in' | 'time_out' = 'time_in';
      if (scanMode === 'auto') {
        if (existingRecord && existingRecord.timeIn && !existingRecord.timeOut) {
          action = 'time_out';
        } else {
          action = 'time_in';
        }
      } else {
        action = scanMode === 'time_out' ? 'time_out' : 'time_in';
      }

      let updatedRecord: AttendanceRecord;
      let alertLog: AlertLog | undefined;

      if (action === 'time_in') {
        const isLate = checkIsLate(now);
        const status = isLate ? 'Late' : 'Present';

        // Sound Chime Feedback (Green for Present, Yellow for Late)
        if (soundEnabled) {
          if (isLate) soundEffects.playLate();
          else soundEffects.playSuccess();
        }

        // Voice Feedback (TTS) Announcement with learner's name
        if (voiceEnabled) {
          soundEffects.speakAttendance(targetLearner.firstName, isLate ? 'Late' : 'Present', settings.voiceSpeechRate || 1.0);
        }

        const methodNote = dynamicCheck.isDynamicPass 
          ? 'Live Dynamic Anti-Proxy Pass (30s)' 
          : (isLate ? 'Recorded Late via QR' : 'On-time QR arrival');

        updatedRecord = {
          id: existingRecord ? existingRecord.id : `${todayDate}_${targetLearner.id}`,
          learnerId: targetLearner.id,
          lrn: targetLearner.lrn,
          date: todayDate,
          timeIn: timeStr,
          timeInTimestamp: now.getTime(),
          timeOut: existingRecord?.timeOut,
          timeOutTimestamp: existingRecord?.timeOutTimestamp,
          status,
          method: 'qr_camera',
          notes: existingRecord?.notes || methodNote,
          alertLateSent: isLate && settings.enableAutoLateAlert,
          updatedAt: Date.now()
        };

        if (isLate && settings.enableAutoLateAlert) {
          alertLog = AlertService.handleLateAlert(targetLearner, timeStr, settings);
        }
      } else {
        // Time-Out (Going Home)
        if (soundEnabled) soundEffects.playTimeOut();

        if (voiceEnabled) {
          soundEffects.speakAttendance(targetLearner.firstName, 'GoingHome', settings.voiceSpeechRate || 1.0);
        }

        updatedRecord = {
          id: existingRecord ? existingRecord.id : `${todayDate}_${targetLearner.id}`,
          learnerId: targetLearner.id,
          lrn: targetLearner.lrn,
          date: todayDate,
          timeIn: existingRecord?.timeIn || '07:30:00 AM',
          timeInTimestamp: existingRecord?.timeInTimestamp || now.getTime(),
          timeOut: timeStr,
          timeOutTimestamp: now.getTime(),
          status: existingRecord?.status || 'Present',
          method: 'qr_camera',
          alertGoingHomeSent: settings.enableAutoGoingHomeAlert,
          updatedAt: Date.now()
        };

        // Automated Going Home Alert trigger (100% Free)
        if (settings.enableAutoGoingHomeAlert) {
          alertLog = AlertService.handleGoingHomeAlert(targetLearner, timeStr, settings, true);
        }
      }

      onRecordAttendance(updatedRecord, alertLog);

      setLastScannedResult({
        learner: targetLearner,
        record: updatedRecord,
        actionType: action,
        alertTriggered: alertLog,
        timestampStr: timeStr,
        isDynamicPass: dynamicCheck.isDynamicPass
      });

      // Clear processing flag after debounce
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 1800);

    } catch (err) {
      console.error('Scan processing error:', err);
      isProcessingRef.current = false;
    }
  };

  // Initialize Camera
  useEffect(() => {
    let html5QrCode: Html5Qrcode | null = null;

    const startScanner = async () => {
      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          setCameras(devices);
          const camId = selectedCameraId || devices[0].id;
          setSelectedCameraId(camId);

          html5QrCode = new Html5Qrcode(scannerContainerId, {
            formatsToSupport: [
              Html5QrcodeSupportedFormats.QR_CODE,
              Html5QrcodeSupportedFormats.CODE_128,
              Html5QrcodeSupportedFormats.CODE_39
            ],
            verbose: false
          });
          html5QrCodeRef.current = html5QrCode;

          await html5QrCode.start(
            camId,
            {
              fps: 15,
              qrbox: { width: 250, height: 250 },
              aspectRatio: 1.0
            },
            (decodedText) => {
              processScanCode(decodedText);
            },
            () => {
              // frame scanned without QR, ignore
            }
          );
          setIsScanning(true);
          setErrorMessage('');
        } else {
          setErrorMessage('No camera found on this device. You can still use the manual LRN input below.');
        }
      } catch (err: unknown) {
        console.warn('Camera initialize note:', err);
        setErrorMessage('Camera access restricted or unavailable. Please enable camera permission or use the manual LRN entry below.');
      }
    };

    if (isScanning) {
      startScanner();
    }

    return () => {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current
          .stop()
          .catch(() => {})
          .finally(() => {
            html5QrCodeRef.current = null;
          });
      }
    };
  }, [selectedCameraId, cameraFacing, isScanning]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    processScanCode(manualInput.trim());
    setManualInput('');
  };

  return (
    <div className={`space-y-6 ${isKiosk ? 'p-4 max-w-4xl mx-auto' : ''}`}>
      {/* Top Scanner Mode Switcher & Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md flex flex-wrap items-center justify-between gap-3">
        {/* Mode Selector */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
          <button
            onClick={() => setScanMode('auto')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              scanMode === 'auto'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            ⚡ Smart Auto
          </button>
          <button
            onClick={() => setScanMode('time_in')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              scanMode === 'time_in'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            📥 Force In
          </button>
          <button
            onClick={() => setScanMode('time_out')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              scanMode === 'time_out'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            📤 Force Out
          </button>
        </div>

        {/* Anti-Proxy, Offline Queue, Audio, and Camera toggles */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Student Mobile Pass Launcher */}
          <button
            onClick={() => setIsStudentPassOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 text-xs font-bold transition shadow-sm"
            title="Open Student Mobile App with 30-Second Rotating Dynamic Anti-Proxy QR Code"
          >
            <Smartphone className="w-3.5 h-3.5 text-purple-400" />
            <span>Student App (Rotating QR)</span>
          </button>

          {/* Offline Sync Queue Status */}
          {queueCount > 0 ? (
            <button
              onClick={handleManualSyncNow}
              disabled={isSyncingQueue}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition"
              title="Click to sync local offline queue to Cloud Firestore now"
            >
              <CloudUpload className={`w-3.5 h-3.5 ${isSyncingQueue ? 'animate-bounce' : ''}`} />
              <span>{queueCount} Offline Queued</span>
            </button>
          ) : (
            <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
              <Wifi className="w-3 h-3 text-emerald-400" />
              <span>Auto-Sync Ready</span>
            </div>
          )}

          {/* Sound Chimes Toggle (Green / Yellow chimes) */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-xl border text-xs font-medium transition flex items-center gap-1 ${
              soundEnabled
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                : 'bg-slate-800 text-slate-500 border-slate-700'
            }`}
            title={soundEnabled ? 'Melodic Chimes (Green/Yellow) Enabled' : 'Chimes Muted'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Voice Feedback (TTS Name Announcement) Toggle */}
          <button
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className={`p-2 rounded-xl border text-xs font-medium transition flex items-center gap-1 ${
              voiceEnabled
                ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                : 'bg-slate-800 text-slate-500 border-slate-700'
            }`}
            title={voiceEnabled ? 'Voice (TTS) Learner Name Announcements Active' : 'Voice Announcements Off'}
          >
            {voiceEnabled ? <Mic className="w-4 h-4 text-blue-400" /> : <MicOff className="w-4 h-4" />}
          </button>

          {/* Camera Selector */}
          {cameras.length > 1 && (
            <select
              value={selectedCameraId}
              onChange={(e) => setSelectedCameraId(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-xs text-white rounded-xl px-2.5 py-1.5 focus:outline-none"
            >
              {cameras.map((c, i) => (
                <option key={c.id} value={c.id}>
                  {c.label || `Camera ${i + 1}`}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => setIsScanning(!isScanning)}
            className={`p-2 rounded-xl border text-xs font-medium transition ${
              isScanning
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
            }`}
            title={isScanning ? 'Scanner Active' : 'Scanner Paused'}
          >
            {isScanning ? <Camera className="w-4 h-4" /> : <CameraOff className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Sync Toast Feedback */}
      {syncToast && (
        <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs flex items-center justify-between animate-in fade-in">
          <span className="flex items-center gap-2">
            <Check className="w-4 h-4" /> {syncToast}
          </span>
          <button onClick={() => setSyncToast(null)} className="text-emerald-400 hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Scanner Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Camera Viewport */}
        <div className="lg:col-span-7 space-y-4">
          <div className="relative bg-slate-950 rounded-2xl border-2 border-blue-500/30 overflow-hidden shadow-2xl min-h-[340px] flex items-center justify-center">
            {/* HTML5 QR Container */}
            <div
              id={scannerContainerId}
              className="w-full h-full max-w-[420px] aspect-square rounded-xl overflow-hidden"
            />

            {/* Anti-Proxy Violation Warning Overlay */}
            {antiProxyWarning && (
              <div className="absolute inset-0 bg-rose-950/90 backdrop-blur-md p-6 flex flex-col items-center justify-center text-center space-y-3 z-30 animate-in fade-in zoom-in-95">
                <div className="w-14 h-14 rounded-2xl bg-rose-600/30 border-2 border-rose-500 flex items-center justify-center text-rose-400 animate-pulse">
                  <ShieldAlert className="w-8 h-8" />
                </div>
                <h4 className="font-black text-lg text-white">
                  ANTI-PROXY CHECK-IN BLOCKED!
                </h4>
                <p className="text-xs text-rose-200 max-w-sm leading-relaxed">
                  {antiProxyWarning.message}
                </p>
                <div className="p-2.5 rounded-xl bg-slate-950/80 border border-rose-500/40 text-[11px] text-slate-300">
                  <span>Student: <strong>{antiProxyWarning.learnerName || 'Unverified'}</strong></span>
                  <span className="block text-slate-400 mt-0.5">Proxy check-ins using photographs violate school attendance policy.</span>
                </div>
                <button
                  onClick={() => setAntiProxyWarning(null)}
                  className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg transition"
                >
                  Dismiss Warning
                </button>
              </div>
            )}

            {/* Scanning Overlay Reticle */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-56 h-56 border-2 border-dashed border-teal-400/80 rounded-2xl relative shadow-[0_0_20px_rgba(20,184,166,0.3)] animate-pulse">
                {/* Corner Accents */}
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-teal-400 rounded-tl-lg" />
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-teal-400 rounded-tr-lg" />
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-teal-400 rounded-bl-lg" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-teal-400 rounded-br-lg" />
              </div>
            </div>

            {/* Mode Indicator Overlay */}
            <div className="absolute top-3 left-3 pointer-events-none flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase bg-slate-900/90 text-teal-300 border border-teal-500/30 backdrop-blur-sm shadow-md">
                {scanMode === 'auto'
                  ? '⚡ Auto Mode (In/Out)'
                  : scanMode === 'time_in'
                  ? '📥 Time-In Recording'
                  : '📤 Time-Out (Going Home)'}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/25 text-purple-300 border border-purple-500/40 backdrop-blur-sm shadow-md flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-purple-400" />
                Anti-Proxy Active
              </span>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Manual LRN / Barcode Scanner Input */}
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="Barcode Gun / Type 12-Digit LRN (e.g. 109283746501)..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shrink-0 transition"
            >
              Submit LRN
            </button>
          </form>
        </div>

        {/* Right Column: Instant Scan Feedback Card & Parent Alert Preview */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <h3 className="font-bold text-white text-sm tracking-wide flex items-center justify-between">
              <span>Instant Scan Card</span>
              {lastScannedResult && (
                <span className="text-xs font-normal text-slate-400">
                  {lastScannedResult.timestampStr}
                </span>
              )}
            </h3>

            {lastScannedResult ? (
              <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                {/* Learner Banner */}
                <div className="flex items-center gap-4 p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
                  {lastScannedResult.learner.photoUrl ? (
                    <img
                      src={lastScannedResult.learner.photoUrl}
                      alt={lastScannedResult.learner.firstName}
                      className="w-16 h-16 rounded-xl object-cover border-2 border-blue-500/40 shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-blue-600/30 text-blue-300 border border-blue-500/40 flex items-center justify-center font-bold text-xl shrink-0">
                      {lastScannedResult.learner.firstName[0]}
                      {lastScannedResult.learner.lastName[0]}
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md inline-block ${
                          lastScannedResult.actionType === 'time_in'
                            ? lastScannedResult.record.status === 'Present'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        }`}
                      >
                        {lastScannedResult.actionType === 'time_in'
                          ? `Time-In: ${lastScannedResult.record.status}`
                          : 'Time-Out: Left School'}
                      </span>

                      {lastScannedResult.isDynamicPass && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-purple-400" />
                          Anti-Proxy Pass Verified
                        </span>
                      )}
                    </div>
                    <h4 className="text-base font-extrabold text-white truncate">
                      {lastScannedResult.learner.firstName} {lastScannedResult.learner.lastName}
                    </h4>
                    <p className="text-xs text-slate-400">
                      LRN: <span className="font-mono text-slate-200">{lastScannedResult.learner.lrn}</span>
                    </p>
                    <p className="text-xs text-slate-400">
                      {lastScannedResult.learner.grade} - Section {lastScannedResult.learner.section}
                    </p>
                  </div>
                </div>

                {/* Scan Time Details */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/60">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Time-In</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {lastScannedResult.record.timeIn || '—'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/60">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Time-Out</span>
                    <span className="font-mono font-bold text-indigo-300">
                      {lastScannedResult.record.timeOut || 'Still on campus'}
                    </span>
                  </div>
                </div>

                {/* Automated Parent Notification Dispatch Block */}
                {lastScannedResult.alertTriggered && (
                  <div className="p-3.5 rounded-xl bg-blue-950/40 border border-blue-500/30 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-blue-300 flex items-center gap-1.5">
                        <Send className="w-3.5 h-3.5 text-blue-400" /> Automated Parent Alert
                      </span>
                      <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                        100% Free Trigger
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 italic bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 leading-relaxed font-sans">
                      &ldquo;{lastScannedResult.alertTriggered.messageText}&rdquo;
                    </p>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-slate-400">
                        Parent: <strong>{lastScannedResult.learner.parentName}</strong>
                      </span>
                      <div className="flex items-center gap-1.5">
                        {/* Direct Native SMS launcher */}
                        <button
                          onClick={() =>
                            openNativeSms(
                              lastScannedResult.learner.parentContact,
                              lastScannedResult.alertTriggered!.messageText
                            )
                          }
                          className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium text-[11px] flex items-center gap-1"
                          title="Open native SIM SMS app"
                        >
                          <Phone className="w-3 h-3" /> Free SMS
                        </button>

                        {/* Direct Messenger Launcher */}
                        {lastScannedResult.learner.parentMessengerId && (
                          <button
                            onClick={() =>
                              openFacebookMessenger(
                                lastScannedResult.learner.parentMessengerId,
                                lastScannedResult.alertTriggered!.messageText
                              )
                            }
                            className="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-[11px] flex items-center gap-1"
                            title="Open Facebook Messenger chat"
                          >
                            <MessageCircle className="w-3 h-3" /> Messenger
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-14 text-slate-500 space-y-2">
                <Sparkles className="w-8 h-8 mx-auto text-slate-600" />
                <p className="text-xs font-medium">Ready to scan student QR badges.</p>
                <p className="text-[11px] text-slate-400">
                  Hold QR ID card directly in front of the camera lens.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Student Mobile App Live Pass Modal */}
      <StudentMobilePassModal
        learners={learners}
        settings={settings}
        isOpen={isStudentPassOpen}
        onClose={() => setIsStudentPassOpen(false)}
        initialLearnerId={lastScannedResult?.learner.id}
      />
    </div>
  );
};
