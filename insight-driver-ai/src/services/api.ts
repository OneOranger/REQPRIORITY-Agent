const API_BASE = '/api';

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      ...options,
    });
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    return response.json();
  } catch (error) {
    console.error(`API call failed: ${endpoint}`, error);
    throw error;
  }
}

export const requirementsAPI = {
  getAll: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return fetchAPI<any[]>(`/requirements/${query}`);
  },
  getById: (id: string) => fetchAPI<any>(`/requirements/${id}`),
  create: (data: any) => fetchAPI<any>('/requirements/', { method: 'POST', body: JSON.stringify(data) }),
  parse: (formData: FormData) => fetch(`${API_BASE}/requirements/parse`, { method: 'POST', body: formData }).then(r => r.json()),
  update: (id: string, data: any) => fetchAPI<any>(`/requirements/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => fetchAPI<void>(`/requirements/${id}`, { method: 'DELETE' }),
  reanalyze: (id: string) => fetchAPI<any>(`/requirements/${id}/reanalyze`, { method: 'POST' }),
  updateStatus: (id: string, status: string) => 
    fetchAPI<any>(`/requirements/${id}/status`, { 
      method: 'PUT', 
      body: JSON.stringify({ status }) 
    }),
};

export const dashboardAPI = {
  getSummary: () => fetchAPI<any>('/dashboard/summary'),
  getTopRequirements: () => fetchAPI<any[]>('/dashboard/top-requirements'),
  getAiSummary: () => fetchAPI<any>('/dashboard/ai-summary'),
  getStats: () => fetchAPI<any>('/dashboard/stats'),
  getTrends: () => fetchAPI<any>('/dashboard/trends'),
  getRecentActivities: () => fetchAPI<any[]>('/dashboard/recent-activities'),
};

export const scoringAPI = {
  getDimensions: () => fetchAPI<any[]>('/scoring/dimensions'),
  updateDimensions: (dims: any[]) => fetchAPI<any>('/scoring/dimensions', { method: 'PUT', body: JSON.stringify(dims) }),
  score: (data: any) => fetchAPI<any>('/scoring/score', { method: 'POST', body: JSON.stringify(data) }),
  getResult: (reqId: string) => fetchAPI<any>(`/scoring/${reqId}/result`),
  aiScore: (reqId: string) => fetchAPI<any>(`/scoring/${reqId}/ai-score`, { method: 'POST' }),
  saveScores: (reqId: string, scores: any) => fetchAPI<any>(`/scoring/${reqId}/scores`, { method: 'PUT', body: JSON.stringify(scores) }),
};

export const graphAPI = {
  getNodes: () => fetchAPI<any[]>('/graph/nodes'),
  getEdges: () => fetchAPI<any[]>('/graph/edges'),
  getGraph: () => fetchAPI<any>('/graph/'),
  getImpact: (reqId: string) => fetchAPI<any>(`/graph/impact/${reqId}`),
  analyze: () => fetchAPI<any>('/graph/analyze', { method: 'POST' }),
  getAnalysis: () => fetchAPI<any>('/graph/analysis'),
};

export const priorityAPI = {
  getRecommendations: () => fetchAPI<any>('/priority/recommendations'),
  getMatrix: () => fetchAPI<any>('/priority/matrix'),
  update: (reqId: string, priority: string) => fetchAPI<any>(`/priority/${reqId}`, { method: 'PUT', body: JSON.stringify({ priority }) }),
  simulate: (scenario: string) => fetchAPI<any>('/priority/simulate', { method: 'POST', body: JSON.stringify({ scenario }) }),
  recalculate: (params: any) => fetchAPI<any>('/priority/recalculate', { method: 'POST', body: JSON.stringify(params) }),
  batchUpdate: (items: any[]) => fetchAPI<any>('/priority/batch-update', { method: 'POST', body: JSON.stringify({ items }) }),
};

export const roadmapAPI = {
  get: () => fetchAPI<any>('/roadmap/'),
  update: (schedules: any[]) => fetchAPI<any>('/roadmap/', { method: 'PUT', body: JSON.stringify({ schedules }) }),
  schedule: (reqId: string, quarter: string) => fetchAPI<any>('/roadmap/schedule', { method: 'POST', body: JSON.stringify({ reqId, quarter }) }),
};

export const risksAPI = {
  getOverview: () => fetchAPI<any>('/risks/overview'),
  getHighRisk: () => fetchAPI<any[]>('/risks/high-risk'),
  getDistribution: () => fetchAPI<any[]>('/risks/distribution'),
  getCategories: () => fetchAPI<any[]>('/risks/categories'),
  getCards: () => fetchAPI<any[]>('/risks/cards'),
  getAnalysis: () => fetchAPI<any>('/risks/analysis'),
};

export const reportsAPI = {
  getAll: () => fetchAPI<any[]>('/reports/'),
  getDecision: () => fetchAPI<any>('/reports/decision'),
  generate: (type: string) => fetchAPI<any>('/reports/generate', { method: 'POST', body: JSON.stringify({ type }) }),
  getById: (reportId: string) => fetchAPI<any>(`/reports/${reportId}`),
  export: (format: string) => fetch(`${API_BASE}/reports/export`, { 
    method: 'POST', 
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ format }) 
  }),
};

export const modulesAPI = {
  getAll: () => fetchAPI<string[]>('/modules/'),
  create: (name: string) => fetchAPI<any>('/modules/', { method: 'POST', body: JSON.stringify({ name }) }),
  delete: (name: string) => fetchAPI<any>(`/modules/${encodeURIComponent(name)}`, { method: 'DELETE' }),
};

// AI调用链路追踪类型定义
export interface TraceStep {
  stepId: string;
  agentName: string;
  action: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  inputSummary: string;
  outputSummary: string;
  durationMs: number;
  llmCalled: boolean;
  llmModel: string;
  llmPromptPreview: string;
  llmResponsePreview: string;
  llmPromptFull: string;
  llmResponseFull: string;
  usedFallback: boolean;
  tokenCount: number;
  error: string;
}

export interface Trace {
  traceId: string;
  trigger: string;
  triggerDetail: string;
  status: 'running' | 'completed' | 'failed';
  steps: TraceStep[];
  startTime: string;
  endTime: string;
  totalDurationMs: number;
}

export const traceAPI = {
  getTraces: (limit?: number, trigger?: string) => {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (trigger) params.append('trigger', trigger);
    const query = params.toString() ? `?${params.toString()}` : '';
    return fetchAPI<{ success: boolean; data: Trace[] }>(`/ai/traces${query}`);
  },
  getTrace: (traceId: string) => fetchAPI<{ success: boolean; data: Trace }>(`/ai/traces/${traceId}`),
  clearTraces: () => fetchAPI<{ success: boolean }>(`/ai/traces`, { method: 'DELETE' }),
};
