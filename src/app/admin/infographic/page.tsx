'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import html2canvas from 'html2canvas';

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

export default function InfographicPage() {
    const [candidates, setCandidates] = useState<CandidateResult[]>([]);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [configData, setConfigData] = useState<{ electionTitle: string; schoolName: string } | null>(null);
    const [orientation, setOrientation] = useState<'vertical' | 'horizontal'>('vertical');
    const [exporting, setExporting] = useState(false);
    const infographicRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    const fetchData = useCallback(async () => {
        const res = await fetch('/api/auth/me');
        if (!res.ok) { router.push('/login'); return; }
        const me = await res.json();
        if (me.user.role !== 'ADMIN') { router.push('/staff/live'); return; }

        const resultsRes = await fetch('/api/public/results');
        const data = await resultsRes.json();
        setCandidates(data.candidates || []);
        setSummary(data.summary || null);
        setConfigData(data.config || null);
    }, [router]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleExport = async () => {
        if (!infographicRef.current) return;
        setExporting(true);
        try {
            const canvas = await html2canvas(infographicRef.current, {
                scale: 2,
                backgroundColor: '#0f172a',
                useCORS: true,
                logging: false,
            });
            const link = document.createElement('a');
            link.download = `election-infographic-${orientation}-${Date.now()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (err) {
            console.error('Export error:', err);
        } finally {
            setExporting(false);
        }
    };

    const sorted = [...candidates].sort((a, b) => {
        const aV = a.officialVotes > 0 ? a.officialVotes : a.liveVotes;
        const bV = b.officialVotes > 0 ? b.officialVotes : b.liveVotes;
        return bV - aV;
    });

    const totalVotes = sorted.reduce((s, c) => s + Math.max(c.officialVotes, c.liveVotes), 0);
    const maxVotes = sorted.length > 0 ? Math.max(sorted[0]?.officialVotes || 0, sorted[0]?.liveVotes || 0) : 1;

    return (
        <div className="min-h-screen p-4 md:p-8">
            <div className="max-w-5xl mx-auto">
                {/* Controls */}
                <div className="glass-card p-4 mb-6 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <a href="/admin" className="text-sm text-slate-300 hover:text-white">← กลับ Admin</a>
                        <h1 className="text-lg font-bold text-white">🎨 สร้าง Infographic</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={() => setOrientation('vertical')}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${orientation === 'vertical' ? 'bg-amber-500 text-black' : 'bg-white/10 text-white'}`}>
                            📱 แนวตั้ง (Story)
                        </button>
                        <button onClick={() => setOrientation('horizontal')}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${orientation === 'horizontal' ? 'bg-amber-500 text-black' : 'bg-white/10 text-white'}`}>
                            🖥️ แนวนอน (Post)
                        </button>
                        <button onClick={handleExport} disabled={exporting}
                            className="btn-success text-sm disabled:opacity-50">
                            {exporting ? '⏳ กำลัง Export...' : '📥 Export PNG'}
                        </button>
                    </div>
                </div>

                {/* Infographic Preview */}
                <div className="flex justify-center overflow-auto">
                    <div
                        ref={infographicRef}
                        className={`${orientation === 'vertical' ? 'w-[430px]' : 'w-[800px]'}`}
                        style={{
                            background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 40%, #0f2744 100%)',
                            padding: orientation === 'vertical' ? '32px 24px' : '32px',
                            borderRadius: '16px',
                            fontFamily: 'Sarabun, sans-serif',
                        }}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-center gap-3 mb-6">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/9/9f/RSL001.png"
                                alt="logo" className="w-16 h-16" crossOrigin="anonymous" />
                            <div className="text-center">
                                <h2 className="text-xl font-bold text-white">
                                    {configData?.electionTitle || 'การเลือกตั้งสภานักเรียน'}
                                </h2>
                                <p className="text-sm text-slate-300">
                                    {configData?.schoolName || 'โรงเรียนรัตนโกสินทร์สมโภชลาดกระบัง'}
                                </p>
                            </div>
                        </div>

                        {/* Candidates with bar + photo */}
                        <div className={`space-y-4 ${orientation === 'horizontal' ? 'flex flex-wrap gap-4' : ''}`}>
                            {sorted.map((c, i) => {
                                const votes = c.officialVotes > 0 ? c.officialVotes : c.liveVotes;
                                const widthPercent = maxVotes > 0 ? (votes / maxVotes) * 100 : 0;
                                const percent = totalVotes > 0 ? ((votes / totalVotes) * 100).toFixed(1) : '0';

                                return (
                                    <div key={c.candidateId}
                                        className={orientation === 'horizontal' ? 'flex-1 min-w-[200px]' : ''}
                                    >
                                        <div className="flex items-center gap-3 mb-2">
                                            {c.photoUrl ? (
                                                <img src={c.photoUrl} alt={c.candidateName}
                                                    className="w-12 h-12 rounded-full object-cover border-2"
                                                    style={{ borderColor: c.themeColor }}
                                                    crossOrigin="anonymous" />
                                            ) : (
                                                <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold"
                                                    style={{ background: c.themeColor }}>
                                                    {c.candidateNumber}
                                                </div>
                                            )}
                                            <div className="flex-1">
                                                <div className="text-sm font-bold text-white">
                                                    {i === 0 && votes > 0 ? '👑 ' : ''}หมายเลข {c.candidateNumber}
                                                </div>
                                                <div className="text-xs text-slate-300">{c.candidateName}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xl font-bold" style={{ color: c.themeColor }}>
                                                    {votes.toLocaleString()}
                                                </div>
                                                <div className="text-xs text-slate-400">{percent}%</div>
                                            </div>
                                        </div>
                                        {/* Bar with photo inside */}
                                        <div className="relative h-10 rounded-lg bg-white/10 overflow-hidden">
                                            <div className="absolute inset-y-0 left-0 rounded-lg flex items-center"
                                                style={{
                                                    width: `${Math.max(widthPercent, 8)}%`,
                                                    background: `linear-gradient(90deg, ${c.themeColor}cc, ${c.themeColor}88)`,
                                                    transition: 'width 0.5s ease',
                                                }}>
                                                {c.photoUrl && (
                                                    <img src={c.photoUrl} alt=""
                                                        className="w-8 h-8 rounded-full object-cover ml-1 border border-white/30"
                                                        crossOrigin="anonymous" />
                                                )}
                                                <span className="ml-2 text-white text-sm font-bold drop-shadow-md">
                                                    {votes.toLocaleString()} คะแนน
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Summary Stats */}
                        {summary && (
                            <div className="mt-6 grid grid-cols-3 gap-2 text-center">
                                <div className="bg-white/10 rounded-lg p-3">
                                    <div className="text-lg font-bold text-amber-400">{summary.totalEligible.toLocaleString()}</div>
                                    <div className="text-xs text-slate-400">ผู้มีสิทธิ์</div>
                                </div>
                                <div className="bg-white/10 rounded-lg p-3">
                                    <div className="text-lg font-bold text-green-400">{summary.totalSignatures.toLocaleString()}</div>
                                    <div className="text-xs text-slate-400">ผู้มาใช้สิทธิ์</div>
                                </div>
                                <div className="bg-white/10 rounded-lg p-3">
                                    <div className="text-lg font-bold text-blue-400">{summary.turnoutPercent}%</div>
                                    <div className="text-xs text-slate-400">อัตรามาใช้สิทธิ์</div>
                                </div>
                            </div>
                        )}

                        {/* Footer */}
                        <div className="mt-4 text-center text-xs text-slate-500">
                            ข้อมูล ณ {new Date().toLocaleDateString('th-TH')} {new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                            {summary && summary.unitsSubmitted < summary.totalUnits && ' (ผลไม่เป็นทางการ)'}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
