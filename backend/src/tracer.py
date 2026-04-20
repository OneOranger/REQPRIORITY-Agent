"""
AI调用链路追踪器
记录每次AI处理的完整调用链（哪些Agent被调用、顺序、输入输出摘要、耗时）
"""
import time
import uuid
from typing import Optional
from dataclasses import dataclass, field, asdict
from collections import deque
from datetime import datetime


@dataclass
class TraceStep:
    """单个追踪步骤"""
    step_id: str
    agent_name: str  # "ParserAgent", "ScorerAgent", etc
    action: str  # "parse_requirement", "score_requirement", etc
    status: str = "pending"  # pending / running / completed / failed
    input_summary: str = ""  # 输入摘要
    output_summary: str = ""  # 输出摘要
    start_time: float = 0
    end_time: float = 0
    duration_ms: float = 0
    llm_called: bool = False  # 是否调用了LLM
    llm_model: str = ""
    llm_prompt_preview: str = ""  # 提示词预览（截取前200字）
    llm_response_preview: str = ""  # 响应预览（截取前200字）
    llm_prompt_full: str = ""  # 完整提示词
    llm_response_full: str = ""  # 完整响应
    used_fallback: bool = False  # 是否使用了规则回退
    token_count: int = 0  # token消耗
    error: str = ""


@dataclass  
class Trace:
    """完整的调用链路"""
    trace_id: str
    trigger: str  # "需求解析", "AI评分", "优先级模拟", etc
    trigger_detail: str = ""  # 更详细的触发描述
    status: str = "running"  # running / completed / failed
    steps: list = field(default_factory=list)
    start_time: str = ""
    end_time: str = ""
    total_duration_ms: float = 0
    
    def to_dict(self):
        return {
            "traceId": self.trace_id,
            "trigger": self.trigger,
            "triggerDetail": self.trigger_detail,
            "status": self.status,
            "steps": [
                {
                    "stepId": s.step_id,
                    "agentName": s.agent_name,
                    "action": s.action,
                    "status": s.status,
                    "inputSummary": s.input_summary,
                    "outputSummary": s.output_summary,
                    "durationMs": s.duration_ms,
                    "llmCalled": s.llm_called,
                    "llmModel": s.llm_model,
                    "llmPromptPreview": s.llm_prompt_preview,
                    "llmResponsePreview": s.llm_response_preview,
                    "llmPromptFull": s.llm_prompt_full,
                    "llmResponseFull": s.llm_response_full,
                    "usedFallback": s.used_fallback,
                    "tokenCount": s.token_count,
                    "error": s.error,
                } for s in self.steps
            ],
            "startTime": self.start_time,
            "endTime": self.end_time,
            "totalDurationMs": self.total_duration_ms,
        }


class TraceManager:
    """链路追踪管理器"""
    
    def __init__(self, max_traces: int = 50):
        self.traces: deque = deque(maxlen=max_traces)
        self._current_traces: dict = {}  # trace_id -> Trace
    
    def start_trace(self, trigger: str, detail: str = "") -> str:
        """开始一个新的追踪"""
        trace_id = str(uuid.uuid4())[:8]
        trace = Trace(
            trace_id=trace_id,
            trigger=trigger,
            trigger_detail=detail,
            start_time=datetime.now().isoformat(),
        )
        self._current_traces[trace_id] = trace
        return trace_id
    
    def add_step(self, trace_id: str, agent_name: str, action: str, input_summary: str = "") -> str:
        """添加一个步骤"""
        trace = self._current_traces.get(trace_id)
        if not trace:
            return ""
        step_id = f"{trace_id}-{len(trace.steps)+1}"
        step = TraceStep(
            step_id=step_id,
            agent_name=agent_name,
            action=action,
            status="running",
            input_summary=input_summary[:200],
            start_time=time.time(),
        )
        trace.steps.append(step)
        return step_id
    
    def complete_step(self, trace_id: str, step_id: str, 
                      output_summary: str = "", llm_called: bool = False,
                      llm_model: str = "", llm_prompt_preview: str = "",
                      llm_response_preview: str = "", error: str = "",
                      llm_prompt_full: str = "", llm_response_full: str = "",
                      used_fallback: bool = False, token_count: int = 0):
        """完成一个步骤"""
        trace = self._current_traces.get(trace_id)
        if not trace:
            return
        for step in trace.steps:
            if step.step_id == step_id:
                step.end_time = time.time()
                step.duration_ms = round((step.end_time - step.start_time) * 1000, 1)
                step.status = "failed" if error else "completed"
                step.output_summary = output_summary[:200]
                step.llm_called = llm_called
                step.llm_model = llm_model
                step.llm_prompt_preview = llm_prompt_preview[:200]
                step.llm_response_preview = llm_response_preview[:200]
                step.llm_prompt_full = llm_prompt_full
                step.llm_response_full = llm_response_full
                step.used_fallback = used_fallback
                step.token_count = token_count
                step.error = error
                break
    
    def end_trace(self, trace_id: str, status: str = "completed"):
        """结束追踪"""
        trace = self._current_traces.pop(trace_id, None)
        if trace:
            trace.status = status
            trace.end_time = datetime.now().isoformat()
            if trace.steps:
                first_start = min(s.start_time for s in trace.steps if s.start_time)
                last_end = max(s.end_time for s in trace.steps if s.end_time)
                trace.total_duration_ms = round((last_end - first_start) * 1000, 1) if first_start and last_end else 0
            self.traces.appendleft(trace)
    
    def get_recent_traces(self, limit: int = 20) -> list:
        """获取最近的追踪记录"""
        return [t.to_dict() for t in list(self.traces)[:limit]]
    
    def get_trace(self, trace_id: str) -> Optional[dict]:
        """获取特定追踪"""
        # 先查活跃的
        if trace_id in self._current_traces:
            return self._current_traces[trace_id].to_dict()
        # 再查已完成的
        for t in self.traces:
            if t.trace_id == trace_id:
                return t.to_dict()
        return None
    
    def clear_traces(self):
        """清空所有追踪记录"""
        self.traces.clear()
        self._current_traces.clear()
    
    def get_traces_by_type(self, trigger: str, limit: int = 20) -> list:
        """按触发类型筛选追踪记录"""
        filtered = [t for t in self.traces if t.trigger == trigger]
        return [t.to_dict() for t in filtered[:limit]]


# 全局单例
trace_manager = TraceManager()
