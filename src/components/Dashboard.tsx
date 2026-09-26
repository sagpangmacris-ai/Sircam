import React from 'react';
import { 
  Learner, 
  AttendanceRecord, 
  SchoolSettings, 
  AlertLog 
} from '../types';
import { 
  Users, 
  UserCheck, 
  Clock, 
  UserX, 
  Percent, 
  QrCode, 
  ClipboardCheck, 
  Send, 
  ArrowUpRight, 
  CreditCard,
  CheckCircle2,
  Calendar,
  AlertCircle,
  ShieldAlert,
  FileSpreadsheet,
  AlertTriangle
} from 'lucide-react';
import { ActiveTab } from './Sidebar';
import { assessDropoutRisks } from '../lib/sf2ReportService';

interface DashboardProps {
  learners: Learner[];
  attendanceRecords: AttendanceRecord[];
  alerts: AlertLog[];
  settings: SchoolSettings;
  todayDate: string;
  onNavigate: (tab: ActiveTab) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  learners,
  attendanceRecords,
  alerts,
  settings,
  todayDate,
  onNavigate
}) => {
  // Today's attendance records
  const todayRecords = attendanceRecords.filter(r => r.date === todayDate);
  const totalLearners = learners.length;

  const presentCount = todayRecords.filter(r => r.status === 'Present').length;
  const lateCount = todayRecords.filter(r => r.status === 'Late').length;
  const absentCount = todayRecords.filter(r => r.status === 'Absent').length;
  const excusedCount = todayRecords.filter(r => r.status === 'Excused').length;
  const unrecordedCount = Math.max(0, totalLearners - todayRecords.length);

  const totalAttended = presentCount + lateCount;
  const attendanceRate = totalLearners > 0 ? Math.round((totalAttended / totalLearners) * 100) : 0;

  // Dropout risk assessment
  const risks = assessDropoutRisks(learners, attendanceRecords);
  const consecutiveAbsenceFlagged = risks.filter(r => r.consecutiveAbsences >= 5 || r.maxConsecutiveAbsences >= 5);
  const chronicAbsenteeismFlagged = risks.filter(r => r.isAtRisk20Percent);
  const totalCriticalRisks = risks.filter(r => r.interventionRequired || r.isAtRisk5Consecutive || r.isAtRisk20Percent);

  // Alerts today
  const todayAlerts = alerts.filter(a => a.sentAt.startsWith(todayDate));
  const goingHomeAlerts = todayAlerts.filter(a => a.triggerType === 'going_home').length;

  // Learner map for quick lookup
  const learnerMap = new Map<string, Learner>();
  learners.forEach(l => learnerMap.set(l.id, l));

  // Unique sections
  const sections = Array.from(new Set(learners.map(l => `${l.grade} - ${l.section}`)));

  return (
    <div className="space-y-6">
      {/* Top Welcome & Schedule Banner */}
      <div className="bg-gradient-to-r from-blue-900/60 via-indigo-900/40 to-slate-900 border border-blue-500/20 rounded-2xl p-5 shadow-lg relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                School Year {settings.academicYear}
              </span>
              <span className="text-slate-400 text-xs flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> {todayDate}
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
              {settings.schoolName}
            </h2>
            <p className="text-xs md:text-sm text-slate-300 mt-0.5">
              Classroom Attendance &amp; Automated Parent Alert Management System
            </p>
          </div>

          {/* Schedule Badges */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
            <div className="px-3 py-1 bg-slate-800/80 rounded-lg text-xs">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Class Starts</span>
              <span className="font-semibold text-emerald-400">{settings.schoolStartTime} AM</span>
            </div>
            <div className="px-3 py-1 bg-slate-800/80 rounded-lg text-xs">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Late Cutoff</span>
              <span className="font-semibold text-amber-400">{settings.lateCutoffTime} AM</span>
            </div>
            <div className="px-3 py-1 bg-slate-800/80 rounded-lg text-xs">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Dismissal / Out</span>
              <span className="font-semibold text-indigo-400">{settings.schoolDismissalTime} PM</span>
            </div>
          </div>
        </div>
      </div>

      {/* DepEd Consecutive Absence / Dropout Warning Banner */}
      {totalCriticalRisks.length > 0 && (
        <div className="bg-gradient-to-r from-rose-950/60 via-red-900/40 to-slate-900 border border-rose-500/40 rounded-2xl p-4 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0 mt-0.5 animate-pulse">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                DepEd Early Warning Alert: {totalCriticalRisks.length} Student{totalCriticalRisks.length > 1 ? 's' : ''} Flagged at Risk!
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-500/30 text-rose-300 border border-rose-500/40 uppercase">
                  5+ Consecutive / &ge;20% Absences
                </span>
              </h4>
              <p className="text-xs text-slate-300 mt-1">
                {consecutiveAbsenceFlagged.length > 0 && (
                  <span>
                    <strong className="text-rose-300">{consecutiveAbsenceFlagged.length}</strong> student(s) hit 5 consecutive unexcused absences.
                  </span>
                )}{' '}
                {chronicAbsenteeismFlagged.length > 0 && (
                  <span>
                    <strong className="text-amber-300">{chronicAbsenteeismFlagged.length}</strong> student(s) reached the 20% annual absence threshold.
                  </span>
                )}{' '}
                Prompt teacher intervention and home visitation required under DepEd Order 4, s. 2014.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <button
              onClick={() => onNavigate('analytics')}
              className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition shadow flex items-center gap-1.5"
            >
              <span>Review Risk Registry</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
        {/* Total Learners */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Enrolled</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">{totalLearners}</div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>{learners.filter(l => l.sex === 'Male').length} Boys</span>
            <span>{learners.filter(l => l.sex === 'Female').length} Girls</span>
          </div>
        </div>

        {/* Present */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm hover:border-emerald-500/30 transition">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider text-emerald-400">Present</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-400">{presentCount}</div>
          <div className="text-[11px] text-slate-400 mt-1">
            {totalLearners > 0 ? Math.round((presentCount / totalLearners) * 100) : 0}% on-time rate
          </div>
        </div>

        {/* Late */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm hover:border-amber-500/30 transition">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider text-amber-400">Late</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-400">{lateCount}</div>
          <div className="text-[11px] text-slate-400 mt-1">
            After {settings.lateCutoffTime} cutoff
          </div>
        </div>

        {/* Absent */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm hover:border-rose-500/30 transition">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider text-rose-400">Absent</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
              <UserX className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-400">{absentCount}</div>
          <div className="text-[11px] text-slate-400 mt-1">
            {excusedCount > 0 ? `+ ${excusedCount} Excused` : 'Unexcused / logged'}
          </div>
        </div>

        {/* Overall Attendance Rate */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm hover:border-indigo-500/30 transition col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider text-indigo-300">Rate</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-indigo-300">{attendanceRate}%</div>
          <div className="text-[11px] text-slate-400 mt-1">
            {unrecordedCount > 0 ? `${unrecordedCount} unmarked` : 'All marked today'}
          </div>
        </div>
      </div>

      {/* Quick Launch Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          onClick={() => onNavigate('scanner')}
          className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-medium shadow-md transition group text-left"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-white/10">
              <QrCode className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-sm">QR Camera Scanner</p>
              <p className="text-xs text-blue-100">Scan badge time-in &amp; out</p>
            </div>
          </div>
          <ArrowUpRight className="w-4 h-4 text-blue-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
        </button>

        <button
          onClick={() => onNavigate('manual')}
          className="flex items-center justify-between p-4 rounded-xl bg-slate-900 hover:bg-slate-800/90 text-white font-medium border border-slate-800 shadow-sm transition group text-left"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-teal-500/15 text-teal-400">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-sm">Manual Roll Call</p>
              <p className="text-xs text-slate-400">Teacher section checklist</p>
            </div>
          </div>
          <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-white transition" />
        </button>

        <button
          onClick={() => onNavigate('alerts')}
          className="flex items-center justify-between p-4 rounded-xl bg-slate-900 hover:bg-slate-800/90 text-white font-medium border border-slate-800 shadow-sm transition group text-left"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-indigo-500/15 text-indigo-400">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-sm">Free Parent Alerts</p>
              <p className="text-xs text-slate-400">{goingHomeAlerts} going-home sent today</p>
            </div>
          </div>
          <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-white transition" />
        </button>

        <button
          onClick={() => onNavigate('id_cards')}
          className="flex items-center justify-between p-4 rounded-xl bg-slate-900 hover:bg-slate-800/90 text-white font-medium border border-slate-800 shadow-sm transition group text-left"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-purple-500/15 text-purple-400">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-sm">Print QR Badges</p>
              <p className="text-xs text-slate-400">DepEd formatted ID cards</p>
            </div>
          </div>
          <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-white transition" />
        </button>
      </div>

      {/* Main Grid: Section Breakdown & Real-Time Scans Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Section Progress Bars */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-sm tracking-wide">Section Breakdown</h3>
            <span className="text-xs text-slate-400">{sections.length} Active Sections</span>
          </div>

          <div className="space-y-4">
            {sections.map(sectionStr => {
              const [grade, section] = sectionStr.split(' - ');
              const sectionLearners = learners.filter(l => l.grade === grade && l.section === section);
              const sectionRecords = todayRecords.filter(r => {
                const learner = learnerMap.get(r.learnerId);
                return learner && learner.grade === grade && learner.section === section;
              });

              const secPresent = sectionRecords.filter(r => r.status === 'Present' || r.status === 'Late').length;
              const secTotal = sectionLearners.length;
              const rate = secTotal > 0 ? Math.round((secPresent / secTotal) * 100) : 0;

              return (
                <div key={sectionStr} className="space-y-1.5 p-3 rounded-xl bg-slate-950/50 border border-slate-800/60">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200">{sectionStr}</span>
                    <span className="font-mono text-slate-400">
                      <strong className="text-blue-400">{secPresent}</strong>/{secTotal} ({rate}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        rate >= 90 ? 'bg-emerald-500' : rate >= 75 ? 'bg-blue-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${rate}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Attendance Activity Stream */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white text-sm tracking-wide">Today&apos;s Live Attendance Stream</h3>
              <p className="text-xs text-slate-400">Real-time QR camera logs &amp; manual logs</p>
            </div>
            <span className="px-2.5 py-1 text-xs rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30">
              {todayRecords.length} Logged Today
            </span>
          </div>

          {todayRecords.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-xl border border-dashed border-slate-800 text-slate-500 space-y-3">
              <QrCode className="w-10 h-10 mx-auto text-slate-600 opacity-60" />
              <p className="text-sm font-medium">No attendance records logged for today yet.</p>
              <button
                onClick={() => onNavigate('scanner')}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold inline-flex items-center gap-2"
              >
                <QrCode className="w-4 h-4" /> Open Camera Scanner
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80 max-h-[380px] overflow-y-auto pr-1">
              {todayRecords.map(record => {
                const learner = learnerMap.get(record.learnerId);
                const name = learner ? `${learner.firstName} ${learner.lastName}` : 'Learner';
                const section = learner ? `${learner.grade} - ${learner.section}` : '';
                return (
                  <div key={record.id} className="py-2.5 flex items-center justify-between gap-3 hover:bg-slate-800/40 px-2 rounded-lg transition">
                    <div className="flex items-center gap-3 min-w-0">
                      {learner?.photoUrl ? (
                        <img
                          src={learner.photoUrl}
                          alt={name}
                          className="w-9 h-9 rounded-full object-cover border border-slate-700 shrink-0"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-blue-600/20 text-blue-300 border border-blue-500/30 flex items-center justify-center font-bold text-xs shrink-0">
                          {name.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-100 truncate">{name}</p>
                        <p className="text-[11px] text-slate-400 truncate">
                          LRN: <span className="font-mono text-slate-300">{record.lrn}</span> | {section}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {/* Time-In & Time-Out details */}
                      <div className="text-right text-xs">
                        {record.timeIn && (
                          <span className="block text-emerald-400 font-mono font-medium">
                            IN: {record.timeIn}
                          </span>
                        )}
                        {record.timeOut ? (
                          <span className="block text-indigo-300 font-mono font-medium">
                            OUT: {record.timeOut}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500">In school</span>
                        )}
                      </div>

                      {/* Status Chip */}
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                          record.status === 'Present'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : record.status === 'Late'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {record.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
