'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList,
} from 'recharts';

interface CandidateResult {
  candidateId: number; candidateNumber: number; candidateName: string;
  partyName: string; photoUrl: string | null; themeColor: string;
  officialVotes: number; liveVotes: number;
}
interface Summary {
  totalOfficialNoVote: number; totalOfficialVoid: number;
  totalLiveNoVote: number; totalLiveVoid: number;
  totalSignatures: number; totalBallotsIssued: number;
  totalEligible: number; unitsSubmitted: number; totalUnits: number;
  turnoutPercent: string;
}
interface AuditEntry {
  id: number; action: string; pollingUnit: string; round: number;
  details: string; reason: string | null; performedBy: string; createdAt: string;
}
interface ChartCandidate {
  id: number; number: number; name: string; partyName: string; themeColor: string; photoUrl: string | null;
}

export default function PublicDashboard() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [candidates, setCandidates] = useState<CandidateResult[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [configData, setConfigData] = useState<{ electionTitle: string; schoolName: string } | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [chartData, setChartData] = useState<Record<string, string | number>[]>([]);
  const [chartCandidates, setChartCandidates] = useState<ChartCandidate[]>([]);

  const fetchResults = useCallback(async () => {
    try {
      const res = await fetch('/api/public/results');
      const data = await res.json();
      setEnabled(data.enabled);
      if (data.enabled) {
        setCandidates(data.candidates || []);
        setSummary(data.summary || null);
        setConfigData(data.config || null);
      }
    } catch { /* ignore */ }
  }, []);

  const fetchCharts = useCallback(async () => {
    try {
      const res = await fetch('/api/public/chart-data');
      const data = await res.json();
      if (data.enabled) {
        setChartData(data.chartData || []);
        setChartCandidates(data.candidates || []);
      }
    } catch { /* ignore */ }
  }, []);

  const fetchAudit = useCallback(async () => {
    try {
      const res = await fetch('/api/public/audit-feed?limit=30');
      const data = await res.json();
      if (Array.isArray(data)) setAuditLogs(data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchResults(); fetchCharts(); fetchAudit();
  }, [fetchResults, fetchCharts, fetchAudit]);

  // Auto-refresh every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchResults(); fetchCharts(); fetchAudit();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchResults, fetchCharts, fetchAudit]);

  // Sort candidates by votes
  const sortedCandidates = [...candidates].sort((a, b) => {
    const aVotes = a.officialVotes > 0 ? a.officialVotes : a.liveVotes;
    const bVotes = b.officialVotes > 0 ? b.officialVotes : b.liveVotes;
    return bVotes - aVotes;
  });

  const totalAllVotes = candidates.reduce((s, c) => s + Math.max(c.officialVotes, c.liveVotes), 0);

  // Bar chart data for main scoreboard
  const mainChartData = sortedCandidates.map((c) => ({
    name: `#${c.candidateNumber} ${c.candidateName}`,
    votes: c.officialVotes > 0 ? c.officialVotes : c.liveVotes,
    color: c.themeColor,
    isOfficial: c.officialVotes > 0,
  }));

  if (enabled === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <img src="https://upload.wikimedia.org/wikipedia/commons/9/9f/RSL001.png" alt="logo"
            className="w-20 h-20 mx-auto mb-4 animate-pulse" />
          <div className="text-xl text-white">⏳ กำลังโหลด...</div>
        </div>
      </div>
    );
  }

  if (!enabled) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass-card p-12 text-center max-w-md">
          <img src="https://upload.wikimedia.org/wikipedia/commons/9/9f/RSL001.png" alt="logo"
            className="w-24 h-24 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-white mb-3">การเลือกตั้งสภานักเรียน</h1>
          <p className="text-lg text-slate-300 mb-2">โรงเรียนรัตนโกสินทร์สมโภชลาดกระบัง</p>
          <div className="mt-8 p-4 bg-amber-500/20 border border-amber-500/30 rounded-xl">
            <div className="text-amber-300 text-lg font-semibold">🔒 ยังไม่เปิดเผยผล</div>
            <p className="text-sm text-amber-200/70 mt-1">กำลังอยู่ระหว่างการนับคะแนน กรุณารอสักครู่</p>
          </div>
          <a href="/login" className="inline-block mt-8 text-sm text-slate-400 hover:text-white transition-colors">
            🔑 เข้าสู่ระบบสำหรับเจ้าหน้าที่
          </a>
        </div>
      </div>
    );
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen p-4 md:p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="glass-card p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="https://upload.wikimedia.org/wikipedia/commons/9/9f/RSL001.png" alt="logo" className="w-12 h-12" />
            <div>
              <h1 className="text-xl font-bold text-white">{configData?.electionTitle || 'การเลือกตั้งสภานักเรียน'}</h1>
              <p className="text-sm text-slate-400">{configData?.schoolName || 'โรงเรียนรัตนโกสินทร์สมโภชลาดกระบัง'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-sm text-green-400">
              <span className="w-2 h-2 rounded-full bg-green-400 pulse-live inline-block"></span>
              LIVE
            </span>
            <a href="/login" className="text-sm text-slate-400 hover:text-white transition-colors">🔑</a>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Summary Stats */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="glass-card p-4 text-center">
              <div className="text-2xl font-bold text-amber-400">{summary.totalEligible.toLocaleString()}</div>
              <div className="text-xs text-slate-400 mt-1">ผู้มีสิทธิ์ทั้งหมด</div>
            </div>
            <div className="glass-card p-4 text-center">
              <div className="text-2xl font-bold text-green-400">{summary.totalSignatures.toLocaleString()}</div>
              <div className="text-xs text-slate-400 mt-1">ผู้มาใช้สิทธิ์</div>
            </div>
            <div className="glass-card p-4 text-center">
              <div className="text-2xl font-bold text-blue-400">{summary.turnoutPercent}%</div>
              <div className="text-xs text-slate-400 mt-1">อัตราผู้มาใช้สิทธิ์</div>
            </div>
            <div className="glass-card p-4 text-center">
              <div className="text-2xl font-bold text-cyan-400">{summary.unitsSubmitted}/{summary.totalUnits}</div>
              <div className="text-xs text-slate-400 mt-1">หน่วยที่นับเสร็จ</div>
            </div>
            <div className="glass-card p-4 text-center">
              <div className="text-2xl font-bold text-red-400">
                {(summary.totalOfficialVoid || 0) + (summary.totalLiveVoid || 0)}
              </div>
              <div className="text-xs text-slate-400 mt-1">บัตรเสีย</div>
            </div>
          </div>
        )}

        {/* Main Scoreboard */}
        <div className="glass-card p-6">
          <h2 className="text-xl font-bold text-white mb-6 text-center">🏆 คะแนนรวม</h2>
          <div className="space-y-4">
            {sortedCandidates.map((c, index) => {
              const votes = c.officialVotes > 0 ? c.officialVotes : c.liveVotes;
              const percent = totalAllVotes > 0 ? (votes / totalAllVotes) * 100 : 0;
              const isLeading = index === 0 && votes > 0;

              return (
                <div key={c.candidateId} className={`relative rounded-xl p-4 transition-all ${isLeading ? 'ring-2 ring-amber-400/50' : ''}`}
                  style={{ background: `${c.themeColor}15` }}>
                  {isLeading && <div className="absolute -top-2 -right-2 bg-amber-500 text-black text-xs px-2 py-1 rounded-full font-bold">👑 นำอยู่</div>}
                  <div className="flex items-center gap-4">
                    {c.photoUrl ? (
                      <img src={c.photoUrl} alt={c.candidateName} className="w-16 h-16 rounded-full object-cover border-3 shadow-lg" style={{ borderColor: c.themeColor }} />
                    ) : (
                      <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg" style={{ background: c.themeColor }}>
                        {c.candidateNumber}
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-white text-lg">หมายเลข {c.candidateNumber}</span>
                        {c.officialVotes > 0 ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-300">ทางการ</span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">เบื้องต้น</span>
                        )}
                      </div>
                      <div className="text-sm text-slate-300">{c.candidateName}</div>
                      <div className="text-xs text-slate-400">พรรค {c.partyName}</div>
                      <div className="mt-2 progress-bar">
                        <div className="progress-bar-fill" style={{ width: `${percent}%`, background: c.themeColor }} />
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl md:text-4xl font-bold" style={{ color: c.themeColor }}>
                        {votes.toLocaleString()}
                      </div>
                      <div className="text-sm text-slate-400">{percent.toFixed(1)}%</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Bar Chart */}
          <div className="lg:col-span-2 glass-card p-6">
            <h2 className="text-lg font-bold text-white mb-4">📊 คะแนนรวม</h2>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mainChartData} layout="vertical" margin={{ left: 10, right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis type="number" stroke="#94a3b8" />
                  <YAxis dataKey="name" type="category" width={150} stroke="#94a3b8" tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#e2e8f0' }}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={((value: any) => [`${Number(value).toLocaleString()} คะแนน`, '']) as any}
                  />
                  <Bar dataKey="votes" radius={[0, 8, 8, 0]}>
                    {mainChartData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                    <LabelList dataKey="votes" position="right" fill="#e2e8f0" fontSize={14} fontWeight={700} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Grade Chart */}
          {chartData.length > 0 && (
            <div className="glass-card p-6">
              <h2 className="text-lg font-bold text-white mb-4">🏫 ตามระดับชั้น</h2>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="grade" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip
                      contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#e2e8f0' }}
                    />
                    {chartCandidates.map((c) => (
                      <Bar key={c.id} dataKey={`candidate_${c.id}`} name={`#${c.number} ${c.name}`} fill={c.themeColor} radius={[4, 4, 0, 0]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* Transparency Feed */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-bold text-white mb-4">📜 บันทึกความโปร่งใส</h2>
          {auditLogs.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-4">ยังไม่มีรายการ</p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {auditLogs.map((log) => (
                <div key={log.id} className={`flex items-start gap-3 p-3 rounded-lg ${log.action === 'SUBMIT' ? 'bg-green-500/10' :
                  log.action === 'RECOUNT' ? 'bg-amber-500/10' : 'bg-blue-500/10'
                  }`}>
                  <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${log.action === 'SUBMIT' ? 'bg-green-400' :
                    log.action === 'RECOUNT' ? 'bg-amber-400' : 'bg-blue-400'
                    }`} />
                  <div className="flex-1">
                    <div className="text-sm text-white">{log.details}</div>
                    {log.reason && (
                      <div className="text-xs text-amber-300 mt-1">📝 เหตุผล: {log.reason}</div>
                    )}
                    <div className="text-xs text-slate-500 mt-1">
                      {formatTime(log.createdAt)} · {log.performedBy}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${log.action === 'SUBMIT' ? 'bg-green-500/20 text-green-300' :
                    log.action === 'RECOUNT' ? 'bg-amber-500/20 text-amber-300' : 'bg-blue-500/20 text-blue-300'
                    }`}>
                    {log.action === 'SUBMIT' ? 'ส่งคะแนน' :
                      log.action === 'RECOUNT' ? 'นับใหม่' : 'นับสด'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-7xl mx-auto mt-8 text-center text-xs text-slate-500 pb-4">
        <p>ระบบนับคะแนนเลือกตั้ง © โรงเรียนรัตนโกสินทร์สมโภชลาดกระบัง</p>
        <p className="mt-1">อัปเดตอัตโนมัติทุก 5 วินาที</p>
      </div>
    </div>
  );
}
