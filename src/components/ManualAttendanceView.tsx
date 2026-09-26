import React, { useState } from 'react';
import { 
  Learner, 
  AttendanceRecord, 
  SchoolSettings, 
  AttendanceStatus, 
  ExcusedAbsenceReasonCode, 
  EXCUSED_ABSENCE_REASONS 
} from '../types';
import { AlertService, openFacebookMessenger, openNativeSms } from '../lib/alertService';
import { exportDailyAttendanceCsv } from '../lib/exportUtils';
import { 
  ClipboardCheck, 
  Calendar, 
  Filter, 
  Search, 
  Download, 
  CheckCheck, 
  UserX, 
  Clock, 
  Send, 
  Check, 
  Save, 
  MessageSquare,
  FileCheck2,
  AlertTriangle,
  X,
  ShieldAlert
} from 'lucide-react';

interface ManualAttendanceViewProps {
  learners: Learner[];
  attendanceRecords: AttendanceRecord[];
  settings: SchoolSettings;
  selectedDate: string;
  onDateChange: (date: string) => void;
  onUpdateRecord: (record: AttendanceRecord) => void;
  onBulkUpdate: (records: AttendanceRecord[]) => void;
}

export const ManualAttendanceView: React.FC<ManualAttendanceViewProps> = ({
  learners,
  attendanceRecords,
  settings,
  selectedDate,
  onDateChange,
  onUpdateRecord,
  onBulkUpdate
}) => {
  const [selectedGrade, setSelectedGrade] = useState<string>('All');
  const [selectedSection, setSelectedSection] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string>('');

  // Excused Absence Dialog State
  const [excuseModalLearner, setExcuseModalLearner] = useState<Learner | null>(null);
  const [selectedReasonCode, setSelectedReasonCode] = useState<ExcusedAbsenceReasonCode>('ILLNESS');
  const [excuseNotesInput, setExcuseNotesInput] = useState<string>('');

  // Extract unique grades and sections
  const grades = Array.from(new Set(learners.map(l => l.grade))).sort();
  const sections = Array.from(new Set(learners.map(l => l.section))).sort();

  // Filter learners
  const filteredLearners = learners.filter(l => {
    const matchGrade = selectedGrade === 'All' || l.grade === selectedGrade;
    const matchSection = selectedSection === 'All' || l.section === selectedSection;
    const matchQuery =
      searchQuery === '' ||
      l.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.lrn.includes(searchQuery);
    return matchGrade && matchSection && matchQuery;
  });

  // Map of records for selectedDate
  const recordsMap = new Map<string, AttendanceRecord>();
  attendanceRecords
    .filter(r => r.date === selectedDate)
    .forEach(r => recordsMap.set(r.learnerId, r));

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  };

  const handleStatusChange = (learner: Learner, newStatus: AttendanceStatus) => {
    if (newStatus === 'Excused') {
      const existing = recordsMap.get(learner.id);
      setSelectedReasonCode(existing?.excuseReasonCode || 'ILLNESS');
      setExcuseNotesInput(existing?.excuseNotes || existing?.notes || '');
      setExcuseModalLearner(learner);
      return;
    }

    const existing = recordsMap.get(learner.id);
    const nowTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const updated: AttendanceRecord = {
      id: existing ? existing.id : `${selectedDate}_${learner.id}`,
      learnerId: learner.id,
      lrn: learner.lrn,
      date: selectedDate,
      timeIn: existing?.timeIn || (newStatus === 'Present' || newStatus === 'Late' ? nowTimeStr : undefined),
      timeInTimestamp: existing?.timeInTimestamp || Date.now(),
      timeOut: existing?.timeOut,
      timeOutTimestamp: existing?.timeOutTimestamp,
      status: newStatus,
      method: 'manual',
      notes: existing?.notes,
      updatedAt: Date.now()
    };

    onUpdateRecord(updated);
    showToast(`Marked ${learner.firstName} as ${newStatus}`);
  };

  const handleSaveExcusedAbsence = () => {
    if (!excuseModalLearner) return;
    const existing = recordsMap.get(excuseModalLearner.id);
    const reasonInfo = EXCUSED_ABSENCE_REASONS.find(r => r.code === selectedReasonCode);

    const updated: AttendanceRecord = {
      id: existing ? existing.id : `${selectedDate}_${excuseModalLearner.id}`,
      learnerId: excuseModalLearner.id,
      lrn: excuseModalLearner.lrn,
      date: selectedDate,
      status: 'Excused',
      method: 'manual',
      excuseReasonCode: selectedReasonCode,
      excuseNotes: excuseNotesInput.trim(),
      notes: reasonInfo ? `[${reasonInfo.depedRemarkCode}] ${reasonInfo.label}: ${excuseNotesInput.trim()}` : excuseNotesInput.trim(),
      excusedBy: settings.adviserName,
      excusedAt: Date.now(),
      updatedAt: Date.now()
    };

    onUpdateRecord(updated);
    showToast(`Absence excused for ${excuseModalLearner.firstName} (${reasonInfo?.label})`);
    setExcuseModalLearner(null);
  };

  const handleTimeChange = (learner: Learner, field: 'timeIn' | 'timeOut', value: string) => {
    const existing = recordsMap.get(learner.id);
    const updated: AttendanceRecord = {
      id: existing ? existing.id : `${selectedDate}_${learner.id}`,
      learnerId: learner.id,
      lrn: learner.lrn,
      date: selectedDate,
      timeIn: field === 'timeIn' ? value : existing?.timeIn,
      timeOut: field === 'timeOut' ? value : existing?.timeOut,
      status: existing?.status || 'Present',
      method: 'manual',
      updatedAt: Date.now()
    };
    onUpdateRecord(updated);
  };

  const handleNotesChange = (learner: Learner, notes: string) => {
    const existing = recordsMap.get(learner.id);
    if (!existing) return;
    const updated: AttendanceRecord = {
      ...existing,
      notes,
      updatedAt: Date.now()
    };
    onUpdateRecord(updated);
  };

  // Bulk: Mark all unrecorded as Present
  const handleMarkAllPresent = () => {
    const updates: AttendanceRecord[] = [];
    const nowTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    filteredLearners.forEach(l => {
      const existing = recordsMap.get(l.id);
      if (!existing) {
        updates.push({
          id: `${selectedDate}_${l.id}`,
          learnerId: l.id,
          lrn: l.lrn,
          date: selectedDate,
          timeIn: nowTimeStr,
          status: 'Present',
          method: 'manual',
          updatedAt: Date.now()
        });
      }
    });

    if (updates.length > 0) {
      onBulkUpdate(updates);
      showToast(`Marked ${updates.length} learners as Present`);
    } else {
      showToast('All learners in this view already have records');
    }
  };

  // Bulk: Mark remaining unmarked as Absent
  const handleMarkRemainingAbsent = () => {
    const updates: AttendanceRecord[] = [];
    filteredLearners.forEach(l => {
      const existing = recordsMap.get(l.id);
      if (!existing) {
        updates.push({
          id: `${selectedDate}_${l.id}`,
          learnerId: l.id,
          lrn: l.lrn,
          date: selectedDate,
          status: 'Absent',
          method: 'manual',
          updatedAt: Date.now()
        });
      }
    });

    if (updates.length > 0) {
      onBulkUpdate(updates);
      showToast(`Marked ${updates.length} remaining as Absent`);
    } else {
      showToast('No unrecorded learners remaining in this view');
    }
  };

  const handleAlertParent = (learner: Learner, status: AttendanceStatus) => {
    if (status === 'Absent') {
      const alert = AlertService.handleAbsentAlert(learner, selectedDate, settings);
      showToast(`Prepared Absent notice for ${learner.parentName}`);
      AlertService.dispatchAlertNow(alert);
    } else if (status === 'Late') {
      const existing = recordsMap.get(learner.id);
      const alert = AlertService.handleLateAlert(learner, existing?.timeIn || '07:45 AM', settings);
      showToast(`Prepared Late notice for ${learner.parentName}`);
      AlertService.dispatchAlertNow(alert);
    } else {
      const existing = recordsMap.get(learner.id);
      const alert = AlertService.handleGoingHomeAlert(learner, existing?.timeOut || '03:30 PM', settings, true);
      showToast(`Going Home notice triggered for ${learner.parentName}`);
      AlertService.dispatchAlertNow(alert);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Bar: Date, Filters & Actions */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-teal-400" /> Manual Roll Call &amp; Checklist
            </h2>
            <p className="text-xs text-slate-400">
              Interactive roll call interface for teachers to verify, override, or log attendance
            </p>
          </div>

          {/* Date Picker & Export */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
              <Calendar className="w-4 h-4 text-blue-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => onDateChange(e.target.value)}
                className="bg-transparent text-xs text-white focus:outline-none cursor-pointer"
              />
            </div>

            <button
              onClick={() => exportDailyAttendanceCsv(attendanceRecords, learners, selectedDate)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
              title="Export Daily Attendance CSV (Excel)"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
          </div>
        </div>

        {/* Filters and Bulk Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            {/* Grade Filter */}
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs text-white rounded-lg px-2.5 py-1.5 focus:outline-none"
            >
              <option value="All">All Grades</option>
              {grades.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>

            {/* Section Filter */}
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs text-white rounded-lg px-2.5 py-1.5 focus:outline-none"
            >
              <option value="All">All Sections</option>
              {sections.map(s => (
                <option key={s} value={s}>Section {s}</option>
              ))}
            </select>

            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search learner or LRN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-xs text-white rounded-lg pl-8 pr-3 py-1.5 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Quick Bulk Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleMarkAllPresent}
              className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <CheckCheck className="w-3.5 h-3.5" /> Mark Unmarked Present
            </button>
            <button
              onClick={handleMarkRemainingAbsent}
              className="px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <UserX className="w-3.5 h-3.5" /> Mark Rest Absent
            </button>
          </div>
        </div>
      </div>

      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-blue-500 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs font-medium animate-in fade-in slide-in-from-bottom-2">
          <Check className="w-4 h-4 text-emerald-400" />
          {toastMessage}
        </div>
      )}

      {/* Checklist Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3.5 px-4">Learner Profile</th>
                <th className="py-3.5 px-3">Grade &amp; Section</th>
                <th className="py-3.5 px-3">Attendance Status</th>
                <th className="py-3.5 px-3">Time-In</th>
                <th className="py-3.5 px-3">Time-Out</th>
                <th className="py-3.5 px-3">Teacher Notes</th>
                <th className="py-3.5 px-4 text-right">Free Alert</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {filteredLearners.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    No learners found matching the selected filters.
                  </td>
                </tr>
              ) : (
                filteredLearners.map(learner => {
                  const record = recordsMap.get(learner.id);
                  const currentStatus = record?.status;

                  return (
                    <tr
                      key={learner.id}
                      className={`hover:bg-slate-800/40 transition ${
                        currentStatus === 'Absent' ? 'bg-rose-950/10' : ''
                      }`}
                    >
                      {/* Learner Info */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {learner.photoUrl ? (
                            <img
                              src={learner.photoUrl}
                              alt={learner.firstName}
                              className="w-9 h-9 rounded-full object-cover border border-slate-700 shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-blue-600/20 text-blue-300 border border-blue-500/30 flex items-center justify-center font-bold text-xs shrink-0">
                              {learner.firstName[0]}
                              {learner.lastName[0]}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-200">
                              {learner.lastName}, {learner.firstName} {learner.middleName ? `${learner.middleName[0]}.` : ''}
                            </p>
                            <p className="text-[11px] text-slate-400 font-mono">
                              LRN: {learner.lrn} | {learner.sex}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Grade & Section */}
                      <td className="py-3 px-3">
                        <span className="text-slate-300 font-medium">{learner.grade}</span>
                        <span className="block text-[11px] text-slate-400">{learner.section}</span>
                      </td>

                      {/* Status Toggle Pills */}
                      <td className="py-3 px-3">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleStatusChange(learner, 'Present')}
                              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition ${
                                currentStatus === 'Present'
                                  ? 'bg-emerald-600 text-white shadow'
                                  : 'bg-slate-800 text-slate-400 hover:text-emerald-300 hover:bg-slate-700'
                              }`}
                            >
                              Present
                            </button>
                            <button
                              onClick={() => handleStatusChange(learner, 'Late')}
                              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition ${
                                currentStatus === 'Late'
                                  ? 'bg-amber-600 text-white shadow'
                                  : 'bg-slate-800 text-slate-400 hover:text-amber-300 hover:bg-slate-700'
                              }`}
                            >
                              Late
                            </button>
                            <button
                              onClick={() => handleStatusChange(learner, 'Absent')}
                              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition ${
                                currentStatus === 'Absent'
                                  ? 'bg-rose-600 text-white shadow'
                                  : 'bg-slate-800 text-slate-400 hover:text-rose-300 hover:bg-slate-700'
                              }`}
                            >
                              Absent
                            </button>
                            <button
                              onClick={() => handleStatusChange(learner, 'Excused')}
                              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition flex items-center gap-1 ${
                                currentStatus === 'Excused'
                                  ? 'bg-blue-600 text-white shadow ring-1 ring-blue-400'
                                  : 'bg-slate-800 text-slate-400 hover:text-blue-300 hover:bg-slate-700'
                              }`}
                            >
                              <FileCheck2 className="w-3 h-3" />
                              Excused
                            </button>
                          </div>

                          {/* Excused reason badge if status is Excused */}
                          {currentStatus === 'Excused' && (
                            <button
                              onClick={() => {
                                setSelectedReasonCode(record?.excuseReasonCode || 'ILLNESS');
                                setExcuseNotesInput(record?.excuseNotes || record?.notes || '');
                                setExcuseModalLearner(learner);
                              }}
                              className="text-left flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-500/15 border border-blue-500/30 text-blue-300 text-[10px] hover:bg-blue-500/25 transition cursor-pointer max-w-[200px] truncate"
                              title="Click to edit excuse justification"
                            >
                              <span className="font-bold uppercase tracking-wider font-mono">
                                {record?.excuseReasonCode ? `[${record.excuseReasonCode.slice(0, 5)}]` : '[EXCUSED]'}
                              </span>
                              <span className="truncate">
                                {record?.excuseNotes || record?.notes || 'Logged justification'}
                              </span>
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Time-In Input */}
                      <td className="py-3 px-3">
                        <input
                          type="text"
                          value={record?.timeIn || ''}
                          placeholder="HH:MM AM"
                          onChange={(e) => handleTimeChange(learner, 'timeIn', e.target.value)}
                          className="w-24 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[11px] font-mono text-emerald-400 focus:outline-none focus:border-blue-500"
                        />
                      </td>

                      {/* Time-Out Input */}
                      <td className="py-3 px-3">
                        <input
                          type="text"
                          value={record?.timeOut || ''}
                          placeholder="HH:MM PM"
                          onChange={(e) => handleTimeChange(learner, 'timeOut', e.target.value)}
                          className="w-24 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[11px] font-mono text-indigo-300 focus:outline-none focus:border-blue-500"
                        />
                      </td>

                      {/* Teacher Notes */}
                      <td className="py-3 px-3">
                        <input
                          type="text"
                          value={record?.notes || ''}
                          placeholder="Add remark..."
                          onChange={(e) => handleNotesChange(learner, e.target.value)}
                          className="w-36 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-slate-300 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                        />
                      </td>

                      {/* Action: Send Alert to Parent */}
                      <td className="py-3 px-4 text-right">
                        {currentStatus && (
                          <button
                            onClick={() => handleAlertParent(learner, currentStatus)}
                            className="p-1.5 rounded-lg bg-blue-500/15 text-blue-300 hover:bg-blue-500/25 border border-blue-500/30 transition inline-flex items-center gap-1 text-[11px]"
                            title={`Notify parent of ${currentStatus} status`}
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span className="hidden lg:inline">Notify</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Excused Absence & Reason Justification Modal */}
      {excuseModalLearner && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                  <FileCheck2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">
                    Log Excused Absence Justification
                  </h3>
                  <p className="text-xs text-slate-400">
                    Converts absence to official Excused status for DepEd SF2 compliance
                  </p>
                </div>
              </div>
              <button
                onClick={() => setExcuseModalLearner(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Learner Info Box */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-white text-sm">
                  {excuseModalLearner.lastName}, {excuseModalLearner.firstName} {excuseModalLearner.middleName || ''}
                </span>
                <span className="block text-slate-400 font-mono text-[11px]">
                  LRN: {excuseModalLearner.lrn} | {excuseModalLearner.grade} - {excuseModalLearner.section}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Absence Date</span>
                <span className="font-mono text-emerald-400 font-bold">{selectedDate}</span>
              </div>
            </div>

            {/* Reason Code Selection */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-300">
                DepEd Absence Justification Code <span className="text-rose-400">*</span>
              </label>
              <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
                {EXCUSED_ABSENCE_REASONS.map(option => (
                  <label
                    key={option.code}
                    className={`flex items-start gap-3 p-2.5 rounded-xl border text-xs cursor-pointer transition ${
                      selectedReasonCode === option.code
                        ? 'bg-blue-600/15 border-blue-500 text-white'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <input
                      type="radio"
                      name="excuseReason"
                      value={option.code}
                      checked={selectedReasonCode === option.code}
                      onChange={() => setSelectedReasonCode(option.code)}
                      className="mt-0.5 text-blue-600 bg-slate-900 border-slate-700"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white">{option.label}</span>
                        <span className="font-mono font-bold text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-blue-300 border border-slate-700">
                          {option.depedRemarkCode}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">{option.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Reason Notes / Parent Communication */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300">
                Teacher Notes / Doctor Certificate / Parent Letter Details
              </label>
              <textarea
                value={excuseNotesInput}
                onChange={(e) => setExcuseNotesInput(e.target.value)}
                placeholder="e.g., Parent submitted medical certificate issued by Dr. Cruz, clinic rest advised for 2 days..."
                rows={2}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Official Notice Info */}
            <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-[11px] text-emerald-300 flex items-start gap-2">
              <Check className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Excused absences do <strong>not</strong> count towards punitive 5-day consecutive absence dropout alerts, ensuring accurate official SF2 compliance.
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setExcuseModalLearner(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveExcusedAbsence}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md transition flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>Save Excused Justification</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
