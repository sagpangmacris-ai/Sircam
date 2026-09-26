import React, { useState } from 'react';
import { AlertLog, SchoolSettings, Learner, AlertChannel, AlertTriggerType } from '../types';
import { AlertService, openFacebookMessenger, openNativeSms, formatTemplate } from '../lib/alertService';
import { 
  BellRing, 
  Send, 
  Phone, 
  MessageCircle, 
  CheckCircle2, 
  Clock, 
  Filter, 
  Search, 
  RefreshCw, 
  Sparkles,
  ShieldCheck,
  Edit2,
  Save,
  HelpCircle,
  Calendar,
  SendHorizontal,
  FileCheck2,
  Check
} from 'lucide-react';

interface ParentAlertsViewProps {
  alerts: AlertLog[];
  settings: SchoolSettings;
  learners: Learner[];
  attendanceRecords?: import('../types').AttendanceRecord[];
  onUpdateSettings: (settings: SchoolSettings) => void;
  onResendAlert: (alert: AlertLog) => void;
  onTriggerMonthlyReport?: (forceMonth?: string) => void;
}

export const ParentAlertsView: React.FC<ParentAlertsViewProps> = ({
  alerts,
  settings,
  learners,
  attendanceRecords = [],
  onUpdateSettings,
  onResendAlert,
  onTriggerMonthlyReport
}) => {
  const [triggerFilter, setTriggerFilter] = useState<string>('All');
  const [channelFilter, setChannelFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'outbox' | 'monthly_auto' | 'templates' | 'setup'>('outbox');
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [batchModalStatus, setBatchModalStatus] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string>('');

  // Template editor local state
  const [editTemplates, setEditTemplates] = useState({
    tplGoingHome: settings.tplGoingHome,
    tplLate: settings.tplLate,
    tplAbsent: settings.tplAbsent,
    tplMonthlyReport: settings.tplMonthlyReport || 'SIRCAM Monthly Report ({month}): Hello {parent_name}, your child {student_name} ({section}) had {present_days} days Present, {late_days} Late, and {absent_days} Absent ({attendance_rate}% attendance rate) during {month}. Adviser: {adviser_name}. Thank you for your continued support!',
    enableAutoGoingHomeAlert: settings.enableAutoGoingHomeAlert,
    enableAutoLateAlert: settings.enableAutoLateAlert,
    enableAutoAbsentAlert: settings.enableAutoAbsentAlert,
    enableAutoMonthlyReportAlert: settings.enableAutoMonthlyReportAlert ?? true,
    preferredChannel: settings.preferredChannel,
    metaPageAccessToken: settings.metaPageAccessToken || '',
    metaPageId: settings.metaPageId || ''
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const filteredAlerts = alerts.filter(a => {
    const matchTrigger = triggerFilter === 'All' || a.triggerType === triggerFilter;
    const matchChannel = channelFilter === 'All' || a.channel === channelFilter;
    const matchSearch =
      searchQuery === '' ||
      a.learnerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.parentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.destination.includes(searchQuery) ||
      a.messageText.toLowerCase().includes(searchQuery.toLowerCase());
    return matchTrigger && matchChannel && matchSearch;
  });

  const handleSaveTemplates = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: SchoolSettings = {
      ...settings,
      ...editTemplates
    };
    onUpdateSettings(updated);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleTestAlert = (type: AlertTriggerType) => {
    if (learners.length === 0) return;
    const sampleLearner = learners[0];
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const today = new Date().toISOString().split('T')[0];

    if (type === 'going_home') {
      const alert = AlertService.handleGoingHomeAlert(sampleLearner, nowTime, settings, false);
      AlertService.dispatchAlertNow(alert);
      showToast(`Sent test Going-Home alert to ${sampleLearner.parentName}`);
    } else if (type === 'late') {
      const alert = AlertService.handleLateAlert(sampleLearner, nowTime, settings);
      AlertService.dispatchAlertNow(alert);
      showToast(`Sent test Late notice to ${sampleLearner.parentName}`);
    } else if (type === 'absent') {
      const alert = AlertService.handleAbsentAlert(sampleLearner, today, settings);
      AlertService.dispatchAlertNow(alert);
      showToast(`Sent test Absence advisory to ${sampleLearner.parentName}`);
    } else if (type === 'consecutive_absence_warning') {
      const alert = AlertService.handleConsecutiveAbsenceWarningAlert(
        sampleLearner,
        5,
        '5 consecutive unexcused absences',
        settings,
        true
      );
      AlertService.dispatchAlertNow(alert);
      showToast(`Sent test DepEd Consecutive Absence Warning to ${sampleLearner.parentName}`);
    } else if (type === 'monthly_report') {
      const alert = AlertService.handleMonthlyReportAlert(
        sampleLearner,
        {
          monthLabel: 'September 2026',
          present: 20,
          late: 2,
          absent: 1,
          totalDays: 22,
          attendanceRate: 91
        },
        settings,
        true
      );
      AlertService.dispatchAlertNow(alert);
      showToast(`Sent sample Monthly Report card to ${sampleLearner.parentName}`);
    }
  };

  // Immediate Batch Dispatch for All Learners
  const handleDispatchAllMonthlyReports = () => {
    if (onTriggerMonthlyReport) {
      onTriggerMonthlyReport();
    } else {
      const res = AlertService.checkAndTriggerMonthlyReports(learners, attendanceRecords, settings, true);
      showToast(`Dispatched ${res.count} monthly reports for ${res.monthEvaluated}`);
    }
  };

  const now = new Date();
  const nextMonth1st = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextMonth1stFormatted = nextMonth1st.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });

  // Concluded month that will be reported next
  const currentMonthName = now.toLocaleDateString([], { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                100% Free Communication
              </span>
              <span className="text-xs text-slate-400">Zero Gateway Charges</span>
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight mt-1 flex items-center gap-2">
              <BellRing className="w-5 h-5 text-indigo-400" /> Automated Parent Alert Engine
            </h2>
            <p className="text-xs text-slate-400">
              Instant alerts for Going Home (time-out scan), Lateness, Absences, and <strong>Automated Monthly Reports</strong> on the 1st of every month
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="flex flex-wrap items-center p-1 bg-slate-950 rounded-xl border border-slate-800 shrink-0 text-xs">
            <button
              onClick={() => setActiveTab('outbox')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                activeTab === 'outbox'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Alert Outbox ({alerts.length})
            </button>
            <button
              onClick={() => setActiveTab('monthly_auto')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 ${
                activeTab === 'monthly_auto'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>1st-Day Monthly Auto-Send</span>
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                activeTab === 'templates'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Templates &amp; Triggers
            </button>
            <button
              onClick={() => setActiveTab('setup')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                activeTab === 'setup'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Free Setup Guide
            </button>
          </div>
        </div>
      </div>

      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-emerald-500 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs font-medium animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-400" />
          {toastMessage}
        </div>
      )}

      {/* 1. OUTBOX VIEW */}
      {activeTab === 'outbox' && (
        <div className="space-y-4">
          {/* Outbox Filters */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search outbox by student, parent, or message text..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-lg pl-9 pr-3 py-2 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <select
              value={triggerFilter}
              onChange={(e) => setTriggerFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs text-white rounded-lg px-3 py-2 focus:outline-none"
            >
              <option value="All">All Triggers</option>
              <option value="going_home">Going Home (Time-Out)</option>
              <option value="late">Lateness</option>
              <option value="absent">Absence</option>
              <option value="consecutive_absence_warning">5+ Consecutive Absences / Dropout Risk</option>
              <option value="monthly_report">Monthly Summary Report</option>
            </select>

            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs text-white rounded-lg px-3 py-2 focus:outline-none"
            >
              <option value="All">All Channels</option>
              <option value="sms">Native SIM SMS</option>
              <option value="messenger">Facebook Messenger</option>
            </select>

            <div className="flex items-center gap-1.5 ml-auto">
              <span className="text-[11px] text-slate-400 font-semibold mr-1">Quick Test:</span>
              <button
                onClick={() => handleTestAlert('going_home')}
                className="px-2 py-1 rounded bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold"
              >
                Test Going Home
              </button>
              <button
                onClick={() => handleTestAlert('consecutive_absence_warning')}
                className="px-2 py-1 rounded bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-[10px] font-bold"
              >
                Test 5-Day Risk
              </button>
              <button
                onClick={() => handleTestAlert('monthly_report')}
                className="px-2 py-1 rounded bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 border border-teal-500/30 text-[10px] font-bold"
              >
                Test Monthly Card
              </button>
            </div>
          </div>

          {/* Outbox List */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="py-3 px-4">Learner &amp; Parent</th>
                    <th className="py-3 px-3">Trigger Type</th>
                    <th className="py-3 px-3">Channel &amp; Target</th>
                    <th className="py-3 px-3">Message Content</th>
                    <th className="py-3 px-3">Timestamp</th>
                    <th className="py-3 px-4 text-right">Dispatch / Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {filteredAlerts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-500">
                        No alerts in outbox yet. Alerts are triggered automatically when learners scan out or on the 1st of every month.
                      </td>
                    </tr>
                  ) : (
                    filteredAlerts.map(alert => (
                      <tr key={alert.id} className="hover:bg-slate-800/40 transition">
                        {/* Learner & Parent */}
                        <td className="py-3 px-4">
                          <p className="font-semibold text-white">{alert.learnerName}</p>
                          <p className="text-[11px] text-slate-400">Parent: {alert.parentName}</p>
                        </td>

                        {/* Trigger */}
                        <td className="py-3 px-3">
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                              alert.triggerType === 'going_home'
                                ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                                : alert.triggerType === 'late'
                                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                : alert.triggerType === 'absent'
                                ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                                : alert.triggerType === 'consecutive_absence_warning'
                                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 ring-1 ring-purple-400/40'
                                : 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                            }`}
                          >
                            {alert.triggerType === 'going_home'
                              ? 'Going Home'
                              : alert.triggerType === 'late'
                              ? 'Lateness Notice'
                              : alert.triggerType === 'absent'
                              ? 'Absence Advisory'
                              : alert.triggerType === 'consecutive_absence_warning'
                              ? '⚠️ 5-Day Dropout Risk'
                              : 'Monthly Summary Report'}
                          </span>
                        </td>

                        {/* Channel */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5 font-mono text-[11px]">
                            {alert.channel === 'sms' ? (
                              <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            ) : (
                              <MessageCircle className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                            )}
                            <span className="text-slate-300 truncate max-w-[120px]">
                              {alert.destination}
                            </span>
                          </div>
                        </td>

                        {/* Message Preview */}
                        <td className="py-3 px-3 max-w-[280px]">
                          <p className="text-[11px] text-slate-300 italic truncate font-sans">
                            &ldquo;{alert.messageText}&rdquo;
                          </p>
                        </td>

                        {/* Time */}
                        <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                          {new Date(alert.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          <span className="block text-[9px] text-slate-500">
                            {new Date(alert.sentAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </span>
                        </td>

                        {/* Action buttons */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {alert.channel === 'sms' ? (
                              <button
                                onClick={() => openNativeSms(alert.destination, alert.messageText)}
                                className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium text-[11px] flex items-center gap-1 shadow-sm transition"
                                title="Open Device SIM SMS Application"
                              >
                                <Phone className="w-3 h-3" /> Send SMS
                              </button>
                            ) : (
                              <button
                                onClick={() => openFacebookMessenger(alert.destination, alert.messageText)}
                                className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-[11px] flex items-center gap-1 shadow-sm transition"
                                title="Open Facebook Messenger Link (m.me)"
                              >
                                <MessageCircle className="w-3 h-3" /> Messenger
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. 1ST-DAY MONTHLY AUTO-SEND MODULE */}
      {activeTab === 'monthly_auto' && (
        <div className="space-y-6 text-xs">
          {/* Status & Schedule Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400 bg-teal-500/10 px-2.5 py-1 rounded-full border border-teal-500/30">
                  Automated Recurring Job
                </span>
                <h3 className="text-base font-bold text-white mt-1.5 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-teal-400" />
                  Monthly Attendance Report Automated Dispatch
                </h3>
                <p className="text-slate-400 mt-0.5">
                  Sends an official monthly summary report directly to parents via Facebook Messenger or Cellphone SIM SMS on the <strong>1st day of every succeeding month</strong>.
                </p>
              </div>

              {/* Status pill */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-right">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Next Scheduled Auto-Run</span>
                <span className="text-sm font-bold text-teal-300 font-mono">{nextMonth1stFormatted}</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Reporting period: {currentMonthName}</span>
              </div>
            </div>

            {/* Explanation Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center font-bold">
                  1
                </div>
                <h4 className="font-bold text-white text-sm">Automated Calculation</h4>
                <p className="text-slate-400 leading-relaxed">
                  On the 1st day of the succeeding month, SIRCAM aggregates each student&apos;s Days Present, Tardiness (Late), Absences, and overall Attendance Rate %.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold">
                  2
                </div>
                <h4 className="font-bold text-white text-sm">Parent Channel Routing</h4>
                <p className="text-slate-400 leading-relaxed">
                  Parents with a registered Facebook Messenger account receive a direct chat update, while others receive standard SMS texts to their cellphone number.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold">
                  3
                </div>
                <h4 className="font-bold text-white text-sm">Zero Cost (100% Free)</h4>
                <p className="text-slate-400 leading-relaxed">
                  Dispatches via free Facebook Messenger deep-links, Meta Graph API bots, or your device&apos;s native SIM unlimited texting connection.
                </p>
              </div>
            </div>

            {/* Action Bar: Manual Trigger & Preview */}
            <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <FileCheck2 className="w-4 h-4 text-blue-400" />
                  Ready to send for all {learners.length} enrolled learners?
                </h4>
                <p className="text-slate-300 text-xs mt-0.5">
                  You can immediately dispatch or simulate the monthly summary reports right now without waiting for the 1st of the month.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleTestAlert('monthly_report')}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold border border-slate-700 transition"
                >
                  Send Sample Card
                </button>
                <button
                  type="button"
                  onClick={handleDispatchAllMonthlyReports}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-500 hover:to-teal-500 text-white font-bold flex items-center gap-2 shadow-lg transition"
                >
                  <SendHorizontal className="w-4 h-4" />
                  <span>Dispatch All Reports ({learners.length} Parents)</span>
                </button>
              </div>
            </div>

            {/* Preview of the Monthly Report Message Card */}
            <div className="space-y-2">
              <h4 className="font-bold text-slate-300">Live Sample Parent Message Preview:</h4>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-sans leading-relaxed text-slate-200">
                &ldquo;SIRCAM Monthly Report (September 2026): Hello Teodora Dela Cruz, your child Juan Dela Cruz (Grade 10 - Rizal) had 20 days Present, 2 Late, and 1 Absent (91% attendance rate) during September 2026. Adviser: {settings.adviserName}. Thank you for your continued support!&rdquo;
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. TEMPLATES & AUTOMATION SETTINGS */}
      {activeTab === 'templates' && (
        <form onSubmit={handleSaveTemplates} className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md space-y-5 text-xs">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Edit2 className="w-4 h-4 text-blue-400" /> Automated Alert Rules &amp; Message Templates
            </h3>

            {/* Toggle Switches */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              <label className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editTemplates.enableAutoGoingHomeAlert}
                  onChange={(e) => setEditTemplates({ ...editTemplates, enableAutoGoingHomeAlert: e.target.checked })}
                  className="mt-1 rounded text-blue-600 focus:ring-0"
                />
                <div>
                  <span className="font-bold text-white block">Going Home Alert</span>
                  <span className="text-[11px] text-slate-400">Scan QR Time-Out trigger</span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editTemplates.enableAutoLateAlert}
                  onChange={(e) => setEditTemplates({ ...editTemplates, enableAutoLateAlert: e.target.checked })}
                  className="mt-1 rounded text-amber-500 focus:ring-0"
                />
                <div>
                  <span className="font-bold text-white block">Late Arrival Notice</span>
                  <span className="text-[11px] text-slate-400">After late cutoff time</span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editTemplates.enableAutoAbsentAlert}
                  onChange={(e) => setEditTemplates({ ...editTemplates, enableAutoAbsentAlert: e.target.checked })}
                  className="mt-1 rounded text-rose-500 focus:ring-0"
                />
                <div>
                  <span className="font-bold text-white block">Absence Advisory</span>
                  <span className="text-[11px] text-slate-400">Marked absent in roll-call</span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-950 border border-teal-500/40 bg-teal-950/20 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editTemplates.enableAutoMonthlyReportAlert}
                  onChange={(e) => setEditTemplates({ ...editTemplates, enableAutoMonthlyReportAlert: e.target.checked })}
                  className="mt-1 rounded text-teal-400 focus:ring-0"
                />
                <div>
                  <span className="font-bold text-teal-300 block">1st-Day Monthly Auto</span>
                  <span className="text-[11px] text-teal-200/70">Every 1st day of succeeding month</span>
                </div>
              </label>
            </div>

            {/* Channel Preference */}
            <div className="pt-2">
              <label className="block text-slate-300 font-semibold mb-1">
                Preferred Default Channel for Notifications:
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                  <input
                    type="radio"
                    name="preferredChannel"
                    value="messenger"
                    checked={editTemplates.preferredChannel === 'messenger'}
                    onChange={() => setEditTemplates({ ...editTemplates, preferredChannel: 'messenger' })}
                  />
                  <span>Facebook Messenger (100% Free via m.me links)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                  <input
                    type="radio"
                    name="preferredChannel"
                    value="sms"
                    checked={editTemplates.preferredChannel === 'sms'}
                    onChange={() => setEditTemplates({ ...editTemplates, preferredChannel: 'sms' })}
                  />
                  <span>Native SIM Direct SMS (Free phone SIM intent)</span>
                </label>
              </div>
            </div>

            {/* Template Editors */}
            <div className="space-y-4 pt-4 border-t border-slate-800">
              <h4 className="font-bold text-slate-200">Message Templates (Dynamic Variables Supported)</h4>
              <p className="text-[11px] text-slate-400">
                Available tags: <code className="text-teal-400">{'{student_name}'}</code>, <code className="text-teal-400">{'{parent_name}'}</code>, <code className="text-teal-400">{'{time}'}</code>, <code className="text-teal-400">{'{date}'}</code>, <code className="text-teal-400">{'{month}'}</code>, <code className="text-teal-400">{'{present_days}'}</code>, <code className="text-teal-400">{'{late_days}'}</code>, <code className="text-teal-400">{'{absent_days}'}</code>, <code className="text-teal-400">{'{attendance_rate}'}</code>, <code className="text-teal-400">{'{section}'}</code>, <code className="text-teal-400">{'{school_name}'}</code>, <code className="text-teal-400">{'{adviser_name}'}</code>
              </p>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">1st of Succeeding Month Automated Summary Report Template</label>
                <textarea
                  rows={2}
                  value={editTemplates.tplMonthlyReport}
                  onChange={(e) => setEditTemplates({ ...editTemplates, tplMonthlyReport: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-100 font-sans focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Going Home Notification Template</label>
                <textarea
                  rows={2}
                  value={editTemplates.tplGoingHome}
                  onChange={(e) => setEditTemplates({ ...editTemplates, tplGoingHome: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-100 font-sans focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Lateness Notification Template</label>
                <textarea
                  rows={2}
                  value={editTemplates.tplLate}
                  onChange={(e) => setEditTemplates({ ...editTemplates, tplLate: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-100 font-sans focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Absence Advisory Template</label>
                <textarea
                  rows={2}
                  value={editTemplates.tplAbsent}
                  onChange={(e) => setEditTemplates({ ...editTemplates, tplAbsent: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-100 font-sans focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Optional Meta Graph API */}
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <h4 className="font-bold text-slate-200 flex items-center gap-2">
                <span>Optional: Meta Graph API (Facebook Page Send Bot)</span>
                <span className="text-[10px] text-slate-500 font-normal">Optional for automated direct server dispatch</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Facebook Page Access Token</label>
                  <input
                    type="password"
                    placeholder="EAAGm0PX4Z... (Optional)"
                    value={editTemplates.metaPageAccessToken}
                    onChange={(e) => setEditTemplates({ ...editTemplates, metaPageAccessToken: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Facebook Page ID</label>
                  <input
                    type="text"
                    placeholder="e.g. 1029384756 (Optional)"
                    value={editTemplates.metaPageId}
                    onChange={(e) => setEditTemplates({ ...editTemplates, metaPageId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              {saveSuccess ? (
                <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                  <CheckCircle2 className="w-4 h-4" /> Templates and triggers updated successfully!
                </span>
              ) : <div />}

              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center gap-2 shadow-md transition"
              >
                <Save className="w-4 h-4" /> Save Automation Preferences
              </button>
            </div>
          </div>
        </form>
      )}

      {/* 4. SETUP GUIDE TAB */}
      {activeTab === 'setup' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md space-y-6 text-xs text-slate-300">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-teal-400" /> How SIRCAM 100% Free Dual-Channel Alerts Work
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <h4 className="font-bold text-white text-sm flex items-center gap-2 text-emerald-400">
                <Phone className="w-4 h-4" /> 1. Native SIM Direct SMS (100% Free)
              </h4>
              <p className="leading-relaxed">
                Most teachers and school tablets in the Philippines use unli-call &amp; text SIM cards (e.g. Smart, Globe, DITO). SIRCAM automatically leverages the native device SIM protocol (<code className="text-teal-300">sms:0917...</code>) with the pre-filled DepEd message.
              </p>
              <ul className="list-disc pl-4 space-y-1 text-slate-400">
                <li>No paid third-party SMS API or monthly subscription required.</li>
                <li>Single click to fire notification directly from the school tablet or teacher&apos;s phone.</li>
                <li>Parents receive standard SMS text messages on any mobile phone without needing an internet connection.</li>
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <h4 className="font-bold text-white text-sm flex items-center gap-2 text-indigo-400">
                <MessageCircle className="w-4 h-4" /> 2. Facebook Messenger Alerts (100% Free)
              </h4>
              <p className="leading-relaxed">
                Almost every Filipino parent uses Facebook Messenger Free Data. SIRCAM integrates directly via:
              </p>
              <ul className="list-disc pl-4 space-y-1 text-slate-400">
                <li>
                  <strong>Direct m.me Deep Links:</strong> Launches a direct chat thread to the parent&apos;s Messenger account with the alert text pre-filled.
                </li>
                <li>
                  <strong>Meta Graph API Bot:</strong> If your school operates an official Facebook Page, you can paste the Page Access Token above to allow automatic bot dispatch.
                </li>
                <li>Parents receive instant push notifications on their phones for free.</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
