import React, { useEffect, useState } from 'react';
import { Briefcase, BookOpen, ExternalLink, MapPin, DollarSign, Clock, RefreshCw } from 'lucide-react';

export default function Dashboard() {
    const [jobs, setJobs] = useState([]);
    const [courses, setCourses] = useState([]);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Get skills from local storage
                const storedSkills = localStorage.getItem('userSkills');
                const userSkills = storedSkills ? JSON.parse(storedSkills) : [];

                const [jobsRes, coursesRes, historyRes] = await Promise.all([
                    fetch('http://localhost:8001/recommend/jobs', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            role: userSkills.length > 0 ? "General" : "Software Engineer",
                            skills: userSkills
                        })
                    }),
                    fetch('http://localhost:8001/recommend/courses'),
                    fetch('http://localhost:8001/interview/history')
                ]);

                const jobsData = await jobsRes.json();
                const coursesData = await coursesRes.json();

                let historyData = [];
                if (historyRes.ok) {
                    try {
                        const hData = await historyRes.json();
                        if (Array.isArray(hData)) {
                            historyData = hData;
                        }
                    } catch (e) {
                        console.error("History parse error", e);
                    }
                }

                setJobs(jobsData);
                setCourses(coursesData);
                setHistory(historyData);
            } catch (err) {
                console.error(err);
                setError("Failed to load recommendations.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Check if skills are present
    const hasSkills = localStorage.getItem('userSkills');

    return (
        <div className="page-container">
            <header style={{ marginBottom: '3rem' }}>
                <h1>Career Dashboard</h1>
                <p>Track your progress, explore roles, and bridge your skill gaps.</p>
            </header>

            {!hasSkills && (
                <div className="card" style={{ 
                    background: 'rgba(245, 158, 11, 0.05)', 
                    borderColor: 'rgba(245, 158, 11, 0.3)', 
                    display: 'flex', 
                    gap: '1.25rem', 
                    alignItems: 'center',
                    marginBottom: '2rem'
                }}>
                    <Zap size={24} color="var(--warning)" />
                    <div>
                        <strong style={{ color: 'var(--warning)', fontSize: '1.1rem' }}>Resume Not Detected</strong>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                            Upload your resume in the <strong>Resume Tab</strong> to get personalized scoring. 
                            Currently showing baseline requirements for Software Engineering.
                        </div>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="grid">
                    <section className="col-span-full">
                        <div className="skeleton" style={{ height: '120px', borderRadius: 'var(--radius-lg)' }}></div>
                    </section>
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="card skeleton" style={{ height: '280px' }}></div>
                    ))}
                </div>
            ) : error ? (
                <div className="card" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', textAlign: 'center' }}>{error}</div>
            ) : (
                <div className="grid" style={{ gap: '2.5rem' }}>

                    {/* Progress Section */}
                    {history.length > 0 && (
                        <section className="col-span-full">
                            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                <RefreshCw size={22} color="var(--accent)" /> Performance Analytics
                            </h2>
                            <div className="card" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem', alignItems: 'center' }}>
                                <div style={{ textAlign: 'center' }}>
                                    <div className="text-sm text-muted" style={{ marginBottom: '0.5rem' }}>Mock Interviews</div>
                                    <div style={{ fontSize: '2.5rem', fontWeight: '800', background: 'linear-gradient(to bottom, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{history.length}</div>
                                </div>
                                <div style={{ textAlign: 'center', borderLeft: '1px solid var(--glass-border)', borderRight: '1px solid var(--glass-border)' }}>
                                    <div className="text-sm text-muted" style={{ marginBottom: '0.5rem' }}>Average Readiness</div>
                                    <div style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--accent)' }}>
                                        {Math.round(history.reduce((acc, curr) => acc + curr.score, 0) / history.length * 10)}%
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                                    <div className="text-sm text-muted">Recent Performance</div>
                                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                                        {history.slice(0, 5).map((h, i) => (
                                            <div key={i} title={h.created_at} style={{
                                                width: '40px', height: '40px', borderRadius: '12px',
                                                background: h.score >= 7 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                                border: `1px solid ${h.score >= 7 ? 'var(--success)' : 'var(--warning)'}`,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                color: h.score >= 7 ? 'var(--success)' : 'var(--warning)', 
                                                fontSize: '1rem', fontWeight: '800',
                                                boxShadow: h.score >= 7 ? '0 0 10px rgba(16, 185, 129, 0.2)' : 'none'
                                            }}>
                                                {h.score}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Job Recommendations Section */}
                    <section className="col-span-full">
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                            <Briefcase size={22} color="var(--primary)" /> Recommended Career Paths
                        </h2>
                        <div className="grid">
                            {jobs.map(job => (
                                <div key={job.id} className="card flex-col" style={{ gap: '1.5rem' }}>
                                    <div className="flex-between" style={{ alignItems: 'flex-start' }}>
                                        <div style={{ flex: 1 }}>
                                            <h3 style={{ fontSize: '1.35rem', color: '#fff', marginBottom: '0.35rem' }}>{job.title}</h3>
                                            <p className="text-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <span style={{ color: 'var(--accent)' }}>{job.company}</span>
                                                <span style={{ color: 'var(--text-muted)' }}>•</span>
                                                <span style={{ color: 'var(--text-secondary)' }}>{job.location}</span>
                                            </p>
                                        </div>
                                        <div className={`badge ${job.match_score >= 80 ? 'success' : 'warning'}`} style={{ fontSize: '0.7rem', padding: '0.4rem 0.8rem' }}>
                                            {job.match_score}% Match
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        <div className="text-sm" style={{ padding: '0.6rem 1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid var(--glass-border)', flex: 1 }}>
                                            <div className="text-muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Package</div>
                                            <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{job.salary}</div>
                                        </div>
                                        <div className="text-sm" style={{ padding: '0.6rem 1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid var(--glass-border)', flex: 1 }}>
                                            <div className="text-muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Status</div>
                                            <div style={{ fontWeight: '600', color: job.match_score >= 80 ? 'var(--success)' : 'var(--warning)' }}>
                                                {job.match_score >= 80 ? "Eligible" : "Skills Needed"}
                                            </div>
                                        </div>
                                    </div>

                                    {job.missing_skills?.length > 0 && (
                                        <div style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.03)', border: '1px solid rgba(245, 158, 11, 0.15)' }}>
                                            <div className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.75rem', fontWeight: '600' }}>UPSKILLING PATH:</div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                {job.learn_more_links?.map((link, idx) => (
                                                    <a key={idx} href={link.url} target="_blank" rel="noopener noreferrer" className="nav-item" style={{ 
                                                        margin: 0, padding: '0.4rem 0.8rem', fontSize: '0.75rem', background: 'rgba(139, 92, 246, 0.1)', color: 'var(--primary)', border: '1px solid rgba(139, 92, 246, 0.2)' 
                                                    }}>
                                                        Learn {link.skill} ↗
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <a href={job.apply_link || "#"} target="_blank" rel="noopener noreferrer" className="btn primary" style={{ width: '100%', borderRadius: '12px', justifyContent: 'center' }}>
                                        Apply Now
                                    </a>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Course Recommendations Section */}
                    <section className="col-span-full">
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                            <BookOpen size={22} color="var(--accent)" /> Learning Path
                        </h2>
                        <div className="grid">
                            {courses.map(course => (
                                <div key={course.id} className="card flex-col" style={{ gap: '1.25rem' }}>
                                    <div style={{ height: '4px', width: '40px', background: 'var(--accent)', borderRadius: '2px' }}></div>
                                    <h3 style={{ fontSize: '1.2rem', lineHeight: '1.4', color: '#fff' }}>{course.title}</h3>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="text-sm">
                                        <span style={{ color: 'var(--text-secondary)' }}>{course.platform}</span>
                                        <span style={{ padding: '0.2rem 0.6rem', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', color: 'var(--accent)', fontWeight: '600' }}>{course.level}</span>
                                    </div>
                                    <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div className="text-muted" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            <Clock size={14} /> {course.duration}
                                        </div>
                                        <a href={course.url} target="_blank" rel="noopener noreferrer" style={{
                                            color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.4rem'
                                        }}>
                                            Explore <ExternalLink size={14} color="var(--accent)" />
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            )}
        </div>
    );
}
