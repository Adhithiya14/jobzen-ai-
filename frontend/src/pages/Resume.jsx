import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, RefreshCw, ExternalLink } from 'lucide-react';

import { useNavigate } from 'react-router-dom';

export default function Resume() {
    const [file, setFile] = useState(null);
    const [analysis, setAnalysis] = useState(null);
    const [recommendedJobs, setRecommendedJobs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showCriteria, setShowCriteria] = useState(false);
    const navigate = useNavigate();

    const handleFileChange = (e) => {
        if (e.target.files) {
            setFile(e.target.files[0]);
            setAnalysis(null);
            setRecommendedJobs([]);
            setError(null);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setLoading(true);
        setError(null);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('http://localhost:8001/resume/analyze', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(`Server Error: ${response.status} ${response.statusText} - ${errorData}`);
            }

            const data = await response.json();
            setAnalysis(data);

            // Save skills and fetch jobs
            if (data.skills) {
                localStorage.setItem('userSkills', JSON.stringify(data.skills));

                // Fetch recommendations immediately
                const jobsResponse = await fetch('http://localhost:8001/recommend/jobs', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        role: "General",
                        skills: data.skills,
                        experience: data.years_experience || 0
                    })
                });
                const jobsData = await jobsResponse.json();
                setRecommendedJobs(jobsData); // Show ALL matches
            }
        } catch (err) {
            console.error(err);
            setError(err.message || "Failed to analyze resume. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-container">
            <header style={{ marginBottom: '3rem' }}>
                <h1>Resume Analysis</h1>
                <p>Optimize your resume for ATS and discover matching roles.</p>
            </header>

            <div className="card" style={{ 
                padding: '4rem 2rem', 
                border: '2px dashed var(--glass-border)', 
                textAlign: 'center', 
                marginBottom: '3rem', 
                background: 'rgba(255, 255, 255, 0.02)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1.5rem'
            }}>
                <input
                    type="file"
                    id="resume-upload"
                    accept=".pdf"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                />
                <label htmlFor="resume-upload" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
                    <div style={{ 
                        padding: '1.75rem', 
                        background: 'rgba(139, 92, 246, 0.1)', 
                        borderRadius: '24px', 
                        color: 'var(--primary)',
                        boxShadow: '0 0 20px rgba(139, 92, 246, 0.1)'
                    }}>
                        <Upload size={40} />
                    </div>
                    <div>
                        <div style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.25rem' }}>
                            <span style={{ color: 'var(--primary)' }}>Click to upload</span> or drag and drop
                        </div>
                        <p className="text-sm text-muted">Support for PDF resumes (Max 5MB)</p>
                    </div>
                </label>

                {file && (
                    <div style={{ 
                        padding: '0.75rem 1.25rem', 
                        background: 'var(--bg-dark)', 
                        borderRadius: '14px', 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '0.75rem', 
                        border: '1px solid var(--glass-border)',
                        animation: 'fadeIn 0.3s ease-out'
                    }}>
                        <FileText size={20} color="var(--accent)" />
                        <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>{file.name}</span>
                    </div>
                )}

                {file && (
                    <button
                        onClick={handleUpload}
                        disabled={loading}
                        className="btn primary"
                        style={{ minWidth: '200px', borderRadius: '14px', marginTop: '1rem' }}
                    >
                        {loading ? <RefreshCw className="spin" size={18} /> : 'Start Analysis'}
                    </button>
                )}
                {error && <div style={{ color: 'var(--danger)', marginTop: '1.5rem', padding: '0.75rem 1.5rem', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>{error}</div>}
            </div>

            {loading && !analysis && (
                <div className="grid">
                    <div className="card skeleton" style={{ height: '160px' }}></div>
                    <div className="card skeleton" style={{ height: '160px' }}></div>
                </div>
            )}

            {analysis && (
                <div className="analysis-results" style={{ animation: 'slideInUp 0.6s ease-out' }}>
                    <div className="grid" style={{ marginBottom: '3rem' }}>
                        <div className="card flex-col" style={{ position: 'relative' }}>
                            <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
                                <div>
                                    <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>ATS Optimization Score</h3>
                                    <p className="text-sm">Evaluated across 12+ industry standard benchmarks.</p>
                                </div>
                                <div style={{ 
                                    fontSize: '3.5rem', 
                                    fontWeight: '900', 
                                    color: analysis.score > 70 ? 'var(--success)' : 'var(--warning)',
                                    textShadow: analysis.score > 70 ? '0 0 20px rgba(16, 185, 129, 0.2)' : 'none'
                                }}>
                                    {analysis.score}<span style={{ fontSize: '1.5rem', color: 'var(--text-muted)', fontWeight: '400' }}>/100</span>
                                </div>
                            </div>
                            
                            <div style={{ marginTop: 'auto' }}>
                                <button 
                                    className="nav-item" 
                                    onClick={() => setShowCriteria(!showCriteria)}
                                    style={{ width: '100%', justifyContent: 'center', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)' }}
                                >
                                    {showCriteria ? 'Collapse Detailed Metrics' : 'Expand Detailed Metrics'}
                                </button>
                                
                                {showCriteria && (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem', marginTop: '1.25rem' }}>
                                        {analysis.score_criteria?.map((crt, idx) => {
                                            const match = crt.match(/^(.*?)\s*\((.*?)\)/);
                                            if (match) {
                                                let title = match[1].trim();
                                                if (title === "ATS Compatibility") title = "ATS Engine";
                                                const score = match[2];
                                                return (
                                                    <div key={idx} style={{ padding: '0.875rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                                        <div className="text-muted" style={{ fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase' }}>{title}</div>
                                                        <div style={{ fontWeight: '800', color: 'var(--primary)', fontSize: '1.1rem' }}>{score}</div>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="card">
                            <h3 style={{ marginBottom: '1.25rem' }}>Extracted Skill Graph</h3>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                                {analysis.skills.map(skill => (
                                    <span key={skill} style={{ 
                                        background: 'rgba(56, 189, 248, 0.08)', 
                                        color: 'var(--accent)', 
                                        padding: '0.5rem 1.25rem', 
                                        borderRadius: '14px', 
                                        fontSize: '0.9rem', 
                                        fontWeight: '700', 
                                        border: '1px solid rgba(56, 189, 248, 0.15)',
                                        boxShadow: '0 4px 12px rgba(56, 189, 248, 0.05)'
                                    }}>
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {recommendedJobs.length > 0 && (
                        <div>
                            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
                                <div className="brand-dot"></div> Best Career Matches
                            </h2>
                            <div className="grid">
                                {recommendedJobs.map(job => (
                                    <div key={job.id} className="card flex-col" style={{ gap: '1.5rem' }}>
                                        <div className="flex-between">
                                            <div>
                                                <h3 style={{ fontSize: '1.25rem', color: '#fff' }}>{job.title}</h3>
                                                <p className="text-sm text-muted">{job.company}</p>
                                            </div>
                                            <div className="badge success">{job.match_score}% Match</div>
                                        </div>

                                        <div className="text-sm" style={{ padding: '0.75rem 1rem', background: 'rgba(16, 185, 129, 0.03)', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.15)', color: 'var(--success)' }}>
                                            <strong style={{ fontWeight: '800' }}>SKILL MATCH:</strong> {analysis.skills.filter(s => job.required_skills?.some(js => js.toLowerCase() === s.toLowerCase())).join(", ") || "Core Requirements Meta"}
                                        </div>

                                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                                            <button
                                                onClick={() => navigate('/test', { state: { role: job.title } })}
                                                className="btn primary"
                                                style={{ flex: 1, borderRadius: '12px' }}
                                            >
                                                Interview Setup
                                            </button>
                                            
                                            {job.apply_link && (
                                                <a 
                                                    href={job.apply_link} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer" 
                                                    className="icon-btn" 
                                                    style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '0.75rem' }}
                                                    title="Apply Now"
                                                >
                                                    <ExternalLink size={20} />
                                                </a>
                                            )}
                                        </div>

                                        {job.missing_skills?.length > 0 && (
                                            <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '1.25rem' }}>
                                                <div className="text-muted" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '700', fontSize: '0.75rem', marginBottom: '0.75rem', textTransform: 'uppercase' }}>
                                                    <AlertCircle size={14} color="var(--warning)" /> Gap Bridge Resources
                                                </div>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                    {job.missing_skills.map(skill => {
                                                        const linkObj = job.learn_more_links?.find(l => l.skill === skill);
                                                        return (
                                                            <a
                                                                key={skill}
                                                                href={linkObj ? linkObj.url : `https://www.google.com/search?q=learn+${skill}`}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="nav-item"
                                                                style={{ margin: 0, padding: '0.4rem 0.8rem', fontSize: '0.75rem', border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.02)' }}
                                                            >
                                                                {skill} ↗
                                                            </a>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
