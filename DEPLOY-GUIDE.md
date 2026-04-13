# 部署到 GitHub Pages 指南

## 问题说明
本地代码已经修复，理想充电站的格式已经完全对标小鹏充电站：
- **命名格式**：理想充电站 宝安壹方城（与小鹏格式一致）
- **地址格式**：宝安区新安街道新湖路 99 号（与小鹏格式一致）

## 部署步骤

### 方法 1：使用 Git 命令行（推荐）

1. **打开命令行工具**
   ```bash
   cd E:\HFmast\map-app
   ```

2. **检查 git 状态**
   ```bash
   git status
   ```

3. **添加所有更改**
   ```bash
   git add .
   ```

4. **提交更改**
   ```bash
   git commit -m "修复理想充电站格式，完全对标小鹏充电站"
   ```

5. **推送到 GitHub**
   ```bash
   git push
   ```

6. **等待 GitHub Pages 更新**
   - 访问 https://gaotiantian900914.github.io/map-app/
   - 按 `Ctrl + Shift + R` 强制刷新
   - 测试理想充电站的格式

### 方法 2：使用 GitHub Desktop

1. **打开 GitHub Desktop**
2. **添加项目文件夹**：`E:\HFmast\map-app`
3. **查看更改**：应该能看到 app.js、index.html、add-marker.html 的更改
4. **填写摘要**：修复理想充电站格式，完全对标小鹏充电站
5. **点击 Commit to main**
6. **点击 Push origin**
7. **等待更新**

### 方法 3：手动上传到 GitHub

1. **访问 GitHub 仓库**
   - https://github.com/gaotiantian900914/map-app

2. **上传文件**
   - 点击 "Add file" → "Upload files"
   - 拖拽以下文件到上传区域：
     - app.js
     - index.html
     - add-marker.html
     - reload-add-marker.html（可选）
     - FINAL-FIX.html（可选）

3. **填写提交信息**
   ```
   修复理想充电站格式，完全对标小鹏充电站
   
   修改内容：
   - 理想充电站命名格式改为：理想充电站 XXX（与小鹏一致）
   - 理想充电站地址格式改为：详细地址（与小鹏一致）
   - 添加防缓存 meta 标签
   - 优化批量添加功能
   ```

4. **点击 "Commit changes"**

## 验证更新

### 1. 访问在线版本
https://gaotiantian900914.github.io/map-app/

### 2. 强制刷新浏览器
按 `Ctrl + Shift + R` 或 `Ctrl + F5`

### 3. 测试理想充电站
- 打开 "批量添加理想充电站"
- 点击任意理想充电站标记
- 应该显示：
  ```
  理想充电站 宝安壹方城
  [理想充电站]
  宝安区新安街道新湖路 99 号
  位置：宝安区新安街道新湖路 99 号
  坐标：22.553141, 113.888684
  ```

### 4. 对比小鹏充电站
- 打开 "批量添加小鹏充电站"
- 点击任意小鹏充电站标记
- 应该显示：
  ```
  小鹏充电站 宝安壹方城
  [小鹏充电站]
  宝安区新安街道新湖路 99 号
  位置：宝安区新安街道新湖路 99 号
  坐标：22.552141, 113.887684
  ```

## 修改的文件清单

1. **app.js**
   - 理想充电站数据格式修改（name 和 address 字段）
   - 坐标偏移量调整
   - 添加坐标验证
   - 优化信息窗口显示逻辑

2. **index.html**
   - 添加防缓存 meta 标签

3. **add-marker.html**
   - 添加防缓存 meta 标签
   - 动态加载 app.js（带时间戳）

4. **新增工具文件**（可选部署）
   - reload-add-marker.html - 自动清除缓存工具
   - FINAL-FIX.html - 一键修复工具
   - fix-ideal-data.html - 数据修复工具

## 常见问题

### Q: GitHub Pages 更新延迟？
A: GitHub Pages 通常需要 1-2 分钟更新，最多可能需要 10 分钟。

### Q: 更新后还是旧格式？
A: 浏览器缓存问题，按 `Ctrl + Shift + R` 强制刷新，或清除浏览器缓存。

### Q: 如何确认 GitHub 上的代码是最新的？
A: 访问 https://github.com/gaotiantian900914/map-app/blob/main/app.js
   查看理想充电站数据部分，确认格式正确。

## 联系支持

如果部署过程中遇到问题，请检查：
1. Git 仓库配置是否正确
2. GitHub Pages 是否启用
3. 分支是否正确（应该是 main 或 master 分支）
