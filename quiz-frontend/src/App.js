import React, { useState, useEffect } from "react";
import { jsPDF } from "jspdf";
import "./App.css";

const quizTypes = [
  { label: "Multiple Choice", value: "mcq" },
  { label: "True / False", value: "tf" },
  { label: "Fill in the Blanks", value: "fib" },
  { label: "Video Based", value: "video" },
  { label: "URL Based", value: "url" },
];

export default function App() {
  const [step, setStep] = useState("auth");
  const [authStep, setAuthStep] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [file, setFile] = useState(null);
  const [quizType, setQuizType] = useState("mcq");
  const [quiz, setQuiz] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [url, setUrl] = useState("");
  const [userProfile, setUserProfile] = useState(null);
  const [quizSource, setQuizSource] = useState("");
  const [quizHistory, setQuizHistory] = useState([]);
  const [pdfBlob, setPdfBlob] = useState(null);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfUrl, setPdfUrl] = useState("");
  const [showResultModal, setShowResultModal] = useState(false);






  // New state variables for quiz functionality
  const [timeLeft, setTimeLeft] = useState(300); // or quizTimeLimit
  const timerClass = `quiz-timer ${timeLeft <= 10 ? 'warning' : ''}`;

  const [userAnswers, setUserAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);
  const [quizStarted, setQuizStarted] = useState(false);

  const isValidUrl = (urlString) => {
    try {
      new URL(urlString);
      return true;
    } catch (e) {
      return false;
    }
  };

  // Timer effect
  useEffect(() => {
    if (!quizStarted || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleQuizSubmit(); // Auto-submit when time runs out
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [quizStarted, timeLeft]);

  // Format time for display (MM:SS)
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswerSelect = (questionId, selectedAnswer) => {
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: selectedAnswer
    }));
  };

  const calculateScore = () => {
    let correctCount = 0;
    quiz.forEach(q => {
      if (userAnswers[q.id] === q.answer) {
        correctCount++;
      }
    });
    return {
      score: correctCount,
      total: quiz.length,
      percentage: Math.round((correctCount / quiz.length) * 100)
    };
  };
    
  const handleQuizSubmit = () => {
    setQuizStarted(false);
    const result = calculateScore();
    setScore(result);
    setShowResults(true);

    const quizDate = new Date().toLocaleDateString();
    const newQuiz = {
      title: `Quiz ${quizHistory.length + 1} - ${quizDate}`,
      questions: [...quiz],
      dateCreated: quizDate,
      type: quizType,
      source: quizSource,
      pdf: null, // Will be filled later
      score: result.score,
      total: result.total,
      percentage: result.percentage
    };

    setQuizHistory(prev => [...prev, newQuiz]);
  };


  const startQuiz = () => {
    setUserAnswers({});
    setShowResults(false);
    setQuizStarted(true);
    setTimeLeft(300); // Reset timer to 5 minutes
  };

  const updateProfileStats = () => {
    if (userProfile) {
      setUserProfile({
        ...userProfile,
        quizzesGenerated: quizHistory.length,
        lastActive: new Date().toLocaleDateString(),
      });
    }
  };

  const handleRegister = async () => {
    try {
      const res = await fetch("http://localhost:8000/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok) {
        alert("Registration successful! Please login.");
        setAuthStep("login");
      } else {
        alert(data.message || "Registration failed");
      }
    } catch (error) {
      alert("Registration error: " + error.message);
    }
  };

  const handleLogin = async () => {
    try {
      const formData = new URLSearchParams();
      formData.append("username", username);
      formData.append("password", password);

      const res = await fetch("http://localhost:8000/login", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      
      if (res.ok) {
        const newProfile = {
          username,
          email: `${username}@example.com`,
          joinedDate: new Date().toISOString().split('T')[0],
          quizzesGenerated: 0,
          downloads: 0,
          lastActive: new Date().toLocaleDateString(),
        };
        setUserProfile(newProfile);
        setStep("upload");
      } else {
        alert(data.message || "Login failed");
      }
    } catch (error) {
      alert("Login error: " + error.message);
    }
  };

  const handleUpload = async () => {
    if ((quizType !== "url" && !file) || (quizType === "url" && !url)) {
      alert("Please provide the required input");
      return;
    }
    
    if (quizType === "url" && !isValidUrl(url)) {
      alert("Please enter a valid URL");
      return;
    }

    setLoading(true);

    const formData = new FormData();
    if (file) formData.append("file", file);
    formData.append("quiz_type", quizType);
    if (url) formData.append("url", url);

    try {
      const res = await fetch("http://localhost:8000/generate-quiz", {
        method: "POST",
        body: formData,
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Failed to generate quiz");
      }
      
      const data = await res.json();
      // Add unique IDs to questions for answer tracking
      const quizWithIds = data.quiz.map((q, index) => ({
        ...q,
        id: index + 1
      }));
      setQuiz(quizWithIds);
      setQuizSource(quizType === "url" ? url : file ? file.name : "content");
      setStep("preview");
      
      // Update quiz generation count
      setUserProfile(prev => ({
        ...prev,
        quizzesGenerated: (prev.quizzesGenerated || 0) + 1
      }));
    } catch (error) {
      alert(`Error: ${error.message}`);
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    let yPosition = 10;
    const pageHeight = doc.internal.pageSize.height;
    const maxLineWidth = 180;

    // Title
    doc.setFontSize(18);
    doc.setTextColor(0, 102, 204);
    doc.text(`Quiz Generated from: ${quizSource}`, 10, yPosition);
    yPosition += 12;

    // Loop through questions
    quiz.forEach((q, i) => {
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);

      // Wrap long questions
      const questionLines = doc.splitTextToSize(`${i + 1}. ${q.question}`, maxLineWidth);
      doc.text(questionLines, 10, yPosition);
      yPosition += questionLines.length * 7;

      if (q.options && q.options.length > 0) {
        doc.setFontSize(12);
        q.options.forEach((opt, j) => {
          doc.setTextColor(51, 51, 51);
          const optionLines = doc.splitTextToSize(`   ${String.fromCharCode(65 + j)}. ${opt}`, maxLineWidth - 5);
          doc.text(optionLines, 15, yPosition);
          yPosition += optionLines.length * 6;
        });
      }


      // Separator
      doc.setDrawColor(204, 204, 204);
      doc.line(10, yPosition, 200, yPosition);
      yPosition += 6;

      // Handle page break
      if (yPosition > pageHeight - 20 && i < quiz.length - 1) {
        doc.addPage();
        yPosition = 10;
      }
    });

    return doc.output('blob');
  };

  const exportToPDF = () => {
    const pdfBlob = generatePDF();
    setPdfBlob(pdfBlob);

    const url = URL.createObjectURL(pdfBlob);
    setPdfUrl(url);
    setShowPdfModal(true);

    // Attach PDF to last quiz
    setQuizHistory(prev => {
      const updated = [...prev];
      const last = updated[updated.length - 1];
      updated[updated.length - 1] = { ...last, pdf: pdfBlob };
      return updated;
    });

    // Optional: mark download
    setUserProfile(prev => ({
      ...prev,
      downloads: (prev.downloads || 0) + 1,
      lastActive: new Date().toLocaleDateString()
    }));
  };


  const viewPDF = (pdfBlob) => {
    const url = URL.createObjectURL(pdfBlob);
    window.open(url, '_blank');
  };

  const handleCreateAnother = () => {
    setQuiz([]);
    setFile(null);
    setUrl("");
    setSuccess(false);
    setStep("upload");
    setShowResults(false);
    setQuizStarted(false);
  };

  const handleLogout = () => {
    setStep("auth");
    setUsername("");
    setPassword("");
    setUserProfile(null);
    setShowProfile(false);
  };

  const getCurrentPageTitle = () => {
    switch(step) {
      case "upload": return "Create New Quiz";
      case "preview": return "Quiz Preview";
      case "auth": return authStep === "login" ? "Login" : "Register";
      default: return "AI Quiz Generator";
    }
  };

  const renderQuizQuestion = (q) => {
    if (showResults) {
      // Show results with correct/incorrect indicators
      const userAnswer = userAnswers[q.id];
      const isCorrect = userAnswer === q.answer;
      
      return (
        <div key={q.id} className="question-card">
          <div className="question-header">
            <span className="question-number">Question {q.id}</span>
            <span className={`question-status ${isCorrect ? 'correct' : 'incorrect'}`}>
              {isCorrect ? '✓ Correct' : '✗ Incorrect'}
            </span>
          </div>
          
          <div className="question-content">
            <p className="question-text">{q.question}</p>
            
            {q.options && q.options.length > 0 && (
              <div className="options-grid">
                { q.options.map((opt, i) => {
                  let optionClass = "";
                  if (opt === q.answer) optionClass = "correct-option";
                  if (opt === userAnswer && !isCorrect) optionClass = "incorrect-option";
                  
                  return (
                    <div key={i} className={`option-item ${optionClass}`}>
                      <span className="option-letter">{String.fromCharCode(65 + i)}</span>
                      <span className="option-text">{opt}</span>
                      {opt === q.answer && <span className="correct-tick">✓</span>}
                    </div>
                  );
                })}
              </div>
            )}
            
            <div className="user-answer">
              <span>Your answer: </span>
              <strong>{userAnswer || "Not answered"}</strong>
            </div>
          </div>
        </div>
      );
    } else if (quizStarted) {
      // Show interactive quiz with answer selection
      return (
        <div key={q.id} className="question-card">
          <div className="question-header">
            <span className="question-number">Question {q.id}</span>
          </div>
          
          <div className="question-content">
            <p className="question-text">{q.question}</p>
            
            {q.options && q.options.length > 0 ? (
              <div className="options-grid">
                {q.options.map((opt, i) => (
                  <div key={i} className="option-item">
                    <input
                      type="radio"
                      id={`q${q.id}-opt${i}`}
                      name={`question-${q.id}`}
                      checked={userAnswers[q.id] === opt}
                      onChange={() => handleAnswerSelect(q.id, opt)}
                    />
                    <label htmlFor={`q${q.id}-opt${i}`}>
                      <span className="option-letter">{String.fromCharCode(65 + i)}  </span>
                      <span className="option-text">   {opt}</span>
                    </label>
                  </div>
                ))}
              </div>
            ) : (
              <input
                type="text"
                placeholder="Type your answer..."
                value={userAnswers[q.id] || ""}
                onChange={(e) => handleAnswerSelect(q.id, e.target.value)}
                className="answer-input"
              />
            )}
          </div>
        </div>
      );
    } else {
      // Show preview mode (original functionality)
      return (
        <div key={q.id} className="question-card">
          <div className="question-header">
            <span className="question-number">Question {q.id}</span>
            <span className="question-type">
              {quizType === 'video' ? 'Video Question' :
               quizType === 'url' ? 'Web Content Question' :
               quizType === 'tf' ? 'True/False' :
               quizType === 'fib' ? 'Fill in Blank' :
               q.options && q.options.length > 2 ? 'Multiple Choice' : 'Short Answer'}
            </span>
          </div>
          
<div className="question-content">
  <p className="question-text">{q.question}</p>

  {q.options && q.options.length > 0 && (
    <div className="options-grid">
      {q.options.map((opt, i) => (
        <div key={i} className="option-item">
          <span className="option-letter">
            {String.fromCharCode(65 + i)}.
          </span>
          <span className="option-text">{opt}</span>
        </div>
      ))}
    </div>
  )}
</div>


        </div>
      );
    }
  };

  return (
    <div className="app-container">
      {/* Header */}
      {step !== "auth" && (
        <header className="app-header">
          <h1>{getCurrentPageTitle()}</h1>
          <button 
            className="profile-button" 
            onClick={() => setShowProfile(!showProfile)}
          >
            👤 {userProfile?.username || "Profile"}
            {userProfile?.quizzesGenerated > 0 && (
              <span className="notification-badge">{userProfile.quizzesGenerated}</span>
            )}
          </button>
        </header>
      )}

      {/* Profile Modal */}
      {showProfile && userProfile && (
        <div className="profile-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h2>User Profile</h2>
              <button className="close" onClick={() => setShowProfile(false)}>×</button>
            </div>
            
            <div className="profile-section">
              <div className="profile-info">
                <div className="info-item">
                  <span className="info-label">Username:</span>
                  <span className="info-value">{userProfile.username}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Email:</span>
                  <span className="info-value">{userProfile.email}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Member since:</span>
                  <span className="info-value">{userProfile.joinedDate}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Last active:</span>
                  <span className="info-value">{userProfile.lastActive}</span>
                </div>
              </div>
              
              <div className="stats-section">
                <div className="stat-card">
                  <div className="stat-value">{userProfile.quizzesGenerated || 0}</div>
                  <div className="stat-label">Quizzes Generated</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{userProfile.downloads || 0}</div>
                  <div className="stat-label">PDF Downloads</div>
                </div>
                {/* Total quizzes taken */}
                <div className="stat-card">
                  <div className="stat-value">
                    {quizHistory.filter(q => q.score !== null).length}
                  </div>
                  <div className="stat-label">Quizzes Taken</div>
                </div>
              </div>
            </div>
            
            <div className="quiz-history">
              <h3>Recent Quiz History</h3>
              {quizHistory.length === 0 ? (
                <p className="no-history">No quiz history yet</p>
              ) : (
                <ul className="history-list">
                  {quizHistory.slice(0, 5).map((quiz, index) => (
                    <li key={index} className="history-item">
                      <div className="quiz-title">{quiz.title}</div>
                      <div className="quiz-meta">
                        <span>Type: {quizTypes.find(t => t.value === quiz.type)?.label || 'Unknown'}</span>
                        <span>Date: {quiz.dateCreated}</span>
                      </div>
                      {quiz.pdf && (
                        <div className="quiz-actions">
                          <button 
                            className="view-pdf-btn"
                            onClick={() => viewPDF(quiz.pdf)}
                          >
                            View PDF
                          </button>
                          <button 
                            className="download-pdf-btn"
                            onClick={() => {
                              const url = URL.createObjectURL(quiz.pdf);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `${quiz.title}.pdf`;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              URL.revokeObjectURL(url);
                              
                              setUserProfile(prev => ({
                                ...prev,
                                downloads: (prev.downloads || 0) + 1
                              }));
                            }}
                          >
                            Download Again
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            
            <button className="logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </div>
          <div className="modal-overlay" onClick={() => setShowProfile(false)} />
        </div>
      )}

      {/* Main Content */}
      <main className="app-content">
        {step === "auth" && (
          <div className="auth-container">
            <div className="auth-card">
              <h2>{authStep === "login" ? "Welcome Back" : "Create Account"}</h2>
              
              <div className="auth-form">
                <div className="form-group">
                  <label>Username</label>
                  <input
                    type="text"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
                
                <div className="form-group">
                  <label>Password</label>
                  <input
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                
                <button 
                  className="auth-btn"
                  onClick={authStep === "login" ? handleLogin : handleRegister}
                >
                  {authStep === "login" ? "Login" : "Register"}
                </button>
                
                <div className="auth-switch">
                  {authStep === "login" ? (
                    <p>Don't have an account? <span onClick={() => setAuthStep("register")}>Register</span></p>
                  ) : (
                    <p>Already have an account? <span onClick={() => setAuthStep("login")}>Login</span></p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {step === "upload" && (
          <div className="upload-container">
            <div className="upload-card">
              <h2>Create New Quiz</h2>
              <p className="subtitle">Select content source and quiz type</p>
              
              <div className="quiz-type-selector">
                <label>Quiz Type</label>
                <div className="type-options">
                  {quizTypes.map((type) => (
                    <div 
                      key={type.value}
                      className={`type-option ${quizType === type.value ? 'active' : ''}`}
                      onClick={() => {
                        setQuizType(type.value);
                        setFile(null);
                        setUrl("");
                      }}
                    >
                      {type.label}
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="source-input">
                {quizType === "url" ? (
                  <div className="url-input">
                    <label>Enter URL</label>
                    <input
                      type="url"
                      placeholder="https://example.com"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                    />
                    <p className="hint">Supports articles, blogs, and educational content</p>
                  </div>
                ) : (
                  <div className="file-upload-area">
                    <label>
                      {quizType === "video" ? "Upload Video" : "Upload Document"}
                    </label>
                    <div className={`upload-box ${file ? 'has-file' : ''}`}>
                      {file ? (
                        <>
                          <div className="file-info">
                            <span className="file-name">{file.name}</span>
                            <span className="file-size">
                              {(file.size / (1024 * 1024)).toFixed(2)} MB
                            </span>
              
                          <button 
                            className="clear-file"
                            onClick={() => setFile(null)}
                          >
                            ×
                          </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <input
                            type="file"
                            accept={
                              quizType === "video" 
                                ? "video/*,.mp4,.webm,.mov" 
                                : ".pdf,.docx,.txt"
                            }
                            onChange={(e) => setFile(e.target.files[0])}
                          />
                          <div className="upload-prompt">
                            <span className="upload-icon">↑</span>
                            <p>Drag & drop or click to browse</p>
                            <p className="file-types">
                              {quizType === "video" 
                                ? "MP4, WebM, MOV" 
                                : "PDF, DOCX, TXT"}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <button 
                className={`generate-btn ${loading ? 'loading' : ''}`} 
                onClick={handleUpload} 
                disabled={
                  loading || 
                  (quizType === "url" ? !url : !file) ||
                  (quizType === "url" && !isValidUrl(url))
                }
              >
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    {quizType === "video" ? "Processing Video..." : 
                     quizType === "url" ? "Analyzing URL..." : "Generating Quiz..."}
                  </>
                ) : (
                  "Generate Quiz"
                )}
              </button>
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="preview-container">
            <div className="preview-card">
              <div className="quiz-header">
                <h2>
                  {quizStarted ? "Quiz in Progress" : 
                   showResults ? "Quiz Results" : "Quiz Preview"}
                </h2>
                <div className="quiz-source">
                  Generated from: <span>{quizSource}</span>
                </div>
              </div>
              
              {/* Timer Display */}
              {quizStarted && (
                <div className={timerClass}>          {/* was className="quiz-timer" */}
                  <span className="timer-icon">⏱️</span>
                  <span className="timer-text">{formatTime(timeLeft)}</span>
                </div>
              )}
              
              {/* Quiz Results Summary */}
              {showResults && (
  <div className="score-modal-overlay">
    <div className="score-modal">
      <button className="close-btn" onClick={() => setShowResults(false)}> × </button>

      <h2>Quiz Results</h2>
      <p>Your Score: {score.score} / {score.total}</p>
      <p>Percentage: {score.percentage}%</p>

      <div className="score-bar">
        <div 
          className="score-progress" 
          style={{ width: `${score.percentage}%` }}
        ></div>
      </div>

      <div className="score-breakdown">
        <p>Correct Answers: {score.score}</p>
        <p>Incorrect Answers: {score.total - score.score}</p>
      </div>
      
      <button className="export-btn" onClick={() => setShowResults(false)}> retry       </button>
      <button className="another-btn" onClick={handleCreateAnother}> Create Another Quiz </button>
    </div>
  </div>
)}

              
              <div className="quiz-questions">
                {quiz.map(renderQuizQuestion)}
              </div>
              
              <div className="preview-actions">
                {!quizStarted && !showResults && (
                  <>
                    <button 
                      className="export-btn"
                      onClick={startQuiz}
                    >
                      Start Quiz
                    </button>
                    <button className="export-btn" onClick={exportToPDF}>
                      Export to PDF
                    </button>
                    <button className="another-btn" onClick={handleCreateAnother}>
                      Create Another Quiz
                    </button>
                  </>
                )}
                
                {quizStarted && (
                  <button 
                    className="export-btn"
                    onClick={handleQuizSubmit}
                    disabled={Object.keys(userAnswers).length === 0}
                  >
                    Submit Quiz
                  </button>
                )}
                
                {showResults && (
                  <>
                    <button className="export-btn" onClick={exportToPDF}>
                      Export to PDF
                    </button>
                    <button className="another-btn" onClick={handleCreateAnother}>
                      Create Another Quiz
                    </button>
                  </>
                )}
                
                {success && (
                  <div className="success-message">
                    <div className="success-icon">✓</div>
                    <h3>Quiz exported successfully!</h3>
                    <p>Your quiz has been saved to your device and added to your history.</p>
                    <div className="success-actions">
                      <button className="view-pdf-btn" onClick={() => viewPDF(pdfBlob)}>
                        View PDF
                      </button>
                      <button className="home-btn" onClick={handleCreateAnother}>
                        Create Another Quiz
                      </button>
                    </div>
                  </div>
                )}

                {showPdfModal && (
                  <div className="pdf-modal">
                    <div className="pdf-modal-content">
                      <div className="pdf-modal-header">
                        <h3>Your Quiz is Ready!</h3>
                        <button className="close-btn" onClick={() => setShowPdfModal(false)}>
                          
                        </button>
                      </div>
                      
                      <div className="pdf-preview-container">
                        <embed 
                          src={`${pdfUrl}#toolbar=0&navpanes=0`} 
                          type="application/pdf" 
                          className="pdf-preview"
                        />
                      </div>
                      
                      <div className="pdf-actions">
                        <a 
                          href={pdfUrl} 
                          download={`quiz_${new Date().toISOString().slice(0, 10)}.pdf`}
                          className="download-pdf-btn"
                          onClick={() => {
                            setTimeout(() => {
                              setShowPdfModal(false);
                              setSuccess(true);
                            }, 500);
                          }}
                        >
                          <span className="icon">↓</span> Download PDF
                        </a>
                        
                        <button 
                          className="share-pdf-btn"
                          onClick={() => {
                            if (navigator.share) {
                              navigator.share({
                                title: 'Generated Quiz',
                                text: 'Check out this quiz I generated!',
                                url: pdfUrl,
                              }).catch(console.error);
                            } else {
                              alert('Web Share API not supported in your browser');
                            }
                          }}
                        >
                          <span className="icon">↗</span> Share
                        </button>
                        
                        <button 
                          className="view-later-btn"
                          onClick={() => {
                            setShowPdfModal(false);
                            setSuccess(true);
                          }}
                        >
                          <span className="icon">👁️</span> View Later
                        </button>
                      </div>
                      
                      <div className="pdf-stats">
                        <div className="stat-item">
                          <span className="stat-icon">📊</span>
                          <span>{quiz.length} Questions</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-icon">⏱️</span>
                          <span>Generated just now</span>
                        </div>
                      </div>
                    </div>
                    <div className="pdf-modal-overlay" onClick={() => setShowPdfModal(false)} />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}