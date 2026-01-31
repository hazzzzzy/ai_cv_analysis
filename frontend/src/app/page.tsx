"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  AnalysisResult,
  Question,
  createSession,
  submitAnswer,
  uploadResume,
} from "@/lib/api";

const QUESTION_COUNTS = [3, 4, 5, 6, 7, 8, 9, 10];

type Step = "upload" | "questionCount" | "answer" | "result";

export default function HomePage() {
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [resumeId, setResumeId] = useState<number | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [questionCount, setQuestionCount] = useState<number>(3);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [answer, setAnswer] = useState<string>("");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const progress = useMemo(() => {
    if (step !== "answer") return 0;
    return Math.min(100, (currentIndex / questionCount) * 100);
  }, [step, currentIndex, questionCount]);

  const handleUpload = async () => {
    if (!file) return;
    setError(null);
    setLoading(true);
    try {
      const data = await uploadResume(file);
      setResumeId(data.resume_id);
      setPreview(data.extracted_preview || "暂无预览内容");
      setStep("questionCount");
    } catch (err) {
      setError(err instanceof Error ? err.message : "上传失败");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async () => {
    if (!resumeId) return;
    setError(null);
    setLoading(true);
    try {
      const data = await createSession(resumeId, questionCount);
      setSessionId(data.session_id);
      setCurrentQuestion(data.current_question);
      setCurrentIndex(0);
      setStep("answer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建会话失败");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!sessionId || !currentQuestion) return;
    if (!answer.trim()) {
      setError("回答不能为空");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const data = await submitAnswer(sessionId, currentQuestion.id, answer.trim());
      setAnswer("");
      if (data.status === "completed") {
        setAnalysis(data.final_analysis);
        setStep("result");
      } else {
        setCurrentIndex(data.current_index);
        setCurrentQuestion(data.next_question);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "提交失败");
    } finally {
      setLoading(false);
    }
  };

  const resetAll = () => {
    setStep("upload");
    setFile(null);
    setResumeId(null);
    setPreview("");
    setQuestionCount(3);
    setSessionId(null);
    setCurrentQuestion(null);
    setCurrentIndex(0);
    setAnswer("");
    setAnalysis(null);
    setError(null);
  };

  return (
    <div className="grid gap-8">
      <section className="glass-panel p-8">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="max-w-xl space-y-3">
            <Badge className="rounded-full bg-slate-900 text-white">全流程模拟</Badge>
            <h2 className="text-3xl font-semibold text-slate-900">
              上传简历，生成专家追问，拿到结构化改进方向
            </h2>
            <p className="text-sm text-slate-600">
              系统会基于简历内容生成 3-10 条高信号问题，逐题作答后输出痛点、优化建议与改进路线图。
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white/80 px-6 py-4 text-sm text-slate-600 shadow-sm">
            <div className="font-medium text-slate-900">今日流程</div>
            <div>上传 → 选题 → 作答 → 诊断</div>
          </div>
        </div>
      </section>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>操作失败</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-slate-200/70 bg-white/80">
          <CardHeader>
            <CardTitle>步骤 1：上传简历</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="file"
              accept=".pdf,.docx"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
            />
            <div className="flex flex-wrap items-center gap-3">
              <Button disabled={!file || loading} onClick={handleUpload}>
                {loading && step === "upload" ? "上传中..." : "上传并解析"}
              </Button>
              {file && (
                <span className="text-xs text-slate-500">已选择：{file.name}</span>
              )}
            </div>
            <Separator />
            <div className="space-y-2 text-sm text-slate-600">
              <div className="font-medium text-slate-900">解析预览</div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-xs leading-relaxed">
                {preview || "等待上传简历以生成预览"}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/70 bg-white/80">
          <CardHeader>
            <CardTitle>步骤 2：选择题目数量</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <Select
              value={questionCount.toString()}
              onValueChange={(value) => setQuestionCount(Number(value))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="选择题目数量" />
              </SelectTrigger>
              <SelectContent>
                {QUESTION_COUNTS.map((count) => (
                  <SelectItem key={count} value={count.toString()}>
                    {count} 道问题
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              disabled={!resumeId || loading}
              onClick={handleCreateSession}
              className="w-full"
            >
              {loading && step === "questionCount" ? "生成中..." : "开始面试"}
            </Button>
            <div className="text-xs text-slate-500">
              当前状态：{resumeId ? "已解析" : "等待简历"}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-slate-200/70 bg-white/90">
          <CardHeader>
            <CardTitle>步骤 3：逐题作答</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {step !== "answer" && (
              <div className="text-sm text-slate-500">开始面试后会展示问题。</div>
            )}
            {step === "answer" && currentQuestion && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm text-slate-500">
                  <span>第 {currentIndex + 1} / {questionCount} 题</span>
                  <Badge variant="outline">{currentQuestion.domain}</Badge>
                </div>
                <Progress value={progress} className="h-2" />
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <p className="text-sm font-medium text-slate-900">{currentQuestion.question}</p>
                  <p className="mt-2 text-xs text-slate-500">{currentQuestion.why_it_matters}</p>
                </div>
                <Textarea
                  rows={6}
                  placeholder="请输入你的回答..."
                  value={answer}
                  onChange={(event) => setAnswer(event.target.value)}
                />
                <div className="flex flex-wrap gap-3">
                  <Button disabled={loading} onClick={handleSubmitAnswer}>
                    {loading ? "提交中..." : "提交回答"}
                  </Button>
                  <Button variant="outline" onClick={resetAll}>
                    重新开始
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200/70 bg-white/90">
          <CardHeader>
            <CardTitle>快速入口</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-600">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-medium text-slate-900">历史会话</p>
              <p className="mt-1 text-xs text-slate-500">查看过去的问答记录与分析结果</p>
              <Button asChild variant="outline" className="mt-3 w-full">
                <Link href="/sessions">打开历史列表</Link>
              </Button>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-medium text-slate-900">提示</p>
              <p className="mt-1 text-xs text-slate-500">
                回答越具体越好，建议使用 STAR 法描述背景、行动与结果。
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="border-slate-200/70 bg-white/95">
          <CardHeader>
            <CardTitle>步骤 4：诊断结果</CardTitle>
          </CardHeader>
          <CardContent>
            {step !== "result" && (
              <p className="text-sm text-slate-500">完成所有问题后将展示诊断报告。</p>
            )}
            {step === "result" && analysis && (
              <div className="grid gap-6 lg:grid-cols-3">
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-900">痛点</h3>
                  {analysis.pain_points.map((item, index) => (
                    <Card key={`pain-${index}`} className="border-slate-200/70 bg-slate-50/80">
                      <CardContent className="space-y-2 p-4 text-xs text-slate-600">
                        <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                        <p>证据：{item.evidence}</p>
                        <p>影响：{item.impact}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-900">优化建议</h3>
                  {analysis.optimization_suggestions.map((item, index) => (
                    <Card key={`opt-${index}`} className="border-slate-200/70 bg-slate-50/80">
                      <CardContent className="space-y-2 p-4 text-xs text-slate-600">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                          <Badge variant="outline">优先级 {item.priority}</Badge>
                        </div>
                        <ul className="list-disc space-y-1 pl-4">
                          {item.actions.map((action, idx) => (
                            <li key={idx}>{action}</li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-900">改进方向</h3>
                  {analysis.improvement_directions.map((item, index) => (
                    <Card key={`dir-${index}`} className="border-slate-200/70 bg-slate-50/80">
                      <CardContent className="space-y-2 p-4 text-xs text-slate-600">
                        <p className="text-sm font-semibold text-slate-900">{item.direction}</p>
                        <div>
                          <p className="font-medium text-slate-700">30 天</p>
                          <ul className="list-disc space-y-1 pl-4">
                            {item.roadmap_30d.map((stepItem, idx) => (
                              <li key={idx}>{stepItem}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="font-medium text-slate-700">90 天</p>
                          <ul className="list-disc space-y-1 pl-4">
                            {item.roadmap_90d.map((stepItem, idx) => (
                              <li key={idx}>{stepItem}</li>
                            ))}
                          </ul>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
