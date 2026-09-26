/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Learner, AttendanceRecord, AlertLog, SchoolSettings } from './types';
import { storage } from './lib/storage';
import { AlertService } from './lib/alertService';
import { Header } from './components/Header';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { QRScannerView } from './components/QRScannerView';
import { ManualAttendanceView } from './components/ManualAttendanceView';
import { LearnerManagementView } from './components/LearnerManagementView';
import { IDCardStudio } from './components/IDCardStudio';
import { ParentAlertsView } from './components/ParentAlertsView';
import { AnalyticsReportsView } from './components/AnalyticsReportsView';
import { SettingsView } from './components/SettingsView';

export default function App() {
  const [todayDate, setTodayDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isKiosk, setIsKiosk] = useState<boolean>(false);
  const [selectedLearnerForBadge, setSelectedLearnerForBadge] = useState<Learner | null>(null);

  // App data state
  const [learners, setLearners] = useState<Learner[]>(() => storage.getLearners());
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(() => storage.getAttendanceRecords());
  const [alerts, setAlerts] = useState<AlertLog[]>(() => storage.getAlerts());
  const [settings, setSettings] = useState<SchoolSettings>(() => storage.getSettings());

  // Cloud sync and 1st of month automated monthly reports check on load
  const [monthlyDispatchNotice, setMonthlyDispatchNotice] = useState<{
    show: boolean;
    month: string;
    count: number;
  }>({ show: false, month: '', count: 0 });

  useEffect(() => {
    storage.syncWithCloud().catch(err => {
      console.warn('Initial cloud sync notice:', err);
    });

    // Check if today is the 1st of the month for automated monthly report dispatch
    if (settings.enableAutoMonthlyReportAlert && learners.length > 0) {
      const result = AlertService.checkAndTriggerMonthlyReports(
        learners,
        attendanceRecords,
        settings,
        false
      );
      if (result.triggered && result.count > 0) {
        setAlerts(storage.getAlerts());
        setSettings(storage.getSettings());
        setMonthlyDispatchNotice({
          show: true,
          month: result.monthEvaluated,
          count: result.count
        });
      }
    }
  }, []);

  const handleTriggerMonthlyReportsManual = (_forceMonth?: string) => {
    const result = AlertService.checkAndTriggerMonthlyReports(
      learners,
      attendanceRecords,
      settings,
      true
    );
    if (result.triggered && result.count > 0) {
      setAlerts(storage.getAlerts());
      setSettings(storage.getSettings());
      setMonthlyDispatchNotice({
        show: true,
        month: result.monthEvaluated,
        count: result.count
      });
    }
  };

  const reloadAllData = () => {
    setLearners(storage.getLearners());
    setAttendanceRecords(storage.getAttendanceRecords());
    setAlerts(storage.getAlerts());
    setSettings(storage.getSettings());
  };

  // Handlers for updating state
  const handleRecordAttendance = (record: AttendanceRecord, alertLog?: AlertLog) => {
    const updated = storage.saveAttendanceRecord(record);
    setAttendanceRecords(updated);
    if (alertLog) {
      setAlerts(storage.getAlerts());
    }
  };

  const handleUpdateRecord = (record: AttendanceRecord) => {
    const updated = storage.saveAttendanceRecord(record);
    setAttendanceRecords(updated);
  };

  const handleBulkUpdate = (records: AttendanceRecord[]) => {
    const updated = storage.saveBulkAttendance(records);
    setAttendanceRecords(updated);
  };

  const handleSaveLearner = (learner: Learner) => {
    const updated = storage.saveLearner(learner);
    setLearners(updated);
  };

  const handleDeleteLearner = (id: string) => {
    const updated = storage.deleteLearner(id);
    setLearners(updated);
  };

  const handleUpdateSettings = (newSettings: SchoolSettings) => {
    const updated = storage.saveSettings(newSettings);
    setSettings(updated);
  };

  const handleOpenIdBadgeForLearner = (learner: Learner) => {
    setSelectedLearnerForBadge(learner);
    setActiveTab('id_cards');
  };

  const pendingAlerts = alerts.filter(a => a.status === 'queued').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Header */}
      <Header
        settings={settings}
        onOpenScanner={() => setActiveTab('scanner')}
        isKiosk={isKiosk}
        onToggleKiosk={() => setIsKiosk(!isKiosk)}
      />

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar (hidden in Kiosk mode or on print) */}
        {!isKiosk && (
          <div className="hidden md:block print:hidden">
            <Sidebar
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              pendingAlertsCount={pendingAlerts}
              totalLearnersCount={learners.length}
            />
          </div>
        )}

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
          {/* Automated Monthly Report Dispatch Notice Banner */}
          {monthlyDispatchNotice.show && (
            <div className="bg-gradient-to-r from-emerald-900/40 via-blue-900/30 to-indigo-900/40 border border-emerald-500/40 rounded-2xl p-4 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                  📅
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm flex items-center gap-2">
                    1st of the Month Automated Parent Reports Dispatched!
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
                      SIRCAM Automated Alert
                    </span>
                  </h4>
                  <p className="text-xs text-slate-300 mt-1">
                    Monthly attendance summary for <strong className="text-emerald-300">{monthlyDispatchNotice.month}</strong> was automatically generated and prepared for <strong className="text-white">{monthlyDispatchNotice.count}</strong> parents via {settings.preferredChannel === 'messenger' ? 'Facebook Messenger' : 'Native Mobile SMS'}.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <button
                  onClick={() => {
                    setActiveTab('alerts');
                    setMonthlyDispatchNotice({ ...monthlyDispatchNotice, show: false });
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition shadow-sm"
                >
                  View Outbox &amp; Reports
                </button>
                <button
                  onClick={() => setMonthlyDispatchNotice({ ...monthlyDispatchNotice, show: false })}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {activeTab === 'dashboard' && (
            <Dashboard
              learners={learners}
              attendanceRecords={attendanceRecords}
              alerts={alerts}
              settings={settings}
              todayDate={todayDate}
              onNavigate={setActiveTab}
            />
          )}

          {activeTab === 'scanner' && (
            <QRScannerView
              learners={learners}
              attendanceRecords={attendanceRecords}
              settings={settings}
              todayDate={todayDate}
              onRecordAttendance={handleRecordAttendance}
              isKiosk={isKiosk}
            />
          )}

          {activeTab === 'manual' && (
            <ManualAttendanceView
              learners={learners}
              attendanceRecords={attendanceRecords}
              settings={settings}
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              onUpdateRecord={handleUpdateRecord}
              onBulkUpdate={handleBulkUpdate}
            />
          )}

          {activeTab === 'learners' && (
            <LearnerManagementView
              learners={learners}
              onSaveLearner={handleSaveLearner}
              onDeleteLearner={handleDeleteLearner}
              onOpenIdBadge={handleOpenIdBadgeForLearner}
            />
          )}

          {activeTab === 'id_cards' && (
            <IDCardStudio
              learners={learners}
              settings={settings}
              selectedLearnerId={selectedLearnerForBadge?.id}
            />
          )}

          {activeTab === 'alerts' && (
            <ParentAlertsView
              alerts={alerts}
              settings={settings}
              learners={learners}
              attendanceRecords={attendanceRecords}
              onUpdateSettings={handleUpdateSettings}
              onResendAlert={(alert) => {
                storage.updateAlertStatus(alert.id, 'sent');
                setAlerts(storage.getAlerts());
              }}
              onTriggerMonthlyReport={handleTriggerMonthlyReportsManual}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsReportsView
              learners={learners}
              attendanceRecords={attendanceRecords}
              settings={settings}
              onAlertSent={() => setAlerts(storage.getAlerts())}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              onReloadAllData={reloadAllData}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Hidden on Desktop & Print) */}
      {!isKiosk && (
        <div className="md:hidden print:hidden bg-slate-900 border-t border-slate-800 flex items-center justify-around py-2 px-1 text-[10px] text-slate-400 sticky bottom-0 z-30">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center gap-1 py-1 px-2 rounded-lg ${
              activeTab === 'dashboard' ? 'text-blue-400 font-bold' : 'hover:text-white'
            }`}
          >
            <span>Overview</span>
          </button>
          <button
            onClick={() => setActiveTab('scanner')}
            className={`flex flex-col items-center gap-1 py-1 px-2 rounded-lg ${
              activeTab === 'scanner' ? 'text-blue-400 font-bold' : 'hover:text-white'
            }`}
          >
            <span>QR Scan</span>
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex flex-col items-center gap-1 py-1 px-2 rounded-lg ${
              activeTab === 'manual' ? 'text-blue-400 font-bold' : 'hover:text-white'
            }`}
          >
            <span>Roll Call</span>
          </button>
          <button
            onClick={() => setActiveTab('learners')}
            className={`flex flex-col items-center gap-1 py-1 px-2 rounded-lg ${
              activeTab === 'learners' ? 'text-blue-400 font-bold' : 'hover:text-white'
            }`}
          >
            <span>Learners</span>
          </button>
          <button
            onClick={() => setActiveTab('alerts')}
            className={`flex flex-col items-center gap-1 py-1 px-2 rounded-lg ${
              activeTab === 'alerts' ? 'text-blue-400 font-bold' : 'hover:text-white'
            }`}
          >
            <span>Alerts</span>
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex flex-col items-center gap-1 py-1 px-2 rounded-lg ${
              activeTab === 'analytics' ? 'text-blue-400 font-bold' : 'hover:text-white'
            }`}
          >
            <span>Reports</span>
          </button>
        </div>
      )}
    </div>
  );
}
