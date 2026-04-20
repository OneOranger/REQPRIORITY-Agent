import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import Dashboard from "./pages/Dashboard";
import RequirementsPool from "./pages/RequirementsPool";
import ScoringCenter from "./pages/ScoringCenter";
import KnowledgeGraphPage from "./pages/KnowledgeGraphPage";
import PriorityDecision from "./pages/PriorityDecision";
import Roadmap from "./pages/Roadmap";
import RiskDashboard from "./pages/RiskDashboard";
import ReportPage from "./pages/ReportPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/requirements" element={<RequirementsPool />} />
            <Route path="/scoring" element={<ScoringCenter />} />
            <Route path="/graph" element={<KnowledgeGraphPage />} />
            <Route path="/priority" element={<PriorityDecision />} />
            <Route path="/roadmap" element={<Roadmap />} />
            <Route path="/risks" element={<RiskDashboard />} />
            <Route path="/report" element={<ReportPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
