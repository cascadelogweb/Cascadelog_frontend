import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FiDownload, FiMaximize, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import '../Styles/Playground.css';

const Playground = () => {
  const [html, setHtml] = useState('<h1>Hello World</h1>');
  const [css, setCss] = useState('h1 { color: coral; }');
  const [js, setJs] = useState('');
  const [activeTab, setActiveTab] = useState('html');
  const [srcDoc, setSrcDoc] = useState('');
  
  // Resizing State
  const [leftWidth, setLeftWidth] = useState(50); // percentage
  const [isResizing, setIsResizing] = useState(false);
  
  const playgroundRef = useRef(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSrcDoc(`<html><style>${css}</style><body>${html}</body><script>${js}</script></html>`);
    }, 250);
    return () => clearTimeout(timeout);
  }, [html, css, js]);

  // --- Resizing Logic ---
  const startResizing = useCallback(() => {
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback((e) => {
    if (isResizing && playgroundRef.current) {
      const containerRect = playgroundRef.current.getBoundingClientRect();
      const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
      
      // Constrain width between 10% and 90%
      if (newWidth > 10 && newWidth < 90) {
        setLeftWidth(newWidth);
      }
    }
  }, [isResizing]);

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      playgroundRef.current.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div className="Play_container" ref={playgroundRef} style={{ cursor: isResizing ? 'col-resize' : 'default' }}>
      
      {/* Editor Portion */}
      <div className="Play_editorSection" style={{ width: `${leftWidth}%` }}>
        <div className="Play_toolbar">
          <div className="Play_tabs">
            <button className={activeTab === 'html' ? 'active' : ''} onClick={() => setActiveTab('html')}>HTML</button>
            <button className={activeTab === 'css' ? 'active' : ''} onClick={() => setActiveTab('css')}>CSS</button>
            <button className={activeTab === 'js' ? 'active' : ''} onClick={() => setActiveTab('js')}>JS</button>
          </div>
          <div className="Play_actions">
            <button onClick={() => { /* Download Logic */ }}><FiDownload /></button>
            <button onClick={toggleFullScreen}><FiMaximize /></button>
          </div>
        </div>
        <textarea
          className="Play_textarea"
          value={activeTab === 'html' ? html : activeTab === 'css' ? css : js}
          onChange={(e) => {
            const val = e.target.value;
            if (activeTab === 'html') setHtml(val);
            else if (activeTab === 'css') setCss(val);
            else setJs(val);
          }}
          spellCheck="false"
        />
      </div>

      {/* DRAGGABLE RESIZER BAR */}
      <div className={`Play_resizer ${isResizing ? 'isResizing' : ''}`} onMouseDown={startResizing} />

      {/* Preview Portion */}
      <div className="Play_previewSection" style={{ width: `${100 - leftWidth}%` }}>
        <div className="Play_previewHeader">
          <span>Browser Preview</span>
        </div>
        <iframe
          srcDoc={srcDoc}
          title="output"
          sandbox="allow-scripts"
          className={isResizing ? 'disable-pointer' : ''} // Prevents iframe from stealing mouse events
        />
      </div>
    </div>
  );
};

export default Playground;