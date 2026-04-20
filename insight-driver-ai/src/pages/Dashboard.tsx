import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles, ChevronDown, TrendingUp, AlertTriangle, Network, Zap, RotateCcw, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { requirements as mockRequirements } from "@/data/mockData";
import { dashboardAPI, priorityAPI } from "@/services/api";
import { toast } from "sonner";

interface SummaryData {
  totalCount: number;
  p0Count: number;
  highRiskCount: number;
  graphCoreCount: number;
}

interface Requirement {
  id: string;
  name: string;
  goal: string;
  priority: string;
  totalScore: number;
  businessScore: number;
  userScore: number;
  strategyScore: number;
  aiExplanation: string;
}

interface AiSummary {
  priorities: string[];
  risks: string[];
}

const priorityBadgeClass: Record<string, string> = {
  P0: "bg-priority-p0/10 text-priority-p0 border-priority-p0/20",
  P1: "bg-priority-p1/10 text-priority-p1 border-priority-p1/20",
  P2: "bg-priority-p2/10 text-priority-p2 border-priority-p2/20",
  P3: "bg-priority-p3/10 text-priority-p3 border-priority-p3/20",
};

export default function Dashboard() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [recalculating, setRecalculating] = useState(false);
  const [businessStage, setBusinessStage] = useState("growth");
  const [strategy, setStrategy] = useState("growth-first");
  const [period, setPeriod] = useState("q3");
  const [teamSize, setTeamSize] = useState("20");
  const [budget, setBudget] = useState("medium");
  const [summaryData, setSummaryData] = useState<SummaryData>({
    totalCount: 0,
    p0Count: 0,
    highRiskCount: 0,
    graphCoreCount: 0
  });
  const [topRequirements, setTopRequirements] = useState<Requirement[]>([]);
  const [aiSummary, setAiSummary] = useState<AiSummary>({ priorities: [], risks: [] });
  const [loading, setLoading] = useState(true);

  // 从后端获取数据
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [summary, topReqs, aiSum] = await Promise.all([
          dashboardAPI.getSummary(),
          dashboardAPI.getTopRequirements(),
          dashboardAPI.getAiSummary()
        ]);
        setSummaryData(summary);
        setTopRequirements(topReqs);
        setAiSummary(aiSum);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
        toast.error("无法连接到后端，使用本地数据");
        // 回退到mock数据
        const mockTopReqs = mockRequirements
          .filter(r => r.totalScore >= 70)
          .sort((a, b) => b.totalScore - a.totalScore)
          .map(r => ({
            id: r.id,
            name: r.name,
            goal: r.goal,
            priority: r.priority,
            totalScore: r.totalScore,
            businessScore: r.businessScore,
            userScore: r.userScore,
            strategyScore: r.strategyScore,
            aiExplanation: r.aiExplanation
          }));
        setTopRequirements(mockTopReqs);
        setSummaryData({
          totalCount: mockRequirements.length,
          p0Count: mockRequirements.filter(r => r.priority === 'P0').length,
          highRiskCount: mockRequirements.filter(r => r.riskLevel === '高').length,
          graphCoreCount: mockRequirements.filter(r => r.isGraphCore).length
        });
        setAiSummary({
          priorities: [
            `当前优先级更偏向"增长优先"，入口转化链路相关需求整体前移`,
            "与支付链路相关需求因商业化价值较高被提升",
            "3个需求虽然业务价值高，但因依赖未完成被延后",
            `图谱分析显示"埋点体系"是被依赖最多的基础节点，建议优先`
          ],
          risks: [
            "社区功能将挤占主链路资源，建议后置",
            "会员体系与支付重构存在冲突，需协调排期",
            "积分商城依赖链过长，本季度不建议启动"
          ]
        });
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      // 映射前端值到后端期望的格式
      const stageMap: Record<string, string> = {
        'growth': '增长期',
        'mature': '成熟期',
        'explore': '探索期'
      };
      const strategyMap: Record<string, string> = {
        'growth-first': '增长优先',
        'revenue': '收入优先',
        'retention': '留存优先'
      };
      const periodMap: Record<string, string> = {
        'q3': 'Q3 2026',
        'q4': 'Q4 2026',
        'h1': '2027 H1'
      };
      const budgetMap: Record<string, string> = {
        'low': '低',
        'medium': '中',
        'high': '高'
      };
  
      const params = {
        businessStage: stageMap[businessStage] || businessStage,
        targetStrategy: strategyMap[strategy] || strategy,
        period: periodMap[period] || period,
        teamSize: `${teamSize}人月`,
        budgetLevel: budgetMap[budget] || budget,
      };
  
      const result = await priorityAPI.recalculate(params);
      if (result) {
        toast.success("优先级已重新计算");
        // 刷新数据
        const [summary, topReqs, aiSum] = await Promise.all([
          dashboardAPI.getSummary(),
          dashboardAPI.getTopRequirements(),
          dashboardAPI.getAiSummary()
        ]);
        setSummaryData(summary);
        setTopRequirements(topReqs);
        setAiSummary(aiSum);
      }
    } catch (error) {
      console.error("重新计算失败", error);
      toast.error("重新计算失败，请检查后端服务");
    } finally {
      setRecalculating(false);
    }
  };

  const summaryCards = [
    { label: "需求总数", value: String(summaryData.totalCount), icon: Zap, color: "text-primary" },
    { label: "P0 需求", value: String(summaryData.p0Count), icon: TrendingUp, color: "text-priority-p0" },
    { label: "高风险需求", value: String(summaryData.highRiskCount), icon: AlertTriangle, color: "text-risk-high" },
    { label: "图谱核心节点", value: String(summaryData.graphCoreCount), icon: Network, color: "text-primary" },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Decision Control Bar */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">业务阶段:</span>
              <Select value={businessStage} onValueChange={setBusinessStage}>
                <SelectTrigger className="w-28 h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="growth">增长期</SelectItem>
                  <SelectItem value="mature">成熟期</SelectItem>
                  <SelectItem value="explore">探索期</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">目标策略:</span>
              <Select value={strategy} onValueChange={setStrategy}>
                <SelectTrigger className="w-28 h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="growth-first">增长优先</SelectItem>
                  <SelectItem value="revenue">收入优先</SelectItem>
                  <SelectItem value="retention">留存优先</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">周期:</span>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-28 h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="q3">Q3 2026</SelectItem>
                  <SelectItem value="q4">Q4 2026</SelectItem>
                  <SelectItem value="h1">2027 H1</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">团队:</span>
              <Select value={teamSize} onValueChange={setTeamSize}>
                <SelectTrigger className="w-24 h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10人月</SelectItem>
                  <SelectItem value="20">20人月</SelectItem>
                  <SelectItem value="30">30人月</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">预算:</span>
              <Select value={budget} onValueChange={setBudget}>
                <SelectTrigger className="w-20 h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">低</SelectItem>
                  <SelectItem value="medium">中</SelectItem>
                  <SelectItem value="high">高</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" className="ml-auto ai-gradient text-primary-foreground" onClick={handleRecalculate} disabled={recalculating}>
              {recalculating ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <RotateCcw className="mr-1 h-3 w-3" />
              )}
              {recalculating ? '计算中...' : '重新计算优先级'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summaryCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{card.label}</p>
                    <p className={`text-3xl font-heading font-bold ${card.color}`}>{card.value}</p>
                  </div>
                  <card.icon className={`h-8 w-8 ${card.color} opacity-20`} />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* AI Priority Ranking */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 font-heading">
            <Sparkles className="h-5 w-5 text-primary" />
            AI 优先级排行榜
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {topRequirements.map((req, i) => (
            <motion.div
              key={req.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <div
                className="flex items-center gap-4 p-3 rounded-lg hover:bg-accent cursor-pointer transition-colors"
                onClick={() => setExpandedId(expandedId === req.id ? null : req.id)}
              >
                <span className="text-lg font-heading font-bold text-muted-foreground w-6">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{req.name}</span>
                    <Badge variant="outline" className={priorityBadgeClass[req.priority]}>
                      {req.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{req.goal}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-2xl font-heading font-bold text-primary">{req.totalScore}</span>
                  <p className="text-xs text-muted-foreground">总分</p>
                </div>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expandedId === req.id ? 'rotate-180' : ''}`} />
              </div>
              {expandedId === req.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  className="ml-10 mr-4 mb-3 p-4 bg-accent/50 rounded-lg"
                >
                  <div className="grid grid-cols-3 gap-4 mb-3">
                    <div><span className="text-xs text-muted-foreground">业务分</span><p className="font-heading font-bold">{req.businessScore}</p></div>
                    <div><span className="text-xs text-muted-foreground">用户分</span><p className="font-heading font-bold">{req.userScore}</p></div>
                    <div><span className="text-xs text-muted-foreground">战略分</span><p className="font-heading font-bold">{req.strategyScore}</p></div>
                  </div>
                  <div className="flex items-start gap-2 mt-2 p-3 rounded-md bg-primary/5">
                    <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <p className="text-sm">{req.aiExplanation}</p>
                  </div>
                </motion.div>
              )}
            </motion.div>
          ))}
        </CardContent>
      </Card>

      {/* AI Decision Explanation */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 font-heading">
            <Sparkles className="h-5 w-5 text-primary" />
            AI 本轮优先级判断摘要
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-2 text-sm">
            {aiSummary.priorities.map((priority, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                {priority}
              </li>
            ))}
          </ul>
          <div className="border-t pt-3">
            <h4 className="font-heading font-semibold text-sm text-risk-high mb-2 flex items-center gap-1">
              <AlertTriangle className="h-4 w-4" /> 风险提醒
            </h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {aiSummary.risks.map((risk, index) => (
                <li key={index}>• {risk}</li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
