# 地图标注工具 - 迁移指南

## 📋 迁移步骤

### 第一步：备份旧代码 ✅

已完成：
- `app.js` 保留作为备份（不要删除）
- 建议复制一份：`app.js.backup`

### 第二步：测试新架构 🧪

1. **打开测试页面**：
   ```
   http://localhost:8080/test-new-arch.html
   或
   https://your-domain.github.io/map-app/test-new-arch.html
   ```

2. **运行所有测试**：
   - ✅ 模块加载测试
   - ✅ 应用初始化测试
   - ✅ 数据服务测试
   - ✅ 分类服务测试
   - ✅ 标记服务测试
   - ✅ 地图服务测试

3. **检查测试结果**：
   - 所有测试应该显示 ✅ 绿色通过标志
   - 查看日志区域，确认没有错误

### 第三步：修改 index.html 📝

**找到原来的脚本引用**（约第 820 行）：

```html
<!-- 原来的方式 -->
<script src="app.js?v=8"></script>
```

**替换为新的方式**：

```html
<!-- 新的方式 -->
<script type="module" src="src/main.js"></script>
```

**完整的脚本加载顺序**：

```html
<!-- 1. 云开发 SDK -->
<script src="https://imgcache.qq.com/qcloud/tcbjs/1.11.1/tcb.js"></script>

<!-- 2. 高德地图 API -->
<script src="https://webapi.amap.com/maps?v=1.4.15&key=45461b14046c9bda310ce713420c84d4"></script>

<!-- 3. 新架构主入口 -->
<script type="module" src="src/main.js"></script>
```

### 第四步：测试生产环境 🚀

1. **访问首页**：
   ```
   http://localhost:8080/index.html
   或
   https://your-domain.github.io/map-app
   ```

2. **测试所有功能**：
   - [ ] 地图显示正常
   - [ ] 搜索地点功能
   - [ ] 定位功能
   - [ ] 添加标记功能
   - [ ] 删除标记功能
   - [ ] 标记列表显示
   - [ ] 批量添加充电站
   - [ ] 导出 CSV
   - [ ] Tab 切换

3. **检查浏览器控制台**：
   - 不应该有红色错误
   - 可能有黄色警告（可以忽略）

### 第五步：回滚方案（如有问题）🔄

如果新架构出现问题，可以快速回滚：

**方法 1：快速回滚**

```html
<!-- 注释掉新架构 -->
<!-- <script type="module" src="src/main.js"></script> -->

<!-- 恢复旧版本 -->
<script src="app.js?v=8"></script>
```

**方法 2：使用备份文件**

```html
<!-- 使用备份文件 -->
<script src="app.js.backup"></script>
```

## 📊 新旧架构对比

| 特性 | 旧架构 | 新架构 |
|------|--------|--------|
| 文件 | app.js (单文件) | src/ (8 个模块) |
| 代码行数 | ~3000 行 | ~200-300 行/模块 |
| 维护难度 | ⭐⭐⭐⭐⭐ (很难) | ⭐⭐ (容易) |
| 可扩展性 | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| 调试难度 | ⭐⭐⭐⭐⭐ | ⭐⭐ |

## 🎯 迁移检查清单

### 文件准备
- [ ] `src/utils.js` 已创建
- [ ] `src/storage-service.js` 已创建
- [ ] `src/category-service.js` 已创建
- [ ] `src/marker-service.js` 已创建
- [ ] `src/map-service.js` 已创建
- [ ] `src/search-service.js` 已创建
- [ ] `src/ui-service.js` 已创建
- [ ] `src/main.js` 已创建
- [ ] `app.js` 已备份

### 测试验证
- [ ] 测试页面所有测试通过
- [ ] 首页地图显示正常
- [ ] 搜索功能正常
- [ ] 添加/删除标记正常
- [ ] 批量操作正常
- [ ] 导出功能正常

### 文档更新
- [ ] README.md 已更新
- [ ] 迁移指南已创建
- [ ] 架构文档已创建

## 🔧 常见问题

### Q1: 模块加载失败？

**A:** 确保使用 HTTP 服务器访问，不能直接打开 HTML 文件。

```bash
# 使用 Node.js 简单服务器
npx http-server .

# 或使用 Python
python -m http.server 8080
```

### Q2: 全局函数找不到？

**A:** 检查 `src/main.js` 是否正确暴露了全局函数：

```javascript
// 在 main.js 中确保有
window.searchPlace = ...;
window.addMarker = ...;
// 等等...
```

### Q3: localStorage 数据丢失？

**A:** 新架构使用相同的 localStorage key，数据不会丢失。
- `myMapMarkers` - 标记数据
- `mapCategories` - 分类数据

### Q4: 高德地图 API 报错？

**A:** 检查 API Key 的白名单设置：
1. 访问：https://console.amap.com/dev/index
2. 找到你的 Key
3. 添加域名到白名单：`your-domain.github.io`

## 📞 获取帮助

如遇到迁移问题：

1. **查看测试页面**的日志输出
2. **检查浏览器控制台**的错误信息
3. **对比新旧架构**的差异
4. **参考架构文档**：`README-NEW-ARCHITECTURE.md`

## ✅ 迁移完成标志

- [x] 所有测试通过
- [x] 生产环境功能正常
- [x] 没有控制台错误
- [x] 数据完整保留
- [x] 性能没有下降

**恭喜！迁移成功！** 🎉

---

**最后更新**: 2024-01-XX
**版本**: v9 (模块化架构)
