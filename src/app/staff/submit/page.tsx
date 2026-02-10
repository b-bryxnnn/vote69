'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useHeartbeat } from '@/hooks/useHeartbeat';

interface Candidate {
    id: number; number: number; name: string; partyName: string; photoUrl: string | null; themeColor: string;
}
interface PollingUnit {
    id: number; name: string; grade: string; totalEligible: number; ballotsIssued: number;
}

export default function OfficialSubmitPage() {
    const [session, setSession] = useState<{ username: string; name: string } | null>(null);
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [units, setUnits] = useState<PollingUnit[]>([]);
    const [selectedUnit, setSelectedUnit] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Form state
    const [totalSignatures, setTotalSignatures] = useState('');
    const [ballotsIssued, setBallotsIssued] = useState('');
    const [ballotsRemaining, setBallotsRemaining] = useState('');
    const [noVote, setNoVote] = useState('');
    const [voidBallots, setVoidBallots] = useState('');
    const [votes, setVotes] = useState<Record<number, string>>({});
    const [reason, setReason] = useState('');
    const [photoFile, setPhotoFile] = useState<File | null>(null);

    // Status
    const [currentRound, setCurrentRound] = useState(0);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const router = useRouter();

    // Send heartbeat when active
    useHeartbeat(!!session);

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

    const fetchSubmissionStatus = useCallback(async () => {
        if (!selectedUnit) return;
        const res = await fetch(`/api/staff/submit?unitId=${selectedUnit}`);
        if (res.ok) {
            const data = await res.json();
            setCurrentRound(data.currentRound || 0);
        }
    }, [selectedUnit]);

    useEffect(() => { checkSession(); }, [checkSession]);
    useEffect(() => { if (session) fetchData(); }, [session, fetchData]);
    useEffect(() => {
        if (selectedUnit) {
            fetchSubmissionStatus();
            // Reset form
            setTotalSignatures('');
            setBallotsIssued('');
            setBallotsRemaining('');
            setNoVote('');
            setVoidBallots('');
            setVotes({});
            setReason('');
            setPhotoFile(null);
            setMessage('');
            setError('');
        }
    }, [selectedUnit, fetchSubmissionStatus]);

    // Validation
    const totalCandidateVotes = candidates.reduce((sum, c) => sum + (parseInt(votes[c.id] || '0') || 0), 0);
    const totalVotesCounted = totalCandidateVotes + (parseInt(noVote || '0') || 0) + (parseInt(voidBallots || '0') || 0);
    const signaturesNum = parseInt(totalSignatures || '0') || 0;
    const isBalanced = totalVotesCounted === signaturesNum && signaturesNum > 0;
    const difference = Math.abs(totalVotesCounted - signaturesNum);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');
        setMessage('');

        try {
            // Upload photo if exists
            let photoUrl = null;
            if (photoFile) {
                const formData = new FormData();
                formData.append('file', photoFile);
                const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
                if (uploadRes.ok) {
                    const uploadData = await uploadRes.json();
                    photoUrl = uploadData.url;
                }
            }

            const res = await fetch('/api/staff/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pollingUnitId: selectedUnit,
                    totalSignatures: signaturesNum,
                    ballotsIssued: parseInt(ballotsIssued || '0') || 0,
                    ballotsRemaining: parseInt(ballotsRemaining || '0') || 0,
                    totalNoVote: parseInt(noVote || '0') || 0,
                    totalVoidBallots: parseInt(voidBallots || '0') || 0,
                    votes: candidates.map((c) => ({
                        candidateId: c.id,
                        voteCount: parseInt(votes[c.id] || '0') || 0,
                    })),
                    photoEvidence: photoUrl,
                    reason: reason || undefined,
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                setError(data.error || 'เกิดข้อผิดพลาด');
            } else {
                setMessage(data.message || 'ส่งคะแนนสำเร็จ');
                setCurrentRound(data.round);
            }
        } catch {
            setError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
        } finally {
            setSubmitting(false);
        }
    };

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-xl text-white">กำลังโหลด...</div>
        </div>
    );

    const selectedUnitData = units.find((u) => u.id === selectedUnit);

    return (
        <div className="min-h-screen p-4 md:p-6">
            {/* Header */}
            <div className="max-w-3xl mx-auto mb-6">
                <div className="glass-card p-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/9/9f/RSL001.png" alt="logo" className="w-10 h-10" />
                        <div>
                            <h1 className="text-lg font-bold text-white">ยืนยันคะแนนทางการ</h1>
                            <p className="text-xs text-slate-400">สวัสดี, {session?.name}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <a href="/staff/live" className="btn-primary text-sm py-2 px-4">นับคะแนนสด</a>
                        <a href="/admin" className="text-sm text-slate-300 hover:text-white px-3 py-1 rounded-lg hover:bg-white/10">กลับเมนู</a>
                        <button onClick={handleLogout} className="btn-danger text-sm py-2 px-3">ออก</button>
                    </div>
                </div>
            </div>

            <div className="max-w-3xl mx-auto">
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

                {selectedUnit && selectedUnitData && (
                    <form onSubmit={handleSubmit} className="fade-in space-y-4">
                        {/* Round Notice */}
                        {currentRound > 0 && (
                            <div className="bg-amber-500/20 border border-amber-500/30 rounded-xl p-4 text-amber-200">
                                <div className="font-bold">หน่วยนี้ส่งคะแนนแล้ว (รอบที่ {currentRound})</div>
                                <div className="text-sm mt-1">การส่งครั้งนี้จะเป็นรอบที่ {currentRound + 1} — กรุณาระบุเหตุผลการแก้ไข</div>
                            </div>
                        )}

                        {/* Ballot Info */}
                        <div className="glass-card p-5">
                            <h3 className="text-lg font-semibold text-white mb-4">ข้อมูลบัตรเลือกตั้ง</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm text-slate-300 mb-1">จำนวนผู้มาใช้สิทธิ์ *</label>
                                    <input type="number" value={totalSignatures} onChange={(e) => setTotalSignatures(e.target.value)}
                                        className="input-field" placeholder="0" required min="0" />
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-300 mb-1">บัตรที่เบิกมา</label>
                                    <input type="number" value={ballotsIssued} onChange={(e) => setBallotsIssued(e.target.value)}
                                        className="input-field" placeholder="0" min="0" />
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-300 mb-1">บัตรที่เหลือ</label>
                                    <input type="number" value={ballotsRemaining} onChange={(e) => setBallotsRemaining(e.target.value)}
                                        className="input-field" placeholder="0" min="0" />
                                </div>
                            </div>
                        </div>

                        {/* Candidate Votes */}
                        <div className="glass-card p-5">
                            <h3 className="text-lg font-semibold text-white mb-4">คะแนนผู้สมัคร</h3>
                            <div className="space-y-3">
                                {candidates.map((c) => (
                                    <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5" style={{ borderLeft: `3px solid ${c.themeColor}` }}>
                                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ background: c.themeColor }}>
                                            {c.number}
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-sm font-medium text-white">{c.name}</div>
                                            <div className="text-xs text-slate-400">{c.partyName}</div>
                                        </div>
                                        <input
                                            type="number"
                                            value={votes[c.id] || ''}
                                            onChange={(e) => setVotes({ ...votes, [c.id]: e.target.value })}
                                            className="input-field w-24 text-center text-lg font-bold"
                                            placeholder="0"
                                            min="0"
                                            required
                                        />
                                    </div>
                                ))}

                                <div className="flex items-center gap-3 p-3 rounded-xl bg-yellow-500/10" style={{ borderLeft: '3px solid #eab308' }}>
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-yellow-500 text-white text-xs font-bold">N/A</div>
                                    <div className="flex-1">
                                        <div className="text-sm font-medium text-yellow-300">ไม่ประสงค์ลงคะแนน</div>
                                    </div>
                                    <input type="number" value={noVote} onChange={(e) => setNoVote(e.target.value)}
                                        className="input-field w-24 text-center text-lg font-bold" placeholder="0" min="0" />
                                </div>

                                <div className="flex items-center gap-3 p-3 rounded-xl bg-red-500/10" style={{ borderLeft: '3px solid #ef4444' }}>
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-red-500 text-white text-xs font-bold">VOID</div>
                                    <div className="flex-1">
                                        <div className="text-sm font-medium text-red-300">บัตรเสีย</div>
                                    </div>
                                    <input type="number" value={voidBallots} onChange={(e) => setVoidBallots(e.target.value)}
                                        className="input-field w-24 text-center text-lg font-bold" placeholder="0" min="0" />
                                </div>
                            </div>
                        </div>

                        {/* Validation Box */}
                        <div className={`glass-card p-5 ${isBalanced ? 'border-green-500/50' : signaturesNum > 0 ? 'border-red-500/50' : 'border-white/10'} border`}>
                            <h3 className="text-lg font-semibold text-white mb-3">ตรวจสอบความถูกต้อง</h3>
                            <div className="grid grid-cols-2 gap-4 text-center">
                                <div>
                                    <div className="text-sm text-slate-400">ผู้มาใช้สิทธิ์</div>
                                    <div className="text-3xl font-bold text-blue-400">{signaturesNum}</div>
                                </div>
                                <div>
                                    <div className="text-sm text-slate-400">ผลรวมคะแนนทั้งหมด</div>
                                    <div className={`text-3xl font-bold ${isBalanced ? 'text-green-400' : 'text-red-400'}`}>{totalVotesCounted}</div>
                                </div>
                            </div>
                            {signaturesNum > 0 && !isBalanced && (
                                <div className="mt-3 bg-red-500/20 border border-red-500/30 rounded-lg p-3 text-red-200 text-center">
                                    จำนวนไม่ตรงกัน ต่างกัน {difference} — กรุณานับใหม่
                                </div>
                            )}
                            {isBalanced && (
                                <div className="mt-3 bg-green-500/20 border border-green-500/30 rounded-lg p-3 text-green-200 text-center">
                                    จำนวนตรงกัน
                                </div>
                            )}
                        </div>

                        {/* Photo Evidence */}
                        <div className="glass-card p-5">
                            <h3 className="text-lg font-semibold text-white mb-3">รูปถ่ายหลักฐาน</h3>
                            <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                                className="input-field"
                            />
                            {photoFile && (
                                <p className="text-sm text-green-400 mt-2">เลือกไฟล์แล้ว: {photoFile.name}</p>
                            )}
                        </div>

                        {/* Reason for Recount */}
                        {currentRound > 0 && (
                            <div className="glass-card p-5">
                                <h3 className="text-lg font-semibold text-amber-300 mb-3">เหตุผลในการแก้ไข (จำเป็น)</h3>
                                <textarea
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    className="input-field min-h-[80px]"
                                    placeholder="เช่น พบบัตรนับผิด 1 ใบ..."
                                    required
                                />
                            </div>
                        )}

                        {/* Messages */}
                        {error && (
                            <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 text-red-200 text-center">
                                {error}
                            </div>
                        )}
                        {message && (
                            <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-4 text-green-200 text-center">
                                {message}
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={!isBalanced || submitting}
                            className="btn-success w-full text-lg py-4 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {submitting ? 'กำลังส่ง...' : currentRound > 0 ? `ส่งคะแนนรอบที่ ${currentRound + 1}` : 'ยืนยันส่งคะแนนทางการ'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
