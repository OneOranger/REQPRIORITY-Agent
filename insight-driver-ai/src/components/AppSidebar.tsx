import { useState, useEffect } from "react";
import {
  LayoutDashboard, Database, Target, Network, ArrowUpDown,
  Map, AlertTriangle, FileText, Sparkles, Activity
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AiTracePanel } from "@/components/AiTracePanel";
import { dashboardAPI } from "@/services/api";

const navItems = [
  { title: "总览驾驶舱", url: "/", icon: LayoutDashboard },
  { title: "需求池", url: "/requirements", icon: Database },
  { title: "评分中心", url: "/scoring", icon: Target },
  { title: "知识图谱", url: "/graph", icon: Network },
  { title: "优先级决策", url: "/priority", icon: ArrowUpDown },
  { title: "路线图", url: "/roadmap", icon: Map },
  { title: "风险台", url: "/risks", icon: AlertTriangle },
  { title: "报告输出", url: "/report", icon: FileText },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const [traceSheetOpen, setTraceSheetOpen] = useState(false);
  const [requirementCount, setRequirementCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // 获取需求数量
  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const summary = await dashboardAPI.getSummary();
        setRequirementCount(summary.totalCount || 0);
      } catch (error) {
        console.warn("获取需求数量失败，使用默认值", error);
        setRequirementCount(0);
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, []);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="ai-gradient rounded-lg p-1.5">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div>
              <h2 className="font-heading text-sm font-bold text-foreground">PriorityAI</h2>
              <p className="text-[10px] text-muted-foreground">智能需求管家</p>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>导航</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="hover:bg-accent"
                      activeClassName="bg-primary/10 text-primary font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        {!collapsed && (
          <div 
            className="rounded-lg bg-primary/5 p-3 text-xs text-muted-foreground cursor-pointer hover:bg-primary/10 transition-colors"
            onClick={() => setTraceSheetOpen(true)}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-primary" />
                <span className="font-medium text-foreground">AI 引擎运行中</span>
              </div>
              <Activity className="h-3 w-3 text-primary" />
            </div>
            <p>已分析 {loading ? "..." : requirementCount} 个需求 · 点击查看调用记录</p>
          </div>
        )}
      </SidebarFooter>
      
      {/* AI调用记录Sheet */}
      <Sheet open={traceSheetOpen} onOpenChange={setTraceSheetOpen}>
        <SheetContent className="w-[420px] sm:w-[540px] p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>AI调用记录</SheetTitle>
          </SheetHeader>
          <AiTracePanel showRecent onClose={() => setTraceSheetOpen(false)} />
        </SheetContent>
      </Sheet>
    </Sidebar>
  );
}
