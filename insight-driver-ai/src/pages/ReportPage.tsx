import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FileText, Download, Sparkles, CheckCircle2, AlertTriangle, XCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { requirements as mockRequirements } from "@/data/mockData";
import { reportsAPI } from "@/services/api";
import { toast } from "sonner";

interface ReportData {
  top10: any[];
  coreNodes: any[];
  notRecommended: any[];
  decisionBasis: string[];
  riskWarnings: string[];
  summary?: {
    totalRequirements: number;
    p0Count: number;
    highRiskCount: number;
    avgScore: number;
  };
}

// Mock回退数据
const mockTop10 = [...mockRequirements].sort((a, b) => b.totalScore - a.totalScore).slice(0, 10);
const mockCoreNodes = mockRequirements.filter(r => r.isGraphCore);
const mockNotRecommended = mockRequirements.filter(r => r.totalScore < 50);

const fallbackData: ReportData = {
  top10: mockTop10,
  coreNodes: mockCoreNodes,
  notRecommended: mockNotRecommended,
  decisionBasis: [
    "当前策略为'增长优先'，入口转化链路需求整体前移",
    "支付链路修复因直接影响GMV被提升至P0",
    "埋点体系作为多个需求的数据基础，建议优先完成",
    "3个需求因依赖链未满足被调整至后续季度",
  ],
  riskWarnings: [
    "会员体系与支付重构存在时序冲突，需协调排期",
    "社区功能如强行排入本期，将挤占增长链路资源",
    "积分商城依赖链过长，建议2027年视基础设施完成度决定",
    "3个需求的评分依赖数据验证，建议优先完善埋点体系",
  ],
};

// 格式到文件扩展名映射
const FORMAT_EXT_MAP: Record<string, string> = {
  pdf: "pdf",
  pptx: "pptx",
  ppt: "pptx",
  markdown: "md",
};

export default function ReportPage() {
  const [reportData, setReportData] = useState<ReportData>(fallbackData);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);

  // 获取决策报告数据
  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true);
      try {
        const data = await reportsAPI.getDecision();
        if (data) {
          setReportData({
            top10: data.top10 || fallbackData.top10,
            coreNodes: data.coreNodes || fallbackData.coreNodes,
            notRecommended: data.notRecommended || fallbackData.notRecommended,
            decisionBasis: data.decisionBasis || fallbackData.decisionBasis,
            riskWarnings: data.riskWarnings || fallbackData.riskWarnings,
            summary: data.summary,
          });
        }
      } catch (error) {
        console.warn("获取决策报告失败，使用mock数据", error);
        toast.warning("无法获取报告数据，使用本地数据");
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, []);

  // 导出报告
  const handleExport = async (format: string) => {
    setExporting(format);
    try {
      const response = await reportsAPI.export(format);
      
      // 检查响应状态
      if (!response.ok) {
        // 尝试解析错误信息
        try {
          const errorData = await response.json();
          toast.error(errorData.message || "导出失败");
        } catch {
          toast.error(`导出失败: ${response.status} ${response.statusText}`);
        }
        return;
      }
      
      // 获取文件扩展名
      const ext = FORMAT_EXT_MAP[format] || format;
      
      // 文件下载
      const blob = await response.blob();
      
      // 检查 blob 是否有效
      if (blob.size === 0) {
        toast.error("导出失败：文件内容为空");
        return;
      }
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `决策报告.${ext}`;
      document.body.appendChild(link); // 确保链接在 DOM 中
      link.click();
      document.body.removeChild(link); // 清理
      URL.revokeObjectURL(url);
      
      const formatName = format === 'pptx' ? 'PPT' : format.toUpperCase();
      toast.success(`${formatName} 导出成功`);
    } catch (error) {
      console.error("导出失败", error);
      toast.error("导出失败，请检查后端服务");
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-xl font-bold flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          决策报告
          {reportData.summary && (
            <span className="text-sm text-muted-foreground font-normal">
              {reportData.summary.totalRequirements}个需求 · 平均分{reportData.summary.avgScore}
            </span>
          )}
        </h2>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleExport("pdf")}
            disabled={exporting !== null}
          >
            {exporting === "pdf" ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Download className="h-3 w-3 mr-1" />}
            PDF
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleExport("pptx")}
            disabled={exporting !== null}
          >
            {exporting === "pptx" ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Download className="h-3 w-3 mr-1" />}
            PPT
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleExport("markdown")}
            disabled={exporting !== null}
          >
            {exporting === "markdown" ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Download className="h-3 w-3 mr-1" />}
            Markdown
          </Button>
        </div>
      </div>

      {loading && (
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          加载决策报告中...
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-heading flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            本轮优先级 Top 10
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {reportData.top10.map((req, i) => (
              <div key={req.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                <span className="text-sm font-heading font-bold text-muted-foreground w-6">{i + 1}</span>
                <span className="flex-1 text-sm font-medium">{req.name}</span>
                <Badge variant="outline" className="text-xs">{req.priority}</Badge>
                <span className="text-sm font-heading font-bold text-primary">{req.totalScore}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-heading">决策依据摘要</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          {reportData.decisionBasis.map((basis, i) => (
            <p key={i}>• {basis}</p>
          ))}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-heading flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-score-high" />
              图谱核心节点
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {reportData.coreNodes.map(r => (
                <div key={r.id} className="flex items-center gap-2 text-sm py-1">
                  <Badge variant="secondary" className="text-[10px]">{r.priority}</Badge>
                  <span>{r.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-heading flex items-center gap-2">
              <XCircle className="h-4 w-4 text-risk-high" />
              不建议做的需求
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {reportData.notRecommended.map(r => (
                <div key={r.id} className="text-sm py-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{r.name}</span>
                    <Badge variant="outline" className="text-[10px]">{r.priority}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{r.aiExplanation}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-heading flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-risk-medium" />
            风险提醒
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2 text-muted-foreground">
          {reportData.riskWarnings.map((warn, i) => (
            <p key={i}>• {warn}</p>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
