'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface Candidate {
    id: number; number: number; name: string; partyName: string; photoUrl: string | null; themeColor: string;
}
interface PollingUnit {
    id: number; name: string; grade: string; totalEligible: number; ballotsIssued: number;
}
interface User {
    id: number; username: string; role: string; name: string;
}
interface Config {
    publicViewEnabled: boolean; electionTitle: string; schoolName: string;
}
interface SessionUser {
    userId: number; username: string; role: string; name: string;
}

export default function AdminPage() {
    const [session, setSession] = useState<SessionUser | null>(null);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [units, setUnits] = useState<PollingUnit[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [config, setConfig] = useState<Config | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    // Forms
    const [candidateForm, setCandidateForm] = useState({ number: '', name: '', partyName: '', photoUrl: '', themeColor: '#3B82F6' });
    const [unitForm, setUnitForm] = useState({ name: '', grade: '', totalEligible: '', ballotsIssued: '' });
    const [userForm, setUserForm] = useState({ username: '', password: '', name: '', role: 'STAFF' });
    const [editingCandidate, setEditingCandidate] = useState<number | null>(null);
    const [editingUnit, setEditingUnit] = useState<number | null>(null);

    const checkSession = useCallback(async () => {
        const res = await fetch('/api/auth/me');
        if (!res.ok) { router.push('/login'); return; }
        const data = await res.json();
        if (data.user.role !== 'ADMIN') { router.push('/staff/live'); return; }
        setSession(data.user);
        setLoading(false);
    }, [router]);

    const fetchAll = useCallback(async () => {
        const [candRes, unitRes, userRes, configRes] = await Promise.all([
            fetch('/api/admin/candidates'), fetch('/api/admin/units'),
            fetch('/api/admin/users'), fetch('/api/admin/config'),
        ]);
        setCandidates(await candRes.json());
        setUnits(await unitRes.json());
        setUsers(await userRes.json());
        setConfig(await configRes.json());
    }, []);

    useEffect(() => { checkSession(); }, [checkSession]);
    useEffect(() => { if (session) fetchAll(); }, [session, fetchAll]);

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
    };

    const handleTogglePublic = async () => {
        if (!config) return;
        const res = await fetch('/api/admin/config', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ publicViewEnabled: !config.publicViewEnabled }),
        });
        if (res.ok) setConfig(await res.json());
    };

    const handleAddCandidate = async (e: React.FormEvent) => {
        e.preventDefault();
        const method = editingCandidate ? 'PUT' : 'POST';
        const url = editingCandidate ? `/api/admin/candidates/${editingCandidate}` : '/api/admin/candidates';
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                number: parseInt(candidateForm.number),
                name: candidateForm.name,
                partyName: candidateForm.partyName,
                photoUrl: candidateForm.photoUrl || null,
                themeColor: candidateForm.themeColor,
            }),
        });
        if (res.ok) {
            setCandidateForm({ number: '', name: '', partyName: '', photoUrl: '', themeColor: '#3B82F6' });
            setEditingCandidate(null);
            fetchAll();
        }
    };

    const handleDeleteCandidate = async (id: number) => {
        if (!confirm('คุณต้องการลบผู้สมัครนี้ใช่หรือไม่?')) return;
        await fetch(`/api/admin/candidates/${id}`, { method: 'DELETE' });
        fetchAll();
    };

    const handleEditCandidate = (c: Candidate) => {
        setEditingCandidate(c.id);
        setCandidateForm({
            number: c.number.toString(), name: c.name, partyName: c.partyName,
            photoUrl: c.photoUrl || '', themeColor: c.themeColor,
        });
        setActiveTab('candidates');
    };

    const handleAddUnit = async (e: React.FormEvent) => {
        e.preventDefault();
        const method = editingUnit ? 'PUT' : 'POST';
        const url = editingUnit ? `/api/admin/units/${editingUnit}` : '/api/admin/units';
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: unitForm.name, grade: unitForm.grade,
                totalEligible: parseInt(unitForm.totalEligible) || 0,
                ballotsIssued: parseInt(unitForm.ballotsIssued) || 0,
            }),
        });
        if (res.ok) {
            setUnitForm({ name: '', grade: '', totalEligible: '', ballotsIssued: '' });
            setEditingUnit(null);
            fetchAll();
        }
    };

    const handleDeleteUnit = async (id: number) => {
        if (!confirm('คุณต้องการลบหน่วยเลือกตั้งนี้ใช่หรือไม่?')) return;
        await fetch(`/api/admin/units/${id}`, { method: 'DELETE' });
        fetchAll();
    };

    const handleEditUnit = (u: PollingUnit) => {
        setEditingUnit(u.id);
        setUnitForm({
            name: u.name, grade: u.grade,
            totalEligible: u.totalEligible.toString(), ballotsIssued: u.ballotsIssued.toString(),
        });
        setActiveTab('units');
    };

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await fetch('/api/admin/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userForm),
        });
        if (res.ok) {
            setUserForm({ username: '', password: '', name: '', role: 'STAFF' });
            fetchAll();
        }
    };

    const handleDeleteUser = async (id: number) => {
        if (!confirm('คุณต้องการลบผู้ใช้นี้ใช่หรือไม่?')) return;
        await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
        fetchAll();
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-xl text-white">⏳ กำลังโหลด...</div>
        </div>
    );

    const tabs = [
        { id: 'dashboard', label: '📊 ภาพรวม', icon: '' },
        { id: 'candidates', label: '👤 ผู้สมัคร', icon: '' },
        { id: 'units', label: '🏫 หน่วยเลือกตั้ง', icon: '' },
        { id: 'users', label: '👥 จัดการผู้ใช้', icon: '' },
    ];

    return (
        <div className="min-h-screen p-4 md:p-8">
            {/* Header */}
            <div className="max-w-7xl mx-auto mb-6">
                <div className="glass-card p-4 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/9/9f/RSL001.png" alt="logo" className="w-10 h-10" />
                        <div>
                            <h1 className="text-lg font-bold text-white">แผงควบคุม Admin</h1>
                            <p className="text-xs text-slate-400">สวัสดี, {session?.name}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <a href="/" className="text-sm text-slate-300 hover:text-white transition-colors">
                            📺 ดูกระดานคะแนน
                        </a>
                        <button onClick={handleLogout} className="btn-danger text-sm py-2 px-4">
                            ออกจากระบบ
                        </button>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="max-w-7xl mx-auto mb-6">
                <div className="flex flex-wrap gap-2">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === tab.id
                                    ? 'bg-white/20 text-white border border-white/20'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="max-w-7xl mx-auto">
                {/* Dashboard Tab */}
                {activeTab === 'dashboard' && (
                    <div className="fade-in space-y-6">
                        {/* Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="glass-card p-5 text-center">
                                <div className="text-3xl font-bold text-amber-400">{candidates.length}</div>
                                <div className="text-sm text-slate-400 mt-1">ผู้สมัคร</div>
                            </div>
                            <div className="glass-card p-5 text-center">
                                <div className="text-3xl font-bold text-blue-400">{units.length}</div>
                                <div className="text-sm text-slate-400 mt-1">หน่วยเลือกตั้ง</div>
                            </div>
                            <div className="glass-card p-5 text-center">
                                <div className="text-3xl font-bold text-green-400">{users.length}</div>
                                <div className="text-sm text-slate-400 mt-1">ผู้ใช้ในระบบ</div>
                            </div>
                            <div className="glass-card p-5 text-center">
                                <div className="text-3xl font-bold text-emerald-400">
                                    {units.reduce((s, u) => s + u.totalEligible, 0).toLocaleString()}
                                </div>
                                <div className="text-sm text-slate-400 mt-1">ผู้มีสิทธิ์เลือกตั้ง</div>
                            </div>
                        </div>

                        {/* Public View Toggle */}
                        <div className="glass-card p-6">
                            <h3 className="text-lg font-semibold text-white mb-4">🌐 การเปิดเผยผล</h3>
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={handleTogglePublic}
                                    className={`relative w-16 h-8 rounded-full transition-all duration-300 ${config?.publicViewEnabled ? 'bg-green-500' : 'bg-slate-600'
                                        }`}
                                >
                                    <div className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-all duration-300 ${config?.publicViewEnabled ? 'left-9' : 'left-1'
                                        }`} />
                                </button>
                                <span className={`font-medium ${config?.publicViewEnabled ? 'text-green-400' : 'text-slate-400'}`}>
                                    {config?.publicViewEnabled ? '✅ เปิดเผยผลแล้ว — ผู้ชมเห็นคะแนน' : '🔒 ปิดอยู่ — ผู้ชมยังไม่เห็นคะแนน'}
                                </span>
                            </div>
                        </div>

                        {/* Quick View */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="glass-card p-6">
                                <h3 className="text-lg font-semibold text-white mb-3">👤 ผู้สมัครในระบบ</h3>
                                {candidates.length === 0 ? (
                                    <p className="text-slate-400 text-sm">ยังไม่มีผู้สมัคร</p>
                                ) : (
                                    <div className="space-y-2">
                                        {candidates.map((c) => (
                                            <div key={c.id} className="flex items-center gap-3 p-2 rounded-lg bg-white/5">
                                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ background: c.themeColor }}>
                                                    {c.number}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium text-white">{c.name}</div>
                                                    <div className="text-xs text-slate-400">{c.partyName}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="glass-card p-6">
                                <h3 className="text-lg font-semibold text-white mb-3">🏫 หน่วยเลือกตั้ง</h3>
                                {units.length === 0 ? (
                                    <p className="text-slate-400 text-sm">ยังไม่มีหน่วยเลือกตั้ง</p>
                                ) : (
                                    <div className="space-y-1 max-h-60 overflow-y-auto">
                                        {units.map((u) => (
                                            <div key={u.id} className="flex items-center justify-between p-2 rounded-lg bg-white/5 text-sm">
                                                <span className="text-white">{u.name}</span>
                                                <span className="text-slate-400">{u.grade} · {u.totalEligible} คน</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Candidates Tab */}
                {activeTab === 'candidates' && (
                    <div className="fade-in space-y-6">
                        <div className="glass-card p-6">
                            <h3 className="text-lg font-semibold text-white mb-4">
                                {editingCandidate ? '✏️ แก้ไขผู้สมัคร' : '➕ เพิ่มผู้สมัคร'}
                            </h3>
                            <form onSubmit={handleAddCandidate} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm text-slate-300 mb-1">หมายเลข *</label>
                                    <input type="number" value={candidateForm.number} onChange={(e) => setCandidateForm({ ...candidateForm, number: e.target.value })}
                                        className="input-field" placeholder="เช่น 1" required />
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-300 mb-1">ชื่อ-นามสกุล *</label>
                                    <input type="text" value={candidateForm.name} onChange={(e) => setCandidateForm({ ...candidateForm, name: e.target.value })}
                                        className="input-field" placeholder="ชื่อผู้สมัคร" required />
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-300 mb-1">ชื่อพรรค *</label>
                                    <input type="text" value={candidateForm.partyName} onChange={(e) => setCandidateForm({ ...candidateForm, partyName: e.target.value })}
                                        className="input-field" placeholder="ชื่อพรรค" required />
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-300 mb-1">URL รูปภาพ</label>
                                    <input type="text" value={candidateForm.photoUrl} onChange={(e) => setCandidateForm({ ...candidateForm, photoUrl: e.target.value })}
                                        className="input-field" placeholder="https://..." />
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-300 mb-1">สีธีม</label>
                                    <div className="flex gap-2 items-center">
                                        <input type="color" value={candidateForm.themeColor} onChange={(e) => setCandidateForm({ ...candidateForm, themeColor: e.target.value })}
                                            className="w-12 h-10 rounded-lg cursor-pointer border-0" />
                                        <input type="text" value={candidateForm.themeColor} onChange={(e) => setCandidateForm({ ...candidateForm, themeColor: e.target.value })}
                                            className="input-field" />
                                    </div>
                                </div>
                                <div className="flex items-end gap-2">
                                    <button type="submit" className="btn-success">{editingCandidate ? 'บันทึก' : 'เพิ่ม'}</button>
                                    {editingCandidate && (
                                        <button type="button" onClick={() => { setEditingCandidate(null); setCandidateForm({ number: '', name: '', partyName: '', photoUrl: '', themeColor: '#3B82F6' }); }}
                                            className="btn-danger">ยกเลิก</button>
                                    )}
                                </div>
                            </form>
                        </div>

                        <div className="glass-card p-6">
                            <h3 className="text-lg font-semibold text-white mb-4">📋 รายชื่อผู้สมัคร ({candidates.length})</h3>
                            {candidates.length === 0 ? (
                                <p className="text-slate-400">ยังไม่มีผู้สมัคร</p>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {candidates.map((c) => (
                                        <div key={c.id} className="rounded-xl p-4 border border-white/10" style={{ background: `${c.themeColor}20` }}>
                                            <div className="flex items-center gap-3 mb-3">
                                                {c.photoUrl ? (
                                                    <img src={c.photoUrl} alt={c.name} className="w-14 h-14 rounded-full object-cover border-2" style={{ borderColor: c.themeColor }} />
                                                ) : (
                                                    <div className="w-14 h-14 rounded-full flex items-center justify-center text-white text-2xl font-bold" style={{ background: c.themeColor }}>
                                                        {c.number}
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="font-bold text-white">หมายเลข {c.number}</div>
                                                    <div className="text-sm text-white/80">{c.name}</div>
                                                    <div className="text-xs text-white/60">พรรค {c.partyName}</div>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleEditCandidate(c)} className="text-xs px-3 py-1 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors">✏️ แก้ไข</button>
                                                <button onClick={() => handleDeleteCandidate(c.id)} className="text-xs px-3 py-1 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-colors">🗑️ ลบ</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Units Tab */}
                {activeTab === 'units' && (
                    <div className="fade-in space-y-6">
                        <div className="glass-card p-6">
                            <h3 className="text-lg font-semibold text-white mb-4">
                                {editingUnit ? '✏️ แก้ไขหน่วยเลือกตั้ง' : '➕ เพิ่มหน่วยเลือกตั้ง'}
                            </h3>
                            <form onSubmit={handleAddUnit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                                <div>
                                    <label className="block text-sm text-slate-300 mb-1">ชื่อหน่วย *</label>
                                    <input type="text" value={unitForm.name} onChange={(e) => setUnitForm({ ...unitForm, name: e.target.value })}
                                        className="input-field" placeholder="เช่น ม.5/2" required />
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-300 mb-1">ระดับชั้น *</label>
                                    <select value={unitForm.grade} onChange={(e) => setUnitForm({ ...unitForm, grade: e.target.value })}
                                        className="input-field" required>
                                        <option value="">เลือกระดับชั้น</option>
                                        <option value="ม.1">ม.1</option>
                                        <option value="ม.2">ม.2</option>
                                        <option value="ม.3">ม.3</option>
                                        <option value="ม.4">ม.4</option>
                                        <option value="ม.5">ม.5</option>
                                        <option value="ม.6">ม.6</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-300 mb-1">ผู้มีสิทธิ์ (คน)</label>
                                    <input type="number" value={unitForm.totalEligible} onChange={(e) => setUnitForm({ ...unitForm, totalEligible: e.target.value })}
                                        className="input-field" placeholder="0" />
                                </div>
                                <div className="flex gap-2">
                                    <button type="submit" className="btn-success">{editingUnit ? 'บันทึก' : 'เพิ่ม'}</button>
                                    {editingUnit && (
                                        <button type="button" onClick={() => { setEditingUnit(null); setUnitForm({ name: '', grade: '', totalEligible: '', ballotsIssued: '' }); }}
                                            className="btn-danger">ยกเลิก</button>
                                    )}
                                </div>
                            </form>
                        </div>

                        <div className="glass-card p-6">
                            <h3 className="text-lg font-semibold text-white mb-4">📋 หน่วยเลือกตั้ง ({units.length})</h3>
                            {units.length === 0 ? (
                                <p className="text-slate-400">ยังไม่มีหน่วยเลือกตั้ง</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="text-slate-400 border-b border-white/10">
                                                <th className="text-left p-3">ชื่อหน่วย</th>
                                                <th className="text-left p-3">ระดับชั้น</th>
                                                <th className="text-right p-3">ผู้มีสิทธิ์</th>
                                                <th className="text-right p-3">จัดการ</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {units.map((u) => (
                                                <tr key={u.id} className="border-b border-white/5 hover:bg-white/5">
                                                    <td className="p-3 text-white font-medium">{u.name}</td>
                                                    <td className="p-3 text-slate-300">{u.grade}</td>
                                                    <td className="p-3 text-right text-slate-300">{u.totalEligible}</td>
                                                    <td className="p-3 text-right">
                                                        <button onClick={() => handleEditUnit(u)} className="text-xs px-2 py-1 rounded bg-white/10 text-white mr-2 hover:bg-white/20">✏️</button>
                                                        <button onClick={() => handleDeleteUnit(u.id)} className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-300 hover:bg-red-500/30">🗑️</button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Users Tab */}
                {activeTab === 'users' && (
                    <div className="fade-in space-y-6">
                        <div className="glass-card p-6">
                            <h3 className="text-lg font-semibold text-white mb-4">➕ เพิ่ม Staff</h3>
                            <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                                <div>
                                    <label className="block text-sm text-slate-300 mb-1">ชื่อผู้ใช้ *</label>
                                    <input type="text" value={userForm.username} onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                                        className="input-field" placeholder="username" required />
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-300 mb-1">รหัสผ่าน *</label>
                                    <input type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                                        className="input-field" placeholder="password" required />
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-300 mb-1">ชื่อ-นามสกุล *</label>
                                    <input type="text" value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                                        className="input-field" placeholder="ชื่อจริง" required />
                                </div>
                                <button type="submit" className="btn-success">เพิ่ม Staff</button>
                            </form>
                        </div>

                        <div className="glass-card p-6">
                            <h3 className="text-lg font-semibold text-white mb-4">👥 ผู้ใช้ในระบบ ({users.length})</h3>
                            <div className="space-y-2">
                                {users.map((u) => (
                                    <div key={u.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                                        <div className="flex items-center gap-3">
                                            <div className={`px-2 py-1 rounded-md text-xs font-bold ${u.role === 'ADMIN' ? 'bg-amber-500/20 text-amber-300' : 'bg-blue-500/20 text-blue-300'}`}>
                                                {u.role}
                                            </div>
                                            <div>
                                                <div className="text-white font-medium">{u.name}</div>
                                                <div className="text-xs text-slate-400">@{u.username}</div>
                                            </div>
                                        </div>
                                        {u.role !== 'ADMIN' && (
                                            <button onClick={() => handleDeleteUser(u.id)} className="text-xs px-3 py-1 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30">🗑️ ลบ</button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
