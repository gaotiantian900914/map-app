# 地图标注工具 - 模块化重构版

## 📁 项目架构

### 新的模块化结构

```
map-app/
├── index.html              # 主页面
├── add-marker.html         # 新增标注页面
├── src/                    # 源代码目录（新）
│   ├── utils.js           # 工具函数模块
│   ├── storage-service.js # 存储服务模块
│   ├── category-service.js # 分类服务模块
│   ├── marker-service.js  # 标记服务模块
│   ├── map-service.js     # 地图服务模块
│   ├── search-service.js  # 搜索服务模块
│   ├── ui-service.js      # UI 服务模块
│   └── main.js            # 主入口文件
└── app.js                  # 旧版主文件（保留备份）
```

## 🏗️ 架构说明

### 模块化设计

#### 1. **工具模块 (utils.js)**
- 提供通用工具函数
- 颜色映射、坐标验证、距离计算等
- 数据导出功能

#### 2. **存储服务 (storage-service.js)**
- 管理数据持久化
- 支持 localStorage 和腾讯云开发
- 自动同步和备份

#### 3. **分类服务 (category-service.js)**
- 管理地图标注分类
- 提供分类的增删改查
- 默认 7 种分类

#### 4. **标记服务 (marker-service.js)**
- 管理地图标注的增删改查
- 批量操作支持
- 数据验证和过滤

#### 5. **地图服务 (map-service.js)**
- 管理高德地图初始化
- 标记显示和管理
- 地图视图控制

#### 6. **搜索服务 (search-service.js)**
- 地点搜索功能
- 附近标记搜索
- 距离计算

#### 7. **UI 服务 (ui-service.js)**
- 用户界面操作
- Toast 提示消息
- 列表更新和 Tab 切换

#### 8. **主入口 (main.js)**
- 统一初始化流程
- 模块协调和调度
- 全局函数暴露

## 🔄 迁移指南

### 如何使用新架构

1. **在 index.html 中引入新模块**：

```html
<!-- 替换原来的 app.js -->
<script type="module" src="src/main.js"></script>
```

2. **确保脚本加载顺序**：

```html
<!-- 1. 云开发 SDK -->
<script src="https://imgcache.qq.com/qcloud/tcbjs/1.11.1/tcb.js"></script>

<!-- 2. 高德地图 API -->
<script src="https://webapi.amap.com/maps?v=1.4.15&key=45461b14046c9bda310ce713420c84d4"></script>

<!-- 3. 主入口模块 -->
<script type="module" src="src/main.js"></script>
```

3. **全局函数已自动暴露**：
   - `window.searchPlace()` - 搜索地点
   - `window.locateMyPosition()` - 定位
   - `window.searchNearbyMarkers()` - 搜索附近标记
   - `window.addMarker()` - 添加标记
   - `window.deleteMarker()` - 删除标记
   - `window.focusOnMarker()` - 聚焦标记
   - `window.fitMapToMarkers()` - 调整视图
   - `window.exportToCSV()` - 导出 CSV
   - `window.switchTab()` - 切换 Tab
   - `window.batchAddIdealChargingStations()` - 批量添加理想充电站
   - `window.batchAddXiaopengChargingStations()` - 批量添加小鹏充电站

## ✨ 优势对比

### 旧架构 vs 新架构

| 特性 | 旧架构 (app.js) | 新架构 (src/) |
|------|----------------|---------------|
| 代码行数 | ~3000 行 | ~200-300 行/模块 |
| 维护性 | 困难 | 容易 |
| 可扩展性 | 差 | 优秀 |
| 代码复用 | 低 | 高 |
| 调试难度 | 高 | 低 |
| 团队协作 | 困难 | 容易 |

### 新架构的优势

1. **模块化**：每个模块职责单一，易于理解和维护
2. **可测试**：每个模块可以独立测试
3. **可复用**：服务层可以在不同页面复用
4. **易扩展**：添加新功能不影响现有代码
5. **类型安全**：清晰的输入输出接口
6. **错误处理**：统一的错误处理机制

## 📝 开发指南

### 添加新功能

1. 确定功能所属的模块
2. 在对应模块中添加函数
3. 在 main.js 中暴露给全局使用

### 示例：添加新的批量操作

```javascript
// 在 marker-service.js 中添加
export function batchAddMarkers(markersData) {
    // 实现批量添加逻辑
}

// 在 main.js 中暴露
window.batchAddMyMarkers = function() {
    // 调用服务
    batchAddMarkers(myMarkersData);
};
```

## 🔧 配置说明

### 高德地图 API Key

在 `index.html` 中配置：

```html
<script src="https://webapi.amap.com/maps?v=1.4.15&key=YOUR_API_KEY"></script>
```

### 腾讯云开发环境 ID

在 `src/storage-service.js` 中配置：

```javascript
const TCB_ENV_ID = 'your-env-id';
```

## 📊 性能优化

1. **按需加载**：模块按需导入，减少初始加载时间
2. **数据缓存**：localStorage 缓存，减少重复请求
3. **批量操作**：支持批量添加，减少 DOM 操作
4. **错误处理**：完善的错误处理，避免应用崩溃

##  下一步计划

- [ ] 添加单元测试
- [ ] 使用 TypeScript 增强类型安全
- [ ] 添加构建工具（Vite/Webpack）
- [ ] 使用现代框架（Vue/React）
- [ ] 添加 PWA 支持
- [ ] 添加离线功能

## 📞 联系方式

如有问题，请提交 Issue 或联系开发者。
