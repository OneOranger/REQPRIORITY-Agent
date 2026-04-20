"""
统一提示词管理器
- 从 prompts/templates/ 目录加载 .md 模板文件
- 支持变量注入（使用 Python str.format 或 string.Template）
- 提供 get_system_prompt(agent_name) 和 get_task_prompt(agent_name, task, **ctx) 接口
"""
from pathlib import Path
from string import Template
import json

class PromptManager:
    def __init__(self):
        self.template_dir = Path(__file__).parent / "templates"
    
    def load(self, template_name: str, **variables) -> str:
        """加载模板文件并注入变量"""
        template_path = self.template_dir / f"{template_name}.md"
        if not template_path.exists():
            raise FileNotFoundError(f"Template not found: {template_name}")
        content = template_path.read_text(encoding="utf-8")
        if variables:
            # 使用安全的 Template 替换
            tmpl = Template(content)
            return tmpl.safe_substitute(**variables)
        return content
    
    def get_system_prompt(self, agent_name: str) -> str:
        """获取Agent系统提示词"""
        return self.load(f"{agent_name}_system")
    
    def get_task_prompt(self, agent_name: str, task: str, **ctx) -> str:
        """获取Agent任务提示词"""
        return self.load(f"{agent_name}_{task}", **ctx)

# 全局单例
prompt_manager = PromptManager()
