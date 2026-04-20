import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requirements as mockRequirements } from "@/data/mockData";
import { roadmapAPI } from "@/services/api";
import { toast } from "sonner";

interface RoadmapItem {
  period: string;
  label: string;
  items: any[];
  reasoning: string;
  summary?: {
    count: number;
    totalScore: number;
    avgScore: number;
  };
}

const priorityBadgeClass: Record<string, string> = {
  P0: "bg-priority-p0/10 text-priority-p0",
  P1: "bg-priority-p1/10 text-priority-p1",
  P2: "bg-priority-p2/10 text-priority-p2",
  P3: "bg-priority-p3/10 text-priority-p3",
};

export default function Roadmap() {
  const [roadmap, setRoadmap] = useState<RoadmapItem[]>([]);
  const [unscheduled, setUnscheduled] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 获取路线图数据
  useEffect(() => {
    const fetchRoadmap = async () => {
      setLoading(true);
      try {
        const data = await roadmapAPI.get();
        if (data && data.roadmap && data.roadmap.length > 0) {
          setRoadmap(data.roadmap);
          setUnscheduled(data.unscheduled || []);
        } else {
          // fallback: 使用本地mock数据按quarter分组
          const grouped = mockRequirements.filter(r => r.quarter).reduce((acc, r) => {
            const q = r.quarter || "未排期";
            if (!acc[q]) acc[q] = [];
            acc[q].push(r);
            return acc;
          }, {} as Record<string, any[]>);

          const quarterOrder = ["Q3 2026", "Q4 2026", "2027 H1", "2027 H2"];
          const scheduled = Object.keys(grouped).filter(q => q !== "未排期");
          const sortedQuarters = scheduled.sort((a, b) => quarterOrder.indexOf(a) - quarterOrder.indexOf(b));

          const labelMap: Record<string, string> = {};
          sortedQuarters.forEach((q, i) => {
            labelMap[q] = i === 0 ? "本季度" : (i === 1 ? "下季度" : "远期");
          });

          const fallbackRoadmap = sortedQuarters.map(q => ({
            period: q,
            label: labelMap[q],
            items: grouped[q].sort((a, b) => b.totalScore - a.totalScore),
            reasoning: getFallbackReasoning(q, grouped[q]),
            summary: {
              count: grouped[q].length,
              totalScore: grouped[q].reduce((sum, r) => sum + r.totalScore, 0),
              avgScore: Math.round(grouped[q].reduce((sum, r) => sum + r.totalScore, 0) / grouped[q].length),
            }
          }));

          setRoadmap(fallbackRoadmap);
          setUnscheduled(grouped["未排期"] || []);
        }
      } catch (error) {
        console.warn("获取路线图失败，使用mock数据", error);
        toast.warning("无法获取路线图数据，使用本地数据");
        // 使用fallback逻辑
        const grouped = mockRequirements.filter(r => r.quarter).reduce((acc, r) => {
          const q = r.quarter || "未排期";
          if (!acc[q]) acc[q] = [];
          acc[q].push(r);
          return acc;
        }, {} as Record<string, any[]>);

        const quarterOrder = ["Q3 2026", "Q4 2026", "2027 H1", "2027 H2"];
        const scheduled = Object.keys(grouped).filter(q => q !== "未排期");
        const sortedQuarters = scheduled.sort((a, b) => quarterOrder.indexOf(a) - quarterOrder.indexOf(b));

        const labelMap: Record<string, string> = {};
        sortedQuarters.forEach((q, i) => {
          labelMap[q] = i === 0 ? "本季度" : (i === 1 ? "下季度" : "远期");
        });

        const fallbackRoadmap = sortedQuarters.map(q => ({
          period: q,
          label: labelMap[q],
          items: grouped[q].sort((a, b) => b.totalScore - a.totalScore),
          reasoning: getFallbackReasoning(q, grouped[q]),
        }));

        setRoadmap(fallbackRoadmap);
        setUnscheduled(grouped["未排期"] || []);
      } finally {
        setLoading(false);
      }
    };
    fetchRoadmap();
  }, []);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <h2 className="font-heading text-xl font-bold">AI 路线图建议</h2>

      {loading && (
        <div className="text-sm text-muted-foreground">加载路线图数据中...</div>
      )}

      <div className="relative">
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-border" />

        {roadmap.map((phase, pi) => (
          <motion.div
            key={phase.period}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: pi * 0.2 }}
            className="relative pl-20 pb-10"
          >
            <div className="absolute left-5 top-1 w-7 h-7 rounded-full bg-primary flex items-center justify-center">
              <Clock className="h-3.5 w-3.5 text-primary-foreground" />
            </div>

            <div className="flex items-center gap-3 mb-4">
              <h3 className="font-heading text-lg font-bold">{phase.period}</h3>
              <Badge variant="secondary">{phase.label}</Badge>
              {phase.summary && (
                <span className="text-xs text-muted-foreground">
                  {phase.summary.count}个需求 · 平均分{phase.summary.avgScore}
                </span>
              )}
            </div>

            <div className="grid gap-3 mb-3">
              {phase.items.map(req => (
                <Card key={req.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-heading font-semibold">{req.name}</span>
                        <Badge variant="outline" className={priorityBadgeClass[req.priority]}>{req.priority}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{req.goal}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {req.hasDependency && (
                        <Badge variant="outline" className="text-[10px]">
                          <AlertTriangle className="h-3 w-3 mr-1" /> 有依赖
                        </Badge>
                      )}
                      <span className="text-lg font-heading font-bold text-primary">{req.totalScore}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 text-sm">
              <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <p className="text-muted-foreground">{phase.reasoning}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {unscheduled.length > 0 && (
        <div className="mt-8">
          <h3 className="font-heading font-semibold mb-4">未排期需求 ({unscheduled.length})</h3>
          <div className="grid gap-2">
            {unscheduled.slice(0, 5).map(req => (
              <Card key={req.id} className="bg-muted/50">
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{req.name}</span>
                    <Badge variant="outline" className="text-[10px]">{req.priority}</Badge>
                  </div>
                  <span className="text-sm font-heading font-bold text-primary">{req.totalScore}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function getFallbackReasoning(quarter: string, items: any[]): string {
  const p0Count = items.filter(r => r.priority === "P0").length;
  const p1Count = items.filter(r => r.priority === "P1").length;
  if (quarter === "Q3 2026") {
    return `聚焦增长核心链路：${p0Count}个P0需求、${p1Count}个P1需求，同时补齐数据基础设施`;
  } else if (quarter === "Q4 2026") {
    return "支付链路稳定后，启动会员体系和精细化运营能力建设";
  } else {
    return "基础设施就绪后探索新业务方向，低优先级需求视资源情况排入";
  }
}
