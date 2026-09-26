import { 
  Learner, 
  AttendanceRecord, 
  MonthlyLearnerSummary, 
  SchoolSettings, 
  DropoutRiskAssessment,
  RiskLevel,
  EXCUSED_ABSENCE_REASONS
} from '../types';

/**
 * Calculates consecutive absences and dropout risks for all learners.
 * DepEd Rule:
 *  - 5 Consecutive Days of Absences -> Triggers Warning & Home Visitation Flag
 *  - >= 20% Total Absences over school days -> Critical Dropout Risk
 */
export function assessDropoutRisks(
  learners: Learner[],
  records: AttendanceRecord[],
  targetMonth?: string
): DropoutRiskAssessment[] {
  // Sort records chronologically
  const sortedRecords = [...records].sort((a, b) => a.date.localeCompare(b.date));

  // If targetMonth is provided, we can either filter or assess all up to that month
  const relevantRecords = targetMonth 
    ? sortedRecords.filter(r => r.date <= `${targetMonth}-31`)
    : sortedRecords;

  // Identify all unique school days across recorded attendance
  const allRecordedDates = Array.from(new Set(relevantRecords.map(r => r.date))).sort();
  const totalSchoolDays = Math.max(allRecordedDates.length, 1);

  return learners.map(learner => {
    const studentRecords = relevantRecords.filter(r => r.learnerId === learner.id || r.lrn === learner.lrn);
    const dateToRecord = new Map<string, AttendanceRecord>();
    studentRecords.forEach(r => dateToRecord.set(r.date, r));

    let unexcusedCount = 0;
    let excusedCount = 0;
    let currentStreak = 0;
    let maxStreak = 0;
    const currentStreakDates: string[] = [];

    // Analyze day by day across school calendar
    for (let i = 0; i < allRecordedDates.length; i++) {
      const d = allRecordedDates[i];
      const rec = dateToRecord.get(d);

      if (rec) {
        if (rec.status === 'Absent') {
          unexcusedCount++;
          currentStreak++;
          currentStreakDates.push(d);
          if (currentStreak > maxStreak) {
            maxStreak = currentStreak;
          }
        } else if (rec.status === 'Excused') {
          excusedCount++;
          // Excused absence does not count toward punitive consecutive dropout streak
          currentStreak = 0;
          currentStreakDates.length = 0;
        } else if (rec.status === 'Present' || rec.status === 'Late') {
          currentStreak = 0;
          currentStreakDates.length = 0;
        }
      }
    }

    const absencePercentage = Math.round((unexcusedCount / totalSchoolDays) * 100);
    const isAtRisk5Consecutive = currentStreak >= 5 || maxStreak >= 5;
    const isAtRisk20Percent = absencePercentage >= 20;

    let riskLevel: RiskLevel = 'Normal';
    let recommendedAction = 'Maintain regular monitoring';
    let interventionRequired = false;

    if (currentStreak >= 5 || isAtRisk20Percent) {
      if (currentStreak >= 5 && isAtRisk20Percent) {
        riskLevel = 'Severe_Dropout_Risk';
        recommendedAction = 'URGENT: Issue DepEd Official Notice of Absence & Conduct Immediate Home Visitation';
        interventionRequired = true;
      } else if (currentStreak >= 5) {
        riskLevel = 'Critical_5_Consecutive';
        recommendedAction = 'Action Required: Call Parent/Guardian conference and require Excuse Justification';
        interventionRequired = true;
      } else {
        riskLevel = 'Severe_Dropout_Risk';
        recommendedAction = 'Warning: Exceeded 20% total school absences threshold. Remediation counseling needed.';
        interventionRequired = true;
      }
    } else if (currentStreak >= 3 || absencePercentage >= 15) {
      riskLevel = 'Moderate';
      recommendedAction = 'Follow-up: Inquire with parent regarding frequent absences';
      interventionRequired = false;
    }

    const lastAbsenceDate = studentRecords
      .filter(r => r.status === 'Absent' || r.status === 'Excused')
      .pop()?.date;

    return {
      learnerId: learner.id,
      lrn: learner.lrn,
      learnerName: `${learner.lastName}, ${learner.firstName} ${learner.middleName ? learner.middleName[0] + '.' : ''}${learner.suffix ? ' ' + learner.suffix : ''}`,
      grade: learner.grade,
      section: learner.section,
      parentName: learner.parentName,
      parentContact: learner.parentContact,
      parentMessengerId: learner.parentMessengerId,
      consecutiveAbsences: currentStreak,
      maxConsecutiveAbsences: maxStreak,
      totalUnexcusedAbsences: unexcusedCount,
      totalExcusedAbsences: excusedCount,
      totalSchoolDays,
      absencePercentage,
      isAtRisk5Consecutive,
      isAtRisk20Percent,
      riskLevel,
      interventionRequired,
      recommendedAction,
      lastAbsenceDate,
      consecutiveAbsenceDates: [...currentStreakDates]
    };
  });
}

/**
 * Calculates official DepEd School Form 2 (SF2) monthly summary data.
 * Adheres strictly to DepEd SF2 requirements:
 * - Days present, late, unexcused absent, excused absent
 * - Consecutive absences and dropout risk indicators
 * - DepEd remarks and justification codes
 */
export function calculateSF2MonthlySummary(
  learners: Learner[],
  records: AttendanceRecord[],
  yearMonth: string // "YYYY-MM"
): MonthlyLearnerSummary[] {
  const monthRecords = records.filter(r => r.date.startsWith(yearMonth));
  
  // Sort unique calendar days for this month
  const uniqueDates = Array.from(new Set(monthRecords.map(r => r.date))).sort();
  const schoolDaysCount = Math.max(uniqueDates.length, 1);

  return learners.map(learner => {
    const studentMonthRecords = monthRecords.filter(
      r => r.learnerId === learner.id || r.lrn === learner.lrn
    );
    const dateMap = new Map<string, AttendanceRecord>();
    studentMonthRecords.forEach(r => dateMap.set(r.date, r));

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
          consecutiveAbsences = 0; // Excused resets consecutive streak
          if (r.excuseReasonCode) {
            const found = EXCUSED_ABSENCE_REASONS.find(e => e.code === r.excuseReasonCode);
            latestExcuseReason = found ? `${found.depedRemarkCode}: ${found.label}` : r.notes;
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
    if (isAtRisk5Consecutive || isAtRisk20Percent) {
      riskLevel = isAtRisk5Consecutive && isAtRisk20Percent ? 'Severe_Dropout_Risk' : 'Critical_5_Consecutive';
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

/**
 * Builds the Official Department of Education School Form 2 (SF2) Excel Spreadsheet (.csv)
 * Formatted with complete headers, daily attendance grids, summary totals, percentage of attendance,
 * consecutive absence tracking, and official DepEd certification blocks.
 */
export function generateOfficialDepEdSF2Csv(
  learners: Learner[],
  records: AttendanceRecord[],
  yearMonth: string,
  settings: SchoolSettings,
  gradeFilter: string = 'All',
  sectionFilter: string = 'All'
): string {
  const [yearStr, monthStr] = yearMonth.split('-');
  const yearNum = parseInt(yearStr, 10);
  const monthNum = parseInt(monthStr, 10);
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthName = monthNames[monthNum - 1] || 'Month';
  const daysInMonth = new Date(yearNum, monthNum, 0).getDate();

  // Filter learners
  const filteredLearners = learners.filter(l => {
    const matchGrade = gradeFilter === 'All' || l.grade === gradeFilter;
    const matchSection = sectionFilter === 'All' || l.section === sectionFilter;
    return matchGrade && matchSection;
  });

  const boys = filteredLearners.filter(l => l.sex === 'Male');
  const girls = filteredLearners.filter(l => l.sex === 'Female');

  // Month attendance records
  const monthRecords = records.filter(r => r.date.startsWith(yearMonth));
  const recordMap = new Map<string, AttendanceRecord>();
  monthRecords.forEach(r => {
    recordMap.set(`${r.date}_${r.learnerId}`, r);
    recordMap.set(`${r.date}_${r.lrn}`, r);
  });

  // Calculate SF2 summaries
  const summaries = calculateSF2MonthlySummary(filteredLearners, records, yearMonth);
  const summaryMap = new Map<string, MonthlyLearnerSummary>();
  summaries.forEach(s => summaryMap.set(s.learnerId, s));

  // Days list (Weekdays only or all days with indicator)
  const calendarDays: { day: number; dateStr: string; weekday: string; isWeekend: boolean }[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(yearNum, monthNum - 1, d);
    const dayOfWeek = dateObj.getDay();
    const dateStr = `${yearMonth}-${String(d).padStart(2, '0')}`;
    const weekdayShort = ['Su', 'M', 'T', 'W', 'Th', 'F', 'Sa'][dayOfWeek];
    calendarDays.push({
      day: d,
      dateStr,
      weekday: weekdayShort,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6
    });
  }

  // School days (exclude weekends)
  const schoolWeekdays = calendarDays.filter(c => !c.isWeekend);
  const totalSchoolDays = schoolWeekdays.length || 1;

  // Build CSV Lines
  const lines: string[] = [];

  // 1. Official Header
  lines.push('"DEPARTMENT OF EDUCATION - REPUBLIC OF THE PHILIPPINES"');
  lines.push('"SCHOOL FORM 2 (SF2) DAILY ATTENDANCE REPORT OF LEARNERS"');
  lines.push(`"(DepEd Order No. 4, s. 2014 - Mandatory Standard Classroom Attendance Form)"`);
  lines.push('');

  // 2. School Information Table
  lines.push(`"School ID:","${settings.schoolId}","School Name:","${settings.schoolName}","District:","${settings.district}"`);
  lines.push(`"Division:","${settings.division}","Region:","${settings.region}","School Year:","${settings.academicYear}"`);
  lines.push(`"Report Month:","${monthName} ${yearNum}","Grade Level:","${gradeFilter}","Section:","${sectionFilter}"`);
  lines.push(`"Class Adviser:","${settings.adviserName}","School Principal:","${settings.principalName}"`);
  lines.push('');

  // 3. Grid Columns Header
  const dayHeaders = calendarDays.map(c => `"${c.day}\n${c.weekday}"`).join(',');
  const tableHeader = [
    '"No."',
    '"12-Digit LRN"',
    '"Learner Full Name (Last, First, Middle)"',
    '"Sex"',
    dayHeaders,
    '"Total Present"',
    '"Total Late (Tardy)"',
    '"Unexcused Absences"',
    '"Excused Absences"',
    '"Consecutive Absences (Current)"',
    '"Max Consecutive"',
    '"Attendance Rate (%)"',
    '"Dropout Risk Warning Status"',
    '"Remarks / Justification Code"'
  ].join(',');

  lines.push(tableHeader);

  // Helper function to render a learner row
  const renderLearnerRow = (learner: Learner, rowNum: number) => {
    const summary = summaryMap.get(learner.id);
    const fullName = `"${learner.lastName}, ${learner.firstName} ${learner.middleName || ''}${learner.suffix ? ' ' + learner.suffix : ''}"`;
    
    // Day cells
    const dayCells = calendarDays.map(c => {
      if (c.isWeekend) {
        return '"—"'; // Weekend
      }
      const rec = recordMap.get(`${c.dateStr}_${learner.id}`) || recordMap.get(`${c.dateStr}_${learner.lrn}`);
      if (!rec) {
        return '""';
      }
      if (rec.status === 'Present') return '"P"';
      if (rec.status === 'Late') return '"L"';
      if (rec.status === 'Absent') return '"A"';
      if (rec.status === 'Excused') {
        const code = rec.excuseReasonCode ? `E(${rec.excuseReasonCode.slice(0, 3)})` : 'E';
        return `"${code}"`;
      }
      return '""';
    }).join(',');

    const present = summary?.daysPresent || 0;
    const late = summary?.daysLate || 0;
    const absent = summary?.daysAbsent || 0;
    const excused = summary?.daysExcused || 0;
    const consecutive = summary?.consecutiveAbsences || 0;
    const maxConsec = summary?.maxConsecutiveAbsences || 0;
    const rate = summary?.attendanceRate !== undefined ? `${summary.attendanceRate}%` : '0%';

    // Dropout Risk Flag
    let riskStatus = 'Normal';
    if (summary?.isAtRisk5Consecutive && summary?.isAtRisk20Percent) {
      riskStatus = 'CRITICAL: 5+ Cons. Absences & >=20% Total (DROPOUT RISK)';
    } else if (summary?.isAtRisk5Consecutive) {
      riskStatus = 'WARNING: 5+ Consecutive Absences (Early Intervention)';
    } else if (summary?.isAtRisk20Percent) {
      riskStatus = 'WARNING: >=20% Absences Threshold';
    } else if (summary?.riskLevel === 'Moderate') {
      riskStatus = 'Moderate Watchlist';
    }

    // Remarks
    let remark = summary?.latestExcuseReason || '';
    if (summary?.isAtRisk5Consecutive) {
      remark = remark ? `${remark} | DepEd Notice Required` : 'DepEd Notice Required (5 Consecutive Absences)';
    }

    return [
      rowNum,
      `'${learner.lrn}`,
      fullName,
      learner.sex,
      dayCells,
      present,
      late,
      absent,
      excused,
      consecutive,
      maxConsec,
      `"${rate}"`,
      `"${riskStatus}"`,
      `"${remark}"`
    ].join(',');
  };

  // 4. MALE SECTION
  lines.push(`"MALE (Total: ${boys.length})"`);
  boys.forEach((b, idx) => {
    lines.push(renderLearnerRow(b, idx + 1));
  });

  // Male Summary row
  const maleSummaries = summaries.filter(s => s.sex === 'Male');
  const malePresent = maleSummaries.reduce((a, b) => a + b.daysPresent, 0);
  const maleLate = maleSummaries.reduce((a, b) => a + b.daysLate, 0);
  const maleAbsent = maleSummaries.reduce((a, b) => a + b.daysAbsent, 0);
  const maleExcused = maleSummaries.reduce((a, b) => a + b.daysExcused, 0);
  const maleAvgRate = maleSummaries.length > 0 ? Math.round(maleSummaries.reduce((a, b) => a + b.attendanceRate, 0) / maleSummaries.length) : 0;
  lines.push(`"SUBTOTAL (MALE)","${boys.length} Enrolled","","","${calendarDays.map(() => '""').join(',')}",${malePresent},${maleLate},${maleAbsent},${maleExcused},"","",${maleAvgRate}%,"",""`);
  lines.push('');

  // 5. FEMALE SECTION
  lines.push(`"FEMALE (Total: ${girls.length})"`);
  girls.forEach((g, idx) => {
    lines.push(renderLearnerRow(g, idx + 1));
  });

  // Female Summary row
  const femaleSummaries = summaries.filter(s => s.sex === 'Female');
  const femalePresent = femaleSummaries.reduce((a, b) => a + b.daysPresent, 0);
  const femaleLate = femaleSummaries.reduce((a, b) => a + b.daysLate, 0);
  const femaleAbsent = femaleSummaries.reduce((a, b) => a + b.daysAbsent, 0);
  const femaleExcused = femaleSummaries.reduce((a, b) => a + b.daysExcused, 0);
  const femaleAvgRate = femaleSummaries.length > 0 ? Math.round(femaleSummaries.reduce((a, b) => a + b.attendanceRate, 0) / femaleSummaries.length) : 0;
  lines.push(`"SUBTOTAL (FEMALE)","${girls.length} Enrolled","","","${calendarDays.map(() => '""').join(',')}",${femalePresent},${femaleLate},${femaleAbsent},${femaleExcused},"","",${femaleAvgRate}%,"",""`);
  lines.push('');

  // 6. COMBINED TOTALS & OFFICIAL DEPED METRICS
  const totalEnrolled = filteredLearners.length;
  const grandPresent = malePresent + femalePresent;
  const grandLate = maleLate + femaleLate;
  const grandAbsent = maleAbsent + femaleAbsent;
  const grandExcused = maleExcused + femaleExcused;
  const combinedAvgRate = summaries.length > 0 ? Math.round(summaries.reduce((a, b) => a + b.attendanceRate, 0) / summaries.length) : 0;
  const atRiskCount = summaries.filter(s => s.isAtRisk5Consecutive || s.isAtRisk20Percent).length;

  lines.push(`"COMBINED TOTALS (CLASS)","${totalEnrolled} Learners","","","${calendarDays.map(() => '""').join(',')}",${grandPresent},${grandLate},${grandAbsent},${grandExcused},"","",${combinedAvgRate}%,"${atRiskCount} Flagged at Risk",""`);
  lines.push('');

  // 7. SUMMARY REPORT SECTION (DepEd Formula Statistics)
  lines.push('"DEPED OFFICIAL MONTHLY ATTENDANCE SUMMARY STATISTICS"');
  lines.push(`"Total Enrolled (Registered):",${totalEnrolled},"Boys:",${boys.length},"Girls:",${girls.length}`);
  lines.push(`"Total School Days in Month:",${totalSchoolDays}`);
  lines.push(`"Gross Days Present:",${grandPresent}`);
  lines.push(`"Gross Days Tardy / Late:",${grandLate}`);
  lines.push(`"Gross Unexcused Absences:",${grandAbsent}`);
  lines.push(`"Gross Excused Absences:",${grandExcused}`);
  lines.push(`"Average Daily Attendance (ADA):",${totalSchoolDays > 0 ? (grandPresent / totalSchoolDays).toFixed(2) : '0'}`);
  lines.push(`"Overall Percentage of Attendance (%):","${combinedAvgRate}%"`);
  lines.push(`"Learners with 5+ Consecutive Absences:",${summaries.filter(s => s.isAtRisk5Consecutive).length}`);
  lines.push(`"Learners with >=20% Absences (DepEd Dropout Risk):",${summaries.filter(s => s.isAtRisk20Percent).length}`);
  lines.push('');

  // 8. DEPED STANDARD LEGEND
  lines.push('"DEPED SF2 CODING SYSTEM & CODES FOR ABSENCE JUSTIFICATION"');
  lines.push('"P - Present","L - Late / Tardy","A - Absent (Unexcused)","E - Excused Absence"');
  lines.push('"I-MED - Illness / Sickness","F-EMG - Family Emergency","W-CAL - Severe Weather / Calamity","M-APT - Medical/Dental Appointment"');
  lines.push('"S-ACT - Official School/DepEd Activity","B-MOU - Bereavement / Mourning","O-EXC - Other Approved Justification"');
  lines.push('');

  // 9. CERTIFICATION AND SIGN-OFF
  lines.push('"OFFICIAL CERTIFICATION AND ATTESTATION"');
  lines.push(`"I hereby certify that the information contained in this School Form 2 is true, accurate, and properly audited from classroom records."`);
  lines.push('');
  lines.push(`"Prepared By (Class Adviser):","${settings.adviserName}","Signature / Date:","_____________________"`);
  lines.push(`"Attested By (School Head / Principal):","${settings.principalName}","Signature / Date:","_____________________"`);

  return lines.join('\n');
}
