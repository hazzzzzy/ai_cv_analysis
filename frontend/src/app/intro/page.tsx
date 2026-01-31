"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const HIGHLIGHTS = [
  {
    title: "岗位约束出题",
    desc: "结合岗位画像与简历内容，输出更贴合岗位能力模型的追问。",
  },
  {
    title: "逐题作答",
    desc: "一次只回答当前问题，过程清晰、节奏稳定，避免乱序。",
  },
  {
    title: "结构化诊断",
    desc: "输出痛点、优化建议与改进方向，并附优先级与行动拆解。",
  },
];

const FLOW = [
  { step: "01", title: "上传简历", desc: "支持 PDF / DOCX，自动解析关键内容" },
  { step: "02", title: "填写岗位", desc: "录入面试岗位与岗位介绍" },
  { step: "03", title: "开始问答", desc: "专家问题逐题作答" },
  { step: "04", title: "生成分析", desc: "输出痛点与改进路线图" },
];

export default function IntroPage() {
  return (
    <div className="grid gap-10">
      <section className="relative overflow-hidden rounded-[32px] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-amber-50 p-10 shadow-[0_30px_80px_-60px_rgba(15,23,42,0.6)]">
        <div className="absolute -left-16 top-6 h-48 w-48 rounded-full bg-amber-200/40 blur-3xl" />
        <div className="absolute -right-10 bottom-8 h-52 w-52 rounded-full bg-emerald-200/40 blur-3xl" />
        <div className="relative space-y-6">
          <Badge className="w-fit rounded-full bg-slate-900 text-white">产品介绍</Badge>
          <div className="space-y-3">
            <h1 className="text-4xl font-semibold text-slate-900">
              让每一次面试都能对齐岗位要求
            </h1>
            <p className="text-base text-slate-600">
              通过岗位信息与简历内容双重约束，生成高质量追问并输出结构化诊断，帮助你更快识别差距与改进方向。
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild className="rounded-full">
              <Link href="/">进入工作台</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/sessions">查看历史</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        {HIGHLIGHTS.map((item) => (
          <Card key={item.title} className="border-slate-200/70 bg-white/90">
            <CardHeader>
              <CardTitle className="text-base">{item.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">{item.desc}</CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.7fr_1.3fr]">
        <Card className="border-slate-200/70 bg-white/90">
          <CardHeader>
            <CardTitle>核心能力</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <div>
              <p className="font-semibold text-slate-900">角色画像对齐</p>
              <p>将岗位职责转为问题焦点，提升问题针对性。</p>
            </div>
            <div>
              <p className="font-semibold text-slate-900">过程状态可控</p>
              <p>明确准备/问答/讨论阶段，避免状态混乱。</p>
            </div>
            <div>
              <p className="font-semibold text-slate-900">结果落地可执行</p>
              <p>痛点与建议都有优先级与行动步骤。</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/70 bg-white/95">
          <CardHeader>
            <CardTitle>使用流程</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {FLOW.map((item, index) => (
              <div key={item.step} className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-white">
                    {item.step}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                    <p className="text-xs text-slate-500">{item.desc}</p>
                  </div>
                </div>
                {index < FLOW.length - 1 && <Separator />}
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
