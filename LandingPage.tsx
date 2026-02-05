import React from 'react';
import { Link } from 'react-router-dom';

// Import logo
import companyLogo from './assests/company_logo.png';

const LandingPage: React.FC = () => {
    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            background: 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)'
        }}>
            {/* Header */}
            <header style={{
                background: '#1e293b',
                padding: '1rem 2rem',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                }}>
                    <img src={companyLogo} alt="Shakham Inc" style={{ height: '36px', width: 'auto' }} />
                </div>
            </header>

            {/* Main Content */}
            <main style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '3rem 2rem'
            }}>
                {/* Hero Section */}
                <div style={{ textAlign: 'center', marginBottom: '3rem' }} className="animate-fade-in">
                    <h1 style={{
                        fontSize: 'clamp(2rem, 5vw, 3rem)',
                        fontWeight: 800,
                        marginBottom: '1rem',
                        color: '#1e293b',
                        letterSpacing: '-0.02em'
                    }}>
                        Technical  Platform
                    </h1>
                    <p style={{
                        fontSize: '1.125rem',
                        color: '#64748b',
                        maxWidth: '550px',
                        margin: '0 auto',
                        lineHeight: 1.7
                    }}>
                        Adaptive assessment system with real-time monitoring and intelligent difficulty adjustment
                    </p>
                </div>

                {/* Portal Selection Cards */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '1.5rem',
                    maxWidth: '700px',
                    width: '100%'
                }} className="animate-scale-in">

                    {/* Candidate Portal Card - Green theme */}
                    <Link
                        to="/assessment"
                        style={{
                            textDecoration: 'none',
                            background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                            borderRadius: '16px',
                            padding: '2rem',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            boxShadow: '0 10px 40px rgba(34, 197, 94, 0.25)'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-6px)';
                            e.currentTarget.style.boxShadow = '0 20px 50px rgba(34, 197, 94, 0.35)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 10px 40px rgba(34, 197, 94, 0.25)';
                        }}
                    >
                        {/* Icon */}
                        <div style={{
                            width: '60px',
                            height: '60px',
                            background: 'rgba(255, 255, 255, 0.25)',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '1.25rem'
                        }}>
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                            </svg>
                        </div>

                        <h2 style={{
                            fontSize: '1.375rem',
                            fontWeight: 700,
                            marginBottom: '0.5rem',
                            color: 'white'
                        }}>
                            Candidate Portal
                        </h2>

                        <p style={{
                            color: 'rgba(255, 255, 255, 0.9)',
                            marginBottom: '1.25rem',
                            lineHeight: 1.5,
                            fontSize: '0.9375rem'
                        }}>
                            Start your technical assessment. Register, review instructions, and begin testing.
                        </p>

                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            color: 'white',
                            fontWeight: 600,
                            fontSize: '0.875rem'
                        }}>
                            <span>Start Assessment</span>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M5 12h14M12 5l7 7-7 7" />
                            </svg>
                        </div>
                    </Link>

                    {/* Admin Portal Card - Teal theme */}
                    <Link
                        to="/admin"
                        style={{
                            textDecoration: 'none',
                            background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
                            borderRadius: '16px',
                            padding: '2rem',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            boxShadow: '0 10px 40px rgba(20, 184, 166, 0.25)'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-6px)';
                            e.currentTarget.style.boxShadow = '0 20px 50px rgba(20, 184, 166, 0.35)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 10px 40px rgba(20, 184, 166, 0.25)';
                        }}
                    >
                        {/* Icon */}
                        <div style={{
                            width: '60px',
                            height: '60px',
                            background: 'rgba(255, 255, 255, 0.25)',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '1.25rem'
                        }}>
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                <rect x="3" y="3" width="7" height="7" rx="1" />
                                <rect x="14" y="3" width="7" height="7" rx="1" />
                                <rect x="3" y="14" width="7" height="7" rx="1" />
                                <rect x="14" y="14" width="7" height="7" rx="1" />
                            </svg>
                        </div>

                        <h2 style={{
                            fontSize: '1.375rem',
                            fontWeight: 700,
                            marginBottom: '0.5rem',
                            color: 'white'
                        }}>
                            Admin Dashboard
                        </h2>

                        <p style={{
                            color: 'rgba(255, 255, 255, 0.9)',
                            marginBottom: '1.25rem',
                            lineHeight: 1.5,
                            fontSize: '0.9375rem'
                        }}>
                            Monitor live sessions, view candidate results, and manage assessments.
                        </p>

                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            color: 'white',
                            fontWeight: 600,
                            fontSize: '0.875rem'
                        }}>
                            <span>Sign In</span>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M5 12h14M12 5l7 7-7 7" />
                            </svg>
                        </div>
                    </Link>
                </div>

                {/* Features/Badges */}
                <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                    justifyContent: 'center',
                    marginTop: '3rem'
                }}>
                    {[
                        { icon: '🎯', text: 'Adaptive Difficulty' },
                        { icon: '📊', text: 'Real-time Analytics' },
                        { icon: '🔒', text: 'Proctoring' },
                        { icon: '⚡', text: 'Instant Results' }
                    ].map((badge, i) => (
                        <div key={i} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.625rem 1rem',
                            background: 'white',
                            borderRadius: '25px',
                            fontSize: '0.875rem',
                            color: '#475569',
                            fontWeight: 500,
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)'
                        }}>
                            <span>{badge.icon}</span>
                            <span>{badge.text}</span>
                        </div>
                    ))}
                </div>
            </main>

            {/* Footer */}
            <footer style={{
                textAlign: 'center',
                padding: '1.5rem',
                color: '#94a3b8',
                fontSize: '0.8125rem'
            }}>
                © 2026 Shakham Inc. All rights reserved.
            </footer>
        </div>
    );
};

export default LandingPage;
