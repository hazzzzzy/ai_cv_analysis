"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { getSessionDetail, MessageItem, SessionItem, AnalysisResult } from "@/lib/api";

export default function SessionDetailPage() {
  const params = useParams();
  const sessionId = Number(params.id);
  const [session, setSession] = useState<SessionItem | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        setError(err instanceof Error ? err.message : "获取失败");
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [sessionId]);

  const finalAnalysis = useMemo(() => {
    const finalMessage = messages.find((msg) => msg.kind === "final");
    if (finalMessage?.content_json) {
      return finalMessage.content_json as AnalysisResult;
    }
    return null;
  }, [messages]);

  return (
    <div className="grid gap-6">
      <Card className="border-slate-200/70 bg-white/90">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>会话详情</CardTitle>
            <p className="text-sm text-slate-500">查看问题、回答与最终分析</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/sessions">返回列表</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          )}
          {!loading && error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}
          {!loading && session && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                <div>
                  会话 ID：<span className="font-mono">#{session.id}</span>
                </div>
                <div>
                  简历 ID：<span className="font-mono">{session.resume_id}</span>
                </div>
                <div>
                  进度：{session.current_index}/{session.question_count}
                </div>
                <Badge variant={session.status === "completed" ? "default" : "outline"}>
                  {session.status}
                </Badge>
              </div>
              <Separator />
              <div className="space-y-3">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`rounded-2xl border p-4 text-sm ${
                      msg.role === "assistant"
                        ? "border-slate-200 bg-slate-50"
                        : "border-emerald-200 bg-emerald-50"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>
                        {msg.role === "assistant" ? "助手" : "用户"} · {msg.kind}
                      </span>
                      <span>#{msg.seq}</span>
                    </div>
                    <p className="mt-2 text-slate-900">{msg.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-slate-200/70 bg-white/90">
        <CardHeader>
          <CardTitle>最终分析</CardTitle>
        </CardHeader>
        <CardContent>
          {!finalAnalysis && (
            <p className="text-sm text-slate-500">尚未生成最终分析或未记录到消息中。</p>
          )}
          {finalAnalysis && (
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-900">痛点</h3>
                {finalAnalysis.pain_points.map((item, index) => (
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
                {finalAnalysis.optimization_suggestions.map((item, index) => (
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
                {finalAnalysis.improvement_directions.map((item, index) => (
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
    </div>
  );
}
