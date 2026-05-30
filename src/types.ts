export type TaskStatus = "pending" | "doing" | "later" | "done" | "cancelled";

export type TaskKind =
  | "morning"
  | "meal"
  | "work"
  | "rest"
  | "reset"
  | "sleep"
  | "movement"
  | "outing"
  | "care"
  | "connection"
  | "private";

export interface RoutineTask {
  id: string;
  title: string;
  start: string;
  end: string;
  detail: string;
  kind: TaskKind;
  image: string;
  priority: "core" | "support" | "optional";
  status: TaskStatus;
}
