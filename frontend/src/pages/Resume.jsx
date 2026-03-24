import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';

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
            <h1 style={{ marginBottom: '2rem' }}>Resume Analysis</h1>

            <div className="card" style={{ padding: '3rem', border: '2px dashed var(--border)', textAlign: 'center', marginBottom: '2rem', background: 'transparent' }}>
                <input
                    type="file"
                    id="resume-upload"
                    accept=".pdf"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                />
                <label htmlFor="resume-upload" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ padding: '1.5rem', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '50%', color: 'var(--primary)' }}>
                        <Upload size={32} />
                    </div>
                    <div>
                        <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Click to upload</span> or drag and drop
                        <br />
                        <span className="text-sm text-muted">PDF only (Max 5MB)</span>
                    </div>
                </label>

                {file && (
                    <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--bg-card)', borderRadius: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.75rem', border: '1px solid var(--border)' }}>
                        <FileText size={20} color="var(--accent)" />
                        {file.name}
                    </div>
                )}

                {file && (
                    <div style={{ marginTop: '1.5rem' }}>
                        <button
                            onClick={handleUpload}
                            disabled={loading}
                            className="btn primary"
                            style={{ minWidth: '150px' }}
                        >
                            {loading ? 'Analyzing...' : 'Analyze Now'}
                        </button>
                    </div>
                )}
                {error && <div style={{ color: 'var(--danger)', marginTop: '1rem', padding: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '0.5rem' }}>{error}</div>}
            </div>

            {loading && !analysis && (
                <div className="grid">
                    <div className="card skeleton" style={{ height: '120px' }}></div>
                    <div className="card skeleton" style={{ height: '120px' }}></div>
                </div>
            )}

            {analysis && (
                <div className="analysis-results">
                    {/* Score and Skills Grid */}
                    <div className="grid" style={{ marginBottom: '2rem' }}>
                        <div className="card flex-col">
                            <div className="flex-between">
                                <div>
                                    <h3 style={{ margin: '0 0 0.5rem 0' }}>Resume Score</h3>
                                    <div className="text-sm text-muted">Based on impact, keywords, and clarity.</div>
                                </div>
                                <div style={{ fontSize: '3.5rem', fontWeight: '800', color: analysis.score > 70 ? 'var(--success)' : 'var(--warning)', alignSelf: 'flex-start' }}>
                                    {analysis.score}/100
                                </div>
                            </div>
                            
                            {analysis.score_criteria && analysis.score_criteria.length > 0 && (
                                <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                                    <button 
                                        className="btn outline" 
                                        onClick={() => setShowCriteria(!showCriteria)}
                                        style={{ width: '100%', justifyContent: 'center', marginBottom: showCriteria ? '1rem' : '0' }}
                                    >
                                        {showCriteria ? 'Hide Score Breakdown' : 'View Score Breakdown'}
                                    </button>
                                    
                                    {showCriteria && (
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
                                            {analysis.score_criteria.map((crt, idx) => {
                                                const match = crt.match(/^(.*?)\s*\((.*?)\)/);
                                                if (match) {
                                                    let title = match[1].trim();
                                                    // Shorten titles if desired (e.g., ATS Compatibility -> ATS)
                                                    if (title === "ATS Compatibility") title = "ATS";
                                                    const fractionScore = match[2]; // Captures e.g "8/10" directly
                                                    return (
                                                        <div key={idx} style={{ padding: '0.75rem', background: 'var(--bg-dark)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <strong style={{ fontSize: '0.85rem' }}>{title}</strong>
                                                            <span style={{ fontWeight: 'bold', color: 'var(--primary)', fontSize: '0.9rem' }}>{fractionScore}</span>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="card">
                            <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Identified Skills</h3>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                                {analysis.skills.map(skill => (
                                    <span key={skill} style={{ background: 'rgba(6, 182, 212, 0.15)', color: 'var(--accent)', padding: '0.4rem 1rem', borderRadius: '2rem', fontSize: '0.9rem', fontWeight: 'bold', border: '1px solid rgba(6, 182, 212, 0.2)' }}>
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Recommended Roles Section */}
                    {recommendedJobs.length > 0 && (
                        <div>
                            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                <CheckCircle className="accent-icon" color="var(--success)" /> Recommended Roles For You
                            </h2>
                            <div className="grid">
                                {recommendedJobs.map(job => (
                                    <div key={job.id} className="card flex-col gap-md">
                                        <div className="flex-between" style={{ alignItems: 'flex-start' }}>
                                            <div>
                                                <h3 style={{ margin: '0 0 0.25rem 0' }}>{job.title}</h3>
                                                <div className="text-sm text-muted">{job.company}</div>
                                            </div>
                                            <span className="badge success">{job.match_score}% Match</span>
                                        </div>

                                        <div className="text-sm text-muted">
                                            Matches your skills: <span style={{ color: 'var(--text-primary)' }}>{analysis.skills.filter(s => job.required_skills.some(js => js.toLowerCase() === s.toLowerCase())).join(", ") || "Multiple"}</span>
                                        </div>

                                        <button
                                            onClick={() => navigate('/test', { state: { role: job.title } })}
                                            className="btn primary"
                                            style={{ marginTop: 'auto', width: '100%', justifyContent: 'center' }}
                                        >
                                            Start Mock Interview
                                        </button>
                                        
                                        {job.apply_link && (
                                            <a 
                                                href={job.apply_link} 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                className="btn outline" 
                                                style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem', textDecoration: 'none', display: 'inline-block', textAlign: 'center', boxSizing: 'border-box' }}
                                            >
                                                Apply on {job.source || "Website"} ↗
                                            </a>
                                        )}

                                        {/* Course Recommendations */}
                                        {job.missing_skills && job.missing_skills.length > 0 && (
                                            <div style={{ marginTop: '0.5rem', padding: '1rem', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: 'var(--radius-sm)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--warning)', fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '0.75rem' }}>
                                                    <AlertCircle size={16} /> Missing Skills & Resources
                                                </div>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                    {job.missing_skills.map(skill => {
                                                        const linkObj = job.learn_more_links.find(l => l.skill === skill);
                                                        return (
                                                            <a
                                                                key={skill}
                                                                href={linkObj ? linkObj.url : `https://www.google.com/search?q=learn+${skill}`}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                style={{
                                                                    fontSize: '0.8rem',
                                                                    padding: '0.3rem 0.8rem',
                                                                    background: 'var(--bg-dark)',
                                                                    color: 'var(--text-primary)',
                                                                    border: '1px solid var(--warning)',
                                                                    borderRadius: '2rem',
                                                                    textDecoration: 'none',
                                                                    fontWeight: '600',
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: '0.25rem',
                                                                    transition: 'all 0.2s'
                                                                }}
                                                            >
                                                                Learn {skill} ↗
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
