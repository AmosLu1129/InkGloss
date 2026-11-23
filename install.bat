@echo off
chcp 65001 >nul
cd /d %~dp0
set PYTHONIOENCODING=utf-8

echo [1/5] 创建虚拟环境…
py -3.14 -m venv .venv 2>nul || python -m venv .venv

echo [2/5] 安装 PyTorch（CUDA 版，下载约 3GB，耐心等待）…
".venv\Scripts\python.exe" -m pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cu126
if errorlevel 1 (
  echo GPU 版安装失败，改用 CPU 版 torch…
  ".venv\Scripts\python.exe" -m pip install torch
)

echo [3/5] 安装其余依赖…
".venv\Scripts\python.exe" -m pip install -r requirements.txt
if errorlevel 1 (
  echo 默认源较慢，尝试清华镜像…
  ".venv\Scripts\python.exe" -m pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
)

echo [4/5] 下载翻译模型（约 300MB，只需一次）…
".venv\Scripts\python.exe" scripts\download_model.py

echo [5/5] 安装离线词典 ECDICT（约 207MB，只需一次）…
".venv\Scripts\python.exe" scripts\download_dict.py

echo.
echo 安装完成！双击「启动阅读器.bat」即可使用。
pause
