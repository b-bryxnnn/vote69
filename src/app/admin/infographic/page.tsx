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
    const [viewMode, setViewMode] = useState<'infographic' | 'report'>('infographic');
    const [exporting, setExporting] = useState(false);
    const infographicRef = useRef<HTMLDivElement>(null);
    const reportRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    const fetchData = useCallback(async () => {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
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

    const handleExportImage = async () => {
        if (!infographicRef.current) return;
        setExporting(true);
        try {
            // Wait for images to load
            const images = infographicRef.current.getElementsByTagName('img');
            await Promise.all(Array.from(images).map(img => {
                if (img.complete) return Promise.resolve();
                return new Promise(resolve => { img.onload = resolve; img.onerror = resolve; });
            }));

            const canvas = await html2canvas(infographicRef.current, {
                scale: 3, // Higher quality
                backgroundColor: null,
                useCORS: true,
                logging: false,
                allowTaint: true,
            });
            const link = document.createElement('a');
            link.download = `election-infographic-${orientation}-${Date.now()}.png`;
            link.href = canvas.toDataURL('image/png', 1.0);
            link.click();
        } catch (err) {
            console.error('Export error:', err);
            alert('เกิดข้อผิดพลาดในการบันทึกรูปภาพ');
        } finally {
            setExporting(false);
        }
    };

    const handlePrintReport = () => {
        window.print();
    };

    const sorted = [...candidates].sort((a, b) => {
        const aV = a.officialVotes > 0 ? a.officialVotes : a.liveVotes;
        const bV = b.officialVotes > 0 ? b.officialVotes : b.liveVotes;
        return bV - aV;
    });

    const totalVotes = sorted.reduce((s, c) => s + Math.max(c.officialVotes, c.liveVotes), 0);
    const maxVotes = sorted.length > 0 ? Math.max(sorted[0]?.officialVotes || 0, sorted[0]?.liveVotes || 0) : 1;

    const isOfficial = summary && summary.unitsSubmitted === summary.totalUnits && summary.totalUnits > 0;

    return (
        <div className="min-h-screen bg-slate-900 text-white print:bg-white print:text-black">
            {/* Controls - Hidden when printing */}
            <div className="p-4 md:p-8 print:hidden">
                <div className="max-w-6xl mx-auto mb-6 glass-card p-4 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <a href="/admin" className="text-slate-300 hover:text-white flex items-center gap-1">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                            กลับ
                        </a>
                        <div className="h-6 w-px bg-white/20 mx-2"></div>
                        <h1 className="text-lg font-bold">สร้างรายงานผลเลือกตั้ง</h1>
                    </div>

                    <div className="flex items-center gap-2 bg-black/30 p-1 rounded-lg">
                        <button onClick={() => setViewMode('infographic')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === 'infographic' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                            🎨 อินโฟกราฟิก
                        </button>
                        <button onClick={() => setViewMode('report')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === 'report' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                            📄 รายงานทางการ
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        {viewMode === 'infographic' ? (
                            <>
                                <div className="flex bg-black/30 p-1 rounded-lg">
                                    <button onClick={() => setOrientation('vertical')}
                                        className={`p-2 rounded-md transition-all ${orientation === 'vertical' ? 'bg-white/20 text-white' : 'text-slate-500 hover:text-white'}`} title="แนวตั้ง">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                    </button>
                                    <button onClick={() => setOrientation('horizontal')}
                                        className={`p-2 rounded-md transition-all ${orientation === 'horizontal' ? 'bg-white/20 text-white' : 'text-slate-500 hover:text-white'}`} title="แนวนอน">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                    </button>
                                </div>
                                <button onClick={handleExportImage} disabled={exporting}
                                    className="btn-success flex items-center gap-2 px-4 py-2">
                                    {exporting ? (
                                        <><span>กำลังบันทึก...</span></>
                                    ) : (
                                        <><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg> ดาวน์โหลดรูป</>
                                    )}
                                </button>
                            </>
                        ) : (
                            <button onClick={handlePrintReport} className="btn-primary flex items-center gap-2 px-4 py-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                                พิมพ์รายงาน
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex justify-center p-4">

                {viewMode === 'infographic' && (
                    <div ref={infographicRef}
                        className={`relative overflow-hidden shadow-2xl ${orientation === 'vertical' ? 'w-[450px]' : 'w-[800px]'}`}
                        style={{
                            background: 'linear-gradient(135deg, #020617 0%, #172554 100%)',
                            borderRadius: '24px',
                            fontFamily: "'Prompt', 'Sarabun', sans-serif",
                            padding: '40px',
                        }}
                    >
                        {/* Background Decoration */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -ml-32 -mb-32"></div>

                        {/* Config Check for Official Badge */}
                        {isOfficial && (
                            <div className="absolute top-6 right-6 z-10">
                                <div className="border border-green-400 bg-green-500/20 text-green-300 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-[0_0_10px_rgba(74,222,128,0.3)]">
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                    OFFICIAL RESULT
                                </div>
                            </div>
                        )}

                        {/* Header */}
                        <div className="relative z-10 flex flex-col items-center justify-center text-center mb-8">
                            <div className="w-20 h-20 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm mb-4 border border-white/20 shadow-lg">
                                <img src="https://upload.wikimedia.org/wikipedia/commons/9/9f/RSL001.png"
                                    alt="logo" className="w-16 h-16 object-contain" crossOrigin="anonymous" />
                            </div>
                            <h2 className="text-2xl font-bold text-white leading-tight mb-1 drop-shadow-lg">
                                {configData?.electionTitle || 'ประกาศผลการเลือกตั้ง'}
                            </h2>
                            <p className="text-slate-300 font-light">
                                {configData?.schoolName || 'โรงเรียนรัตนโกสินทร์สมโภชลาดกระบัง'}
                            </p>
                        </div>

                        {/* Stats Row */}
                        {summary && (
                            <div className="relative z-10 grid grid-cols-3 gap-3 mb-8">
                                <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center backdrop-blur-sm">
                                    <div className="text-2xl font-bold text-blue-400">{summary.totalEligible.toLocaleString()}</div>
                                    <div className="text-[10px] text-slate-400 uppercase tracking-wider">ผู้มีสิทธิ์</div>
                                </div>
                                <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center backdrop-blur-sm">
                                    <div className="text-2xl font-bold text-green-400">{summary.totalSignatures.toLocaleString()}</div>
                                    <div className="text-[10px] text-slate-400 uppercase tracking-wider">มาใช้สิทธิ์</div>
                                </div>
                                <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center backdrop-blur-sm">
                                    <div className="text-2xl font-bold text-amber-400">{summary.turnoutPercent}%</div>
                                    <div className="text-[10px] text-slate-400 uppercase tracking-wider">คิดเป็นร้อยละ</div>
                                </div>
                            </div>
                        )}

                        {/* Candidates List */}
                        <div className={`relative z-10 space-y-4 ${orientation === 'horizontal' ? 'grid grid-cols-2 gap-4 space-y-0' : ''}`}>
                            {sorted.map((c, i) => {
                                const votes = c.officialVotes > 0 ? c.officialVotes : c.liveVotes;
                                const widthPercent = maxVotes > 0 ? (votes / maxVotes) * 100 : 0;
                                const percent = totalVotes > 0 ? ((votes / totalVotes) * 100).toFixed(1) : '0';

                                return (
                                    <div key={c.candidateId} className="relative">
                                        <div className="flex items-center gap-4 relative z-10 mb-2">
                                            {/* Rank Badge */}
                                            <div className="absolute -left-2 -top-2 w-6 h-6 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center text-xs font-bold text-white z-20 shadow-md">
                                                {i + 1}
                                            </div>

                                            {/* Photo (Portrait) */}
                                            <div className="relative flex-shrink-0">
                                                {c.photoUrl ? (
                                                    <img src={c.photoUrl} alt="" className="w-14 h-18 rounded-lg object-cover border-2 shadow-lg"
                                                        style={{ borderColor: c.themeColor, objectPosition: 'center 20%' }} crossOrigin="anonymous" />
                                                ) : (
                                                    <div className="w-14 h-18 rounded-lg flex items-center justify-center text-white text-lg font-bold border-2 shadow-lg"
                                                        style={{ background: c.themeColor, borderColor: c.themeColor }}>
                                                        {c.candidateNumber}
                                                    </div>
                                                )}
                                                {/* Number Badge */}
                                                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white text-slate-900 flex items-center justify-center text-xs font-bold border-2 border-slate-900">
                                                    {c.candidateNumber}
                                                </div>
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="text-base font-bold text-white truncate">{c.candidateName}</div>
                                                <div className="text-xs text-slate-400 truncate">พรรค {c.partyName}</div>
                                            </div>

                                            <div className="text-right">
                                                <div className="text-xl font-bold" style={{ color: c.themeColor }}>{votes.toLocaleString()}</div>
                                                <div className="text-xs text-slate-500">{percent}%</div>
                                            </div>
                                        </div>

                                        {/* Bar */}
                                        <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                                            <div className="h-full rounded-full transition-all duration-1000 ease-out"
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
                        <div className="relative z-10 mt-8 pt-4 border-t border-white/10 flex justify-between items-center text-[10px] text-slate-500">
                            <div className="font-bold">
                                SC.RSL.68
                            </div>
                            <div>
                                ข้อมูล ณ {new Date().toLocaleDateString('th-TH')} {new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>
                    </div>
                )}

                {/* REPORT VIEW (A4 PDF Style) */}
                {viewMode === 'report' && (
                    <div ref={reportRef} className="w-[210mm] min-h-[297mm] bg-white text-black p-[20mm] shadow-xl print:shadow-none print:w-full">
                        {/* Report Header */}
                        <div className="text-center mb-8 border-b-2 border-black pb-4">
                            <div className="flex items-center justify-center gap-3 mb-2">
                                <img src="https://upload.wikimedia.org/wikipedia/commons/9/9f/RSL001.png" alt="logo" className="w-16 h-16" />
                            </div>
                            <h1 className="text-2xl font-bold mb-1">{configData?.electionTitle}</h1>
                            <h2 className="text-lg text-slate-700">{configData?.schoolName}</h2>
                            <div className="text-sm text-slate-500 mt-2">
                                รายงานผลการนับคะแนน{isOfficial ? 'อย่างเป็นทางการ (Official)' : 'เบื้องต้น (Unofficial)'}
                            </div>
                        </div>

                        {/* Summary Table */}
                        <div className="mb-8">
                            <h3 className="text-lg font-bold mb-2 border-l-4 border-black pl-2">สรุปภาพรวม</h3>
                            <table className="w-full border-collapse border border-slate-300 text-sm">
                                <tbody>
                                    <tr>
                                        <td className="border border-slate-300 p-2 bg-slate-50 font-bold w-1/3">วันที่ออกรายงาน</td>
                                        <td className="border border-slate-300 p-2">{new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-slate-300 p-2 bg-slate-50 font-bold">หน่วยเลือกตั้งที่ส่งผลแล้ว</td>
                                        <td className="border border-slate-300 p-2">
                                            {summary?.unitsSubmitted} / {summary?.totalUnits} หน่วย ({summary && summary.totalUnits > 0 ? ((summary.unitsSubmitted / summary.totalUnits) * 100).toFixed(1) : 0}%)
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="border border-slate-300 p-2 bg-slate-50 font-bold">ผู้มีสิทธิ์เลือกตั้งทั้งหมด</td>
                                        <td className="border border-slate-300 p-2">{summary?.totalEligible.toLocaleString()} คน</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-slate-300 p-2 bg-slate-50 font-bold">ผู้มาใช้สิทธิ์ (Turnout)</td>
                                        <td className="border border-slate-300 p-2">
                                            {summary?.totalSignatures.toLocaleString()} คน ({summary?.turnoutPercent}%)
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Results Table */}
                        <div className="mb-8">
                            <h3 className="text-lg font-bold mb-2 border-l-4 border-black pl-2">ผลการนับคะแนน</h3>
                            <table className="w-full border-collapse border border-slate-300 text-sm">
                                <thead>
                                    <tr className="bg-slate-100">
                                        <th className="border border-slate-300 p-3 text-center w-16">อันดับ</th>
                                        <th className="border border-slate-300 p-3 text-center w-16">หมายเลข</th>
                                        <th className="border border-slate-300 p-3 text-left">ชื่อ-นามสกุล</th>
                                        <th className="border border-slate-300 p-3 text-left">สังกัดพรรค</th>
                                        <th className="border border-slate-300 p-3 text-right">คะแนนรวม</th>
                                        <th className="border border-slate-300 p-3 text-right w-24">ร้อยละ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sorted.map((c, i) => {
                                        const votes = c.officialVotes > 0 ? c.officialVotes : c.liveVotes;
                                        const percent = totalVotes > 0 ? ((votes / totalVotes) * 100).toFixed(2) : '0';
                                        return (
                                            <tr key={c.candidateId} className={i === 0 ? "bg-yellow-50 font-semibold" : ""}>
                                                <td className="border border-slate-300 p-2 text-center">{i + 1}</td>
                                                <td className="border border-slate-300 p-2 text-center">{c.candidateNumber}</td>
                                                <td className="border border-slate-300 p-2">{c.candidateName} {i === 0 && '👑'}</td>
                                                <td className="border border-slate-300 p-2">{c.partyName}</td>
                                                <td className="border border-slate-300 p-2 text-right">{votes.toLocaleString()}</td>
                                                <td className="border border-slate-300 p-2 text-right">{percent}%</td>
                                            </tr>
                                        );
                                    })}
                                    {/* No Vote & Void */}
                                    {summary && (
                                        <>
                                            <tr className="bg-slate-50 text-slate-600 italic">
                                                <td className="border border-slate-300 p-2 text-center">-</td>
                                                <td className="border border-slate-300 p-2 text-center">-</td>
                                                <td className="border border-slate-300 p-2">ไม่ประสงค์ลงคะแนน (No Vote)</td>
                                                <td className="border border-slate-300 p-2">-</td>
                                                <td className="border border-slate-300 p-2 text-right">
                                                    {(summary.totalOfficialNoVote || summary.totalLiveNoVote).toLocaleString()}
                                                </td>
                                                <td className="border border-slate-300 p-2 text-right">-</td>
                                            </tr>
                                            <tr className="bg-slate-50 text-slate-600 italic">
                                                <td className="border border-slate-300 p-2 text-center">-</td>
                                                <td className="border border-slate-300 p-2 text-center">-</td>
                                                <td className="border border-slate-300 p-2">บัตรเสีย (Void)</td>
                                                <td className="border border-slate-300 p-2">-</td>
                                                <td className="border border-slate-300 p-2 text-right">
                                                    {(summary.totalOfficialVoid || summary.totalLiveVoid).toLocaleString()}
                                                </td>
                                                <td className="border border-slate-300 p-2 text-right">-</td>
                                            </tr>
                                        </>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Signatures */}
                        <div className="mt-16 flex justify-between text-center break-inside-avoid">
                            <div className="w-1/3">
                                <div className="border-b border-black mb-2 h-8"></div>
                                <div className="text-sm">(__________________________)</div>
                                <div className="font-bold text-sm mt-1">ประธานกรรมการการเลือกตั้ง</div>
                            </div>
                            <div className="w-1/3">
                                <div className="border-b border-black mb-2 h-8"></div>
                                <div className="text-sm">(__________________________)</div>
                                <div className="font-bold text-sm mt-1">ผู้อำนวยการโรงเรียน</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
