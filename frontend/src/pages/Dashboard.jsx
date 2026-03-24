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
            <h1 style={{ marginBottom: '2rem' }}>Career Dashboard</h1>

            {!hasSkills && (
                <div className="card" style={{ background: 'rgba(245, 158, 11, 0.1)', borderColor: 'var(--warning)', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '1.5rem' }}>⚠️</span>
                    <div>
                        <strong style={{ color: 'var(--warning)' }}>Resume Not Detected</strong>
                        <div style={{ color: 'var(--text-secondary)' }}>Upload your resume in the <u>Resume Tab</u> to get personalized scoring and accurate gap analysis. Currently showing baseline requirements.</div>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="grid">
                    <section className="col-span-full">
                        <div className="skeleton" style={{ height: '100px', borderRadius: 'var(--radius-lg)' }}></div>
                    </section>
                    <section>
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div className="skeleton" style={{ width: '200px', height: '30px' }}></div>
                        </h2>
                        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                            {[1, 2].map(i => (
                                <div key={i} className="card skeleton" style={{ height: '250px' }}></div>
                            ))}
                        </div>
                    </section>
                    <section>
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div className="skeleton" style={{ width: '250px', height: '30px' }}></div>
                        </h2>
                        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                            {[1, 2].map(i => (
                                <div key={i} className="card skeleton" style={{ height: '200px' }}></div>
                            ))}
                        </div>
                    </section>
                </div>
            ) : error ? (
                <div className="error-box" style={{ padding: '1rem', background: 'var(--danger)', color: 'white', borderRadius: 'var(--radius-sm)' }}>{error}</div>
            ) : (
                <div className="grid">

                    {/* Progress Section */}
                    {history.length > 0 && (
                        <section className="col-span-full">
                            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Briefcase size={24} className="accent-icon" color="var(--accent)" /> My Progress
                            </h2>
                            <div className="card flex-between" style={{ flexWrap: 'wrap', gap: '2rem' }}>
                                <div>
                                    <div className="text-sm text-muted">Interviews Taken</div>
                                    <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{history.length}</div>
                                </div>
                                <div style={{ width: '1px', height: '50px', background: 'var(--border)' }}></div>
                                <div>
                                    <div className="text-sm text-muted">Average Score</div>
                                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--accent)' }}>
                                        {Math.round(history.reduce((acc, curr) => acc + curr.score, 0) / history.length)}/10
                                    </div>
                                </div>
                                <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
                                    {history.slice(0, 5).map((h, i) => (
                                        <div key={i} title={h.created_at} style={{
                                            width: '32px', height: '32px', borderRadius: '50%',
                                            background: h.score >= 7 ? 'var(--success)' : 'var(--warning)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: 'white', fontSize: '0.8rem', fontWeight: 'bold'
                                        }}>
                                            {h.score}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Job Recommendations Section */}
                    <section>
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Briefcase size={24} color="var(--accent)" /> Recommended Jobs
                        </h2>
                        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                            {jobs.map(job => (
                                <div key={job.id} className="card flex-col gap-md">
                                    <div className="flex-between" style={{ alignItems: 'flex-start' }}>
                                        <div>
                                            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>{job.title}</h3>
                                            <p className="text-sm text-muted">{job.company} • {job.location}</p>
                                        </div>
                                        <span className={`badge ${job.match_score >= 80 ? 'success' : job.match_score >= 50 ? 'warning' : 'danger'}`}>
                                            {job.match_score}% Match
                                        </span>
                                    </div>

                                    <div className="text-sm" style={{ color: 'var(--text-primary)' }}>
                                        <strong>Salary:</strong> {job.salary}
                                    </div>

                                    {/* Eligibility Check */}
                                    <div style={{
                                        padding: '0.75rem', borderRadius: 'var(--radius-sm)',
                                        background: job.match_score >= 80 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                        border: `1px solid ${job.match_score >= 80 ? 'var(--success)' : 'var(--warning)'}`
                                    }}>
                                        <div style={{ fontWeight: 'bold', color: job.match_score >= 80 ? 'var(--success)' : 'var(--warning)', marginBottom: '0.5rem' }}>
                                            {job.match_score >= 80 ? "✅ You are Eligible!" : "⚠️ Skill Gaps Detected"}
                                        </div>

                                        {job.missing_skills && job.missing_skills.length > 0 && (
                                            <div className="text-sm">
                                                <span className="text-muted">Missing: </span>
                                                {job.missing_skills.join(", ")}
                                            </div>
                                        )}
                                    </div>

                                    {/* Course Links */}
                                    {job.learn_more_links && job.learn_more_links.length > 0 && (
                                        <div>
                                            <p className="text-sm" style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Recommended Courses:</p>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                {job.learn_more_links.map((link, idx) => (
                                                    <a
                                                        key={idx}
                                                        href={link.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        style={{
                                                            textDecoration: 'none',
                                                            background: 'rgba(99, 102, 241, 0.1)',
                                                            color: 'var(--primary)',
                                                            border: '1px solid var(--primary)',
                                                            padding: '0.3rem 0.6rem',
                                                            borderRadius: 'var(--radius-sm)',
                                                            fontSize: '0.75rem',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '0.3rem',
                                                            transition: 'all 0.2s'
                                                        }}
                                                    >
                                                        Learn {link.skill} ↗
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <a 
                                        href={job.apply_link || "#"} 
                                        target={job.apply_link ? "_blank" : "_self"} 
                                        rel="noopener noreferrer" 
                                        className="btn primary" 
                                        style={{ marginTop: 'auto', textDecoration: 'none', textAlign: 'center', width: '100%', display: 'inline-block' }}
                                    >
                                        {job.apply_link ? `Apply on ${job.source || "Website"}` : "Apply Now"}
                                    </a>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Course Recommendations Section */}
                    <section>
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--accent)' }}>
                            <BookOpen /> Recommended Courses
                        </h2>
                        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                            {courses.map(course => (
                                <div key={course.id} className="card flex-col gap-md">
                                    <h3 style={{ fontSize: '1.1rem', lineHeight: '1.4' }}>{course.title}</h3>
                                    <div className="flex-col gap-sm text-sm text-muted">
                                        <div><strong style={{ color: 'var(--text-primary)' }}>Platform:</strong> {course.platform}</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Clock size={16} /> {course.duration} • {course.level}</div>
                                    </div>
                                    <a href="#" style={{
                                        marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem',
                                        color: 'var(--accent)', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.9rem'
                                    }}>
                                        Start Learning <ExternalLink size={14} />
                                    </a>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            )
            }
        </div >
    );
}
