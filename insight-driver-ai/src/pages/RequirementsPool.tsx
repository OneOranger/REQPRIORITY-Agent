import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Filter, X, Sparkles, Link, AlertTriangle, ChevronRight, Plus, Upload, FileText, Loader2, Trash2, Pencil, Activity } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { requirements as mockRequirements, Requirement } from "@/data/mockData";
import { requirementsAPI, modulesAPI } from "@/services/api";
import { toast } from "sonner";
import { AiTracePanel } from "@/components/AiTracePanel";

const defaultModules = ["用户系统", "性能", "交易系统", "会员系统", "社区", "个性化", "运营", "数据"];

const otherFilterGroups = [
  { label: "优先级", key: "priority", options: ["P0", "P1", "P2", "P3"] },
  { label: "状态", key: "status", options: ["待评估", "已评分", "已排期", "已上线", "已延后"] },
  { label: "风险等级", key: "riskLevel", options: ["高", "中", "低"] },
];

const priorityBadgeClass: Record<string, string> = {
  P0: "bg-priority-p0/10 text-priority-p0 border-priority-p0/20",
  P1: "bg-priority-p1/10 text-priority-p1 border-priority-p1/20",
  P2: "bg-priority-p2/10 text-priority-p2 border-priority-p2/20",
  P3: "bg-priority-p3/10 text-priority-p3 border-priority-p3/20",
};

const riskBadgeClass: Record<string, string> = {
  '高': "bg-risk-high/10 text-risk-high",
  '中': "bg-risk-medium/10 text-risk-medium",
  '低': "bg-risk-low/10 text-risk-low",
};

// 状态Badge样式映射
const statusBadgeClass: Record<string, string> = {
  '待评估': "bg-gray-100 text-gray-600 border-gray-200",
  '已评分': "bg-blue-100 text-blue-600 border-blue-200",
  '已排期': "bg-green-100 text-green-600 border-green-200",
  '已上线': "bg-purple-100 text-purple-600 border-purple-200",
  '已延后': "bg-orange-100 text-orange-600 border-orange-200",
};

// 状态操作按钮配置
interface StatusAction {
  label: string;
  target: string;
  variant: "default" | "outline" | "ghost";
}

const getStatusActions = (currentStatus: string): StatusAction[] => {
  switch (currentStatus) {
    case "待评估":
      return [
        { label: "标记为已评分", target: "已评分", variant: "default" },
        { label: "延后", target: "已延后", variant: "outline" },
      ];
    case "已评分":
      return [
        { label: "排入路线图", target: "已排期", variant: "default" },
        { label: "延后", target: "已延后", variant: "outline" },
      ];
    case "已排期":
      return [
        { label: "标记已上线", target: "已上线", variant: "default" },
        { label: "延后", target: "已延后", variant: "outline" },
      ];
    case "已上线":
      return [
        { label: "延后", target: "已延后", variant: "outline" },
      ];
    case "已延后":
      return [
        { label: "恢复评估", target: "待评估", variant: "default" },
      ];
    default:
      return [];
  }
};

export default function RequirementsPool() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Requirement | null>(null);
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  const [allRequirements, setAllRequirements] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [aiParsing, setAiParsing] = useState(false);
  const [newReq, setNewReq] = useState({ module: "", title: "", value: "", targetUser: "", keyMetric: "" });
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 编辑和重新分析状态
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Requirement>>({});
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 模块管理相关状态
  const [modules, setModules] = useState<string[]>(defaultModules);
  const [isAddingModule, setIsAddingModule] = useState(false);
  const [newModuleName, setNewModuleName] = useState("");
  const [hoveredModule, setHoveredModule] = useState<string | null>(null);

  // AI追踪相关状态
  const [lastTraceId, setLastTraceId] = useState<string | null>(null);
  const [traceSheetOpen, setTraceSheetOpen] = useState(false);

  // 状态变更处理
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const handleStatusChange = async (reqId: string, newStatus: string) => {
    try {
      setIsUpdatingStatus(true);
      await requirementsAPI.updateStatus(reqId, newStatus);
      // 更新本地状态
      setAllRequirements(prev => prev.map(r => 
        r.id === reqId ? { ...r, status: newStatus as Requirement['status'] } : r
      ));
      if (selected?.id === reqId) {
        setSelected({ ...selected, status: newStatus as Requirement['status'] });
      }
      toast.success(`状态已更新为「${newStatus}」`);
    } catch (error: any) {
      const detail = error?.message || "状态更新失败";
      toast.error("状态变更失败", { description: detail });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // 从后端获取需求数据
  useEffect(() => {
    const fetchRequirements = async () => {
      try {
        setLoading(true);
        const data = await requirementsAPI.getAll();
        setAllRequirements(data);
      } catch (error) {
        console.error("Failed to fetch requirements:", error);
        toast.error("无法连接到后端，使用本地数据");
        setAllRequirements(mockRequirements);
      } finally {
        setLoading(false);
      }
    };
    fetchRequirements();
  }, []);

  // 当选择新需求时，退出编辑模式
  useEffect(() => {
    setIsEditing(false);
    setEditData({});
  }, [selected?.id]);

  // 从后端获取模块列表
  useEffect(() => {
    const fetchModules = async () => {
      try {
        const data = await modulesAPI.getAll();
        if (data && data.length > 0) {
          setModules(data);
        }
      } catch (error) {
        console.error("Failed to fetch modules:", error);
        // 使用默认模块作为回退
      }
    };
    fetchModules();
  }, []);

  // 新增模块
  const handleAddModule = async () => {
    if (!newModuleName.trim()) {
      toast.error("模块名不能为空");
      return;
    }
    try {
      const result = await modulesAPI.create(newModuleName.trim());
      setModules(result.modules);
      setNewModuleName("");
      setIsAddingModule(false);
      toast.success(`模块 "${newModuleName.trim()}" 添加成功`);
    } catch (error: any) {
      toast.error(error.message || "添加模块失败");
    }
  };

  // 删除模块
  const handleDeleteModule = async (moduleName: string) => {
    try {
      const result = await modulesAPI.delete(moduleName);
      setModules(result.modules);
      // 如果当前筛选包含被删除的模块，需要清除该筛选
      if (filters.module?.includes(moduleName)) {
        setFilters(prev => ({
          ...prev,
          module: prev.module?.filter(m => m !== moduleName) || []
        }));
      }
      toast.success(`模块 "${moduleName}" 删除成功`);
    } catch (error: any) {
      toast.error(error.message || "删除模块失败");
    }
  };

  const toggleFilter = (key: string, value: string) => {
    setFilters(prev => {
      const current = prev[key] || [];
      return {
        ...prev,
        [key]: current.includes(value) ? current.filter(v => v !== value) : [...current, value]
      };
    });
  };

  const handleAiParse = async () => {
    if (!newReq.title && !uploadedFile) {
      toast.error("请至少填写需求标题或上传需求文档");
      return;
    }
    setAiParsing(true);
    
    try {
      // 尝试调用后端API
      const formData = new FormData();
      formData.append('title', newReq.title || '');
      formData.append('value', newReq.value || '');
      formData.append('module', newReq.module || '用户系统');
      formData.append('targetUser', newReq.targetUser || '全部用户');
      formData.append('goal', newReq.keyMetric || '待确认');
      if (uploadedFile) {
        formData.append('file', uploadedFile);
      }
      
      const result = await requirementsAPI.parse(formData);
      
      // 将后端返回的数据转换为前端格式
      const generated: Requirement = {
        id: result.id,
        name: result.name,
        description: result.description,
        module: result.module,
        targetUser: result.targetUser,
        goal: result.goal,
        priority: result.priority,
        totalScore: result.totalScore,
        businessScore: result.businessScore,
        userScore: result.userScore,
        strategyScore: result.strategyScore,
        costDeduction: result.costDeduction,
        riskDeduction: result.riskDeduction,
        graphBonus: result.graphBonus,
        relatedCount: result.relatedCount,
        dependencyCount: result.dependencyCount,
        conflictCount: result.conflictCount,
        aiSuggestion: result.aiSuggestion,
        status: result.status,
        riskLevel: result.riskLevel,
        isGraphCore: result.isGraphCore,
        hasDependency: result.hasDependency,
        alignsWithStrategy: result.alignsWithStrategy,
        source: result.source,
        impactPath: result.impactPath || '待分析',
        aiExplanation: result.aiExplanation,
      };
      
      setAllRequirements(prev => [generated, ...prev]);
      setNewReq({ module: "", title: "", value: "", targetUser: "", keyMetric: "" });
      setUploadedFile(null);
      setAiParsing(false);
      setDialogOpen(false);
      
      // 存储traceId
      if (result.traceId) {
        setLastTraceId(result.traceId);
      }
      
      toast.success("需求已通过AI解析并加入需求池", {
        description: `${generated.name} 已添加`,
        action: result.traceId ? {
          label: "查看AI处理流程",
          onClick: () => setTraceSheetOpen(true)
        } : undefined
      });
    } catch (error) {
      console.error("API parse failed, falling back to local:", error);
      
      // 回退到本地模拟
      setTimeout(() => {
        const id = `REQ-${String(allRequirements.length + 1).padStart(3, '0')}`;
        const generated: Requirement = {
          id,
          name: newReq.title || (uploadedFile ? `从文档解析: ${uploadedFile.name}` : '新需求'),
          description: newReq.value || 'AI 自动生成的需求描述',
          module: newReq.module || '用户系统',
          targetUser: newReq.targetUser || '全部用户',
          goal: newReq.keyMetric || '待确认',
          priority: 'P2',
          totalScore: 0,
          businessScore: 0, userScore: 0, strategyScore: 0,
          costDeduction: 0, riskDeduction: 0, graphBonus: 0,
          relatedCount: 0, dependencyCount: 0, conflictCount: 0,
          aiSuggestion: '待AI评分',
          status: '待评估', riskLevel: '中',
          isGraphCore: false, hasDependency: false, alignsWithStrategy: false,
          source: uploadedFile ? '文档导入' : '手动录入',
          impactPath: '待分析',
          aiExplanation: '该需求刚加入需求池，等待AI评分和分析（本地模拟）',
        };
        setAllRequirements(prev => [generated, ...prev]);
        setNewReq({ module: "", title: "", value: "", targetUser: "", keyMetric: "" });
        setUploadedFile(null);
        setAiParsing(false);
        setDialogOpen(false);
        toast.success("需求已加入需求池（本地模式）", { description: `${generated.name} 已添加` });
      }, 2000);
    }
  };

  // 进入编辑模式
  const handleEdit = () => {
    if (!selected) return;
    setEditData({
      name: selected.name,
      description: selected.description,
      module: selected.module,
      targetUser: selected.targetUser,
      goal: selected.goal,
      source: selected.source,
    });
    setIsEditing(true);
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditData({});
  };

  // 保存编辑
  const handleSaveEdit = async () => {
    if (!selected || !editData) return;
    
    setIsSaving(true);
    try {
      const updated = await requirementsAPI.update(selected.id, editData);
      
      // 更新列表中的数据
      setAllRequirements(prev => 
        prev.map(req => req.id === selected.id ? { ...req, ...updated } : req)
      );
      
      // 更新选中的需求
      setSelected({ ...selected, ...updated });
      
      setIsEditing(false);
      setEditData({});
      toast.success("需求修改已保存");
    } catch (error) {
      console.error("Failed to update requirement:", error);
      toast.error("保存失败，请重试");
    } finally {
      setIsSaving(false);
    }
  };

  // 重新AI分析
  const handleReanalyze = async () => {
    if (!selected) return;
    
    // 确认提示
    if (!confirm(`确定要重新对 "${selected.name}" 进行AI分析吗？这将重新计算评分和风险评估。`)) {
      return;
    }
    
    setIsReanalyzing(true);
    try {
      const result = await requirementsAPI.reanalyze(selected.id);
      
      if (result.success && result.requirement) {
        // 更新列表中的数据
        setAllRequirements(prev => 
          prev.map(req => req.id === selected.id ? result.requirement : req)
        );
        
        // 更新选中的需求
        setSelected(result.requirement);
        
        toast.success("AI重新分析完成", {
          description: `新评分: ${result.requirement.totalScore}，优先级: ${result.requirement.priority}`
        });
      }
    } catch (error) {
      console.error("Failed to reanalyze requirement:", error);
      toast.error("重新分析失败，请重试");
    } finally {
      setIsReanalyzing(false);
    }
  };

  const filtered = allRequirements.filter(r => {
    if (search && !r.name.includes(search) && !r.description.includes(search)) return false;
    for (const [key, values] of Object.entries(filters)) {
      if (values.length > 0 && !values.includes((r as any)[key])) return false;
    }
    return true;
  });

  return (
    <div className="flex h-[calc(100vh-3rem)]">
      {/* Left: Filters */}
      <div className="w-56 border-r bg-card p-4 shrink-0 overflow-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-semibold text-sm">筛选</h3>
          <Button variant="ghost" size="sm" className="text-xs h-6" onClick={() => setFilters({})}>
            <X className="h-3 w-3 mr-1" />清除
          </Button>
        </div>
        
        {/* 所属模块 - 带管理功能 */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-muted-foreground">所属模块</p>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-5 px-1.5 text-xs"
              onClick={() => setIsAddingModule(true)}
            >
              <Plus className="h-3 w-3 mr-0.5" />新增
            </Button>
          </div>
          
          {/* 新增模块输入框 */}
          {isAddingModule && (
            <div className="flex items-center gap-1 mb-2">
              <Input
                placeholder="输入模块名称..."
                className="h-7 text-xs"
                value={newModuleName}
                onChange={e => setNewModuleName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleAddModule();
                  if (e.key === 'Escape') {
                    setIsAddingModule(false);
                    setNewModuleName("");
                  }
                }}
                autoFocus
              />
              <Button 
                size="sm" 
                className="h-7 px-2 text-xs"
                onClick={handleAddModule}
              >
                确认
              </Button>
            </div>
          )}
          
          <div className="space-y-1">
            {modules.map(opt => (
              <div 
                key={opt} 
                className="flex items-center justify-between group"
                onMouseEnter={() => setHoveredModule(opt)}
                onMouseLeave={() => setHoveredModule(null)}
              >
                <label className="flex items-center gap-2 text-sm cursor-pointer hover:text-primary flex-1">
                  <Checkbox
                    checked={(filters.module || []).includes(opt)}
                    onCheckedChange={() => toggleFilter("module", opt)}
                    className="h-3.5 w-3.5"
                  />
                  <span className="truncate">{opt}</span>
                </label>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity ${
                    hoveredModule === opt ? 'opacity-100' : ''
                  }`}
                  onClick={() => handleDeleteModule(opt)}
                >
                  <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </div>
        
        {/* 其他筛选组 */}
        {otherFilterGroups.map(group => (
          <div key={group.key} className="mb-4">
            <p className="text-xs font-medium text-muted-foreground mb-2">{group.label}</p>
            <div className="space-y-1.5">
              {group.options.map(opt => (
                <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer hover:text-primary">
                  <Checkbox
                    checked={(filters[group.key] || []).includes(opt)}
                    onCheckedChange={() => toggleFilter(group.key, opt)}
                    className="h-3.5 w-3.5"
                  />
                  {opt}
                </label>
              ))}
            </div>
          </div>
        ))}
        <div className="mb-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">特殊标记</p>
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-sm cursor-pointer hover:text-primary">
              <Checkbox className="h-3.5 w-3.5" /> 图谱核心节点
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer hover:text-primary">
              <Checkbox className="h-3.5 w-3.5" /> 存在依赖
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer hover:text-primary">
              <Checkbox className="h-3.5 w-3.5" /> 战略一致
            </label>
          </div>
        </div>
      </div>

      {/* Middle: Requirement List */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="p-4 border-b bg-card">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索需求..."
                className="pl-9 h-9"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Badge variant="secondary">{filtered.length} 个需求</Badge>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5">
                  <Plus className="h-4 w-4" />新增需求
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[540px]">
                <DialogHeader>
                  <DialogTitle className="font-heading">新增需求</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-2">
                  <div className="space-y-2">
                    <Label>所属模块</Label>
                    <Select value={newReq.module} onValueChange={v => setNewReq(p => ({ ...p, module: v }))}>
                      <SelectTrigger><SelectValue placeholder="选择模块" /></SelectTrigger>
                      <SelectContent>
                        {modules.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>需求标题 <span className="text-destructive">*</span></Label>
                    <Input placeholder="如：微信一键登录" value={newReq.title} onChange={e => setNewReq(p => ({ ...p, title: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>需求价值</Label>
                    <Textarea placeholder="描述该需求的业务价值和预期收益..." rows={3} value={newReq.value} onChange={e => setNewReq(p => ({ ...p, value: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>目标用户</Label>
                      <Input placeholder="如：新用户、付费用户" value={newReq.targetUser} onChange={e => setNewReq(p => ({ ...p, targetUser: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>关键指标</Label>
                      <Input placeholder="如：注册转化率、留存率" value={newReq.keyMetric} onChange={e => setNewReq(p => ({ ...p, keyMetric: e.target.value }))} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>需求文档导入</Label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.md,.txt,.xlsx"
                      onChange={e => { if (e.target.files?.[0]) setUploadedFile(e.target.files[0]); }}
                    />
                    <div
                      className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {uploadedFile ? (
                        <div className="flex items-center justify-center gap-2 text-sm">
                          <FileText className="h-4 w-4 text-primary" />
                          <span className="font-medium">{uploadedFile.name}</span>
                          <Button variant="ghost" size="sm" className="h-5 px-1" onClick={e => { e.stopPropagation(); setUploadedFile(null); }}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="text-muted-foreground text-sm">
                          <Upload className="h-5 w-5 mx-auto mb-1" />
                          点击上传需求文档（PDF/Word/Markdown/Excel）
                        </div>
                      )}
                    </div>
                  </div>
                  <Button className="w-full gap-2" onClick={handleAiParse} disabled={aiParsing}>
                    {aiParsing ? (
                      <><Loader2 className="h-4 w-4 animate-spin" />AI 解析中...</>
                    ) : (
                      <><Sparkles className="h-4 w-4" />AI 解析并加入需求池</>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-3">
            {filtered.map((req, i) => (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Card
                  className={`cursor-pointer transition-all hover:shadow-md ${selected?.id === req.id ? 'ring-2 ring-primary' : ''}`}
                  onClick={() => setSelected(req)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-heading font-semibold">{req.name}</h4>
                        <Badge variant="outline" className={priorityBadgeClass[req.priority]}>{req.priority}</Badge>
                        <Badge variant="outline" className={riskBadgeClass[req.riskLevel]}>{req.riskLevel}风险</Badge>
                        <Badge variant="outline" className={statusBadgeClass[req.status]}>{req.status}</Badge>
                      </div>
                      <span className="text-xl font-heading font-bold text-primary">{req.totalScore}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">目标：{req.goal} · 用户：{req.targetUser}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>业务 {req.businessScore}</span>
                      <span>用户 {req.userScore}</span>
                      <span>战略 {req.strategyScore}</span>
                      <span className="text-priority-p0">成本 {req.costDeduction}</span>
                      <span className="text-risk-medium">风险 {req.riskDeduction}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs">
                      <span className="flex items-center gap-1"><Link className="h-3 w-3" /> 关联 {req.relatedCount}</span>
                      <span className="flex items-center gap-1">依赖 {req.dependencyCount}</span>
                      <span className="flex items-center gap-1">冲突 {req.conflictCount}</span>
                    </div>
                    <div className="flex items-center gap-1 mt-2 text-xs text-primary">
                      <Sparkles className="h-3 w-3" />
                      AI建议：{req.aiSuggestion}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Right: Detail Sheet */}
      <Sheet open={!!selected} onOpenChange={() => setSelected(null)}>
        <SheetContent className="w-[420px] sm:w-[480px] overflow-auto">
          {selected && (
            <>
              <SheetHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <SheetTitle className="font-heading">{selected.name}</SheetTitle>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Badge variant="outline" className={priorityBadgeClass[selected.priority]}>{selected.priority}</Badge>
                      <Badge variant="outline" className={statusBadgeClass[selected.status]}>{selected.status}</Badge>
                      {/* 状态操作按钮 */}
                      {getStatusActions(selected.status).map((action) => (
                        <Button
                          key={action.target}
                          variant={action.variant}
                          size="sm"
                          className={`h-6 text-xs px-2 ${action.label === '延后' ? 'text-orange-500 hover:text-orange-600 border-orange-200' : ''}`}
                          onClick={() => handleStatusChange(selected.id, action.target)}
                          disabled={isUpdatingStatus}
                        >
                          {isUpdatingStatus ? (
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          ) : null}
                          {action.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="gap-1"
                      onClick={handleEdit}
                      disabled={isEditing || isReanalyzing}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      编辑
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="gap-1 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/30 hover:from-purple-500/20 hover:to-blue-500/20"
                      onClick={handleReanalyze}
                      disabled={isEditing || isReanalyzing}
                    >
                      {isReanalyzing ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                      )}
                      {isReanalyzing ? '分析中...' : '重新AI分析'}
                    </Button>
                  </div>
                </div>
              </SheetHeader>
              
              {isEditing ? (
                // 编辑模式
                <div className="mt-6 space-y-4">
                  <div className="space-y-2">
                    <Label>需求名称</Label>
                    <Input 
                      value={editData.name || ''} 
                      onChange={e => setEditData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="输入需求名称"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>需求描述</Label>
                    <Textarea 
                      value={editData.description || ''} 
                      onChange={e => setEditData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="输入需求描述"
                      rows={4}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>所属模块</Label>
                    <Select 
                      value={editData.module || ''} 
                      onValueChange={v => setEditData(prev => ({ ...prev, module: v }))}
                    >
                      <SelectTrigger><SelectValue placeholder="选择模块" /></SelectTrigger>
                      <SelectContent>
                        {modules.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>目标用户</Label>
                    <Input 
                      value={editData.targetUser || ''} 
                      onChange={e => setEditData(prev => ({ ...prev, targetUser: e.target.value }))}
                      placeholder="如：新用户、付费用户"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>业务目标</Label>
                    <Input 
                      value={editData.goal || ''} 
                      onChange={e => setEditData(prev => ({ ...prev, goal: e.target.value }))}
                      placeholder="如：提升注册转化"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>来源</Label>
                    <Input 
                      value={editData.source || ''} 
                      onChange={e => setEditData(prev => ({ ...prev, source: e.target.value }))}
                      placeholder="如：用户调研、产品规划"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-4">
                    <Button variant="ghost" onClick={handleCancelEdit} disabled={isSaving}>
                      取消
                    </Button>
                    <Button onClick={handleSaveEdit} disabled={isSaving}>
                      {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                      保存修改
                    </Button>
                  </div>
                </div>
              ) : (
                // 查看模式
                <div className="mt-6 space-y-6">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">需求描述</h4>
                    <p className="text-sm">{selected.description}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">来源</p>
                      <p className="text-sm font-medium">{selected.source}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">模块</p>
                      <p className="text-sm font-medium">{selected.module}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">目标用户</p>
                      <p className="text-sm font-medium">{selected.targetUser}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">状态</p>
                      <p className="text-sm font-medium">{selected.status}</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">影响路径</h4>
                    <div className="flex items-center gap-2 text-sm">
                      {selected.impactPath.split('→').map((step, i, arr) => (
                        <span key={i} className="flex items-center gap-1">
                          <Badge variant="secondary" className="text-xs">{step}</Badge>
                          {i < arr.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">评分详情</h4>
                    <div className="space-y-2">
                      {[
                        { label: "业务价值", score: selected.businessScore, max: 10 },
                        { label: "用户价值", score: selected.userScore, max: 10 },
                        { label: "战略价值", score: selected.strategyScore, max: 10 },
                      ].map(item => (
                        <div key={item.label} className="flex items-center gap-3">
                          <span className="text-xs w-16">{item.label}</span>
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${(item.score / item.max) * 100}%` }} />
                          </div>
                          <span className="text-xs font-heading font-bold w-8 text-right">{item.score}</span>
                        </div>
                      ))}
                      <div className="flex items-center gap-3">
                        <span className="text-xs w-16">成本扣分</span>
                        <span className="text-xs font-heading font-bold text-priority-p0">{selected.costDeduction}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs w-16">风险扣分</span>
                        <span className="text-xs font-heading font-bold text-risk-medium">{selected.riskDeduction}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs w-16">图谱加成</span>
                        <span className="text-xs font-heading font-bold text-score-high">+{selected.graphBonus}</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <h4 className="font-heading font-semibold text-sm">AI 分析</h4>
                    </div>
                    <p className="text-sm">{selected.aiExplanation}</p>
                    <p className="text-sm text-primary mt-2 font-medium">建议：{selected.aiSuggestion}</p>
                  </div>
                </div>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* AI处理流程追踪Sheet */}
      <Sheet open={traceSheetOpen} onOpenChange={setTraceSheetOpen}>
        <SheetContent className="w-[420px] sm:w-[540px] p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>AI处理流程</SheetTitle>
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
