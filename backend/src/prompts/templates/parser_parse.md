# 需求解析任务

## 用户输入
需求标题: $title
需求价值描述: $value
所属模块: $module
目标用户: $target_user
关键指标: $goal

$document_content

## 要求
请分析以上需求信息，提取结构化数据并返回JSON格式：

```json
{
  "name": "需求名称",
  "description": "详细描述",
  "module": "所属模块",
  "targetUser": "目标用户",
  "goal": "业务目标",
  "impactPath": "步骤1→步骤2→步骤3",
  "aiSuggestion": "AI建议",
  "aiExplanation": "AI详细分析"
}
```

如果提供了文档内容，请综合文档和输入信息进行分析。
