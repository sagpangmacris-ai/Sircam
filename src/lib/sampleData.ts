import { Learner, SchoolSettings, AttendanceRecord } from '../types';

export const DEFAULT_SCHOOL_SETTINGS: SchoolSettings = {
  schoolName: 'Mabini National High School',
  schoolId: '301452',
  district: 'District II - Central',
  division: 'Division of City Schools',
  region: 'Region IV-A (CALABARZON)',
  adviserName: 'Mrs. Corazon A. Santos, LPT',
  principalName: 'Dr. Roberto M. Hernandez, EdD',
  academicYear: '2026-2027',

  // Attendance standard schedule
  schoolStartTime: '07:30',
  lateCutoffTime: '07:45',
  schoolDismissalTime: '15:30',

  // Auto alerts
  enableAutoGoingHomeAlert: true,
  enableAutoLateAlert: true,
  enableAutoAbsentAlert: true,
  enableAutoMonthlyReportAlert: true,
  enableDropoutRiskAlerts: true,
  preferredChannel: 'messenger',

  // Templates
  tplGoingHome: 'SIRCAM Alert: Your child {student_name} has safely timed out and left school at {time}. Section: {section}. Have a safe trip home!',
  tplLate: 'SIRCAM Notice: Learner {student_name} arrived LATE at school today ({time}). Section: {section}. School started at {school_start}.',
  tplAbsent: 'SIRCAM Advisory: Learner {student_name} was marked ABSENT today ({date}). Section: {section}. Please coordinate with adviser {adviser_name} if this is excused.',
  tplMonthlyReport: 'SIRCAM Monthly Report ({month}): Hello {parent_name}, your child {student_name} ({section}) had {present_days} days Present, {late_days} Late, and {absent_days} Absent ({attendance_rate}% attendance rate) during {month}. Adviser: {adviser_name}. Thank you for your continued support!',
  tplConsecutiveAbsenceWarning: '⚠️ DEPED EARLY WARNING NOTICE: Learner {student_name} has accumulated {consecutive_absent_days} consecutive days of unexcused absences (Risk: {risk_reason}). DepEd guidelines mandate prompt intervention to prevent dropout risk. Please contact adviser {adviser_name} immediately at school or submit a written excuse letter.',
  
  // Hardware, Anti-Proxy & Audio Feedback
  soundChimeEnabled: true,
  voiceFeedbackEnabled: true,
  voiceSpeechRate: 1.0,
  enableDynamicAntiProxy: true,
  dynamicQrIntervalSeconds: 30,
  enableOfflineAutoSync: true,

  lastMonthlyReportSentMonth: '',
  metaPageAccessToken: '',
  metaPageId: ''
};

export const SAMPLE_LEARNERS: Learner[] = [
  {
    id: 'lrn-2026-001',
    lrn: '109283746501',
    firstName: 'Juan',
    middleName: 'Protacio',
    lastName: 'Dela Cruz',
    suffix: '',
    sex: 'Male',
    grade: 'Grade 10',
    section: 'Rizal',
    parentName: 'Teodora Dela Cruz',
    parentContact: '09171234567',
    parentMessengerId: 'teodora.delacruz.ph',
    photoUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&h=200&fit=crop&crop=faces',
    address: 'Brgy. San Roque, City Proper',
    enrolledAt: '2026-06-01',
    status: 'Active'
  },
  {
    id: 'lrn-2026-002',
    lrn: '109283746502',
    firstName: 'Maria Clara',
    middleName: 'Santos',
    lastName: 'De Los Santos',
    suffix: '',
    sex: 'Female',
    grade: 'Grade 10',
    section: 'Rizal',
    parentName: 'Kapitan Tiago De Los Santos',
    parentContact: '09289876543',
    parentMessengerId: 'kapitan.tiago.parent',
    photoUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&h=200&fit=crop&crop=faces',
    address: 'Poblacion Zone 1',
    enrolledAt: '2026-06-01',
    status: 'Active'
  },
  {
    id: 'lrn-2026-003',
    lrn: '109283746503',
    firstName: 'Angelo',
    middleName: 'Reyes',
    lastName: 'Bautista',
    suffix: 'Jr.',
    sex: 'Male',
    grade: 'Grade 10',
    section: 'Rizal',
    parentName: 'Angelo Bautista Sr.',
    parentContact: '09085551234',
    parentMessengerId: 'angelobautista.sr',
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=faces',
    address: 'Sitio Maligaya, Brgy. San Jose',
    enrolledAt: '2026-06-02',
    status: 'Active'
  },
  {
    id: 'lrn-2026-004',
    lrn: '109283746504',
    firstName: 'Princess Nicole',
    middleName: 'Garcia',
    lastName: 'Fernandez',
    suffix: '',
    sex: 'Female',
    grade: 'Grade 10',
    section: 'Rizal',
    parentName: 'Rowena Fernandez',
    parentContact: '09194443322',
    parentMessengerId: 'rowena.fernandez.parent',
    photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=faces',
    address: 'Emerald Hills Subd., Phase 2',
    enrolledAt: '2026-06-01',
    status: 'Active'
  },
  {
    id: 'lrn-2026-005',
    lrn: '109283746505',
    firstName: 'Joshua',
    middleName: 'Manalo',
    lastName: 'Aquino',
    suffix: '',
    sex: 'Male',
    grade: 'Grade 10',
    section: 'Rizal',
    parentName: 'Grace Aquino',
    parentContact: '09228889900',
    parentMessengerId: 'grace.aquino.mnhs',
    photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=faces',
    address: 'Block 4 Lot 12 Villa Verde',
    enrolledAt: '2026-06-03',
    status: 'Active'
  },
  {
    id: 'lrn-2026-006',
    lrn: '109283746506',
    firstName: 'Althea Mae',
    middleName: 'Villanueva',
    lastName: 'Mendoza',
    suffix: '',
    sex: 'Female',
    grade: 'Grade 10',
    section: 'Rizal',
    parentName: 'Maritess Mendoza',
    parentContact: '09391112233',
    parentMessengerId: 'maritess.mendoza.official',
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=faces',
    address: 'Riverside Drive, Brgy. Central',
    enrolledAt: '2026-06-01',
    status: 'Active'
  },
  {
    id: 'lrn-2026-007',
    lrn: '109283746507',
    firstName: 'Christian Mark',
    middleName: 'Flores',
    lastName: 'Ramos',
    suffix: '',
    sex: 'Male',
    grade: 'Grade 10',
    section: 'Rizal',
    parentName: 'Edgar Ramos',
    parentContact: '09187776655',
    parentMessengerId: 'edgar.ramos.tatay',
    photoUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=200&h=200&fit=crop&crop=faces',
    address: 'Old Balara Extension',
    enrolledAt: '2026-06-04',
    status: 'Active'
  },
  {
    id: 'lrn-2026-008',
    lrn: '109283746508',
    firstName: 'Sophia Loren',
    middleName: 'Diaz',
    lastName: 'Castillo',
    suffix: '',
    sex: 'Female',
    grade: 'Grade 10',
    section: 'Rizal',
    parentName: 'Lorenza Castillo',
    parentContact: '09276543210',
    parentMessengerId: 'lorenza.castillo.77',
    photoUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&h=200&fit=crop&crop=faces',
    address: 'Sampaguita St., Zone 4',
    enrolledAt: '2026-06-02',
    status: 'Active'
  },
  {
    id: 'lrn-2026-009',
    lrn: '109283746509',
    firstName: 'John Carlo',
    middleName: 'Perez',
    lastName: 'Navarro',
    suffix: '',
    sex: 'Male',
    grade: 'Grade 9',
    section: 'Bonifacio',
    parentName: 'Carlito Navarro',
    parentContact: '09153334444',
    parentMessengerId: 'carlito.navarro.p',
    photoUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&h=200&fit=crop&crop=faces',
    address: 'Purok 3, Brgy. San Pedro',
    enrolledAt: '2026-06-01',
    status: 'Active'
  },
  {
    id: 'lrn-2026-010',
    lrn: '109283746510',
    firstName: 'Karylle Anne',
    middleName: 'Corpuz',
    lastName: 'Ocampo',
    suffix: '',
    sex: 'Female',
    grade: 'Grade 9',
    section: 'Bonifacio',
    parentName: 'Annaliza Ocampo',
    parentContact: '09998887766',
    parentMessengerId: 'annaliza.ocampo.ph',
    photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop&crop=faces',
    address: 'San Vicente St., Poblacion',
    enrolledAt: '2026-06-01',
    status: 'Active'
  },
  {
    id: 'lrn-2026-011',
    lrn: '109283746511',
    firstName: 'Ethan James',
    middleName: 'Alcantara',
    lastName: 'Torres',
    suffix: '',
    sex: 'Male',
    grade: 'Grade 9',
    section: 'Bonifacio',
    parentName: 'Melinda Torres',
    parentContact: '09172223311',
    parentMessengerId: 'melinda.torres.teacher',
    photoUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop&crop=faces',
    address: 'Hilltop Subd., Phase 1',
    enrolledAt: '2026-06-05',
    status: 'Active'
  },
  {
    id: 'lrn-2026-012',
    lrn: '109283746512',
    firstName: 'Jannah Marie',
    middleName: 'Gutierrez',
    lastName: 'Salvador',
    suffix: '',
    sex: 'Female',
    grade: 'Grade 9',
    section: 'Bonifacio',
    parentName: 'Vilma Salvador',
    parentContact: '09204445566',
    parentMessengerId: 'vilma.salvador.m',
    photoUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&h=200&fit=crop&crop=faces',
    address: 'Green Meadows, Blk 2',
    enrolledAt: '2026-06-01',
    status: 'Active'
  }
];

export function generateInitialAttendance(learners: Learner[], todayStr: string): AttendanceRecord[] {
  const records: AttendanceRecord[] = [];
  const today = new Date(todayStr);

  // Generate records for past school days leading up to today so SF2 and consecutive absence detection has rich realistic data
  const pastDays: string[] = [];
  let dOffset = 1;
  while (pastDays.length < 15) {
    const d = new Date(today);
    d.setDate(today.getDate() - dOffset);
    const dayOfWeek = d.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Weekdays only
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      pastDays.unshift(`${yyyy}-${mm}-${dd}`);
    }
    dOffset++;
  }

  // Populate realistic attendance history for past days
  learners.forEach((learner, learnerIdx) => {
    pastDays.forEach((pastDate, dayIndex) => {
      // Learner 6 (Angelo Reyes Jr.) has consecutive absences to trigger 5-day warning
      if (learnerIdx === 6) {
        if (dayIndex >= 9) { // 6 consecutive absent days
          records.push({
            id: `${pastDate}_${learner.id}`,
            learnerId: learner.id,
            lrn: learner.lrn,
            date: pastDate,
            status: 'Absent',
            method: 'manual',
            notes: 'Unexcused - No parent reply',
            updatedAt: Date.now() - (pastDays.length - dayIndex) * 86400000
          });
          return;
        }
      }

      // Learner 7 (Princess Nicole) has excused absences with doctor illness notes
      if (learnerIdx === 7 && (dayIndex === 10 || dayIndex === 11 || dayIndex === 12)) {
        records.push({
          id: `${pastDate}_${learner.id}`,
          learnerId: learner.id,
          lrn: learner.lrn,
          date: pastDate,
          status: 'Excused',
          method: 'manual',
          excuseReasonCode: 'ILLNESS',
          excuseNotes: 'Viral acute flu - Medical certificate submitted by parent',
          excusedBy: 'Mrs. Corazon A. Santos, LPT',
          excusedAt: Date.now() - 2 * 86400000,
          updatedAt: Date.now() - (pastDays.length - dayIndex) * 86400000
        });
        return;
      }

      // Learner 3 has occasional excused absence for severe weather
      if (learnerIdx === 3 && dayIndex === 5) {
        records.push({
          id: `${pastDate}_${learner.id}`,
          learnerId: learner.id,
          lrn: learner.lrn,
          date: pastDate,
          status: 'Excused',
          method: 'manual',
          excuseReasonCode: 'SEVERE_WEATHER',
          excuseNotes: 'Localized flood in Brgy. Maligaya riverbank',
          excusedBy: 'Mrs. Corazon A. Santos, LPT',
          excusedAt: Date.now() - 5 * 86400000,
          updatedAt: Date.now() - (pastDays.length - dayIndex) * 86400000
        });
        return;
      }

      // General pattern: mostly Present, occasional late
      const hash = (learnerIdx * 31 + dayIndex * 17) % 100;
      if (hash < 82) {
        records.push({
          id: `${pastDate}_${learner.id}`,
          learnerId: learner.id,
          lrn: learner.lrn,
          date: pastDate,
          timeIn: '07:18:22 AM',
          timeOut: '03:32:15 PM',
          status: 'Present',
          method: 'qr_camera',
          updatedAt: Date.now() - (pastDays.length - dayIndex) * 86400000
        });
      } else if (hash < 93) {
        records.push({
          id: `${pastDate}_${learner.id}`,
          learnerId: learner.id,
          lrn: learner.lrn,
          date: pastDate,
          timeIn: '07:44:10 AM',
          timeOut: '03:30:00 PM',
          status: 'Late',
          method: 'qr_camera',
          updatedAt: Date.now() - (pastDays.length - dayIndex) * 86400000
        });
      } else {
        records.push({
          id: `${pastDate}_${learner.id}`,
          learnerId: learner.id,
          lrn: learner.lrn,
          date: pastDate,
          status: 'Absent',
          method: 'manual',
          notes: 'Unexcused',
          updatedAt: Date.now() - (pastDays.length - dayIndex) * 86400000
        });
      }
    });
  });

  // Create sample logs for today for learners
  learners.forEach((learner, idx) => {
    if (idx === 6) {
      // Angelo continues consecutive absence today (Day 6 consecutive)
      records.push({
        id: `${todayStr}_${learner.id}`,
        learnerId: learner.id,
        lrn: learner.lrn,
        date: todayStr,
        status: 'Absent',
        method: 'manual',
        notes: 'Unexcused consecutive absence (Day 6) - Risk warning triggered',
        alertAbsentSent: true,
        updatedAt: Date.now()
      });
    } else if (idx < 5) {
      // Present on-time
      records.push({
        id: `${todayStr}_${learner.id}`,
        learnerId: learner.id,
        lrn: learner.lrn,
        date: todayStr,
        timeIn: '07:18:22 AM',
        timeInTimestamp: new Date(`${todayStr}T07:18:22`).getTime(),
        timeOut: idx === 0 ? '03:32:15 PM' : undefined,
        timeOutTimestamp: idx === 0 ? new Date(`${todayStr}T15:32:15`).getTime() : undefined,
        status: 'Present',
        method: 'qr_camera',
        alertGoingHomeSent: idx === 0,
        updatedAt: Date.now()
      });
    } else if (idx === 5) {
      // Late
      records.push({
        id: `${todayStr}_${learner.id}`,
        learnerId: learner.id,
        lrn: learner.lrn,
        date: todayStr,
        timeIn: '07:42:08 AM',
        timeInTimestamp: new Date(`${todayStr}T07:42:08`).getTime(),
        status: 'Late',
        method: 'qr_camera',
        alertLateSent: true,
        updatedAt: Date.now()
      });
    } else if (idx === 7) {
      // Excused today
      records.push({
        id: `${todayStr}_${learner.id}`,
        learnerId: learner.id,
        lrn: learner.lrn,
        date: todayStr,
        status: 'Excused',
        method: 'manual',
        excuseReasonCode: 'ILLNESS',
        excuseNotes: 'Doctor-ordered recovery rest',
        excusedBy: 'Mrs. Corazon A. Santos, LPT',
        excusedAt: Date.now(),
        updatedAt: Date.now()
      });
    }
  });

  return records;
}
