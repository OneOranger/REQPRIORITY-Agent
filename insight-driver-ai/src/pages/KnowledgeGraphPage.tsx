import { useState, useCallback, useMemo, useEffect } from "react";
import {
  ReactFlow, Background, Controls, MiniMap, Panel,
  Node, Edge, useNodesState, useEdgesState, MarkerType,
  Handle, Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Sparkles, Eye } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { graphNodes as mockGraphNodes, graphEdges as mockGraphEdges, requirements as mockRequirements } from "@/data/mockData";
import { graphAPI, requirementsAPI } from "@/services/api";

const priorityColors: Record<string, string> = {
  P0: "#ef4444",
  P1: "#f97316",
  P2: "#eab308",
  P3: "#94a3b8",
};

const edgeStyles: Record<string, { stroke: string; strokeDasharray?: string; label: string }> = {
  dependency: { stroke: "#1e293b", label: "依赖" },
  weak: { stroke: "#94a3b8", strokeDasharray: "5 5", label: "弱关联" },
  conflict: { stroke: "#ef4444", label: "冲突" },
  complement: { stroke: "#3b82f6", label: "互补" },
  sameGoal: { stroke: "#22c55e", label: "同目标" },
};

function CustomNode({ data }: { data: any }) {
  const size = data.isCore ? 60 : 44;
  return (
    <div className="relative group">
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <div
        className="rounded-full flex items-center justify-center text-primary-foreground font-heading font-bold text-xs shadow-lg cursor-pointer transition-transform hover:scale-110"
        style={{
          width: size,
          height: size,
          backgroundColor: priorityColors[data.priority],
          border: data.isCore ? '3px solid white' : 'none',
          boxShadow: data.isCore ? `0 0 12px ${priorityColors[data.priority]}40` : undefined,
        }}
      >
        {data.score}
      </div>
      <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-medium text-foreground bg-card px-1.5 py-0.5 rounded shadow-sm border">
        {data.label}
      </div>
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
}

const nodeTypes = { custom: CustomNode };

// 布局算法
function applyLayout(nodesData: any[], edgesData: any[], mode: string): Node[] {
  switch (mode) {
    case "goal":
    case "strategy": {
      // 按group分组，每组一列
      const groups = [...new Set(nodesData.map(n => n.group))];
      return nodesData.map((n) => {
        const gi = groups.indexOf(n.group);
        const inGroup = nodesData.filter(x => x.group === n.group);
        const ii = inGroup.findIndex(x => x.id === n.id);
        return {
          id: n.id, type: "custom" as const,
          position: { x: 150 + gi * 250, y: 80 + ii * 120 },
          data: { ...n },
        };
      });
    }
    case "module": {
      // 按module分组
      const modules = [...new Set(nodesData.map(n => n.group || "未分类"))];
      return nodesData.map((n) => {
        const mi = modules.indexOf(n.group || "未分类");
        const inMod = nodesData.filter(x => (x.group || "未分类") === (n.group || "未分类"));
        const ii = inMod.findIndex(x => x.id === n.id);
        return {
          id: n.id, type: "custom" as const,
          position: { x: 120 + mi * 260, y: 60 + ii * 130 },
          data: { ...n },
        };
      });
    }
    case "journey": {
      // 按优先级P0→P3从上到下层级排列
      const priorityOrder = ["P0", "P1", "P2", "P3"];
      return nodesData.map((n) => {
        const pi = priorityOrder.indexOf(n.priority);
        const inPriority = nodesData.filter(x => x.priority === n.priority);
        const ii = inPriority.findIndex(x => x.id === n.id);
        return {
          id: n.id, type: "custom" as const,
          position: { x: 150 + ii * 200, y: 80 + pi * 160 },
          data: { ...n },
        };
      });
    }
    default: // "all" - 默认随机网格
      return nodesData.map((n, i) => ({
        id: n.id, type: "custom" as const,
        position: {
          x: 150 + (i % 4) * 220 + (Math.random() * 40 - 20),
          y: 80 + Math.floor(i / 4) * 180 + (Math.random() * 30 - 15),
        },
        data: { ...n },
      }));
  }
}

export default function KnowledgeGraph() {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [selectedRequirement, setSelectedRequirement] = useState<any>(null);
  const [viewMode, setViewMode] = useState("all");
  
  // 数据状态
  const [graphNodesData, setGraphNodesData] = useState(mockGraphNodes);
  const [graphEdgesData, setGraphEdgesData] = useState(mockGraphEdges);
  const [requirementsData, setRequirementsData] = useState(mockRequirements);
  
  // AI分析状态
  const [analysisItems, setAnalysisItems] = useState<string[]>([
    "• 注册转化主题簇中，\"微信登录\"是最强中心节点",
    "• 会员购买链路与支付重构形成强耦合",
    "• 社区功能与当前主链路关联度低，建议后置",
    "• 有3个需求存在重复建设风险",
  ]);

  // 初始加载数据
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [nodesRes, edgesRes, reqsRes] = await Promise.all([
          graphAPI.getNodes(),
          graphAPI.getEdges(),
          requirementsAPI.getAll(),
        ]);
        if (nodesRes?.length) setGraphNodesData(nodesRes);
        if (edgesRes?.length) setGraphEdgesData(edgesRes);
        if (reqsRes?.length) setRequirementsData(reqsRes);
      } catch (e) {
        console.warn("图谱数据加载失败，使用mock数据", e);
      }
    };
    fetchData();
  }, []);

  // 加载AI分析
  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        const data = await graphAPI.getAnalysis();
        if (data?.analysis) {
          // 将分析文本按行分割为列表
          const items = data.analysis.split('\n').filter(Boolean).map((s: string) => s.startsWith('•') ? s : `• ${s}`);
          if (items.length) setAnalysisItems(items);
        }
      } catch (e) {
        console.warn("图谱分析获取失败", e);
      }
    };
    fetchAnalysis();
  }, []);

  // 节点点击处理
  const handleNodeClick = useCallback(async (_: any, node: any) => {
    setSelectedNode(node.id);
    // 先从本地数据查找
    let req = requirementsData.find(r => r.id === node.id);
    if (!req) {
      try {
        req = await requirementsAPI.getById(node.id);
      } catch (e) {
        console.warn("获取需求详情失败", e);
      }
    }
    setSelectedRequirement(req || null);
  }, [requirementsData]);

  // 根据viewMode计算节点布局
  const initialNodes: Node[] = useMemo(() =>
    applyLayout(graphNodesData, graphEdgesData, viewMode), [graphNodesData, graphEdgesData, viewMode]);

  const initialEdges: Edge[] = useMemo(() =>
    graphEdgesData.map((e, i) => ({
      id: `e-${i}`,
      source: e.source,
      target: e.target,
      label: e.label,
      style: {
        stroke: edgeStyles[e.type].stroke,
        strokeDasharray: edgeStyles[e.type].strokeDasharray,
        strokeWidth: 2,
      },
      markerEnd: { type: MarkerType.ArrowClosed, color: edgeStyles[e.type].stroke },
      labelStyle: { fontSize: 10, fill: edgeStyles[e.type].stroke },
    })), [graphEdgesData]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  
  // 当initialNodes变化时更新nodes
  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);
  
  // 当initialEdges变化时更新edges
  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  // 优先使用selectedRequirement（API数据），否则从本地查找
  const selectedReq = selectedRequirement || (selectedNode ? requirementsData.find(r => r.id === selectedNode) : null);

  const upstreamEdges = selectedNode ? graphEdgesData.filter(e => e.target === selectedNode) : [];
  const downstreamEdges = selectedNode ? graphEdgesData.filter(e => e.source === selectedNode) : [];

  return (
    <div className="flex h-[calc(100vh-3rem)]">
      {/* Left: Controls */}
      <div className="w-56 border-r bg-card p-4 shrink-0 space-y-4">
        <h3 className="font-heading font-semibold text-sm">图谱控制</h3>
        <div>
          <p className="text-xs text-muted-foreground mb-2">视图模式</p>
          <Select value={viewMode} onValueChange={setViewMode}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部需求</SelectItem>
              <SelectItem value="goal">按业务目标</SelectItem>
              <SelectItem value="journey">按用户旅程</SelectItem>
              <SelectItem value="module">按模块</SelectItem>
              <SelectItem value="strategy">按战略主题</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <p className="text-xs text-muted-foreground mb-2">图例</p>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded-full bg-priority-p0" /> P0 必须做
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded-full bg-priority-p1" /> P1 重要
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded-full bg-priority-p2" /> P2 可选
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded-full bg-priority-p3" /> P3 延后
            </div>
          </div>
          <div className="mt-3 space-y-1.5">
            {Object.entries(edgeStyles).map(([key, style]) => (
              <div key={key} className="flex items-center gap-2 text-xs">
                <div className="w-6 h-0.5" style={{
                  backgroundColor: style.stroke,
                  backgroundImage: style.strokeDasharray ? 'none' : undefined,
                  borderTop: style.strokeDasharray ? `2px dashed ${style.stroke}` : undefined,
                  height: style.strokeDasharray ? 0 : 2,
                }} />
                {style.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Middle: Graph Canvas */}
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          onNodeClick={handleNodeClick}
          fitView
          className="bg-background"
        >
          <Background gap={20} size={1} color="hsl(var(--border))" />
          <Controls className="bg-card border shadow-sm" />
          <MiniMap
            nodeColor={(node: any) => priorityColors[node.data?.priority] || '#94a3b8'}
            className="bg-card border shadow-sm"
          />
          <Panel position="top-left" className="bg-card/90 backdrop-blur-sm border rounded-lg p-3 shadow-sm max-w-sm">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h4 className="font-heading font-semibold text-sm">AI 图谱分析</h4>
            </div>
            <ul className="text-xs space-y-1 text-muted-foreground">
              {analysisItems.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </Panel>
        </ReactFlow>
      </div>

      {/* Right: Node Detail */}
      <div className="w-64 border-l bg-card shrink-0 overflow-auto">
        {selectedReq ? (
          <div className="p-4 space-y-4">
            <div>
              <Badge variant="outline" className="mb-2">{selectedReq.priority}</Badge>
              <h3 className="font-heading font-semibold">{selectedReq.name}</h3>
              <p className="text-xs text-muted-foreground mt-1">{selectedReq.description}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">评分</p>
              <span className="text-3xl font-heading font-bold text-primary">{selectedReq.totalScore}</span>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-2">上游依赖 ({upstreamEdges.length})</p>
              {upstreamEdges.map((e, i) => (
                <Badge key={i} variant="secondary" className="mr-1 mb-1 text-xs">
                  {graphNodesData.find(n => n.id === e.source)?.label}
                </Badge>
              ))}
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-2">推动下游 ({downstreamEdges.length})</p>
              {downstreamEdges.map((e, i) => (
                <Badge key={i} variant="secondary" className="mr-1 mb-1 text-xs">
                  {graphNodesData.find(n => n.id === e.target)?.label}
                </Badge>
              ))}
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">所属主题簇</p>
              <Badge>{graphNodesData.find(n => n.id === selectedReq.id)?.group}</Badge>
            </div>
            <Card className="border-primary/20">
              <CardContent className="p-3">
                <div className="flex items-center gap-1 mb-1">
                  <Sparkles className="h-3 w-3 text-primary" />
                  <span className="text-xs font-medium">AI 建议</span>
                </div>
                <p className="text-xs text-muted-foreground">{selectedReq.aiExplanation}</p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="p-4 text-center text-sm text-muted-foreground mt-20">
            <Eye className="h-8 w-8 mx-auto mb-2 opacity-30" />
            点击节点查看详情
          </div>
        )}
      </div>
    </div>
  );
}
