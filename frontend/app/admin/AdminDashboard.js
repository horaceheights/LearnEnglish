"use client";

import { useMemo, useState } from "react";

import LearnerActions from "./LearnerActions";
import styles from "./admin.module.css";

const TIME_ZONE = "America/Mexico_City";
const DAY_MS = 24 * 60 * 60 * 1000;

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function percentage(value, total) {
  return total ? Math.round((number(value) / number(total)) * 100) : 0;
}

function friendlyDate(value) {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function relativeDate(value, now) {
  if (!value) return "Never active";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  const days = Math.max(0, Math.floor((now - date.getTime()) / DAY_MS));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 14) return `${days} days ago`;
  return friendlyDate(value);
}

function learnerStatus(learner, now) {
  if (!number(learner.visits)) return { key: "not-started", label: "Not started" };
  const lastSeen = new Date(learner.last_seen).getTime();
  const daysSinceActivity = Number.isFinite(lastSeen) ? (now - lastSeen) / DAY_MS : Infinity;
  if (!number(learner.completed_sessions) && daysSinceActivity > 7) return { key: "stalled", label: "Stalled" };
  if (daysSinceActivity > 14) return { key: "inactive", label: "Inactive" };
  if (daysSinceActivity <= 7) return { key: "active", label: "Active" };
  return { key: "in-progress", label: "In progress" };
}

function LessonScore({ result }) {
  if (!result) return <span className={styles.emptyScore}>—</span>;
  if (!number(result.completed_runs)) {
    return <span className={styles.inProgressScore} title={`${result.visits} visit${result.visits === 1 ? "" : "s"}, not completed`}>In progress</span>;
  }
  const rounded = Math.round(number(result.average_score));
  const tone = rounded >= 90 ? styles.goodScore : rounded >= 75 ? styles.mediumScore : styles.lowScore;
  return (
    <div title={`Average of ${result.completed_runs} completed run${result.completed_runs === 1 ? "" : "s"}. Best: ${Math.round(number(result.best_score))}%`}>
      <span className={`${styles.scorePill} ${tone}`}>{rounded}%</span>
      {result.completed_runs > 1 && <span className={styles.runCount}>{result.completed_runs} runs</span>}
    </div>
  );
}

function MetricCard({ label, value, note, tone = "default" }) {
  return (
    <div className={`${styles.metricCard} ${styles[`metric-${tone}`] || ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}

function Bar({ value, tone = "green" }) {
  return (
    <span className={styles.barTrack} aria-hidden="true">
      <span className={`${styles.barFill} ${styles[`bar-${tone}`]}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </span>
  );
}

export default function AdminDashboard({ summary }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [unitFilter, setUnitFilter] = useState("1");
  const [feedbackFilter, setFeedbackFilter] = useState("all");
  const now = Date.now();
  const totals = summary?.totals ?? {};
  const lessons = summary?.lessons ?? [];
  const learners = summary?.learners ?? [];
  const feedback = summary?.feedback ?? [];
  const difficultCards = summary?.difficult_cards ?? [];
  const lessonNames = Object.fromEntries(lessons.map((lesson) => [lesson.id, lesson.number]));
  const lessonUnits = [...new Set(lessons.map((lesson) => lesson.number?.split(".")[0]).filter(Boolean))];
  const visibleLessons = unitFilter === "all"
    ? lessons
    : lessons.filter((lesson) => lesson.number?.startsWith(`${unitFilter}.`));

  const insights = useMemo(() => {
    const activeLearners = learners.filter((learner) => {
      const seen = new Date(learner.last_seen).getTime();
      return Number.isFinite(seen) && now - seen <= 7 * DAY_MS;
    }).length;
    const firstTryCorrect = learners.reduce((sum, learner) => sum + number(learner.first_try_correct), 0);
    const cardsPracticed = number(totals.cards_practiced);
    const lessonVisits = number(totals.lesson_visits);
    const completedLessons = number(totals.completed_lessons);
    const feedbackScore = feedback.reduce((sum, item) => sum + percentage(item.score, item.total_cards), 0);
    const confusingFeedback = feedback.filter((item) => /confusa/i.test(item.clarity_rating ?? "")).length;
    const noSupport = feedback.filter((item) => item.learning_support === "Ninguno").length;

    const statuses = learners.reduce((counts, learner) => {
      const status = learnerStatus(learner, now).key;
      counts[status] = (counts[status] ?? 0) + 1;
      return counts;
    }, {});

    const lessonPerformance = lessons.map((lesson) => {
      let visits = 0;
      let completed = 0;
      let weightedScore = 0;
      learners.forEach((learner) => {
        const result = learner.lesson_scores?.[lesson.id];
        if (!result) return;
        visits += number(result.visits);
        completed += number(result.completed_runs);
        weightedScore += number(result.average_score) * number(result.completed_runs);
      });
      return {
        ...lesson,
        visits,
        completed,
        completionRate: percentage(completed, visits),
        averageScore: completed ? Math.round(weightedScore / completed) : null,
      };
    });

    return {
      activeLearners,
      completionRate: percentage(completedLessons, lessonVisits),
      firstTryRate: percentage(firstTryCorrect, cardsPracticed),
      attemptsPerCard: cardsPracticed ? (number(totals.answer_taps) / cardsPracticed).toFixed(1) : "0.0",
      averageFeedbackScore: feedback.length ? Math.round(feedbackScore / feedback.length) : 0,
      confusingFeedback,
      noSupport,
      statuses,
      lessonPerformance,
    };
  }, [feedback, learners, lessons, now, totals]);

  const visibleLearners = learners.filter((learner) => {
    const matchesName = learner.display_name?.toLowerCase().includes(search.trim().toLowerCase());
    const status = learnerStatus(learner, now).key;
    return matchesName && (statusFilter === "all" || status === statusFilter);
  });
  const visibleFeedback = feedback.filter((item) => {
    if (feedbackFilter === "confusing") return /confusa/i.test(item.clarity_rating ?? "");
    if (feedbackFilter === "comments") return Boolean(item.comment_text);
    return true;
  });
  const attentionTotal = number(insights.statuses.stalled) + number(insights.statuses.inactive) + number(insights.confusingFeedback);

  return (
    <main className={styles.page}>
      <div className={styles.dashboard}>
        <header className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>Testing dashboard</p>
            <h1>Learner insights</h1>
            <p>Progress, friction, and pilot feedback in one place.</p>
          </div>
          <div className={styles.heroMeta}>
            <span>Live data</span>
            <small>Times shown in Mexico City</small>
          </div>
        </header>

        <section className={styles.metrics} aria-label="Program overview">
          <MetricCard label="Learners" value={number(totals.users)} note={`${insights.activeLearners} active in the last 7 days`} />
          <MetricCard label="Completion rate" value={`${insights.completionRate}%`} note={`${number(totals.completed_lessons)} of ${number(totals.lesson_visits)} lesson visits`} tone={insights.completionRate >= 70 ? "positive" : "warning"} />
          <MetricCard label="First-try accuracy" value={`${insights.firstTryRate}%`} note={`${insights.attemptsPerCard} answer taps per card`} tone={insights.firstTryRate >= 75 ? "positive" : "warning"} />
          <MetricCard label="Feedback" value={feedback.length} note={feedback.length ? `${insights.averageFeedbackScore}% average lesson score` : "No survey responses yet"} />
        </section>

        <section className={styles.signalStrip} aria-label="Attention summary">
          <div>
            <span className={styles.signalIcon}>!</span>
            <div><strong>{attentionTotal} signals need a look</strong><small>Use these as investigation prompts, not automatic conclusions.</small></div>
          </div>
          <ul>
            <li><strong>{number(insights.statuses.stalled)}</strong> stalled learners</li>
            <li><strong>{number(insights.statuses.inactive)}</strong> inactive learners</li>
            <li><strong>{insights.confusingFeedback}</strong> confusing ratings</li>
          </ul>
        </section>

        <section className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.sectionKicker}>Start here</p>
              <h2>Learner progress</h2>
              <p>Scan engagement, completion, practice quality, and lesson results per learner.</p>
            </div>
            <div className={styles.filters}>
              <label>
                <span className={styles.srOnly}>Search learners</span>
                <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search learners…" />
              </label>
              <label>
                <span className={styles.srOnly}>Filter by learner status</span>
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                  <option value="all">All statuses</option>
                  <option value="active">Active</option>
                  <option value="in-progress">In progress</option>
                  <option value="stalled">Stalled</option>
                  <option value="inactive">Inactive</option>
                  <option value="not-started">Not started</option>
                </select>
              </label>
              <label>
                <span className={styles.srOnly}>Filter lesson columns by unit</span>
                <select value={unitFilter} onChange={(event) => setUnitFilter(event.target.value)}>
                  {lessonUnits.map((unit) => <option key={unit} value={unit}>Unit {unit}</option>)}
                  <option value="all">All units</option>
                </select>
              </label>
            </div>
          </div>

          <div className={styles.tableFrame}>
            <table className={`${styles.dataTable} ${styles.progressTable}`}>
              <thead>
                <tr>
                  <th className={styles.stickyColumn}>Learner</th>
                  <th>Status</th>
                  <th className={styles.center}>Visits</th>
                  <th className={styles.center}>Finished</th>
                  <th className={styles.center}>1st try</th>
                  <th className={styles.center}>Tries/card</th>
                  {visibleLessons.map((lesson) => <th key={lesson.id} className={styles.lessonHeading} title={lesson.title}><strong>{lesson.number}</strong><span>AVG</span></th>)}
                  <th>Last active</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleLearners.map((learner) => {
                  const status = learnerStatus(learner, now);
                  const completionRate = percentage(learner.completed_sessions, learner.visits);
                  const firstTryRate = percentage(learner.first_try_correct, learner.cards_practiced);
                  return (
                    <tr key={learner.id}>
                      <td className={styles.stickyColumn}><strong>{learner.display_name}</strong><small>{number(learner.cards_practiced)} cards practiced</small></td>
                      <td><span className={`${styles.statusPill} ${styles[`status-${status.key}`]}`}>{status.label}</span></td>
                      <td className={styles.center}>{number(learner.visits)}</td>
                      <td className={styles.metricCell}><strong>{number(learner.completed_sessions)} <small>· {completionRate}%</small></strong><Bar value={completionRate} /></td>
                      <td className={styles.metricCell}><strong>{learner.cards_practiced ? `${firstTryRate}%` : "—"}</strong><Bar value={firstTryRate} tone={firstTryRate >= 75 ? "green" : "orange"} /></td>
                      <td className={styles.center}>{learner.cards_practiced ? number(learner.avg_attempts).toFixed(1) : "—"}</td>
                      {visibleLessons.map((lesson) => <td key={lesson.id} className={styles.center}><LessonScore result={learner.lesson_scores?.[lesson.id]} /></td>)}
                      <td className={styles.dateCell} title={learner.last_seen}><strong>{relativeDate(learner.last_seen, now)}</strong><small>{learner.last_seen ? friendlyDate(learner.last_seen) : "No activity recorded"}</small></td>
                      <td><LearnerActions learner={{ id: learner.id, display_name: learner.display_name }} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!visibleLearners.length && <p className={styles.emptyState}>No learners match this view.</p>}
          </div>
          <p className={styles.tableNote}>Lesson columns show average completed-run scores. “In progress” means a lesson was opened but not finished.</p>
        </section>

        <section className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.sectionKicker}>Learner voice</p>
              <h2>Lesson feedback</h2>
              <p>Survey responses sit directly below progress so results and learner sentiment can be read together.</p>
            </div>
            <label className={styles.filters}>
              <span className={styles.srOnly}>Filter feedback</span>
              <select value={feedbackFilter} onChange={(event) => setFeedbackFilter(event.target.value)}>
                <option value="all">All feedback</option>
                <option value="confusing">Confusing ratings</option>
                <option value="comments">With comments</option>
              </select>
            </label>
          </div>

          <div className={styles.feedbackSummary}>
            <div><span>Easy or very easy</span><strong>{percentage(feedback.filter((item) => /fácil/i.test(item.clarity_rating ?? "")).length, feedback.length)}%</strong></div>
            <div><span>Images + audio helped</span><strong>{percentage(feedback.filter((item) => item.learning_support === "Sí, ambos").length, feedback.length)}%</strong></div>
            <div><span>Confusing responses</span><strong>{insights.confusingFeedback}</strong></div>
            <div><span>No helpful element</span><strong>{insights.noSupport}</strong></div>
          </div>

          {!feedback.length ? <p className={styles.emptyState}>No survey responses yet.</p> : (
            <div className={styles.tableFrame}>
              <table className={styles.dataTable}>
                <thead><tr>{["Learner", "Lesson", "Clarity", "Helpful element", "Comment", "Result", "App", "Submitted"].map((heading) => <th key={heading}>{heading}</th>)}</tr></thead>
                <tbody>
                  {visibleFeedback.map((item) => (
                    <tr key={item.id}>
                      <td><strong>{item.display_name}</strong></td>
                      <td>{lessonNames[item.lesson_id] || item.lesson_id}</td>
                      <td><span className={`${styles.feedbackPill} ${/confusa/i.test(item.clarity_rating ?? "") ? styles.feedbackConcern : ""}`}>{item.clarity_rating}</span></td>
                      <td>{item.learning_support}</td>
                      <td className={styles.commentCell}>{item.comment_text || "—"}</td>
                      <td className={styles.nowrap}><strong>{percentage(item.score, item.total_cards)}%</strong> <small>({item.score}/{item.total_cards})</small></td>
                      <td title={item.update_id}>{item.app_version || "—"}</td>
                      <td className={styles.dateCell} title={item.submitted_at}><strong>{relativeDate(item.submitted_at, now)}</strong><small>{friendlyDate(item.submitted_at)}</small></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!visibleFeedback.length && <p className={styles.emptyState}>No feedback matches this view.</p>}
            </div>
          )}
        </section>

        <section className={styles.insightGrid}>
          <div className={styles.sectionCard}>
            <div className={styles.sectionHeader}><div><p className={styles.sectionKicker}>Curriculum view</p><h2>Lesson performance</h2><p>Weighted scores and completion by lesson.</p></div></div>
            <div className={styles.lessonList}>
              {insights.lessonPerformance.filter((lesson) => lesson.visits > 0).map((lesson) => (
                <div key={lesson.id} className={styles.lessonRow}>
                  <div><strong>{lesson.number}</strong><span title={lesson.title}>{lesson.title}</span></div>
                  <div><small>Completion</small><strong>{lesson.completionRate}%</strong><Bar value={lesson.completionRate} /></div>
                  <div><small>Avg score</small><strong>{lesson.averageScore === null ? "—" : `${lesson.averageScore}%`}</strong></div>
                  <div><small>Visits</small><strong>{lesson.visits}</strong></div>
                </div>
              ))}
              {!insights.lessonPerformance.some((lesson) => lesson.visits > 0) && <p className={styles.emptyState}>No lesson activity yet.</p>}
            </div>
          </div>

          <div className={styles.sectionCard}>
            <div className={styles.sectionHeader}><div><p className={styles.sectionKicker}>Friction</p><h2>Cards needing attention</h2><p>Prompts with the most misses, including their miss rate.</p></div></div>
            <div className={styles.cardList}>
              {difficultCards.map((card, index) => {
                const missRate = percentage(card.misses, card.attempts);
                return (
                  <div key={`${card.prompt}-${index}`} className={styles.cardRow}>
                    <span className={styles.rank}>{index + 1}</span>
                    <div><strong>{card.prompt}</strong><small>{card.misses} misses · {card.attempts} attempts</small></div>
                    <div className={styles.missRate}><strong>{missRate}%</strong><small>miss rate</small></div>
                  </div>
                );
              })}
              {!difficultCards.length && <p className={styles.emptyState}>No missed cards yet.</p>}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
