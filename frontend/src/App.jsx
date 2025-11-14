import React, { useState, useEffect, useMemo } from "react";

const CATEGORY_PRESETS = [
  { label: "Transport", value: "transport" },
  { label: "Food", value: "food" },
  { label: "Home & Energy", value: "home" },
  { label: "Shopping", value: "shopping" },
  { label: "Other", value: "other" }
];

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
      <Header />
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
    </div>
  );
}

function Header() {
  return (
    <header className="app-header">
      <div className="app-logo">CarbonCal</div>
      <nav className="app-nav">
        <button className="nav-button subtle">Overview</button>
        <button className="nav-button subtle">History</button>
        <button className="nav-button subtle">Insights</button>
      </nav>
      <div className="header-actions">
        <button className="nav-button ghost">Dark</button>
        <button className="primary-pill">Today</button>
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
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3>Log Activity</h3>
        <p className="card-subtitle">
          Add trips, meals, or habits — we’ll convert them into carbon calories.
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
          <label htmlFor="label">Activity</label>
          <input
            id="label"
            type="text"
            placeholder="e.g. 3 km Uber ride"
            value={label}
            onChange={e => setLabel(e.target.value)}
          />
        </div>

        <div className="form-row">
          <label htmlFor="amount">Carbon calories</label>
          <input
            id="amount"
            type="number"
            min="0"
            step="1"
            placeholder="e.g. 250"
            value={amount}
            onChange={e => setAmount(e.target.value)}
          />
        </div>

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

export default App;