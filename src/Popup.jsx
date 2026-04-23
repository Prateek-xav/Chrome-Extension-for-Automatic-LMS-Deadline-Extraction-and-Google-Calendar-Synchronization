import { useState, useEffect } from "react";
import "./popup.css";

const BACKEND = "http://localhost:8000";

const CalendarIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="4" width="18" height="17" rx="2.5" stroke="white" strokeWidth="2" />
    <line x1="3" y1="9.5" x2="21" y2="9.5" stroke="white" strokeWidth="1.8" />
    <line x1="8" y1="2" x2="8" y2="6" stroke="white" strokeWidth="2" strokeLinecap="round" />
    <line x1="16" y1="2" x2="16" y2="6" stroke="white" strokeWidth="2" strokeLinecap="round" />
    <circle cx="12" cy="15.5" r="1.8" fill="white" />
  </svg>
);

const GoogleIcon = () => (
  <svg className="gicon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

// Colors to cycle through for deadline items
const COLORS = ["#1a73e8", "#ea4335", "#f9ab00", "#34a853", "#9c27b0", "#ff5722"];

function formatDueDate(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = date - now;
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  let urgency;
  if (diffDays < 0) urgency = "overdue";
  else if (diffDays === 0) urgency = "today";
  else if (diffDays === 1) urgency = "tomorrow";
  else urgency = `${diffDays} days`;

  return { dateStr, urgency, isUrgent: diffDays <= 2 };
}

export default function Popup() {
  const [isOn, setIsOn] = useState(false);
  const [connectedEmail, setConnectedEmail] = useState(null);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [deadlines, setDeadlines] = useState([]);
  const [loadingDeadlines, setLoadingDeadlines] = useState(false);

  const isActive = isOn && !!connectedEmail;

  // Fetch real deadlines from backend — only upcoming ones, max 5
  const fetchDeadlines = () => {
    setLoadingDeadlines(true);
    fetch(`${BACKEND}/api/deadlines`)
      .then((res) => res.json())
      .then((data) => {
        const now = new Date();
        const upcoming = data
          .filter((d) => new Date(d.due_date) >= now)  // only future
          .slice(0, 5);                                  // max 5
        setDeadlines(upcoming);
      })
      .catch(() => setDeadlines([]))
      .finally(() => setLoadingDeadlines(false));
  };

  // On mount: restore toggle + check Google status + fetch deadlines
  useEffect(() => {
    chrome.storage.local.get("syncEnabled", (result) => {
      if (result.syncEnabled) setIsOn(true);
    });

    fetch(`${BACKEND}/auth/google/status`)
      .then((res) => res.json())
      .then((data) => {
        if (data.connected) setConnectedEmail(data.email);
      })
      .catch(() => {})
      .finally(() => setCheckingStatus(false));

    fetchDeadlines();
  }, []);

  const handleToggle = () => {
    if (!connectedEmail && !isOn) {
      alert("Please connect your Google account first.");
      return;
    }

    const newState = !isOn;
    setIsOn(newState);
    chrome.storage.local.set({ syncEnabled: newState });

    if (newState) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, { type: "SYNC_TOGGLED_ON" })
            .catch(() => {});
        }
      });

      // Refresh deadlines after a short delay to show newly synced ones
      setTimeout(fetchDeadlines, 3000);
    }
  };

  const handleGoogle = () => {
    const authWindow = window.open(
      `${BACKEND}/auth/google/login`,
      "_blank",
      "width=500,height=600"
    );

    const poll = setInterval(() => {
      fetch(`${BACKEND}/auth/google/status`)
        .then((res) => res.json())
        .then((data) => {
          if (data.connected) {
            setConnectedEmail(data.email);
            clearInterval(poll);
            authWindow?.close();
          }
        })
        .catch(() => clearInterval(poll));
    }, 1000);

    setTimeout(() => clearInterval(poll), 120000);
  };

  const handleDisconnect = () => {
    setConnectedEmail(null);
    setIsOn(false);
    chrome.storage.local.set({ syncEnabled: false });
  };

  return (
    <div className="shell">
      <div className="popup">

        {/* Top bar */}
        <div className="topbar">
          <div className="brand">
            <div className="brand-icon"><CalendarIcon /></div>
            <span className="brand-name">LMS Deadline Sync</span>
          </div>
          <div className={`badge ${!isActive ? "off" : ""}`}>
            <div className="badge-dot" style={{ background: isActive ? "#34a853" : "#aaa" }} />
            <span>{isActive ? "Active" : "Inactive"}</span>
          </div>
        </div>

        {/* Toggle */}
        <div className="section">
          <div className="toggle-row" onClick={handleToggle}>
            <div className="toggle-info">
              <span className="toggle-title">Auto deadline sync</span>
              <span className="toggle-desc">
                {isOn ? "Syncing deadlines to Calendar" : "Enable to start syncing"}
              </span>
            </div>
            <div className={`sw ${isOn ? "on" : ""}`}>
              <div className="knob" />
            </div>
          </div>
        </div>

        {/* Google Sign in */}
        <div className="section">
          <div className="row-label">Google Account</div>

          {checkingStatus ? (
            <button className="btn btn-google" disabled>
              <GoogleIcon />
              <span>Checking status...</span>
            </button>
          ) : connectedEmail ? (
            <>
              <button className="btn btn-google" style={{ color: "#34a853" }}>
                <GoogleIcon />
                <span>✓ {connectedEmail}</span>
              </button>
              <div className="divider-text"><span>or</span></div>
              <button className="btn btn-ghost" onClick={handleDisconnect}>
                Disconnect account
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-google" onClick={handleGoogle}>
                <GoogleIcon />
                <span>Continue with Google</span>
              </button>
              <div className="divider-text"><span>or</span></div>
              <button className="btn btn-ghost">Create a new account</button>
            </>
          )}
        </div>

        {/* Deadlines — now dynamic from backend */}
        <div className="section">
          <div className="row-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Upcoming deadlines</span>
            <span
              onClick={fetchDeadlines}
              style={{ cursor: "pointer", fontSize: "10px", color: "#1a73e8", textTransform: "none", letterSpacing: 0 }}
            >
              ↻ Refresh
            </span>
          </div>

          <div className="dl-list">
            {loadingDeadlines ? (
              <div style={{ fontSize: "12px", color: "#9ca3af", padding: "10px 0", textAlign: "center" }}>
                Loading...
              </div>
            ) : deadlines.length === 0 ? (
              <div style={{ fontSize: "12px", color: "#9ca3af", padding: "10px 0", textAlign: "center" }}>
                No upcoming deadlines found.{"\n"}
                {!isOn && <span>Turn on sync to load deadlines.</span>}
              </div>
            ) : (
              deadlines.map((d, i) => {
                const { dateStr, urgency, isUrgent } = formatDueDate(d.due_date);
                return (
                  <div className="dl-item" key={d.id}>
                    <div className="dl-color" style={{ background: COLORS[i % COLORS.length] }} />
                    <div className="dl-meta">
                      <div className="dl-name">{d.title}</div>
                    </div>
                    <div className="dl-right">
                      <span className="dl-date">{dateStr}</span>
                      {isActive
                        ? <span className="dl-sync">synced</span>
                        : <span className={isUrgent ? "dl-urgent" : "dl-date"}>{urgency}</span>
                      }
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="privacy">
          Reads only visible deadlines — no grades or passwords accessed.
        </div>

      </div>
    </div>
  );
}
