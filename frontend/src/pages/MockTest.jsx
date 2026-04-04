import React, { useState, useEffect, useRef } from 'react';
import { Play, Send, Award, RefreshCw, Briefcase, Mic, MicOff, Camera, Volume2, Video } from 'lucide-react';
import { useLocation } from 'react-router-dom';

export default function MockTest() {
    const location = useLocation();
    const videoRef = useRef(null);
    const recognitionRef = useRef(null);

    // Setup State
    const [role, setRole] = useState('Software Engineer');
    const [testType, setTestType] = useState('Technical');
    const [hasPermissions, setHasPermissions] = useState(false);

    // Interview State
    const [interviewMode, setInterviewMode] = useState('single');
    const [currentRound, setCurrentRound] = useState(1);
    const [qCount, setQCount] = useState(0);

    const [questionHistory, setQuestionHistory] = useState([]);
    const [questionData, setQuestionData] = useState(null);
    const [userAnswer, setUserAnswer] = useState('');
    const [feedback, setFeedback] = useState(null);
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState('setup'); // setup, round-intro, interview, feedback, complete

    // Media State
    const [isAiSpeaking, setIsAiSpeaking] = useState(false);
    const [isListening, setIsListening] = useState(false);


    const [difficulty, setDifficulty] = useState('Beginner');

    const ROUNDS = {
        1: { name: 'Introduction', type: 'HR', limit: 10 },
        2: { name: 'Technical Deep Dive', type: 'Technical', limit: 10 },
        3: { name: 'Behavioral / Culture Fit', type: 'HR', limit: 10 }
    };

    // --- Init & Permissions ---
    useEffect(() => {
        if (location.state?.role) {
            setRole(location.state.role);
        }

        // Initialize Speech Recognition
        if ('webkitSpeechRecognition' in window) {
            const SpeechRecognition = window.webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;

            recognitionRef.current.onresult = (event) => {
                let interimTranscript = '';
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }
                // Append to existing answer or just update
                if (finalTranscript) {
                    setUserAnswer(prev => prev + ' ' + finalTranscript);
                }
            };

            recognitionRef.current.onerror = (event) => {
                console.error("Speech error", event);
                setIsListening(false);
            };

            recognitionRef.current.onend = () => {
                if (isListening) {
                    setIsListening(false);
                }
            }
        }
    }, [location]);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            setHasPermissions(true);
        } catch (err) {
            alert("Camera/Mic access is required for the Video Interview experience.");
            console.error(err);
        }
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const tracks = videoRef.current.srcObject.getTracks();
            tracks.forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
        setHasPermissions(false);
    };

    // --- TTS Logic ---
    const speakText = (text) => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel(); // Stop previous
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.onstart = () => setIsAiSpeaking(true);
            utterance.onend = () => setIsAiSpeaking(false);

            // Pick a nice voice if available
            const voices = window.speechSynthesis.getVoices();
            const preferredVoice = voices.find(v => v.name.includes("Google US English") || v.name.includes("Samantha"));
            if (preferredVoice) utterance.voice = preferredVoice;

            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            window.speechSynthesis.speak(utterance);
        }
    };

    const stopSpeaking = () => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            setIsAiSpeaking(false);
        }
    };

    // --- STT Logic ---
    const toggleMic = () => {
        if (!recognitionRef.current) {
            alert("Speech recognition not supported in this browser. Please use Chrome.");
            return;
        }

        if (isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        } else {
            recognitionRef.current.start();
            setIsListening(true);
            stopSpeaking(); // Stop AI if user interrupts
        }
    };

    // --- Interview Flow ---

    const startFullInterview = async () => {
        await startCamera();
        setInterviewMode('full');
        setCurrentRound(1);
        setQCount(0);
        setDifficulty('Beginner');
        setQuestionHistory([]);
        setTestType('HR'); // Start with HR/Intro
        setStep('round-intro');
    };


    const fetchQuestion = async (context = {}) => {
        if (loading) return;
        setLoading(true);
        stopSpeaking();
        try {
            let typeToSend = testType;
            if (interviewMode === 'full') {
                typeToSend = ROUNDS[currentRound].type;
            }

            const response = await fetch('http://localhost:8001/interview/question', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    role,
                    type: typeToSend,
                    history: questionHistory,
                    previous_question: context.question,
                    user_answer: context.answer,
                    previous_score: context.score,
                    current_level: difficulty
                }),
            });
            const data = await response.json();
            setQuestionData(data);
            if (data.difficulty) setDifficulty(data.difficulty);
            setQuestionHistory(prev => [...prev, data.question]);
            setStep('interview');
            setFeedback(null);
            setUserAnswer('');

            // Auto-Speak Question
            setTimeout(() => speakText(data.question), 500);

        } catch (err) {
            alert("Failed to fetch question.");
            setStep('setup');
        } finally {
            setLoading(false);
        }
    };

    const submitAnswer = async () => {
        if (!userAnswer && !userAnswer.trim()) return;
        setLoading(true);
        stopSpeaking();
        if (isListening) toggleMic(); // Stop listening

        try {
            const response = await fetch('http://localhost:8001/interview/answer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question: questionData.question,
                    answer: userAnswer,
                    role: role
                }),
            });
            const data = await response.json();
            setFeedback(data);
            setStep('feedback');

            // Auto-speak feedback highlights
            const shortFeedback = `You scored ${data.score} out of 10. ${data.feedback.split('.')[0]}.`;
            setTimeout(() => speakText(shortFeedback), 500);

        } catch (err) {
            alert("Failed to submit answer.");
        } finally {
            setLoading(false);
        }
    };

    const switchRound = (roundId) => {
        stopSpeaking();
        if (isListening) toggleMic();
        setCurrentRound(roundId);
        setQCount(0);
        setQuestionHistory([]);
        setDifficulty('Beginner');
        setFeedback(null);
        setUserAnswer('');
        setStep('round-intro');
    };

    const nextQuestion = () => {
        const lastContext = {
            question: questionData?.question,
            answer: userAnswer,
            score: feedback?.score
        };

        stopSpeaking();
        setFeedback(null); // Clear previous feedback immediately
        setUserAnswer(''); // Clear previous answer

        if (interviewMode === 'single') {
            fetchQuestion(lastContext);
            return;
        }
        const nextQ = qCount + 1;
        if (nextQ >= ROUNDS[currentRound].limit) {
            // Reached face-to-face round limit, ask them to switch to the next round manually
            setStep('complete');
        } else {
            setQCount(nextQ);
            fetchQuestion(lastContext);
        }
    };




    // --- Render ---
    return (
        <div className="page-container" style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>

            {/* Setup Screen */}
            {step === 'setup' && (
                <div style={{ maxWidth: '800px', margin: 'auto', width: '100%', padding: '4rem 1rem', animation: 'fadeIn 0.8s ease-out' }}>
                    <div className="card" style={{ 
                        background: 'var(--glass-bg)', 
                        backdropFilter: 'blur(12px)',
                        border: '1px solid var(--glass-border)', 
                        padding: '4rem', 
                        textAlign: 'center', 
                        borderRadius: '32px',
                        boxShadow: '0 40px 100px -20px rgba(0,0,0,0.5)'
                    }}>
                        <div style={{ 
                            padding: '2rem', 
                            background: 'rgba(139, 92, 246, 0.08)', 
                            borderRadius: '24px', 
                            color: 'var(--primary)', 
                            width: 'fit-content', 
                            margin: '0 auto 2.5rem',
                            border: '1px solid rgba(139, 92, 246, 0.2)',
                            boxShadow: '0 0 30px var(--primary-glow)'
                        }}>
                            <Video size={48} />
                        </div>
                        <h1 style={{ fontSize: '3rem', marginBottom: '1.25rem', color: '#fff', fontWeight: '800', letterSpacing: '-0.02em' }}>
                            Next-Gen <span style={{ color: 'var(--primary)' }}>AI Interviewer</span>
                        </h1>
                        <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', marginBottom: '3rem', lineHeight: '1.6' }}>
                            Experience a high-fidelity, industrial-grade simulation with real-time AI feedback and professional scoring.
                        </p>

                        <div style={{ textAlign: 'left', marginBottom: '3rem', maxWidth: '400px', margin: '0 auto 3rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontWeight: '700', fontSize: '0.75rem', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                <Briefcase size={14} /> Target Career Role
                            </label>
                            <input
                                type="text"
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                placeholder="e.g. Senior Frontend Engineer"
                                style={{ 
                                    padding: '1.25rem', 
                                    borderRadius: '16px', 
                                    fontSize: '1.1rem',
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid var(--glass-border)'
                                }}
                            />
                        </div>

                        <button 
                            onClick={startFullInterview} 
                            className="btn primary" 
                            style={{ 
                                margin: '0 auto',
                                width: 'fit-content', 
                                padding: '1.25rem 3.5rem', 
                                fontSize: '1.2rem', 
                                borderRadius: '18px',
                                textTransform: 'uppercase',
                                fontWeight: '800',
                                letterSpacing: '0.05em'
                            }}
                        >
                            <Camera size={24} /> Enter Session
                        </button>
                    </div>
                </div>
            )}

            {/* Main Video Interface */}
            {(step === 'interview' || step === 'feedback' || step === 'round-intro' || step === 'complete') && (
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '100%', animation: 'fadeIn 0.5s ease' }}>
                    {interviewMode === 'full' && (
                        <div style={{ 
                            display: 'flex', 
                            gap: '1rem', 
                            padding: '1rem 2.5rem', 
                            background: 'rgba(15, 23, 42, 0.4)', 
                            backdropFilter: 'blur(10px)',
                            borderBottom: '1px solid var(--glass-border)', 
                            justifyContent: 'center',
                            zIndex: 10
                        }}>
                            {[1, 2, 3].map((roundNum) => (
                                <button
                                    key={roundNum}
                                    onClick={() => step !== 'setup' ? switchRound(roundNum) : null}
                                    className={`nav-item ${currentRound === roundNum ? 'active' : ''}`}
                                    style={{ 
                                        flex: 1, 
                                        maxWidth: '240px', 
                                        justifyContent: 'center', 
                                        margin: 0,
                                        padding: '0.75rem 1.25rem',
                                        fontSize: '0.85rem'
                                    }}
                                >
                                    R{roundNum}: {ROUNDS[roundNum].name}
                                </button>
                            ))}
                        </div>
                    )}
                    
                    <div className="interview-layout" style={{ flex: 1, padding: '2rem', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem' }}>
                        {/* Left: Video Feed & Questions */}
                        <div className="video-frame" style={{ 
                            position: 'relative', 
                            borderRadius: '32px', 
                            overflow: 'hidden', 
                            background: '#000',
                            boxShadow: '0 50px 100px -30px rgba(0,0,0,0.6)',
                            border: '1px solid var(--glass-border)',
                            height: 'fit-content',
                            aspectRatio: '16/10'
                        }}>
                            <video
                                ref={videoRef}
                                autoPlay
                                muted
                                playsInline
                                className="video-feed"
                                style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }}
                            />

                            {/* Status Badge */}
                            <div className="rec-badge" style={{ 
                                position: 'absolute', 
                                top: '1.5rem', 
                                right: '1.5rem', 
                                background: 'rgba(239, 68, 68, 0.15)', 
                                padding: '0.6rem 1rem', 
                                borderRadius: '12px', 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '0.6rem',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                backdropFilter: 'blur(8px)'
                            }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', animation: 'pulse-animation 1s infinite' }}></div>
                                <span style={{ color: '#ef4444', fontWeight: '800', fontSize: '0.75rem', letterSpacing: '0.1em' }}>LIVE SESSION</span>
                            </div>

                            {/* Overlay: AI Question */}
                            {step === 'interview' && questionData && (
                                <div className="question-overlay" style={{ 
                                    position: 'absolute', 
                                    bottom: '1.5rem', 
                                    left: '1.5rem', 
                                    right: '1.5rem', 
                                    background: 'rgba(15, 23, 42, 0.6)', 
                                    backdropFilter: 'blur(20px)',
                                    border: '1px solid var(--glass-border)',
                                    borderRadius: '24px',
                                    padding: '2rem',
                                    animation: 'slideInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--primary)' }}>
                                            <div className="brand-dot"></div>
                                            <span style={{ fontWeight: '800', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>AI Interviewer</span>
                                            {isAiSpeaking && <Volume2 size={16} className="pulse" />}
                                        </div>
                                        <div className="badge warning" style={{ padding: '0.25rem 0.75rem', fontSize: '0.65rem' }}>
                                            {difficulty.toUpperCase()}
                                        </div>
                                    </div>
                                    <h3 style={{ margin: 0, fontSize: '1.4rem', color: '#fff', lineHeight: '1.5', fontWeight: '500' }}>
                                        "{questionData.question}"
                                    </h3>
                                    {questionData.hint && (
                                        <div style={{ 
                                            marginTop: '1.25rem', 
                                            padding: '0.75rem 1rem', 
                                            background: 'rgba(255, 255, 255, 0.03)', 
                                            borderRadius: '12px', 
                                            border: '1px solid rgba(255, 255, 255, 0.05)',
                                            fontSize: '0.85rem', 
                                            color: 'var(--text-secondary)', 
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem'
                                        }}>
                                            <span style={{ color: 'var(--primary)', fontWeight: '700' }}>HINT:</span> {questionData.hint}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Round Intro Overlay */}
                            {step === 'round-intro' && (
                                <div style={{ 
                                    position: 'absolute', 
                                    inset: 0, 
                                    background: 'rgba(11, 15, 21, 0.9)', 
                                    backdropFilter: 'blur(10px)',
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    zIndex: 20,
                                    padding: '2rem',
                                    textAlign: 'center'
                                }}>
                                    <div style={{ 
                                        padding: '1rem 2rem', 
                                        borderRadius: '100px', 
                                        background: 'rgba(139, 92, 246, 0.1)', 
                                        color: 'var(--primary)', 
                                        fontWeight: '800', 
                                        fontSize: '0.8rem', 
                                        textTransform: 'uppercase', 
                                        marginBottom: '1rem',
                                        border: '1px solid rgba(139, 92, 246, 0.2)'
                                    }}>
                                        Round {currentRound} of 3
                                    </div>
                                    <h2 style={{ fontSize: '3.5rem', color: '#fff', marginBottom: '1rem', fontWeight: '800' }}>{ROUNDS[currentRound].name}</h2>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: '500px', marginBottom: '2.5rem' }}>
                                        Prepare yourself for the {ROUNDS[currentRound].type} assessment phase.
                                    </p>
                                    <button onClick={fetchQuestion} className="btn primary" style={{ padding: '1rem 3.5rem', fontSize: '1.2rem', borderRadius: '16px' }}>
                                        Begin Assessment
                                    </button>
                                </div>
                            )}

                            {/* Feedback Overlay was here but has been removed as it's redundant with the right-side Insight Report */}

                            {/* Complete Overlay for Round */}
                            {step === 'complete' && (
                                <div style={{ 
                                    position: 'absolute', 
                                    inset: 0, 
                                    background: 'rgba(11, 15, 21, 0.95)', 
                                    backdropFilter: 'blur(20px)',
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    padding: '3rem', 
                                    textAlign: 'center', 
                                    zIndex: 50 
                                }}>
                                    <div style={{ 
                                        width: '100px', 
                                        height: '100px', 
                                        borderRadius: '24px', 
                                        background: 'rgba(16, 185, 129, 0.1)', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center',
                                        marginBottom: '2rem',
                                        border: '1px solid rgba(16, 185, 129, 0.2)',
                                        fontSize: '3rem'
                                    }}>
                                        ✅
                                    </div>
                                    <h1 style={{ fontSize: '2.5rem', color: '#fff', marginBottom: '1rem', fontWeight: '800' }}>Phase Completed</h1>
                                    <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', maxWidth: '500px', lineHeight: 1.6, marginBottom: '3rem' }}>
                                        You've successfully finished all assessment items for Round {currentRound}. Proceed to the next phase from the navigation bar.
                                    </p>
                                    
                                    <button
                                        onClick={() => {stopCamera(); setStep('setup');}}
                                        className="btn outline"
                                        style={{ padding: '1rem 3rem', borderRadius: '16px' }}
                                    >
                                        Return to Selection
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Right: Controls & Transcript */}
                        <div className="control-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div className="answer-card" style={{ 
                                background: 'var(--glass-bg)', 
                                border: '1px solid var(--glass-border)', 
                                padding: '2rem', 
                                borderRadius: '24px',
                                display: 'flex', 
                                flexDirection: 'column', 
                                gap: '1.5rem'
                            }}>
                            {step === 'feedback' && feedback ? (
                                /* --- Feedback / Result Mode --- */
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', height: '100%', animation: 'fadeIn 0.5s ease-out' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <h3 style={{ margin: 0, color: 'var(--primary)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.8rem' }}>Insight Report</h3>
                                        <span className="badge success">COMPLETED</span>
                                    </div>

                                    <div style={{ 
                                        padding: '1.5rem', 
                                        background: 'rgba(255,255,255,0.02)', 
                                        borderRadius: '20px', 
                                        border: '1px solid var(--glass-border)',
                                        textAlign: 'center'
                                    }}>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Efficiency Score</div>
                                        <div style={{ fontSize: '3.5rem', fontWeight: '900', color: feedback.score > 7 ? 'var(--success)' : 'var(--warning)' }}>
                                            {feedback.score}<span style={{ fontSize: '1.2rem', opacity: 0.5 }}>/10</span>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <h4 style={{ margin: 0, color: '#fff', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <div style={{ width: '4px', height: '16px', background: 'var(--primary)', borderRadius: '2px' }}></div>
                                            Detailed Analysis
                                        </h4>
                                        <p style={{ lineHeight: '1.7', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                                            {feedback.feedback}
                                        </p>
                                    </div>

                                    {feedback.correct_answer_summary && (
                                        <div style={{ 
                                            background: 'rgba(16, 185, 129, 0.05)', 
                                            border: '1px solid rgba(16, 185, 129, 0.15)', 
                                            padding: '1.5rem', 
                                            borderRadius: '20px' 
                                        }}>
                                            <div style={{ color: 'var(--success)', fontWeight: '800', marginBottom: '0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                                <Award size={16} /> IDEAL REFERENCE
                                            </div>
                                            <p style={{ margin: 0, fontSize: '0.95rem', color: '#d1fae5', lineHeight: '1.6' }}>
                                                {feedback.correct_answer_summary}
                                            </p>
                                        </div>
                                    )}

                                    <button
                                        onClick={nextQuestion}
                                        className="btn primary"
                                        style={{ justifyContent: 'center', padding: '1.25rem', fontSize: '1rem', marginTop: 'auto', borderRadius: '16px' }}
                                        disabled={loading}
                                    >
                                        {loading ? <RefreshCw className="spin" size={20} /> : <><Play size={20} /> Proceed to Next</>}
                                    </button>
                                </div>
                            ) : (
                                /* --- Input / Answer Mode --- */
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <h3 style={{ margin: 0, color: 'var(--primary)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.8rem' }}>Live Transcript</h3>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', fontWeight: '700', color: isListening ? 'var(--danger)' : 'var(--text-muted)' }}>
                                            {isListening && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--danger)', animation: 'pulse-animation 1s infinite' }}></div>}
                                            {isListening ? 'LISTENING...' : 'VOICE INACTIVE'}
                                        </div>
                                    </div>

                                    <textarea
                                        value={userAnswer}
                                        onChange={(e) => setUserAnswer(e.target.value)}
                                        placeholder="Formulate your response here. You can type manually or use the voice recording feature..."
                                        style={{ 
                                            flex: 1,
                                            background: 'rgba(255,255,255,0.02)',
                                            border: '1px solid var(--glass-border)',
                                            borderRadius: '20px',
                                            padding: '1.5rem',
                                            fontSize: '1rem',
                                            color: '#fff',
                                            lineHeight: '1.6',
                                            minHeight: '200px'
                                        }}
                                    />

                                    <div className="grid" style={{ gridTemplateColumns: '1fr 1.5fr', gap: '1rem', marginTop: 'auto' }}>
                                        <button
                                            onClick={toggleMic}
                                            className="btn"
                                            style={{
                                                background: isListening ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.05)',
                                                border: `1px solid ${isListening ? 'var(--danger)' : 'var(--glass-border)'}`,
                                                color: isListening ? 'var(--danger)' : '#fff',
                                                justifyContent: 'center',
                                                borderRadius: '16px'
                                            }}
                                        >
                                            {isListening ? <><MicOff size={20} /> Stop</> : <><Mic size={20} /> Record</>}
                                        </button>

                                        <button
                                            onClick={submitAnswer}
                                            className="btn primary"
                                            disabled={!userAnswer.trim() || loading}
                                            style={{ justifyContent: 'center', borderRadius: '16px' }}
                                        >
                                            {loading ? <RefreshCw className="spin" size={20} /> : <><Send size={20} /> Submit Response</>}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Tips Card */}
                        <div className="card" style={{ 
                            padding: '1.5rem', 
                            background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.05), rgba(139, 92, 246, 0.05))', 
                            border: '1px solid var(--glass-border)',
                            borderRadius: '20px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                                <Award size={18} color="var(--accent)" />
                                <h4 style={{ margin: 0, color: 'var(--accent)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '800' }}>Engagement Tip</h4>
                            </div>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>
                                {step === 'feedback'
                                    ? "Compare your response to the ideal reference. Focus on specific technical keywords and structural logic."
                                    : "Keep your response concise but structured. Use the STAR method for behavioral questions. The AI evaluates both content and clarity."
                                }
                            </p>
                        </div>
                    </div>
                    </div>
                </div>
            )}

            <style>{`
                .pulse { animation: pulse-animation 1.5s infinite; }
                @keyframes pulse-animation {
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.2); opacity: 0.7; }
                    100% { transform: scale(1); opacity: 1; }
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes slideInUp {
                    from { transform: translateY(30px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
}
