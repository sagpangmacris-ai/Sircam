export type Sex = 'Male' | 'Female';

export type AttendanceStatus = 'Present' | 'Late' | 'Absent' | 'Excused';

export type ExcusedAbsenceReasonCode = 
  | 'ILLNESS'
  | 'FAMILY_EMERGENCY'
  | 'SEVERE_WEATHER'
  | 'MEDICAL_DENTAL'
  | 'OFFICIAL_SCHOOL_ACTIVITY'
  | 'BEREAVEMENT'
  | 'OTHER_EXCUSED';

export interface ExcusedAbsenceReasonOption {
  code: ExcusedAbsenceReasonCode;
  label: string;
  description: string;
  depedRemarkCode: string;
}

export const EXCUSED_ABSENCE_REASONS: ExcusedAbsenceReasonOption[] = [
  { code: 'ILLNESS', label: 'Illness / Medical Sickness', description: 'Student has medical condition, flu, or doctor advised rest', depedRemarkCode: 'I-MED' },
  { code: 'FAMILY_EMERGENCY', label: 'Family Emergency', description: 'Unavoidable domestic crisis or urgent household matter', depedRemarkCode: 'F-EMG' },
  { code: 'SEVERE_WEATHER', label: 'Severe Weather / Calamity / Typhoon', description: 'Typhoon, heavy floods, or localized suspension/hazard', depedRemarkCode: 'W-CAL' },
  { code: 'MEDICAL_DENTAL', label: 'Medical / Dental Appointment', description: 'Scheduled hospital, clinic, or dentist consultation', depedRemarkCode: 'M-APT' },
  { code: 'OFFICIAL_SCHOOL_ACTIVITY', label: 'Official School / DepEd Activity', description: 'DepEd athletic meet, press conference, or quiz bee representative', depedRemarkCode: 'S-ACT' },
  { code: 'BEREAVEMENT', label: 'Bereavement / Death in Family', description: 'Mourning or funeral services for immediate relative', depedRemarkCode: 'B-MOU' },
  { code: 'OTHER_EXCUSED', label: 'Other Valid Justification', description: 'Approved parent letter or valid teacher authorization', depedRemarkCode: 'O-EXC' },
];

export type AttendanceMethod = 'qr_camera' | 'manual' | 'nfc';

export type AlertChannel = 'sms' | 'messenger';

export type AlertTriggerType = 'going_home' | 'late' | 'absent' | 'arrival' | 'monthly_report' | 'consecutive_absence_warning';

export type AlertStatus = 'sent' | 'queued' | 'failed';

export interface Learner {
  id: string; // Unique internal ID
  lrn: string; // 12-digit DepEd Learner Reference Number
  firstName: string;
  middleName?: string;
  lastName: string;
  suffix?: string; // Jr., III, etc.
  sex: Sex;
  grade: string; // e.g. "Grade 10", "Grade 7"
  section: string; // e.g. "Rizal", "Bonifacio"
  parentName: string;
  parentContact: string; // Mobile number e.g. "09171234567"
  parentMessengerId: string; // Facebook Messenger username or ID (e.g. "juan.delacruz")
  photoUrl?: string;
  address?: string;
  enrolledAt: string; // ISO date
  status: 'Active' | 'Transferred' | 'Dropped';
}

export interface AttendanceRecord {
  id: string; // e.g. "2026-09-25_learnerId"
  learnerId: string;
  lrn: string;
  date: string; // YYYY-MM-DD
  timeIn?: string; // HH:MM:SS AM/PM
  timeOut?: string; // HH:MM:SS AM/PM
  timeInTimestamp?: number; // epoch ms
  timeOutTimestamp?: number; // epoch ms
  status: AttendanceStatus;
  method: AttendanceMethod;
  notes?: string;
  
  // Excused Absence & Reason Logging
  excuseReasonCode?: ExcusedAbsenceReasonCode;
  excuseNotes?: string;
  excusedBy?: string; // Teacher or adviser name
  excusedAt?: number; // timestamp
  
  alertGoingHomeSent?: boolean;
  alertLateSent?: boolean;
  alertAbsentSent?: boolean;
  updatedAt: number;
}

export interface AlertLog {
  id: string;
  learnerId: string;
  learnerName: string;
  lrn: string;
  parentName: string;
  channel: AlertChannel;
  destination: string; // Phone number or Messenger ID
  triggerType: AlertTriggerType;
  messageText: string;
  status: AlertStatus;
  sentAt: string; // ISO string
  timestamp: number;
}

export interface SchoolSettings {
  schoolName: string;
  schoolId: string;
  district: string;
  division: string;
  region: string;
  adviserName: string;
  principalName: string;
  academicYear: string;
  
  // Attendance Schedule
  schoolStartTime: string; // e.g. "07:30" (24h)
  lateCutoffTime: string;  // e.g. "07:45" (24h)
  schoolDismissalTime: string; // e.g. "15:30" (24h)
  
  // Automated Alert Configuration
  enableAutoGoingHomeAlert: boolean;
  enableAutoLateAlert: boolean;
  enableAutoAbsentAlert: boolean;
  enableAutoMonthlyReportAlert: boolean; // Auto-send on 1st day of succeeding month
  enableDropoutRiskAlerts: boolean; // Flag 5 consecutive absences or >= 20% annual absences
  preferredChannel: AlertChannel;
  
  // Message Templates
  tplGoingHome: string;
  tplLate: string;
  tplAbsent: string;
  tplMonthlyReport: string; // Template for monthly report card alert
  tplConsecutiveAbsenceWarning: string; // Warning to parent for >= 5 consecutive days or dropout risk
  
  // Hardware Scanner, Anti-Proxy & Audio Feedback
  soundChimeEnabled: boolean;
  voiceFeedbackEnabled: boolean; // Voice announcement of student name
  voiceSpeechRate?: number; // 0.8 - 1.2
  enableDynamicAntiProxy: boolean; // 30-second rotating QR anti-proxy protection
  dynamicQrIntervalSeconds: number; // default 30s
  enableOfflineAutoSync: boolean;

  // Tracking
  lastMonthlyReportSentMonth?: string; // e.g. "2026-08" or "2026-09"
  
  // Facebook Meta Graph API optional config
  metaPageAccessToken?: string;
  metaPageId?: string;
}

export type RiskLevel = 'Normal' | 'Moderate' | 'Critical_5_Consecutive' | 'Severe_Dropout_Risk';

export interface DropoutRiskAssessment {
  learnerId: string;
  lrn: string;
  learnerName: string;
  grade: string;
  section: string;
  parentName: string;
  parentContact: string;
  parentMessengerId: string;
  
  // Metrics
  consecutiveAbsences: number; // Current unbroken consecutive absent days
  maxConsecutiveAbsences: number; // Peak consecutive absent days in period
  totalUnexcusedAbsences: number;
  totalExcusedAbsences: number;
  totalSchoolDays: number;
  absencePercentage: number; // e.g., 22.5%
  
  // Flags & Intervention
  isAtRisk5Consecutive: boolean; // >= 5 consecutive absences
  isAtRisk20Percent: boolean; // >= 20% total absences (DepEd threshold)
  riskLevel: RiskLevel;
  interventionRequired: boolean;
  recommendedAction: string; // e.g. "Send DepEd Notice of Absence / Home Visitation"
  lastAbsenceDate?: string;
  consecutiveAbsenceDates: string[]; // List of dates in current streak
}

export interface MonthlyLearnerSummary {
  learnerId: string;
  lrn: string;
  fullName: string;
  sex: Sex;
  grade: string;
  section: string;
  daysPresent: number;
  daysLate: number;
  daysAbsent: number; // Unexcused
  daysExcused: number; // Excused with logged justification
  totalSchoolDays: number;
  attendanceRate: number; // percentage 0 - 100
  
  // Consecutive Absence & Risk Tracking
  consecutiveAbsences: number;
  maxConsecutiveAbsences: number;
  isAtRisk5Consecutive: boolean;
  isAtRisk20Percent: boolean;
  riskLevel: RiskLevel;
  latestExcuseReason?: string;
}

export interface QRDataPayload {
  sircam: boolean;
  id: string;
  lrn: string;
  name: string;
  grade: string;
  section: string;
}

export interface DynamicQRPayload {
  sircam: boolean;
  type: 'sircam_dynamic_pass';
  id: string;
  lrn: string;
  name: string;
  grade: string;
  section: string;
  window: number; // 30-second epoch slice
  timestamp: number;
  token: string; // Anti-proxy hash token
}

export interface OfflineSyncQueueItem {
  id: string;
  type: 'attendance' | 'alert' | 'learner' | 'settings';
  action: 'set' | 'delete';
  data: AttendanceRecord | AlertLog | Learner | SchoolSettings | Record<string, unknown>;
  queuedAt: number;
  retries: number;
  lastError?: string;
}

