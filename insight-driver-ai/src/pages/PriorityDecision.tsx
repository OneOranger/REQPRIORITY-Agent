import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles, AlertTriangle, GripVertical, Play, Activity, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { requirements as mockRequirements, type Requirement } from "@/data/mockData";
import { priorityAPI, requirementsAPI } from "@/services/api";
import { toast } from "sonner";
import { AiTracePanel } from "@/components/AiTracePanel";

const lanes = [
  { level: 'P0', label: 'P0 必须做', color: 'border-priority-p0', bgColor: 'bg-priority-p0/5' },
  { level: 'P1', label: 'P1 重要', color: 'border-priority-p1', bgColor: 'bg-priority-p1/5' },
  { level: 'P2', label: 'P2 可选', color: 'border-priority-p2', bgColor: 'bg-priority-p2/5' },
  { level: 'P3', label: 'P3 延后', color: 'border-priority-p3', bgColor: 'bg-priority-p3/5' },
];

const priorityBadgeClass: Record<string, string> = {
  P0: "bg-priority-p0 text-primary-foreground",
  P1: "bg-priority-p1 text-primary-foreground",
  P2: "bg-priority-p2 text-primary-foreground",
  P3: "bg-priority-p3 text-primary-foreground",
};

const simulations = [
  { id: 'resource', label: '如果本季度只有10人月', result: '需移除"会员权益重构"和"新手引导优化"，仅保留3个P0需求' },
  { id: 'goal', label: '如果目标切换为收入优先', result: '"支付成功页推荐"升至P0，"社区功能"降至P3，"会员权益"升至P0' },
  { id: 'delay', label: '如果支付重构延期', result: '"会员权益重构"和"支付成功页推荐"均需延后，影响3个下游需求' },
  { id: 'force', label: '如果高层指定社区功能必须上线', result: '需挤占"新手引导优化"的资源，注册转化指标预计下降5%' },
];

export default function PriorityDecision() {
  const [activeSimulation, setActiveSimulation] = useState<string | null>(null);
  const [dragWarning, setDragWarning] = useState<string | null>(null);
  const [requirements, setRequirements] = useState(mockRequirements);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [customScenario, setCustomScenario] = useState("");
  
  // AI追踪相关状态
  const [lastTraceId, setLastTraceId] = useState<string | null>(null);
  const [traceSheetOpen, setTraceSheetOpen] = useState(false);

  // 初始加载需求数据
  useEffect(() => {
    const fetchRequirements = async () => {
      setLoading(true);
      try {
        const data = await requirementsAPI.getAll();
        if (data && data.length > 0) {
          // 按优先级和总分排序
          const sorted = [...data].sort((a, b) => {
            const priorityOrder: Record<string, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };
            const pa = priorityOrder[a.priority] ?? 4;
            const pb = priorityOrder[b.priority] ?? 4;
            if (pa !== pb) return pa - pb;
            return (b.totalScore || 0) - (a.totalScore || 0);
          });
          setRequirements(sorted);
        }
      } catch (error) {
        console.warn("Failed to fetch requirements, using mock data", error);
        // 失败时保持mockData作为回退
      } finally {
        setLoading(false);
      }
    };

    fetchRequirements();
  }, []);

  // 拖拽开始
  const handleDragStart = (e: React.DragEvent, reqId: string) => {
    e.dataTransfer.setData("text/plain", reqId);
  };

  // 拖拽放下
  const handleDrop = async (e: React.DragEvent, targetLevel: string) => {
    e.preventDefault();
    const reqId = e.dataTransfer.getData("text/plain");
    const req = requirements.find(r => r.id === reqId);
    if (req && req.priority !== targetLevel) {
      setDragWarning(`你将"${req.name}"从 ${req.priority} 拖到 ${targetLevel}。AI提醒：这可能与当前增长目标不一致，会挤占高收益需求的资源。`);
      // 调用API更新优先级
      try {
        await priorityAPI.update(reqId, targetLevel);
        // 更新本地状态
        setRequirements(prev => prev.map(r => r.id === reqId ? { ...r, priority: targetLevel as 'P0' | 'P1' | 'P2' | 'P3' } : r));
        toast.success(`优先级已更新为 ${targetLevel}`);
      } catch (error) {
        console.error("更新优先级失败", error);
        toast.error("更新失败，请重试");
      }
    }
  };

  // AI重排优先级
  const handleAiRecalculate = async () => {
    setAiLoading(true);
    try {
      // 传递 scenario 作为约束条件
      const result = await priorityAPI.recalculate({ scenario: customScenario || undefined });
      
      // 存储traceId
      if (result.traceId) {
        setLastTraceId(result.traceId);
      }
      
      // 如果后端返回了完整的需求列表，直接使用
      if (result && result.requirements && result.requirements.length > 0) {
        // 按优先级和总分排序
        const sorted = [...result.requirements].sort((a, b) => {
          const priorityOrder: Record<string, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };
          const pa = priorityOrder[a.priority] ?? 4;
          const pb = priorityOrder[b.priority] ?? 4;
          if (pa !== pb) return pa - pb;
          return (b.totalScore || 0) - (a.totalScore || 0);
        });
        setRequirements(sorted);
      } else {
        // 如果返回数据不完整，重新获取所有需求
        const allReqs = await requirementsAPI.getAll();
        if (allReqs && allReqs.length > 0) {
          const sorted = [...allReqs].sort((a, b) => {
            const priorityOrder: Record<string, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };
            const pa = priorityOrder[a.priority] ?? 4;
            const pb = priorityOrder[b.priority] ?? 4;
            if (pa !== pb) return pa - pb;
            return (b.totalScore || 0) - (a.totalScore || 0);
          });
          setRequirements(sorted);
        }
      }
      
      toast.success("AI已重新计算优先级", {
        action: result.traceId ? {
          label: "查看重排流程",
          onClick: () => setTraceSheetOpen(true)
        } : undefined
      });
    } catch (error) {
      console.error("AI重排失败", error);
      toast.error("重排失败，请重试");
    } finally {
      setAiLoading(false);
    }
  };

  // 加载状态
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">加载需求数据...</span>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3rem)]">
      {/* Main: Swimlane View */}
      <div className="flex-1 overflow-auto p-6">
        <h2 className="font-heading text-xl font-bold mb-6">优先级分层决策</h2>

        {dragWarning && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-4 rounded-lg bg-risk-medium/10 border border-risk-medium/20"
          >
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-risk-medium mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">{dragWarning}</p>
                <div className="flex gap-2 mt-2">
                  <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setDragWarning(null)}>忽略</Button>
                  <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setDragWarning(null)}>撤销</Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        <div className="space-y-4">
          {lanes.map(lane => {
            const laneReqs = requirements.filter(r => r.priority === lane.level);
            return (
              <div
                key={lane.level}
                className={`rounded-lg border-l-4 ${lane.color} ${lane.bgColor} p-4`}
                onDragOver={e => e.preventDefault()}
                onDrop={e => handleDrop(e, lane.level)}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Badge className={priorityBadgeClass[lane.level]}>{lane.label}</Badge>
                  <span className="text-xs text-muted-foreground">{laneReqs.length} 个需求</span>
                </div>
                <div className="flex flex-wrap gap-3">
                  {laneReqs.map(req => (
                    <motion.div
                      key={req.id}
                      draggable
                      onDragStart={e => handleDragStart(e as unknown as React.DragEvent, req.id)}
                      whileHover={{ scale: 1.02 }}
                      className="cursor-grab active:cursor-grabbing"
                    >
                      <Card className="w-52 hover:shadow-md transition-shadow">
                        <CardContent className="p-3">
                          <div className="flex items-center gap-1 mb-1">
                            <GripVertical className="h-3 w-3 text-muted-foreground" />
                            <span className="font-heading font-semibold text-sm truncate">{req.name}</span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{req.goal}</p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-lg font-heading font-bold text-primary">{req.totalScore}</span>
                            <Badge variant="secondary" className="text-[10px]">{req.riskLevel}风险</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: Simulator */}
      <div className="w-80 border-l bg-card shrink-0 overflow-auto">
        <div className="p-5 space-y-5">
          <div>
            <h3 className="font-heading font-semibold flex items-center gap-2">
              <Play className="h-4 w-4 text-primary" />
              AI 模拟器
            </h3>
            <p className="text-xs text-muted-foreground mt-1">模拟不同场景下的优先级变化</p>
          </div>

          <div className="space-y-3">
            {simulations.map(sim => (
              <Card
                key={sim.id}
                className={`cursor-pointer transition-all ${activeSimulation === sim.id ? 'ring-2 ring-primary' : 'hover:shadow-md'}`}
                onClick={() => setActiveSimulation(activeSimulation === sim.id ? null : sim.id)}
              >
                <CardContent className="p-3">
                  <p className="text-sm font-medium">{sim.label}？</p>
                  {activeSimulation === sim.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      className="mt-2 p-2 rounded bg-primary/5"
                    >
                      <div className="flex items-start gap-1">
                        <Sparkles className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                        <p className="text-xs text-muted-foreground">{sim.result}</p>
                      </div>
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-2">自定义场景</p>
            <Textarea 
              placeholder="输入你的假设场景..." 
              className="text-sm h-20 resize-none" 
              value={customScenario}
              onChange={(e) => setCustomScenario(e.target.value)}
            />
            <Button 
              size="sm" 
              className="mt-2 w-full ai-gradient text-primary-foreground"
              onClick={handleAiRecalculate}
              disabled={aiLoading}
            >
              <Sparkles className="h-3 w-3 mr-1" /> {aiLoading ? "重排中..." : "AI 重排优先级"}
            </Button>
            
            {/* 查看AI流程按钮 */}
            {lastTraceId && (
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full gap-2 mt-2"
                onClick={() => setTraceSheetOpen(true)}
              >
                <Activity className="h-4 w-4" />
                查看重排流程
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* AI处理流程追踪Sheet */}
      <Sheet open={traceSheetOpen} onOpenChange={setTraceSheetOpen}>
        <SheetContent className="w-[420px] sm:w-[540px] p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>AI重排流程</SheetTitle>
          </SheetHeader>
          <AiTracePanel 
            traceId={lastTraceId || undefined} 
            showRecent={!lastTraceId}
            onClose={() => setTraceSheetOpen(false)} 
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
