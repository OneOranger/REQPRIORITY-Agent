"""
统一日志配置
- 控制台输出（彩色格式化）
- 文件输出（logs/app.log）
- 按模块分级记录
"""
import logging
import os
from pathlib import Path
from datetime import datetime


def setup_logger(name: str = None, level=logging.DEBUG) -> logging.Logger:
    """创建模块级别的logger"""
    logger = logging.getLogger(name or "reqpriority")
    
    if not logger.handlers:
        logger.setLevel(level)
        
        # 控制台Handler
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.DEBUG)
        console_fmt = logging.Formatter(
            '%(asctime)s | %(levelname)-7s | %(name)-25s | %(message)s',
            datefmt='%H:%M:%S'
        )
        console_handler.setFormatter(console_fmt)
        logger.addHandler(console_handler)
        
        # 文件Handler
        log_dir = Path(__file__).parent / "logs"
        log_dir.mkdir(exist_ok=True)
        file_handler = logging.FileHandler(
            log_dir / "app.log", encoding="utf-8", mode="a"
        )
        file_handler.setLevel(logging.DEBUG)
        file_fmt = logging.Formatter(
            '%(asctime)s | %(levelname)-7s | %(name)-25s | %(funcName)s:%(lineno)d | %(message)s'
        )
        file_handler.setFormatter(file_fmt)
        logger.addHandler(file_handler)
    
    return logger
