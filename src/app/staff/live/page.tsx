'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface Candidate {
    id: number; number: number; name: string; partyName: string; photoUrl: string | null; themeColor: string;
}
interface PollingUnit {
    id: number; name: string; grade: string; totalEligible: number; ballotsIssued: number;
}
interface Tally {
    id: number; pollingUnitId: number; candidateId: number | null; tallyType: string; count: number;
    candidate: Candidate | null;
}

export default function LiveTallyPage() {
    const [session, setSession] = useState<{ name: string } | null>(null);
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [units, setUnits] = useState<PollingUnit[]>([]);
    const [selectedUnit, setSelectedUnit] = useState<number | null>(null);
    const [tallies, setTallies] = useState<Tally[]>([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState<string | null>(null);
    const router = useRouter();

    const checkSession = useCallback(async () => {
        const res = await fetch('/api/auth/me');
        if (!res.ok) { router.push('/login'); return; }
        const data = await res.json();
        setSession(data.user);
        setLoading(false);
    }, [router]);

    const fetchData = useCallback(async () => {
        const [candRes, unitRes] = await Promise.all([
            fetch('/api/admin/candidates'), fetch('/api/admin/units'),
        ]);
        setCandidates(await candRes.json());
        setUnits(await unitRes.json());
    }, []);

    const fetchTallies = useCallback(async () => {
        if (!selectedUnit) return;
        const res = await fetch(`/api/staff/live?unitId=${selectedUnit}`);
        if (res.ok) setTallies(await res.json());
    }, [selectedUnit]);

    useEffect(() => { checkSession(); }, [checkSession]);
    useEffect(() => { if (session) fetchData(); }, [session, fetchData]);
    useEffect(() => { if (selectedUnit) fetchTallies(); }, [selectedUnit, fetchTallies]);

    // Auto-refresh every 3 seconds
    useEffect(() => {
        if (!selectedUnit) return;
        const interval = setInterval(fetchTallies, 3000);
        return () => clearInterval(interval);
    }, [selectedUnit, fetchTallies]);

    const handleTally = async (candidateId: number | null, tallyType: string, delta: number) => {
        if (!selectedUnit) return;
        const key = `${candidateId}-${tallyType}-${delta}`;
        setUpdating(key);

        try {
            await fetch('/api/staff/live', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pollingUnitId: selectedUnit,
                    candidateId,
                    tallyType,
                    delta,
                }),
            });
            await fetchTallies();
        } catch (err) {
            console.error('Tally error:', err);
        } finally {
            setUpdating(null);
        }
    };

    const getCount = (candidateId: number | null, tallyType: string) => {
        const tally = tallies.find((t) =>
            t.candidateId === candidateId && t.tallyType === tallyType
        );
        return tally?.count || 0;
    };

    const selectedUnitData = units.find((u) => u.id === selectedUnit);
    const totalCandidateVotes = candidates.reduce((sum, c) => sum + getCount(c.id, 'CANDIDATE'), 0);
    const noVoteCount = getCount(null, 'NO_VOTE');
    const voidCount = getCount(null, 'VOID');
    const totalCounted = totalCandidateVotes + noVoteCount + voidCount;
    const progressPercent = selectedUnitData && selectedUnitData.totalEligible > 0
        ? Math.min(100, (totalCounted / selectedUnitData.totalEligible) * 100)
        : 0;

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-xl text-white">กำลังโหลด...</div>
        </div>
    );

    return (
        <div className="min-h-screen p-4 md:p-6">
            {/* Header */}
            <div className="max-w-4xl mx-auto mb-6">
                <div className="glass-card p-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/9/9f/RSL001.png" alt="logo" className="w-10 h-10" />
                        <div>
                            <h1 className="text-lg font-bold text-white">นับคะแนนสด (เรียลไทม์)</h1>
                            <p className="text-xs text-slate-400">สวัสดี, {session?.name}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <a href="/staff/submit" className="btn-primary text-sm py-2 px-4">ยืนยันทางการ</a>
                        <a href="/admin" className="text-sm text-slate-300 hover:text-white px-3 py-1 rounded-lg hover:bg-white/10">กลับเมนู</a>
                        <button onClick={handleLogout} className="btn-danger text-sm py-2 px-3">ออก</button>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto">
                {/* Unit Selection */}
                <div className="glass-card p-4 mb-6">
                    <label className="block text-sm font-medium text-slate-300 mb-2">เลือกหน่วยเลือกตั้ง</label>
                    <select
                        value={selectedUnit || ''}
                        onChange={(e) => setSelectedUnit(parseInt(e.target.value) || null)}
                        className="input-field text-lg"
                    >
                        <option value="">-- เลือกหน่วย --</option>
                        {units.map((u) => (
                            <option key={u.id} value={u.id}>{u.name} ({u.grade})</option>
                        ))}
                    </select>
                </div>

                {/* Real-time Unofficial Banner */}
                {selectedUnit && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-red-500 pulse-live"></span>
                            <span className="text-red-300 text-sm font-medium">
                                ขณะนี้กำลังส่งคะแนนแบบเรียลไทม์ (ไม่เป็นทางการ)
                            </span>
                        </div>
                    </div>
                )}

                {selectedUnit && selectedUnitData && (
                    <div className="fade-in space-y-4">
                        {/* Progress Summary */}
                        <div className="glass-card p-5">
                            <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
                                <div>
                                    <span className="text-sm text-slate-400">หน่วย</span>
                                    <h2 className="text-xl font-bold text-white">{selectedUnitData.name}</h2>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm text-slate-400">ความคืบหน้า</div>
                                    <div className="text-2xl font-bold text-amber-400">{progressPercent.toFixed(1)}%</div>
                                </div>
                            </div>
                            <div className="progress-bar mb-3">
                                <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }} />
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                                <div className="bg-white/5 rounded-lg p-2">
                                    <div className="text-lg font-bold text-green-400">{totalCandidateVotes}</div>
                                    <div className="text-xs text-slate-400">คะแนนผู้สมัคร</div>
                                </div>
                                <div className="bg-white/5 rounded-lg p-2">
                                    <div className="text-lg font-bold text-yellow-400">{noVoteCount}</div>
                                    <div className="text-xs text-slate-400">ไม่ประสงค์</div>
                                </div>
                                <div className="bg-white/5 rounded-lg p-2">
                                    <div className="text-lg font-bold text-red-400">{voidCount}</div>
                                    <div className="text-xs text-slate-400">บัตรเสีย</div>
                                </div>
                                <div className="bg-white/5 rounded-lg p-2">
                                    <div className="text-lg font-bold text-blue-400">{totalCounted}</div>
                                    <div className="text-xs text-slate-400">รวมนับแล้ว</div>
                                </div>
                            </div>
                        </div>

                        {/* Candidate Tally Cards */}
                        {candidates.map((candidate) => {
                            const count = getCount(candidate.id, 'CANDIDATE');
                            return (
                                <div key={candidate.id} className="glass-card p-4" style={{ borderLeft: `4px solid ${candidate.themeColor}` }}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3 flex-1">
                                            {candidate.photoUrl ? (
                                                <img src={candidate.photoUrl} alt={candidate.name} className="w-12 h-12 rounded-full object-cover border-2" style={{ borderColor: candidate.themeColor }} />
                                            ) : (
                                                <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-xl font-bold" style={{ background: candidate.themeColor }}>
                                                    {candidate.number}
                                                </div>
                                            )}
                                            <div className="flex-1">
                                                <div className="font-bold text-white">หมายเลข {candidate.number}</div>
                                                <div className="text-sm text-slate-300">{candidate.name}</div>
                                                <div className="text-xs text-slate-400">{candidate.partyName}</div>
                                            </div>
                                            <div className="score-display text-4xl md:text-5xl">{count}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 mt-3 justify-end">
                                        <button onClick={() => handleTally(candidate.id, 'CANDIDATE', -1)}
                                            className="tally-btn tally-btn-minus text-lg" disabled={updating !== null || count === 0}>-1</button>
                                        <button onClick={() => handleTally(candidate.id, 'CANDIDATE', 1)}
                                            className="tally-btn tally-btn-plus text-lg" disabled={updating !== null}>+1</button>
                                        <button onClick={() => handleTally(candidate.id, 'CANDIDATE', 5)}
                                            className="tally-btn tally-btn-plus text-base" disabled={updating !== null}>+5</button>
                                    </div>
                                </div>
                            );
                        })}

                        {/* No Vote & Void */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="glass-card p-4" style={{ borderLeft: '4px solid #eab308' }}>
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <div className="font-bold text-yellow-300">ไม่ประสงค์ลงคะแนน</div>
                                    </div>
                                    <div className="text-3xl font-bold text-yellow-400">{noVoteCount}</div>
                                </div>
                                <div className="flex gap-2 justify-end">
                                    <button onClick={() => handleTally(null, 'NO_VOTE', -1)}
                                        className="tally-btn tally-btn-minus text-lg" disabled={updating !== null || noVoteCount === 0}>-1</button>
                                    <button onClick={() => handleTally(null, 'NO_VOTE', 1)}
                                        className="tally-btn tally-btn-plus text-lg" disabled={updating !== null}>+1</button>
                                    <button onClick={() => handleTally(null, 'NO_VOTE', 5)}
                                        className="tally-btn tally-btn-plus text-base" disabled={updating !== null}>+5</button>
                                </div>
                            </div>

                            <div className="glass-card p-4" style={{ borderLeft: '4px solid #ef4444' }}>
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <div className="font-bold text-red-300">บัตรเสีย</div>
                                    </div>
                                    <div className="text-3xl font-bold text-red-400">{voidCount}</div>
                                </div>
                                <div className="flex gap-2 justify-end">
                                    <button onClick={() => handleTally(null, 'VOID', -1)}
                                        className="tally-btn tally-btn-minus text-lg" disabled={updating !== null || voidCount === 0}>-1</button>
                                    <button onClick={() => handleTally(null, 'VOID', 1)}
                                        className="tally-btn tally-btn-plus text-lg" disabled={updating !== null}>+1</button>
                                    <button onClick={() => handleTally(null, 'VOID', 5)}
                                        className="tally-btn tally-btn-plus text-base" disabled={updating !== null}>+5</button>
                                </div>
                            </div>
                        </div>

                        {/* Live Indicator */}
                        <div className="text-center text-sm text-slate-400 flex items-center justify-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-red-500 pulse-live inline-block"></span>
                            อัปเดตอัตโนมัติทุก 3 วินาที
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
