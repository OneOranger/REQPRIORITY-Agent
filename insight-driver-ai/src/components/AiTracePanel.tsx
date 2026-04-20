import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot, Clock, CheckCircle2, XCircle, ChevronDown, Activity, Zap,
  Sparkles, ArrowRight, Play, Loader2, ChevronRight, AlertCircle, Trash2
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { traceAPI, Trace, TraceStep } from "@/services/api";
import { toast } from "sonner";

interface AiTracePanelProps {
  traceId?: string;
  showRecent?: boolean;
  onClose?: () => void;
}

// 单个步骤组件
function TraceStepItem({ step, index }: { step: TraceStep; index: number }) {
  const [expanded, setExpanded] = useState(false);
  
  const statusConfig = {
    pending: { icon: Clock, color: "text-muted-foreground", bg: "bg-muted" },
    running: { icon: Loader2, color: "text-primary", bg: "bg-primary/10", animate: true },
    completed: { icon: CheckCircle2, color: "text-green-500", bg: "bg-green-500/10" },
    failed: { icon: XCircle, color: "text-destructive", bg: "bg-destructive/10" },
  };
  
  const config = statusConfig[step.status] || statusConfig.pending;
  const StatusIcon = config.icon;
  
  const actionLabels: Record<string, string> = {
    parse_requirement: "解析需求",
    score_requirement: "评分需求",
    assess_risk: "风险评估",
    build_graph: "构建图谱",
    assemble_result: "组装结果",
    save_requirement: "保存需求",
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="relative"
    >
      {/* 连接线 */}
      {index > 0 && (
        <div className="absolute left-4 top-0 w-0.5 h-4 bg-border -translate-y-full" />
      )}
      
      <Card className="border-l-2 border-l-primary/30">
        <Collapsible open={expanded} onOpenChange={setExpanded}>
          <CollapsibleTrigger asChild>
            <CardContent className="p-3 cursor-pointer hover:bg-accent/50 transition-colors">
              <div className="flex items-center gap-3">
                {/* 状态图标 */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${config.bg}`}>
                  <StatusIcon className={`h-4 w-4 ${config.color} ${config.animate ? 'animate-spin' : ''}`} />
                </div>
                
                {/* 步骤信息 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{step.agentName}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {actionLabels[step.action] || step.action}
                    </Badge>
                    {/* 显示规则回退标记 */}
                    {step.usedFallback && (
                      <Badge className="bg-orange-500/10 text-orange-500 text-[10px]">
                        规则回退
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{step.durationMs}ms</span>
                    {step.llmCalled && (
                      <>
                        <Sparkles className="h-3 w-3 text-primary ml-2" />
                        <span className="text-primary">{step.llmModel}</span>
                      </>
                    )}
                    {/* 显示token消耗 */}
                    {step.tokenCount > 0 && (
                      <span className="text-muted-foreground ml-2">
                        {step.tokenCount} tokens
                      </span>
                    )}
                  </div>
                </div>
                
                {/* 展开/折叠图标 */}
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`} />
              </div>
            </CardContent>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <CardContent className="pt-0 pb-3 px-3">
              <div className="ml-11 space-y-2">
                {/* 输入摘要 */}
                {step.inputSummary && (
                  <div className="text-xs">
                    <span className="text-muted-foreground">📥 输入: </span>
                    <span>{step.inputSummary}</span>
                  </div>
                )}
                
                {/* 输出摘要 */}
                {step.outputSummary && (
                  <div className="text-xs">
                    <span className="text-muted-foreground">📤 输出: </span>
                    <span>{step.outputSummary}</span>
                  </div>
                )}
                
                {/* 错误信息 */}
                {step.error && (
                  <div className="p-2 rounded bg-destructive/10 text-destructive text-xs">
                    ⚠️ {step.error}
                  </div>
                )}
                
                {/* LLM详情 - 完整显示 */}
                {step.llmCalled && (
                  <div className="space-y-2 mt-2">
                    {/* 完整提示词 */}
                    {step.llmPromptFull && (
                      <div className="rounded bg-muted text-xs">
                        <div className="flex items-center gap-1 text-muted-foreground p-2 border-b">
                          <Sparkles className="h-3 w-3" />
                          <span>完整提示词</span>
                        </div>
                        <ScrollArea className="max-h-[300px]">
                          <pre className="whitespace-pre-wrap font-mono text-[11px] text-foreground p-2">
                            {step.llmPromptFull}
                          </pre>
                        </ScrollArea>
                      </div>
                    )}
                    
                    {/* 完整响应 */}
                    {step.llmResponseFull && (
                      <div className="rounded bg-primary/5 text-xs">
                        <div className="flex items-center gap-1 text-primary p-2 border-b border-primary/10">
                          <Bot className="h-3 w-3" />
                          <span>完整响应</span>
                        </div>
                        <ScrollArea className="max-h-[300px]">
                          <pre className="whitespace-pre-wrap font-mono text-[11px] text-foreground p-2">
                            {step.llmResponseFull}
                          </pre>
                        </ScrollArea>
                      </div>
                    )}
                    
                    {/* 如果没有完整内容，显示预览 */}
                    {(!step.llmPromptFull || !step.llmResponseFull) && (
                      <>
                        {step.llmPromptPreview && (
                          <div className="p-2 rounded bg-muted text-xs">
                            <div className="flex items-center gap-1 text-muted-foreground mb-1">
                              <Sparkles className="h-3 w-3" />
                              <span>提示词预览</span>
                            </div>
                            <pre className="whitespace-pre-wrap font-mono text-[11px] text-foreground overflow-hidden">
                              {step.llmPromptPreview}...
                            </pre>
                          </div>
                        )}
                        
                        {step.llmResponsePreview && (
                          <div className="p-2 rounded bg-primary/5 text-xs">
                            <div className="flex items-center gap-1 text-primary mb-1">
                              <Bot className="h-3 w-3" />
                              <span>响应预览</span>
                            </div>
                            <pre className="whitespace-pre-wrap font-mono text-[11px] text-foreground overflow-hidden">
                              {step.llmResponsePreview}...
                            </pre>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </motion.div>
  );
}

// 追踪列表项组件
function TraceListItem({ trace, onClick }: { trace: Trace; onClick: () => void }) {
  const statusConfig = {
    running: { icon: Loader2, color: "text-primary", animate: true },
    completed: { icon: CheckCircle2, color: "text-green-500" },
    failed: { icon: XCircle, color: "text-destructive" },
  };
  
  const config = statusConfig[trace.status] || statusConfig.running;
  const StatusIcon = config.icon;
  
  const triggerLabels: Record<string, string> = {
    "需求解析入池": "需求解析",
    "AI评分": "AI评分",
    "优先级模拟": "优先级重排",
    "风险分析": "风险分析",
  };
  
  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-all hover:border-primary/30"
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-primary/10`}>
              <StatusIcon className={`h-4 w-4 ${config.color} ${config.animate ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">
                  {triggerLabels[trace.trigger] || trace.trigger}
                </span>
                <Badge variant="outline" className="text-[10px]">
                  {trace.steps?.length || 0} 步
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {trace.triggerDetail || trace.trigger}
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs text-muted-foreground">
              {trace.totalDurationMs}ms
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              {trace.startTime ? new Date(trace.startTime).toLocaleTimeString() : '-'}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function AiTracePanel({ traceId, showRecent = false, onClose }: AiTracePanelProps) {
  const [traces, setTraces] = useState<Trace[]>([]);
  const [selectedTrace, setSelectedTrace] = useState<Trace | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [triggerFilter, setTriggerFilter] = useState<string>("all");
  
  // 获取追踪数据
  const fetchTraceData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (traceId) {
        // 获取特定追踪
        const result = await traceAPI.getTrace(traceId);
        if (result.success && result.data) {
          setSelectedTrace(result.data);
        } else {
          setError("追踪记录不存在");
        }
      } else if (showRecent) {
        // 获取最近追踪列表
        const trigger = triggerFilter !== "all" ? triggerFilter : undefined;
        const result = await traceAPI.getTraces(20, trigger);
        if (result.success && result.data) {
          setTraces(result.data);
          if (result.data.length > 0 && !selectedTrace) {
            // 默认选中第一条
            setSelectedTrace(result.data[0]);
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch trace data:", err);
      setError("获取追踪数据失败");
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchTraceData();
  }, [traceId, showRecent, triggerFilter]);
  
  // 清空记录
  const handleClearTraces = async () => {
    try {
      await traceAPI.clearTraces();
      setTraces([]);
      setSelectedTrace(null);
      toast.success("已清空所有调用记录");
    } catch (err) {
      console.error("Failed to clear traces:", err);
      toast.error("清空失败");
    }
  };
  
  // 处理追踪选择
  const handleSelectTrace = (trace: Trace) => {
    setSelectedTrace(trace);
  };
  
  // 返回列表
  const handleBackToList = () => {
    setSelectedTrace(null);
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <XCircle className="h-8 w-8 mb-2" />
        <p className="text-sm">{error}</p>
      </div>
    );
  }
  
  return (
    <div className="h-full flex flex-col">
      {/* 头部 */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          {showRecent && selectedTrace && (
            <Button variant="ghost" size="sm" onClick={handleBackToList}>
              <ChevronRight className="h-4 w-4 rotate-180 mr-1" />
              返回列表
            </Button>
          )}
          <h3 className="font-heading font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            AI 处理流程
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {showRecent && !selectedTrace && traces.length > 0 && (
            <Button variant="ghost" size="sm" onClick={handleClearTraces} className="text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4 mr-1" />
              清空
            </Button>
          )}
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              ✕
            </Button>
          )}
        </div>
      </div>
      
      {/* 筛选区域 */}
      {showRecent && !selectedTrace && (
        <div className="px-4 py-2 border-b">
          <Select value={triggerFilter} onValueChange={setTriggerFilter}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="筛选触发类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类型</SelectItem>
              <SelectItem value="需求解析入池">需求解析</SelectItem>
              <SelectItem value="AI评分">AI评分</SelectItem>
              <SelectItem value="优先级模拟">优先级重排</SelectItem>
              <SelectItem value="风险分析">风险分析</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      
      {/* 内容区域 */}
      <ScrollArea className="flex-1">
        {showRecent && !selectedTrace ? (
          // 显示追踪列表
          <div className="p-4 space-y-2">
            {traces.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <AlertCircle className="h-12 w-12 mb-3 opacity-30" />
                <p className="text-sm font-medium">暂无AI调用记录</p>
                <p className="text-xs mt-1">进行AI操作后将在此显示处理链路</p>
              </div>
            ) : (
              traces.map((trace) => (
                <TraceListItem 
                  key={trace.traceId} 
                  trace={trace} 
                  onClick={() => handleSelectTrace(trace)} 
                />
              ))
            )}
          </div>
        ) : selectedTrace ? (
          // 显示追踪详情
          <div className="p-4">
            {/* 追踪概览 */}
            <div className="mb-4 p-3 rounded-lg bg-primary/5 border border-primary/10">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {selectedTrace.trigger}
                  </Badge>
                  {selectedTrace.status === 'completed' && (
                    <Badge className="bg-green-500/10 text-green-500 text-xs">
                      完成
                    </Badge>
                  )}
                  {selectedTrace.status === 'running' && (
                    <Badge className="bg-primary/10 text-primary text-xs">
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      运行中
                    </Badge>
                  )}
                  {selectedTrace.status === 'failed' && (
                    <Badge className="bg-destructive/10 text-destructive text-xs">
                      失败
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  总耗时: {selectedTrace.totalDurationMs}ms
                </div>
              </div>
              {selectedTrace.triggerDetail && (
                <p className="text-xs text-muted-foreground">
                  {selectedTrace.triggerDetail}
                </p>
              )}
            </div>
            
            {/* 步骤列表 */}
            <div className="space-y-3">
              <AnimatePresence>
                {selectedTrace.steps?.map((step, index) => (
                  <TraceStepItem key={step.stepId} step={step} index={index} />
                ))}
              </AnimatePresence>
            </div>
            
            {/* 如果没有步骤 */}
            {(!selectedTrace.steps || selectedTrace.steps.length === 0) && (
              <div className="text-center text-muted-foreground py-8">
                <Play className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">暂无处理步骤</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Zap className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">暂无追踪数据</p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

// 导出一个用于Sheet的包装组件
export function AiTraceSheet({ open, onOpenChange, traceId }: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  traceId?: string;
}) {
  const { Sheet, SheetContent, SheetHeader, SheetTitle } = require("@/components/ui/sheet");
  
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[420px] sm:w-[540px] p-0">
        <SheetHeader className="sr-only">
          <SheetTitle>AI处理流程</SheetTitle>
        </SheetHeader>
        <AiTracePanel 
          traceId={traceId} 
          showRecent={!traceId}
          onClose={() => onOpenChange(false)} 
        />
      </SheetContent>
    </Sheet>
  );
}

export default AiTracePanel;
