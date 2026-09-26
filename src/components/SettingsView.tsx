import React, { useState, useRef, useEffect } from 'react';
import { SchoolSettings, OfflineSyncQueueItem } from '../types';
import { storage, SyncState } from '../lib/storage';
import { soundEffects } from '../lib/audio';
import { 
  Settings, 
  Cloud, 
  HardDrive, 
  Download, 
  Upload, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  Save, 
  School, 
  Clock, 
  Database,
  ShieldCheck,
  RefreshCw,
  BellRing,
  ShieldAlert,
  Volume2,
  Mic,
  Smartphone,
  CloudUpload,
  Trash2,
  Wifi,
  Sparkles
} from 'lucide-react';

interface SettingsViewProps {
  settings: SchoolSettings;
  onUpdateSettings: (settings: SchoolSettings) => void;
  onReloadAllData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onReloadAllData
}) => {
  const [formData, setFormData] = useState<SchoolSettings>({ ...settings });
  const [saveStatus, setSaveStatus] = useState<string>('');
  const [syncStatus, setSyncStatus] = useState<SyncState>(storage.getSyncState());
  const [isSyncing, setIsSyncing] = useState(false);
  const [restoreFeedback, setRestoreFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings(formData);
    setSaveStatus('School settings updated successfully!');
    setTimeout(() => setSaveStatus(''), 3000);
  };

  const handleSyncCloud = async () => {
    setIsSyncing(true);
    try {
      const res = await storage.syncWithCloud();
      setSyncStatus('online_synced');
      setSaveStatus(`Cloud Sync complete: ${res.learners} learners and ${res.attendance} records synced.`);
      onReloadAllData();
      setTimeout(() => setSaveStatus(''), 4000);
    } catch {
      setSyncStatus('error');
      setSaveStatus('Cloud sync failed or network unavailable.');
      setTimeout(() => setSaveStatus(''), 4000);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDownloadBackup = () => {
    storage.downloadDatabaseBackupFile();
    setSaveStatus('Database backup file (.sircam.db) downloaded successfully!');
    setTimeout(() => setSaveStatus(''), 3000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const result = storage.restoreDatabaseBackup(content);
        if (result.success) {
          setRestoreFeedback({ type: 'success', message: result.message });
          onReloadAllData();
        } else {
          setRestoreFeedback({ type: 'error', message: result.message });
        }
      }
    };
    reader.readAsText(file);
    // reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleResetSampleData = () => {
    if (window.confirm('Reset local database to official DepEd sample class dataset? Any custom unsaved logs will be overwritten.')) {
      storage.resetToSampleData();
      onReloadAllData();
      setSaveStatus('Database restored to default DepEd sample class dataset.');
      setTimeout(() => setSaveStatus(''), 3500);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md">
        <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-400" /> Hybrid Storage Architecture &amp; System Configuration
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Configure offline SQLite storage, Firebase Firestore cloud sync, database backup/restore, and school attendance schedules
        </p>
      </div>

      {saveStatus && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2 shadow-sm animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{saveStatus}</span>
        </div>
      )}

      {/* Storage Architecture Status Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Offline-First SQLite Local Store */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-emerald-400" /> Offline-First Storage Engine
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              100% Offline Ready
            </span>
          </div>
          <p className="text-slate-300 leading-relaxed">
            All student profiles, QR scan records, and parent alert outbox logs are saved locally first. The application operates with zero internet latency in remote or poor connectivity areas.
          </p>

          <div className="pt-2 border-t border-slate-800 flex flex-wrap gap-2">
            <button
              onClick={handleDownloadBackup}
              className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center gap-2 transition"
            >
              <Download className="w-4 h-4" /> Download Database Backup (.sircam.db)
            </button>

            <label className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold flex items-center gap-2 cursor-pointer transition">
              <Upload className="w-4 h-4 text-indigo-400" /> Restore Database File
              <input
                ref={fileInputRef}
                type="file"
                accept=".db,.json,.sircam.db"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>

          {restoreFeedback && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                restoreFeedback.type === 'success'
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
              }`}
            >
              {restoreFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              )}
              <span>{restoreFeedback.message}</span>
            </div>
          )}
        </div>

        {/* Cloud Sync (Firebase Firestore) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Cloud className="w-4 h-4 text-blue-400" /> Firebase Firestore Cloud Sync
            </h3>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                syncStatus === 'online_synced'
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
              }`}
            >
              {syncStatus === 'online_synced' ? 'Live Cloud Connected' : 'Offline / Local'}
            </span>
          </div>
          <p className="text-slate-300 leading-relaxed">
            Live synchronization pushes local check-ins and learner profiles to Firestore (<code className="text-teal-300">tera-aura-gwh4c</code>), enabling seamless multi-device access across teachers, administrators, and kiosk stands.
          </p>

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <button
              onClick={handleSyncCloud}
              disabled={isSyncing}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold flex items-center gap-2 border border-slate-700 transition"
            >
              <RefreshCw className={`w-4 h-4 text-blue-400 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing with Firestore...' : 'Sync Cloud Now'}</span>
            </button>

            <button
              onClick={handleResetSampleData}
              className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-[11px] font-semibold flex items-center gap-1.5 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Sample Class
            </button>
          </div>
        </div>
      </div>

      {/* School Information & Schedule Configuration Form */}
      <form onSubmit={handleSave} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md space-y-6 text-xs">
        <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
          <School className="w-5 h-5 text-indigo-400" /> School Profile &amp; Attendance Schedule
        </h3>

        {/* Schedule Times */}
        <div className="space-y-2">
          <h4 className="font-bold text-slate-200 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-400" /> Official Class Hours (QR Cutoff Automation)
          </h4>
          <p className="text-slate-400 text-[11px]">
            Determines whether student scans are automatically tagged as <strong>Present</strong> (on time) or <strong>Late</strong>.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">School Start Time (Arrival)</label>
              <input
                type="time"
                value={formData.schoolStartTime}
                onChange={(e) => setFormData({ ...formData, schoolStartTime: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-blue-500"
                required
              />
              <span className="text-[10px] text-slate-500">Normal arrival threshold (e.g. 07:30)</span>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Late Cutoff Grace Period</label>
              <input
                type="time"
                value={formData.lateCutoffTime}
                onChange={(e) => setFormData({ ...formData, lateCutoffTime: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-blue-500"
                required
              />
              <span className="text-[10px] text-slate-500">Arrivals after this are marked Late</span>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">School Dismissal (Going Home)</label>
              <input
                type="time"
                value={formData.schoolDismissalTime}
                onChange={(e) => setFormData({ ...formData, schoolDismissalTime: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-blue-500"
                required
              />
              <span className="text-[10px] text-slate-500">Triggers Going Home parent alert</span>
            </div>
          </div>
        </div>

        {/* Automated Parent Notifications & Monthly Report Schedule */}
        <div className="space-y-4 pt-4 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-slate-200 flex items-center gap-2">
                <BellRing className="w-4 h-4 text-emerald-400" /> Automated Parent Alerts &amp; Monthly Reports
              </h4>
              <p className="text-slate-400 text-[11px] mt-0.5">
                Configure auto-alerts for Going Home, Absences, and the 1st-of-the-month attendance summary.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Monthly Report Auto-dispatch Card */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-emerald-500/30 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h5 className="font-bold text-white text-xs flex items-center gap-1.5">
                    <span>📅</span> Auto-Send Monthly Report on 1st Day of Month
                  </h5>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    Automatically compiles each child&apos;s monthly attendance (Present, Late, Absent, Attendance Rate %) and sends it to their parent&apos;s Facebook Messenger or Mobile Phone (SMS) on the 1st day of the succeeding month.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.enableAutoMonthlyReportAlert}
                  onChange={(e) => setFormData({ ...formData, enableAutoMonthlyReportAlert: e.target.checked })}
                  className="w-5 h-5 rounded text-emerald-600 bg-slate-900 border-slate-700 cursor-pointer mt-0.5"
                />
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Scheduled Trigger:</span>
                <span className="font-mono text-emerald-400 font-semibold">Every 1st day of month (00:01 AM)</span>
              </div>
            </div>

            {/* Preferred Channel & Other Triggers */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
              <div>
                <label className="block text-slate-300 font-semibold text-xs mb-1.5">
                  Default Parent Notification Channel
                </label>
                <select
                  value={formData.preferredChannel}
                  onChange={(e) => setFormData({ ...formData, preferredChannel: e.target.value as 'sms' | 'messenger' })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="messenger">Facebook Messenger (Free via Meta Graph API / direct chat)</option>
                  <option value="sms">Native SMS (Direct SIM connection / cellphone number)</option>
                </select>
                <span className="text-[10px] text-slate-500 block mt-1">
                  Falls back to cellphone SMS if learner profile lacks a Messenger ID.
                </span>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-800 text-xs">
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.enableAutoGoingHomeAlert}
                    onChange={(e) => setFormData({ ...formData, enableAutoGoingHomeAlert: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 bg-slate-900 border-slate-700"
                  />
                  <span>Auto-alert parent on student Time-Out (Going Home)</span>
                </label>

                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.enableAutoLateAlert}
                    onChange={(e) => setFormData({ ...formData, enableAutoLateAlert: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-600 bg-slate-900 border-slate-700"
                  />
                  <span>Auto-alert parent when student arrives Late</span>
                </label>

                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.enableAutoAbsentAlert}
                    onChange={(e) => setFormData({ ...formData, enableAutoAbsentAlert: e.target.checked })}
                    className="w-4 h-4 rounded text-rose-600 bg-slate-900 border-slate-700"
                  />
                  <span>Auto-alert parent when marked Absent</span>
                </label>

                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.enableDropoutRiskAlerts}
                    onChange={(e) => setFormData({ ...formData, enableDropoutRiskAlerts: e.target.checked })}
                    className="w-4 h-4 rounded text-purple-600 bg-slate-900 border-slate-700"
                  />
                  <span>Early Warning alerts for 5 consecutive absences or &ge;20% dropout risk</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* School Metadata */}
        <div className="space-y-4 pt-4 border-t border-slate-800">
          <h4 className="font-bold text-slate-200">DepEd Institutional Information (Printed on SF2 &amp; ID Badges)</h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Official School Name *</label>
              <input
                type="text"
                value={formData.schoolName}
                onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">DepEd School ID *</label>
              <input
                type="text"
                value={formData.schoolId}
                onChange={(e) => setFormData({ ...formData, schoolId: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-blue-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">District</label>
              <input
                type="text"
                value={formData.district}
                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Division</label>
              <input
                type="text"
                value={formData.division}
                onChange={(e) => setFormData({ ...formData, division: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Region</label>
              <input
                type="text"
                value={formData.region}
                onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Class Adviser Name</label>
              <input
                type="text"
                value={formData.adviserName}
                onChange={(e) => setFormData({ ...formData, adviserName: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">School Principal / Head Teacher</label>
              <input
                type="text"
                value={formData.principalName}
                onChange={(e) => setFormData({ ...formData, principalName: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Academic Year</label>
              <input
                type="text"
                value={formData.academicYear}
                onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* DepEd Dropout Early Warning Template Editor */}
        <div className="space-y-3 pt-4 border-t border-slate-800">
          <h4 className="font-bold text-slate-200 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400" /> DepEd Consecutive Absence &amp; Dropout Warning Template
          </h4>
          <p className="text-slate-400 text-[11px]">
            Template used when alerting parents of 5 consecutive absences or critical absenteeism thresholds. Tokens: <code className="text-blue-300">{'{student_name}'}</code>, <code className="text-blue-300">{'{consecutive_absent_days}'}</code>, <code className="text-blue-300">{'{risk_reason}'}</code>, <code className="text-blue-300">{'{section}'}</code>, <code className="text-blue-300">{'{adviser_name}'}</code>, <code className="text-blue-300">{'{school_name}'}</code>.
          </p>
          <textarea
            value={formData.tplConsecutiveAbsenceWarning || ''}
            onChange={(e) => setFormData({ ...formData, tplConsecutiveAbsenceWarning: e.target.value })}
            rows={3}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Classroom Hardware & Scanner Optimizations */}
        <div className="space-y-4 pt-4 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-200 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-purple-400" />
              Classroom Hardware, Scanner &amp; Offline Sync Optimizations
            </h4>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
              SIRCAM v2.4
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* 1. Audio & Voice Feedback */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
              <h5 className="font-bold text-white flex items-center gap-1.5 text-xs">
                <Volume2 className="w-4 h-4 text-emerald-400" />
                Sound &amp; Voice Feedback
              </h5>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Plays acoustic confirmation cues and uses Web Speech Text-to-Speech to announce the learner&apos;s name aloud.
              </p>

              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.soundChimeEnabled !== false}
                    onChange={(e) => setFormData({ ...formData, soundChimeEnabled: e.target.checked })}
                    className="w-4 h-4 rounded text-emerald-600 bg-slate-900 border-slate-700"
                  />
                  <span>Acoustic Chimes (Green for Present, Yellow for Late)</span>
                </label>

                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.voiceFeedbackEnabled !== false}
                    onChange={(e) => setFormData({ ...formData, voiceFeedbackEnabled: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 bg-slate-900 border-slate-700"
                  />
                  <span>Voice (TTS) Learner Name Announcement</span>
                </label>
              </div>

              {/* Sound Test Buttons */}
              <div className="pt-2 border-t border-slate-800 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => soundEffects.playSuccess()}
                  className="px-2 py-1 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold"
                >
                  Green Chime
                </button>
                <button
                  type="button"
                  onClick={() => soundEffects.playLate()}
                  className="px-2 py-1 rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[10px] font-bold"
                >
                  Yellow Chime
                </button>
                <button
                  type="button"
                  onClick={() => soundEffects.speakAttendance('Juan Dela Cruz', 'Present')}
                  className="px-2 py-1 rounded bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 text-[10px] font-bold flex items-center gap-1"
                >
                  <Mic className="w-3 h-3" /> Test Voice
                </button>
              </div>
            </div>

            {/* 2. Rotating / Dynamic Anti-Proxy QR Pass */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
              <h5 className="font-bold text-white flex items-center gap-1.5 text-xs">
                <ShieldCheck className="w-4 h-4 text-purple-400" />
                Rotating Anti-Proxy QR Pass
              </h5>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Generates a live 30-second rotating QR token on the student mobile app. Rejects photos, screenshots, and remote check-in fraud.
              </p>

              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.enableDynamicAntiProxy !== false}
                    onChange={(e) => setFormData({ ...formData, enableDynamicAntiProxy: e.target.checked })}
                    className="w-4 h-4 rounded text-purple-600 bg-slate-900 border-slate-700"
                  />
                  <span>Enforce Anti-Proxy Dynamic Pass Checks</span>
                </label>

                <div>
                  <label className="block text-[11px] text-slate-400 font-semibold mb-1">
                    Pass Refresh Interval (Seconds)
                  </label>
                  <select
                    value={formData.dynamicQrIntervalSeconds || 30}
                    onChange={(e) => setFormData({ ...formData, dynamicQrIntervalSeconds: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
                  >
                    <option value={15}>15 Seconds (Ultra-Strict High Security)</option>
                    <option value={30}>30 Seconds (Recommended Standard)</option>
                    <option value={60}>60 Seconds (Relaxed Interval)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 text-[10px] text-purple-300 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-purple-400 shrink-0" />
                <span>Camera scanner automatically flags and blocks expired screenshots.</span>
              </div>
            </div>

            {/* 3. Offline Local Auto-Sync Queue */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
              <h5 className="font-bold text-white flex items-center gap-1.5 text-xs">
                <CloudUpload className="w-4 h-4 text-amber-400" />
                Offline Auto-Sync Queue
              </h5>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                When internet drops during scanning, timestamps and alerts queue locally in background and upload automatically when reconnected.
              </p>

              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">Local Queue Status:</span>
                  <span className={`font-mono font-bold text-xs ${
                    storage.getSyncQueue().length > 0 ? 'text-amber-400' : 'text-emerald-400'
                  }`}>
                    {storage.getSyncQueue().length} Pending Items
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-slate-500">
                  <Wifi className="w-3 h-3 text-slate-400" />
                  <span>Auto-uploads to Firestore when connection restores</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    const res = await storage.processSyncQueue();
                    await storage.syncWithCloud();
                    alert(`Sync completed! Processed ${res.processed} pending items.`);
                    onReloadAllData();
                  }}
                  className="flex-1 py-1.5 px-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-[10px] transition text-center shadow"
                >
                  Sync Queue Now
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Clear pending offline queue items?')) {
                      storage.clearSyncQueue();
                      onReloadAllData();
                    }
                  }}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 border border-slate-700 transition"
                  title="Clear offline queue"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end pt-4 border-t border-slate-800">
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center gap-2 shadow-md transition"
          >
            <Save className="w-4 h-4" /> Save System Settings
          </button>
        </div>
      </form>
    </div>
  );
};
