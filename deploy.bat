@echo off
chcp 65001 >nul
echo ========================================
echo   自动部署到 GitHub
echo ========================================
echo.

cd /d %~dp0

echo 正在检查 git 状态...
git status >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 这不是一个 git 仓库！
    echo.
    echo 请先运行以下命令初始化仓库：
    echo   git init
    echo   git remote add origin https://github.com/gaotiantian900914/map-app.git
    echo.
    pause
    exit /b 1
)

echo [1/4] 添加所有更改...
git add .
echo ✓ 完成

echo.
echo [2/4] 提交更改...
git commit -m "修复理想充电站格式，完全对标小鹏充电站"
echo ✓ 完成

echo.
echo [3/4] 推送到 GitHub...
git push
echo ✓ 完成

echo.
echo ========================================
echo   部署完成！
echo ========================================
echo.
echo 请访问：https://gaotiantian900914.github.io/map-app/
echo 按 Ctrl+Shift+R 强制刷新查看更新
echo.
pause
