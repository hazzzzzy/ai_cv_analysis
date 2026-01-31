"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listSessions, SessionItem } from "@/lib/api";

export default function SessionsPage() {
  const [items, setItems] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const statusLabel = (status: string) => {
    if (status === "completed") return "已完成";
    if (status === "failed") return "失败";
    if (status === "in_progress") return "面试中";
    return "面试中";
  };

  useEffect(() => {
    let active = true;
    listSessions()
      .then((data) => {
        if (!active) return;
        setItems(data.items);
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
  }, []);

  return (
    <div className="flex h-[calc(95vh-96px)] flex-col overflow-hidden px-2 py-2">


      <div className="panel-shell min-h-0 flex-1">
        <div className="panel-section flex flex-row items-center justify-between">
          <div>
            <div className="panel-title">历史会话</div>
            <div className="panel-group-title">最近问答记录</div>
          </div>

        </div>
        <div className="panel-section">
          {loading && (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          )}
          {!loading && error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}
          {!loading && !error && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>会话 ID</TableHead>
                  <TableHead>简历 ID</TableHead>
                  <TableHead>岗位</TableHead>
                  <TableHead>题数</TableHead>
                  <TableHead>进度</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs">#{item.id}</TableCell>
                    <TableCell className="font-mono text-xs">{item.resume_id}</TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-700">
                        {item.job_title || "未填写"}
                      </span>
                    </TableCell>
                    <TableCell>{item.question_count}</TableCell>
                    <TableCell>
                      {item.current_index}/{item.question_count}
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.status === "completed" ? "default" : "outline"}>
                        {statusLabel(item.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="secondary" className="clickable">
                        <Link href={`/sessions/${item.id}`}>查看</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
