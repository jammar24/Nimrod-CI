'use client';

import React, { useState, useEffect } from 'react';
import { History, X, Search, Trash2, ArrowUpRight, ShieldAlert, ShieldCheck, AlertTriangle } from 'lucide-react';
import { HistoryItem, getHistory, deleteHistoryItem, clearAllHistory } from '@/lib/history';
import { Report } from '@/lib/schemas';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectReport: (report: Report, filename: string) => void;
}

export function HistoryModal({ isOpen, onClose, onSelectReport }: HistoryModalProps) {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'block' | 'review' | 'pass'>('all');

  useEffect(() => {
    if (isOpen) {
      setItems(getHistory());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.filename.toLowerCase().includes(search.toLowerCase()) ||
      item.verdict.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || item.verdict === filter;
    return matchesSearch && matchesFilter;
  });

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteHistoryItem(id);
    setItems(getHistory());
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear your local analysis history?')) {
      clearAllHistory();
      setItems([]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col max-h-[88dvh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-zinc-800">
          <div className="flex items-center space-x-2.5">
            <History className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-semibold text-zinc-100">
              Nimrod-CI
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Privacy Notice Banner */}
        <div className="px-4 sm:px-5 py-2.5 bg-zinc-950/60 border-b border-zinc-800/80 text-[11px] text-zinc-400 flex items-center justify-between gap-2">
          <span className="truncate">🔒 Stored exclusively in browser localStorage.</span>
          {items.length > 0 && (
            <button
              onClick={handleClearAll}
              className="text-rose-400 hover:text-rose-300 font-medium flex items-center gap-1 cursor-pointer transition-colors shrink-0"
            >
              <Trash2 className="w-3 h-3" />
              Clear All
            </button>
          )}
        </div>

        {/* Search & Filter Bar */}
        <div className="p-4 border-b border-zinc-800 flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by file or verdict..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-base sm:text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/50"
            />
          </div>

          <div className="flex items-center space-x-1 text-xs overflow-x-auto pb-1 sm:pb-0">
            {(['all', 'block', 'review', 'pass'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setFilter(v)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-colors cursor-pointer ${
                  filter === v
                    ? 'bg-zinc-800 text-white border border-zinc-700'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* List of Previous Runs */}
        <div className="p-4 overflow-y-auto flex-1 space-y-2">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-xs">
              No historical analyses found. Run a live analysis or replay to save records.
            </div>
          ) : (
            filteredItems.map((item) => {
              const verdictIcon =
                item.verdict === 'pass'
                  ? ShieldCheck
                  : item.verdict === 'review'
                  ? AlertTriangle
                  : ShieldAlert;
              const Icon = verdictIcon;

              const badgeColor =
                item.verdict === 'pass'
                  ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                  : item.verdict === 'review'
                  ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
                  : 'text-rose-400 bg-rose-500/10 border-rose-500/30';

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    onSelectReport(item.report, item.filename);
                    onClose();
                  }}
                  className="p-3.5 rounded-xl border border-zinc-800/80 bg-zinc-950/60 hover:bg-zinc-800/50 hover:border-zinc-700 transition-all flex items-center justify-between cursor-pointer group"
                >
                  <div className="min-w-0 pr-3">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border uppercase ${badgeColor}`}>
                        <Icon className="w-3 h-3" />
                        {item.verdict}
                      </span>
                      <span className="text-xs font-mono font-medium text-zinc-200 truncate">
                        {item.filename}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-zinc-500">
                      <span>Risk: {item.riskScore}/100</span>
                      <span>Findings: {item.totalFindings}</span>
                      <span>Verified: {item.verifiedCount}</span>
                      <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => handleDelete(item.id, e)}
                      title="Delete entry"
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <ArrowUpRight className="w-4 h-4 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
