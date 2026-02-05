import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';

// Import logo
import companyLogo from '../assests/company_logo.png';

// Dynamic API URL that works from any device on the network
const getApiBase = () => {
    const host = window.location.hostname;
    const protocol = window.location.protocol;
    return `${protocol}//${host}:8000`;
};
const API_BASE = getApiBase();

interface DashboardStats {
    total_candidates: number;
    active_sessions: number;
    completed_assessments: number;
    total_focus_events: number;
    avg_score: number;
    avg_time_seconds: number;
}

interface Candidate {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    total_score: number;
    total_attempted: number;
    highest_difficulty_reached: number;
    time_spent_seconds: number;
    is_active_session: boolean;
    session_start_time: string | null;
    completed_at: string | null;
    created_at: string;
    focus_event_count: number;
}

interface LiveSession {
    candidate_id: number;
    candidate_name: string;
    email: string;
    session_start_time: string | null;
    current_difficulty: number;
    questions_attempted: number;
    focus_warnings: number;
    elapsed_seconds: number;
}

interface CandidateDetails {
    candidate: Candidate;
    answers: Array<{
        question_id: number;
        selected_option: string;
        is_correct: boolean;
        answered_at: string;
        difficulty: number;
    }>;
    focus_events: Array<{
        id: number;
        event_type: string;
        timestamp: string;
        details: string | null;
    }>;
    stats: {
        total_focus_warnings: number;
        correct_answers: number;
        wrong_answers: number;
        accuracy_percentage: number;
        weighted_score: number;
        difficulty_distribution: {
            easy: { correct: number; total: number; weight: number };
            medium: { correct: number; total: number; weight: number };
            hard: { correct: number; total: number; weight: number };
        };
    };
}

type AdminView = 'dashboard' | 'candidates' | 'live' | 'candidate-details';

const AdminPanel: React.FC = () => {
    // Auth state
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [token, setToken] = useState<string | null>(null);
    const [adminName, setAdminName] = useState('');

    // Login form state
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loginError, setLoginError] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    // Dashboard state
    const [currentView, setCurrentView] = useState<AdminView>('dashboard');
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
    const [selectedCandidate, setSelectedCandidate] = useState<CandidateDetails | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // No auto-login from localStorage - admin must always authenticate
    // This is intentional for security

    // Fetch dashboard data when authenticated
    useEffect(() => {
        if (isAuthenticated) {
            fetchDashboardStats();
            fetchCandidates();
            fetchLiveSessions();
        }
    }, [isAuthenticated]);

    // Auto-refresh live sessions every 10 seconds
    useEffect(() => {
        if (isAuthenticated && currentView === 'live') {
            const interval = setInterval(fetchLiveSessions, 10000);
            return () => clearInterval(interval);
        }
    }, [isAuthenticated, currentView]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoggingIn(true);
        setLoginError('');

        try {
            const response = await fetch(`${API_BASE}/api/admin/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Login failed');
            }

            const data = await response.json();
            setToken(data.access_token);
            setAdminName(data.admin_name);
            setIsAuthenticated(true);

            // Save to localStorage
            localStorage.setItem('admin_token', data.access_token);
            localStorage.setItem('admin_name', data.admin_name);
        } catch (err) {
            setLoginError(err instanceof Error ? err.message : 'Login failed');
        } finally {
            setIsLoggingIn(false);
        }
    };

    const handleLogout = () => {
        setIsAuthenticated(false);
        setToken(null);
        setAdminName('');
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_name');
    };

    const fetchDashboardStats = async () => {
        try {
            const response = await fetch(`${API_BASE}/api/admin/dashboard/stats`);
            if (response.ok) {
                const data = await response.json();
                setStats(data);
            }
        } catch (err) {
            console.error('Failed to fetch stats:', err);
        }
    };

    const fetchCandidates = async () => {
        try {
            const response = await fetch(`${API_BASE}/api/admin/candidates`);
            if (response.ok) {
                const data = await response.json();
                setCandidates(data);
            }
        } catch (err) {
            console.error('Failed to fetch candidates:', err);
        }
    };

    const fetchLiveSessions = async () => {
        try {
            const response = await fetch(`${API_BASE}/api/admin/live-sessions`);
            if (response.ok) {
                const data = await response.json();
                setLiveSessions(data);
            }
        } catch (err) {
            console.error('Failed to fetch live sessions:', err);
        }
    };

    const fetchCandidateDetails = async (candidateId: number) => {
        setIsLoading(true);
        try {
            const response = await fetch(`${API_BASE}/api/admin/candidates/${candidateId}/details`);
            if (response.ok) {
                const data = await response.json();
                setSelectedCandidate(data);
                setCurrentView('candidate-details');
            }
        } catch (err) {
            console.error('Failed to fetch candidate details:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const endSession = async (candidateId: number) => {
        if (!confirm('Are you sure you want to end this session?')) return;

        try {
            const response = await fetch(`${API_BASE}/api/admin/candidates/${candidateId}/end-session`, {
                method: 'POST'
            });
            if (response.ok) {
                // Refresh data
                fetchCandidates();
                fetchLiveSessions();
                fetchDashboardStats();
                alert('Session ended successfully');
            } else {
                const error = await response.json();
                alert(`Failed to end session: ${error.detail || 'Unknown error'}`);
            }
        } catch (err) {
            console.error('Failed to end session:', err);
            alert('Failed to end session');
        }
    };

    const deleteCandidate = async (candidateId: number, candidateName: string) => {
        if (!confirm(`Are you sure you want to delete ${candidateName}? This will remove all their data permanently.`)) return;

        try {
            const response = await fetch(`${API_BASE}/api/admin/candidates/${candidateId}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                // Refresh data
                fetchCandidates();
                fetchLiveSessions();
                fetchDashboardStats();
                // Go back to candidates list if viewing deleted candidate
                if (selectedCandidate?.candidate.id === candidateId) {
                    setCurrentView('candidates');
                    setSelectedCandidate(null);
                }
                alert('Candidate deleted successfully');
            } else {
                const error = await response.json();
                alert(`Failed to delete candidate: ${error.detail || 'Unknown error'}`);
            }
        } catch (err) {
            console.error('Failed to delete candidate:', err);
            alert('Failed to delete candidate');
        }
    };

    const cleanupStaleSessions = async () => {
        if (!confirm('This will mark all sessions older than 60 minutes as inactive. Continue?')) return;

        try {
            const response = await fetch(`${API_BASE}/api/admin/cleanup-stale-sessions`, {
                method: 'POST'
            });
            if (response.ok) {
                const result = await response.json();
                // Refresh data
                fetchCandidates();
                fetchLiveSessions();
                fetchDashboardStats();
                alert(`Cleaned up ${result.cleaned_count} stale session(s)`);
            }
        } catch (err) {
            console.error('Failed to cleanup sessions:', err);
            alert('Failed to cleanup sessions');
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleString();
    };

    const getDifficultyBadge = (level: number) => {
        const labels = ['', 'Easy', 'Moderate', 'Hard'];
        const colors = ['', '#22c55e', '#f59e0b', '#ef4444'];
        return (
            <span style={{
                padding: '0.25rem 0.75rem',
                borderRadius: '50px',
                background: `${colors[level]}15`,
                color: colors[level],
                fontSize: '0.75rem',
                fontWeight: 600
            }}>
                {labels[level]}
            </span>
        );
    };

    // Login Page
    if (!isAuthenticated) {
        return (
            <div style={{
                minHeight: '100vh',
                background: 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)',
                display: 'flex',
                flexDirection: 'column'
            }}>
                {/* Header */}
                <header style={{
                    background: '#1e293b',
                    padding: '1rem 2rem',
                    display: 'flex',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                }}>
                    <img src={companyLogo} alt="Shakham Inc" style={{ height: '36px' }} />
                </header>

                {/* Login Card */}
                <div style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2rem'
                }}>
                    <div style={{
                        position: 'relative',
                        width: '100%',
                        maxWidth: '420px',
                        background: 'white',
                        borderRadius: '20px',
                        overflow: 'hidden',
                        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.1)'
                    }}>
                        {/* Card Header */}
                        <div style={{
                            background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
                            padding: '2rem',
                            textAlign: 'center',
                            color: 'white'
                        }}>
                            {/* Back Button */}
                            <Link
                                to="/"
                                style={{
                                    position: 'absolute',
                                    top: '1rem',
                                    left: '1rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.5rem 1rem',
                                    background: 'rgba(255,255,255,0.15)',
                                    border: '1px solid rgba(255,255,255,0.3)',
                                    borderRadius: '8px',
                                    color: 'white',
                                    fontSize: '0.875rem',
                                    textDecoration: 'none',
                                    fontWeight: 500,
                                    transition: 'all 0.2s'
                                }}
                            >
                                ← Back
                            </Link>
                            <div style={{
                                width: '80px',
                                margin: '0 auto 1rem',
                                padding: '0.75rem',
                                background: 'rgba(255,255,255,0.95)',
                                borderRadius: '12px'
                            }}>
                                <img src={companyLogo} alt="Shakham Inc" style={{ width: '100%', height: 'auto' }} />
                            </div>
                            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', fontWeight: 700 }}>Admin Portal</h2>
                            <p style={{ opacity: 0.9, fontSize: '0.875rem' }}>Sign in to access the dashboard</p>
                        </div>

                        {/* Form Body */}
                        <div style={{ padding: '2rem' }}>
                            <form onSubmit={handleLogin}>
                                <div style={{ marginBottom: '1.25rem' }}>
                                    <label style={{
                                        display: 'block',
                                        marginBottom: '0.5rem',
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        color: '#64748b',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em'
                                    }}>Email Address</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="admin@shakham.com"
                                        required
                                        style={{
                                            width: '100%',
                                            padding: '0.875rem 1rem',
                                            border: '2px solid #e2e8f0',
                                            borderRadius: '10px',
                                            fontSize: '1rem',
                                            transition: 'all 0.2s',
                                            outline: 'none',
                                            boxSizing: 'border-box'
                                        }}
                                        onFocus={(e) => e.target.style.borderColor = '#14b8a6'}
                                        onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                                    />
                                </div>

                                <div style={{ marginBottom: '1.5rem' }}>
                                    <label style={{
                                        display: 'block',
                                        marginBottom: '0.5rem',
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        color: '#64748b',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em'
                                    }}>Password</label>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Enter password"
                                        required
                                        style={{
                                            width: '100%',
                                            padding: '0.875rem 1rem',
                                            border: '2px solid #e2e8f0',
                                            borderRadius: '10px',
                                            fontSize: '1rem',
                                            transition: 'all 0.2s',
                                            outline: 'none',
                                            boxSizing: 'border-box'
                                        }}
                                        onFocus={(e) => e.target.style.borderColor = '#14b8a6'}
                                        onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                                    />
                                </div>

                                {loginError && (
                                    <div style={{
                                        padding: '0.75rem 1rem',
                                        background: '#fef2f2',
                                        border: '1px solid #fecaca',
                                        borderRadius: '10px',
                                        color: '#dc2626',
                                        fontSize: '0.875rem',
                                        marginBottom: '1rem'
                                    }}>
                                        {loginError}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={isLoggingIn}
                                    style={{
                                        width: '100%',
                                        padding: '1rem',
                                        background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '10px',
                                        fontSize: '1rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.5rem'
                                    }}
                                >
                                    {isLoggingIn ? 'Signing in...' : 'Sign In'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Admin Dashboard
    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)'
        }}>
            {/* Header */}
            <header style={{
                background: '#1e293b',
                padding: '1rem 2rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
            }}>
                <img src={companyLogo} alt="Shakham Inc" style={{ height: '36px' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem' }}>
                        Welcome, <strong style={{ color: 'white' }}>{adminName}</strong>
                    </span>
                    <button
                        onClick={handleLogout}
                        style={{
                            padding: '0.5rem 1.25rem',
                            background: 'transparent',
                            border: '2px solid rgba(255,255,255,0.3)',
                            borderRadius: '8px',
                            color: 'white',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        Logout
                    </button>
                </div>
            </header>

            {/* Navigation Tabs */}
            <nav style={{
                background: 'white',
                borderBottom: '1px solid #e2e8f0',
                padding: '0 2rem',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
            }}>
                <div style={{ display: 'flex', gap: '0.25rem', maxWidth: '1400px', margin: '0 auto' }}>
                    {[
                        { id: 'dashboard', label: '📊 Dashboard', color: '#22c55e' },
                        { id: 'candidates', label: '👥 Candidates', color: '#14b8a6' },
                        { id: 'live', label: '🔴 Live Sessions', color: '#ef4444' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setCurrentView(tab.id as AdminView)}
                            style={{
                                padding: '1rem 1.5rem',
                                background: currentView === tab.id ? tab.color : 'transparent',
                                color: currentView === tab.id ? 'white' : '#64748b',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                transition: 'all 0.2s ease',
                                borderRadius: '8px 8px 0 0',
                                marginBottom: '-1px'
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </nav>

            {/* Main Content */}
            <main style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
                {/* Dashboard View */}
                {currentView === 'dashboard' && stats && (
                    <div className="animate-fade-in">
                        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem', color: '#1e293b', fontWeight: 700 }}>
                            Dashboard Overview
                        </h2>

                        {/* Stats Grid */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                            gap: '1rem',
                            marginBottom: '2rem'
                        }}>
                            {[
                                { value: stats.total_candidates, label: 'Total Candidates', color: '#22c55e' },
                                { value: stats.active_sessions, label: 'Active Sessions', color: '#14b8a6' },
                                { value: stats.completed_assessments, label: 'Completed', color: '#8b5cf6' },
                                { value: stats.total_focus_events, label: 'Focus Events', color: '#ec4899' },
                                { value: stats.avg_score.toFixed(1), label: 'Average Score', color: '#f97316' },
                                { value: formatTime(Math.round(stats.avg_time_seconds)), label: 'Avg. Duration', color: '#06b6d4' }
                            ].map((stat, i) => (
                                <div key={i} style={{
                                    background: stat.color,
                                    borderRadius: '16px',
                                    padding: '1.5rem',
                                    color: 'white',
                                    boxShadow: `0 8px 24px ${stat.color}40`
                                }}>
                                    <div style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.25rem' }}>{stat.value}</div>
                                    <div style={{ opacity: 0.9, fontSize: '0.8125rem' }}>{stat.label}</div>
                                </div>
                            ))}
                        </div>

                        {/* Recent Candidates Table */}
                        <div style={{
                            background: 'white',
                            borderRadius: '16px',
                            overflow: 'hidden',
                            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)'
                        }}>
                            <div style={{
                                padding: '1.25rem 1.5rem',
                                borderBottom: '1px solid #e2e8f0',
                                background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                                color: 'white'
                            }}>
                                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Recent Candidates</h3>
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ background: '#f8fafc' }}>
                                            <th style={{ padding: '0.875rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Candidate</th>
                                            <th style={{ padding: '0.875rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                                            <th style={{ padding: '0.875rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Score</th>
                                            <th style={{ padding: '0.875rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Warnings</th>
                                            <th style={{ padding: '0.875rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {candidates.slice(0, 5).map(c => (
                                            <tr
                                                key={c.id}
                                                onClick={() => fetchCandidateDetails(c.id)}
                                                style={{
                                                    borderBottom: '1px solid #f1f5f9',
                                                    cursor: 'pointer',
                                                    transition: 'background 0.2s'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                            >
                                                <td style={{ padding: '1rem 1.25rem' }}>
                                                    <div style={{ fontWeight: 600, color: '#1e293b' }}>{c.first_name} {c.last_name}</div>
                                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{c.email}</div>
                                                </td>
                                                <td style={{ padding: '1rem 1.25rem' }}>
                                                    {c.is_active_session ? (
                                                        <span style={{
                                                            padding: '0.375rem 0.875rem',
                                                            background: '#dcfce7',
                                                            color: '#16a34a',
                                                            borderRadius: '50px',
                                                            fontSize: '0.75rem',
                                                            fontWeight: 600,
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '0.375rem'
                                                        }}>
                                                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a' }}></span>
                                                            Active
                                                        </span>
                                                    ) : c.completed_at ? (
                                                        <span style={{
                                                            padding: '0.375rem 0.875rem',
                                                            background: '#dbeafe',
                                                            color: '#2563eb',
                                                            borderRadius: '50px',
                                                            fontSize: '0.75rem',
                                                            fontWeight: 600
                                                        }}>✓ Completed</span>
                                                    ) : (
                                                        <span style={{
                                                            padding: '0.375rem 0.875rem',
                                                            background: '#f1f5f9',
                                                            color: '#64748b',
                                                            borderRadius: '50px',
                                                            fontSize: '0.75rem',
                                                            fontWeight: 600
                                                        }}>Pending</span>
                                                    )}
                                                </td>
                                                <td style={{ padding: '1rem 1.25rem' }}>
                                                    <span style={{ fontWeight: 700, color: '#22c55e' }}>{c.total_score}</span>
                                                    <span style={{ color: '#94a3b8' }}>/{c.total_attempted}</span>
                                                </td>
                                                <td style={{ padding: '1rem 1.25rem' }}>
                                                    <span style={{
                                                        padding: '0.25rem 0.625rem',
                                                        borderRadius: '6px',
                                                        background: c.focus_event_count > 5 ? '#fef2f2' : c.focus_event_count > 2 ? '#fffbeb' : '#f0fdf4',
                                                        color: c.focus_event_count > 5 ? '#dc2626' : c.focus_event_count > 2 ? '#d97706' : '#16a34a',
                                                        fontWeight: 600,
                                                        fontSize: '0.875rem'
                                                    }}>
                                                        {c.focus_event_count}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '1rem 1.25rem', fontSize: '0.875rem', color: '#64748b' }}>
                                                    {formatDate(c.created_at)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* Candidates List View */}
                {currentView === 'candidates' && (
                    <div className="animate-fade-in">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#1e293b', fontWeight: 700 }}>
                                All Candidates ({candidates.length})
                            </h2>
                            <button
                                onClick={() => { fetchCandidates(); fetchDashboardStats(); }}
                                style={{
                                    padding: '0.625rem 1.25rem',
                                    background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '10px',
                                    fontSize: '0.875rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}
                            >
                                ↻ Refresh
                            </button>
                        </div>

                        <div style={{
                            background: 'white',
                            borderRadius: '16px',
                            overflow: 'hidden',
                            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)'
                        }}>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
                                    <thead>
                                        <tr style={{ background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)' }}>
                                            {['ID', 'Name', 'Email', 'Score', 'Difficulty', 'Time', 'Warnings', 'Status', 'Action'].map(h => (
                                                <th key={h} style={{
                                                    padding: '1rem 1.25rem',
                                                    textAlign: 'left',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 600,
                                                    color: 'white',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.05em'
                                                }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {candidates.map(c => (
                                            <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                <td style={{ padding: '1rem 1.25rem', fontFamily: 'monospace', color: '#64748b' }}>#{c.id}</td>
                                                <td style={{ padding: '1rem 1.25rem', fontWeight: 600, color: '#1e293b' }}>{c.first_name} {c.last_name}</td>
                                                <td style={{ padding: '1rem 1.25rem', color: '#64748b' }}>{c.email}</td>
                                                <td style={{ padding: '1rem 1.25rem' }}>
                                                    <span style={{ fontWeight: 700, color: '#22c55e' }}>{c.total_score}</span>
                                                    <span style={{ color: '#94a3b8' }}>/{c.total_attempted}</span>
                                                </td>
                                                <td style={{ padding: '1rem 1.25rem' }}>{getDifficultyBadge(c.highest_difficulty_reached)}</td>
                                                <td style={{ padding: '1rem 1.25rem', color: '#64748b' }}>{formatTime(c.time_spent_seconds)}</td>
                                                <td style={{ padding: '1rem 1.25rem' }}>
                                                    <span style={{
                                                        padding: '0.25rem 0.625rem',
                                                        borderRadius: '6px',
                                                        background: c.focus_event_count > 5 ? '#fef2f2' : c.focus_event_count > 2 ? '#fffbeb' : '#f0fdf4',
                                                        color: c.focus_event_count > 5 ? '#dc2626' : c.focus_event_count > 2 ? '#d97706' : '#16a34a',
                                                        fontWeight: 600
                                                    }}>
                                                        {c.focus_event_count}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '1rem 1.25rem' }}>
                                                    {c.is_active_session ? (
                                                        <span style={{ color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#16a34a' }}></span>
                                                            Active
                                                        </span>
                                                    ) : c.completed_at ? (
                                                        <span style={{ color: '#2563eb', fontWeight: 600 }}>✓ Done</span>
                                                    ) : (
                                                        <span style={{ color: '#94a3b8' }}>Pending</span>
                                                    )}
                                                </td>
                                                <td style={{ padding: '1rem 1.25rem' }}>
                                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                        <button
                                                            onClick={() => fetchCandidateDetails(c.id)}
                                                            style={{
                                                                padding: '0.5rem 0.75rem',
                                                                background: 'transparent',
                                                                border: '2px solid #14b8a6',
                                                                borderRadius: '8px',
                                                                color: '#14b8a6',
                                                                fontSize: '0.75rem',
                                                                fontWeight: 600,
                                                                cursor: 'pointer',
                                                                transition: 'all 0.2s'
                                                            }}
                                                        >
                                                            View
                                                        </button>
                                                        {c.is_active_session && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); endSession(c.id); }}
                                                                style={{
                                                                    padding: '0.5rem 0.75rem',
                                                                    background: 'transparent',
                                                                    border: '2px solid #f59e0b',
                                                                    borderRadius: '8px',
                                                                    color: '#f59e0b',
                                                                    fontSize: '0.75rem',
                                                                    fontWeight: 600,
                                                                    cursor: 'pointer',
                                                                    transition: 'all 0.2s'
                                                                }}
                                                            >
                                                                End
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); deleteCandidate(c.id, `${c.first_name} ${c.last_name}`); }}
                                                            style={{
                                                                padding: '0.5rem 0.75rem',
                                                                background: 'transparent',
                                                                border: '2px solid #ef4444',
                                                                borderRadius: '8px',
                                                                color: '#ef4444',
                                                                fontSize: '0.75rem',
                                                                fontWeight: 600,
                                                                cursor: 'pointer',
                                                                transition: 'all 0.2s'
                                                            }}
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* Live Sessions View */}
                {currentView === 'live' && (
                    <div className="animate-fade-in">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#1e293b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{
                                    width: '12px',
                                    height: '12px',
                                    borderRadius: '50%',
                                    background: '#ef4444',
                                    animation: 'pulse 2s infinite'
                                }}></span>
                                Live Sessions ({liveSessions.length})
                            </h2>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <span style={{ color: '#64748b', fontSize: '0.875rem' }}>Auto-refreshes every 10s</span>
                                <button
                                    onClick={cleanupStaleSessions}
                                    style={{
                                        padding: '0.625rem 1.25rem',
                                        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '10px',
                                        fontSize: '0.875rem',
                                        fontWeight: 600,
                                        cursor: 'pointer'
                                    }}
                                >
                                    🧹 Cleanup Stale
                                </button>
                                <button
                                    onClick={fetchLiveSessions}
                                    style={{
                                        padding: '0.625rem 1.25rem',
                                        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '10px',
                                        fontSize: '0.875rem',
                                        fontWeight: 600,
                                        cursor: 'pointer'
                                    }}
                                >
                                    ↻ Refresh Now
                                </button>
                            </div>
                        </div>

                        {liveSessions.length === 0 ? (
                            <div style={{
                                background: 'white',
                                borderRadius: '16px',
                                padding: '4rem 2rem',
                                textAlign: 'center',
                                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)'
                            }}>
                                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔍</div>
                                <h3 style={{ color: '#1e293b', marginBottom: '0.5rem' }}>No Active Sessions</h3>
                                <p style={{ color: '#64748b' }}>There are currently no candidates taking the assessment.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                                {liveSessions.map(session => (
                                    <div key={session.candidate_id} style={{
                                        background: 'white',
                                        borderRadius: '16px',
                                        overflow: 'hidden',
                                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
                                        border: session.focus_warnings > 3 ? '2px solid #ef4444' : '1px solid #e2e8f0'
                                    }}>
                                        <div style={{
                                            padding: '1.25rem',
                                            background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                                            color: 'white'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <div>
                                                    <h4 style={{ margin: 0, marginBottom: '0.25rem', fontWeight: 700 }}>{session.candidate_name}</h4>
                                                    <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>{session.email}</div>
                                                </div>
                                                <span style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.25rem',
                                                    padding: '0.25rem 0.625rem',
                                                    background: 'rgba(255,255,255,0.2)',
                                                    borderRadius: '50px',
                                                    fontSize: '0.6875rem',
                                                    fontWeight: 600
                                                }}>
                                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'white' }}></span>
                                                    LIVE
                                                </span>
                                            </div>
                                        </div>
                                        <div style={{ padding: '1.25rem' }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                                                <div style={{ background: '#f8fafc', padding: '0.875rem', borderRadius: '10px' }}>
                                                    <div style={{ fontSize: '0.625rem', textTransform: 'uppercase', color: '#64748b', marginBottom: '0.25rem', fontWeight: 600, letterSpacing: '0.05em' }}>Duration</div>
                                                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>{formatTime(session.elapsed_seconds)}</div>
                                                </div>
                                                <div style={{ background: '#f8fafc', padding: '0.875rem', borderRadius: '10px' }}>
                                                    <div style={{ fontSize: '0.625rem', textTransform: 'uppercase', color: '#64748b', marginBottom: '0.25rem', fontWeight: 600, letterSpacing: '0.05em' }}>Questions</div>
                                                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>{session.questions_attempted}</div>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Difficulty:</span>
                                                    {getDifficultyBadge(session.current_difficulty)}
                                                </div>
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.25rem',
                                                    padding: '0.25rem 0.625rem',
                                                    background: session.focus_warnings > 3 ? '#fef2f2' : session.focus_warnings > 0 ? '#fffbeb' : '#f0fdf4',
                                                    borderRadius: '6px',
                                                    color: session.focus_warnings > 3 ? '#dc2626' : session.focus_warnings > 0 ? '#d97706' : '#16a34a',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 600
                                                }}>
                                                    ⚠️ {session.focus_warnings}
                                                </div>
                                            </div>
                                            {/* End Session Button */}
                                            <button
                                                onClick={() => endSession(session.candidate_id)}
                                                style={{
                                                    marginTop: '1rem',
                                                    width: '100%',
                                                    padding: '0.5rem 1rem',
                                                    background: 'transparent',
                                                    border: '2px solid #ef4444',
                                                    borderRadius: '8px',
                                                    color: '#ef4444',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 600,
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                ✕ End Session
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Candidate Details View */}
                {currentView === 'candidate-details' && selectedCandidate && (
                    <div className="animate-fade-in">
                        <button
                            onClick={() => setCurrentView('candidates')}
                            style={{
                                padding: '0.625rem 1.25rem',
                                background: 'white',
                                border: '2px solid #e2e8f0',
                                borderRadius: '10px',
                                color: '#64748b',
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                marginBottom: '1.5rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}
                        >
                            ← Back to Candidates
                        </button>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.5rem' }}>
                            {/* Main Info */}
                            <div>
                                {/* Candidate Header Card */}
                                <div style={{
                                    background: 'white',
                                    borderRadius: '16px',
                                    overflow: 'hidden',
                                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
                                    marginBottom: '1.5rem'
                                }}>
                                    <div style={{
                                        padding: '1.5rem',
                                        background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
                                        color: 'white'
                                    }}>
                                        <h2 style={{ margin: 0, fontWeight: 700 }}>
                                            {selectedCandidate.candidate.first_name} {selectedCandidate.candidate.last_name}
                                        </h2>
                                        <div style={{ opacity: 0.9 }}>{selectedCandidate.candidate.email}</div>
                                    </div>
                                    <div style={{ padding: '1.5rem' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem' }}>
                                            {[
                                                { value: `${selectedCandidate.stats.weighted_score}`, label: 'Weighted Score', color: '#8b5cf6' },
                                                { value: selectedCandidate.stats.correct_answers, label: 'Correct', color: '#22c55e' },
                                                { value: selectedCandidate.stats.wrong_answers, label: 'Wrong', color: '#ef4444' },
                                                { value: `${selectedCandidate.stats.accuracy_percentage}%`, label: 'Accuracy', color: '#3b82f6' },
                                                { value: selectedCandidate.stats.total_focus_warnings, label: 'Warnings', color: '#f59e0b' }
                                            ].map((stat, i) => (
                                                <div key={i} style={{
                                                    textAlign: 'center',
                                                    padding: '1rem',
                                                    background: `${stat.color}10`,
                                                    borderRadius: '12px'
                                                }}>
                                                    <div style={{ fontSize: '1.75rem', fontWeight: 700, color: stat.color }}>{stat.value}</div>
                                                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>{stat.label}</div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Difficulty Distribution */}
                                        {selectedCandidate.stats.difficulty_distribution && (
                                            <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0' }}>
                                                <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>
                                                    📊 Difficulty Distribution
                                                </h4>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                    {[
                                                        { name: 'Easy', data: selectedCandidate.stats.difficulty_distribution.easy, color: '#22c55e' },
                                                        { name: 'Medium', data: selectedCandidate.stats.difficulty_distribution.medium, color: '#f59e0b' },
                                                        { name: 'Hard', data: selectedCandidate.stats.difficulty_distribution.hard, color: '#ef4444' }
                                                    ].map(level => (
                                                        <div key={level.name} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                            <div style={{ width: '60px', fontWeight: 600, fontSize: '0.8125rem', color: level.color }}>
                                                                {level.name}
                                                            </div>
                                                            <div style={{ flex: 1, height: '24px', background: '#f1f5f9', borderRadius: '12px', overflow: 'hidden', position: 'relative' }}>
                                                                <div style={{
                                                                    height: '100%',
                                                                    width: level.data.total > 0 ? `${(level.data.correct / level.data.total) * 100}%` : '0%',
                                                                    background: level.color,
                                                                    borderRadius: '12px',
                                                                    transition: 'width 0.3s ease'
                                                                }} />
                                                            </div>
                                                            <div style={{ width: '70px', fontSize: '0.8125rem', fontWeight: 600, color: '#475569', textAlign: 'right' }}>
                                                                {level.data.correct}/{level.data.total}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Focus Events */}
                                <div style={{
                                    background: 'white',
                                    borderRadius: '16px',
                                    overflow: 'hidden',
                                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)'
                                }}>
                                    <div style={{
                                        padding: '1rem 1.5rem',
                                        borderBottom: '1px solid #e2e8f0',
                                        background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                                        color: 'white'
                                    }}>
                                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Focus Events Timeline</h3>
                                    </div>
                                    <div style={{ maxHeight: '400px', overflowY: 'auto', padding: '1rem' }}>
                                        {selectedCandidate.focus_events.length === 0 ? (
                                            <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                                                No focus events recorded
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                {selectedCandidate.focus_events.map(event => (
                                                    <div key={event.id} style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '1rem',
                                                        padding: '0.875rem',
                                                        background: event.event_type.includes('blur') || event.event_type.includes('hidden')
                                                            ? '#fef2f2'
                                                            : '#f0fdf4',
                                                        borderRadius: '10px',
                                                        borderLeft: `4px solid ${event.event_type.includes('blur') || event.event_type.includes('hidden') ? '#ef4444' : '#22c55e'}`
                                                    }}>
                                                        <div style={{ fontSize: '1.25rem' }}>
                                                            {event.event_type.includes('blur') || event.event_type.includes('hidden') ? '⚠️' : '✓'}
                                                        </div>
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1e293b' }}>{event.event_type}</div>
                                                            {event.details && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{event.details}</div>}
                                                        </div>
                                                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                            {new Date(event.timestamp).toLocaleTimeString()}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Sidebar */}
                            <div>
                                <div style={{
                                    background: 'white',
                                    borderRadius: '16px',
                                    overflow: 'hidden',
                                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)'
                                }}>
                                    <div style={{
                                        padding: '1rem 1.25rem',
                                        borderBottom: '1px solid #e2e8f0',
                                        background: '#f8fafc'
                                    }}>
                                        <h4 style={{ margin: 0, color: '#1e293b', fontWeight: 600 }}>Session Info</h4>
                                    </div>
                                    <div style={{ padding: '1.25rem' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', fontSize: '0.875rem' }}>
                                            {[
                                                { label: 'Status', value: selectedCandidate.candidate.is_active_session ? '🔴 Active' : selectedCandidate.candidate.completed_at ? '✓ Completed' : 'Pending' },
                                                { label: 'Difficulty', value: getDifficultyBadge(selectedCandidate.candidate.highest_difficulty_reached) },
                                                { label: 'Time Spent', value: formatTime(selectedCandidate.candidate.time_spent_seconds) },
                                                { label: 'Started', value: formatDate(selectedCandidate.candidate.session_start_time) },
                                                { label: 'Completed', value: formatDate(selectedCandidate.candidate.completed_at) }
                                            ].map((item, i) => (
                                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ color: '#64748b' }}>{item.label}</span>
                                                    <span style={{ fontWeight: 600, color: '#1e293b' }}>{item.value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Loading Overlay */}
                {isLoading && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(255,255,255,0.8)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000
                    }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            border: '4px solid #e2e8f0',
                            borderTop: '4px solid #14b8a6',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite'
                        }}></div>
                    </div>
                )}
            </main>

            <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    );
};

export default AdminPanel;
