import { Learner, SchoolSettings, AlertLog, AlertTriggerType, AlertChannel } from '../types';
import { storage } from './storage';

export function formatTemplate(
  template: string,
  variables: {
    student_name: string;
    time?: string;
    date?: string;
    status?: string;
    section: string;
    school_name: string;
    adviser_name: string;
    school_start?: string;
    parent_name?: string;
    month?: string;
    present_days?: number | string;
    late_days?: number | string;
    absent_days?: number | string;
    consecutive_absent_days?: number | string;
    risk_reason?: string;
    total_days?: number | string;
    attendance_rate?: number | string;
  }
): string {
  let result = template;
  result = result.replace(/{student_name}/g, variables.student_name);
  result = result.replace(/{parent_name}/g, variables.parent_name || 'Parent / Guardian');
  result = result.replace(/{time}/g, variables.time || '');
  result = result.replace(/{date}/g, variables.date || '');
  result = result.replace(/{status}/g, variables.status || '');
  result = result.replace(/{section}/g, variables.section);
  result = result.replace(/{school_name}/g, variables.school_name);
  result = result.replace(/{adviser_name}/g, variables.adviser_name);
  result = result.replace(/{school_start}/g, variables.school_start || '07:30 AM');
  result = result.replace(/{month}/g, variables.month || '');
  result = result.replace(/{present_days}/g, String(variables.present_days ?? 0));
  result = result.replace(/{late_days}/g, String(variables.late_days ?? 0));
  result = result.replace(/{absent_days}/g, String(variables.absent_days ?? 0));
  result = result.replace(/{consecutive_absent_days}/g, String(variables.consecutive_absent_days ?? 0));
  result = result.replace(/{risk_reason}/g, variables.risk_reason || '5+ consecutive unexcused absences');
  result = result.replace(/{total_days}/g, String(variables.total_days ?? 0));
  result = result.replace(/{attendance_rate}/g, String(variables.attendance_rate ?? 0));
  return result;
}

export function openNativeSms(phoneNumber: string, message: string): void {
  const cleanPhone = phoneNumber.replace(/[^0-9+]/g, '');
  // standard mobile SMS intent: sms:NUMBER?body=MESSAGE (Android & iOS standard)
  const encodedBody = encodeURIComponent(message);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const separator = isIOS ? '&' : '?';
  const url = `sms:${cleanPhone}${separator}body=${encodedBody}`;
  window.open(url, '_blank');
}

export function openFacebookMessenger(messengerId: string, message: string): void {
  // Free direct messenger deep link
  // Clean id if it's already a full link
  let cleanId = messengerId.trim();
  if (cleanId.startsWith('https://m.me/')) {
    cleanId = cleanId.replace('https://m.me/', '');
  } else if (cleanId.startsWith('m.me/')) {
    cleanId = cleanId.replace('m.me/', '');
  }
  const encodedText = encodeURIComponent(message);
  const url = `https://m.me/${cleanId}?text=${encodedText}`;
  window.open(url, '_blank');
}

export async function sendMetaGraphApiMessage(
  recipientPsid: string,
  messageText: string,
  pageAccessToken: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${pageAccessToken}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        recipient: { id: recipientPsid },
        message: { text: messageText },
        messaging_type: 'MESSAGE_TAG',
        tag: 'ACCOUNT_UPDATE'
      })
    });
    const data = await res.json();
    if (res.ok && !data.error) {
      return { success: true };
    }
    return { success: false, error: data.error?.message || 'Meta API error' };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Network error';
    return { success: false, error: errorMsg };
  }
}

export class AlertService {
  public static createAlertLog(
    learner: Learner,
    triggerType: AlertTriggerType,
    channel: AlertChannel,
    messageText: string,
    initialStatus: 'sent' | 'queued' = 'sent'
  ): AlertLog {
    const log: AlertLog = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      learnerId: learner.id,
      learnerName: `${learner.firstName} ${learner.lastName}`,
      lrn: learner.lrn,
      parentName: learner.parentName,
      channel,
      destination: channel === 'sms' ? learner.parentContact : (learner.parentMessengerId || learner.parentContact),
      triggerType,
      messageText,
      status: initialStatus,
      sentAt: new Date().toISOString(),
      timestamp: Date.now()
    };
    storage.logAlert(log);
    return log;
  }

  public static handleGoingHomeAlert(
    learner: Learner,
    timeOutStr: string,
    settings: SchoolSettings,
    autoTrigger: boolean = true
  ): AlertLog {
    const msg = formatTemplate(settings.tplGoingHome, {
      student_name: `${learner.firstName} ${learner.lastName}`,
      time: timeOutStr,
      section: `${learner.grade} - ${learner.section}`,
      school_name: settings.schoolName,
      adviser_name: settings.adviserName
    });

    const channel = learner.parentMessengerId ? settings.preferredChannel : 'sms';
    const log = this.createAlertLog(learner, 'going_home', channel, msg, autoTrigger ? 'sent' : 'queued');

    if (autoTrigger) {
      // If Meta token configured and channel is messenger
      if (channel === 'messenger' && settings.metaPageAccessToken && learner.parentMessengerId) {
        sendMetaGraphApiMessage(learner.parentMessengerId, msg, settings.metaPageAccessToken)
          .then(res => {
            if (!res.success) {
              console.warn('Meta Graph API notice:', res.error);
            }
          });
      }
    }
    return log;
  }

  public static handleLateAlert(
    learner: Learner,
    timeInStr: string,
    settings: SchoolSettings
  ): AlertLog {
    const msg = formatTemplate(settings.tplLate, {
      student_name: `${learner.firstName} ${learner.lastName}`,
      time: timeInStr,
      section: `${learner.grade} - ${learner.section}`,
      school_name: settings.schoolName,
      adviser_name: settings.adviserName,
      school_start: settings.schoolStartTime
    });

    const channel = learner.parentMessengerId ? settings.preferredChannel : 'sms';
    return this.createAlertLog(learner, 'late', channel, msg, 'queued');
  }

  public static handleAbsentAlert(
    learner: Learner,
    dateStr: string,
    settings: SchoolSettings
  ): AlertLog {
    const msg = formatTemplate(settings.tplAbsent, {
      student_name: `${learner.firstName} ${learner.lastName}`,
      date: dateStr,
      section: `${learner.grade} - ${learner.section}`,
      school_name: settings.schoolName,
      adviser_name: settings.adviserName
    });

    const channel = learner.parentMessengerId ? settings.preferredChannel : 'sms';
    return this.createAlertLog(learner, 'absent', channel, msg, 'queued');
  }

  public static handleConsecutiveAbsenceWarningAlert(
    learner: Learner,
    consecutiveDays: number,
    riskReason: string,
    settings: SchoolSettings,
    autoTrigger: boolean = true
  ): AlertLog {
    const template = settings.tplConsecutiveAbsenceWarning || 
      '⚠️ DEPED EARLY WARNING NOTICE: Learner {student_name} has accumulated {consecutive_absent_days} consecutive days of unexcused absences ({risk_reason}). Please contact adviser {adviser_name} immediately.';

    const msg = formatTemplate(template, {
      student_name: `${learner.firstName} ${learner.lastName}`,
      parent_name: learner.parentName,
      consecutive_absent_days: consecutiveDays,
      risk_reason: riskReason,
      section: `${learner.grade} - ${learner.section}`,
      school_name: settings.schoolName,
      adviser_name: settings.adviserName
    });

    const channel = learner.parentMessengerId ? settings.preferredChannel : 'sms';
    const log = this.createAlertLog(
      learner, 
      'consecutive_absence_warning', 
      channel, 
      msg, 
      autoTrigger ? 'sent' : 'queued'
    );

    if (autoTrigger && channel === 'messenger' && settings.metaPageAccessToken && learner.parentMessengerId) {
      sendMetaGraphApiMessage(learner.parentMessengerId, msg, settings.metaPageAccessToken)
        .then(res => {
          if (!res.success) {
            console.warn('Meta Graph API consecutive absence notice error:', res.error);
          }
        });
    }

    return log;
  }

  public static handleMonthlyReportAlert(
    learner: Learner,
    stats: {
      monthLabel: string;
      present: number;
      late: number;
      absent: number;
      totalDays: number;
      attendanceRate: number;
    },
    settings: SchoolSettings,
    autoTrigger: boolean = true
  ): AlertLog {
    const msg = formatTemplate(settings.tplMonthlyReport, {
      student_name: `${learner.firstName} ${learner.lastName}`,
      parent_name: learner.parentName,
      section: `${learner.grade} - ${learner.section}`,
      school_name: settings.schoolName,
      adviser_name: settings.adviserName,
      month: stats.monthLabel,
      present_days: stats.present,
      late_days: stats.late,
      absent_days: stats.absent,
      total_days: stats.totalDays,
      attendance_rate: stats.attendanceRate
    });

    const channel = learner.parentMessengerId ? settings.preferredChannel : 'sms';
    const log = this.createAlertLog(learner, 'monthly_report', channel, msg, autoTrigger ? 'sent' : 'queued');

    if (autoTrigger && channel === 'messenger' && settings.metaPageAccessToken && learner.parentMessengerId) {
      sendMetaGraphApiMessage(learner.parentMessengerId, msg, settings.metaPageAccessToken)
        .then(res => {
          if (!res.success) {
            console.warn('Meta Graph API monthly report notice:', res.error);
          }
        });
    }

    return log;
  }

  /**
   * Evaluates if today is the 1st day of the succeeding month and dispatches automated
   * monthly report alerts to all learners' parents.
   * Can also be triggered on-demand or simulated from the UI.
   */
  public static checkAndTriggerMonthlyReports(
    learners: Learner[],
    attendanceRecords: import('../types').AttendanceRecord[],
    settings: SchoolSettings,
    forceSucceedingMonthCheck: boolean = false
  ): { triggered: boolean; monthEvaluated: string; count: number; alerts: AlertLog[] } {
    const now = new Date();
    const currentDayOfMonth = now.getDate(); // 1 to 31

    // Determine the target previous month that just concluded (the succeeding month is now)
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevYearStr = prevDate.getFullYear();
    const prevMonthNum = prevDate.getMonth() + 1;
    const prevYearMonthKey = `${prevYearStr}-${String(prevMonthNum).padStart(2, '0')}`;

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const prevMonthLabel = `${monthNames[prevMonthNum - 1]} ${prevYearStr}`;

    // If not forced: only run if enabled, today is the 1st of the month, and not already sent for this month
    if (!forceSucceedingMonthCheck) {
      if (!settings.enableAutoMonthlyReportAlert) {
        return { triggered: false, monthEvaluated: prevYearMonthKey, count: 0, alerts: [] };
      }
      if (currentDayOfMonth !== 1) {
        return { triggered: false, monthEvaluated: prevYearMonthKey, count: 0, alerts: [] };
      }
      if (settings.lastMonthlyReportSentMonth === prevYearMonthKey) {
        return { triggered: false, monthEvaluated: prevYearMonthKey, count: 0, alerts: [] };
      }
    }

    // Filter attendance records for that concluded month
    const monthRecords = attendanceRecords.filter(r => r.date.startsWith(prevYearMonthKey));
    const uniqueDates = new Set(monthRecords.map(r => r.date));
    const totalSchoolDays = Math.max(uniqueDates.size, 1);

    const generatedAlerts: AlertLog[] = [];

    learners.forEach(learner => {
      const studentRecords = monthRecords.filter(r => r.learnerId === learner.id || r.lrn === learner.lrn);
      let present = 0;
      let late = 0;
      let absent = 0;

      studentRecords.forEach(r => {
        if (r.status === 'Present') present++;
        else if (r.status === 'Late') late++;
        else if (r.status === 'Absent') absent++;
      });

      const attended = present + late;
      const rate = Math.min(100, Math.max(0, Math.round((attended / totalSchoolDays) * 100)));

      const alertLog = this.handleMonthlyReportAlert(
        learner,
        {
          monthLabel: prevMonthLabel,
          present,
          late,
          absent,
          totalDays: totalSchoolDays,
          attendanceRate: rate
        },
        settings,
        true
      );

      generatedAlerts.push(alertLog);
    });

    // Update settings with lastMonthlyReportSentMonth
    const updatedSettings: SchoolSettings = {
      ...settings,
      lastMonthlyReportSentMonth: prevYearMonthKey
    };
    storage.saveSettings(updatedSettings);

    return {
      triggered: true,
      monthEvaluated: prevMonthLabel,
      count: generatedAlerts.length,
      alerts: generatedAlerts
    };
  }

  public static dispatchAlertNow(alert: AlertLog): void {
    if (alert.channel === 'sms') {
      openNativeSms(alert.destination, alert.messageText);
    } else {
      openFacebookMessenger(alert.destination, alert.messageText);
    }
    storage.updateAlertStatus(alert.id, 'sent');
  }
}
