import { Learner, AttendanceRecord, AlertLog, SchoolSettings, OfflineSyncQueueItem } from '../types';
import { db } from './firebase';
import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { SAMPLE_LEARNERS, DEFAULT_SCHOOL_SETTINGS, generateInitialAttendance } from './sampleData';

const DB_PREFIX = 'sircam_';
const KEYS = {
  LEARNERS: `${DB_PREFIX}learners`,
  ATTENDANCE: `${DB_PREFIX}attendance`,
  ALERTS: `${DB_PREFIX}alerts`,
  SETTINGS: `${DB_PREFIX}settings`,
  LAST_SYNC: `${DB_PREFIX}last_sync`,
  SYNC_QUEUE: `${DB_PREFIX}sync_queue`,
};

export type SyncState = 'online_synced' | 'syncing' | 'offline' | 'error';

class StorageManager {
  private syncState: SyncState = 'offline';
  private listeners: ((state: SyncState) => void)[] = [];
  private queueListeners: ((queueCount: number) => void)[] = [];

  constructor() {
    this.updateOnlineStatus();
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleNetworkChange());
      window.addEventListener('offline', () => this.handleNetworkChange());
    }
  }

  private updateOnlineStatus() {
    if (typeof navigator !== 'undefined') {
      const queueCount = this.getSyncQueue().length;
      this.syncState = navigator.onLine ? (queueCount > 0 ? 'syncing' : 'online_synced') : 'offline';
    }
  }

  public subscribeSyncState(fn: (state: SyncState) => void) {
    this.listeners.push(fn);
    fn(this.syncState);
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  }

  public subscribeQueueCount(fn: (count: number) => void) {
    this.queueListeners.push(fn);
    fn(this.getSyncQueue().length);
    return () => {
      this.queueListeners = this.queueListeners.filter(l => l !== fn);
    };
  }

  private notifyQueueChange() {
    const count = this.getSyncQueue().length;
    this.queueListeners.forEach(fn => fn(count));
  }

  private setSyncState(newState: SyncState) {
    this.syncState = newState;
    this.listeners.forEach(fn => fn(this.syncState));
  }

  public getSyncState(): SyncState {
    return this.syncState;
  }

  // --- Offline Sync Queue ---
  public getSyncQueue(): OfflineSyncQueueItem[] {
    return this.readLocal<OfflineSyncQueueItem[]>(KEYS.SYNC_QUEUE, []);
  }

  public enqueueSyncItem(item: Omit<OfflineSyncQueueItem, 'queuedAt' | 'retries'>): void {
    const queue = this.getSyncQueue();
    const existingIdx = queue.findIndex(q => q.id === item.id && q.type === item.type);
    
    const newItem: OfflineSyncQueueItem = {
      ...item,
      queuedAt: Date.now(),
      retries: 0
    };

    let updatedQueue: OfflineSyncQueueItem[];
    if (existingIdx >= 0) {
      updatedQueue = [...queue];
      updatedQueue[existingIdx] = newItem;
    } else {
      updatedQueue = [...queue, newItem];
    }

    this.writeLocal(KEYS.SYNC_QUEUE, updatedQueue);
    this.notifyQueueChange();
    if (!navigator.onLine) {
      this.setSyncState('offline');
    }
  }

  public async processSyncQueue(): Promise<{ processed: number; errors: number }> {
    if (!db || !navigator.onLine) {
      return { processed: 0, errors: 0 };
    }

    const queue = this.getSyncQueue();
    if (queue.length === 0) {
      return { processed: 0, errors: 0 };
    }

    this.setSyncState('syncing');
    let processed = 0;
    let errors = 0;
    const remainingQueue: OfflineSyncQueueItem[] = [];

    for (const item of queue) {
      try {
        if (item.action === 'delete') {
          if (item.type === 'learner') {
            await deleteDoc(doc(db, 'learners', item.id));
          } else if (item.type === 'attendance') {
            await deleteDoc(doc(db, 'attendance', item.id));
          }
        } else {
          // 'set'
          if (item.type === 'attendance') {
            await setDoc(doc(db, 'attendance', item.id), item.data as any);
          } else if (item.type === 'alert') {
            await setDoc(doc(db, 'alerts', item.id), item.data as any);
          } else if (item.type === 'learner') {
            await setDoc(doc(db, 'learners', item.id), item.data as any);
          } else if (item.type === 'settings') {
            await setDoc(doc(db, 'settings', 'config'), item.data as any);
          }
        }
        processed++;
      } catch (err: unknown) {
        console.warn(`Failed to process queued item ${item.type}/${item.id}:`, err);
        errors++;
        remainingQueue.push({
          ...item,
          retries: item.retries + 1,
          lastError: err instanceof Error ? err.message : String(err)
        });
      }
    }

    this.writeLocal(KEYS.SYNC_QUEUE, remainingQueue);
    this.notifyQueueChange();

    if (remainingQueue.length === 0) {
      this.setSyncState('online_synced');
    } else {
      this.setSyncState('error');
    }

    return { processed, errors };
  }

  public clearSyncQueue(): void {
    this.writeLocal(KEYS.SYNC_QUEUE, []);
    this.notifyQueueChange();
    if (navigator.onLine) {
      this.setSyncState('online_synced');
    }
  }

  private async handleNetworkChange() {
    if (navigator.onLine) {
      this.setSyncState('syncing');
      try {
        await this.processSyncQueue();
        await this.syncWithCloud();
        this.setSyncState('online_synced');
      } catch (err) {
        console.warn('Sync failed:', err);
        this.setSyncState('error');
      }
    } else {
      this.setSyncState('offline');
    }
  }

  // --- Local Storage Helpers ---
  private readLocal<T>(key: string, defaultValue: T): T {
    try {
      const data = localStorage.getItem(key);
      if (!data) return defaultValue;
      return JSON.parse(data);
    } catch {
      return defaultValue;
    }
  }

  private writeLocal<T>(key: string, data: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (err) {
      console.error(`Failed to write local key ${key}:`, err);
    }
  }

  // --- Learners CRUD ---
  public getLearners(): Learner[] {
    let learners = this.readLocal<Learner[]>(KEYS.LEARNERS, []);
    if (!learners || learners.length === 0) {
      learners = SAMPLE_LEARNERS;
      this.writeLocal(KEYS.LEARNERS, learners);
    }
    return learners;
  }

  public saveLearner(learner: Learner): Learner[] {
    const list = this.getLearners();
    const existingIndex = list.findIndex(l => l.id === learner.id);
    let updated: Learner[];
    if (existingIndex >= 0) {
      updated = [...list];
      updated[existingIndex] = learner;
    } else {
      updated = [learner, ...list];
    }
    this.writeLocal(KEYS.LEARNERS, updated);
    this.pushLearnerToCloud(learner).catch(console.warn);
    return updated;
  }

  public deleteLearner(id: string): Learner[] {
    const list = this.getLearners();
    const updated = list.filter(l => l.id !== id);
    this.writeLocal(KEYS.LEARNERS, updated);
    this.removeLearnerFromCloud(id).catch(console.warn);
    return updated;
  }

  // --- Attendance Records CRUD ---
  public getAttendanceRecords(): AttendanceRecord[] {
    let records = this.readLocal<AttendanceRecord[]>(KEYS.ATTENDANCE, []);
    if (!records || records.length === 0) {
      const todayStr = new Date().toISOString().split('T')[0];
      const learners = this.getLearners();
      records = generateInitialAttendance(learners, todayStr);
      this.writeLocal(KEYS.ATTENDANCE, records);
    }
    return records;
  }

  public saveAttendanceRecord(record: AttendanceRecord): AttendanceRecord[] {
    const records = this.getAttendanceRecords();
    const idx = records.findIndex(r => r.id === record.id);
    let updated: AttendanceRecord[];
    if (idx >= 0) {
      updated = [...records];
      updated[idx] = { ...record, updatedAt: Date.now() };
    } else {
      updated = [{ ...record, updatedAt: Date.now() }, ...records];
    }
    this.writeLocal(KEYS.ATTENDANCE, updated);
    this.pushAttendanceToCloud(record).catch(console.warn);
    return updated;
  }

  public saveBulkAttendance(newRecords: AttendanceRecord[]): AttendanceRecord[] {
    const existing = this.getAttendanceRecords();
    const map = new Map<string, AttendanceRecord>();
    existing.forEach(r => map.set(r.id, r));
    newRecords.forEach(r => map.set(r.id, { ...r, updatedAt: Date.now() }));
    const updated = Array.from(map.values());
    this.writeLocal(KEYS.ATTENDANCE, updated);
    
    // Background cloud sync
    if (navigator.onLine && db) {
      Promise.all(newRecords.map(r => this.pushAttendanceToCloud(r))).catch(console.warn);
    }
    return updated;
  }

  // --- Alerts CRUD ---
  public getAlerts(): AlertLog[] {
    return this.readLocal<AlertLog[]>(KEYS.ALERTS, []);
  }

  public logAlert(alert: AlertLog): AlertLog[] {
    const alerts = this.getAlerts();
    const updated = [alert, ...alerts];
    this.writeLocal(KEYS.ALERTS, updated);
    this.pushAlertToCloud(alert).catch(console.warn);
    return updated;
  }

  public updateAlertStatus(id: string, status: AlertLog['status']): AlertLog[] {
    const alerts = this.getAlerts();
    const updated = alerts.map(a => a.id === id ? { ...a, status } : a);
    this.writeLocal(KEYS.ALERTS, updated);
    return updated;
  }

  // --- School Settings ---
  public getSettings(): SchoolSettings {
    return this.readLocal<SchoolSettings>(KEYS.SETTINGS, DEFAULT_SCHOOL_SETTINGS);
  }

  public saveSettings(settings: SchoolSettings): SchoolSettings {
    this.writeLocal(KEYS.SETTINGS, settings);
    this.pushSettingsToCloud(settings).catch(console.warn);
    return settings;
  }

  // --- Cloud Sync Implementation (Firebase Firestore) ---
  public async syncWithCloud(): Promise<{ learners: number; attendance: number }> {
    if (!db || !navigator.onLine) {
      return { learners: 0, attendance: 0 };
    }
    this.setSyncState('syncing');

    try {
      // 1. Sync Learners
      const learnersCol = collection(db, 'learners');
      const learnerDocs = await getDocs(learnersCol);
      const localLearners = this.getLearners();

      if (learnerDocs.empty && localLearners.length > 0) {
        // Cloud is empty, push local to cloud
        for (const learner of localLearners) {
          await setDoc(doc(db, 'learners', learner.id), learner);
        }
      } else if (!learnerDocs.empty) {
        // Merge cloud with local
        const cloudLearners: Learner[] = [];
        learnerDocs.forEach(d => {
          cloudLearners.push(d.data() as Learner);
        });
        const mergedLearnerMap = new Map<string, Learner>();
        localLearners.forEach(l => mergedLearnerMap.set(l.id, l));
        cloudLearners.forEach(l => mergedLearnerMap.set(l.id, l));
        const mergedList = Array.from(mergedLearnerMap.values());
        this.writeLocal(KEYS.LEARNERS, mergedList);
      }

      // 2. Sync Attendance Records
      const attCol = collection(db, 'attendance');
      const attDocs = await getDocs(attCol);
      const localAtt = this.getAttendanceRecords();

      if (attDocs.empty && localAtt.length > 0) {
        for (const att of localAtt) {
          await setDoc(doc(db, 'attendance', att.id), att);
        }
      } else if (!attDocs.empty) {
        const cloudAtt: AttendanceRecord[] = [];
        attDocs.forEach(d => cloudAtt.push(d.data() as AttendanceRecord));
        const mergedAttMap = new Map<string, AttendanceRecord>();
        localAtt.forEach(a => mergedAttMap.set(a.id, a));
        cloudAtt.forEach(a => {
          const localExisting = mergedAttMap.get(a.id);
          if (!localExisting || (a.updatedAt || 0) >= (localExisting.updatedAt || 0)) {
            mergedAttMap.set(a.id, a);
          }
        });
        const mergedAttList = Array.from(mergedAttMap.values());
        this.writeLocal(KEYS.ATTENDANCE, mergedAttList);
      }

      this.writeLocal(KEYS.LAST_SYNC, new Date().toISOString());
      this.setSyncState('online_synced');
      return { learners: this.getLearners().length, attendance: this.getAttendanceRecords().length };
    } catch (err) {
      console.error('Cloud synchronization error:', err);
      this.setSyncState('error');
      throw err;
    }
  }

  private async pushLearnerToCloud(learner: Learner) {
    if (!db || !navigator.onLine) {
      this.enqueueSyncItem({ id: learner.id, type: 'learner', action: 'set', data: learner });
      return;
    }
    try {
      await setDoc(doc(db, 'learners', learner.id), learner);
    } catch (e) {
      console.warn('Could not push learner to cloud, enqueuing for offline auto-sync:', e);
      this.enqueueSyncItem({ id: learner.id, type: 'learner', action: 'set', data: learner });
    }
  }

  private async removeLearnerFromCloud(id: string) {
    if (!db || !navigator.onLine) {
      this.enqueueSyncItem({ id, type: 'learner', action: 'delete', data: { id } });
      return;
    }
    try {
      await deleteDoc(doc(db, 'learners', id));
    } catch (e) {
      console.warn('Could not remove learner from cloud, enqueuing for offline auto-sync:', e);
      this.enqueueSyncItem({ id, type: 'learner', action: 'delete', data: { id } });
    }
  }

  private async pushAttendanceToCloud(record: AttendanceRecord) {
    if (!db || !navigator.onLine) {
      this.enqueueSyncItem({ id: record.id, type: 'attendance', action: 'set', data: record });
      return;
    }
    try {
      await setDoc(doc(db, 'attendance', record.id), record);
    } catch (e) {
      console.warn('Could not push attendance to cloud, enqueuing for offline auto-sync:', e);
      this.enqueueSyncItem({ id: record.id, type: 'attendance', action: 'set', data: record });
    }
  }

  private async pushAlertToCloud(alert: AlertLog) {
    if (!db || !navigator.onLine) {
      this.enqueueSyncItem({ id: alert.id, type: 'alert', action: 'set', data: alert });
      return;
    }
    try {
      await setDoc(doc(db, 'alerts', alert.id), alert);
    } catch (e) {
      console.warn('Could not push alert to cloud, enqueuing for offline auto-sync:', e);
      this.enqueueSyncItem({ id: alert.id, type: 'alert', action: 'set', data: alert });
    }
  }

  private async pushSettingsToCloud(settings: SchoolSettings) {
    if (!db || !navigator.onLine) {
      this.enqueueSyncItem({ id: 'config', type: 'settings', action: 'set', data: settings });
      return;
    }
    try {
      await setDoc(doc(db, 'settings', 'config'), settings);
    } catch (e) {
      console.warn('Could not push settings to cloud, enqueuing for offline auto-sync:', e);
      this.enqueueSyncItem({ id: 'config', type: 'settings', action: 'set', data: settings });
    }
  }

  // --- SQLite / Database Backup & Restore (.db / .json) ---
  public exportDatabaseBackup(): string {
    const backupData = {
      app: 'SIRCAM',
      formatVersion: '1.0',
      exportedAt: new Date().toISOString(),
      timestamp: Date.now(),
      schoolSettings: this.getSettings(),
      learners: this.getLearners(),
      attendance: this.getAttendanceRecords(),
      alerts: this.getAlerts()
    };
    return JSON.stringify(backupData, null, 2);
  }

  public downloadDatabaseBackupFile(): void {
    const data = this.exportDatabaseBackup();
    const dateStr = new Date().toISOString().split('T')[0];
    const blob = new Blob([data], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sircam_backup_${dateStr}.sircam.db`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  public restoreDatabaseBackup(jsonContent: string): { success: boolean; message: string } {
    try {
      const parsed = JSON.parse(jsonContent);
      if (!parsed.app || parsed.app !== 'SIRCAM') {
        return { success: false, message: 'Invalid file format. Please upload a valid .sircam.db or JSON backup file.' };
      }

      if (Array.isArray(parsed.learners)) {
        this.writeLocal(KEYS.LEARNERS, parsed.learners);
      }
      if (Array.isArray(parsed.attendance)) {
        this.writeLocal(KEYS.ATTENDANCE, parsed.attendance);
      }
      if (Array.isArray(parsed.alerts)) {
        this.writeLocal(KEYS.ALERTS, parsed.alerts);
      }
      if (parsed.schoolSettings) {
        this.writeLocal(KEYS.SETTINGS, parsed.schoolSettings);
      }

      // Trigger cloud push in background if online
      if (navigator.onLine) {
        this.syncWithCloud().catch(console.warn);
      }

      return {
        success: true,
        message: `Database restored successfully! (${parsed.learners?.length || 0} learners, ${parsed.attendance?.length || 0} attendance records)`
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown parsing error';
      return { success: false, message: `Failed to restore database: ${errorMsg}` };
    }
  }

  public resetToSampleData(): void {
    const todayStr = new Date().toISOString().split('T')[0];
    this.writeLocal(KEYS.LEARNERS, SAMPLE_LEARNERS);
    this.writeLocal(KEYS.ATTENDANCE, generateInitialAttendance(SAMPLE_LEARNERS, todayStr));
    this.writeLocal(KEYS.ALERTS, []);
    this.writeLocal(KEYS.SETTINGS, DEFAULT_SCHOOL_SETTINGS);
  }
}

export const storage = new StorageManager();
