"use client";

import { useMemo, useState, useSyncExternalStore, FormEvent, CSSProperties } from "react";
import styles from "./page.module.css";
import PexelsImage from "./components/PexelsImage";
import { TaskStatus, TaskKind, RoutineTask } from "./types";
import { motion, AnimatePresence } from "motion/react";
import { Compass, ListTodo, History, CheckCircle2, RotateCcw, AlertCircle, Ban, ArrowRight, Play, Check, Clock, CalendarDays } from "lucide-react";

const routineTemplate: RoutineTask[] = [
  {
    id: "wake",
    title: "Wake, water, sunlight",
    start: "07:30",
    end: "08:00",
    detail: "One full glass of water, open windows, gentle stretching.",
    kind: "morning",
    priority: "core",
    status: "pending",
  },
  {
    id: "breakfast",
    title: "Breakfast and vitamin C fruit",
    start: "08:00",
    end: "09:00",
    detail: "Iron-supportive meal with fruit like guava, orange, kiwi, or papaya.",
    kind: "meal",
    priority: "core",
    status: "pending",
  },
  {
    id: "morning-call",
    title: "Soft morning call or chat",
    start: "08:45",
    end: "09:10",
    detail: "A low-pressure good morning connection while the day is still calm.",
    kind: "connection",
    priority: "support",
    status: "pending",
  },
  {
    id: "work-1",
    title: "Focused editing block",
    start: "09:30",
    end: "12:00",
    detail: "Focused work, five-minute breaks, water hourly, 20-20-20 eye care.",
    kind: "work",
    priority: "core",
    status: "pending",
  },
  {
    id: "lunch",
    title: "Lunch with iron boost",
    start: "12:00",
    end: "13:00",
    detail: "Rice or grains, protein, greens, and lemon or lime. No coffee right after.",
    kind: "meal",
    priority: "core",
    status: "pending",
  },
  {
    id: "personal",
    title: "Private pleasure reset",
    start: "13:00",
    end: "13:30",
    detail: "Private, relaxed, guilt-free time after lunch before the nap window.",
    kind: "private",
    priority: "support",
    status: "pending",
  },
  {
    id: "nap",
    title: "Natural nap",
    start: "13:30",
    end: "15:00",
    detail: "Cool, dim, comfortable rest. Wake gently without rushing.",
    kind: "sleep",
    priority: "core",
    status: "pending",
  },
  {
    id: "wake-afternoon",
    title: "Gentle wake-up",
    start: "15:00",
    end: "15:30",
    detail: "Water first, wash face, light movement, easy transition.",
    kind: "reset",
    priority: "support",
    status: "pending",
  },
  {
    id: "drink-reset",
    title: "Coffee, plants, reset",
    start: "15:30",
    end: "16:30",
    detail: "Caffeine is safely away from lunch. Add plants, fresh air, or a short outing.",
    kind: "reset",
    priority: "core",
    status: "pending",
  },
  {
    id: "fresh-air",
    title: "Fresh air or cafe outing",
    start: "16:30",
    end: "17:30",
    detail: "A short walk, cafe stop, market look, photos, or anything that gets her outside.",
    kind: "outing",
    priority: "optional",
    status: "pending",
  },
  {
    id: "work-2",
    title: "Optional light work",
    start: "17:30",
    end: "18:00",
    detail: "Replies, planning, or one small edit only. Keep it light and bounded.",
    kind: "work",
    priority: "optional",
    status: "pending",
  },
  {
    id: "movement",
    title: "Gentle movement",
    start: "17:30",
    end: "18:00",
    detail: "Walking, stretching, yoga, light dancing, or an easy workout. Low pressure counts.",
    kind: "movement",
    priority: "support",
    status: "pending",
  },
  {
    id: "dinner",
    title: "Dinner",
    start: "18:00",
    end: "20:00",
    detail: "Comforting meal, lighter sodium, water or herbal drink.",
    kind: "meal",
    priority: "core",
    status: "pending",
  },
  {
    id: "personal-care",
    title: "Skincare and personal care",
    start: "20:45",
    end: "21:15",
    detail: "Skincare, wash up, soft clothes, warm light, and no rushed energy.",
    kind: "care",
    priority: "support",
    status: "pending",
  },
  {
    id: "night-call",
    title: "Loving call or chat",
    start: "21:15",
    end: "22:00",
    detail: "Connection, comfort, affection, and light conversation without stressful topics.",
    kind: "connection",
    priority: "core",
    status: "pending",
  },
  {
    id: "wind-down",
    title: "Night wind-down",
    start: "22:00",
    end: "23:00",
    detail: "Skincare, calm music, relaxed call, light videos, no stressful topics.",
    kind: "rest",
    priority: "core",
    status: "pending",
  },
  {
    id: "sleep",
    title: "Sleep",
    start: "23:00",
    end: "07:30",
    detail: "Cool, dark, calm room. Protect the rhythm for tomorrow.",
    kind: "sleep",
    priority: "core",
    status: "pending",
  },
];

const statusLabels: Record<TaskStatus, string> = {
  pending: "Pending",
  doing: "Doing now",
  later: "Later",
  done: "Done",
  cancelled: "Cancelled today",
};

const taskImageAlt: Record<TaskKind, string> = {
  morning: "Morning water, light, and stretch routine",
  meal: "Balanced meal for the routine",
  work: "Focused editing workspace",
  rest: "Restful reset routine",
  reset: "Afternoon drinks and plant reset",
  sleep: "Sleep and recovery routine",
  movement: "Gentle workout and movement routine",
  outing: "Fresh air, cafe, or going out reset",
  care: "Skincare and personal care routine",
  connection: "Loving call or chat routine",
  private: "Private relaxation and pleasure reset routine",
};

let clockSnapshot = Date.now();

function subscribeToMinute(callback: () => void) {
  const tick = () => {
    clockSnapshot = Date.now();
    callback();
  };
  const interval = window.setInterval(tick, 30_000);
  return () => window.clearInterval(interval);
}

function getServerTime() {
  return new Date("2026-05-28T07:30:00").getTime();
}

function getClientTime() {
  return clockSnapshot;
}

function minutesFromTime(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function formatTime(value: string) {
  const [rawHour, minute] = value.split(":").map(Number);
  const period = rawHour >= 12 ? "PM" : "AM";
  const hour = rawHour % 12 || 12;
  return `${hour}:${minute.toString().padStart(2, "0")} ${period}`;
}

function addMinutes(value: string, amount: number) {
  const total = (minutesFromTime(value) + amount + 1440) % 1440;
  const hour = Math.floor(total / 60);
  const minute = total % 60;
  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
}

function durationMinutes(task: RoutineTask) {
  const start = minutesFromTime(task.start);
  const end = minutesFromTime(task.end);
  return end > start ? end - start : end + 1440 - start;
}

function isInWindow(task: RoutineTask, nowMinutes: number) {
  const start = minutesFromTime(task.start);
  const end = minutesFromTime(task.end);

  if (end < start) {
    return nowMinutes >= start || nowMinutes < end;
  }

  return nowMinutes >= start && nowMinutes < end;
}

function isPast(task: RoutineTask, nowMinutes: number) {
  const start = minutesFromTime(task.start);
  const end = minutesFromTime(task.end);

  if (end < start) {
    return false;
  }

  return nowMinutes >= end;
}

function themeForMinutes(minutes: number) {
  if (minutes < 360) {
    return "nightTheme";
  }

  if (minutes < 660) {
    return "morningTheme";
  }

  if (minutes < 900) {
    return "dayTheme";
  }

  if (minutes < 1080) {
    return "afternoonTheme";
  }

  if (minutes < 1260) {
    return "eveningTheme";
  }

  return "nightTheme";
}

function sortByStart(tasks: RoutineTask[]) {
  return [...tasks].sort((a, b) => minutesFromTime(a.start) - minutesFromTime(b.start));
}

export default function App() {
  const now = useSyncExternalStore(subscribeToMinute, getClientTime, getServerTime);
  const [tasks, setTasks] = useState<RoutineTask[]>(routineTemplate);
  const [activeTab, setActiveTab] = useState<"focus" | "schedule" | "review">("focus");
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDetail, setNewTaskDetail] = useState("");
  const [newTaskStart, setNewTaskStart] = useState("09:30");
  const [newTaskEnd, setNewTaskEnd] = useState("10:30");
  const [newTaskKind, setNewTaskKind] = useState<TaskKind>("work");
  const [newTaskPriority, setNewTaskPriority] = useState<"core" | "support" | "optional">("core");

  // Constant list of beautiful background floating bubbles
  const particles = useMemo(() => {
    return Array.from({ length: 14 }).map((_, i) => {
      const size = Math.random() * 180 + 70;
      const left = Math.random() * 100;
      const top = Math.random() * 100;
      const duration = Math.random() * 25 + 20; 
      const delay = Math.random() * -20; 
      const xDist = (Math.random() - 0.5) * 160; 
      const yDist = (Math.random() - 0.5) * 160;
      
      const colors = [
        "rgba(255, 182, 193, 0.22)", // Warm rose
        "rgba(173, 216, 230, 0.18)", // Cool blue
        "rgba(221, 160, 221, 0.2)",  // Pale plum
        "rgba(255, 222, 173, 0.15)", // Soft peach
      ];
      const color = colors[i % colors.length];

      return {
        id: i,
        style: {
          width: `${size}px`,
          height: `${size}px`,
          left: `${left}%`,
          top: `${top}%`,
          background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
          "--speed": `${duration}s`,
          "--delay": `${delay}s`,
          "--x": `${xDist}px`,
          "--y": `${yDist}px`,
        } as CSSProperties,
      };
    });
  }, []);

  function handleAddTask(e: FormEvent) {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const newTask: RoutineTask = {
      id: `custom-${Date.now()}`,
      title: newTaskTitle.trim(),
      start: newTaskStart,
      end: newTaskEnd,
      detail: newTaskDetail.trim() || `My scheduled ${newTaskKind} task.`,
      kind: newTaskKind,
      priority: newTaskPriority,
      status: "pending",
    };

    setTasks((current) => sortByStart([...current, newTask]));
    setNewTaskTitle("");
    setNewTaskDetail("");
    setShowAddForm(false);
  }
  
  const nowDate = new Date(now);
  const nowMinutes = nowDate.getHours() * 60 + nowDate.getMinutes();
  const theme = themeForMinutes(nowMinutes);
  
  const liveTask =
    tasks.find((task) => task.status !== "done" && task.status !== "cancelled" && isInWindow(task, nowMinutes)) ??
    sortByStart(tasks).find((task) => task.status === "later" || task.status === "pending") ??
    tasks[0];

  const visibleQueue = useMemo(
    () => sortByStart(tasks.filter((task) => task.status === "pending" || task.status === "later" || task.status === "doing")),
    [tasks],
  );
  
  const pendingTasks = visibleQueue.filter((task) => task.status !== "doing" && isPast(task, nowMinutes));
  const doneTasks = tasks.filter((task) => task.status === "done");
  const cancelledTasks = tasks.filter((task) => task.status === "cancelled");
  const completeCount = doneTasks.length;
  const activeCount = tasks.filter((task) => task.status !== "cancelled").length;
  const score = Math.round((completeCount / Math.max(activeCount, 1)) * 100);

  function updateTask(id: string, updater: (task: RoutineTask) => RoutineTask) {
    setTasks((current) => sortByStart(current.map((task) => (task.id === id ? updater(task) : task))));
  }

  function setStatus(id: string, status: TaskStatus) {
    updateTask(id, (task) => ({ ...task, status }));
  }

  function moveLater(id: string, minutes: number) {
    updateTask(id, (task) => {
      const nextStart = addMinutes(task.start, minutes);
      return {
        ...task,
        start: nextStart,
        end: addMinutes(nextStart, durationMinutes(task)),
        status: "later",
      };
    });
  }

  function reschedule(id: string, start: string) {
    updateTask(id, (task) => ({
      ...task,
      start,
      end: addMinutes(start, durationMinutes(task)),
      status: "later",
    }));
  }

  function resetDay() {
    setTasks(routineTemplate);
  }

  return (
    <main className={`${styles.page} ${styles[theme]}`}>
      {/* Floating ambient colored particles background */}
      <div className={styles.particlesContainer}>
        {particles.map((p) => (
          <div
            key={p.id}
            className={styles.particle}
            style={p.style}
          />
        ))}
      </div>

      <section className={`${styles.appShell} pb-28 md:pb-6`}>
        <header className={styles.topBar}>
          <div>
            <span className={styles.kicker}>Live routine queue</span>
            <h1>Today&apos;s Perfect Routine</h1>
          </div>
          <div className={styles.clockPanel}>
            <span>{nowDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            <small>{nowDate.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" })}</small>
          </div>
        </header>

        {/* Main Tab Content Panel */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="w-full"
          >
            {activeTab === "focus" && (
              <div className="space-y-6">
                <section className={styles.livePanel} aria-label="Current routine task">
                  <div className={styles.liveImage}>
                    <PexelsImage
                      kind={liveTask.kind}
                      alt={taskImageAlt[liveTask.kind]}
                      priority
                      className={styles.taskImage}
                    />
                  </div>
                  <div className={styles.liveContent}>
                    <div className={styles.liveMeta}>
                      <span className={`${styles.statusPill} ${styles[liveTask.status]}`}>{statusLabels[liveTask.status]}</span>
                      <span>{liveTask.priority}</span>
                    </div>
                    <h2>{liveTask.title}</h2>
                    <p>{liveTask.detail}</p>
                    <div className={styles.timeRange}>
                      {formatTime(liveTask.start)} - {formatTime(liveTask.end)}
                    </div>
                    <div className={styles.actionRow}>
                      <button type="button" onClick={() => setStatus(liveTask.id, "doing")}>
                        Start now
                      </button>
                      <button type="button" onClick={() => setStatus(liveTask.id, "done")}>
                        Done
                      </button>
                      <button type="button" onClick={() => moveLater(liveTask.id, 30)}>
                        Later +30
                      </button>
                      <button type="button" onClick={() => setStatus(liveTask.id, "cancelled")}>
                        Cancel today
                      </button>
                    </div>
                  </div>
                </section>

                <section className={styles.metrics} aria-label="Routine summary">
                  <article>
                    <span>Routine score</span>
                    <strong>{score}%</strong>
                    <div className={styles.progressTrack}>
                      <span style={{ width: `${score}%` }} />
                    </div>
                  </article>
                  <article>
                    <span>Pending</span>
                    <strong>{pendingTasks.length}</strong>
                    <small>Needs attention or reschedule</small>
                  </article>
                  <article>
                    <span>Done</span>
                    <strong>{doneTasks.length}</strong>
                    <small>Completed today</small>
                  </article>
                  <article>
                    <span>Cancelled</span>
                    <strong>{cancelledTasks.length}</strong>
                    <small>Removed only for today</small>
                  </article>
                </section>
              </div>
            )}

            {activeTab === "schedule" && (
              <div className={styles.queuePanel}>
                <div className={styles.sectionHeader}>
                  <div>
                    <span className={styles.kicker}>Task queue</span>
                    <h2>What needs to be done</h2>
                  </div>
                  <div className="flex flex-row items-center gap-2 select-none">
                    <button 
                      className={styles.addTaskButton} 
                      type="button" 
                      onClick={() => setShowAddForm(!showAddForm)}
                    >
                      {showAddForm ? "Close Form" : "+ Add task"}
                    </button>
                    <button className={styles.resetButton} type="button" onClick={resetDay}>
                      Reset day
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {showAddForm && (
                     <motion.form 
                       onSubmit={handleAddTask}
                       initial={{ opacity: 0, height: 0 }}
                       animate={{ opacity: 1, height: "auto" }}
                       exit={{ opacity: 0, height: 0 }}
                       transition={{ duration: 0.25, ease: "easeInOut" }}
                       className={styles.addFormContainer}
                     >
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="space-y-1">
                           <label className="text-[10px] font-bold tracking-wider text-[var(--muted)] uppercase">Task Title</label>
                           <input 
                             type="text" 
                             required
                             placeholder="e.g. Lip gloss recording..." 
                             value={newTaskTitle}
                             onChange={(e) => setNewTaskTitle(e.target.value)}
                             className={styles.formInput}
                           />
                         </div>
                         <div className="space-y-1">
                           <label className="text-[10px] font-bold tracking-wider text-[var(--muted)] uppercase">Category / Aesthetic Icon</label>
                           <select 
                             value={newTaskKind}
                             onChange={(e) => setNewTaskKind(e.target.value as TaskKind)}
                             className={styles.formSelect}
                           >
                             <option value="morning">Morning water &amp; light</option>
                             <option value="meal">Nourishing meal</option>
                             <option value="work">Cosmetics / video editing block</option>
                             <option value="care">Vlog skincare routine</option>
                             <option value="connection">Sweet phone talk</option>
                             <option value="outing">Lush garden cafe / fresh air</option>
                             <option value="movement">Yoga stretch block</option>
                             <option value="rest">Atmospheric reset winddown</option>
                             <option value="sleep">Moonlight dream deep sleep</option>
                           </select>
                         </div>
                       </div>
                       
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                         <div className="space-y-1">
                           <label className="text-[10px] font-bold tracking-wider text-[var(--muted)] uppercase">Start Time</label>
                           <input 
                             type="time" 
                             value={newTaskStart}
                             onChange={(e) => setNewTaskStart(e.target.value)}
                             className={styles.formInput}
                           />
                         </div>
                         <div className="space-y-1">
                           <label className="text-[10px] font-bold tracking-wider text-[var(--muted)] uppercase">End Time</label>
                           <input 
                             type="time" 
                             value={newTaskEnd}
                             onChange={(e) => setNewTaskEnd(e.target.value)}
                             className={styles.formInput}
                           />
                         </div>
                         <div className="space-y-1">
                           <label className="text-[10px] font-bold tracking-wider text-[var(--muted)] uppercase">Priority</label>
                           <select 
                             value={newTaskPriority}
                             onChange={(e) => setNewTaskPriority(e.target.value as any)}
                             className={styles.formSelect}
                           >
                             <option value="core">Core</option>
                             <option value="support">Support</option>
                             <option value="optional">Optional</option>
                           </select>
                         </div>
                       </div>

                       <div className="space-y-1 mt-3">
                         <label className="text-[10px] font-bold tracking-wider text-[var(--muted)] uppercase">Activity Detail / Guidance</label>
                         <textarea 
                           placeholder="Specifies steps to follow..."
                           value={newTaskDetail}
                           onChange={(e) => setNewTaskDetail(e.target.value)}
                           rows={2}
                           className={styles.formTextarea}
                         />
                       </div>

                       <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-white/10">
                         <button 
                           type="button" 
                           onClick={() => setShowAddForm(false)}
                           className={styles.cancelBtn}
                         >
                           Cancel
                         </button>
                         <button 
                           type="submit" 
                           className={styles.submitBtn}
                         >
                           Save Task
                         </button>
                       </div>
                     </motion.form>
                  )}
                </AnimatePresence>

                <div className={styles.taskList}>
                  {visibleQueue.length === 0 ? (
                    <div className="p-8 text-center rounded-2xl bg-white/10 dark:bg-black/10 text-[var(--muted)]">
                      All tasks completed or skipped! Reset the template to start again.
                    </div>
                  ) : (
                    visibleQueue.map((task) => {
                      const overdue = task.status !== "doing" && isPast(task, nowMinutes);
                      return (
                        <article className={`${styles.taskCard} ${overdue ? styles.overdue : ""}`} key={task.id}>
                          <div className={styles.thumb}>
                            <PexelsImage
                              kind={task.kind}
                              alt={taskImageAlt[task.kind]}
                              className={styles.taskImage}
                            />
                          </div>
                          <div className={styles.taskBody}>
                            <div className={styles.cardTop}>
                              <span className={`${styles.statusPill} ${overdue ? styles.pending : styles[task.status]}`}>
                                {overdue ? "Pending" : statusLabels[task.status]}
                              </span>
                              <time>
                                {formatTime(task.start)} - {formatTime(task.end)}
                              </time>
                            </div>
                            <h3>{task.title}</h3>
                            <p>{task.detail}</p>
                            <div className={styles.cardActions}>
                              <button type="button" onClick={() => setStatus(task.id, "doing")}>
                                Doing
                              </button>
                              <button type="button" onClick={() => setStatus(task.id, "done")}>
                                Done
                              </button>
                              <button type="button" onClick={() => moveLater(task.id, 30)}>
                                Later
                              </button>
                              <button type="button" onClick={() => setStatus(task.id, "cancelled")}>
                                Skip
                              </button>
                              <div className={styles.rescheduleControl}>
                                <Clock className="w-3.5 h-3.5" />
                                <span>Reschedule: {formatTime(task.start)}</span>
                                <input
                                  className={styles.rescheduleRealInput}
                                  type="time"
                                  value={task.start}
                                  step={300}
                                  aria-label={`Reschedule ${task.title}`}
                                  onChange={(event) => reschedule(task.id, event.target.value)}
                                  onInput={(event) => reschedule(task.id, (event.target as HTMLInputElement).value)}
                                />
                              </div>
                            </div>
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {activeTab === "review" && (
              <div className={`${styles.sidePanel} grid grid-cols-1 md:grid-cols-3 gap-6 align-content-start`}>
                <section className="h-full">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-5 h-5 text-amber-500 animate-pulse" />
                    <span className={styles.kicker}>Pending</span>
                  </div>
                  <h2>Needs attention</h2>
                  <div className={styles.miniList}>
                    {pendingTasks.length === 0 ? (
                      <p>No overdue routine tasks right now.</p>
                    ) : (
                      pendingTasks.map((task) => (
                        <button type="button" key={task.id} onClick={() => moveLater(task.id, 30)} className="w-full flex-col items-start gap-1 p-3">
                          <strong>{task.title}</strong>
                          <span className="text-[var(--muted)] text-xs flex items-center gap-1 mt-1">
                            <Clock className="w-3.5 h-3.5" /> Move 30 minutes later
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </section>

                <section className="h-full">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    <span className={styles.kicker}>Completed</span>
                  </div>
                  <h2>Done</h2>
                  <div className={styles.miniList}>
                    {doneTasks.length === 0 ? (
                      <p>Nothing completed yet.</p>
                    ) : (
                      doneTasks.map((task) => (
                        <button type="button" key={task.id} onClick={() => setStatus(task.id, "pending")} className="w-full flex-col items-start gap-1 p-3">
                          <strong>{task.title}</strong>
                          <span className="text-[var(--muted)] text-xs flex items-center gap-1 mt-1">
                            <RotateCcw className="w-3.5 h-3.5" /> Mark pending again
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </section>

                <section className="h-full">
                  <div className="flex items-center gap-2 mb-2">
                    <Ban className="w-5 h-5 text-neutral-400" />
                    <span className={styles.kicker}>Cancelled today</span>
                  </div>
                  <h2>Skipped</h2>
                  <div className={styles.miniList}>
                    {cancelledTasks.length === 0 ? (
                      <p>No cancelled tasks.</p>
                    ) : (
                      cancelledTasks.map((task) => (
                        <button type="button" key={task.id} onClick={() => setStatus(task.id, "pending")} className="w-full flex-col items-start gap-1 p-3">
                          <strong>{task.title}</strong>
                          <span className="text-[var(--muted)] text-xs flex items-center gap-1 mt-1">
                            <RotateCcw className="w-3.5 h-3.5" /> Bring back
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </section>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Floating System Tab Bar */}
        <div className={styles.navigationSelectorMobile}>
          <button
            onClick={() => setActiveTab("focus")}
            className={`${styles.navigationButtonMobile} ${activeTab === "focus" ? styles.navigationButtonActive : ""}`}
          >
            <Compass className="w-4 h-4" />
            <span>Focus</span>
          </button>
          
          <button
            onClick={() => setActiveTab("schedule")}
            className={`${styles.navigationButtonMobile} ${activeTab === "schedule" ? styles.navigationButtonActive : ""}`}
          >
            <ListTodo className="w-4 h-4" />
            <span>Schedule</span>
            {pendingTasks.length > 0 && (
              <span className={styles.badgeMobile}>
                {pendingTasks.length}
              </span>
            )}
          </button>
          
          <button
            onClick={() => setActiveTab("review")}
            className={`${styles.navigationButtonMobile} ${activeTab === "review" ? styles.navigationButtonActive : ""}`}
          >
            <History className="w-4 h-4" />
            <span>Review</span>
          </button>
        </div>
      </section>
    </main>
  );
}
