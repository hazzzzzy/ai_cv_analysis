"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { getSessionDetail, submitAnswer, MessageItem, SessionItem, AnalysisResult } from "@/lib/api";
import { toast } from "sonner";

type ViewMode = "chat" | "analysis";

type ChatItem = {
  id: string;
  role: "assistant" | "user" | "system";
  kind: "question" | "answer" | "final" | "status";
  content: string;
  meta?: Record<string, unknown> | null;
};

const PRIORITY_LABEL: Record<number, { label: string; level: "high" | "medium" | "low" }> = {
  1: { label: "紧急", level: "high" },
  2: { label: "重要", level: "medium" },
  3: { label: "一般", level: "low" },
};

const STATUS_LABEL: Record<string, string> = {
  completed: "已完成",
  in_progress: "面试中",
  failed: "失败",
};

export default function SessionDetailPage() {
  const params = useParams();
  const sessionId = Number(params.id);
  const [session, setSession] = useState<SessionItem | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("chat");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answer, setAnswer] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const chatScrollTop = useRef<number>(0);
  const analysisScrollTop = useRef<number>(0);

  const notifyError = (message: string) => {
    setError(message);
    toast.error(message, { id: `${Date.now()}-${Math.random().toString(16).slice(2)}` });
  };

  useEffect(() => {
    let active = true;
    getSessionDetail(sessionId)
      .then((data) => {
        if (!active) return;
        setSession(data.session);
        setMessages(data.messages);
      })
      .catch((err) => {
        if (!active) return;
        notifyError(err instanceof Error ? err.message : "获取失败");
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [sessionId]);

  const chatLog = useMemo<ChatItem[]>(() => {
    const mapped: ChatItem[] = messages.map((msg) => ({
      id: String(msg.id),
      role:
        msg.role === "assistant"
          ? "assistant"
          : msg.role === "system"
          ? "system"
          : "user",
      kind:
        msg.kind === "status"
          ? "status"
          : msg.kind === "final"
          ? "final"
          : msg.kind === "answer"
          ? "answer"
          : "question",
      content: msg.content,
      meta: msg.content_json || null,
    }));
    if (messages.length > 0) {
      mapped.unshift({
        id: "sys-start",
        role: "system",
        kind: "status",
        content: "历史会话加载完成，以下为对话记录。",
      });
    }
    return mapped;
  }, [messages]);

  useEffect(() => {
    if (!chatEndRef.current) return;
    if (viewMode !== "chat") return;
    chatEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chatLog, viewMode]);

  const finalAnalysis = useMemo(() => {
    const finalMessage = messages.find((msg) => msg.kind === "final");
    if (finalMessage?.content_json) {
      const raw = finalMessage.content_json as Partial<AnalysisResult>;
      return {
        pain_points: raw.pain_points ?? [],
        optimization_suggestions: raw.optimization_suggestions ?? [],
        improvement_directions: raw.improvement_directions ?? [],
      } as AnalysisResult;
    }
    return null;
  }, [messages]);

  useEffect(() => {
    setAnalysis(finalAnalysis);
    if (finalAnalysis) {
      setViewMode("analysis");
    }
  }, [finalAnalysis]);

  useEffect(() => {
    const answered = new Set(
      messages
        .filter((msg) => msg.role === "user" && msg.kind === "answer")
        .map((msg) => (msg.content_json as { question_id?: string } | null)?.question_id)
        .filter((id): id is string => Boolean(id))
    );
    const pendingQuestion = messages
      .filter((msg) => msg.role === "assistant" && msg.kind === "question")
      .map((msg) => msg.content_json as Question | null)
      .find((q) => q && !answered.has(q.id));
    const fallbackQuestion =
      messages
        .filter((msg) => msg.role === "assistant" && msg.kind === "question")
        .map((msg) => msg.content_json as Question | null)
        .filter((q): q is Question => Boolean(q))
        .slice(-1)[0] || null;
    setCurrentQuestion(pendingQuestion || fallbackQuestion);
  }, [messages]);

  useEffect(() => {
    if (!scrollRef.current) return;
    if (viewMode === "chat") {
      scrollRef.current.scrollTop = chatScrollTop.current;
    } else {
      scrollRef.current.scrollTop = analysisScrollTop.current;
    }
  }, [viewMode]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    if (viewMode === "chat") {
      chatScrollTop.current = scrollRef.current.scrollTop;
    } else {
      analysisScrollTop.current = scrollRef.current.scrollTop;
    }
  };

  const handleSubmitAnswer = async () => {
    if (!session || session.status !== "in_progress") return;
    if (!currentQuestion) return;
    if (!answer.trim()) {
      notifyError("回答不能为空");
      return;
    }
    setError(null);
    const answerText = answer.trim();
    setAnswer("");
    const now = Date.now();
    setMessages((prev) => [
      ...prev,
      {
        id: now,
        session_id: session.id,
        seq: prev.length + 1,
        role: "user",
        kind: "answer",
        content: answerText,
        content_json: { question_id: currentQuestion.id },
      },
    ]);
    setSubmitting(true);
    const isLastAnswer =
      session.current_index + 1 >= session.question_count ||
      (currentQuestion && session.current_index + 1 === session.question_count);
    if (isLastAnswer) {
      setIsFinalizing(true);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          session_id: session.id,
          seq: prev.length + 1,
          role: "system",
          kind: "status",
          content: "面试官正在生成最终分析…",
          content_json: null,
        },
      ]);
    }
    try {
      const resp = await submitAnswer(session.id, currentQuestion.id, answerText);
      if (resp.status === "completed") {
        setAnalysis(resp.final_analysis);
        setViewMode("analysis");
        setSession((prev) =>
          prev
            ? { ...prev, status: "completed", current_index: prev.current_index + 1 }
            : prev
        );
        setMessages((prev) =>
          prev.filter((msg) => !(msg.role === "system" && msg.kind === "status"))
        );
        setMessages((prev) => [
          ...prev,
          {
            id: now + 1,
            session_id: session.id,
            seq: prev.length + 2,
            role: "assistant",
            kind: "final",
            content: "最终分析已生成。",
            content_json: resp.final_analysis as unknown as Record<string, unknown>,
          },
        ]);
      } else {
        setSession((prev) =>
          prev
            ? { ...prev, current_index: resp.current_index, status: "in_progress" }
            : prev
        );
        setMessages((prev) =>
          prev.filter((msg) => !(msg.role === "system" && msg.kind === "status"))
        );
        setMessages((prev) => [
          ...prev,
          {
            id: now + 1,
            session_id: session.id,
            seq: prev.length + 2,
            role: "assistant",
            kind: "question",
            content: resp.next_question.question,
            content_json: resp.next_question as unknown as Record<string, unknown>,
          },
        ]);
      }
    } catch (err) {
      notifyError(err instanceof Error ? err.message : "提交失败");
      setMessages((prev) =>
        prev.filter((msg) => !(msg.role === "system" && msg.kind === "status"))
      );
    } finally {
      setSubmitting(false);
      setIsFinalizing(false);
    }
  };

  const resolvePriority = (priority: number | undefined) => {
    if (!priority) return { label: "一般", level: "low" } as const;
    return PRIORITY_LABEL[priority] || { label: "一般", level: "low" };
  };

  if (loading) {
    return (
      <div className="h-screen overflow-hidden px-2 py-2">
        <div className="grid min-h-0 h-[calc(100vh-56px)] gap-3 lg:grid-cols-[minmax(260px,360px)_1fr]">
          <aside className="space-y-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-52 w-full" />
          </aside>
          <Skeleton className="h-[70vh] w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen min-h-0 flex-col overflow-hidden px-2 py-2">
      

      <div className="grid h-[calc(90vh-96px)] min-h-0 gap-3 lg:grid-cols-[minmax(260px,360px)_1fr]">
        <aside className="panel-shell sidebar-scroll h-full">
          <div className="panel-section">
            <div className="panel-title">历史会话</div>
            <div className="panel-group-title">只读信息</div>
          </div>
          <div className="panel-section space-y-3 text-sm text-slate-600">
            <div>
              会话 ID：<span className="font-mono">{session ? `#${session.id}` : "--"}</span>
            </div>
            <div>
              简历 ID：<span className="font-mono">{session ? session.resume_id : "--"}</span>
            </div>
            <Badge variant="outline">
              {session ? (STATUS_LABEL[session.status] || "面试中") : "未知"}
            </Badge>
            <Button asChild variant="outline" className="w-full clickable">
              <Link href="/sessions">返回列表</Link>
            </Button>
          </div>
          <div className="panel-section space-y-3">
            <div className="panel-title">面试配置（只读）</div>
            <div className="space-y-2">
              <label className="form-label">问题数量</label>
              <Input value={session ? String(session.question_count) : ""} readOnly />
            </div>
            <div className="space-y-2">
              <label className="form-label">面试岗位</label>
              <Input value={session ? (session.job_title || "未填写") : ""} readOnly />
            </div>
            <div className="space-y-2">
              <label className="form-label">岗位介绍</label>
              <Textarea
                value={session ? (session.job_description || "未填写岗位介绍") : ""}
                readOnly
                rows={6}
                className="h-28 resize-none"
              />
            </div>
          </div>
        </aside>

        <main className="main-fixed h-full min-h-0 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-semibold text-slate-900">历史对话</div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={viewMode === "analysis" ? "default" : "outline"}
                disabled={!analysis}
                onClick={() => setViewMode("analysis")}
                className="clickable disabled:not-allowed"
              >
                查看分析结果
              </Button>
              <Button
                size="sm"
                variant={viewMode === "chat" ? "default" : "outline"}
                onClick={() => setViewMode("chat")}
                className="clickable disabled:not-allowed"
              >
                查看聊天记录
              </Button>
            </div>
          </div>

          <div className="panel-shell flex h-full min-h-0 flex-col overflow-hidden">
            {!session && (
              <div className="flex-1 p-4 text-sm text-slate-500">
                会话不存在或加载失败，请返回列表重试。
              </div>
            )}
            {viewMode === "chat" && (
              <div className="flex h-full flex-col">
                <div
                  ref={scrollRef}
                  onScroll={handleScroll}
                  className="flex-1 space-y-3 overflow-auto px-4 py-4"
                >
                  {chatLog.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-500">
                      暂无聊天记录。
                    </div>
                  )}
                  {chatLog.map((item) => {
                    if (item.role === "system") {
                      return (
                        <div key={item.id} className="message-system">
                          <div className="message-system-bubble">
                            <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                            {item.content}
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div
                        key={item.id}
                        className={`flex ${item.role === "assistant" ? "justify-start" : "justify-end"}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm message-pop ${
                            item.role === "assistant"
                              ? "bg-slate-100 text-slate-900"
                              : "bg-emerald-100 text-emerald-900"
                          }`}
                        >
                          <div className="text-xs text-slate-500">
                            {item.role === "assistant" ? "面试官" : "你"} · {item.kind}
                          </div>
                          <p className="mt-1 whitespace-pre-wrap leading-relaxed">{item.content}</p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>
                {session?.status === "in_progress" && (
                  <div className="border-t border-slate-200 bg-white/95 px-4 py-4">
                  <div className="text-xs text-slate-500">继续作答</div>
                  <Textarea
                    rows={4}
                    placeholder="请输入你的回答，建议围绕背景/行动/结果展开"
                    value={answer}
                    onChange={(event) => setAnswer(event.target.value)}
                    disabled={submitting || session?.status !== "in_progress"}
                    className="input-focus-ring clickable disabled:not-allowed mt-2 h-24 resize-none"
                  />
                  <div className="mt-3 flex flex-wrap gap-3">
                    <Button
                      disabled={submitting || session?.status !== "in_progress" || !currentQuestion}
                      onClick={handleSubmitAnswer}
                      className="clickable disabled:not-allowed"
                    >
                      {submitting ? "提交中..." : "提交回答"}
                    </Button>
                    <div className="text-xs text-slate-500">
                      {session?.status === "in_progress"
                        ? "当前可继续答题"
                        : "会话已结束"}
                    </div>
                  </div>
                  </div>
                )}
              </div>
            )}

            {viewMode === "analysis" && (
              <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="flex-1 overflow-auto px-4 py-4"
              >
                {!analysis && (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-500">
                    尚未生成最终分析。
                  </div>
                )}
                {analysis && (
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-slate-900">痛点</h3>
                      <div className="space-y-3">
                        {analysis.pain_points.map((item, index) => {
                          const priority = resolvePriority(item.priority);
                          return (
                            <div key={`pain-${index}`} className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4 text-sm text-slate-700">
                              <div className="flex flex-wrap items-center gap-3">
                                <span className="text-sm font-semibold text-slate-900">{item.title}</span>
                                <span className="priority-badge" data-level={priority.level}>
                                  {priority.label}
                                </span>
                              </div>
                              <div className="mt-2 space-y-1 text-xs">
                                <p>
                                  <span className="font-semibold text-slate-700">证据：</span>
                                  <span className="underline decoration-amber-400 decoration-2">{item.evidence}</span>
                                </p>
                                <p>
                                  <span className="font-semibold text-slate-700">影响：</span>
                                  <span className="italic text-slate-700">{item.impact}</span>
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-slate-900">优化建议</h3>
                      <div className="space-y-3">
                        {analysis.optimization_suggestions.map((item, index) => {
                          const priority = resolvePriority(item.priority);
                          return (
                            <div key={`opt-${index}`} className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4 text-sm text-slate-700">
                              <div className="flex flex-wrap items-center gap-3">
                                <span className="text-sm font-semibold text-slate-900">{item.title}</span>
                                <span className="priority-badge" data-level={priority.level}>
                                  {priority.label}
                                </span>
                              </div>
                              <ul className="mt-2 list-disc space-y-1 pl-4 text-xs">
                                {item.actions.map((action, idx) => (
                                  <li key={idx}>{action}</li>
                                ))}
                              </ul>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-slate-900">改进方向</h3>
                      <div className="space-y-3">
                        {analysis.improvement_directions.map((item, index) => {
                          const priority = resolvePriority(item.priority);
                          return (
                            <div key={`dir-${index}`} className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4 text-sm text-slate-700">
                              <div className="flex flex-wrap items-center gap-3">
                                <span className="text-sm font-semibold text-slate-900">{item.direction}</span>
                                <span className="priority-badge" data-level={priority.level}>
                                  {priority.label}
                                </span>
                              </div>
                              <div className="mt-2 space-y-2 text-xs">
                                <div>
                                  <p className="font-medium text-slate-700">30 天路线</p>
                                  <ul className="list-disc space-y-1 pl-4">
                                    {item.roadmap_30d.map((stepItem, idx) => (
                                      <li key={idx}>{stepItem}</li>
                                    ))}
                                  </ul>
                                </div>
                                <div>
                                  <p className="font-medium text-slate-700">90 天路线</p>
                                  <ul className="list-disc space-y-1 pl-4">
                                    {item.roadmap_90d.map((stepItem, idx) => (
                                      <li key={idx}>{stepItem}</li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
