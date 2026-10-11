import { describe, it, expect, beforeEach } from 'vitest';
import { getHistory, saveReportToHistory, deleteHistoryItem, clearAllHistory } from '@/lib/history';
import { Report } from '@/lib/schemas';

describe('lib/history: Client-side local analysis persistence', () => {
  beforeEach(() => {
    // Mock localStorage for test environment
    const store = new Map<string, string>();
    global.localStorage = {
      getItem: (key: string) => store.get(key) || null,
      setItem: (key: string, val: string) => store.set(key, val),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
      length: store.size,
      key: (i: number) => Array.from(store.keys())[i] || null,
    } as any;
  });

  const mockReport: Report = {
    verdict: 'block',
    riskScore: 85,
    summary: 'Critical vulnerability detected',
    findings: [],
    patches: [],
    verifications: [],
    stats: {
      totalFindings: 1,
      criticalCount: 1,
      highCount: 0,
      mediumCount: 0,
      lowCount: 0,
      verifiedPatchesCount: 0,
    },
  };

  it('saves analysis to history and retrieves it', () => {
    saveReportToHistory(mockReport, 'routes/auth.js');
    const history = getHistory();
    expect(history.length).toBe(1);
    expect(history[0].filename).toBe('routes/auth.js');
    expect(history[0].verdict).toBe('block');
    expect(history[0].riskScore).toBe(85);
  });

  it('deletes an item from history by id', () => {
    const item = saveReportToHistory(mockReport, 'test.js');
    expect(getHistory().length).toBe(1);

    deleteHistoryItem(item.id);
    expect(getHistory().length).toBe(0);
  });

  it('clears all history', () => {
    saveReportToHistory(mockReport, '1.js');
    saveReportToHistory(mockReport, '2.js');
    expect(getHistory().length).toBe(2);

    clearAllHistory();
    expect(getHistory().length).toBe(0);
  });
});
