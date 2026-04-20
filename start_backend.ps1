# 需求优先级Agent系统 - 快速启动脚本
# 使用方式: .\start_backend.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  需求优先级Agent系统 - 后端启动" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查虚拟环境
if (-Not (Test-Path ".venv\Scripts\Activate.ps1")) {
    Write-Host "错误: 未找到虚拟环境" -ForegroundColor Red
    Write-Host "请先运行: python -m venv .venv" -ForegroundColor Yellow
    exit 1
}

# 激活虚拟环境
Write-Host "正在激活虚拟环境..." -ForegroundColor Yellow
.\.venv\Scripts\Activate.ps1

# 进入后端目录
Set-Location backend

# 检查依赖
Write-Host "检查依赖..." -ForegroundColor Yellow
if (-Not (Test-Path "src\main.py")) {
    Write-Host "错误: 未找到后端代码" -ForegroundColor Red
    exit 1
}

# 启动服务
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  启动后端服务..." -ForegroundColor Green
Write-Host "  API地址: http://localhost:8000" -ForegroundColor Green
Write-Host "  文档地址: http://localhost:8000/docs" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

Set-Location src
python main.py
