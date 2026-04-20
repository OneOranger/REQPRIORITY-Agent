import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Sparkles, ChevronRight, Bot, FileText, Save, RotateCcw, Brain, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { scoringDimensions } from "@/data/mockData";
import { scoringAPI, requirementsAPI } from "@/services/api";
import { toast } from "sonner";
import { AiTracePanel } from "@/components/AiTracePanel";

// 需求接口
interface Requirement {
  id: string;
  name: string;
  status: string;
  totalScore: number;
  businessScore: number;
  userScore: number;
  strategyScore: number;
  costDeduction: number;
  riskDeduction: number;
  graphBonus: number;
  priority?: string;
  aiExplanation?: string;
  aiSuggestion?: string;
  reasons?: Record<string, string>;
}

// 维度接口
interface ScoringDimension {
  id: string;
  name: string;
  weight: number;
  children: {
    id: string;
    name: string;
    question: string;
    labels: string[];
  }[];
}

function ScoreBar({ label, score, max = 100, color = "bg-primary" }: { label: string; score: number; max?: number; color?: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs w-20 text-muted-foreground">{label}</span>
      <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${(score / max) * 100}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
      <span className="text-sm font-heading font-bold w-10 text-right">{score}</span>
    </div>
  );
}

export default function ScoringCenter() {
  const [activeDimension, setActiveDimension] = useState("business");
  const [dimensions, setDimensions] = useState<ScoringDimension[]>(scoringDimensions);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [selectedReqId, setSelectedReqId] = useState<string>("");
  const [scores, setScores] = useState<Record<string, number>>({});
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [aiLoading, setAiLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [weightsChanged, setWeightsChanged] = useState(false);
  const [saveWeightsLoading, setSaveWeightsLoading] = useState(false);

  // AI追踪相关状态
  const [lastTraceId, setLastTraceId] = useState<string | null>(null);
  const [traceSheetOpen, setTraceSheetOpen] = useState(false);
  
  // AI评分结果
  const [aiResult, setAiResult] = useState<{
    aiExplanation?: string;
    aiSuggestion?: string;
    priority?: string;
  }>({});
  
  // AI评分维度理由
  const [aiReasons, setAiReasons] = useState<Record<string, string>>({});

  // 初始化权重
  useEffect(() => {
    const initialWeights: Record<string, number> = {};
    dimensions.forEach(dim => {
      initialWeights[dim.id] = dim.weight;
    });
    setWeights(initialWeights);
  }, [dimensions]);

  // 获取需求列表
  useEffect(() => {
    const fetchRequirements = async () => {
      try {
        const data = await requirementsAPI.getAll();
        setRequirements(data);
        // 默认选择第一个"待评估"状态的需求，否则选第一个
        const pendingReq = data.find((r: Requirement) => r.status === "待评估");
        const firstReq = pendingReq || data[0];
        if (firstReq) {
          setSelectedReqId(firstReq.id);
        }
      } catch (error) {
        console.warn("获取需求列表失败", error);
      }
    };
    fetchRequirements();
  }, []);

  // 获取评分维度
  useEffect(() => {
    const fetchDimensions = async () => {
      try {
        const data = await scoringAPI.getDimensions();
        if (data && data.length > 0) {
          setDimensions(data);
        }
      } catch (error) {
        console.warn("获取评分维度失败，使用mock数据", error);
      }
    };
    fetchDimensions();
  }, []);

  // 当选择需求变化时，加载该需求的评分数据
  useEffect(() => {
    const loadScores = async () => {
      if (!selectedReqId) return;
      
      const req = requirements.find(r => r.id === selectedReqId);
      if (req) {
        // 初始化分数
        const initialScores: Record<string, number> = {};
        dimensions.forEach(dim => {
          dim.children.forEach(child => {
            // 根据已有评分估算各题目的分数
            initialScores[child.id] = 3; // 默认中间值
          });
        });
        
        // 如果有已有的评分，设置AI结果
        setAiResult({
          aiExplanation: req.aiExplanation,
          aiSuggestion: req.aiSuggestion,
          priority: req.priority,
        });
        
        // 如果有已有的评分理由，设置AI理由
        if (req.reasons) {
          setAiReasons(req.reasons);
        }
        
        setScores(initialScores);
      }
    };
    loadScores();
  }, [selectedReqId, requirements, dimensions]);

  // 计算各维度分数
  const dimensionScores = useMemo(() => {
    const result: Record<string, number> = {};
    
    dimensions.forEach(dim => {
      const childScores = dim.children.map(child => scores[child.id] || 3);
      const avgScore = childScores.reduce((a, b) => a + b, 0) / childScores.length;
      // 将1-5分映射到0-10分
      result[dim.id] = (avgScore - 1) * 2.5;
    });
    
    return result;
  }, [scores, dimensions]);

  // 计算总分（实时计算）
  const totalScore = useMemo(() => {
    // 计算正向维度加权总分
    let positiveScore = 0;
    let totalWeight = 0;
    
    ['business', 'user', 'strategy'].forEach(dimId => {
      const weight = weights[dimId] || 0;
      const score = dimensionScores[dimId] || 0;
      positiveScore += score * weight * 10;
      totalWeight += weight;
    });
    
    // 成本扣分（cost维度，分数越高扣越多）
    const costScore = (scores['c1'] || 3) + (scores['c2'] || 3) + (scores['c3'] || 3) + (scores['c4'] || 3);
    const costDeduction = -costScore * 1.5;
    
    // 风险扣分（risk维度）
    const riskScore = (scores['r1'] || 3) + (scores['r2'] || 3) + (scores['r3'] || 3);
    const riskDeduction = -riskScore * 1.5;
    
    // 图谱加成（graph维度）
    const graphScore = (scores['g1'] || 3) + (scores['g2'] || 3) + (scores['g3'] || 3);
    const graphBonus = (graphScore / 3) * 5;
    
    // 总分
    let total = positiveScore / (totalWeight || 1) + costDeduction + riskDeduction + graphBonus;
    total = Math.max(0, Math.min(100, Math.round(total)));
    
    return total;
  }, [scores, weights, dimensionScores]);

  // 获取当前选中的需求
  const selectedReq = requirements.find(r => r.id === selectedReqId);
  
  const activeDim = dimensions.find(d => d.id === activeDimension);

  // 调整权重 - 等比例调整其他维度，确保总和为100%
  const handleWeightChange = (dimId: string, newWeightPercent: number) => {
    const newWeight = newWeightPercent / 100;
    const oldWeight = weights[dimId] || 0;
    const diff = newWeight - oldWeight;

    // 获取其他维度
    const otherDimIds = Object.keys(weights).filter(id => id !== dimId);
    const otherTotalWeight = otherDimIds.reduce((sum, id) => sum + (weights[id] || 0), 0);

    // 等比调整其他维度
    const newWeights: Record<string, number> = { ...weights };
    newWeights[dimId] = newWeight;

    if (otherTotalWeight > 0 && diff !== 0) {
      otherDimIds.forEach(id => {
        const currentWeight = weights[id] || 0;
        const ratio = currentWeight / otherTotalWeight;
        // 等比例调整，确保最低5%
        newWeights[id] = Math.max(0.05, currentWeight - diff * ratio);
      });
    }

    // 确保总和为100%（处理四舍五入误差）
    const total = Object.values(newWeights).reduce((s, w) => s + w, 0);
    if (Math.abs(total - 1.0) > 0.001 && otherDimIds.length > 0) {
      // 将误差加到第一个其他维度上
      const firstOtherId = otherDimIds[0];
      newWeights[firstOtherId] += (1.0 - total);
      // 确保不低于5%
      if (newWeights[firstOtherId] < 0.05) {
        newWeights[firstOtherId] = 0.05;
      }
    }

    setWeights(newWeights);
    setWeightsChanged(true);
  };

  // 保存权重到后端
  const handleSaveWeights = async () => {
    setSaveWeightsLoading(true);
    try {
      // 将当前权重更新到dimensions中
      const updatedDimensions = dimensions.map(dim => ({
        ...dim,
        weight: weights[dim.id] || dim.weight
      }));
      
      await scoringAPI.updateDimensions(updatedDimensions);
      setDimensions(updatedDimensions);
      setWeightsChanged(false);
      toast.success("权重已保存");
    } catch (error) {
      console.error("保存权重失败", error);
      toast.error("保存权重失败，请重试");
    } finally {
      setSaveWeightsLoading(false);
    }
  };

  // 恢复默认权重
  const handleResetWeights = () => {
    const defaultWeights: Record<string, number> = {};
    dimensions.forEach(dim => {
      defaultWeights[dim.id] = dim.weight;
    });
    setWeights(defaultWeights);
    setWeightsChanged(true);
    toast.success("已恢复默认权重，请点击保存权重以生效");
  };

  // 采用AI评分
  const handleAiScore = async () => {
    if (!selectedReqId) {
      toast.error("请先选择需求");
      return;
    }
    
    setAiLoading(true);
    try {
      const result = await scoringAPI.aiScore(selectedReqId);
      if (result.success) {
        // 存储traceId
        if (result.traceId) {
          setLastTraceId(result.traceId);
        }
        
        // 更新AI结果
        setAiResult({
          aiExplanation: result.aiExplanation,
          aiSuggestion: result.aiSuggestion,
          priority: result.priority,
        });
        
        // 设置AI评分理由
        if (result.reasons) {
          setAiReasons(result.reasons);
        }
        
        // 根据返回的分数更新评分选项
        // 将维度分数映射到各个问题
        const newScores: Record<string, number> = { ...scores };
        
        // businessScore 映射到 b1, b2, b3
        const businessAvg = (result.businessScore || 5) / 2.5 + 1;
        ['b1', 'b2', 'b3'].forEach(id => {
          newScores[id] = Math.round(Math.max(1, Math.min(5, businessAvg)));
        });
        
        // userScore 映射
        const userAvg = (result.userScore || 5) / 2.5 + 1;
        ['u1', 'u2', 'u3'].forEach(id => {
          newScores[id] = Math.round(Math.max(1, Math.min(5, userAvg)));
        });
        
        // strategyScore 映射
        const strategyAvg = (result.strategyScore || 5) / 2.5 + 1;
        ['s1', 's2', 's3'].forEach(id => {
          newScores[id] = Math.round(Math.max(1, Math.min(5, strategyAvg)));
        });
        
        // costDeduction 映射 (负数，取绝对值)
        const costAvg = Math.abs(result.costDeduction || -8) / 3;
        ['c1', 'c2', 'c3', 'c4'].forEach(id => {
          newScores[id] = Math.round(Math.max(1, Math.min(5, costAvg)));
        });
        
        // riskDeduction 映射
        const riskAvg = Math.abs(result.riskDeduction || -5) / 2;
        ['r1', 'r2', 'r3'].forEach(id => {
          newScores[id] = Math.round(Math.max(1, Math.min(5, riskAvg)));
        });
        
        // graphBonus 映射
        const graphAvg = (result.graphBonus || 5) / 2;
        ['g1', 'g2', 'g3'].forEach(id => {
          newScores[id] = Math.round(Math.max(1, Math.min(5, graphAvg)));
        });
        
        setScores(newScores);
        
        toast.success("AI评分完成", {
          action: result.traceId ? {
            label: "查看评分流程",
            onClick: () => setTraceSheetOpen(true)
          } : undefined
        });
        
        // 刷新需求列表
        const data = await requirementsAPI.getAll();
        setRequirements(data);
      }
    } catch (error) {
      console.error("AI评分失败", error);
      toast.error("AI评分失败，请重试");
    } finally {
      setAiLoading(false);
    }
  };

  // 确认评分
  const handleConfirmScores = async () => {
    if (!selectedReqId) {
      toast.error("请先选择需求");
      return;
    }
    
    setSaveLoading(true);
    try {
      const scoresData = {
        businessScore: dimensionScores['business'] || 5,
        userScore: dimensionScores['user'] || 5,
        strategyScore: dimensionScores['strategy'] || 5,
        costDeduction: -((scores['c1'] || 3) + (scores['c2'] || 3) + (scores['c3'] || 3) + (scores['c4'] || 3)) * 1.5,
        riskDeduction: -((scores['r1'] || 3) + (scores['r2'] || 3) + (scores['r3'] || 3)) * 1.5,
        graphBonus: ((scores['g1'] || 3) + (scores['g2'] || 3) + (scores['g3'] || 3)) / 3 * 5,
      };
      
      await scoringAPI.saveScores(selectedReqId, scoresData);
      toast.success("评分已保存");
      
      // 刷新需求列表
      const data = await requirementsAPI.getAll();
      setRequirements(data);
    } catch (error) {
      console.error("保存评分失败", error);
      toast.error("保存失败，请重试");
    } finally {
      setSaveLoading(false);
    }
  };

  // 根据总分计算优先级建议
  const prioritySuggestion = useMemo(() => {
    if (totalScore >= 85) return { label: "P0 - 立即执行", class: "bg-priority-p0 text-primary-foreground" };
    if (totalScore >= 70) return { label: "P1 - 本期排入", class: "bg-priority-p1 text-primary-foreground" };
    if (totalScore >= 50) return { label: "P2 - 建议排入", class: "bg-priority-p2 text-primary-foreground" };
    return { label: "P3 - 可选/延后", class: "bg-priority-p3 text-primary-foreground" };
  }, [totalScore]);

  return (
    <div className="flex h-[calc(100vh-3rem)]">
      {/* Left: Dimension Tree */}
      <div className="w-60 border-r bg-card shrink-0">
        <div className="p-4 border-b">
          <h3 className="font-heading font-semibold text-sm">评分维度</h3>
          <p className="text-xs text-muted-foreground mt-1">{selectedReq?.name || "请选择需求"}</p>
        </div>
        <ScrollArea className="h-[calc(100%-4rem)]">
          <div className="p-2">
            {dimensions.map(dim => (
              <div key={dim.id} className="mb-1">
                <button
                  className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeDimension === dim.id ? 'bg-primary/10 text-primary' : 'hover:bg-accent'}`}
                  onClick={() => setActiveDimension(dim.id)}
                >
                  <div className="flex items-center justify-between">
                    <span>{dim.name}</span>
                    <Badge variant="secondary" className="text-[10px] h-5">
                      {Math.round((weights[dim.id] || dim.weight) * 100)}%
                    </Badge>
                  </div>
                </button>
                {activeDimension === dim.id && (
                  <div className="ml-4 mt-1 space-y-0.5">
                    {dim.children.map(child => (
                      <div
                        key={child.id}
                        className="flex items-center gap-1 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer rounded"
                      >
                        <ChevronRight className="h-3 w-3" />
                        {child.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Middle: Scoring Form */}
      <div className="flex-1 overflow-auto">
        <div className="p-6 max-w-3xl mx-auto space-y-6">
          {/* 需求选择器 */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-1.5 block">选择需求</label>
                  <Select value={selectedReqId} onValueChange={setSelectedReqId}>
                    <SelectTrigger>
                      <SelectValue placeholder="请选择要评分的需求" />
                    </SelectTrigger>
                    <SelectContent>
                      {requirements.map((req) => (
                        <SelectItem key={req.id} value={req.id}>
                          <div className="flex items-center gap-2">
                            <span>{req.name}</span>
                            <Badge variant="outline" className="text-[10px]">
                              {req.status}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 pt-5">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleAiScore} 
                    disabled={aiLoading || !selectedReqId}
                    className="gap-1"
                  >
                    <Bot className="h-4 w-4" />
                    {aiLoading ? "评分中..." : "采用AI评分"}
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={handleConfirmScores} 
                    disabled={saveLoading || !selectedReqId}
                    className="gap-1"
                  >
                    <Save className="h-4 w-4" />
                    {saveLoading ? "保存中..." : "确认评分"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI评分规则区域 - 可编辑权重 */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-primary" />
                  <h4 className="font-medium text-sm">AI评分规则</h4>
                </div>
                <div className="flex items-center gap-2">
                  {weightsChanged && (
                    <span className="text-xs text-amber-600 dark:text-amber-400">权重已修改</span>
                  )}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleResetWeights} 
                    className="text-xs h-7"
                    disabled={saveWeightsLoading}
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    恢复默认
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleSaveWeights} 
                    disabled={!weightsChanged || saveWeightsLoading}
                    className="text-xs h-7 gap-1"
                  >
                    <Save className="h-3 w-3" />
                    {saveWeightsLoading ? "保存中..." : "保存权重"}
                  </Button>
                </div>
              </div>
              <div className="space-y-3">
                {dimensions.map(dim => (
                  <div key={dim.id} className="flex items-center gap-3 py-1">
                    <span className="text-sm font-medium w-24">{dim.name}</span>
                    <div className="flex-1 flex items-center gap-3">
                      <span className="text-sm w-12 text-right">{Math.round((weights[dim.id] || dim.weight) * 100)}%</span>
                      <Slider
                        value={[Math.round((weights[dim.id] || dim.weight) * 100)]}
                        onValueChange={(v) => handleWeightChange(dim.id, v[0])}
                        max={50}
                        min={5}
                        step={5}
                        className="flex-1"
                      />
                    </div>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        {dim.children && dim.children.length > 0 
                          ? `评估指标: ${dim.children.map(c => c.name).join('、')}`
                          : '多维度综合评估'}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                <Info className="h-3 w-3" />
                拖动滑块调整权重，其他维度将自动等比例调整，总和始终为100%。每个维度权重范围5%-50%。
              </p>
            </CardContent>
          </Card>

          {/* 维度评分 */}
          <div>
            <h2 className="font-heading text-xl font-bold">{activeDim?.name} 评分</h2>
            <p className="text-sm text-muted-foreground">权重: {Math.round((weights[activeDimension] || activeDim?.weight || 0) * 100)}%</p>
            {/* AI评分理由 */}
            {aiReasons[activeDimension] && (
              <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 mb-1">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">AI评分理由</span>
                </div>
                <p className="text-sm text-muted-foreground">{aiReasons[activeDimension]}</p>
              </div>
            )}
          </div>

          {activeDim?.children.map((question, qi) => (
            <motion.div
              key={question.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: qi * 0.1 }}
            >
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="font-medium text-sm mb-1">
                        问题{qi + 1}：{question.question}
                      </h4>
                      <p className="text-xs text-muted-foreground">{question.name}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Tooltip>
                        <TooltipTrigger>
                          <Badge variant="outline" className="text-[10px] gap-1 cursor-help">
                            <Bot className="h-3 w-3" /> AI建议
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>AI 自动评分基于历史数据和行业基准</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger>
                          <Badge variant="outline" className="text-[10px] gap-1 cursor-help">
                            <FileText className="h-3 w-3" /> 数据支撑
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>基于用户行为数据和业务指标分析</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {question.labels.map((label, i) => {
                      const value = i + 1;
                      const isSelected = scores[question.id] === value;
                      return (
                        <button
                          key={i}
                          className={`flex-1 py-3 px-2 rounded-lg border text-center transition-all text-xs ${
                            isSelected
                              ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                              : 'bg-card hover:bg-accent border-border'
                          }`}
                          onClick={() => setScores(prev => ({ ...prev, [question.id]: value }))}
                        >
                          <div className="font-heading font-bold text-lg mb-0.5">{value}</div>
                          <div className={isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'}>{label}</div>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Right: Real-time Score Panel */}
      <div className="w-72 border-l bg-card shrink-0 overflow-auto">
        <div className="p-5 space-y-6">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">综合总分</p>
            <motion.div
              className="text-5xl font-heading font-bold text-primary"
              key={totalScore}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
            >
              {totalScore}
            </motion.div>
          </div>

          <div className="space-y-3">
            <ScoreBar label="业务价值" score={Math.round(dimensionScores['business'] || 0)} color="bg-primary" />
            <ScoreBar label="用户价值" score={Math.round(dimensionScores['user'] || 0)} color="bg-primary" />
            <ScoreBar label="战略价值" score={Math.round(dimensionScores['strategy'] || 0)} color="bg-primary" />
            <ScoreBar 
              label="成本扣分" 
              score={Math.round((scores['c1'] || 3) + (scores['c2'] || 3) + (scores['c3'] || 3) + (scores['c4'] || 3))} 
              max={20} 
              color="bg-priority-p0" 
            />
            <ScoreBar 
              label="风险扣分" 
              score={Math.round((scores['r1'] || 3) + (scores['r2'] || 3) + (scores['r3'] || 3))} 
              max={15} 
              color="bg-risk-medium" 
            />
            <ScoreBar 
              label="图谱加成" 
              score={Math.round(((scores['g1'] || 3) + (scores['g2'] || 3) + (scores['g3'] || 3)) / 3 * 5)} 
              max={15} 
              color="bg-score-high" 
            />
          </div>

          <Card className="border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-primary" />
                <h4 className="font-heading font-semibold text-sm">AI 解释</h4>
              </div>
              <div className="text-sm space-y-2 text-muted-foreground">
                {aiResult.aiExplanation ? (
                  <p>{aiResult.aiExplanation}</p>
                ) : (
                  <p className="italic">请先进行AI评分</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <h4 className="font-heading font-semibold text-sm mb-2">优先级建议</h4>
              <Badge className={prioritySuggestion.class}>
                {prioritySuggestion.label}
              </Badge>
              {aiResult.aiSuggestion && (
                <p className="text-xs text-muted-foreground mt-2">{aiResult.aiSuggestion}</p>
              )}
            </CardContent>
          </Card>
          
          {/* 底部按钮 */}
          <div className="flex flex-col gap-2">
            <Button 
              className="w-full gap-1" 
              onClick={handleConfirmScores} 
              disabled={saveLoading || !selectedReqId}
            >
              <Save className="h-4 w-4" />
              {saveLoading ? "保存中..." : "确认评分"}
            </Button>
            <Button 
              variant="outline" 
              className="w-full gap-1" 
              onClick={handleAiScore} 
              disabled={aiLoading || !selectedReqId}
            >
              <Bot className="h-4 w-4" />
              {aiLoading ? "评分中..." : "采用AI评分"}
            </Button>
          </div>
        </div>
      </div>

      {/* AI处理流程追踪Sheet */}
      <Sheet open={traceSheetOpen} onOpenChange={setTraceSheetOpen}>
        <SheetContent className="w-[420px] sm:w-[540px] p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>AI评分流程</SheetTitle>
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
