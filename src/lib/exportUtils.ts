import { Learner, AttendanceRecord, MonthlyLearnerSummary, SchoolSettings, RiskLevel } from '../types';
import { generateOfficialDepEdSF2Csv } from './sf2ReportService';

export function calculateMonthlySummary(
  learners: Learner[],
  records: AttendanceRecord[],
  yearMonth: string // "YYYY-MM"
): MonthlyLearnerSummary[] {
  // Filter records belonging to the target month
  const monthRecords = records.filter(r => r.date.startsWith(yearMonth));

  // Determine unique school days recorded in this month (or default minimum)
  const uniqueDates = Array.from(new Set(monthRecords.map(r => r.date))).sort();
  const schoolDaysCount = Math.max(uniqueDates.length, 1);

  return learners.map(learner => {
    const studentRecords = monthRecords.filter(r => r.learnerId === learner.id || r.lrn === learner.lrn);
    const dateMap = new Map<string, AttendanceRecord>();
    studentRecords.forEach(r => dateMap.set(r.date, r));

    let daysPresent = 0;
    let daysLate = 0;
    let daysAbsent = 0;
    let daysExcused = 0;
    let consecutiveAbsences = 0;
    let maxConsecutive = 0;
    let latestExcuseReason: string | undefined;

    uniqueDates.forEach(date => {
      const r = dateMap.get(date);
      if (r) {
        if (r.status === 'Present') {
          daysPresent++;
          consecutiveAbsences = 0;
        } else if (r.status === 'Late') {
          daysLate++;
          consecutiveAbsences = 0;
        } else if (r.status === 'Absent') {
          daysAbsent++;
          consecutiveAbsences++;
          if (consecutiveAbsences > maxConsecutive) {
            maxConsecutive = consecutiveAbsences;
          }
        } else if (r.status === 'Excused') {
          daysExcused++;
          consecutiveAbsences = 0;
          if (r.excuseReasonCode) {
            latestExcuseReason = `${r.excuseReasonCode}: ${r.notes || r.excuseNotes || ''}`;
          } else if (r.notes) {
            latestExcuseReason = r.notes;
          }
        }
      }
    });

    const totalAttended = daysPresent + daysLate;
    const rate = Math.round((totalAttended / schoolDaysCount) * 100);
    const absenceRate = Math.round((daysAbsent / schoolDaysCount) * 100);

    const isAtRisk5Consecutive = maxConsecutive >= 5;
    const isAtRisk20Percent = absenceRate >= 20;

    let riskLevel: RiskLevel = 'Normal';
    if (isAtRisk5Consecutive && isAtRisk20Percent) {
      riskLevel = 'Severe_Dropout_Risk';
    } else if (isAtRisk5Consecutive) {
      riskLevel = 'Critical_5_Consecutive';
    } else if (isAtRisk20Percent) {
      riskLevel = 'Severe_Dropout_Risk';
    } else if (maxConsecutive >= 3 || absenceRate >= 15) {
      riskLevel = 'Moderate';
    }

    return {
      learnerId: learner.id,
      lrn: learner.lrn,
      fullName: `${learner.lastName}, ${learner.firstName} ${learner.middleName ? learner.middleName[0] + '.' : ''}${learner.suffix ? ' ' + learner.suffix : ''}`,
      sex: learner.sex,
      grade: learner.grade,
      section: learner.section,
      daysPresent,
      daysLate,
      daysAbsent,
      daysExcused,
      totalSchoolDays: schoolDaysCount,
      attendanceRate: Math.min(100, Math.max(0, rate)),
      consecutiveAbsences,
      maxConsecutiveAbsences: maxConsecutive,
      isAtRisk5Consecutive,
      isAtRisk20Percent,
      riskLevel,
      latestExcuseReason
    };
  });
}

export function downloadCsv(filename: string, csvContent: string): void {
  // UTF-8 BOM for Excel compatibility with special characters
  const bom = '\uFEFF';
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportDailyAttendanceCsv(records: AttendanceRecord[], learners: Learner[], date: string): void {
  const learnerMap = new Map<string, Learner>();
  learners.forEach(l => learnerMap.set(l.id, l));

  const headers = ['Learner ID', '12-Digit LRN', 'Full Name', 'Sex', 'Grade & Section', 'Date', 'Time-In (Arrival)', 'Time-Out (Going Home)', 'Status', 'Method', 'Notes'];

  const rows = records
    .filter(r => r.date === date)
    .map(r => {
      const learner = learnerMap.get(r.learnerId);
      const name = learner
        ? `"${learner.lastName}, ${learner.firstName} ${learner.middleName || ''}"`
        : '"Unknown"';
      const sex = learner ? learner.sex : '';
      const section = learner ? `"${learner.grade} - ${learner.section}"` : '';
      return [
        r.learnerId,
        `'${r.lrn}`, // format as string with tick for Excel
        name,
        sex,
        section,
        r.date,
        r.timeIn || 'None',
        r.timeOut || 'None',
        r.status,
        r.method === 'qr_camera' ? 'QR Scanner' : 'Manual Entry',
        `"${r.notes || ''}"`
      ].join(',');
    });

  const csv = [headers.join(','), ...rows].join('\n');
  downloadCsv(`SIRCAM_Daily_Attendance_${date}.csv`, csv);
}

export function exportMonthlySummaryCsv(summaries: MonthlyLearnerSummary[], yearMonth: string, settings: SchoolSettings): void {
  const headers = ['12-Digit LRN', 'Learner Name', 'Sex', 'Grade', 'Section', 'School Days', 'Present', 'Late', 'Absent', 'Excused', 'Attendance Rate (%)'];

  const rows = summaries.map(s => [
    `'${s.lrn}`,
    `"${s.fullName}"`,
    s.sex,
    `"${s.grade}"`,
    `"${s.section}"`,
    s.totalSchoolDays,
    s.daysPresent,
    s.daysLate,
    s.daysAbsent,
    s.daysExcused,
    `${s.attendanceRate}%`
  ].join(','));

  const schoolInfo = [
    `"School Name: ${settings.schoolName}"`,
    `"School ID: ${settings.schoolId}"`,
    `"Month: ${yearMonth}"`,
    `"Generated By: SIRCAM (Student Information & Records, Classroom Attendance Monitoring)"`,
    ''
  ].join('\n');

  const csv = schoolInfo + '\n' + [headers.join(','), ...rows].join('\n');
  downloadCsv(`SIRCAM_Monthly_Summary_SF2_${yearMonth}.csv`, csv);
}

export function exportOfficialSF2ExcelCsv(
  learners: Learner[],
  records: AttendanceRecord[],
  yearMonth: string,
  settings: SchoolSettings,
  gradeFilter: string = 'All',
  sectionFilter: string = 'All'
): void {
  const csvContent = generateOfficialDepEdSF2Csv(learners, records, yearMonth, settings, gradeFilter, sectionFilter);
  const cleanGrade = gradeFilter === 'All' ? 'AllGrades' : gradeFilter.replace(/\s+/g, '_');
  const cleanSection = sectionFilter === 'All' ? 'AllSections' : sectionFilter.replace(/\s+/g, '_');
  downloadCsv(`DepEd_SF2_Official_${yearMonth}_${cleanGrade}_${cleanSection}.csv`, csvContent);
}

export function exportLearnersMasterlistCsv(learners: Learner[]): void {
  const headers = ['Learner ID', '12-Digit LRN', 'Last Name', 'First Name', 'Middle Name', 'Suffix', 'Sex', 'Grade', 'Section', 'Parent Name', 'Parent Contact', 'Parent Messenger ID', 'Address', 'Status'];

  const rows = learners.map(l => [
    l.id,
    `'${l.lrn}`,
    `"${l.lastName}"`,
    `"${l.firstName}"`,
    `"${l.middleName || ''}"`,
    `"${l.suffix || ''}"`,
    l.sex,
    `"${l.grade}"`,
    `"${l.section}"`,
    `"${l.parentName}"`,
    `'${l.parentContact}`,
    `"${l.parentMessengerId || ''}"`,
    `"${l.address || ''}"`,
    l.status
  ].join(','));

  const csv = [headers.join(','), ...rows].join('\n');
  downloadCsv(`SIRCAM_Learners_Masterlist.csv`, csv);
}
