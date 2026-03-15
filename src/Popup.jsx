import { useState } from "react";
import "./popup.css";

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

const deadlines = [
  { id: 1, name: "Essay draft", course: "ENGL 201", date: "Mar 18", days: "3 days", color: "#1a73e8" },
  { id: 2, name: "Problem set 4", course: "MATH 110", date: "Mar 20", days: "5 days", color: "#ea4335" },
  { id: 3, name: "Lab report", course: "CHEM 120", date: "Mar 22", days: "7 days", color: "#f9ab00" },
];

export default function Popup() {
  const [isOn, setIsOn] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const isActive = isOn && isConnected;

  const handleToggle = () => setIsOn((prev) => !prev);

  const handleGoogle = () => setIsConnected(true);

  return (
    <div className="shell">
      <div className="popup">

        {/* Top bar */}
        <div className="topbar">
          <div className="brand">
            <div className="brand-icon">
              <CalendarIcon />
            </div>
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

        {/* Sign in */}
        <div className="section">
          <div className="row-label">Sign in</div>
          <button
            className="btn btn-google"
            onClick={handleGoogle}
            style={isConnected ? { borderColor: "#34a853", color: "#34a853" } : {}}
          >
            <GoogleIcon />
            <span>{isConnected ? "student@university.edu" : "Continue with Google"}</span>
          </button>
          <div className="divider-text"><span>or</span></div>
          <button className="btn btn-ghost">Create a new account</button>
        </div>

        {/* Deadlines */}
        <div className="section">
          <div className="row-label">Upcoming deadlines</div>
          <div className="dl-list">
            {deadlines.map((d) => (
              <div className="dl-item" key={d.id}>
                <div className="dl-color" style={{ background: d.color }} />
                <div className="dl-meta">
                  <div className="dl-name">{d.name}</div>
                  <div className="dl-course">{d.course}</div>
                </div>
                <div className="dl-right">
                  <span className="dl-date">{d.date}</span>
                  {isActive ? (
                    <span className="dl-sync">synced</span>
                  ) : (
                    <span className="dl-urgent">{d.days}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="privacy">
          Reads only visible deadlines — no grades or passwords accessed.
        </div>

      </div>
    </div>
  );
}
