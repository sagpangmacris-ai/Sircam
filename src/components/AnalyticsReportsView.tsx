import React, { useState } from 'react';
import { Learner, AttendanceRecord, SchoolSettings, DropoutRiskAssessment } from '../types';
import { calculateMonthlySummary, exportMonthlySummaryCsv, exportOfficialSF2ExcelCsv } from '../lib/exportUtils';
import { assessDropoutRisks } from '../lib/sf2ReportService';
import { AlertService } from '../lib/alertService';
import { 
  BarChart3, 
  Printer, 
  Calendar, 
  FileSpreadsheet,
  TrendingUp,
  Activity,
  CheckCircle,
  Clock,
  XCircle,
  HelpCircle,
  CalendarDays,
  AlertTriangle,
  ShieldAlert,
  Send,
  UserCheck,
  FileCheck2,
  Check
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  AreaChart,
  Area
} from 'recharts';

interface AnalyticsReportsViewProps {
  learners: Learner[];
  attendanceRecords: AttendanceRecord[];
  settings: SchoolSettings;
  onAlertSent?: () => void;
}

export const AnalyticsReportsView: React.FC<AnalyticsReportsViewProps> = ({
  learners,
  attendanceRecords,
  settings,
  onAlertSent
}) => {
  const currentYearMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"
  const [selectedMonth, setSelectedMonth] = useState<string>(currentYearMonth);
  const [selectedGrade, setSelectedGrade] = useState<string>('All');
  const [selectedSection, setSelectedSection] = useState<string>('All');
  const [activeChartTab, setActiveChartTab] = useState<'calendar_heatmap' | 'trend_chart' | 'learner_matrix' | 'dropout_risk'>('calendar_heatmap');
  const [selectedDateDetail, setSelectedDateDetail] = useState<string | null>(null);
  const [alertNotice, setAlertNotice] = useState<string | null>(null);

  const grades = Array.from(new Set(learners.map(l => l.grade))).sort();
  const sections = Array.from(new Set(learners.map(l => l.section))).sort();

  // Filter learners by grade/section
  const filteredLearners = learners.filter(l => {
    const matchGrade = selectedGrade === 'All' || l.grade === selectedGrade;
    const matchSection = selectedSection === 'All' || l.section === selectedSection;
    return matchGrade && matchSection;
  });

  const filteredLearnerIds = new Set(filteredLearners.map(l => l.id));

  // Calculate Monthly Summaries
  const summaries = calculateMonthlySummary(filteredLearners, attendanceRecords, selectedMonth);

  // Assess Dropout and Consecutive Absence Risks
  const riskAssessments = assessDropoutRisks(filteredLearners, attendanceRecords, selectedMonth);
  const criticalRiskLearners = riskAssessments.filter(r => r.interventionRequired || r.isAtRisk5Consecutive || r.isAtRisk20Percent);

  // Aggregated totals
  const totalBoys = filteredLearners.filter(l => l.sex === 'Male').length;
  const totalGirls = filteredLearners.filter(l => l.sex === 'Female').length;

  const totalPresent = summaries.reduce((acc, s) => acc + s.daysPresent, 0);
  const totalLate = summaries.reduce((acc, s) => acc + s.daysLate, 0);
  const totalAbsent = summaries.reduce((acc, s) => acc + s.daysAbsent, 0);
  const totalExcused = summaries.reduce((acc, s) => acc + s.daysExcused, 0);

  const avgAttendanceRate = summaries.length > 0
    ? Math.round(summaries.reduce((acc, s) => acc + s.attendanceRate, 0) / summaries.length)
    : 0;

  const handlePrintReport = () => {
    window.print();
  };

  const handleDispatchDropoutWarning = (risk: DropoutRiskAssessment) => {
    const learner = learners.find(l => l.id === risk.learnerId);
    if (!learner) return;

    const alert = AlertService.handleConsecutiveAbsenceWarningAlert(
      learner,
      risk.consecutiveAbsences,
      risk.isAtRisk5Consecutive ? '5+ consecutive days absent' : 'Exceeded 20% annual absence threshold',
      settings,
      true
    );

    AlertService.dispatchAlertNow(alert);
    setAlertNotice(`Dispatched Official DepEd Early Warning to ${learner.parentName} (${risk.parentContact})`);
    setTimeout(() => setAlertNotice(null), 3500);
    if (onAlertSent) onAlertSent();
  };

  const [yearStr, monthStr] = selectedMonth.split('-');
  const yearNum = parseInt(yearStr, 10);
  const monthNum = parseInt(monthStr, 10);
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthLabel = `${monthNames[monthNum - 1] || 'Month'} ${yearStr}`;

  // Build calendar days for the selected month
  const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
  const monthRecords = attendanceRecords.filter(r => 
    r.date.startsWith(selectedMonth) && filteredLearnerIds.has(r.learnerId)
  );

  // Map of date string YYYY-MM-DD -> records
  const dailyStatsMap = new Map<string, { present: number; late: number; absent: number; excused: number; total: number; rate: number }>();

  for (let day = 1; day <= daysInMonth; day++) {
    const dStr = `${selectedMonth}-${String(day).padStart(2, '0')}`;
    const dayRecords = monthRecords.filter(r => r.date === dStr);
    let present = 0;
    let late = 0;
    let absent = 0;
    let excused = 0;

    dayRecords.forEach(r => {
      if (r.status === 'Present') present++;
      else if (r.status === 'Late') late++;
      else if (r.status === 'Absent') absent++;
      else if (r.status === 'Excused') excused++;
    });

    const attended = present + late;
    const enrolled = filteredLearners.length || 1;
    // Rate relative to active enrolled learners
    const rate = dayRecords.length > 0 ? Math.round((attended / enrolled) * 100) : 0;

    dailyStatsMap.set(dStr, {
      present,
      late,
      absent,
      excused,
      total: dayRecords.length,
      rate
    });
  }

  // Daily Trend Data for Recharts Bar / Area Charts
  const dailyChartData = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const dStr = `${selectedMonth}-${String(day).padStart(2, '0')}`;
    const stats = dailyStatsMap.get(dStr)!;
    const dateObj = new Date(yearNum, monthNum - 1, day);
    const dayOfWeek = dateObj.getDay(); // 0 is Sun, 6 is Sat
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    return {
      day: `D${day}`,
      dayNum: day,
      date: dStr,
      isWeekend,
      present: stats.present,
      late: stats.late,
      absent: stats.absent,
      excused: stats.excused,
      rate: stats.rate,
      totalLogged: stats.total
    };
  });

  // Calendar Heatmap Grid Structure
  // First day of month weekday offset (0 = Sunday, 1 = Monday, etc.)
  const firstDayWeekday = new Date(yearNum, monthNum - 1, 1).getDay();

  // Helper for heatmap background color intensity
  const getHeatmapColor = (rate: number, totalLogged: number, isWeekend: boolean) => {
    if (isWeekend) {
      return 'bg-slate-900/40 text-slate-600 border-slate-800/40';
    }
    if (totalLogged === 0) {
      return 'bg-slate-900/60 text-slate-500 border-slate-800/80 hover:border-slate-700';
    }
    if (rate >= 90) {
      return 'bg-emerald-500/25 border-emerald-500/50 text-emerald-300 font-bold hover:bg-emerald-500/35';
    }
    if (rate >= 75) {
      return 'bg-teal-500/20 border-teal-500/40 text-teal-300 font-medium hover:bg-teal-500/30';
    }
    if (rate >= 50) {
      return 'bg-amber-500/20 border-amber-500/40 text-amber-300 font-medium hover:bg-amber-500/30';
    }
    return 'bg-rose-500/20 border-rose-500/40 text-rose-300 font-medium hover:bg-rose-500/30';
  };

  // Selected date inspection detail records
  const selectedDateRecords = selectedDateDetail
    ? attendanceRecords.filter(r => r.date === selectedDateDetail && filteredLearnerIds.has(r.learnerId))
    : [];

  return (
    <div className="space-y-6">
      {/* Top Filter and Actions (Hidden during print) */}
      <div className="print:hidden bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-teal-400" /> Monthly Summary &amp; DepEd SF2 Report
            </h2>
            <p className="text-xs text-slate-400">
              Visual monthly attendance heatmap, daily trends, Excel CSV export, and print-ready School Form 2
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => exportOfficialSF2ExcelCsv(learners, attendanceRecords, selectedMonth, settings, selectedGrade, selectedSection)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition"
              title="Download Official DepEd School Form 2 (SF2) Excel Spreadsheet"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>DepEd SF2 (Excel)</span>
            </button>

            <button
              onClick={() => exportMonthlySummaryCsv(summaries, selectedMonth, settings)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
              title="Download Basic Monthly Summary CSV"
            >
              <span>Quick CSV</span>
            </button>

            <button
              onClick={handlePrintReport}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md transition"
              title="Print Official Form / Save as PDF"
            >
              <Printer className="w-4 h-4" />
              <span>Print SF2 Report</span>
            </button>
          </div>
        </div>

        {/* Action toast notice */}
        {alertNotice && (
          <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs flex items-center justify-between animate-in fade-in">
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4" /> {alertNotice}
            </span>
            <button onClick={() => setAlertNotice(null)} className="text-emerald-400 hover:text-white">
              Dismiss
            </button>
          </div>
        )}

        {/* Filter Row */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800">
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
            <Calendar className="w-4 h-4 text-blue-400" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                setSelectedDateDetail(null);
              }}
              className="bg-transparent text-xs text-white focus:outline-none cursor-pointer"
            />
          </div>

          <select
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs text-white rounded-lg px-3 py-2 focus:outline-none"
          >
            <option value="All">All Grades</option>
            {grades.map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>

          <select
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs text-white rounded-lg px-3 py-2 focus:outline-none"
          >
            <option value="All">All Sections</option>
            {sections.map(s => (
              <option key={s} value={s}>Section {s}</option>
            ))}
          </select>

          <span className="text-xs text-slate-400 ml-auto">
            {summaries.length} Learners Calculated
          </span>
        </div>
      </div>

      {/* Aggregate KPI Cards (Hidden on print) */}
      <div className="print:hidden grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] uppercase font-bold text-slate-400">Learners Evaluated</span>
          <p className="text-2xl font-black text-white mt-1">{filteredLearners.length}</p>
          <span className="text-[10px] text-slate-500">{totalBoys} Boys • {totalGirls} Girls</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] uppercase font-bold text-emerald-400">Total Days Present</span>
          <p className="text-2xl font-black text-emerald-400 mt-1">{totalPresent}</p>
          <span className="text-[10px] text-slate-500">Days attended across section</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] uppercase font-bold text-amber-400">Total Tardiness (Late)</span>
          <p className="text-2xl font-black text-amber-400 mt-1">{totalLate}</p>
          <span className="text-[10px] text-slate-500">Arrived after {settings.lateCutoffTime}</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] uppercase font-bold text-indigo-300">Avg Attendance Rate</span>
          <p className="text-2xl font-black text-indigo-300 mt-1">{avgAttendanceRate}%</p>
          <span className="text-[10px] text-slate-500">Section monthly average</span>
        </div>
      </div>

      {/* VISUAL MONTHLY ATTENDANCE HEATMAP & RECHARTS TRENDS (Hidden on print) */}
      <div className="print:hidden bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-teal-400" />
              Monthly Attendance Heatmap &amp; Trend Analytics
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Visualize presence patterns, tardiness hotspots, and daily attendance trends for {monthLabel}
            </p>
          </div>

          {/* Sub-tab view toggles */}
          <div className="flex items-center p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setActiveChartTab('calendar_heatmap')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 ${
                activeChartTab === 'calendar_heatmap'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Calendar Heatmap</span>
            </button>
            <button
              onClick={() => setActiveChartTab('trend_chart')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 ${
                activeChartTab === 'trend_chart'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Daily Volume (Recharts)</span>
            </button>
            <button
              onClick={() => setActiveChartTab('learner_matrix')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 ${
                activeChartTab === 'learner_matrix'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Learner Matrix</span>
            </button>
            <button
              onClick={() => setActiveChartTab('dropout_risk')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 ${
                activeChartTab === 'dropout_risk'
                  ? 'bg-rose-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              <span>Consecutive Absences &amp; Dropout Risk</span>
              {criticalRiskLearners.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500 text-white animate-pulse">
                  {criticalRiskLearners.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* 1. CALENDAR HEATMAP VIEW */}
        {activeChartTab === 'calendar_heatmap' && (
          <div className="space-y-4">
            {/* Heatmap Legend */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
              <span className="font-semibold text-slate-300">
                Click any calendar tile to inspect date records:
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500 mr-1">Attendance Rate:</span>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-slate-900 border border-slate-800 text-slate-500">
                  No Logs
                </span>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-rose-500/20 border border-rose-500/40 text-rose-300 font-bold">
                  &lt; 50%
                </span>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold">
                  50-74%
                </span>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-teal-500/20 border border-teal-500/40 text-teal-300 font-bold">
                  75-89%
                </span>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-emerald-500/25 border border-emerald-500/50 text-emerald-300 font-bold">
                  90%+
                </span>
              </div>
            </div>

            {/* Days of Week Header */}
            <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold uppercase tracking-wider text-slate-400">
              <div className="text-rose-400">Sun</div>
              <div>Mon</div>
              <div>Tue</div>
              <div>Wed</div>
              <div>Thu</div>
              <div>Fri</div>
              <div className="text-amber-400">Sat</div>
            </div>

            {/* Calendar Heatmap Grid */}
            <div className="grid grid-cols-7 gap-2">
              {/* Blank offset pads before first day */}
              {Array.from({ length: firstDayWeekday }).map((_, idx) => (
                <div key={`blank-${idx}`} className="h-20 rounded-xl bg-slate-950/30 border border-slate-900/40 opacity-40 pointer-events-none" />
              ))}

              {/* Day Tiles */}
              {Array.from({ length: daysInMonth }).map((_, idx) => {
                const day = idx + 1;
                const dStr = `${selectedMonth}-${String(day).padStart(2, '0')}`;
                const stats = dailyStatsMap.get(dStr)!;
                const dateObj = new Date(yearNum, monthNum - 1, day);
                const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
                const isSelected = selectedDateDetail === dStr;
                const colorClass = getHeatmapColor(stats.rate, stats.total, isWeekend);

                return (
                  <button
                    key={dStr}
                    onClick={() => setSelectedDateDetail(isSelected ? null : dStr)}
                    className={`h-20 p-2 rounded-xl border flex flex-col justify-between text-left transition relative cursor-pointer group ${colorClass} ${
                      isSelected ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-slate-950 shadow-lg' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-bold font-mono text-sm leading-none">{day}</span>
                      {stats.total > 0 && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded font-bold font-mono bg-black/40">
                          {stats.rate}%
                        </span>
                      )}
                    </div>

                    {stats.total > 0 ? (
                      <div className="space-y-0.5 text-[9px] w-full">
                        <div className="flex items-center justify-between font-mono">
                          <span className="text-emerald-400">P:{stats.present}</span>
                          <span className="text-amber-300">L:{stats.late}</span>
                          <span className="text-rose-400">A:{stats.absent}</span>
                        </div>
                        <div className="w-full h-1 rounded-full bg-black/40 overflow-hidden">
                          <div
                            className="h-full bg-emerald-400"
                            style={{ width: `${stats.rate}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="text-[9px] text-slate-500 italic">
                        {isWeekend ? 'Weekend' : 'No records'}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Date Drilldown Inspection Panel */}
            {selectedDateDetail && (
              <div className="p-4 rounded-xl bg-slate-950 border border-blue-500/40 space-y-3 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-ping" />
                    <h4 className="font-bold text-white text-sm">
                      Attendance Details for {selectedDateDetail}
                    </h4>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      {selectedDateRecords.length} student records
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedDateDetail(null)}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    Close inspection
                  </button>
                </div>

                {selectedDateRecords.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">
                    No attendance was logged on this date for the selected section.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto pr-1">
                    {selectedDateRecords.map(r => {
                      const learner = learners.find(l => l.id === r.learnerId);
                      const name = learner ? `${learner.lastName}, ${learner.firstName}` : r.lrn;
                      return (
                        <div
                          key={r.id}
                          className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs flex items-center justify-between"
                        >
                          <div className="min-w-0 pr-2">
                            <p className="font-semibold text-slate-200 truncate">{name}</p>
                            <p className="text-[10px] text-slate-400 font-mono">
                              In: {r.timeIn || '—'} | Out: {r.timeOut || '—'}
                            </p>
                          </div>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              r.status === 'Present'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : r.status === 'Late'
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-rose-500/20 text-rose-400'
                            }`}
                          >
                            {r.status}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 2. RECHARTS DAILY TREND VIEW */}
        {activeChartTab === 'trend_chart' && (
          <div className="space-y-6">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                Daily Attendance Count (Present, Late, and Absent Breakdown)
              </h4>
              <div className="h-72 w-full bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                    <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '0.75rem',
                        color: '#f8fafc',
                        fontSize: '12px'
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Bar dataKey="present" name="Present (On-time)" fill="#10b981" radius={[4, 4, 0, 0]} stackId="a" />
                    <Bar dataKey="late" name="Late Arrivals" fill="#f59e0b" radius={[4, 4, 0, 0]} stackId="a" />
                    <Bar dataKey="absent" name="Absent" fill="#f43f5e" radius={[4, 4, 0, 0]} stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                Attendance Rate % Curve Over the Month
              </h4>
              <div className="h-48 w-full bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="rateGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                    <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 100]} />
                    <Tooltip
                      formatter={(val: unknown) => {
                        const num = typeof val === 'number' ? val : Number(val);
                        return [`${isNaN(num) ? '0' : num}%`, 'Attendance Rate'];
                      }}
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '0.75rem',
                        color: '#f8fafc',
                        fontSize: '12px'
                      }}
                    />
                    <Area type="monotone" dataKey="rate" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#rateGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* 3. LEARNER MATRIX VIEW (Horizontal Heatmap per Learner) */}
        {activeChartTab === 'learner_matrix' && (
          <div className="space-y-3">
            <p className="text-xs text-slate-400">
              High-density matrix showing daily presence status for each learner across all {daysInMonth} days:
            </p>
            <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950">
              <table className="w-full text-left text-[11px] border-collapse">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 font-bold">
                    <th className="p-2 min-w-[150px] sticky left-0 bg-slate-900 z-10">Learner</th>
                    {Array.from({ length: daysInMonth }).map((_, i) => (
                      <th key={i + 1} className="p-1 text-center w-6 min-w-[24px] font-mono">
                        {i + 1}
                      </th>
                    ))}
                    <th className="p-2 text-center min-w-[60px]">Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {filteredLearners.map(learner => {
                    const studentSummary = summaries.find(s => s.learnerId === learner.id);
                    return (
                      <tr key={learner.id} className="hover:bg-slate-900/60 transition">
                        <td className="p-2 font-sans font-medium text-slate-200 truncate sticky left-0 bg-slate-950 z-10">
                          {learner.lastName}, {learner.firstName[0]}.
                        </td>
                        {Array.from({ length: daysInMonth }).map((_, i) => {
                          const day = i + 1;
                          const dStr = `${selectedMonth}-${String(day).padStart(2, '0')}`;
                          const record = monthRecords.find(r => r.date === dStr && r.learnerId === learner.id);
                          const dateObj = new Date(yearNum, monthNum - 1, day);
                          const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;

                          let bgClass = 'bg-slate-900/30 text-slate-700';
                          let label = '·';
                          if (isWeekend) {
                            bgClass = 'bg-slate-950/80 text-slate-800';
                            label = '';
                          } else if (record) {
                            if (record.status === 'Present') {
                              bgClass = 'bg-emerald-500/20 text-emerald-400 font-bold';
                              label = 'P';
                            } else if (record.status === 'Late') {
                              bgClass = 'bg-amber-500/20 text-amber-400 font-bold';
                              label = 'L';
                            } else if (record.status === 'Absent') {
                              bgClass = 'bg-rose-500/20 text-rose-400 font-bold';
                              label = 'A';
                            } else if (record.status === 'Excused') {
                              bgClass = 'bg-blue-500/20 text-blue-400 font-bold';
                              label = 'E';
                            }
                          }

                          return (
                            <td
                              key={dStr}
                              className={`p-1 text-center text-[10px] border border-slate-800/40 ${bgClass}`}
                              title={`${learner.firstName} ${learner.lastName}: ${dStr} - ${record?.status || 'No record'}`}
                            >
                              {label}
                            </td>
                          );
                        })}
                        <td className="p-2 text-center font-bold text-slate-200">
                          {studentSummary ? `${studentSummary.attendanceRate}%` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 4. CONSECUTIVE ABSENCE / DROPOUT RISK WARNING SYSTEM */}
        {activeChartTab === 'dropout_risk' && (
          <div className="space-y-5 animate-in fade-in">
            {/* Risk Overview Banner */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-rose-950/40 via-amber-950/30 to-slate-900 border border-rose-500/40 space-y-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0 mt-0.5">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm flex items-center gap-2">
                      DepEd Early Warning System (EWS) - Dropout &amp; Chronic Absenteeism Monitor
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase">
                        DepEd Order 4, s. 2014 Standard
                      </span>
                    </h4>
                    <p className="text-xs text-slate-300 mt-1">
                      Learners accumulating <strong>5 consecutive days of unexcused absences</strong> or reaching <strong>20% of school year absences</strong> are flagged for mandatory parent conference, home visitation, and intervention logging.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="px-3 py-1.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold text-center">
                    <span className="block text-lg font-black">{criticalRiskLearners.length}</span>
                    <span>Action Needed</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Risk Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold text-slate-300">
                  Evaluated Learners for {monthLabel} (Sorted by Risk Severity):
                </span>
                <span>
                  {riskAssessments.length} total enrolled assessed
                </span>
              </div>

              <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 font-bold text-[11px] uppercase">
                      <th className="p-3">Learner &amp; LRN</th>
                      <th className="p-3">Grade &amp; Section</th>
                      <th className="p-3 text-center">Consecutive Absences</th>
                      <th className="p-3 text-center">Unexcused / Excused</th>
                      <th className="p-3 text-center">Absence Rate (%)</th>
                      <th className="p-3">Risk Status &amp; DepEd Flag</th>
                      <th className="p-3">Parent Contact / Channel</th>
                      <th className="p-3 text-right">Early Intervention Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {riskAssessments.map(risk => {
                      const isHighRisk = risk.isAtRisk5Consecutive || risk.isAtRisk20Percent;
                      return (
                        <tr 
                          key={risk.learnerId}
                          className={`hover:bg-slate-900/60 transition ${
                            isHighRisk ? 'bg-rose-950/20' : ''
                          }`}
                        >
                          <td className="p-3 font-medium text-slate-200">
                            <p className="font-bold text-white">{risk.learnerName}</p>
                            <span className="text-[11px] font-mono text-slate-400">LRN: {risk.lrn}</span>
                          </td>
                          <td className="p-3 text-slate-300">
                            <span>{risk.grade}</span>
                            <span className="block text-[11px] text-slate-400">{risk.section}</span>
                          </td>
                          <td className="p-3 text-center">
                            <span className={`font-mono font-bold text-sm px-2.5 py-0.5 rounded-lg border ${
                              risk.consecutiveAbsences >= 5
                                ? 'bg-rose-500/25 border-rose-500/50 text-rose-300 animate-pulse'
                                : risk.consecutiveAbsences >= 3
                                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                                : 'bg-slate-900 border-slate-800 text-slate-400'
                            }`}>
                              {risk.consecutiveAbsences} days
                            </span>
                            {risk.maxConsecutiveAbsences > risk.consecutiveAbsences && (
                              <span className="block text-[10px] text-slate-500 mt-0.5">
                                Peak: {risk.maxConsecutiveAbsences} days
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center font-mono text-[11px]">
                            <span className="text-rose-400 font-bold">{risk.totalUnexcusedAbsences} unexcused</span>
                            <span className="text-slate-500 mx-1">/</span>
                            <span className="text-blue-400">{risk.totalExcusedAbsences} excused</span>
                          </td>
                          <td className="p-3 text-center font-mono">
                            <span className={`font-bold ${
                              risk.absencePercentage >= 20 
                                ? 'text-rose-400 text-sm' 
                                : risk.absencePercentage >= 15 
                                ? 'text-amber-400' 
                                : 'text-slate-300'
                            }`}>
                              {risk.absencePercentage}%
                            </span>
                          </td>
                          <td className="p-3">
                            {risk.isAtRisk5Consecutive && risk.isAtRisk20Percent ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-600/30 border border-rose-500 text-rose-300">
                                <AlertTriangle className="w-3 h-3 text-rose-400" />
                                5+ Consecutive &amp; &ge;20% Absences (High Dropout Risk)
                              </span>
                            ) : risk.isAtRisk5Consecutive ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/20 border border-rose-500/40 text-rose-300">
                                <AlertTriangle className="w-3 h-3 text-rose-400" />
                                5+ Consecutive Absences Flag
                              </span>
                            ) : risk.isAtRisk20Percent ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 border border-amber-500/40 text-amber-300">
                                <AlertTriangle className="w-3 h-3 text-amber-400" />
                                &ge;20% School Absences Threshold
                              </span>
                            ) : risk.riskLevel === 'Moderate' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 border border-amber-500/30 text-amber-400">
                                Moderate Watchlist (3+ Absences)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                                <Check className="w-3 h-3" /> Normal (Good Standing)
                              </span>
                            )}
                            <p className="text-[10px] text-slate-400 mt-1 italic">
                              {risk.recommendedAction}
                            </p>
                          </td>
                          <td className="p-3 text-[11px]">
                            <span className="font-semibold text-slate-200 block">{risk.parentName}</span>
                            <span className="font-mono text-slate-400">{risk.parentContact}</span>
                            {risk.parentMessengerId && (
                              <span className="text-[10px] text-blue-400 block">m.me/{risk.parentMessengerId}</span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            {isHighRisk ? (
                              <button
                                onClick={() => handleDispatchDropoutWarning(risk)}
                                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition shadow flex items-center gap-1.5 ml-auto"
                                title="Send Early Warning DepEd Notice to Parent via SMS/Messenger"
                              >
                                <Send className="w-3.5 h-3.5" />
                                <span>Send Warning</span>
                              </button>
                            ) : (
                              <span className="text-[11px] text-slate-500 italic">No action needed</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* PRINT-READY OFFICIAL DEPED SF2 REPORT SHEET */}
      <div className="bg-white text-slate-950 p-6 md:p-8 rounded-2xl shadow-xl border border-slate-200 print:border-none print:shadow-none print:p-0 print:m-0 font-sans">
        {/* Official Header */}
        <div className="text-center space-y-1 border-b-2 border-slate-900 pb-4 mb-4">
          <p className="text-[10px] uppercase font-bold tracking-widest text-slate-600">
            Republic of the Philippines • Department of Education
          </p>
          <h2 className="text-base font-black uppercase tracking-tight text-slate-900">
            School Form 2 (SF2) Daily Attendance Report of Learners
          </h2>
          <p className="text-[10px] text-slate-500 italic">
            (Replacement of Form 1, Form 2 &amp; STS Form 4 - Absenteeism and Dropout Indicator)
          </p>
        </div>

        {/* School Metadata Header Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] border border-slate-300 p-2.5 rounded-lg mb-4 bg-slate-50">
          <div>
            <span className="font-bold text-slate-600 block text-[9px] uppercase">School Name:</span>
            <strong className="text-slate-900">{settings.schoolName}</strong>
          </div>
          <div>
            <span className="font-bold text-slate-600 block text-[9px] uppercase">School ID:</span>
            <strong className="text-slate-900 font-mono">{settings.schoolId}</strong>
          </div>
          <div>
            <span className="font-bold text-slate-600 block text-[9px] uppercase">District / Division:</span>
            <strong className="text-slate-900">{settings.district}</strong>
          </div>
          <div>
            <span className="font-bold text-slate-600 block text-[9px] uppercase">Month &amp; School Year:</span>
            <strong className="text-slate-900 font-bold">{monthLabel} (S.Y. {settings.academicYear})</strong>
          </div>
        </div>

        {/* Section Info */}
        <div className="flex justify-between items-center text-xs font-semibold mb-2 px-1">
          <span>Grade &amp; Section: <u>{selectedGrade} - {selectedSection}</u></span>
          <span>Class Adviser: <u>{settings.adviserName}</u></span>
        </div>

        {/* SF2 Summary Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-slate-400 text-xs">
            <thead>
              <tr className="bg-slate-200 text-slate-900 font-bold text-[10px] uppercase border-b border-slate-400">
                <th className="border border-slate-400 p-2 text-center w-8">No.</th>
                <th className="border border-slate-400 p-2 text-center w-28">12-Digit LRN</th>
                <th className="border border-slate-400 p-2">Learner&apos;s Name (Last, First, Middle)</th>
                <th className="border border-slate-400 p-2 text-center w-12">Sex</th>
                <th className="border border-slate-400 p-2 text-center w-12">Present</th>
                <th className="border border-slate-400 p-2 text-center w-12">Late</th>
                <th className="border border-slate-400 p-2 text-center w-12 text-rose-700">Unexcused</th>
                <th className="border border-slate-400 p-2 text-center w-12 text-blue-700">Excused</th>
                <th className="border border-slate-400 p-2 text-center w-14 font-bold">Cons. Abs.</th>
                <th className="border border-slate-400 p-2 text-center w-14">School Days</th>
                <th className="border border-slate-400 p-2 text-center w-16">Rate (%)</th>
                <th className="border border-slate-400 p-2 w-48">Remarks / Reason Justification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300 text-[11px]">
              {summaries.length === 0 ? (
                <tr>
                  <td colSpan={12} className="text-center py-8 text-slate-500">
                    No student records found for the selected month and section.
                  </td>
                </tr>
              ) : (
                summaries.map((summary, idx) => {
                  const risk = riskAssessments.find(r => r.learnerId === summary.learnerId);
                  const isCritical = summary.isAtRisk5Consecutive || summary.isAtRisk20Percent;

                  return (
                    <tr key={summary.learnerId} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="border border-slate-300 p-1.5 text-center font-mono">{idx + 1}</td>
                      <td className="border border-slate-300 p-1.5 text-center font-mono font-bold">{summary.lrn}</td>
                      <td className="border border-slate-300 p-1.5 font-semibold">
                        {summary.fullName}
                        {isCritical && (
                          <span className="ml-1.5 text-[9px] px-1 py-0.2 rounded bg-rose-100 text-rose-800 font-bold border border-rose-300">
                            FLAGGED
                          </span>
                        )}
                      </td>
                      <td className="border border-slate-300 p-1.5 text-center">{summary.sex}</td>
                      <td className="border border-slate-300 p-1.5 text-center font-bold text-emerald-800">{summary.daysPresent}</td>
                      <td className="border border-slate-300 p-1.5 text-center font-bold text-amber-800">{summary.daysLate}</td>
                      <td className="border border-slate-300 p-1.5 text-center font-bold text-rose-800">{summary.daysAbsent}</td>
                      <td className="border border-slate-300 p-1.5 text-center font-bold text-blue-800">{summary.daysExcused}</td>
                      <td className="border border-slate-300 p-1.5 text-center font-mono font-bold">
                        <span className={summary.consecutiveAbsences >= 5 ? 'text-rose-700 underline font-black' : ''}>
                          {summary.consecutiveAbsences}
                        </span>
                      </td>
                      <td className="border border-slate-300 p-1.5 text-center font-mono">{summary.totalSchoolDays}</td>
                      <td className="border border-slate-300 p-1.5 text-center font-bold font-mono">
                        {summary.attendanceRate}%
                      </td>
                      <td className="border border-slate-300 p-1.5 text-[10px]">
                        {summary.latestExcuseReason ? (
                          <span className="text-blue-700 font-medium">{summary.latestExcuseReason}</span>
                        ) : isCritical ? (
                          <span className="text-rose-700 font-bold">
                            {summary.isAtRisk5Consecutive ? '5+ Consecutive Absences (Notice Required)' : '&ge;20% Absence Rate (Dropout Risk)'}
                          </span>
                        ) : summary.daysAbsent >= 3 ? (
                          <span className="text-amber-700">Follow-up needed (3+ unexcused)</span>
                        ) : summary.attendanceRate >= 95 ? (
                          <span className="text-emerald-700 font-medium">Exemplary attendance</span>
                        ) : (
                          <span className="text-slate-500">Regular</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* DepEd Official Sign-off and Certification Blocks */}
        <div className="mt-8 pt-6 border-t-2 border-slate-800 grid grid-cols-2 gap-8 text-xs">
          <div className="space-y-4">
            <p className="text-[10px] uppercase font-bold text-slate-500">Prepared &amp; Certified Correct By:</p>
            <div className="pt-8 border-b border-slate-900 text-center font-bold text-slate-900">
              {settings.adviserName}
            </div>
            <p className="text-center text-[10px] text-slate-600">Class Adviser / Teacher-in-Charge</p>
          </div>

          <div className="space-y-4">
            <p className="text-[10px] uppercase font-bold text-slate-500">Approved &amp; Attested By:</p>
            <div className="pt-8 border-b border-slate-900 text-center font-bold text-slate-900">
              {settings.principalName}
            </div>
            <p className="text-center text-[10px] text-slate-600">School Principal / Head Teacher</p>
          </div>
        </div>

        <div className="mt-6 text-[9px] text-slate-400 text-center">
          Generated via SIRCAM (Student Information &amp; Records, Classroom Attendance Monitoring) • DepEd Form 2 Standard
        </div>
      </div>
    </div>
  );
};
