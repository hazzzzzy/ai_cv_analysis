const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export type Question = {
  id: string;
  domain: string;
  question: string;
  why_it_matters: string;
  good_answer_signals: string[];
  red_flags: string[];
};

export type AnalysisResult = {
  pain_points: { title: string; evidence: string; impact: string; priority: number }[];
  optimization_suggestions: { title: string; actions: string[]; priority: number }[];
  improvement_directions: {
    direction: string;
    roadmap_30d: string[];
    roadmap_90d: string[];
    priority: number;
  }[];
};

export type SessionItem = {
  id: number;
  resume_id: number;
  question_count: number;
  job_title?: string | null;
  job_description?: string | null;
  status: string;
  current_index: number;
};

export type MessageItem = {
  id: number;
  session_id: number;
  seq: number;
  role: string;
  kind: string;
  content: string;
  content_json?: Record<string, unknown> | null;
};

export async function uploadResume(file: File) {
  const form = new FormData();
  form.append("file", file);
  const resp = await fetch(`${API_BASE}/api/v1/resumes`, {
    method: "POST",
    body: form,
  });
  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}));
    throw new Error(data.message || "上传失败");
  }
  return resp.json() as Promise<{ resume_id: number; extracted_preview: string }>;
}

export async function createSession(
  resumeId: number,
  questionCount: number,
  jobTitle: string,
  jobDescription: string
) {
  const resp = await fetch(`${API_BASE}/api/v1/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      resume_id: resumeId,
      question_count: questionCount,
      job_title: jobTitle,
      job_description: jobDescription,
    }),
  });
  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}));
    throw new Error(data.message || "创建会话失败");
  }
  return resp.json() as Promise<{
    session_id: number;
    status: string;
    current_question: Question;
  }>;
}

export async function submitAnswer(sessionId: number, questionId: string, answer: string) {
  const resp = await fetch(`${API_BASE}/api/v1/sessions/${sessionId}/answers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question_id: questionId, answer }),
  });
  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}));
    throw new Error(data.message || "提交失败");
  }
  return resp.json() as Promise<
    | { status: "in_progress"; current_index: number; next_question: Question }
    | { status: "completed"; final_analysis: AnalysisResult }
  >;
}

export async function listSessions(limit = 20, offset = 0) {
  const resp = await fetch(`${API_BASE}/api/v1/sessions?limit=${limit}&offset=${offset}`, {
    cache: "no-store",
  });
  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}));
    throw new Error(data.message || "获取列表失败");
  }
  return resp.json() as Promise<{ items: SessionItem[]; total: number }>;
}

export async function getSessionDetail(sessionId: number) {
  const resp = await fetch(`${API_BASE}/api/v1/sessions/${sessionId}`, { cache: "no-store" });
  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}));
    throw new Error(data.message || "获取详情失败");
  }
  return resp.json() as Promise<{ session: SessionItem; messages: MessageItem[] }>;
}
