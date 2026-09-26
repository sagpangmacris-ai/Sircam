import { Learner, DynamicQRPayload } from '../types';

const ANTI_PROXY_SALT = 'SIRCAM_DEPED_SECURE_2026';
export const DEFAULT_DYNAMIC_INTERVAL_SEC = 30;

/**
 * Computes a secure anti-tamper token for a specific 30-second window
 */
function computeWindowHash(learnerId: string, lrn: string, windowIndex: number): string {
  const raw = `${learnerId}:${lrn}:${windowIndex}:${ANTI_PROXY_SALT}`;
  let hash1 = 5381;
  let hash2 = 52711;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash1 = (hash1 * 33) ^ char;
    hash2 = (hash2 * 31) ^ char;
  }
  const part1 = (hash1 >>> 0).toString(16).padStart(8, '0');
  const part2 = (hash2 >>> 0).toString(16).padStart(8, '0');
  return `${part1}${part2}`;
}

export class DynamicQRService {
  /**
   * Generates a 30-second dynamic rotating QR payload for a student pass
   */
  public static generateDynamicPayload(
    learner: Learner, 
    intervalSec: number = DEFAULT_DYNAMIC_INTERVAL_SEC
  ): { payloadString: string; secondsRemaining: number; windowIndex: number } {
    const now = Date.now();
    const intervalMs = intervalSec * 1000;
    const windowIndex = Math.floor(now / intervalMs);
    const secondsRemaining = intervalSec - (Math.floor(now / 1000) % intervalSec);

    const token = computeWindowHash(learner.id, learner.lrn, windowIndex);

    const payload: DynamicQRPayload = {
      sircam: true,
      type: 'sircam_dynamic_pass',
      id: learner.id,
      lrn: learner.lrn,
      name: `${learner.firstName} ${learner.lastName}`,
      grade: learner.grade,
      section: learner.section,
      window: windowIndex,
      timestamp: now,
      token
    };

    return {
      payloadString: JSON.stringify(payload),
      secondsRemaining: Math.max(1, secondsRemaining),
      windowIndex
    };
  }

  /**
   * Validates a scanned raw string.
   * If it is a dynamic pass, enforces the 30-second validity window.
   */
  public static validateScannedPayload(
    rawText: string,
    intervalSec: number = DEFAULT_DYNAMIC_INTERVAL_SEC
  ): {
    isDynamicPass: boolean;
    isValid: boolean;
    learnerId?: string;
    lrn?: string;
    learnerName?: string;
    errorReason?: 'EXPIRED_PROXY_PHOTO' | 'INVALID_TOKEN' | 'FUTURE_CLOCK';
    ageSeconds?: number;
  } {
    const trimmed = rawText.trim();
    if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
      // Standard static QR / LRN barcode
      return { isDynamicPass: false, isValid: true, lrn: trimmed };
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.type !== 'sircam_dynamic_pass') {
        // Standard static JSON badge
        return { isDynamicPass: false, isValid: true, learnerId: parsed.id, lrn: parsed.lrn };
      }

      // Dynamic Rotating Pass Verification
      const now = Date.now();
      const intervalMs = intervalSec * 1000;
      const currentWindow = Math.floor(now / intervalMs);
      const passWindow = Number(parsed.window);

      // Validate anti-tamper token
      const expectedToken = computeWindowHash(parsed.id, parsed.lrn, passWindow);
      if (parsed.token !== expectedToken) {
        return {
          isDynamicPass: true,
          isValid: false,
          learnerId: parsed.id,
          lrn: parsed.lrn,
          errorReason: 'INVALID_TOKEN'
        };
      }

      // Check age: accept current window or previous window (allowing up to 30s transition/lag)
      const windowDiff = currentWindow - passWindow;
      const ageSeconds = Math.max(0, Math.round((now - (parsed.timestamp || (passWindow * intervalMs))) / 1000));

      if (windowDiff < 0) {
        return {
          isDynamicPass: true,
          isValid: false,
          learnerId: parsed.id,
          lrn: parsed.lrn,
          errorReason: 'FUTURE_CLOCK'
        };
      }

      // If more than 1 window old (i.e. > 30-60 seconds ago), REJECT as expired proxy photo
      if (windowDiff > 1) {
        return {
          isDynamicPass: true,
          isValid: false,
          learnerId: parsed.id,
          lrn: parsed.lrn,
          learnerName: parsed.name,
          errorReason: 'EXPIRED_PROXY_PHOTO',
          ageSeconds
        };
      }

      // Valid live rotating pass!
      return {
        isDynamicPass: true,
        isValid: true,
        learnerId: parsed.id,
        lrn: parsed.lrn,
        learnerName: parsed.name
      };
    } catch {
      return { isDynamicPass: false, isValid: true, lrn: trimmed };
    }
  }
}
