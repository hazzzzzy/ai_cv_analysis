"use client";

import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  AnalysisResult,
  Question,
  createSession,
  submitAnswer,
  uploadResume,
} from "@/lib/api";

const QUESTION_MIN = 3;
const QUESTION_MAX = 10;

type AppState =
  | "idle"
  | "uploaded"
  | "preparing"
  | "interviewing"
  | "discussing"
  | "completed"
  | "failed";

type ViewMode = "chat" | "analysis";

type ChatItem = {
  id: string;
  role: "assistant" | "user" | "system";
  kind: "question" | "answer" | "final" | "status";
  content: string;
  meta?: Record<string, unknown> | null;
};

type FieldErrors = {
  resume?: string;
  jobTitle?: string;
  jobDescription?: string;
};

const STATUS_LABEL: Record<AppState, string> = {
  idle: "未开始",
  uploaded: "已上传",
  preparing: "准备中",
  interviewing: "面试中",
  discussing: "生成结果中",
  completed: "已完成",
  failed: "失败（可重试）",
};

const STATUS_COPY: Record<"preparing" | "discussing", string> = {
  preparing: "面试官正在准备问题…",
  discussing: "面试官正在生成最终分析…",
};

const PRIORITY_LABEL: Record<number, { label: string; level: "high" | "medium" | "low" }> = {
  1: { label: "紧急", level: "high" },
  2: { label: "重要", level: "medium" },
  3: { label: "一般", level: "low" },
};

export default function HomePage() {
  const [appState, setAppState] = useState<AppState>("idle");
  const [viewMode, setViewMode] = useState<ViewMode>("chat");
  const [file, setFile] = useState<File | null>(null);
  const [resumeId, setResumeId] = useState<number | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [previewOpen, setPreviewOpen] = useState(true);
  const [questionCount, setQuestionCount] = useState<number>(QUESTION_MIN);
  const [jobTitle, setJobTitle] = useState<string>("");
  const [jobDescription, setJobDescription] = useState<string>("");
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [answer, setAnswer] = useState<string>("");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [chatLog, setChatLog] = useState<ChatItem[]>([]);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const chatScrollTop = useRef<number>(0);
  const analysisScrollTop = useRef<number>(0);
  const sidebarRef = useRef<HTMLDivElement | null>(null);
  const jobTitleRef = useRef<HTMLInputElement | null>(null);
  const jobDescRef = useRef<HTMLTextAreaElement | null>(null);
  const isEditable = appState === "idle" || appState === "uploaded" || appState === "failed";
  const isLocked = appState === "preparing" || appState === "discussing";
  const canStart = Boolean(resumeId && jobTitle.trim() && jobDescription.trim());

  useEffect(() => {
    if (viewMode === "chat" && chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollTop.current;
      return;
    }
    if (viewMode === "analysis" && chatScrollRef.current) {
      chatScrollRef.current.scrollTop = analysisScrollTop.current;
    }
  }, [viewMode]);

  useEffect(() => {
    if (viewMode !== "chat") return;
    if (!chatEndRef.current) return;
    chatEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chatLog, appState, viewMode]);

  const resetAll = () => {
    setAppState("idle");
    setViewMode("chat");
    setFile(null);
    setResumeId(null);
    setPreview("");
    setPreviewOpen(true);
    setQuestionCount(QUESTION_MIN);
    setJobTitle("");
    setJobDescription("");
    setSessionId(null);
    setCurrentQuestion(null);
    setCurrentIndex(0);
    setAnswer("");
    setAnalysis(null);
    setError(null);
    setFieldErrors({});
    setUploadProgress(0);
    setChatLog([]);
    chatScrollTop.current = 0;
    analysisScrollTop.current = 0;
  };

  const handleFilePick = (picked: File | null) => {
    setFile(picked);
    if (!picked) return;
    setError(null);
    setFieldErrors((prev) => ({ ...prev, resume: undefined }));
  };

  const startFakeProgress = () => {
    setUploadProgress(12);
    let value = 12;
    const timer = setInterval(() => {
      value = Math.min(92, value + 10);
      setUploadProgress(value);
    }, 220);
    return timer;
  };

  const appendSystemStatus = (content: string) => {
    setChatLog((prev) => [
      ...prev,
      {
        id: `sys-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        role: "system",
        kind: "status",
        content,
      },
    ]);
  };

  const removeLastSystemStatus = () => {
    setChatLog((prev) => {
      const index = [...prev].reverse().findIndex((item) => item.role === "system");
      if (index === -1) return prev;
      const realIndex = prev.length - 1 - index;
      return prev.filter((_, idx) => idx !== realIndex);
    });
  };

  const handleUpload = async () => {
    if (!file) return;
    setError(null);
    setLoading(true);
    const timer = startFakeProgress();
    try {
      const data = await uploadResume(file);
      setResumeId(data.resume_id);
      setPreview(data.extracted_preview || "暂无预览内容");
      setPreviewOpen(true);
      setAppState("uploaded");
      setUploadProgress(100);
    } catch (err) {
      const message = err instanceof Error ? err.message : "上传失败";
      setError(message);
      toast.error(message);
      setAppState("failed");
    } finally {
      clearInterval(timer);
      setLoading(false);
      setTimeout(() => setUploadProgress(0), 800);
    }
  };

  const handleResetUpload = () => {
    if (!isEditable) return;
    setFile(null);
    setResumeId(null);
    setPreview("");
    setPreviewOpen(true);
    setUploadProgress(0);
    setAppState("idle");
  };

  const focusField = (field: "jobTitle" | "jobDescription" | "resume") => {
    if (field === "resume") {
      sidebarRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (field === "jobTitle") {
      jobTitleRef.current?.focus();
      jobTitleRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    jobDescRef.current?.focus();
    jobDescRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const validateBeforeStart = () => {
    const errors: FieldErrors = {};
    if (!resumeId) {
      errors.resume = "请上传简历";
    }
    if (!jobTitle.trim()) {
      errors.jobTitle = "请填写面试岗位";
    }
    if (!jobDescription.trim()) {
      errors.jobDescription = "请填写岗位介绍";
    }
    setFieldErrors(errors);
    const firstError = errors.resume
      ? "resume"
      : errors.jobTitle
      ? "jobTitle"
      : errors.jobDescription
      ? "jobDescription"
      : null;
    if (firstError) {
      const message =
        firstError == "resume"
          ? "请上传简历"
          : firstError == "jobTitle"
          ? "请填写面试岗位"
          : "请填写岗位介绍";
      toast.error(message);
      focusField(firstError);
      return false;
    }
    return true;
  };

  const handleCreateSession = async () => {
    if (!validateBeforeStart()) return;
    if (!resumeId) return;
    setError(null);
    setLoading(true);
    setAppState("preparing");
    appendSystemStatus(STATUS_COPY.preparing);
    try {
      const data = await createSession(
        resumeId,
        questionCount,
        jobTitle.trim(),
        jobDescription.trim()
      );
      removeLastSystemStatus();
      setSessionId(data.session_id);
      setCurrentQuestion(data.current_question);
      setCurrentIndex(0);
      setChatLog((prev) => [
        ...prev,
        {
          id: `q-${data.current_question.id}`,
          role: "assistant",
          kind: "question",
          content: data.current_question.question,
          meta: data.current_question,
        },
      ]);
      setAppState("interviewing");
    } catch (err) {
      const message = err instanceof Error ? err.message : "创建会话失败";
      setError(message);
      toast.error(message);
      setAppState("failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!sessionId || !currentQuestion) return;
    if (!answer.trim()) {
      toast.error("回答不能为空");
      return;
    }
    setError(null);
    const answerText = answer.trim();
    setAnswer("");
    setChatLog((prev) => [
      ...prev,
      {
        id: `a-${currentQuestion.id}-${Date.now()}`,
        role: "user",
        kind: "answer",
        content: answerText,
        meta: { question_id: currentQuestion.id },
      },
    ]);
    const isLast = currentIndex + 1 >= questionCount;
    if (isLast) {
      setAppState("discussing");
      appendSystemStatus(STATUS_COPY.discussing);
    }
    setLoading(true);
    try {
      const data = await submitAnswer(sessionId, currentQuestion.id, answerText);
      if (data.status === "completed") {
        removeLastSystemStatus();
        setAnalysis(data.final_analysis);
        setAppState("completed");
        setViewMode("analysis");
      } else {
        setCurrentIndex(data.current_index);
        setCurrentQuestion(data.next_question);
        setAppState("interviewing");
        setChatLog((prev) => [
          ...prev,
          {
            id: `q-${data.next_question.id}`,
            role: "assistant",
            kind: "question",
            content: data.next_question.question,
            meta: data.next_question,
          },
        ]);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "提交失败";
      setError(message);
      toast.error(message);
      setAppState("failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!isEditable) return;
    const dropped = event.dataTransfer.files?.[0];
    if (dropped) {
      handleFilePick(dropped);
    }
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const fileInfo = useMemo(() => {
    if (!file) return null;
    const sizeKb = Math.round(file.size / 1024);
    return `${file.name} · ${sizeKb} KB · ${file.type || "未知类型"}`;
  }, [file]);

  const handleScroll = () => {
    if (!chatScrollRef.current) return;
    if (viewMode === "chat") {
      chatScrollTop.current = chatScrollRef.current.scrollTop;
    } else {
      analysisScrollTop.current = chatScrollRef.current.scrollTop;
    }
  };

  const resolvePriority = (priority: number | undefined) => {
    if (!priority) return { label: "一般", level: "low" } as const;
    return PRIORITY_LABEL[priority] || { label: "一般", level: "low" };
  };

  return (
    <div className="flex h-screen min-h-0 flex-col overflow-hidden px-2 py-2">
      <div className="grid h-[calc(90vh-96px)] min-h-0 gap-3 lg:grid-cols-[minmax(260px,360px)_1fr]">
        <aside className="panel-shell sidebar-scroll h-full" ref={sidebarRef}>
          <div className="panel-section">
            <div className="flex items-center justify-between">
              <div>
                <div className="panel-group-title">上传与配置</div>
              </div>
              <Badge variant="outline">{STATUS_LABEL[appState]}</Badge>
            </div>
          </div>

          <div className="panel-section space-y-4">
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className={`rounded-2xl border border-dashed p-4 text-center text-sm transition ${
                isEditable
                  ? "border-slate-300 bg-slate-50/70 text-slate-600"
                  : "border-slate-200 bg-slate-100 text-slate-400"
              }`}
            >
              <p className="font-medium text-slate-700">拖拽或点击上传 PDF/DOCX</p>
              <p className="mt-1 text-xs text-slate-500">最大 10MB，上传后会生成解析预览</p>
              <Input
                type="file"
                accept=".pdf,.docx"
                disabled={!isEditable}
                onChange={(event) => handleFilePick(event.target.files?.[0] || null)}
                className="mt-3 cursor-pointer clickable disabled:not-allowed"
              />
            </div>
            {fieldErrors.resume && (
              <p className="text-xs text-rose-600">{fieldErrors.resume}</p>
            )}
            {fileInfo && <div className="text-xs text-slate-500">{fileInfo}</div>}
            {uploadProgress > 0 && (
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                <div className="h-full bg-slate-900" style={{ width: `${uploadProgress}%` }} />
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleUpload}
                disabled={!file || loading || !isEditable}
                className="flex-1 clickable disabled:not-allowed"
              >
                {loading && appState === "idle" ? "上传中..." : "上传并解析"}
              </Button>
              <Button
                variant="outline"
                onClick={resetAll}
                disabled={loading}
                className="clickable disabled:not-allowed"
              >
                重置
              </Button>
            </div>
          </div>

          <div className="panel-section">
            <div className="flex items-center justify-between">
              <div className="panel-title">解析预览</div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setPreviewOpen((prev) => !prev)}
                className="clickable"
              >
                {previewOpen ? "收起" : "展开"}
              </Button>
            </div>
            {previewOpen && (
              <div className="mt-3 space-y-3 text-xs text-slate-600">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 leading-relaxed">
                  {preview || "等待上传简历以生成预览"}
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">如需替换，可重新上传</span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!isEditable}
                    onClick={handleResetUpload}
                    className="clickable disabled:not-allowed"
                  >
                    重新上传
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="panel-section space-y-4">
            <div className="panel-title">面试配置</div>
            <div className="space-y-2">
              <label className="form-label form-label-required">问题数量</label>
              <input
                type="range"
                min={QUESTION_MIN}
                max={QUESTION_MAX}
                value={questionCount}
                onChange={(event) => setQuestionCount(Number(event.target.value))}
                disabled={!isEditable}
                className="w-full accent-slate-900 clickable disabled:not-allowed"
              />
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{QUESTION_MIN}</span>
                <span className="text-sm font-semibold text-slate-900">{questionCount}</span>
                <span>{QUESTION_MAX}</span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="form-label form-label-required">面试岗位</label>
              <Input
                ref={jobTitleRef}
                placeholder="例如：后端工程师"
                value={jobTitle}
                onChange={(event) => {
                  setJobTitle(event.target.value);
                  setFieldErrors((prev) => ({ ...prev, jobTitle: undefined }));
                }}
                disabled={!isEditable}
                className={`input-focus-ring clickable disabled:not-allowed ${fieldErrors.jobTitle ? "border-rose-400" : ""}`}
              />
              {fieldErrors.jobTitle && (
                <p className="text-xs text-rose-600">{fieldErrors.jobTitle}</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="form-label form-label-required">岗位介绍</label>
              <Textarea
                ref={jobDescRef}
                rows={5}
                placeholder="描述岗位职责、目标、核心技能要求"
                value={jobDescription}
                onChange={(event) => {
                  setJobDescription(event.target.value);
                  setFieldErrors((prev) => ({ ...prev, jobDescription: undefined }));
                }}
                disabled={!isEditable}
                className={`input-focus-ring clickable disabled:not-allowed h-28 resize-none ${fieldErrors.jobDescription ? "border-rose-400" : ""}`}
              />
              {fieldErrors.jobDescription && (
                <p className="text-xs text-rose-600">{fieldErrors.jobDescription}</p>
              )}
            </div>
          </div>

          <div className="panel-section sticky top-0 bg-white/95 backdrop-blur">
            <Button
              disabled={!canStart || loading || !isEditable}
              onClick={handleCreateSession}
              className="w-full clickable disabled:not-allowed"
            >
              {loading && appState === "preparing" ? "准备中..." : "开始面试"}
            </Button>
            <div className="mt-3 text-xs text-slate-500">
              {canStart ? "配置完成，可开始面试" : "请补全必填项"}
            </div>
          </div>
        </aside>

        <main className="main-fixed h-full min-h-0 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-semibold text-slate-900">对话流</div>
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
            {viewMode === "chat" && (
              <div className="flex h-full flex-col">
                <div
                  ref={chatScrollRef}
                  onScroll={handleScroll}
                  className="flex-1 space-y-3 overflow-auto px-4 py-4"
                >
                  {chatLog.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-500">
                      从左侧配置开始，系统消息与问题会在这里出现。
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
                {appState === "interviewing" && (
                  <div className="border-t border-slate-200 bg-white/95 px-4 py-4">
                    <div className="text-xs text-slate-500">当前回答</div>
                    <Textarea
                      rows={4}
                      placeholder="请输入你的回答，建议围绕背景/行动/结果展开"
                      value={answer}
                      onChange={(event) => setAnswer(event.target.value)}
                      disabled={loading || isLocked || appState !== "interviewing"}
                      className="input-focus-ring clickable disabled:not-allowed mt-2 h-24 resize-none"
                    />
                    <div className="mt-3 flex flex-wrap gap-3">
                      <Button
                        disabled={loading || isLocked || appState !== "interviewing"}
                        onClick={handleSubmitAnswer}
                        className="clickable disabled:not-allowed"
                      >
                        {loading ? "提交中..." : "提交回答"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={resetAll}
                        disabled={loading}
                        className="clickable disabled:not-allowed"
                      >
                        重新开始
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {viewMode === "analysis" && (
              <div
                ref={chatScrollRef}
                onScroll={handleScroll}
                className="flex-1 overflow-auto px-4 py-4"
              >
                {!analysis && (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-500">
                    完成全部问题后将在此展示分析报告。
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
