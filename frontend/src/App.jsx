import React, { useState, useEffect, useMemo } from "react";

const CATEGORY_PRESETS = [
  { label: "Transport", value: "transport" },
  { label: "Food", value: "food" },
  { label: "Home & Energy", value: "home" },
  { label: "Shopping", value: "shopping" },
  { label: "Other", value: "other" }
];

const API_BASE_URL = "http://localhost:4000";
const DEFAULT_GOAL = 5000; // carbon calories / day

function formatDateKey(date) {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

function formatHumanDate(date) {
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric"
  });
}

function App() {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [entriesByDate, setEntriesByDate] = useState(() => {
    const stored = localStorage.getItem("carbon-cal-entries");
    return stored ? JSON.parse(stored) : {};
  });
  const [dailyGoal, setDailyGoal] = useState(() => {
    const stored = localStorage.getItem("carbon-cal-goal");
    return stored ? Number(stored) : DEFAULT_GOAL;
  });
  const [activeTab, setActiveTab] = useState("overview");

  const dateKey = formatDateKey(currentDate);
  const todaysEntries = entriesByDate[dateKey] || [];

  useEffect(() => {
    localStorage.setItem("carbon-cal-entries", JSON.stringify(entriesByDate));
  }, [entriesByDate]);

  useEffect(() => {
    localStorage.setItem("carbon-cal-goal", String(dailyGoal));
  }, [dailyGoal]);

  const totalToday = useMemo(
    () => todaysEntries.reduce((sum, e) => sum + e.amount, 0),
    [todaysEntries]
  );

  const categoryBreakdown = useMemo(() => {
    const map = {};
    for (const e of todaysEntries) {
      map[e.category] = (map[e.category] || 0) + e.amount;
    }
    return map;
  }, [todaysEntries]);

  const highestCategory = useMemo(() => {
    let maxCat = null;
    let maxVal = 0;
    for (const [cat, val] of Object.entries(categoryBreakdown)) {
      if (val > maxVal) {
        maxVal = val;
        maxCat = cat;
      }
    }
    return maxCat ? { category: maxCat, amount: maxVal } : null;
  }, [categoryBreakdown]);

  const remaining = dailyGoal - totalToday;
  const progress = Math.min(totalToday / dailyGoal, 1);

  function handleAddEntry(entry) {
    setEntriesByDate(prev => {
      const nextForDay = [...(prev[dateKey] || []), entry];
      return { ...prev, [dateKey]: nextForDay };
    });
  }

  function handleDeleteEntry(id) {
    setEntriesByDate(prev => {
      const filtered = (prev[dateKey] || []).filter(e => e.id !== id);
      return { ...prev, [dateKey]: filtered };
    });
  }

  function shiftDay(delta) {
    setCurrentDate(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + delta);
      return d;
    });
  }

  return (
    <div className="app-root">
      <Header activeTab={activeTab} onTabChange={setActiveTab} />
      {activeTab === "overview" ? (
        <main className="app-main">
          <section className="left-column">
            <CurrentDayCard
              date={currentDate}
              total={totalToday}
              goal={dailyGoal}
              remaining={remaining}
              progress={progress}
              onGoalChange={setDailyGoal}
              onShiftDay={shiftDay}
            />
            <NewEntryCard
              onAddEntry={handleAddEntry}
            />
          </section>
          <section className="right-column">
            <SummaryCard
              entries={todaysEntries}
              total={totalToday}
              remaining={remaining}
              goal={dailyGoal}
              breakdown={categoryBreakdown}
              highestCategory={highestCategory}
            />
            <EntriesListCard
              entries={todaysEntries}
              onDelete={handleDeleteEntry}
            />
          </section>
        </main>
      ) : activeTab === "insights" ? (
        <InsightsView entriesByDate={entriesByDate} />
      ) : (
        <ExploreView
          currentDate={currentDate}
          todaysEntries={todaysEntries}
          dailyGoal={dailyGoal}
        />
      )}
    </div>
  );
}

function Header({ activeTab, onTabChange }) {
  // Theme toggle logic
  const [isDark, setIsDark] = useState(() => {
    return window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  useEffect(() => {
    document.body.classList.toggle("light-theme", !isDark);
  }, [isDark]);
  function toggleTheme() {
    setIsDark((d) => !d);
  }
  return (
    <header className="app-header">
      <div className="app-logo">LowCarb(on)</div>
      <nav className="app-nav">
        <button
          className={`nav-button subtle ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => onTabChange("overview")}
        >
          Track
        </button>
        <button
          className={`nav-button subtle ${activeTab === "insights" ? "active" : ""}`}
          onClick={() => onTabChange("insights")}
        >
          Insights
        </button>
        <button
          className={`nav-button subtle ${activeTab === "explore" ? "active" : ""}`}
          onClick={() => onTabChange("explore")}
        >
          Learn
        </button>
      </nav>
      <div className="header-actions">
        <button className="nav-button ghost icon-toggle" onClick={toggleTheme} aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}>
          {isDark ? (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 12.79A9 9 0 1 1 11.21 3 6.5 6.5 0 0 0 21 12.79z" />
            </svg>
          ) : (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="4" />
              <line x1="12" y1="3" x2="12" y2="5" />
              <line x1="12" y1="19" x2="12" y2="21" />
              <line x1="5" y1="12" x2="7" y2="12" />
              <line x1="17" y1="12" x2="19" y2="12" />
              <line x1="7.76" y1="7.76" x2="9" y2="9" />
              <line x1="15" y1="15" x2="16.24" y2="16.24" />
              <line x1="7.76" y1="16.24" x2="9" y2="15" />
              <line x1="15" y1="9" x2="16.24" y2="7.76" />
            </svg>
          )}
        </button>
      </div>
    </header>
  );
}

function CurrentDayCard({ date, total, goal, remaining, progress, onGoalChange, onShiftDay }) {
  const remainingAbs = Math.abs(remaining);
  const remainingLabel =
    remaining >= 0 ? `${remainingAbs.toFixed(0)} under goal` : `${remainingAbs.toFixed(0)} over goal`;

  return (
    <div className="card card-main">
      <div className="card-header">
        <div className="card-title-row">
          <h2>Today&apos;s Carbon</h2>
          <div className="day-switcher">
            <button onClick={() => onShiftDay(-1)}>&larr;</button>
            <span>{formatHumanDate(date)}</span>
            <button onClick={() => onShiftDay(1)}>&rarr;</button>
          </div>
        </div>
        <p className="card-subtitle">Track your “carbon calories” like a daily budget.</p>
      </div>

      <div className="metrics-row">
        <div className="metric-block">
          <span className="metric-label">Total today</span>
          <span className="metric-value">{total.toFixed(0)} cc</span>
        </div>
        <div className="metric-block">
          <span className="metric-label">Daily goal</span>
          <div className="metric-inline">
            <input
              type="number"
              min="0"
              value={goal}
              onChange={e => onGoalChange(Number(e.target.value) || 0)}
              className="goal-input"
            />
            <span className="metric-suffix">cc</span>
          </div>
        </div>
        <div className="metric-block">
          <span className="metric-label">Status</span>
          <span className={`metric-chip ${remaining >= 0 ? "chip-good" : "chip-bad"}`}>
            {remainingLabel}
          </span>
        </div>
      </div>

      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <p className="progress-caption">
        {progress < 1
          ? "You’re within your carbon budget. Nice work."
          : "You’ve exceeded your carbon goal — try a low-impact action tonight."}
      </p>
    </div>
  );
}

function NewEntryCard({ onAddEntry }) {
  const [category, setCategory] = useState("transport");
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [isEstimating, setIsEstimating] = useState(false);
  const [estimateHint, setEstimateHint] = useState("");
  const [estimateError, setEstimateError] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    const value = Number(amount);
    if (!value || value <= 0) return;

    onAddEntry({
      id: crypto.randomUUID(),
      category,
      label: label.trim() || "Untitled activity",
      amount: value,
      notes: notes.trim(),
      createdAt: new Date().toISOString()
    });

    setLabel("");
    setAmount("");
    setNotes("");
    setEstimateHint("");
    setEstimateError("");
  }

  async function handleEstimate(e) {
    e.preventDefault();
    setEstimateError("");
    setEstimateHint("");

    if (!label.trim()) {
      setEstimateError("Describe the activity first so we can estimate it.");
      return;
    }

    setIsEstimating(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/estimate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: label })
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `HTTP ${res.status}`);
      }

      const data = await res.json();

      setCategory(data.category || "other");
      setAmount(String(data.carbon_calories ?? data.carbon_grams ?? ""));
      setEstimateHint(data.explanation || data.assumptions || "");
      if (!notes.trim() && data.explanation) {
        setNotes(data.explanation);
      }
    } catch (err) {
      console.error("Estimate error:", err);
      setEstimateError("Couldn’t estimate this activity. Try again or enter a value manually.");
    } finally {
      setIsEstimating(false);
    }
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3>Log Activity</h3>
        <p className="card-subtitle">
          Describe your activity, then let the AI estimate its carbon or enter a custom value.
        </p>
      </div>
      <form className="form" onSubmit={handleSubmit}>
        <div className="form-row">
          <label htmlFor="category">Category</label>
          <div className="select-wrapper">
            <select
              id="category"
              value={category}
              onChange={e => setCategory(e.target.value)}
            >
              {CATEGORY_PRESETS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row">
          <label htmlFor="label">Activity (natural language)</label>
          <input
            id="label"
            type="text"
            placeholder="e.g. Took an Uber about 4 km to campus"
            value={label}
            onChange={e => setLabel(e.target.value)}
          />
        </div>

        <div className="form-row">
          <label htmlFor="amount">Carbon calories</label>
          <div className="input-with-button">
            <input
              id="amount"
              type="number"
              min="0"
              step="1"
              placeholder="e.g. 250"
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
            <button
              className="secondary-button"
              onClick={handleEstimate}
              disabled={isEstimating}
            >
              {isEstimating ? "Estimating..." : "Estimate for me"}
            </button>
          </div>
        </div>

        {estimateError && (
          <p className="estimation-error">
            {estimateError}
          </p>
        )}

        <div className="form-row">
          <label htmlFor="notes">Notes (optional)</label>
          <textarea
            id="notes"
            rows="2"
            placeholder="Any context you want to remember..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>

        <div className="form-actions">
          <button type="submit" className="primary-button">
            Add to day
          </button>
        </div>
      </form>
    </div>
  );
}

function SummaryCard({
  entries,
  total,
  remaining,
  goal,
  breakdown,
  highestCategory
}) {
  const hasEntries = entries.length > 0;

  return (
    <div className="card card-summary">
      <div className="card-header">
        <h3>Today&apos;s Summary</h3>
        <p className="card-subtitle">
          A quick snapshot of where your carbon is coming from.
        </p>
      </div>

      {!hasEntries ? (
        <div className="empty-state">
          <p>No activities logged yet.</p>
          <p className="hint">Start by adding a trip, meal, or habit on the left.</p>
        </div>
      ) : (
        <>
          <div className="summary-grid">
            <div className="summary-block">
              <span className="summary-label">Entries</span>
              <span className="summary-value">{entries.length}</span>
            </div>
            <div className="summary-block">
              <span className="summary-label">Total</span>
              <span className="summary-value">{total.toFixed(0)} cc</span>
            </div>
            <div className="summary-block">
              <span className="summary-label">Goal</span>
              <span className="summary-value">{goal.toFixed(0)} cc</span>
            </div>
            <div className="summary-block">
              <span className="summary-label">Remaining</span>
              <span className={`summary-chip ${remaining >= 0 ? "chip-good" : "chip-bad"}`}>
                {remaining >= 0 ? `${remaining.toFixed(0)} cc left` : `Over by ${Math.abs(remaining).toFixed(0)} cc`}
              </span>
            </div>
          </div>

          <div className="summary-section">
            <h4>By category</h4>
            {Object.keys(breakdown).length === 0 ? (
              <p className="hint">We’ll show a breakdown once you log more entries.</p>
            ) : (
              <ul className="breakdown-list">
                {Object.entries(breakdown).map(([cat, val]) => (
                  <li key={cat} className="breakdown-item">
                    <span className="breakdown-label">
                      {CATEGORY_PRESETS.find(c => c.value === cat)?.label || cat}
                    </span>
                    <span className="breakdown-value">{val.toFixed(0)} cc</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {highestCategory && (
            <div className="insight-box">
              <p className="insight-title">Most impactful area today</p>
              <p className="insight-body">
                <strong>
                  {CATEGORY_PRESETS.find(c => c.value === highestCategory.category)?.label}
                </strong>{" "}
                accounts for{" "}
                <strong>{highestCategory.amount.toFixed(0)} carbon calories</strong>{" "}
                today. Try swapping just one action in this category tomorrow for a
                noticeable improvement.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function EntriesListCard({ entries, onDelete }) {
  return (
    <div className="card">
      <div className="card-header">
        <h3>Logged Activities</h3>
      </div>
      {entries.length === 0 ? (
        <div className="empty-state">
          <p>No entries yet.</p>
        </div>
      ) : (
        <ul className="entry-list">
          {entries.map(entry => (
            <li key={entry.id} className="entry-item">
              <div className="entry-main">
                <div className="entry-title-row">
                  <span className="entry-label">{entry.label}</span>
                  <span className="entry-amount">{entry.amount.toFixed(0)} cc</span>
                </div>
                <div className="entry-meta-row">
                  <span className="entry-category">
                    {CATEGORY_PRESETS.find(c => c.value === entry.category)?.label ||
                      entry.category}
                  </span>
                  {entry.notes && (
                    <span className="entry-notes">{entry.notes}</span>
                  )}
                </div>
              </div>
              <button
                className="icon-button"
                onClick={() => onDelete(entry.id)}
                aria-label="Delete entry"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function InsightsView({ entriesByDate }) {
  const points = useMemo(() => {
    const rows = Object.entries(entriesByDate).map(([key, entries]) => {
      const total = entries.reduce((sum, e) => sum + e.amount, 0);
      return {
        key,
        date: new Date(key),
        total
      };
    });

    rows.sort((a, b) => a.date - b.date);
    return rows;
  }, [entriesByDate]);

  if (!points.length) {
    return (
      <main className="app-main">
        <section className="left-column">
          <div className="card card-main">
            <div className="card-header">
              <h3>Insights</h3>
              <p className="card-subtitle">
                Once you log a few days of activities, you&apos;ll see your carbon
                footprint trend over time here.
              </p>
            </div>
            <div className="empty-state">
              <p>No data yet to plot.</p>
              <p className="hint">
                Add some activities on the Overview tab to build your history.
              </p>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const maxTotal = Math.max(...points.map(p => p.total)) || 1;
  const width = 800;
  const height = 260;
  const paddingX = 40;
  const paddingY = 24;
  const innerWidth = width - paddingX * 2;
  const innerHeight = height - paddingY * 2;

  const pathD = points
    .map((p, index) => {
      const x =
        paddingX +
        (points.length === 1
          ? innerWidth / 2
          : (innerWidth * index) / (points.length - 1));
      const y =
        paddingY +
        (innerHeight - (p.total / maxTotal) * innerHeight);
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  const areaD =
    pathD +
    ` L ${paddingX + innerWidth} ${paddingY + innerHeight} L ${paddingX} ${
      paddingY + innerHeight
    } Z`;

  return (
    <main className="app-main">
      <section className="left-column">
        <div className="card card-main">
          <div className="card-header">
            <h3>Carbon trend</h3>
            <p className="card-subtitle">
              Your total carbon calories per day, over time.
            </p>
          </div>
          <div className="insights-chart">
            <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Carbon footprint over time">
              {/* X axis baseline */}
              <line
                x1={paddingX}
                y1={paddingY + innerHeight}
                x2={paddingX + innerWidth}
                y2={paddingY + innerHeight}
                className="chart-axis"
              />
              {/* Area under line */}
              <path d={areaD} className="chart-area" />
              {/* Trend line */}
              <path d={pathD} className="chart-line" />
              {/* Points */}
              {points.map((p, index) => {
                const x =
                  paddingX +
                  (points.length === 1
                    ? innerWidth / 2
                    : (innerWidth * index) / (points.length - 1));
                const y =
                  paddingY +
                  (innerHeight - (p.total / maxTotal) * innerHeight);
                return (
                  <g key={p.key}>
                    <circle cx={x} cy={y} r={3} className="chart-point" />
                  </g>
                );
              })}
              {/* Date labels (sparse to avoid clutter) */}
              {points.map((p, index) => {
                const showLabel =
                  points.length <= 7 || index % Math.ceil(points.length / 6) === 0;
                if (!showLabel) return null;
                const x =
                  paddingX +
                  (points.length === 1
                    ? innerWidth / 2
                    : (innerWidth * index) / (points.length - 1));
                const label = p.date.toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric"
                });
                return (
                  <text
                    key={`label-${p.key}`}
                    x={x}
                    y={paddingY + innerHeight + 18}
                    className="chart-label"
                  >
                    {label}
                  </text>
                );
              })}
            </svg>
          </div>
        </div>
      </section>
    </main>
  );
}

function ExploreView({ currentDate, todaysEntries, dailyGoal }) {
  return (
    <main className="app-main">
      <section className="left-column">
        <AIInsightsCard
          currentDate={currentDate}
          todaysEntries={todaysEntries}
          dailyGoal={dailyGoal}
        />
      </section>
      <section className="right-column">
        <div className="card card-main">
          <div className="card-header">
            <h3>Explore</h3>
            <p className="card-subtitle">
              A space for experiments, comparisons, and deeper dives into your footprint.
            </p>
          </div>
          <div className="empty-state">
            <p>Try generating AI insights on the left.</p>
            <p className="hint">
              You can analyze either today&apos;s activities or a single custom activity.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}


function AIInsightsCard({ currentDate, todaysEntries, dailyGoal }) {
  const [mode, setMode] = useState("day"); // "day" | "single"
  const [singleDescription, setSingleDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const hasEntries = todaysEntries && todaysEntries.length > 0;

  async function handleAnalyze(e) {
    e.preventDefault();
    setError("");
    setResult(null);

    if (mode === "single" && !singleDescription.trim()) {
      setError("Describe an activity first.");
      return;
    }
    if (mode === "day" && !hasEntries) {
      setError("No activities logged for this day yet.");
      return;
    }

    setLoading(true);
    try {
      const body =
        mode === "single"
          ? {
              mode: "single",
              description: singleDescription.trim()
            }
          : {
              mode: "day",
              date: currentDate.toISOString().slice(0, 10),
              goal: dailyGoal,
              entries: todaysEntries.map(e => ({
                label: e.label,
                category: e.category,
                amount: e.amount,
                notes: e.notes
              }))
            };

      const res = await fetch(`${API_BASE_URL}/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error("Analyze error:", err);
      setError("Couldn’t analyze right now. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3>AI Insights</h3>
        <p className="card-subtitle">
          Let CarbonCal&apos;s AI coach summarize your impact and suggest small, high-leverage changes.
        </p>
      </div>

      <form className="form" onSubmit={handleAnalyze}>
        <div className="mode-toggle-row">
          <button
            type="button"
            className={`toggle-pill ${mode === "day" ? "toggle-pill-active" : ""}`}
            onClick={() => setMode("day")}
          >
            Analyze today&apos;s activities
          </button>
          <button
            type="button"
            className={`toggle-pill ${mode === "single" ? "toggle-pill-active" : ""}`}
            onClick={() => setMode("single")}
          >
            Analyze one activity
          </button>
        </div>

        {mode === "single" && (
          <div className="form-row">
            <label htmlFor="single-description">Activity to analyze</label>
            <textarea
              id="single-description"
              rows="2"
              placeholder="e.g. Flew to a conference and stayed 3 nights at a hotel"
              value={singleDescription}
              onChange={e => setSingleDescription(e.target.value)}
            />
          </div>
        )}

        {mode === "day" && (
          <div className="hint">
            We&apos;ll use all activities logged for{" "}
            <strong>{currentDate.toLocaleDateString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric"
            })}</strong>{" "}
            plus your daily goal of <strong>{dailyGoal} cc</strong>.
          </div>
        )}

        {error && <p className="estimation-error">{error}</p>}

        <div className="form-actions">
          <button type="submit" className="primary-button" disabled={loading}>
            {loading ? "Analyzing..." : "Generate insights"}
          </button>
        </div>
      </form>

      {result && (
        <div className="insights-result">
          {result.headline && <p className="insights-headline">{result.headline}</p>}
          {result.summary && <p className="insights-summary">{result.summary}</p>}

          {Array.isArray(result.top_insights) && result.top_insights.length > 0 && (
            <div className="insights-section">
              <h4>Key insights</h4>
              <ul>
                {result.top_insights.map((ins, i) => (
                  <li key={i}>{ins}</li>
                ))}
              </ul>
            </div>
          )}

          {Array.isArray(result.suggested_actions) && result.suggested_actions.length > 0 && (
            <div className="insights-section">
              <h4>Suggested actions</h4>
              <ul>
                {result.suggested_actions.map((act, i) => (
                  <li key={i}>{act}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;