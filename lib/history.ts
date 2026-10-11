import { Report } from './schemas';

export interface HistoryItem {
  id: string;
  timestamp: string;
  filename: string;
  verdict: 'block' | 'review' | 'pass';
  riskScore: number;
  totalFindings: number;
  verifiedCount: number;
  report: Report;
}

const STORAGE_KEY = 'sentinel_ci_analysis_history_v1';

export function getHistory(): HistoryItem[] {
  if (typeof globalThis.localStorage === 'undefined') return [];
  try {
    const raw = globalThis.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.warn('[History] Failed to read from localStorage:', e);
    return [];
  }
}

export function saveReportToHistory(report: Report, filename: string = 'review.diff'): HistoryItem {
  const history = getHistory();
  const newItem: HistoryItem = {
    id: 'hist-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
    timestamp: new Date().toISOString(),
    filename,
    verdict: report.verdict,
    riskScore: report.riskScore,
    totalFindings: report.stats.totalFindings,
    verifiedCount: report.stats.verifiedPatchesCount,
    report,
  };

  // Keep up to 50 most recent records
  const updated = [newItem, ...history].slice(0, 50);
  try {
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('[History] Failed to save to localStorage:', e);
  }

  return newItem;
}

export function deleteHistoryItem(id: string): void {
  const history = getHistory();
  const filtered = history.filter((item) => item.id !== id);
  try {
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.warn('[History] Failed to delete item:', e);
  }
}

export function clearAllHistory(): void {
  try {
    globalThis.localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn('[History] Failed to clear history:', e);
  }
}
