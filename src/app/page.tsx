'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
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
interface ChartCandidate {
  id: number; number: number; name: string; partyName: string; themeColor: string; photoUrl: string | null;
}

export default function PublicDashboard() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [candidates, setCandidates] = useState<CandidateResult[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [configData, setConfigData] = useState<{ electionTitle: string; schoolName: string } | null>(null);
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

  useEffect(() => {
    fetchResults(); fetchCharts();
  }, [fetchResults, fetchCharts]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchResults(); fetchCharts();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchResults, fetchCharts]);

  const sortedCandidates = [...candidates].sort((a, b) => {
    const aVotes = a.officialVotes > 0 ? a.officialVotes : a.liveVotes;
    const bVotes = b.officialVotes > 0 ? b.officialVotes : b.liveVotes;
    return bVotes - aVotes;
  });

  const totalAllVotes = candidates.reduce((s, c) => s + Math.max(c.officialVotes, c.liveVotes), 0);
  const maxVotes = sortedCandidates.length > 0
    ? Math.max(sortedCandidates[0]?.officialVotes || 0, sortedCandidates[0]?.liveVotes || 0)
    : 1;

  if (enabled === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <img src="https://upload.wikimedia.org/wikipedia/commons/9/9f/RSL001.png" alt="logo"
            className="w-20 h-20 mx-auto mb-4 animate-pulse" />
          <div className="text-xl text-white">กำลังโหลดข้อมูล...</div>
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
            <div className="text-amber-300 text-lg font-semibold">ยังไม่เปิดเผยผลคะแนน</div>
            <p className="text-sm text-amber-200/70 mt-1">กำลังอยู่ระหว่างการนับคะแนน กรุณารอสักครู่</p>
          </div>
          <a href="/login" className="inline-block mt-8 text-sm text-slate-400 hover:text-white transition-colors">
            เข้าสู่ระบบสำหรับเจ้าหน้าที่
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-6">
        <div className="glass-card p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="https://upload.wikimedia.org/wikipedia/commons/9/9f/RSL001.png" alt="logo" className="w-12 h-12" />
            <div>
              <h1 className="text-xl font-bold text-white">{configData?.electionTitle || 'การเลือกตั้งสภานักเรียน'}</h1>
              <p className="text-sm text-slate-400">{configData?.schoolName || 'โรงเรียนรัตนโกสินทร์สมโภชลาดกระบัง'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-sm text-green-400">
              <span className="w-2 h-2 rounded-full bg-green-400 pulse-live inline-block"></span>
              LIVE
            </span>
            <a href="/login" className="text-sm text-slate-400 hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-white/10">
              เข้าสู่ระบบ
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto space-y-6">
        {/* Unofficial Notice */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-center">
          <span className="text-amber-300 text-sm font-medium">
            ผลคะแนนไม่เป็นทางการ — ผลคะแนนอย่างเป็นทางการจะประกาศผ่านรายงานผลการเลือกตั้ง
          </span>
        </div>

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

        {/* Vertical Score Cards */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-bold text-white mb-6 text-center">คะแนนรวม (ไม่เป็นทางการ)</h2>
          <div className={`grid gap-4 ${sortedCandidates.length <= 3 ? 'grid-cols-1 sm:grid-cols-' + sortedCandidates.length : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
            {sortedCandidates.map((c, index) => {
              const votes = c.officialVotes > 0 ? c.officialVotes : c.liveVotes;
              const percent = totalAllVotes > 0 ? (votes / totalAllVotes) * 100 : 0;
              const heightPercent = maxVotes > 0 ? Math.max((votes / maxVotes) * 100, 5) : 5;
              const isLeading = index === 0 && votes > 0;

              return (
                <div key={c.candidateId}
                  className={`glass-card p-5 text-center transition-all hover:scale-[1.02] ${isLeading ? 'ring-2 ring-amber-400/50' : ''}`}
                  style={{ background: `linear-gradient(to top, ${c.themeColor}15, transparent)` }}>
                  {/* Rank Badge */}
                  {isLeading && (
                    <div className="inline-block bg-amber-500 text-black text-xs px-3 py-1 rounded-full font-bold mb-3">
                      อันดับ 1
                    </div>
                  )}
                  {!isLeading && (
                    <div className="inline-block bg-white/10 text-slate-300 text-xs px-3 py-1 rounded-full font-medium mb-3">
                      อันดับ {index + 1}
                    </div>
                  )}

                  {/* Photo */}
                  {c.photoUrl ? (
                    <img src={c.photoUrl} alt={c.candidateName}
                      className="w-20 h-20 rounded-full object-cover mx-auto mb-3 border-3 shadow-lg"
                      style={{ borderColor: c.themeColor }} />
                  ) : (
                    <div className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-3 shadow-lg"
                      style={{ background: c.themeColor }}>
                      {c.candidateNumber}
                    </div>
                  )}

                  {/* Info */}
                  <div className="text-white font-bold text-lg mb-0.5">หมายเลข {c.candidateNumber}</div>
                  <div className="text-sm text-slate-300 mb-0.5">{c.candidateName}</div>
                  <div className="text-xs text-slate-400 mb-4">พรรค {c.partyName}</div>

                  {/* Vertical Bar */}
                  <div className="flex justify-center mb-3">
                    <div className="w-16 h-32 bg-white/5 rounded-lg overflow-hidden relative flex items-end">
                      <div
                        className="w-full rounded-t-md transition-all duration-700"
                        style={{
                          height: `${heightPercent}%`,
                          background: `linear-gradient(to top, ${c.themeColor}, ${c.themeColor}88)`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Score */}
                  <div className="text-3xl font-bold mb-1" style={{ color: c.themeColor }}>
                    {votes.toLocaleString()}
                  </div>
                  <div className="text-sm text-slate-400">{percent.toFixed(1)}%</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Grade Chart */}
        {chartData.length > 0 && (
          <div className="glass-card p-6">
            <h2 className="text-lg font-bold text-white mb-4">คะแนนตามระดับชั้น</h2>
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

      {/* Footer */}
      <div className="max-w-6xl mx-auto mt-8 text-center text-xs text-slate-500 pb-4">
        <p>ระบบนับคะแนนเลือกตั้ง — โรงเรียนรัตนโกสินทร์สมโภชลาดกระบัง</p>
        <p className="mt-1">อัปเดตอัตโนมัติทุก 5 วินาที | ผลคะแนนไม่เป็นทางการ</p>
      </div>
    </div>
  );
}
