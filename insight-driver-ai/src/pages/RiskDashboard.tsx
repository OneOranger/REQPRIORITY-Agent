import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Shield, Link2, Target, Copy, Sparkles, ChevronDown, ChevronRight, ExternalLink, RefreshCw, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { risksAPI } from "@/services/api";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

// 类型定义
interface SimpleRequirement {
  id: string;
  name: string;
  priority: string;
  module: string;
  totalScore: number;
  riskLevel: string;
}

interface RiskCard {
  id: string;
  name: string;
  priority: string;
  risks: string[];
  suggestions: string[];
  aiSuggestion?: string;
  dependencyChain?: { id: string; name: string; priority: string; depth: number }[];
  description?: string;
  module?: string;
  totalScore?: number;
  businessScore?: number;
  userScore?: number;
  strategyScore?: number;
  dependencyCount?: number;
  conflictCount?: number;
  impactPath?: string;
  aiExplanation?: string;
}

interface RiskCategory {
  name: string;
  count: number;
  icon: string;
}

// 默认数据作为回退
const fallbackDistribution = [
  { name: "高风险", value: 3, color: "#ef4444", riskLevel: "高" },
  { name: "中风险", value: 4, color: "#f97316", riskLevel: "中" },
  { name: "低风险", value: 5, color: "#22c55e", riskLevel: "低" },
];

const fallbackCategories: RiskCategory[] = [
  { name: "高依赖", count: 6, icon: "Link2" },
  { name: "战略不一致", count: 3, icon: "Target" },
  { name: "冲突需求", count: 2, icon: "AlertTriangle" },
  { name: "重复建设", count: 3, icon: "Copy" },
];

const iconMap: Record<string, React.ElementType> = {
  Link2,
  Target,
  AlertTriangle,
  Copy,
};

// 优先级颜色映射
const priorityColorMap: Record<string, string> = {
  P0: "bg-red-500/10 text-red-500 border-red-500/20",
  P1: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  P2: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  P3: "bg-gray-500/10 text-gray-500 border-gray-500/20",
};

export default function RiskDashboard() {
  const navigate = useNavigate();
  const [riskDistribution, setRiskDistribution] = useState(fallbackDistribution);
  const [riskCategories, setRiskCategories] = useState<RiskCategory[]>(fallbackCategories);
  const [riskCards, setRiskCards] = useState<RiskCard[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 筛选状态
  const [riskFilter, setRiskFilter] = useState<string>("all");
  
  // 饼图交互状态
  const [selectedRiskLevel, setSelectedRiskLevel] = useState<string | null>(null);
  const [requirementsByRisk, setRequirementsByRisk] = useState<Record<string, SimpleRequirement[]>>({});
  
  // 分类卡片交互状态
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [requirementsByCategory, setRequirementsByCategory] = useState<Record<string, SimpleRequirement[]>>({});
  
  // 高风险卡片展开状态
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [assessingCardId, setAssessingCardId] = useState<string | null>(null);

  // 获取风险数据
  useEffect(() => {
    const fetchRiskData = async () => {
      setLoading(true);
      try {
        const [overviewData, highRiskData] = await Promise.all([
          risksAPI.getOverview(),
          risksAPI.getHighRisk()
        ]);

        if (overviewData) {
          if (overviewData.distribution) {
            // 添加 riskLevel 属性用于筛选
            const distributionWithLevel = overviewData.distribution.map((item: any) => ({
              ...item,
              riskLevel: item.name === "高风险" ? "高" : item.name === "中风险" ? "中" : "低"
            }));
            setRiskDistribution(distributionWithLevel);
          }
          if (overviewData.categories) {
            setRiskCategories(overviewData.categories);
          }
          if (overviewData.requirementsByRisk) {
            setRequirementsByRisk(overviewData.requirementsByRisk);
          }
          if (overviewData.requirementsByCategory) {
            setRequirementsByCategory(overviewData.requirementsByCategory);
          }
        }
        if (highRiskData && highRiskData.length > 0) {
          setRiskCards(highRiskData);
        }
      } catch (error) {
        console.warn("获取风险数据失败，使用mock数据", error);
        toast.warning("无法获取风险数据，使用本地数据");
      } finally {
        setLoading(false);
      }
    };
    fetchRiskData();
  }, []);

  // 饼图点击处理
  const handlePieClick = (data: any) => {
    const riskLevel = data.riskLevel || (data.name === "高风险" ? "高" : data.name === "中风险" ? "中" : "低");
    setSelectedRiskLevel(prev => prev === riskLevel ? null : riskLevel);
  };

  // 分类卡片点击处理
  const handleCategoryClick = (categoryName: string) => {
    setExpandedCategory(prev => prev === categoryName ? null : categoryName);
  };

  // 高风险卡片展开处理
  const handleCardExpand = (cardId: string) => {
    setExpandedCardId(prev => prev === cardId ? null : cardId);
  };

  // AI重新评估
  const handleReassess = async (reqId: string) => {
    if (!reqId) return;
    setAssessingCardId(reqId);
    try {
      const result = await risksAPI.assess(reqId);
      toast.success("AI风险重新评估完成");
      console.log("Assessment result:", result);
      // 刷新数据
      const highRiskData = await risksAPI.getHighRisk();
      if (highRiskData && highRiskData.length > 0) {
        setRiskCards(highRiskData);
      }
    } catch (error) {
      toast.error("AI评估失败，请稍后重试");
    } finally {
      setAssessingCardId(null);
    }
  };

  // 跳转到需求详情
  const navigateToRequirement = (reqId: string) => {
    navigate(`/requirements?id=${reqId}`);
  };

  // 根据筛选过滤数据
  const filteredDistribution = riskFilter === "all" 
    ? riskDistribution 
    : riskDistribution.filter((item: any) => item.riskLevel === riskFilter);

  const filteredRiskCards = riskFilter === "all"
    ? riskCards
    : riskCards.filter(card => {
        const level = card.risks?.length && card.risks.length >= 3 ? "高" : "中";
        return level === riskFilter;
      });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-xl font-bold flex items-center gap-2">
          <Shield className="h-5 w-5 text-risk-high" />
          风险控制台
        </h2>
        
        {/* 风险等级筛选器 */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <div className="flex gap-1">
            {["all", "高", "中", "低"].map((level) => (
              <Button
                key={level}
                variant={riskFilter === level ? "default" : "outline"}
                size="sm"
                onClick={() => setRiskFilter(level)}
                className="h-7 px-3 text-xs"
              >
                {level === "all" ? "全部" : `${level}风险`}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {loading && (
        <div className="text-sm text-muted-foreground">加载风险数据中...</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Risk Distribution Pie Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-heading">风险分布</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={filteredDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, value }) => `${name} ${value}`}
                    labelLine={false}
                    onClick={handlePieClick}
                    className="cursor-pointer"
                  >
                    {filteredDistribution.map((entry, i) => (
                      <Cell 
                        key={i} 
                        fill={entry.color}
                        className={`transition-opacity ${selectedRiskLevel && selectedRiskLevel !== entry.riskLevel ? 'opacity-50' : 'opacity-100'}`}
                        stroke={selectedRiskLevel === entry.riskLevel ? 'white' : 'transparent'}
                        strokeWidth={selectedRiskLevel === entry.riskLevel ? 2 : 0}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            {/* 点击饼图后展开的需求列表 */}
            <AnimatePresence>
              {selectedRiskLevel && requirementsByRisk[selectedRiskLevel] && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="border-t pt-3 mt-3">
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      {selectedRiskLevel}风险需求
                      <Badge variant="secondary">{requirementsByRisk[selectedRiskLevel].length}项</Badge>
                    </h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {requirementsByRisk[selectedRiskLevel].map((req) => (
                        <motion.div
                          key={req.id}
                          initial={{ x: -10, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          className="flex items-center justify-between p-2 rounded-lg bg-accent/50 hover:bg-accent cursor-pointer"
                          onClick={() => navigateToRequirement(req.id)}
                        >
                          <div className="flex items-center gap-2">
                            <Badge className={priorityColorMap[req.priority] || ""} variant="outline">
                              {req.priority}
                            </Badge>
                            <span className="text-sm font-medium">{req.name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{req.module}</span>
                            <span>•</span>
                            <span>{req.totalScore}分</span>
                            <ExternalLink className="h-3 w-3" />
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Risk Categories */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-heading">风险分类统计</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {riskCategories.map((cat, i) => {
                const IconComponent = iconMap[cat.icon] || AlertTriangle;
                const isExpanded = expandedCategory === cat.name;
                const categoryReqs = requirementsByCategory[cat.name] || [];
                
                return (
                  <Collapsible
                    key={cat.name}
                    open={isExpanded}
                    onOpenChange={() => handleCategoryClick(cat.name)}
                  >
                    <CollapsibleTrigger asChild>
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.1 }}
                        className={`flex items-center gap-3 p-3 rounded-lg bg-accent cursor-pointer transition-all ${
                          isExpanded ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : 'hover:bg-accent/80'
                        }`}
                      >
                        <IconComponent className="h-5 w-5 text-risk-medium" />
                        <div className="flex-1">
                          <p className="text-2xl font-heading font-bold">{cat.count}</p>
                          <p className="text-xs text-muted-foreground">{cat.name}</p>
                        </div>
                        <ChevronRight 
                          className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
                        />
                      </motion.div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mt-2 p-2 rounded-lg bg-muted/50 max-h-40 overflow-y-auto"
                      >
                        {categoryReqs.length > 0 ? (
                          <div className="space-y-1.5">
                            {categoryReqs.map((req) => (
                              <div
                                key={req.id}
                                className="flex items-center justify-between p-2 rounded bg-background hover:bg-background/80 cursor-pointer text-sm"
                                onClick={() => navigateToRequirement(req.id)}
                              >
                                <div className="flex items-center gap-2">
                                  <Badge className={priorityColorMap[req.priority] || ""} variant="outline" style={{ fontSize: '10px' }}>
                                    {req.priority}
                                  </Badge>
                                  <span className="truncate max-w-[120px]">{req.name}</span>
                                </div>
                                <ExternalLink className="h-3 w-3 text-muted-foreground" />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground text-center py-2">暂无相关需求</p>
                        )}
                      </motion.div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Risk Cards */}
      <h3 className="font-heading font-semibold mt-4">高风险需求详情</h3>
      <div className="grid gap-4">
        {filteredRiskCards.map((card, i) => {
          const isExpanded = expandedCardId === card.id;
          
          return (
            <motion.div
              key={card.id || card.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Collapsible
                open={isExpanded}
                onOpenChange={() => handleCardExpand(card.id || card.name)}
              >
                <Card className={`border-l-4 border-l-risk-high transition-all ${isExpanded ? 'shadow-lg' : ''}`}>
                  <CollapsibleTrigger asChild>
                    <CardContent className="p-5 cursor-pointer">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <h4 className="font-heading font-semibold">{card.name}</h4>
                          <Badge variant="outline">{card.priority}</Badge>
                          <Badge className="bg-risk-high/10 text-risk-high">高风险</Badge>
                        </div>
                        <ChevronDown 
                          className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
                        />
                      </div>
                      
                      {!isExpanded && (
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs font-medium text-risk-high mb-2">风险项</p>
                            <ul className="space-y-1">
                              {card.risks?.slice(0, 2).map((risk, j) => (
                                <li key={j} className="flex items-start gap-1.5 text-sm">
                                  <AlertTriangle className="h-3 w-3 text-risk-medium mt-1 shrink-0" />
                                  {risk}
                                </li>
                              ))}
                              {card.risks && card.risks.length > 2 && (
                                <li className="text-xs text-muted-foreground">+{card.risks.length - 2} 项风险...</li>
                              )}
                            </ul>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-score-high mb-2 flex items-center gap-1">
                              <Sparkles className="h-3 w-3" /> AI 建议
                            </p>
                            <ul className="space-y-1">
                              {card.suggestions?.slice(0, 2).map((sug, j) => (
                                <li key={j} className="text-sm text-muted-foreground">• {sug}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <CardContent className="pt-0 pb-5 px-5 border-t">
                      {/* 完整需求描述 */}
                      {card.description && (
                        <div className="mt-4">
                          <h5 className="text-sm font-medium mb-1">需求描述</h5>
                          <p className="text-sm text-muted-foreground">{card.description}</p>
                        </div>
                      )}
                      
                      {/* 评分详情 */}
                      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="p-3 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground">总分</p>
                          <p className="text-lg font-bold">{card.totalScore?.toFixed(1) || '-'}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground">业务价值</p>
                          <p className="text-lg font-bold">{card.businessScore?.toFixed(1) || '-'}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground">用户价值</p>
                          <p className="text-lg font-bold">{card.userScore?.toFixed(1) || '-'}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground">战略价值</p>
                          <p className="text-lg font-bold">{card.strategyScore?.toFixed(1) || '-'}</p>
                        </div>
                      </div>
                      
                      {/* 影响路径 */}
                      {card.impactPath && (
                        <div className="mt-4">
                          <h5 className="text-sm font-medium mb-1">影响路径</h5>
                          <p className="text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded inline-block">
                            {card.impactPath}
                          </p>
                        </div>
                      )}
                      
                      {/* 依赖关系 */}
                      <div className="mt-4">
                        <h5 className="text-sm font-medium mb-1">依赖统计</h5>
                        <div className="flex gap-4">
                          <Badge variant="secondary">
                            <Link2 className="h-3 w-3 mr-1" />
                            {card.dependencyCount || 0} 个依赖
                          </Badge>
                          <Badge variant="secondary">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {card.conflictCount || 0} 个冲突
                          </Badge>
                          {card.module && (
                            <Badge variant="outline">{card.module}</Badge>
                          )}
                        </div>
                      </div>
                      
                      {/* AI解释 */}
                      {card.aiExplanation && (
                        <div className="mt-4">
                          <h5 className="text-sm font-medium mb-1 flex items-center gap-1">
                            <Sparkles className="h-3 w-3 text-score-high" /> AI 分析
                          </h5>
                          <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded">
                            {card.aiExplanation}
                          </p>
                        </div>
                      )}
                      
                      {/* 完整风险项和建议 */}
                      <div className="grid md:grid-cols-2 gap-4 mt-4">
                        <div>
                          <p className="text-xs font-medium text-risk-high mb-2">所有风险项</p>
                          <ul className="space-y-1">
                            {card.risks?.map((risk, j) => (
                              <li key={j} className="flex items-start gap-1.5 text-sm">
                                <AlertTriangle className="h-3 w-3 text-risk-medium mt-1 shrink-0" />
                                {risk}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-score-high mb-2 flex items-center gap-1">
                            <Sparkles className="h-3 w-3" /> 完整建议
                          </p>
                          <ul className="space-y-1">
                            {card.suggestions?.map((sug, j) => (
                              <li key={j} className="text-sm text-muted-foreground">• {sug}</li>
                            ))}
                          </ul>
                          {card.aiSuggestion && (
                            <p className="text-sm text-primary mt-2">{card.aiSuggestion}</p>
                          )}
                        </div>
                      </div>
                      
                      {/* 操作按钮 */}
                      <div className="flex gap-2 mt-4 pt-4 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigateToRequirement(card.id);
                          }}
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          查看完整详情
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={assessingCardId === card.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReassess(card.id);
                          }}
                        >
                          {assessingCardId === card.id ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                              评估中...
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-4 w-4 mr-1" />
                              AI 重新评估风险
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            </motion.div>
          );
        })}
        
        {filteredRiskCards.length === 0 && !loading && (
          <Card className="p-8 text-center text-muted-foreground">
            {riskFilter === "all" ? "暂无高风险需求" : `暂无${riskFilter}风险需求`}
          </Card>
        )}
      </div>
    </div>
  );
}
