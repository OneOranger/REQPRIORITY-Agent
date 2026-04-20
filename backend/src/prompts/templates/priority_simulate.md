# 优先级模拟场景

## 当前需求列表
$requirements_list

## 模拟场景
$scenario

## 当前约束条件
- 业务阶段: $business_stage
- 目标策略: $target_strategy  
- 周期: $period
- 团队规模: $team_size
- 预算等级: $budget_level

## 要求
基于以上场景假设，重新评估需求优先级，返回JSON格式：
```json
{
  "adjustedRequirements": [
    {"id": "REQ-XXX", "originalPriority": "P1", "newPriority": "P0", "reason": "原因"},
    ...
  ],
  "summary": "场景分析摘要",
  "risks": ["风险1", "风险2"],
  "recommendations": ["建议1", "建议2"]
}
```
