"use client";

import { useEffect } from "react";
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
    {
        step: "01",
        title: "上传简历",
        desc: "支持 PDF / DOCX，自动解析关键内容",
    },
    { step: "02", title: "填写岗位", desc: "录入面试岗位与岗位介绍" },
    { step: "03", title: "开始问答", desc: "专家问题逐题作答" },
    { step: "04", title: "生成分析", desc: "输出痛点与改进路线图" },
];

const OUTPUTS = [
    {
        title: "问题清单（3-10条）",
        desc: "每题包含领域、关注点、好答案信号与风险提示。",
    },
    {
        title: "痛点诊断",
        desc: "定位简历表述或经历表达中的关键短板与证据。",
    },
    {
        title: "优化建议",
        desc: "提供可执行的动作拆解与优先级排序。",
    },
    {
        title: "改进方向",
        desc: "30天/90天路线图，清晰区分短期与中期目标。",
    },
];

const SCENARIOS = [
    {
        title: "投递前自查",
        desc: "在投递前快速发现简历表达或能力匹配的薄弱点。",
    },
    {
        title: "面试复盘",
        desc: "用结构化问题与建议复盘近期面试失败原因。",
    },
    {
        title: "岗位转型",
        desc: "在跨行业/跨岗位时梳理缺口并建立提升计划。",
    },
];

const FAQS = [
    {
        title: "简历解析失败怎么办？",
        desc: "请检查文件格式与大小限制，或尝试导出为新版 PDF/DOCX。",
    },
    {
        title: "问题数量可以调整吗？",
        desc: "创建会话时可选择 3-10 题，后续可重新开新会话。",
    },
    {
        title: "结果是否会保存？",
        desc: "问题与答案会记录到会话中，便于后续回看与对比。",
    },
];

export default function IntroPage() {
    useEffect(() => {
        const prevBodyOverflow = document.body.style.overflow;
        const prevHtmlOverflow = document.documentElement.style.overflow;
        document.body.style.overflow = "auto";
        document.documentElement.style.overflow = "auto";
        return () => {
            document.body.style.overflow = prevBodyOverflow;
            document.documentElement.style.overflow = prevHtmlOverflow;
        };
    }, []);

    return (
        <div className="grid gap-10">
            <section className="relative overflow-hidden rounded-[32px] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-amber-50 p-10 shadow-[0_30px_80px_-60px_rgba(15,23,42,0.6)]">
                <div className="absolute -left-16 top-6 h-48 w-48 rounded-full bg-amber-200/40 blur-3xl" />
                <div className="absolute -right-10 bottom-8 h-52 w-52 rounded-full bg-emerald-200/40 blur-3xl" />
                <div className="relative space-y-6">
                    <Badge className="w-fit rounded-full bg-slate-900 text-white">
                        产品介绍
                    </Badge>
                    <div className="space-y-3">
                        <h1 className="text-4xl font-semibold text-slate-900">
                            让每一次面试都能对齐岗位要求
                        </h1>
                        <p className="text-base text-slate-600">
                            通过岗位信息与简历内容双重约束，生成高质量追问并输出结构化诊断，帮助你更快识别差距与改进方向。
                        </p>
                    </div>
                </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-3">
                {HIGHLIGHTS.map((item) => (
                    <Card
                        key={item.title}
                        className="border-slate-200/70 bg-white/90"
                    >
                        <CardHeader>
                            <CardTitle className="text-base">
                                {item.title}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-slate-600">
                            {item.desc}
                        </CardContent>
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
                            <p className="font-semibold text-slate-900">
                                角色画像对齐
                            </p>
                            <p>将岗位职责转为问题焦点，提升问题针对性。</p>
                        </div>
                        <div>
                            <p className="font-semibold text-slate-900">
                                过程状态可控
                            </p>
                            <p>明确准备/问答/讨论阶段，避免状态混乱。</p>
                        </div>
                        <div>
                            <p className="font-semibold text-slate-900">
                                结果落地可执行
                            </p>
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
                                        <p className="text-sm font-semibold text-slate-900">
                                            {item.title}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            {item.desc}
                                        </p>
                                    </div>
                                </div>
                                {index < FLOW.length - 1 && <Separator />}
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </section>

            <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
                <Card className="border-slate-200/70 bg-white/95">
                    <CardHeader>
                        <CardTitle>输出内容示例</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4 sm:grid-cols-2">
                        {OUTPUTS.map((item) => (
                            <div
                                key={item.title}
                                className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4"
                            >
                                <p className="text-sm font-semibold text-slate-900">
                                    {item.title}
                                </p>
                                <p className="mt-1 text-xs text-slate-600">
                                    {item.desc}
                                </p>
                            </div>
                        ))}
                    </CardContent>
                </Card>
                <Card className="border-slate-200/70 bg-white/95">
                    <CardHeader>
                        <CardTitle>适用场景</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm text-slate-600">
                        {SCENARIOS.map((item) => (
                            <div
                                key={item.title}
                                className="rounded-2xl border border-slate-200/70 bg-white p-4"
                            >
                                <p className="font-semibold text-slate-900">
                                    {item.title}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                    {item.desc}
                                </p>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </section>

            <section className="grid gap-6 lg:grid-cols-3">
                <Card className="border-slate-200/70 bg-white/95">
                    <CardHeader>
                        <CardTitle>数据与隐私</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm text-slate-600">
                        <p>简历内容仅用于生成问题与分析结果。</p>
                        <p>每一次问答都会被记录，方便后续复盘与优化。</p>
                        <p>可随时重新开启新会话，不影响历史记录。</p>
                    </CardContent>
                </Card>
                <Card className="border-slate-200/70 bg-white/95">
                    <CardHeader>
                        <CardTitle>反馈与迭代</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm text-slate-600">
                        <p>问题质量与输出结构会持续优化。</p>
                        <p>推荐在回答完毕后复盘关键问题与信号。</p>
                        <p>适合每次投递前快速做一次自检。</p>
                    </CardContent>
                </Card>
                <Card className="border-slate-200/70 bg-white/95">
                    <CardHeader>
                        <CardTitle>快速入口</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Button asChild className="w-full rounded-full">
                            <Link href="/">立即开始</Link>
                        </Button>
                        <Button
                            asChild
                            variant="outline"
                            className="w-full rounded-full"
                        >
                            <Link href="/sessions">查看历史</Link>
                        </Button>
                    </CardContent>
                </Card>
            </section>

            <section className="grid gap-6 lg:grid-cols-[0.7fr_1.3fr]">
                <Card className="border-slate-200/70 bg-white/95">
                    <CardHeader>
                        <CardTitle>常见问题</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm text-slate-600">
                        {FAQS.map((item) => (
                            <div key={item.title}>
                                <p className="font-semibold text-slate-900">
                                    {item.title}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                    {item.desc}
                                </p>
                            </div>
                        ))}
                    </CardContent>
                </Card>
                <Card className="border-slate-200/70 bg-white/95">
                    <CardHeader>
                        <CardTitle>你将获得</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm text-slate-600">
                        <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4">
                            <p className="font-semibold text-slate-900">
                                岗位匹配视角
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                                更明确当前能力与岗位要求之间的差距。
                            </p>
                        </div>
                        <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4">
                            <p className="font-semibold text-slate-900">
                                结构化复盘
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                                用结构化建议替代主观判断，提升可执行性。
                            </p>
                        </div>
                        <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4">
                            <p className="font-semibold text-slate-900">
                                行动路线图
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                                知道从哪里开始、先做什么、如何衡量。
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </section>
        </div>
    );
}
