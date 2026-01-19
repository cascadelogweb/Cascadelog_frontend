import '../Styles/DailyActivity.css';
import React, { useState, useEffect } from 'react';
import { 
  FiPlay, FiUpload, FiExternalLink, FiAward, FiAlertCircle, 
  FiCheckCircle, FiTrash2, FiEdit3, FiFile, FiX 
} from 'react-icons/fi';
import { supabase } from '../Components/Auth/supabaseClient';
import API_BASE_URL from './Auth/Config';

const DailyActivity = () => {
  const [isStarted, setIsStarted] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState({ HTML: null, CSS: null, JS: null });
  const [description, setDescription] = useState(""); 
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  
  const [popup, setPopup] = useState({ visible: false, message: '' });

  // --- 1. TIMEZONE HELPERS ---
  
  // Get Today's Date in YYYY-MM-DD (Local Time) for Cache Keys
  const todayStr = new Date().toLocaleDateString('en-CA'); 

  // Get "Start of Today" in ISO format (User's 12:00 AM converted to UTC)
  // This tells the backend exactly when YOUR day started.
  const getStartOfTodayISO = () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Reset to 12:00:00 AM Local Time
    return now.toISOString();
  };

  // Display Date (e.g., "January 20, 2026")
  const displayDate = new Date().toLocaleDateString('en-US', { 
    month: 'long', day: 'numeric', year: 'numeric' 
  });

  const getCacheKey = (userId) => {
    return `daily_submission_${userId}_${todayStr}`;
  };

  const showSuccessPopup = (msg) => {
    setPopup({ visible: true, message: msg });
    setTimeout(() => {
      setPopup({ visible: false, message: '' });
    }, 3000);
  };

  // --- 2. STATUS CHECK (Smart Sync) ---
  useEffect(() => {
    const checkStatusAndCleanup = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setLoading(false);
          return;
        }

        const userId = session.user.id;
        const currentCacheKey = getCacheKey(userId);

        // A. CLEANUP OLD CACHE
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith(`daily_submission_${userId}_`) && key !== currentCacheKey) {
            localStorage.removeItem(key);
          }
        });

        // B. LOAD CACHE (Optimistic UI - Instant Load)
        const cachedData = localStorage.getItem(currentCacheKey);
        let hasCache = false;

        if (cachedData) {
          console.log("Showing Cached Data (Optimistic)");
          const result = JSON.parse(cachedData);
          setIsCompleted(true);
          setIsStarted(true);
          setSelectedFiles(result.files);
          setDescription(result.description || "");
          hasCache = true;
          setLoading(false); // Stop loading immediately for better UX
          // IMPORTANT: We do NOT return here. We continue to verify with DB below.
        }

        // C. VERIFY WITH DATABASE (Background Check)
        const startOfDay = getStartOfTodayISO();
        
        console.log("Verifying with DB for date:", startOfDay);
        
        const response = await fetch(`${API_BASE_URL}/api/submissions/check-today?date=${startOfDay}`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        });

        const result = await response.json();

        if (result.submitted) {
          // Database confirms submission exists -> Update Cache to be fresh
          setIsCompleted(true);
          setIsStarted(true);
          setSelectedFiles(result.data.files);
          setDescription(result.data.description || "");
          localStorage.setItem(currentCacheKey, JSON.stringify(result.data));
        } else {
          // Database says "Not Submitted" (e.g. you deleted it from DB)
          // If we showed cache, it was wrong (stale). Reset UI.
          if (hasCache) {
            console.log("Cache mismatch! Database record missing. Resetting UI.");
            localStorage.removeItem(currentCacheKey);
            setIsCompleted(false);
            setIsStarted(false);
            setSelectedFiles({ HTML: null, CSS: null, JS: null });
            setDescription("");
          }
        }

      } catch (err) {
        console.error("Failed to check status:", err);
      } finally {
        setLoading(false);
      }
    };

    checkStatusAndCleanup();
  }, [todayStr]); // Re-runs if local date changes

  const handleFileChange = (type, file) => {
    setSelectedFiles(prev => ({ ...prev, [type]: file }));
    if (error) setError(""); 
  };

  const handleRemoveFile = (type) => {
    setSelectedFiles(prev => ({ ...prev, [type]: null }));
  };

  const handleReview = async () => {
    const hasFiles = Object.values(selectedFiles).some(file => file !== null);
    if (!hasFiles) {
      setError("You haven't uploaded any files.");
      return;
    }

    const formData = new FormData();
    if (selectedFiles.HTML instanceof File) formData.append('html', selectedFiles.HTML);
    if (selectedFiles.CSS instanceof File)  formData.append('css', selectedFiles.CSS);
    if (selectedFiles.JS instanceof File)   formData.append('js', selectedFiles.JS);
    formData.append('description', description);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setError("You must be logged in to submit.");
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/submissions/submit`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Submission failed");

      setError("");
      showSuccessPopup("Submission Successful!"); 
      
      setIsCompleted(true);

      const successData = {
        description: description,
        files: {
          HTML: selectedFiles.HTML ? { name: selectedFiles.HTML.name } : null,
          CSS: selectedFiles.CSS ? { name: selectedFiles.CSS.name } : null,
          JS: selectedFiles.JS ? { name: selectedFiles.JS.name } : null,
        }
      };
      
      // Update UI state with "Submitted" names
      setSelectedFiles(prev => ({
        HTML: prev.HTML ? { name: prev.HTML.name || 'Submitted HTML' } : null,
        CSS: prev.CSS ? { name: prev.CSS.name || 'Submitted CSS' } : null,
        JS: prev.JS ? { name: prev.JS.name || 'Submitted JS' } : null,
      }));

      // Save to LocalStorage immediately
      const cacheKey = getCacheKey(session.user.id);
      localStorage.setItem(cacheKey, JSON.stringify(successData));

    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this submission?")) {
      setSelectedFiles({ HTML: null, CSS: null, JS: null });
      setDescription("");
      setIsCompleted(false);
      setIsStarted(false);

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const cacheKey = getCacheKey(session.user.id);
        localStorage.removeItem(cacheKey);
      }
      // Note: You might also want to call an API endpoint to delete from DB if that feature exists
    }
  };

  const handleEdit = () => {
    setIsCompleted(false);
  };

  const handleLaunchBattle = () => {
    window.open('https://cssbattle.dev', '_blank');
  };

  const getStatus = () => {
    if (isCompleted) return { text: 'Completed', class: 'DAILYACT_completed' };
    if (isStarted) return { text: 'In Progress', class: 'DAILYACT_active' };
    return { text: 'Pending', class: 'DAILYACT_pending' };
  };

  const status = getStatus();

  if (loading) return <div className="DAILYACT_container" style={{justifyContent:'center', alignItems:'center'}}>Loading...</div>;

  return (
    <div className="DAILYACT_container DAILYACT_pageFade">
      
      {/* Central Popup Notification */}
      {popup.visible && (
        <div className="DAILYACT_popupOverlay">
          <div className="DAILYACT_popupBox DAILYACT_scaleIn">
            <FiCheckCircle className="DAILYACT_popupIcon" />
            <h3 className="DAILYACT_popupTitle">Success!</h3>
            <p className="DAILYACT_popupMessage">{popup.message}</p>
          </div>
        </div>
      )}

      {/* Left Portion */}
      <div className="DAILYACT_leftPortion DAILYACT_fadeInUp DAILYACT_stagger1">
        <div className="DAILYACT_iframeHeader" onClick={handleLaunchBattle}>
          <span className="DAILYACT_headerTitle">Daily Challenge Portal</span>
          <FiExternalLink className="DAILYACT_headerIcon" />
        </div>
        
        <div className="DAILYACT_promoCard" onClick={handleLaunchBattle}>
          <div className="DAILYACT_promoLogoWrapper">
            <img 
              src="https://cssbattle.dev/images/logo-square.png" 
              alt="CSSBattle Logo" 
              className="DAILYACT_promoLogo"
            />
          </div>
          <h2 className="DAILYACT_promoTitle">Ready for Today's Battle?</h2>
          <p className="DAILYACT_promoNote">
            Improve your CSS skills by replicating targets with the smallest code possible.
          </p>
          <div className="DAILYACT_promoFeatures">
            <span className="DAILYACT_featureTag"><FiAward /> Global Ranking</span>
            <span className="DAILYACT_featureTag"><FiAward /> Daily Targets</span>
          </div>
          <button className="DAILYACT_launchBtn">
            Launch CSSBattle.dev
          </button>
        </div>
      </div>

      {/* Right Portion */}
      <div className="DAILYACT_rightPortion DAILYACT_fadeInUp DAILYACT_stagger2">
        <div className="DAILYACT_statusBox">
          <div className="DAILYACT_statusHeader">
            <h3 className="DAILYACT_boxTitle">Task Status</h3>
            <span className={`DAILYACT_statusBadge ${status.class}`}>
              {status.text}
            </span>
          </div>
          
          <div className="DAILYACT_statusGrid">
            <div className="DAILYACT_statusItem">
              <span className="DAILYACT_itemLabel">Date</span>
              <span className="DAILYACT_itemValue">{displayDate}</span>
            </div>
            <div className="DAILYACT_statusItem">
              <span className="DAILYACT_itemLabel">Platform</span>
              <span className="DAILYACT_itemValue">CSSBattle</span>
            </div>
            <div className="DAILYACT_statusItem">
              <span className="DAILYACT_itemLabel">Requirement</span>
              <span className="DAILYACT_itemValue">HTML/CSS/JS</span>
            </div>
            <div className="DAILYACT_statusItem">
              <span className="DAILYACT_itemLabel">Current Task Points</span>
              <span className="DAILYACT_itemValue DAILYACT_pointsText">200</span>
            </div>
          </div>

          {!isStarted && !isCompleted && (
            <button className="DAILYACT_startActionBtn" onClick={() => setIsStarted(true)}>
              <FiPlay /> Start Session
            </button>
          )}
        </div>

        {/* Upload Portal */}
        {isStarted && !isCompleted && (
          <div className="DAILYACT_uploadBox DAILYACT_scaleIn">
            <h3 className="DAILYACT_boxTitle">Submission Portal</h3>
            
            {error && (
              <div className="DAILYACT_validationError">
                <FiAlertCircle /> {error}
              </div>
            )}

            <div className="DAILYACT_uploadGrid">
              {['HTML', 'CSS', 'JS'].map((type) => (
                <label key={type} className={`DAILYACT_uploadLabel ${selectedFiles[type] ? 'DAILYACT_fileSelected' : ''}`}>
                  
                  {selectedFiles[type] && (
                    <div 
                      className="DAILYACT_removeFileBtn"
                      onClick={(e) => {
                        e.preventDefault(); 
                        handleRemoveFile(type);
                      }}
                      title="Remove file"
                    >
                      <FiX />
                    </div>
                  )}

                  <FiUpload className="DAILYACT_uploadIcon" /> 
                  <span className="DAILYACT_uploadText">
                    {selectedFiles[type] ? selectedFiles[type].name : type}
                  </span>
                  <input 
                    type="file" 
                    accept={`.${type.toLowerCase()}`} 
                    hidden 
                    onChange={(e) => handleFileChange(type, e.target.files[0])}
                  />
                </label>
              ))}
            </div>
            <button className="DAILYACT_completeBtn" onClick={handleReview}>
              Submit for Review
            </button>
          </div>
        )}

        {/* Completed View */}
        {isCompleted && (
          <div className="DAILYACT_uploadBox DAILYACT_scaleIn">
            <div className="DAILYACT_completedHeader">
              <FiCheckCircle className="DAILYACT_successIcon" />
              <div>
                <h3 className="DAILYACT_boxTitle">Submission Received</h3>
                <p className="DAILYACT_uploadSubtitle">Your files are ready for review</p>
              </div>
            </div>

            <div className="DAILYACT_summaryList">
              {Object.entries(selectedFiles).map(([type, file]) => (
                file && (
                  <div key={type} className="DAILYACT_summaryItem">
                    <div className="DAILYACT_summaryIconWrapper">
                      <FiFile />
                    </div>
                    <div className="DAILYACT_summaryDetails">
                      <span className="DAILYACT_summaryName">{file.name}</span>
                      {file.url && (
                        <a href={file.url} target="_blank" rel="noopener noreferrer" style={{fontSize: '0.7rem', color:'#2563eb'}}>
                          View Code
                        </a>
                      )}
                      <span className="DAILYACT_summaryType">{type} FILE</span>
                    </div>
                  </div>
                )
              ))}
            </div>

            <div className="DAILYACT_descriptionWrapper">
              <label className="DAILYACT_itemLabel">Description (Optional)</label>
              <textarea 
                className="DAILYACT_descriptionBox"
                placeholder="Add any notes about your solution..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                readOnly={true} 
              />
            </div>

            <div className="DAILYACT_actionRow">
              <button className="DAILYACT_editBtn" onClick={handleEdit}>
                <FiEdit3 /> Edit
              </button>
              <button className="DAILYACT_deleteBtn" onClick={handleDelete}>
                <FiTrash2 /> Delete
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DailyActivity;