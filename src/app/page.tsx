'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
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
  const [savingImage, setSavingImage] = useState(false);
  const shareCardRef = useRef<HTMLDivElement>(null);

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

  const isOfficial = summary && summary.unitsSubmitted === summary.totalUnits && summary.totalUnits > 0;

  const handleSaveImage = async () => {
    if (!shareCardRef.current) return;
    setSavingImage(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const images = shareCardRef.current.getElementsByTagName('img');
      await Promise.all(Array.from(images).map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => { img.onload = resolve; img.onerror = resolve; });
      }));
      const canvas = await html2canvas(shareCardRef.current, {
        scale: 3,
        backgroundColor: null,
        useCORS: true,
        logging: false,
        allowTaint: true,
      });
      const link = document.createElement('a');
      link.download = `vote69-results-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
    } catch (err) {
      console.error('Export error:', err);
      alert('เกิดข้อผิดพลาดในการบันทึกรูป');
    } finally {
      setSavingImage(false);
    }
  };

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
            {isOfficial ? (
              <span className="flex items-center gap-1.5 text-sm font-bold px-3 py-1 rounded-full bg-green-500/20 border border-green-500/30 text-green-400">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                OFFICIAL
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-sm text-green-400">
                <span className="w-2 h-2 rounded-full bg-green-400 pulse-live inline-block"></span>
                LIVE
              </span>
            )}
            <a href="/login" className="text-sm text-slate-400 hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-white/10">
              เข้าสู่ระบบ
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto space-y-6">
        {/* Official / Unofficial Notice */}
        {isOfficial ? (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 text-center">
            <span className="text-green-300 text-sm font-bold">
              ✅ ผลคะแนนอย่างเป็นทางการ — ทุกหน่วยเลือกตั้งส่งผลคะแนนครบแล้ว ({summary?.unitsSubmitted}/{summary?.totalUnits} หน่วย)
            </span>
          </div>
        ) : (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-center">
            <span className="text-amber-300 text-sm font-medium">
              ผลคะแนนไม่เป็นทางการ — {summary ? `${summary.unitsSubmitted}/${summary.totalUnits} หน่วยส่งผลแล้ว` : 'กำลังนับคะแนน'}
            </span>
          </div>
        )}

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

        {/* Score Cards with Portrait Photos */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-bold text-white mb-6 text-center">
            {isOfficial ? '🏆 ผลคะแนนอย่างเป็นทางการ' : 'คะแนนรวม (ไม่เป็นทางการ)'}
          </h2>
          <div className={`grid gap-4 ${sortedCandidates.length <= 3 ? 'grid-cols-1 sm:grid-cols-' + sortedCandidates.length : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
            {sortedCandidates.map((c, index) => {
              const votes = c.officialVotes > 0 ? c.officialVotes : c.liveVotes;
              const percent = totalAllVotes > 0 ? (votes / totalAllVotes) * 100 : 0;
              const heightPercent = maxVotes > 0 ? Math.max((votes / maxVotes) * 100, 5) : 5;
              const isLeading = index === 0 && votes > 0;

              return (
                <div key={c.candidateId}
                  className={`glass-card overflow-hidden transition-all hover:scale-[1.02] ${isLeading ? 'ring-2 ring-amber-400/50' : ''}`}
                  style={{ background: `linear-gradient(to top, ${c.themeColor}15, transparent)` }}>

                  {/* Portrait Photo Area */}
                  <div className="relative w-full h-48 overflow-hidden bg-gradient-to-b from-white/5 to-transparent">
                    {c.photoUrl ? (
                      <img src={c.photoUrl} alt={c.candidateName}
                        className="w-full h-full object-cover object-top"
                        style={{ objectPosition: 'center 20%' }}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            parent.innerHTML = `<div class="w-full h-full flex items-center justify-center text-6xl font-bold text-white/60" style="background:${c.themeColor}40">${c.candidateNumber}</div>`;
                          }
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-6xl font-bold text-white/60"
                        style={{ background: `${c.themeColor}40` }}>
                        {c.candidateNumber}
                      </div>
                    )}
                    {/* Rank Badge */}
                    <div className="absolute top-3 left-3">
                      {isLeading ? (
                        <div className="bg-amber-500 text-black text-xs px-3 py-1 rounded-full font-bold shadow-lg">
                          🏆 อันดับ 1
                        </div>
                      ) : (
                        <div className="bg-black/60 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-full font-medium">
                          อันดับ {index + 1}
                        </div>
                      )}
                    </div>
                    {/* Gradient overlay */}
                    <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/60 to-transparent"></div>
                  </div>

                  {/* Info + Bar */}
                  <div className="p-5 text-center">
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

        {/* ========== Shareable Story Card ========== */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">📸 แชร์ผลคะแนน</h2>
            <button onClick={handleSaveImage} disabled={savingImage}
              className="btn-success flex items-center gap-2 text-sm py-2 px-4">
              {savingImage ? (
                <span>กำลังบันทึก...</span>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  บันทึกรูปภาพ
                </>
              )}
            </button>
          </div>

          <div className="flex justify-center">
            <div
              ref={shareCardRef}
              className="relative overflow-hidden w-[400px]"
              style={{
                background: 'linear-gradient(135deg, #020617 0%, #0f172a 30%, #172554 60%, #1e3a5f 100%)',
                borderRadius: '24px',
                padding: '32px',
                fontFamily: "'Sarabun', sans-serif",
              }}
            >
              {/* Background decorations */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl -mr-24 -mt-24"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl -ml-24 -mb-24"></div>
              <div className="absolute top-1/2 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl -mr-16"></div>

              {/* Official Badge */}
              {isOfficial && (
                <div className="absolute top-5 right-5 z-10">
                  <div className="border border-green-400 bg-green-500/20 text-green-300 px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-[0_0_10px_rgba(74,222,128,0.3)]">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                    OFFICIAL
                  </div>
                </div>
              )}

              {/* Header */}
              <div className="relative z-10 flex flex-col items-center text-center mb-6">
                <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm mb-3 border border-white/20 shadow-lg">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/9/9f/RSL001.png"
                    alt="logo" className="w-12 h-12 object-contain" crossOrigin="anonymous" />
                </div>
                <h2 className="text-lg font-bold text-white leading-tight mb-0.5">
                  {isOfficial ? 'ประกาศผลการเลือกตั้ง' : 'ผลคะแนนเบื้องต้น'}
                </h2>
                <p className="text-xs text-slate-400">
                  {configData?.schoolName || 'โรงเรียนรัตนโกสินทร์สมโภชลาดกระบัง'}
                </p>
              </div>

              {/* Stats Row */}
              {summary && (
                <div className="relative z-10 grid grid-cols-3 gap-2 mb-5">
                  <div className="bg-white/5 border border-white/10 rounded-xl p-2 text-center">
                    <div className="text-lg font-bold text-blue-400">{summary.totalEligible.toLocaleString()}</div>
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider">ผู้มีสิทธิ์</div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-2 text-center">
                    <div className="text-lg font-bold text-green-400">{summary.totalSignatures.toLocaleString()}</div>
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider">มาใช้สิทธิ์</div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-2 text-center">
                    <div className="text-lg font-bold text-amber-400">{summary.turnoutPercent}%</div>
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider">Turnout</div>
                  </div>
                </div>
              )}

              {/* Candidates */}
              <div className="relative z-10 space-y-3">
                {sortedCandidates.map((c, i) => {
                  const votes = c.officialVotes > 0 ? c.officialVotes : c.liveVotes;
                  const widthPercent = maxVotes > 0 ? (votes / maxVotes) * 100 : 0;
                  const percent = totalAllVotes > 0 ? ((votes / totalAllVotes) * 100).toFixed(1) : '0';

                  return (
                    <div key={c.candidateId} className="relative">
                      <div className="flex items-center gap-3 relative z-10 mb-1.5">
                        {/* Rank */}
                        <div className="absolute -left-1 -top-1 w-5 h-5 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center text-[10px] font-bold text-white z-20 shadow-md">
                          {i + 1}
                        </div>

                        {/* Photo */}
                        <div className="relative flex-shrink-0">
                          {c.photoUrl ? (
                            <img src={c.photoUrl} alt="" className="w-12 h-16 rounded-lg object-cover border-2 shadow-lg"
                              style={{ borderColor: c.themeColor, objectPosition: 'center 20%' }} crossOrigin="anonymous" />
                          ) : (
                            <div className="w-12 h-16 rounded-lg flex items-center justify-center text-white text-lg font-bold border-2 shadow-lg"
                              style={{ background: c.themeColor, borderColor: c.themeColor }}>
                              {c.candidateNumber}
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-white truncate">{c.candidateName}</div>
                          <div className="text-[10px] text-slate-400 truncate">พรรค {c.partyName}</div>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <div className="text-lg font-bold" style={{ color: c.themeColor }}>{votes.toLocaleString()}</div>
                          <div className="text-[10px] text-slate-500">{percent}%</div>
                        </div>
                      </div>

                      {/* Bar */}
                      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full"
                          style={{
                            width: `${widthPercent}%`,
                            background: `linear-gradient(90deg, ${c.themeColor}, ${c.themeColor}88)`
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="relative z-10 mt-6 pt-3 border-t border-white/10 flex justify-between items-center text-[9px] text-slate-600">
                <div className="font-bold">SC.RSL.68</div>
                <div>
                  {new Date().toLocaleDateString('th-TH')} {new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-6xl mx-auto mt-8 text-center text-xs text-slate-500 pb-4">
        <p>ระบบนับคะแนนเลือกตั้ง — โรงเรียนรัตนโกสินทร์สมโภชลาดกระบัง</p>
        <p className="mt-1">อัปเดตอัตโนมัติทุก 5 วินาที | SC.RSL.68</p>
      </div>
    </div>
  );
}
