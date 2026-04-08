// 全局变量
let map;
let markers = [];
let categories = [];
let currentPosition = null;
let searchCircle = null;
let placeSearch = null;
let geolocation = null;
let currentMarkers = [];
let activeInfoWindow = null;
let isPinningMode = false;

// 分页相关变量
let currentPage = 1;
let pageSize = 10;
let selectedMarkers = [];

// 云开发环境 ID
const TCB_ENV_ID = 'map-app-1gu1wii1bfe2604c';

// 云开发相关变量（延迟初始化）
let app = null;
let db = null;
let cloudEnabled = false;

// 初始化云开发（在页面加载完成后调用）
function initCloudBase() {
    console.log('检查云开发 SDK...');
    // 检查 tcb 是否已加载
    if (typeof window.tcb === 'undefined') {
        console.warn('云开发 SDK 未加载，将使用 localStorage 存储');
        cloudEnabled = false;
        return;
    }
    
    try {
        app = window.tcb.init({
            env: TCB_ENV_ID
        });
        db = app.database();
        cloudEnabled = true;
        console.log('云开发初始化成功');
    } catch (error) {
        console.error('云开发初始化失败:', error);
        cloudEnabled = false;
    }
}

// 高德地图API Key - Web服务API
const AMAP_KEY = '45461b14046c9bda310ce713420c84d4';

// 颜色配置
const COLOR_MAP = {
    red: '#f44336',
    blue: '#2196F3',
    green: '#4CAF50',
    yellow: '#FFEB3B',
    purple: '#9C27B0',
    orange: '#FF9800',
    pink: '#E91E63',
    cyan: '#00BCD4'
};

// 获取颜色值（支持预定义颜色和自定义十六进制颜色）
function getColorValue(color) {
    // 如果是预定义颜色，返回对应值
    if (COLOR_MAP[color]) {
        return COLOR_MAP[color];
    }
    // 否则直接返回（假设是十六进制颜色）
    return color;
}

const MARKER_ICONS = {
    red: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_r.png',
    blue: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_b.png',
    green: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_g.png',
    yellow: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_y.png',
    purple: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_p.png',
    orange: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_o.png',
    pink: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_r.png',
    cyan: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_b.png'
};

// 初始化地图
function initializeApp() {
    console.log('initializeApp 被调用');
    // 延迟初始化，确保DOM完全加载
    setTimeout(function() {
        try {
            console.log('开始初始化应用...');
            // 先初始化云开发（可选）
            initCloudBase();
            // 加载分类
            loadCategories();
            // 初始化地图
            initMap();
            console.log('应用初始化完成');
        } catch (e) {
            console.error('应用初始化失败:', e);
            alert('应用初始化失败: ' + e.message);
        }
    }, 500);
}

// 确保在 window.onload 后初始化（所有外部脚本加载完成后）
if (document.readyState === 'complete') {
    // 页面已完全加载
    initializeApp();
} else {
    window.addEventListener('load', initializeApp);
}

// Tab 切换功能
function switchTab(tab) {
    if (tab === 'add') {
        window.location.href = 'add-marker.html';
    } else if (tab === 'table') {
        const mapView = document.getElementById('mapView');
        const tableView = document.getElementById('tableView');
        if (mapView && tableView) {
            mapView.style.display = 'none';
            tableView.style.display = 'flex';
            // 更新标签状态
            document.querySelectorAll('.tab-item').forEach(item => item.classList.remove('active'));
            const tableTab = document.querySelector('[onclick="switchTab(\'table\')"]');
            if (tableTab) {
                tableTab.classList.add('active');
            }
            // 重新从localStorage加载数据，确保数据是最新的
            const saved = localStorage.getItem('myMapMarkers');
            if (saved) {
                try {
                    const parsedMarkers = JSON.parse(saved);
                    if (Array.isArray(parsedMarkers)) {
                        markers = parsedMarkers.filter(function(marker) {
                            return marker && marker.lat && marker.lng && typeof marker.lat === 'number' && typeof marker.lng === 'number';
                        });
                        console.log('表格视图：从localStorage重新加载数据，标记数量:', markers.length);
                    }
                } catch (e) {
                    console.error('表格视图：重新加载数据失败:', e);
                }
            }
            // 调用函数渲染表格
            if (typeof renderMarkersTable === 'function') {
                renderMarkersTable();
                updateCategoryFilter();
                updateMarkerStats();
            }
        }
    } else {
        const mapView = document.getElementById('mapView');
        const tableView = document.getElementById('tableView');
        if (mapView && tableView) {
            mapView.style.display = 'flex';
            tableView.style.display = 'none';
            // 更新标签状态
            document.querySelectorAll('.tab-item').forEach(item => item.classList.remove('active'));
            const mapTab = document.querySelector('[onclick="switchTab(\'map\')"]');
            if (mapTab) {
                mapTab.classList.add('active');
            }
        }
    }
}

// 初始化地图函数
function initMap() {
    console.log('开始初始化地图...');
    
    // 检查AMap对象
    if (typeof AMap === 'undefined') {
        console.error('AMap对象未定义，地图API加载失败');
        alert('地图API加载失败，请检查网络连接后刷新页面');
        return;
    }
    console.log('AMap对象已加载');
    
    // 检查地图容器
    const mapContainer = document.getElementById('map');
    if (!mapContainer) {
        console.error('地图容器不存在');
        showStatus('地图容器不存在', 'error');
        return;
    }
    console.log('地图容器已找到:', mapContainer);
    console.log('地图容器尺寸:', mapContainer.offsetWidth, 'x', mapContainer.offsetHeight);

    // 确保地图容器有高度
    if (mapContainer.offsetHeight === 0) {
        console.error('地图容器高度为0，设置默认高度');
        mapContainer.style.height = '600px';
    }
    
    try {
        console.log('开始创建地图实例...');
        map = new AMap.Map('map', {
            zoom: 13,
            center: [113.874531, 22.558146], // 深圳中心坐标
            viewMode: '2D'
        });
        console.log('地图实例创建成功:', map);
        
        // 显示成功状态
        setTimeout(function() {
            showStatus('地图加载成功！', 'success');
        }, 1000);
    } catch (e) {
        console.error('地图创建失败:', e);
        showStatus('地图创建失败: ' + e.message, 'error');
        return;
    }

    // 加载地图插件
    try {
        AMap.plugin(['AMap.PlaceSearch', 'AMap.Geolocation', 'AMap.Circle', 'AMap.GeometryUtil'], function() {
            console.log('地图插件加载完成');
            
            placeSearch = new AMap.PlaceSearch({
                pageSize: 10,
                pageIndex: 1
            });
            console.log('PlaceSearch插件初始化完成');

            geolocation = new AMap.Geolocation({
                enableHighAccuracy: true,
                timeout: 10000,
                zoomToAccuracy: true
            });
            console.log('Geolocation插件初始化完成');
            // 不自动添加控件到地图，使用自定义按钮

            // 延迟加载标记，确保地图完全初始化
            setTimeout(function() {
                try {
                    loadMarkers();
                    console.log('地图初始化全部完成');
                    showStatus('地图加载完成，可以开始搜索', 'success');
                } catch (e) {
                    console.error('加载标记失败:', e);
                }
            }, 500);
        });
    } catch (e) {
        console.error('加载地图插件失败:', e);
        alert('地图插件加载失败: ' + e.message);
    }

    map.on('moveend', function() {
        if (isPinningMode) {
            const center = map.getCenter();
            updateCoordinateDisplay(center.lat, center.lng);
        }
    });
}

// 更新坐标显示
function updateCoordinateDisplay(lat, lng) {
    const latInput = document.getElementById('markerLat');
    const lngInput = document.getElementById('markerLng');
    
    if (latInput) latInput.value = lat.toFixed(6);
    if (lngInput) lngInput.value = lng.toFixed(6);
}

// ============ 分类管理功能 ============

// 加载分类
function loadCategories() {
    const saved = localStorage.getItem('myMapCategories');
    if (saved) {
        try {
            categories = JSON.parse(saved);
        } catch (e) {
            categories = [];
        }
    }
    // 确保默认分类存在
    const defaultCategories = [
        { id: 'default', name: '默认', color: 'blue' },
        { id: 'home', name: '家', color: 'red' },
        { id: 'company', name: '公司', color: 'green' },
        { id: 'ideal_' + Date.now(), name: '理想充电站', color: 'orange' },
        { id: 'xpeng_' + Date.now(), name: '小鹏充电站', color: 'blue' }
    ];
    
    // 检查并添加缺失的分类
    defaultCategories.forEach(defaultCat => {
        const existingCat = categories.find(cat => cat.name === defaultCat.name);
        if (!existingCat) {
            categories.push(defaultCat);
            console.log('添加缺失的分类:', defaultCat.name);
        }
    });
    
    // 保存分类
    saveCategories();
    
    // 尝试更新分类列表（仅在index.html中存在）
    try {
        updateCategoriesList();
    } catch (e) {
        console.log('更新分类列表失败（可能在add-marker.html页面）:', e);
    }
    // 尝试更新分类选择器（仅在index.html中存在）
    try {
        updateCategorySelect();
    } catch (e) {
        console.log('更新分类选择器失败（可能在add-marker.html页面）:', e);
    }
}

// 保存分类
function saveCategories() {
    localStorage.setItem('myMapCategories', JSON.stringify(categories));
}

// 清空所有数据（用于调试）
function clearAllData() {
    localStorage.removeItem('myMapMarkers');
    localStorage.removeItem('myMapCategories');
    markers = [];
    categories = [];
    loadCategories(); // 重新加载默认分类
    if (map) {
        reloadMarkersOnMap();
    }
    showStatus('所有数据已清空', 'success');
    console.log('所有数据已清空');
}

// 添加分类
function addCategory() {
    const nameInput = document.getElementById('newCategoryName');
    const colorSelect = document.getElementById('newCategoryColor');
    const name = nameInput.value.trim();
    const color = colorSelect.value;

    if (!name) {
        showStatus('请输入分类名称', 'error');
        return;
    }

    // 检查是否已存在
    if (categories.some(function(c) { return c.name === name; })) {
        showStatus('该分类已存在', 'error');
        return;
    }

    const category = {
        id: Date.now().toString(),
        name: name,
        color: color
    };

    categories.push(category);
    saveCategories();
    updateCategoriesList();
    updateCategorySelect();

    nameInput.value = '';
    showStatus('分类添加成功', 'success');
}

// 删除分类
function deleteCategory(id) {
    if (!confirm('确定要删除这个分类吗？该分类下的标注将变为默认分类。')) {
        return;
    }

    // 将该分类下的标注改为默认分类
    markers.forEach(function(marker) {
        if (marker.categoryId === id) {
            marker.categoryId = 'default';
        }
    });
    saveMarkers();

    categories = categories.filter(function(c) { return c.id !== id; });
    saveCategories();
    updateCategoriesList();
    updateCategorySelect();
    reloadMarkersOnMap();
    showStatus('分类已删除', 'success');
}

// 编辑分类
function editCategory(id) {
    const category = categories.find(function(c) { return c.id === id; });
    if (!category) return;

    // 创建编辑分类的弹窗
    const modalHTML = `
        <div id="editCategoryModal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center;">
            <div style="background: white; border-radius: 12px; padding: 25px; width: 90%; max-width: 400px; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3 style="color: #333; font-size: 18px; margin: 0;">✏️ 编辑分类</h3>
                    <button onclick="document.getElementById('editCategoryModal').remove()" style="background: #f5f5f5; border: none; border-radius: 50%; width: 30px; height: 30px; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center;">×</button>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #333;">分类名称</label>
                    <input type="text" id="editCategoryName" value="${category.name}" style="width: 100%; padding: 12px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 14px;">
                </div>
                
                <div style="margin-bottom: 25px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #333;">分类颜色</label>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <input type="color" id="editCategoryColor" value="${getColorValue(category.color)}" style="width: 60px; height: 40px; padding: 2px; border: 2px solid #e0e0e0; border-radius: 8px; cursor: pointer;">
                        <span id="colorPreview" style="flex: 1; padding: 8px 12px; background: ${getColorValue(category.color)}; color: ${getContrastColor(getColorValue(category.color))}; border-radius: 5px; font-size: 14px; font-weight: 500;">${getColorValue(category.color)}</span>
                    </div>
                </div>
                
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button onclick="document.getElementById('editCategoryModal').remove()" style="padding: 10px 20px; background: #f5f5f5; color: #333; border: 1px solid #ddd; border-radius: 8px; cursor: pointer; font-size: 14px;">取消</button>
                    <button onclick="saveCategoryEdit('${id}')" style="padding: 10px 20px; background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%); color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500;">保存</button>
                </div>
            </div>
        </div>
    `;
    
    // 添加到页面
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // 监听颜色变化，更新预览
    const colorInput = document.getElementById('editCategoryColor');
    const colorPreview = document.getElementById('colorPreview');
    if (colorInput && colorPreview) {
        colorInput.addEventListener('input', function() {
            const color = this.value;
            colorPreview.style.background = color;
            colorPreview.style.color = getContrastColor(color);
            colorPreview.textContent = color;
        });
    }
}

// 保存分类编辑
function saveCategoryEdit(id) {
    const category = categories.find(function(c) { return c.id === id; });
    if (!category) return;

    const nameInput = document.getElementById('editCategoryName');
    const colorInput = document.getElementById('editCategoryColor');
    const newName = nameInput.value.trim();
    const newColor = colorInput.value;

    if (!newName) {
        showStatus('分类名称不能为空', 'error');
        return;
    }

    if (categories.some(function(c) { return c.name === newName && c.id !== id; })) {
        showStatus('该分类名称已存在', 'error');
        return;
    }

    category.name = newName;
    category.color = newColor;
    saveCategories();
    updateCategoriesList();
    updateCategorySelect();
    updateMarkersList();
    reloadMarkersOnMap(); // 重新加载标记以更新颜色
    
    // 关闭弹窗
    document.getElementById('editCategoryModal').remove();
    showStatus('分类修改成功', 'success');
}

// 获取对比度颜色（用于文本）
function getContrastColor(hexColor) {
    // 转换为RGB
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    
    // 计算亮度
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    
    // 返回对比色
    return brightness > 128 ? '#000000' : '#ffffff';
}

// 打开分类管理弹窗
function openCategoryManager() {
    // 创建弹窗HTML
    const modalHTML = `
        <div id="categoryModal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center;">
            <div style="background: white; border-radius: 12px; padding: 25px; width: 90%; max-width: 500px; max-height: 80vh; overflow-y: auto; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3 style="color: #333; font-size: 18px; margin: 0;">🏷️ 分类管理</h3>
                    <button onclick="closeCategoryManager()" style="background: #f5f5f5; border: none; border-radius: 50%; width: 30px; height: 30px; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center;">×</button>
                </div>
                
                <!-- 添加新分类 -->
                <div style="margin-bottom: 25px; padding-bottom: 20px; border-bottom: 1px solid #eee;">
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <input type="text" id="newCategoryNameModal" placeholder="新分类名称" style="flex: 1; padding: 12px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 14px;">
                        <input type="color" id="newCategoryColorModal" value="#2196F3" style="width: 50px; height: 40px; padding: 2px; border: 2px solid #e0e0e0; border-radius: 8px; cursor: pointer;">
                        <button onclick="addCategoryModal()" style="padding: 12px 20px; background: linear-gradient(135deg, #4CAF50 0%, #388E3C 100%); color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500;">添加</button>
                    </div>
                </div>
                
                <!-- 分类列表 -->
                <div id="categoriesListModal" style="margin-top: 20px;">
                    <!-- 动态生成分类列表 -->
                </div>
            </div>
        </div>
    `;
    
    // 添加到页面
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // 更新分类列表
    updateCategoriesListModal();
}

// 关闭分类管理弹窗
function closeCategoryManager() {
    const modal = document.getElementById('categoryModal');
    if (modal) {
        modal.remove();
    }
}

// 更新分类列表显示（弹窗版本）
function updateCategoriesListModal() {
    const listDiv = document.getElementById('categoriesListModal');
    if (!listDiv) return;

    if (categories.length === 0) {
        listDiv.innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">暂无分类</p>';
        return;
    }

    let html = '';
    categories.forEach(function(category) {
        const color = getColorValue(category.color) || '#999';
        html += '<div style="display: flex; align-items: center; justify-content: space-between; padding: 15px; margin-bottom: 12px; background: #f9f9f9; border-radius: 8px; border-left: 4px solid ' + color + '; transition: all 0.3s; hover:background #f0f0f0;">' +
            '<span style="font-weight: 500; color: #333; flex: 1;">' + category.name + '</span>' +
            '<div style="display: flex; gap: 8px;">' +
            (category.id !== 'default' ? '<button onclick="editCategory(\'' + category.id + '\'); updateCategoriesListModal();" style="padding: 6px 12px; background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%); color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 12px;">编辑</button>' : '') +
            (category.id !== 'default' ? '<button onclick="deleteCategory(\'' + category.id + '\'); updateCategoriesListModal();" style="padding: 6px 12px; background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%); color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 12px;">删除</button>' : '') +
            '</div>' +
            '</div>';
    });

    listDiv.innerHTML = html;
}

// 从弹窗添加分类
function addCategoryModal() {
    const nameInput = document.getElementById('newCategoryNameModal');
    const colorInput = document.getElementById('newCategoryColorModal');
    const name = nameInput.value.trim();
    const color = colorInput.value;

    if (!name) {
        alert('请输入分类名称');
        return;
    }

    // 检查是否已存在
    if (categories.some(function(c) { return c.name === name; })) {
        alert('该分类已存在');
        return;
    }

    const category = {
        id: Date.now().toString(),
        name: name,
        color: color
    };

    categories.push(category);
    saveCategories();
    updateCategoriesListModal();
    updateCategorySelect();

    nameInput.value = '';
    colorInput.value = '#2196F3';
    
    // 显示成功提示
    const successDiv = document.createElement('div');
    successDiv.style.cssText = 'background: #e8f5e9; color: #2e7d32; border: 1px solid #4CAF50; padding: 10px; border-radius: 8px; margin-top: 10px; text-align: center;';
    successDiv.textContent = '分类添加成功';
    document.getElementById('categoryModal').querySelector('div > div').appendChild(successDiv);
    
    // 3秒后移除提示
    setTimeout(() => successDiv.remove(), 3000);
}

// 更新分类列表显示（原版本，保持兼容）
function updateCategoriesList() {
    const listDiv = document.getElementById('categoriesList');
    if (!listDiv) return;

    if (categories.length === 0) {
        listDiv.innerHTML = '<p style="color: #999; text-align: center;">暂无分类</p>';
        return;
    }

    let html = '';
    categories.forEach(function(category) {
        const color = getColorValue(category.color) || '#999';
        html += '<div class="category-item" style="border-left-color: ' + color + ';">' +
            '<span class="category-name">' + category.name + '</span>' +
            '<div class="category-actions">' +
            (category.id !== 'default' ? '<button class="btn-edit" onclick="editCategory(\'' + category.id + '\')">编辑</button>' : '') +
            (category.id !== 'default' ? '<button class="btn-delete" onclick="deleteCategory(\'' + category.id + '\')">删除</button>' : '') +
            '</div>' +
            '</div>';
    });

    listDiv.innerHTML = html;
}

// 更新分类选择器
function updateCategorySelect() {
    const select = document.getElementById('markerCategory');
    if (!select) return;

    let html = '<option value="">-- 请选择分类 --</option>';
    categories.forEach(function(category) {
        html += '<option value="' + category.id + '">' + category.name + '</option>';
    });

    select.innerHTML = html;
}

// 获取分类颜色
function getCategoryColor(categoryId) {
    // 确保categories数组存在
    if (!Array.isArray(categories)) {
        return 'blue';
    }
    const category = categories.find(function(c) { return c.id === categoryId; });
    return category ? category.color : 'blue';
}

// 获取分类名称
function getCategoryName(categoryId) {
    // 确保categories数组存在
    if (!Array.isArray(categories)) {
        return '默认';
    }
    const category = categories.find(function(c) { return c.id === categoryId; });
    return category ? category.name : '默认';
}

// ============ 原有功能 ============

function updateCoordinateDisplay(lat, lng) {
    document.getElementById('markerLat').value = lat.toFixed(6);
    document.getElementById('markerLng').value = lng.toFixed(6);
}

function searchPlace() {
    const keyword = document.getElementById('placeSearchInput').value.trim();

    if (!keyword) {
        showStatus('请输入搜索关键词', 'error');
        return;
    }

    showStatus('正在搜索...', 'info');

    const url = 'https://restapi.amap.com/v3/place/text?key=' + AMAP_KEY + 
                '&keywords=' + encodeURIComponent(keyword) + 
                '&offset=10&page=1&extensions=all';

    fetch(url)
        .then(function(response) { return response.json(); })
        .then(function(data) {
            if (data.status === '1' && data.pois && data.pois.length > 0) {
                const pois = data.pois.map(function(poi) {
                    const location = poi.location.split(',');
                    return {
                        name: poi.name,
                        address: poi.address || '暂无地址信息',
                        type: poi.type || '',
                        location: {
                            lng: parseFloat(location[0]),
                            lat: parseFloat(location[1])
                        }
                    };
                });
                displayPlaceResults(pois);
            } else {
                showStatus('未找到相关地点', 'error');
                document.getElementById('placeSearchResults').innerHTML = '<div class="status error">未找到相关地点</div>';
            }
        })
        .catch(function(error) {
            showStatus('搜索请求失败', 'error');
        });
}

function displayPlaceResults(pois) {
    const resultsDiv = document.getElementById('placeSearchResults');

    if (!pois || pois.length === 0) {
        resultsDiv.innerHTML = '<div class="status error">未找到相关地点</div>';
        return;
    }

    let html = '<div style="margin-bottom: 10px; color: #FF9800; font-weight: bold;">找到 ' + pois.length + ' 个相关地点</div>';

    pois.forEach(function(poi, index) {
        const address = poi.address || '暂无地址信息';
        const lng = poi.location.lng;
        const lat = poi.location.lat;

        html += '<div class="place-item" onclick="selectPlace(\'' + poi.name.replace(/'/g, "\\'") + '\', ' + lng + ', ' + lat + ', \'' + address.replace(/'/g, "\\'") + '\')">' +
            '<h4>' + (index + 1) + '. ' + poi.name + '</h4>' +
            '<p class="address">📍 ' + address + '</p>' +
            '</div>';
    });

    resultsDiv.innerHTML = html;
    showStatus('搜索完成', 'success');
}

function selectPlace(name, lng, lat, address) {
    // 检查是否在index.html页面
    const pinningStatus = document.getElementById('pinningStatus');
    
    if (pinningStatus) {
        // 在add-marker.html页面
        isPinningMode = true;
        document.getElementById('pinningStatus').style.display = 'block';
        document.getElementById('cancelPinBtn').style.display = 'block';
        document.getElementById('centerPin').style.display = 'block';
        document.getElementById('markerName').value = name;
        document.getElementById('markerDesc').value = address !== '暂无地址信息' ? address : '';
        updateCoordinateDisplay(lat, lng);
    } else {
        // 在index.html页面
        // 直接移动地图到选定位置
        map.setCenter([lng, lat]);
        map.setZoom(17);
        
        // 创建临时标记
        if (window.selectedPlaceMarker) {
            window.selectedPlaceMarker.setMap(null);
        }
        
        window.selectedPlaceMarker = new AMap.Marker({
            position: [lng, lat],
            title: name,
            icon: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_r.png'
        });
        window.selectedPlaceMarker.setMap(map);
        
        // 显示信息窗口
        if (window.selectedPlaceInfoWindow) {
            window.selectedPlaceInfoWindow.close();
        }
        
        window.selectedPlaceInfoWindow = new AMap.InfoWindow({
            content: '<div style="padding: 10px;"><h3 style="margin: 0;">' + name + '</h3><p style="margin: 5px 0;">' + address + '</p></div>',
            offset: new AMap.Pixel(0, -30)
        });
        window.selectedPlaceInfoWindow.open(map, [lng, lat]);
    }

    showStatus('已定位到: ' + name, 'success');
}

function cancelPinning() {
    exitPinningMode();
    // 检查元素是否存在
    const markerName = document.getElementById('markerName');
    if (markerName) {
        markerName.value = '';
        document.getElementById('markerDesc').value = '';
        document.getElementById('markerLat').value = '';
        document.getElementById('markerLng').value = '';
        document.getElementById('markerCategory').value = '';
    }
    showStatus('已取消定位', 'info');
}

function exitPinningMode() {
    isPinningMode = false;
    // 检查元素是否存在
    const pinningStatus = document.getElementById('pinningStatus');
    if (pinningStatus) {
        pinningStatus.style.display = 'none';
        document.getElementById('cancelPinBtn').style.display = 'none';
        document.getElementById('centerPin').style.display = 'none';
    }
}

function locateMe() {
    console.log('点击定位按钮，检查状态...');
    console.log('geolocation:', geolocation);
    console.log('map:', map);
    
    if (!map) {
        showStatus('地图未加载，请刷新页面', 'error');
        console.error('地图实例不存在');
        return;
    }
    
    if (!geolocation) {
        showStatus('定位功能初始化中，请等待3秒后重试', 'error');
        console.error('定位功能未初始化，插件可能还在加载中');
        // 尝试重新初始化定位插件
        AMap.plugin(['AMap.Geolocation'], function() {
            geolocation = new AMap.Geolocation({
                enableHighAccuracy: true,
                timeout: 10000,
                zoomToAccuracy: true
            });
            console.log('Geolocation插件已重新初始化');
            showStatus('定位功能已就绪，请再次点击定位', 'success');
        });
        return;
    }

    showStatus('正在定位...', 'info');
    console.log('开始定位...');

    geolocation.getCurrentPosition(function(status, result) {
        console.log('定位回调:', status, result);
        if (status === 'complete') {
            const lng = result.position.lng;
            const lat = result.position.lat;
            currentPosition = { lng, lat };
            console.log('定位成功，坐标:', lat, lng);

            // 移除之前的定位标记（如果存在）
            if (window.locationMarker) {
                window.locationMarker.setMap(null);
            }

            // 创建新的定位标记
            window.locationMarker = new AMap.Marker({
                position: [lng, lat],
                title: '我的位置',
                icon: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_b.png'
            });
            window.locationMarker.setMap(map);

            // 移除之前的信息窗口（如果存在）
            if (window.locationInfoWindow) {
                window.locationInfoWindow.close();
            }

            // 创建新的信息窗口
            window.locationInfoWindow = new AMap.InfoWindow({
                content: '<div style="padding: 10px;"><h3 style="margin: 0;">📍 我的位置</h3></div>',
                offset: new AMap.Pixel(0, -30)
            });
            window.locationInfoWindow.open(map, [lng, lat]);

            // 移动地图到定位位置
            map.setCenter([lng, lat]);
            map.setZoom(17);

            showStatus('定位成功！', 'success');
        } else {
            console.error('定位失败:', result);
            showStatus('定位失败: ' + (result.message || '未知错误'), 'error');
        }
    });
}

function addMarker(name, desc, lat, lng, categoryId) {
    // 检查是否通过参数传递数据
    if (name && desc && lat && lng && categoryId) {
        // 通过参数添加标注
        const marker = {
            id: Date.now(),
            name: name,
            categoryId: categoryId || 'default',
            description: desc,
            lat: lat,
            lng: lng,
            createdAt: new Date().toLocaleString()
        };

        markers.push(marker);
        displayMarkerOnMap(marker);
        saveMarkers();
        updateMarkersList();

        if (map) {
            fitMapToMarkers();
        }
        showStatus('标注添加成功！', 'success');
    } else {
        // 从DOM获取数据（兼容原有调用方式）
        const markerName = document.getElementById('markerName').value.trim();
        const markerCategoryId = document.getElementById('markerCategory').value;
        const markerDesc = document.getElementById('markerDesc').value.trim();
        const markerLat = parseFloat(document.getElementById('markerLat').value);
        const markerLng = parseFloat(document.getElementById('markerLng').value);

        if (!markerName) {
            showStatus('请输入标注名称', 'error');
            return;
        }

        if (isNaN(markerLat) || isNaN(markerLng)) {
            showStatus('请先搜索地点并定位', 'error');
            return;
        }

        const marker = {
            id: Date.now(),
            name: markerName,
            categoryId: markerCategoryId || 'default',
            description: markerDesc,
            lat: markerLat,
            lng: markerLng,
            createdAt: new Date().toLocaleString()
        };

        markers.push(marker);
        displayMarkerOnMap(marker);
        saveMarkers();
        updateMarkersList();
        exitPinningMode();

        document.getElementById('markerName').value = '';
        document.getElementById('markerDesc').value = '';
        document.getElementById('markerLat').value = '';
        document.getElementById('markerLng').value = '';
        document.getElementById('markerCategory').value = '';

        fitMapToMarkers();
        showStatus('标注添加成功！', 'success');
    }
}

function displayMarkerOnMap(marker) {
    try {
        // 确保marker对象存在
        if (!marker) {
            console.error('标记对象不存在');
            return;
        }
        
        console.log('显示标记:', marker.name);
        
        // 确保位置参数格式正确
        if (!marker.lng || !marker.lat || typeof marker.lng !== 'number' || typeof marker.lat !== 'number') {
            console.error('标记位置参数格式错误:', marker);
            return;
        }
        
        // 确保categories数组存在
        if (!Array.isArray(categories)) {
            console.error('分类数组不存在');
            return;
        }
        
        // 获取分类信息
        const category = categories.find(c => c.id === marker.categoryId);
        console.log('分类信息:', category);
        
        let color = 'blue'; // 默认颜色
        
        // 特殊处理：确保理想充电站使用橙色，小鹏充电站使用蓝色
        if (category) {
            if (category.name === '理想充电站') {
                color = 'orange';
                console.log('强制使用橙色图标 for 理想充电站');
            } else if (category.name === '小鹏充电站') {
                color = 'blue';
                console.log('强制使用蓝色图标 for 小鹏充电站');
            } else {
                // 使用分类的颜色
                color = category.color;
                console.log('使用分类颜色:', color);
            }
        } else {
            // 尝试通过标记名称判断分类
            if (marker.name && marker.name.includes('理想充电站')) {
                color = 'orange';
                console.log('通过标记名称判断为理想充电站，使用橙色图标');
            } else if (marker.name && marker.name.includes('小鹏充电站')) {
                color = 'blue';
                console.log('通过标记名称判断为小鹏充电站，使用蓝色图标');
            } else {
                console.warn('未找到分类，使用默认颜色');
            }
        }
        
        // 处理十六进制颜色值，将其映射到预定义颜色名称
        if (color.startsWith('#')) {
            console.log('处理十六进制颜色:', color);
            // 尝试匹配预定义颜色
            const colorName = Object.keys(COLOR_MAP).find(key => COLOR_MAP[key] === color);
            if (colorName) {
                color = colorName;
                console.log('匹配到预定义颜色:', color);
            } else {
                // 对于自定义颜色，根据RGB值判断最接近的预定义颜色
                const hex = color.slice(1);
                const r = parseInt(hex.slice(0, 2), 16);
                const g = parseInt(hex.slice(2, 4), 16);
                const b = parseInt(hex.slice(4, 6), 16);
                
                // 简单的颜色匹配逻辑
                if (r > 200 && g > 100 && b < 50) {
                    color = 'orange'; // 橙色
                } else if (r > 200 && g < 50 && b < 50) {
                    color = 'red'; // 红色
                } else if (r < 50 && g > 200 && b < 50) {
                    color = 'green'; // 绿色
                } else if (r < 50 && g < 50 && b > 200) {
                    color = 'blue'; // 蓝色
                } else if (r > 200 && g > 200 && b < 50) {
                    color = 'yellow'; // 黄色
                } else if (r > 200 && g < 50 && b > 200) {
                    color = 'pink'; // 粉色
                } else if (r < 50 && g > 200 && b > 200) {
                    color = 'cyan'; // 青色
                } else if (r > 100 && g < 50 && b > 100) {
                    color = 'purple'; // 紫色
                } else {
                    // 默认使用蓝色
                    color = 'blue';
                }
                console.log('根据RGB值判断的颜色:', color);
            }
        } else if (!MARKER_ICONS[color]) {
            // 如果颜色不是预定义颜色，使用蓝色
            console.log('颜色不是预定义颜色，使用蓝色:', color);
            color = 'blue';
        }
        
        console.log('最终使用的颜色:', color);
        
        // 根据分类设置不同颜色的标记
        let markerColor = 'blue'; // 默认蓝色
        if (color === 'orange') {
            markerColor = 'red'; // 高德地图没有橙色标记，使用红色代替
        } else if (color === 'blue') {
            markerColor = 'blue';
        } else if (color === 'green') {
            markerColor = 'green';
        } else if (color === 'yellow') {
            markerColor = 'yellow';
        } else if (color === 'purple') {
            markerColor = 'purple';
        } else if (color === 'red') {
            markerColor = 'red';
        } else if (color === 'pink') {
            markerColor = 'red';
        } else if (color === 'cyan') {
            markerColor = 'blue';
        }
        
        // 使用高德地图内置的标记样式
        const iconUrl = 'https://webapi.amap.com/theme/v1.3/markers/n/mark_' + markerColor.charAt(0) + '.png';
        console.log('使用的图标URL:', iconUrl);
        
        // 为不同分类的标记设置不同的zIndex，确保它们都能显示
        let zIndex = 100; // 默认zIndex
        if (color === 'red') {
            zIndex = 200; // 理想充电站使用更高的zIndex
        } else if (color === 'blue') {
            zIndex = 150; // 小鹏充电站使用中等的zIndex
        }
        
        const amapMarker = new AMap.Marker({
            position: [marker.lng, marker.lat],
            title: marker.name,
            icon: new AMap.Icon({
                size: new AMap.Size(25, 34),
                image: iconUrl,
                imageSize: new AMap.Size(25, 34)
            }),
            clickable: true,
            animation: 'AMAP_ANIMATION_DROP',
            zIndex: zIndex
        });

        const markerCategoryName = getCategoryName(marker.categoryId);
        const categoryColor = getColorValue(getCategoryColor(marker.categoryId));

        const infoWindow = new AMap.InfoWindow({
            content: '<div style="min-width: 200px; padding: 10px;">' +
                '<h3 style="margin: 0 0 10px 0; color: #333;">' + marker.name + '</h3>' +
                '<span class="marker-category-badge" style="background: ' + categoryColor + '">' + markerCategoryName + '</span>' +
                '<p style="margin: 5px 0; color: #666;">' + (marker.description || '无描述') + '</p>' +
                '<p style="margin: 5px 0; font-size: 12px; color: #999;">坐标: ' + marker.lat.toFixed(6) + ', ' + marker.lng.toFixed(6) + '</p>' +
                '</div>',
            offset: new AMap.Pixel(0, -30)
        });

        amapMarker.on('click', function() {
            if (activeInfoWindow) {
                activeInfoWindow.close();
            }
            const infoWindowPosition = [marker.lng, marker.lat];
            console.log('信息窗口位置:', infoWindowPosition);
            infoWindow.open(map, infoWindowPosition);
            activeInfoWindow = infoWindow;
            highlightMarkerInList(marker.id);
        });

        amapMarker.setMap(map);

        currentMarkers.push({
            id: marker.id,
            marker: amapMarker,
            infoWindow: infoWindow
        });
    } catch (e) {
        console.error('显示标记失败:', e);
    }
}

// 获取分类名称
function getCategoryName(categoryId) {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : '默认';
}

// 获取分类颜色
function getCategoryColor(categoryId) {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.color : 'blue';
}

// 调整地图视图以适应所有标记
function fitMapToMarkers() {
    if (!map || markers.length === 0) {
        console.log('地图未初始化或没有标记，跳过调整视图');
        return;
    }
    
    try {
        // 过滤出有效的标记
        const validMarkers = markers.filter(function(marker) {
            return marker && 
                   typeof marker.lat === 'number' && 
                   typeof marker.lng === 'number' &&
                   !isNaN(marker.lat) && 
                   !isNaN(marker.lng);
        });
        
        if (validMarkers.length === 0) {
            console.log('没有有效的标记，跳过调整视图');
            return;
        }
        
        // 创建边界对象
        const bounds = new AMap.Bounds();
        
        // 添加所有有效标记的位置到边界
        validMarkers.forEach(function(marker) {
            bounds.extend([marker.lng, marker.lat]);
        });
        
        // 调整地图视图
        map.setBounds(bounds);
        console.log('地图视图已调整到包含所有标记，有效标记数量:', validMarkers.length);
    } catch (e) {
        console.error('调整地图视图失败:', e);
    }
}

// 更新标记列表显示
function updateMarkersList() {
    const listDiv = document.getElementById('markersList');
    if (!listDiv) return;
    
    if (markers.length === 0) {
        listDiv.innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">暂无标注</p>';
        return;
    }
    
    let html = '';
    markers.forEach(function(marker, index) {
        const category = categories.find(c => c.id === marker.categoryId);
        const color = category ? getColorValue(category.color) : '#2196F3';
        
        html += '<div style="padding: 10px; margin-bottom: 8px; background: #f5f5f5; border-radius: 8px; border-left: 4px solid ' + color + ';">' +
            '<div style="font-weight: bold; color: #333; margin-bottom: 5px;">' + marker.name + '</div>' +
            '<div style="font-size: 12px; color: #666;">' + (marker.description || '无描述') + '</div>' +
            '</div>';
    });
    
    listDiv.innerHTML = html;
}

// 重新加载所有标记到地图
function reloadMarkersOnMap() {
    console.log('开始重新加载标记到地图...');
    
    // 清除所有当前显示的标记
    currentMarkers.forEach(function(item) {
        item.marker.setMap(null);
    });
    currentMarkers = [];
    
    // 重新加载所有标记
    markers.forEach(function(marker) {
        try {
            displayMarkerOnMap(marker);
        } catch (e) {
            console.error('重新显示标记失败:', e);
        }
    });
    
    console.log('标记重新加载完成，当前显示的标记数量:', currentMarkers.length);
}

// 删除标记
function deleteMarker(markerId, event) {
    if (event) {
        event.stopPropagation();
    }
    
    if (!confirm('确定要删除这个标注吗？')) {
        return;
    }
    
    // 找到并移除标记
    const markerIndex = markers.findIndex(m => m.id === markerId);
    if (markerIndex > -1) {
        markers.splice(markerIndex, 1);
        
        // 保存到 localStorage
        saveMarkers();
        
        // 重新加载标记到地图
        reloadMarkersOnMap();
        
        // 更新标记列表
        updateMarkersList();
        
        // 更新统计信息
        updateMarkerStats();
        
        showStatus('标注已删除', 'success');
    }
}

// 聚焦到指定标记
function focusOnMarker(lng, lat, markerId) {
    if (!map) return;
    
    // 设置地图中心
    map.setCenter([lng, lat]);
    map.setZoom(16);
    
    // 找到对应的标记并打开信息窗口
    const markerItem = currentMarkers.find(item => item.data.id === markerId);
    if (markerItem) {
        // 触发标记的点击事件
        markerItem.marker.emit('click');
    }
}

function highlightMarkerInList(markerId) {
    try {
        // 检查是否存在marker-item元素
        const markerItems = document.querySelectorAll('.marker-item');
        if (markerItems.length > 0) {
            markerItems.forEach(function(item) {
                item.style.background = '#f9f9f9';
                item.style.borderColor = '#eee';
            });

            const targetItem = document.querySelector('.marker-item[data-id="' + markerId + '"]');
            if (targetItem) {
                targetItem.style.background = '#e3f2fd';
                targetItem.style.borderColor = '#2196F3';
                targetItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    } catch (e) {
        // 在add-marker.html页面中可能没有marker-item元素，这是正常的
        console.log('highlightMarkerInList: 未找到marker-item元素，这是正常的');
    }
}

function fitMapToMarkers() {
    if (markers.length === 0) {
        console.log('没有标记，跳过调整视图');
        return;
    }
    if (!map) {
        console.error('地图实例不存在，无法调整视图');
        return;
    }

    try {
        // 验证所有标记的坐标是否有效
        const validMarkers = markers.filter(function(marker) {
            return marker && 
                   typeof marker.lng === 'number' && 
                   typeof marker.lat === 'number' &&
                   !isNaN(marker.lng) && 
                   !isNaN(marker.lat);
        });

        if (validMarkers.length === 0) {
            console.warn('没有有效的标记坐标');
            return;
        }

        console.log('有效的标记数量:', validMarkers.length);
        
        // 检查第一个标记的坐标
        if (validMarkers[0]) {
            console.log('第一个标记坐标:', validMarkers[0].lng, validMarkers[0].lat);
        }

        // 先创建一个包含第一个标记的bounds
        const firstMarker = validMarkers[0];
        const bounds = new AMap.Bounds([firstMarker.lng, firstMarker.lat], [firstMarker.lng, firstMarker.lat]);
        
        // 扩展bounds以包含所有标记
        for (let i = 1; i < validMarkers.length; i++) {
            const marker = validMarkers[i];
            bounds.extend([marker.lng, marker.lat]);
        }

        console.log('Bounds对象:', bounds);
        
        // 检查bounds是否有效
        const southWest = bounds.getSouthWest();
        const northEast = bounds.getNorthEast();
        console.log('Bounds西南角:', southWest);
        console.log('Bounds东北角:', northEast);
        
        if (southWest && northEast) {
            map.setBounds(bounds, [50, 50, 50, 50]);
            console.log('地图视图调整成功');
        } else {
            console.error('Bounds对象无效');
        }
    } catch (e) {
        console.error('调整地图视图失败:', e);
    }
}

// ============ 修改后的附近搜索功能 ============
// 以地图中心点为基准搜索附近标注
function searchNearby() {
    // 获取地图中心点作为搜索中心
    const center = map.getCenter();
    const searchCenter = { lng: center.lng, lat: center.lat };

    const radius = parseInt(document.getElementById('searchRadius').value);
    if (isNaN(radius) || radius < 100) {
        showStatus('请输入有效的搜索半径', 'error');
        return;
    }

    // 清除之前的搜索圆圈
    if (searchCircle) {
        searchCircle.setMap(null);
    }

    // 在地图中心绘制搜索范围圆圈
    searchCircle = new AMap.Circle({
        center: [searchCenter.lng, searchCenter.lat],
        radius: radius,
        strokeColor: '#4CAF50',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: '#4CAF50',
        fillOpacity: 0.1
    });
    searchCircle.setMap(map);

    // 搜索范围内的标注
    const nearbyMarkers = [];
    markers.forEach(function(marker) {
        const distance = calculateDistance(
            searchCenter.lat,
            searchCenter.lng,
            marker.lat,
            marker.lng
        );

        if (distance <= radius) {
            nearbyMarkers.push({
                ...marker,
                distance: distance
            });
        }
    });

    // 按距离排序
    nearbyMarkers.sort(function(a, b) { return a.distance - b.distance; });
    
    // 显示结果
    displaySearchResults(nearbyMarkers, radius, searchCenter);
}

function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// 获取分类名称
function getCategoryName(categoryId) {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : '默认';
}

// 获取分类颜色
function getCategoryColor(categoryId) {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.color : 'blue';
}

function displaySearchResults(nearbyMarkers, radius, center) {
    const resultsDiv = document.getElementById('searchResults');
    if (!resultsDiv) {
        console.log('searchResults元素不存在，跳过更新');
        return;
    }

    if (nearbyMarkers.length === 0) {
        resultsDiv.innerHTML = '<div class="status info">在地图中心点 ' + radius + ' 米范围内没有找到标注</div>';
        return;
    }

    // 按分类统计
    const categoryStats = {};
    nearbyMarkers.forEach(function(marker) {
        const categoryId = marker.categoryId || 'default';
        const categoryName = getCategoryName(categoryId);
        const categoryColor = getCategoryColor(categoryId);
        
        if (!categoryStats[categoryId]) {
            categoryStats[categoryId] = {
                name: categoryName,
                color: categoryColor,
                count: 0,
                markers: []
            };
        }
        categoryStats[categoryId].count++;
        categoryStats[categoryId].markers.push(marker);
    });

    // 构建统计HTML
    let html = '<div style="margin-top: 10px; margin-bottom: 15px; color: #4CAF50; font-weight: bold; font-size: 16px;">在地图中心点附近找到 ' + nearbyMarkers.length + ' 个标注</div>';
    
    // 分类统计区域
    html += '<div style="background: #f5f5f5; border-radius: 8px; padding: 12px; margin-bottom: 15px;">';
    html += '<div style="font-weight: bold; margin-bottom: 10px; color: #333;">分类统计：</div>';
    html += '<div style="display: flex; flex-wrap: wrap; gap: 10px;">';
    
    for (const categoryId in categoryStats) {
        const stat = categoryStats[categoryId];
        const color = getColorValue(stat.color) || '#999';
        html += '<div style="background: white; border-radius: 5px; padding: 8px 12px; border-left: 4px solid ' + color + '; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">' +
            '<span style="font-weight: bold; color: ' + color + ';">' + stat.name + '</span>' +
            '<span style="color: #666; margin-left: 5px;">(' + stat.count + '个)</span>' +
            '</div>';
    }

    html += '</div></div>';

    // 按分类分组显示标注
    html += '<div style="font-weight: bold; margin-bottom: 10px; color: #333;">标注详情：</div>';

    for (const categoryId in categoryStats) {
        const stat = categoryStats[categoryId];
        const color = getColorValue(stat.color) || '#999';
        
        // 分类标题
        html += '<div style="margin-top: 15px; margin-bottom: 8px; padding: 8px 12px; background: ' + color + '; color: white; border-radius: 5px; font-weight: bold;">' +
            stat.name + ' (' + stat.count + '个)' +
            '</div>';
        
        // 该分类下的标注
        stat.markers.forEach(function(marker) {
            html += '<div class="result-item" onclick="focusOnMarker(' + marker.lng + ', ' + marker.lat + ', \'' + marker.id + '\')" style="border-left: 4px solid ' + color + '; margin-bottom: 8px;">' +
                '<h4>' + marker.name + '</h4>' +
                '<p>' + (marker.description || '无描述') + '</p>' +
                '<p class="distance">距离: ' + formatDistance(marker.distance) + '</p>' +
                '</div>';
        });
    }

    resultsDiv.innerHTML = html;
}

function formatDistance(meters) {
    if (meters < 1000) {
        return Math.round(meters) + ' 米';
    } else {
        return (meters / 1000).toFixed(2) + ' 公里';
    }
}

function focusOnMarker(lng, lat, markerId) {
    map.setCenter([lng, lat]);
    map.setZoom(16);

    if (markerId) {
        const markerItem = currentMarkers.find(function(item) { return item.id === markerId; });
        if (markerItem) {
            if (activeInfoWindow) {
                activeInfoWindow.close();
            }
            markerItem.infoWindow.open(map, [lng, lat]);
            activeInfoWindow = markerItem.infoWindow;
            highlightMarkerInList(markerId);
        }
    }
}

function updateMarkersList() {
    const listDiv = document.getElementById('markersList');
    if (!listDiv) {
        console.log('markersList元素不存在，跳过更新');
        return;
    }

    if (markers.length === 0) {
        listDiv.innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">暂无标注</p>';
        return;
    }

    let html = '';
    markers.forEach(function(marker) {
        const categoryName = getCategoryName(marker.categoryId);
        const categoryColor = getColorValue(getCategoryColor(marker.categoryId));
        
        html += '<div class="marker-item" data-id="' + marker.id + '" onclick="focusOnMarker(' + marker.lng + ', ' + marker.lat + ', \'' + marker.id + '\')">' +
            '<span class="delete-btn" onclick="deleteMarker(\'' + marker.id + '\', event)">删除</span>' +
            '<h4>' + marker.name + '<span class="marker-category-badge" style="background: ' + categoryColor + ';">' + categoryName + '</span></h4>' +
            '<p>' + (marker.description || '无描述') + '</p>' +
            '<p style="font-size: 11px; color: #999;">' + marker.lat.toFixed(6) + ', ' + marker.lng.toFixed(6) + '</p>' +
            '</div>';
    });

    listDiv.innerHTML = html;
}

function deleteMarker(id, event) {
    event.stopPropagation();

    if (!confirm('确定要删除这个标注吗？')) {
        return;
    }

    markers = markers.filter(function(m) { return m.id !== id; });
    saveMarkers();
    reloadMarkersOnMap();
    updateMarkersList();
    showStatus('标注已删除', 'success');
}

function clearAllMarkers() {
    if (markers.length === 0) {
        showStatus('没有标注可清空', 'error');
        return;
    }

    if (!confirm('确定要清空所有 ' + markers.length + ' 个标注吗？')) {
        return;
    }

    markers = [];
    saveMarkers();
    currentMarkers.forEach(function(item) {
        item.marker.setMap(null);
    });
    currentMarkers = [];
    exitPinningMode();
    updateMarkersList();
    showStatus('所有标注已清空', 'success');
}

function reloadMarkersOnMap() {
    console.log('开始重新加载标记到地图...');
    console.log('当前标记数量:', markers.length);
    
    // 清除所有当前显示的标记
    currentMarkers.forEach(function(item) {
        item.marker.setMap(null);
    });
    currentMarkers = [];
    
    // 重新加载所有标记
    markers.forEach(function(marker) {
        try {
            console.log('重新显示标记:', marker.name, '分类ID:', marker.categoryId);
            displayMarkerOnMap(marker);
        } catch (e) {
            console.error('重新显示标记失败:', e);
        }
    });
    
    console.log('标记重新加载完成，当前显示的标记数量:', currentMarkers.length);
}

function saveMarkers() {
  // 先保存到 localStorage（确保数据不会丢失）
  localStorage.setItem('myMapMarkers', JSON.stringify(markers));
  
  // 如果云开发已启用，同时保存到云端
  if (cloudEnabled && db) {
    db.collection('markers').doc('all-markers').set({
      markers: markers,
      updatedAt: new Date().toISOString()
    }).then(() => {
      console.log("标注数据已保存到云开发");
    }).catch((error) => {
      console.error("保存到云开发失败:", error);
    });
  } else {
    console.log("云开发未启用，仅保存到 localStorage");
  }
}

function loadMarkers() {
  // 确保地图存在
  if (!map) {
    console.error('地图未初始化，无法加载标注');
    return;
  }
  
  // 初始化 markers 数组
  markers = [];
  
  // 定义从 localStorage 加载数据的函数
  function loadFromLocalStorage() {
    const saved = localStorage.getItem('myMapMarkers');
    if (saved) {
      try {
        const parsedMarkers = JSON.parse(saved);
        if (Array.isArray(parsedMarkers)) {
          markers = parsedMarkers.filter(function(marker) {
            return marker && marker.lat && marker.lng && typeof marker.lat === 'number' && typeof marker.lng === 'number';
          });
          console.log("从 localStorage 加载标注数据:", markers.length);
        }
      } catch (e) {
        console.error('从 localStorage 加载标注失败:', e);
        markers = [];
      }
    } else {
      console.log("localStorage 中没有找到标注数据");
    }
    
    // 显示标记在地图上
    markers.forEach(function(marker) {
      try {
        displayMarkerOnMap(marker);
      } catch (e) {
        console.error('显示标记失败:', e);
      }
    });
    
    // 更新 UI
    updateMarkersList();
    
    // 调整地图视图
    if (markers.length > 0) {
      setTimeout(function() {
        fitMapToMarkers();
      }, 1000);
    }
  }
  
  // 如果云开发已启用，尝试从云端加载
  if (cloudEnabled && db) {
    db.collection('markers').doc('all-markers').get().then((res) => {
      if (res.data() && res.data().markers && res.data().markers.length > 0) {
        markers = res.data().markers || [];
        console.log("从云开发加载标注数据:", markers.length);
        // 保存到 localStorage 作为备份
        localStorage.setItem('myMapMarkers', JSON.stringify(markers));
        
        // 显示标记在地图上
        markers.forEach(function(marker) {
          try {
            displayMarkerOnMap(marker);
          } catch (e) {
            console.error('显示标记失败:', e);
          }
        });
        
        // 更新 UI
        updateMarkersList();
        
        // 调整地图视图
        if (markers.length > 0) {
          setTimeout(function() {
            fitMapToMarkers();
          }, 1000);
        }
      } else {
        console.log("云开发中没有数据，从 localStorage 加载");
        loadFromLocalStorage();
      }
    }).catch((error) => {
      console.error("从云开发加载数据失败:", error);
      loadFromLocalStorage();
    });
  } else {
    // 云开发未启用，直接从 localStorage 加载
    console.log("云开发未启用，从 localStorage 加载数据");
    loadFromLocalStorage();
  }
  
  console.log('loadMarkers 完成，当前 markers 数量:', markers.length);
}

function showStatus(message, type) {
    const statusDiv = document.getElementById('locationStatus');
    if (statusDiv) {
        statusDiv.innerHTML = '<div class="status ' + type + '">' + message + '</div>';

        setTimeout(function() {
            statusDiv.innerHTML = '';
        }, 5000);
    } else {
        console.log('Status message:', message, '(type:', type, ')');
    }
}

// 定位我的位置
function locateMyPosition() {
    if (!geolocation) {
        showStatus('定位服务未初始化', 'error');
        return;
    }
    
    showStatus('正在定位...', 'info');
    
    geolocation.getCurrentPosition(function(status, result) {
        if (status === 'complete') {
            const position = result.position;
            currentPosition = position;
            
            // 将地图中心移动到当前位置
            map.setCenter([position.lng, position.lat]);
            map.setZoom(16);
            
            showStatus('定位成功', 'success');
        } else {
            showStatus('定位失败: ' + result.message, 'error');
        }
    });
}

// 搜索附近标注
function searchNearbyMarkers() {
    const radiusInput = document.getElementById('searchRadius');
    if (!radiusInput) return;
    
    const radius = parseInt(radiusInput.value) || 1000;
    
    if (!currentPosition) {
        showStatus('请先定位您的位置', 'error');
        return;
    }
    
    // 清除之前的搜索圆圈
    if (searchCircle) {
        searchCircle.setMap(null);
    }
    
    // 绘制搜索范围圆圈
    searchCircle = new AMap.Circle({
        center: [currentPosition.lng, currentPosition.lat],
        radius: radius,
        strokeColor: '#2196F3',
        strokeWeight: 2,
        strokeOpacity: 0.5,
        fillColor: '#2196F3',
        fillOpacity: 0.1
    });
    searchCircle.setMap(map);
    
    // 搜索范围内的标记
    const nearbyMarkers = [];
    markers.forEach(function(marker) {
        const distance = AMap.GeometryUtil.distance(
            [currentPosition.lng, currentPosition.lat],
            [marker.lng, marker.lat]
        );
        if (distance <= radius) {
            nearbyMarkers.push({
                marker: marker,
                distance: distance
            });
        }
    });
    
    // 按距离排序
    nearbyMarkers.sort(function(a, b) {
        return a.distance - b.distance;
    });
    
    // 显示结果
    showNearbyResults(nearbyMarkers, radius);
}

// 显示附近搜索结果
function showNearbyResults(nearbyMarkers, radius) {
    const listDiv = document.getElementById('markersList');
    if (!listDiv) return;
    
    if (nearbyMarkers.length === 0) {
        listDiv.innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">附近 ' + radius + ' 米内没有标注</p>';
        return;
    }
    
    let html = '<h4 style="margin-bottom: 15px; color: #333;">附近 ' + radius + ' 米内找到 ' + nearbyMarkers.length + ' 个标注</h4>';
    
    nearbyMarkers.forEach(function(item) {
        const marker = item.marker;
        const distance = Math.round(item.distance);
        const category = categories.find(c => c.id === marker.categoryId);
        const color = category ? getColorValue(category.color) : '#2196F3';
        
        html += '<div style="padding: 10px; margin-bottom: 8px; background: #f5f5f5; border-radius: 8px; border-left: 4px solid ' + color + ';">' +
            '<div style="font-weight: bold; color: #333; margin-bottom: 5px;">' + marker.name + '</div>' +
            '<div style="font-size: 12px; color: #666;">' + (marker.description || '无描述') + '</div>' +
            '<div style="font-size: 12px; color: #2196F3; margin-top: 5px;">距离: ' + distance + ' 米</div>' +
            '</div>';
    });
    
    listDiv.innerHTML = html;
    showStatus('找到 ' + nearbyMarkers.length + ' 个附近标注', 'success');
}

// 添加标注
function addMarker(name, description, lat, lng, categoryId) {
    if (!name || isNaN(lat) || isNaN(lng)) {
        showStatus('标注信息不完整', 'error');
        return false;
    }
    
    // 创建新标记
    const marker = {
        id: Date.now().toString(),
        name: name,
        description: description || '',
        lat: lat,
        lng: lng,
        categoryId: categoryId || 'default',
        createdAt: new Date().toLocaleString()
    };
    
    // 添加到标记数组
    markers.push(marker);
    
    // 保存到存储
    saveMarkers();
    
    // 显示在地图上
    if (map) {
        displayMarkerOnMap(marker);
    }
    
    // 更新列表
    updateMarkersList();
    updateMarkerStats();
    
    showStatus('标注添加成功', 'success');
    return true;
}

// 从表单添加标注（供 add-marker.html 调用）
window.addMarkerFromForm = addMarker;

// 搜索地点
function searchPlace() {
    const input = document.getElementById('placeSearchInput');
    if (!input || !input.value.trim()) {
        showStatus('请输入搜索关键词', 'error');
        return;
    }
    
    const keyword = input.value.trim();
    showStatus('正在搜索: ' + keyword, 'info');
    
    if (!placeSearch) {
        showStatus('搜索服务未初始化', 'error');
        return;
    }
    
    placeSearch.search(keyword, function(status, result) {
        console.log('搜索结果:', status, result);
        
        if (status === 'complete' && result && result.info === 'OK') {
            if (result.poiList && result.poiList.pois && result.poiList.pois.length > 0) {
                const poi = result.poiList.pois[0];
                const location = poi.location;
                
                console.log('找到地点:', poi.name, location);
                
                // 将地图中心移动到搜索结果
                map.setCenter([location.lng, location.lat]);
                map.setZoom(16);
                
                showStatus('搜索成功：' + poi.name, 'success');
            } else {
                showStatus('未找到相关地点', 'error');
            }
        } else {
            console.error('搜索失败:', status, result);
            showStatus('搜索失败，请重试', 'error');
        }
    });
}

// 回车键搜索
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('placeSearchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchPlace();
            }
        });
    }
});

// 返回主页面
function goBack() {
    window.location.href = 'index.html';
}



// 批量添加深圳市理想充电站
function batchAddIdealChargingStations() {
    try {
        // 显示正在处理的提示
        showStatus('正在批量添加理想充电站，请稍候...', 'info');
        console.log('开始批量添加理想充电站...');
        console.log('当前markers数量:', markers.length);
        console.log('当前categories数量:', categories.length);
        
        // 深圳市理想充电站位置数据
        const chargingStations = [
            // 宝安区
            { name: '理想充电站 宝安壹方城', lat: 22.552141, lng: 113.887684, address: '宝安区新安街道新湖路99号' },
            { name: '理想充电站 宝安海雅缤纷城', lat: 22.558146, lng: 113.874531, address: '宝安区新安街道建安一路99号' },
            { name: '理想充电站 宝安欢乐港湾', lat: 22.559677, lng: 113.878939, address: '宝安区宝兴路欢乐港湾' },
            { name: '理想充电站 宝安大仟里', lat: 22.601817, lng: 113.869338, address: '宝安区西乡街道海城路3号' },
            { name: '理想充电站 宝安中粮大悦城', lat: 22.540712, lng: 113.839603, address: '宝安区新安街道创业二路与新安一路交汇处' },
            { name: '理想充电站 宝安福永益田假日广场', lat: 22.646789, lng: 113.809123, address: '宝安区福永街道益田假日广场' },
            { name: '理想充电站 宝安沙井京基百纳', lat: 22.688941, lng: 113.814209, address: '宝安区沙井街道京基百纳广场' },
            
            // 南山区
            { name: '理想充电站 南山万象前海', lat: 22.524356, lng: 113.896789, address: '南山区桂湾四路169号' },
            { name: '理想充电站 南山科技园', lat: 22.538452, lng: 113.936781, address: '南山区科技园' },
            { name: '理想充电站 南山保利广场', lat: 22.526784, lng: 113.941235, address: '南山区粤海街道文心五路30-1号' },
            { name: '理想充电站 南山海岸城', lat: 22.524356, lng: 113.938765, address: '南山区海岸城购物中心' },
            { name: '理想充电站 南山深圳湾万象城', lat: 22.530123, lng: 113.948765, address: '南山区科苑南路2888号' },
            { name: '理想充电站 南山蛇口海上世界', lat: 22.533456, lng: 113.931234, address: '南山区蛇口海上世界' },
            
            // 福田区
            { name: '理想充电站 福田中心区', lat: 22.542999, lng: 114.059563, address: '福田区福华路3号' },
            { name: '理想充电站 福田COCO Park', lat: 22.541497, lng: 114.053303, address: '福田区福华三路269号' },
            { name: '理想充电站 福田华强北', lat: 22.533333, lng: 114.058333, address: '福田区华强北路' },
            
            // 罗湖区
            { name: '理想充电站 罗湖万象城', lat: 22.540341, lng: 114.101526, address: '罗湖区宝安南路1881号' },
            { name: '理想充电站 罗湖东门', lat: 22.547222, lng: 114.117778, address: '罗湖区东门步行街' },
            
            // 龙岗区
            { name: '理想充电站 龙岗万科广场', lat: 22.656028, lng: 114.278333, address: '龙岗区龙翔大道7188号' },
            { name: '理想充电站 龙岗大运中心', lat: 22.674444, lng: 114.338889, address: '龙岗区大运路' },
            
            // 龙华区
            { name: '理想充电站 龙华壹方天地', lat: 22.583333, lng: 114.016667, address: '龙华区龙华街道景龙社区' },
            { name: '理想充电站 龙华观澜湖', lat: 22.641667, lng: 114.016667, address: '龙华区观澜街道' },
            
            // 盐田区
            { name: '理想充电站 盐田壹海城', lat: 22.544444, lng: 114.222222, address: '盐田区海山街道壹海城' },
            
            // 坪山区
            { name: '理想充电站 坪山益田假日世界', lat: 22.690278, lng: 114.323611, address: '坪山区坪山街道益田假日世界' },
            
            // 光明区
            { name: '理想充电站 光明万达广场', lat: 22.677778, lng: 113.922222, address: '光明区光明街道万达广场' },
            
            // 大鹏新区
            { name: '理想充电站 大鹏佳兆业广场', lat: 22.533333, lng: 114.366667, address: '大鹏新区大鹏街道佳兆业广场' }
        ];

        // 确保理想充电站分类存在
        console.log('检查理想充电站分类...');
        let idealCategory = categories.find(cat => cat.name === '理想充电站');
        let categoryId;
        
        if (idealCategory) {
            // 确保理想充电站分类的颜色是橙色
            if (idealCategory.color !== 'orange' && idealCategory.color !== '#FF9800') {
                console.log('更新理想充电站分类颜色为橙色...');
                idealCategory.color = 'orange';
                saveCategories();
                // 尝试更新分类列表和选择器
                try {
                    updateCategoriesList();
                    updateCategorySelect();
                } catch (e) {
                    console.log('更新分类失败（可能在add-marker.html页面）:', e);
                }
            }
            categoryId = idealCategory.id;
            console.log('理想充电站分类已存在，ID:', categoryId, '颜色:', idealCategory.color);
        } else {
            // 创建理想充电站分类
            console.log('创建理想充电站分类...');
            const newCategory = {
                id: 'ideal_' + Date.now(),
                name: '理想充电站',
                color: 'orange'
            };
            categories.push(newCategory);
            saveCategories();
            // 尝试更新分类列表和选择器
            try {
                updateCategoriesList();
                updateCategorySelect();
            } catch (e) {
                console.log('更新分类失败（可能在add-marker.html页面）:', e);
            }
            categoryId = newCategory.id;
            console.log('理想充电站分类创建成功，ID:', categoryId);
        }

        // 批量添加或更新充电站
        console.log('开始添加理想充电站标记...');
        let addedCount = 0;
        let updatedCount = 0;
        let existingCount = 0;
        
        for (let i = 0; i < chargingStations.length; i++) {
            const station = chargingStations[i];
            // 检查是否已存在相同名称和分类的标注
            let existingMarker = null;
            for (let j = 0; j < markers.length; j++) {
                // 检查名称和分类是否都相同
                if (markers[j].name === station.name && markers[j].categoryId === categoryId) {
                    existingMarker = markers[j];
                    break;
                }
            }
            if (!existingMarker) {
                // 添加新标注，为理想充电站添加一个小的偏移量，避免与其他分类的标记重叠
                const marker = {
                    id: 'ideal_' + Date.now() + '_' + i, // 唯一ID
                    name: station.name,
                    categoryId: categoryId,
                    description: station.address,
                    lat: station.lat + 0.0001, // 添加小的偏移量
                    lng: station.lng + 0.0001, // 添加小的偏移量
                    createdAt: new Date().toLocaleString()
                };
                
                markers.push(marker);
                // 立即显示在地图上
                if (map && typeof AMap !== 'undefined') {
                    try {
                        console.log('显示理想充电站标记:', marker.name, '分类ID:', marker.categoryId);
                        console.log('分类信息:', categories.find(c => c.id === marker.categoryId));
                        displayMarkerOnMap(marker);
                    } catch (e) {
                        console.error('显示标记失败:', e);
                    }
                }
                console.log('添加理想充电站:', station.name, 'ID:', marker.id);
                addedCount++;
            } else {
                // 检查是否需要更新
                const needsUpdate = 
                    existingMarker.lat !== station.lat ||
                    existingMarker.lng !== station.lng ||
                    existingMarker.description !== station.address ||
                    existingMarker.categoryId !== categoryId;
                
                if (needsUpdate) {
                    // 更新现有标注
                    existingMarker.lat = station.lat;
                    existingMarker.lng = station.lng;
                    existingMarker.description = station.address;
                    existingMarker.categoryId = categoryId;
                    console.log('更新理想充电站:', station.name);
                    updatedCount++;
                } else {
                    console.log('理想充电站已存在:', station.name);
                    existingCount++;
                }
            }
        }

        // 保存到localStorage
        console.log('保存理想充电站到localStorage...');
        saveMarkers();
        console.log('保存完成，当前markers数量:', markers.length);
        
        // 重新加载标记到地图
        if (map) {
            try {
                console.log('重新加载标记到地图...');
                reloadMarkersOnMap();
                updateMarkersList();
                fitMapToMarkers();
                console.log('地图更新完成');
            } catch (e) {
                console.error('更新地图和列表失败:', e);
            }
        } else {
            console.error('地图实例不存在');
        }

        const message = '批量添加理想充电站完成！共添加 ' + addedCount + ' 个充电站，更新 ' + updatedCount + ' 个充电站，已有 ' + existingCount + ' 个充电站';
        console.log(message);
        showStatus(message, 'success');
    } catch (error) {
        console.error('批量添加理想充电站失败:', error);
        showStatus('批量添加理想充电站失败: ' + error.message, 'error');
    }
}

// 批量添加深圳市小鹏充电站
function batchAddXpengChargingStations() {
    try {
        // 显示正在处理的提示
        showStatus('正在批量添加小鹏充电站，请稍候...', 'info');
        console.log('开始批量添加小鹏充电站...');
        console.log('当前markers数量:', markers.length);
        console.log('当前categories数量:', categories.length);
        
        // 深圳市小鹏充电站位置数据
        const chargingStations = [
            // 宝安区
            { name: '小鹏充电站 宝安壹方城', lat: 22.552141, lng: 113.887684, address: '宝安区新安街道新湖路99号' },
            { name: '小鹏充电站 宝安海雅缤纷城', lat: 22.558146, lng: 113.874531, address: '宝安区新安街道建安一路99号' },
            { name: '小鹏充电站 宝安欢乐港湾', lat: 22.559677, lng: 113.878939, address: '宝安区宝兴路欢乐港湾' },
            { name: '小鹏充电站 宝安大仟里', lat: 22.601817, lng: 113.869338, address: '宝安区西乡街道海城路3号' },
            { name: '小鹏充电站 宝安中粮大悦城', lat: 22.540712, lng: 113.839603, address: '宝安区新安街道创业二路与新安一路交汇处' },
            { name: '小鹏充电站 宝安福永益田假日广场', lat: 22.646789, lng: 113.809123, address: '宝安区福永街道益田假日广场' },
            { name: '小鹏充电站 宝安沙井京基百纳', lat: 22.688941, lng: 113.814209, address: '宝安区沙井街道京基百纳广场' },
            
            // 南山区
            { name: '小鹏充电站 南山万象前海', lat: 22.524356, lng: 113.896789, address: '南山区桂湾四路169号' },
            { name: '小鹏充电站 南山科技园', lat: 22.538452, lng: 113.936781, address: '南山区科技园' },
            { name: '小鹏充电站 南山保利广场', lat: 22.526784, lng: 113.941235, address: '南山区粤海街道文心五路30-1号' },
            { name: '小鹏充电站 南山海岸城', lat: 22.524356, lng: 113.938765, address: '南山区海岸城购物中心' },
            { name: '小鹏充电站 南山深圳湾万象城', lat: 22.530123, lng: 113.948765, address: '南山区科苑南路2888号' },
            { name: '小鹏充电站 南山蛇口海上世界', lat: 22.533456, lng: 113.931234, address: '南山区蛇口海上世界' },
            
            // 福田区
            { name: '小鹏充电站 福田中心区', lat: 22.542999, lng: 114.059563, address: '福田区福华路3号' },
            { name: '小鹏充电站 福田COCO Park', lat: 22.541497, lng: 114.053303, address: '福田区福华三路269号' },
            { name: '小鹏充电站 福田华强北', lat: 22.533333, lng: 114.058333, address: '福田区华强北路' },
            
            // 罗湖区
            { name: '小鹏充电站 罗湖万象城', lat: 22.540341, lng: 114.101526, address: '罗湖区宝安南路1881号' },
            { name: '小鹏充电站 罗湖东门', lat: 22.547222, lng: 114.117778, address: '罗湖区东门步行街' },
            
            // 龙岗区
            { name: '小鹏充电站 龙岗万科广场', lat: 22.656028, lng: 114.278333, address: '龙岗区龙翔大道7188号' },
            { name: '小鹏充电站 龙岗大运中心', lat: 22.674444, lng: 114.338889, address: '龙岗区大运路' },
            
            // 龙华区
            { name: '小鹏充电站 龙华壹方天地', lat: 22.583333, lng: 114.016667, address: '龙华区龙华街道景龙社区' },
            { name: '小鹏充电站 龙华观澜湖', lat: 22.641667, lng: 114.016667, address: '龙华区观澜街道' },
            
            // 盐田区
            { name: '小鹏充电站 盐田壹海城', lat: 22.544444, lng: 114.222222, address: '盐田区海山街道壹海城' },
            
            // 坪山区
            { name: '小鹏充电站 坪山益田假日世界', lat: 22.690278, lng: 114.323611, address: '坪山区坪山街道益田假日世界' },
            
            // 光明区
            { name: '小鹏充电站 光明万达广场', lat: 22.677778, lng: 113.922222, address: '光明区光明街道万达广场' },
            
            // 大鹏新区
            { name: '小鹏充电站 大鹏佳兆业广场', lat: 22.533333, lng: 114.366667, address: '大鹏新区大鹏街道佳兆业广场' }
        ];

        // 确保小鹏充电站分类存在
        console.log('检查小鹏充电站分类...');
        let xpengCategory = categories.find(cat => cat.name === '小鹏充电站');
        let categoryId;
        
        if (xpengCategory) {
            // 确保小鹏充电站分类的颜色是蓝色
            if (xpengCategory.color !== 'blue' && xpengCategory.color !== '#2196F3') {
                console.log('更新小鹏充电站分类颜色为蓝色...');
                xpengCategory.color = 'blue';
                saveCategories();
                // 尝试更新分类列表和选择器
                try {
                    updateCategoriesList();
                    updateCategorySelect();
                } catch (e) {
                    console.log('更新分类失败（可能在add-marker.html页面）:', e);
                }
            }
            categoryId = xpengCategory.id;
            console.log('小鹏充电站分类已存在，ID:', categoryId, '颜色:', xpengCategory.color);
        } else {
            // 创建小鹏充电站分类
            console.log('创建小鹏充电站分类...');
            const newCategory = {
                id: 'xpeng_' + Date.now(),
                name: '小鹏充电站',
                color: 'blue'
            };
            categories.push(newCategory);
            saveCategories();
            // 尝试更新分类列表和选择器
            try {
                updateCategoriesList();
                updateCategorySelect();
            } catch (e) {
                console.log('更新分类失败（可能在add-marker.html页面）:', e);
            }
            categoryId = newCategory.id;
            console.log('小鹏充电站分类创建成功，ID:', categoryId);
        }

        // 批量添加或更新充电站
        let addedCount = 0;
        let updatedCount = 0;
        let existingCount = 0;
        
        for (let i = 0; i < chargingStations.length; i++) {
            const station = chargingStations[i];
            // 检查是否已存在相同名称和分类的标注
            let existingMarker = null;
            for (let j = 0; j < markers.length; j++) {
                // 检查名称和分类是否都相同
                if (markers[j].name === station.name && markers[j].categoryId === categoryId) {
                    existingMarker = markers[j];
                    break;
                }
            }
            if (!existingMarker) {
                // 添加新标注，为小鹏充电站添加一个小的偏移量，避免与理想充电站的标记重叠
                const marker = {
                    id: 'xpeng_' + Date.now() + '_' + i, // 唯一ID
                    name: station.name,
                    categoryId: categoryId,
                    description: station.address,
                    lat: station.lat - 0.0001, // 添加小的偏移量
                    lng: station.lng - 0.0001, // 添加小的偏移量
                    createdAt: new Date().toLocaleString()
                };
                
                markers.push(marker);
                // 立即显示在地图上
                if (map && typeof AMap !== 'undefined') {
                    try {
                        displayMarkerOnMap(marker);
                    } catch (e) {
                        console.error('显示标记失败:', e);
                    }
                }
                console.log('添加小鹏充电站:', station.name, 'ID:', marker.id);
                addedCount++;
            } else {
                // 检查是否需要更新
                const needsUpdate = 
                    existingMarker.lat !== station.lat ||
                    existingMarker.lng !== station.lng ||
                    existingMarker.description !== station.address ||
                    existingMarker.categoryId !== categoryId;
                
                if (needsUpdate) {
                    // 更新现有标注，保持偏移量
                    existingMarker.lat = station.lat - 0.0001; // 保持偏移量
                    existingMarker.lng = station.lng - 0.0001; // 保持偏移量
                    existingMarker.description = station.address;
                    existingMarker.categoryId = categoryId;
                    console.log('更新小鹏充电站:', station.name);
                    updatedCount++;
                } else {
                    console.log('小鹏充电站已存在:', station.name);
                    existingCount++;
                }
            }
        }

        // 保存到localStorage
        console.log('保存小鹏充电站到localStorage...');
        saveMarkers();
        console.log('保存完成，当前markers数量:', markers.length);
        
        // 重新加载标记到地图
        if (map) {
            try {
                console.log('重新加载标记到地图...');
                reloadMarkersOnMap();
                updateMarkersList();
                fitMapToMarkers();
                console.log('地图更新完成');
            } catch (e) {
                console.error('更新地图和列表失败:', e);
            }
        } else {
            console.error('地图实例不存在');
        }

        const message = '批量添加小鹏充电站完成！共添加 ' + addedCount + ' 个充电站，更新 ' + updatedCount + ' 个充电站，已有 ' + existingCount + ' 个充电站';
        showStatus(message, 'success');
    } catch (error) {
        console.error('批量添加小鹏充电站失败:', error);
        showStatus('批量添加小鹏充电站失败: ' + error.message, 'error');
    }
}

// ============ 表格视图功能 ============

// 渲染标注表格
function renderMarkersTable() {
    const tableBody = document.getElementById('markersTableBody');
    const noMarkersMessage = document.getElementById('noMarkersMessage');
    const paginationDiv = document.getElementById('pagination');
    
    if (!tableBody || !noMarkersMessage) return;
    
    if (markers.length === 0) {
        tableBody.innerHTML = '';
        noMarkersMessage.style.display = 'block';
        if (paginationDiv) {
            paginationDiv.style.display = 'none';
        }
        return;
    }
    
    noMarkersMessage.style.display = 'none';
    
    // 计算分页信息
    const totalPages = Math.ceil(markers.length / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedMarkers = markers.slice(startIndex, endIndex);
    
    let html = '';
    for (let i = 0; i < paginatedMarkers.length; i++) {
        const marker = paginatedMarkers[i];
        const categoryName = getCategoryName(marker.categoryId);
        const categoryColor = getColorValue(getCategoryColor(marker.categoryId));
        const isSelected = selectedMarkers.includes(marker.id);
        
        html += '<tr style="border-bottom: 1px solid #eee; transition: background-color 0.3s;">' +
            '<td style="padding: 12px; text-align: center;"><input type="checkbox" ' + (isSelected ? 'checked' : '') + ' onclick="toggleMarkerSelection(\'' + marker.id + '\')" style="width: 18px; height: 18px; margin: 0; cursor: pointer;"></td>' +
            '<td style="padding: 12px;">' + (startIndex + i + 1) + '</td>' +
            '<td style="padding: 12px;">' + marker.name + '</td>' +
            '<td style="padding: 12px;">' +
                '<span style="display: inline-block; padding: 4px 8px; border-radius: 3px; background: ' + categoryColor + '; color: white; font-size: 12px;">' + categoryName + '</span>' +
            '</td>' +
            '<td style="padding: 12px;">' + (marker.description || '无描述') + '</td>' +
            '<td style="padding: 12px;">' + marker.lat.toFixed(6) + ', ' + marker.lng.toFixed(6) + '</td>' +
            '<td style="padding: 12px;">' + marker.createdAt + '</td>' +
            '<td style="padding: 12px;">' +
                '<button style="padding: 4px 8px; background: #2196F3; color: white; border: none; border-radius: 3px; cursor: pointer; margin-right: 5px;" onclick="focusOnMarker(' + marker.lng + ', ' + marker.lat + ', \'' + marker.id + '\'); switchTab(\'map\');">查看</button>' +
                '<button style="padding: 4px 8px; background: #f44336; color: white; border: none; border-radius: 3px; cursor: pointer;" onclick="event.stopPropagation(); deleteMarker(\'' + marker.id + '\', event); renderMarkersTable(); updateMarkerStats();">删除</button>' +
            '</td>' +
        '</tr>';
    }
    
    tableBody.innerHTML = html;
    
    // 渲染分页控件
    if (paginationDiv) {
        renderPagination(totalPages);
    }
}

// 切换标记选择状态
function toggleMarkerSelection(markerId) {
    const index = selectedMarkers.indexOf(markerId);
    if (index > -1) {
        selectedMarkers.splice(index, 1);
    } else {
        selectedMarkers.push(markerId);
    }
    updateBatchDeleteButton();
}

// 全选/取消全选
function toggleSelectAll() {
    const selectAllCheckbox = document.getElementById('selectAll');
    if (selectAllCheckbox.checked) {
        // 全选
        selectedMarkers = markers.map(marker => marker.id);
    } else {
        // 取消全选
        selectedMarkers = [];
    }
    renderMarkersTable();
    updateBatchDeleteButton();
}

// 更新批量删除按钮文本
function updateBatchDeleteButton() {
    const batchDeleteBtn = document.getElementById('batchDeleteBtn');
    if (batchDeleteBtn) {
        batchDeleteBtn.textContent = `🗑️ 批量删除 (${selectedMarkers.length})`;
    }
}

// 批量删除标记
function batchDeleteMarkers() {
    if (selectedMarkers.length === 0) {
        alert('请先选择要删除的标记');
        return;
    }
    
    if (confirm(`确定要删除选中的 ${selectedMarkers.length} 个标记吗？`)) {
        // 过滤掉选中的标记
        markers = markers.filter(marker => !selectedMarkers.includes(marker.id));
        
        // 保存到localStorage
        saveMarkers();
        
        // 重新渲染表格
        renderMarkersTable();
        
        // 更新统计信息
        updateMarkerStats();
        
        // 清空选中列表
        selectedMarkers = [];
        
        // 更新批量删除按钮
        updateBatchDeleteButton();
        
        // 刷新地图上的标记
        if (map) {
            // 清除所有标记
            currentMarkers.forEach(marker => marker.setMap(null));
            currentMarkers = [];
            
            // 重新添加标记
            markers.forEach(marker => displayMarkerOnMap(marker));
        }
        
        alert('批量删除成功！');
    }
}

// 刷新标记列表
function refreshMarkers() {
    // 重新从localStorage加载数据
    const saved = localStorage.getItem('myMapMarkers');
    if (saved) {
        try {
            const parsedMarkers = JSON.parse(saved);
            if (Array.isArray(parsedMarkers)) {
                markers = parsedMarkers.filter(function(marker) {
                    return marker && marker.lat && marker.lng && typeof marker.lat === 'number' && typeof marker.lng === 'number';
                });
                console.log('刷新：从localStorage重新加载数据，标记数量:', markers.length);
            }
        } catch (e) {
            console.error('刷新：重新加载数据失败:', e);
        }
    }
    
    // 重新渲染表格
    renderMarkersTable();
    
    // 更新统计信息
    updateMarkerStats();
    
    // 清空选中列表
    selectedMarkers = [];
    
    // 更新批量删除按钮
    updateBatchDeleteButton();
    
    // 刷新地图上的标记
    if (map) {
        // 清除所有标记
        currentMarkers.forEach(marker => marker.setMap(null));
        currentMarkers = [];
        
        // 重新添加标记
        markers.forEach(marker => displayMarkerOnMap(marker));
    }
    
    alert('刷新成功！');
}

// 渲染分页控件
function renderPagination(totalPages) {
    const paginationDiv = document.getElementById('pagination');
    if (!paginationDiv) return;
    
    let paginationHTML = '';
    
    // 总记录数和每页显示条数选择
    paginationHTML += '<div style="display: flex; align-items: center; margin-right: 20px;">' +
        '<span style="font-size: 14px; color: #666; margin-right: 10px;">共 ' + markers.length + ' 条记录</span>' +
        '<span style="font-size: 14px; color: #666; margin-right: 5px;">' + pageSize + '条/页</span>' +
        '<select onchange="changePageSize(this.value)" style="padding: 4px 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;">' +
        '<option value="10" ' + (pageSize === 10 ? 'selected' : '') + '>10条</option>' +
        '<option value="20" ' + (pageSize === 20 ? 'selected' : '') + '>20条</option>' +
        '<option value="50" ' + (pageSize === 50 ? 'selected' : '') + '>50条</option>' +
        '<option value="100" ' + (pageSize === 100 ? 'selected' : '') + '>100条</option>' +
        '</select>' +
        '</div>';
    
    // 分页按钮
    paginationHTML += '<div style="display: flex; align-items: center;">';
    
    // 第一页按钮
    if (currentPage > 1) {
        paginationHTML += '<button onclick="changePage(1)" style="padding: 6px 8px; margin: 0 2px; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer;">&lt;&lt;</button>';
    }
    
    // 上一页按钮
    if (currentPage > 1) {
        paginationHTML += '<button onclick="changePage(' + (currentPage - 1) + ')" style="padding: 6px 8px; margin: 0 2px; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer;">&lt;</button>';
    }
    
    // 页码按钮
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        if (i === currentPage) {
            paginationHTML += '<button onclick="changePage(' + i + ')" style="padding: 6px 10px; margin: 0 2px; border: 1px solid #2196F3; border-radius: 4px; background: #2196F3; color: white; cursor: pointer;">' + i + '</button>';
        } else {
            paginationHTML += '<button onclick="changePage(' + i + ')" style="padding: 6px 10px; margin: 0 2px; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer;">' + i + '</button>';
        }
    }
    
    // 下一页按钮
    if (currentPage < totalPages) {
        paginationHTML += '<button onclick="changePage(' + (currentPage + 1) + ')" style="padding: 6px 8px; margin: 0 2px; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer;">&gt;</button>';
    }
    
    // 最后一页按钮
    if (currentPage < totalPages) {
        paginationHTML += '<button onclick="changePage(' + totalPages + ')" style="padding: 6px 8px; margin: 0 2px; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer;">&gt;&gt;</button>';
    }
    
    paginationHTML += '</div>';
    
    paginationDiv.innerHTML = paginationHTML;
    paginationDiv.style.display = 'flex';
    paginationDiv.style.justifyContent = 'space-between';
    paginationDiv.style.alignItems = 'center';
    paginationDiv.style.marginTop = '20px';
    paginationDiv.style.padding = '10px 0';
    paginationDiv.style.borderTop = '1px solid #eee';
}

// 切换每页显示条数
function changePageSize(size) {
    pageSize = parseInt(size);
    currentPage = 1; // 重置到第一页
    // 检查当前是否在筛选状态
    const categoryFilter = document.getElementById('categoryFilter');
    const tableSearchInput = document.getElementById('tableSearchInput');
    if (categoryFilter && tableSearchInput) {
        const categoryId = categoryFilter.value;
        const searchKeyword = tableSearchInput.value.toLowerCase();
        filterTable(categoryId, searchKeyword);
    } else {
        renderMarkersTable();
    }
}

// 切换页码
function changePage(page) {
    if (page >= 1) {
        currentPage = page;
        // 检查当前是否在筛选状态
        const categoryFilter = document.getElementById('categoryFilter');
        const tableSearchInput = document.getElementById('tableSearchInput');
        if (categoryFilter && tableSearchInput) {
            const categoryId = categoryFilter.value;
            const searchKeyword = tableSearchInput.value.toLowerCase();
            filterTable(categoryId, searchKeyword);
        } else {
            renderMarkersTable();
        }
    }
}

// 更新分类筛选下拉框
function updateCategoryFilter() {
    const select = document.getElementById('categoryFilter');
    if (!select) return;
    
    let html = '<option value="all">全部类型</option>';
    categories.forEach(function(category) {
        html += '<option value="' + category.id + '">' + category.name + '</option>';
    });
    
    select.innerHTML = html;
}

// 按分类筛选表格
function filterTableByCategory() {
    const categoryId = document.getElementById('categoryFilter').value;
    const searchKeyword = document.getElementById('tableSearchInput').value.toLowerCase();
    filterTable(categoryId, searchKeyword);
}

// 按关键词搜索表格
function filterTableBySearch() {
    const categoryId = document.getElementById('categoryFilter').value;
    const searchKeyword = document.getElementById('tableSearchInput').value.toLowerCase();
    filterTable(categoryId, searchKeyword);
}

// 筛选表格
function filterTable(categoryId, searchKeyword) {
    const tableBody = document.getElementById('markersTableBody');
    const noMarkersMessage = document.getElementById('noMarkersMessage');
    const paginationDiv = document.getElementById('pagination');
    
    if (!tableBody || !noMarkersMessage) return;
    
    // 使用for循环替代filter方法
    const filteredMarkers = [];
    for (let i = 0; i < markers.length; i++) {
        const marker = markers[i];
        const matchesCategory = categoryId === 'all' || marker.categoryId === categoryId;
        const matchesSearch = !searchKeyword || 
            marker.name.toLowerCase().includes(searchKeyword) || 
            (marker.description && marker.description.toLowerCase().includes(searchKeyword));
        if (matchesCategory && matchesSearch) {
            filteredMarkers.push(marker);
        }
    }
    
    if (filteredMarkers.length === 0) {
        tableBody.innerHTML = '';
        noMarkersMessage.style.display = 'block';
        if (paginationDiv) {
            paginationDiv.style.display = 'none';
        }
        return;
    }
    
    noMarkersMessage.style.display = 'none';
    
    // 计算分页信息
    const totalPages = Math.ceil(filteredMarkers.length / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedMarkers = filteredMarkers.slice(startIndex, endIndex);
    
    let html = '';
    for (let i = 0; i < paginatedMarkers.length; i++) {
        const marker = paginatedMarkers[i];
        const categoryName = getCategoryName(marker.categoryId);
        const categoryColor = getColorValue(getCategoryColor(marker.categoryId));
        const isSelected = selectedMarkers.includes(marker.id);
        
        html += '<tr style="border-bottom: 1px solid #eee; transition: background-color 0.3s;">' +
            '<td style="padding: 12px; text-align: center;"><input type="checkbox" ' + (isSelected ? 'checked' : '') + ' onclick="toggleMarkerSelection(\'' + marker.id + '\')" style="width: 18px; height: 18px; margin: 0; cursor: pointer;"></td>' +
            '<td style="padding: 12px;">' + (startIndex + i + 1) + '</td>' +
            '<td style="padding: 12px;">' + marker.name + '</td>' +
            '<td style="padding: 12px;">' +
                '<span style="display: inline-block; padding: 4px 8px; border-radius: 3px; background: ' + categoryColor + '; color: white; font-size: 12px;">' + categoryName + '</span>' +
            '</td>' +
            '<td style="padding: 12px;">' + (marker.description || '无描述') + '</td>' +
            '<td style="padding: 12px;">' + marker.lat.toFixed(6) + ', ' + marker.lng.toFixed(6) + '</td>' +
            '<td style="padding: 12px;">' + marker.createdAt + '</td>' +
            '<td style="padding: 12px;">' +
                '<button style="padding: 4px 8px; background: #2196F3; color: white; border: none; border-radius: 3px; cursor: pointer; margin-right: 5px;" onclick="focusOnMarker(' + marker.lng + ', ' + marker.lat + ', \'' + marker.id + '\'); switchTab(\'map\');">查看</button>' +
                '<button style="padding: 4px 8px; background: #f44336; color: white; border: none; border-radius: 3px; cursor: pointer;" onclick="event.stopPropagation(); deleteMarker(\'' + marker.id + '\', event); filterTable(\'' + categoryId + '\', \'' + searchKeyword + '\'); updateMarkerStats();">删除</button>' +
            '</td>' +
        '</tr>';
    }
    
    tableBody.innerHTML = html;
    
    // 渲染分页控件
    if (paginationDiv) {
        // 临时保存原始markers，用于分页显示
        const originalMarkers = markers;
        markers = filteredMarkers;
        renderPagination(totalPages);
        markers = originalMarkers;
    }
    
    // 更新批量删除按钮
    updateBatchDeleteButton();
}

// 更新统计信息
function updateMarkerStats() {
    const statsDiv = document.getElementById('markerStats');
    if (!statsDiv) return;
    
    // 总标注数
    const totalMarkers = markers.length;
    
    // 按分类统计
    const categoryStats = {};
    markers.forEach(function(marker) {
        const categoryId = marker.categoryId || 'default';
        const categoryName = getCategoryName(categoryId);
        
        if (!categoryStats[categoryId]) {
            categoryStats[categoryId] = {
                name: categoryName,
                count: 0
            };
        }
        categoryStats[categoryId].count++;
    });
    
    let html = '<p style="margin-bottom: 10px; font-weight: bold;">总标注数: <span style="color: #4CAF50;">' + totalMarkers + '</span></p>';
    
    if (totalMarkers > 0) {
        html += '<div style="margin-top: 10px;">';
        html += '<p style="margin-bottom: 8px; font-weight: bold;">按类型统计:</p>';
        
        for (const categoryId in categoryStats) {
            const stat = categoryStats[categoryId];
            const percentage = ((stat.count / totalMarkers) * 100).toFixed(1);
            html += '<div style="display: flex; justify-content: space-between; margin-bottom: 5px;">' +
                '<span>' + stat.name + ':</span>' +
                '<span style="font-weight: bold;">' + stat.count + ' (' + percentage + '%)</span>' +
            '</div>';
        }
        
        html += '</div>';
    }
    
    statsDiv.innerHTML = html;
}

// 导出标注数据
function exportMarkers() {
    if (markers.length === 0) {
        showStatus('暂无标注数据可导出', 'error');
        return;
    }
    
    // 准备导出数据
    const exportData = markers.map(function(marker) {
        return {
            名称: marker.name,
            类型: getCategoryName(marker.categoryId),
            地址: marker.description || '无描述',
            纬度: marker.lat,
            经度: marker.lng,
            创建时间: marker.createdAt
        };
    });
    
    // 转换为CSV格式
    const headers = Object.keys(exportData[0]);
    const csvContent = [
        headers.join(','),
        ...exportData.map(row => headers.map(fieldName => row[fieldName]).join(','))
    ].join('\n');
    
    // 创建下载链接
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', '标注记录_' + new Date().toISOString().slice(0, 10) + '.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showStatus('标注数据导出成功', 'success');
}

// 显示状态消息
function showStatus(message, type) {
    console.log('状态消息:', message, type);
    
    // 尝试在地图上显示状态
    const mapContainer = document.querySelector('.map-container');
    if (mapContainer) {
        // 创建一个临时提示
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            padding: 12px 24px;
            background: ${type === 'error' ? '#f44336' : type === 'success' ? '#4CAF50' : '#2196F3'};
            color: white;
            border-radius: 4px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            z-index: 10000;
            font-size: 14px;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        // 3 秒后移除
        setTimeout(function() {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 3000);
    }
}

// 当页面加载完成时，检查是否需要显示表格视图
window.addEventListener('load', function() {
    // 检查 URL 参数，支持直接访问表格视图
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('view') === 'table') {
        switchTab('table');
    }
});

// 批量添加理想充电站
function batchAddIdealChargingStations() {
    console.log('开始批量添加理想充电站...');
    showStatus('正在批量添加理想充电站...', 'info');
    
    // 示例数据：深圳市各区的理想充电站位置
    const chargingStations = [
        { name: '理想充电站 - 福田区', lat: 22.5217, lng: 114.0557, district: '福田区' },
        { name: '理想充电站 - 南山区', lat: 22.5429, lng: 113.9303, district: '南山区' },
        { name: '理想充电站 - 罗湖区', lat: 22.5669, lng: 114.1419, district: '罗湖区' },
        { name: '理想充电站 - 宝安区', lat: 22.5539, lng: 113.8837, district: '宝安区' },
        { name: '理想充电站 - 龙岗区', lat: 22.7206, lng: 114.2476, district: '龙岗区' },
        { name: '理想充电站 - 盐田区', lat: 22.5548, lng: 114.2395, district: '盐田区' },
        { name: '理想充电站 - 龙华区', lat: 22.6573, lng: 114.0297, district: '龙华区' },
        { name: '理想充电站 - 坪山区', lat: 22.6930, lng: 114.3458, district: '坪山区' },
        { name: '理想充电站 - 光明区', lat: 22.7537, lng: 113.9353, district: '光明区' },
        { name: '理想充电站 - 大鹏新区', lat: 22.5940, lng: 114.4677, district: '大鹏新区' }
    ];
    
    // 找到"充电站"分类
    const chargingCategory = categories.find(c => c.name === '充电站' || c.name === '充电桩');
    const categoryId = chargingCategory ? chargingCategory.id : 'default';
    
    let addedCount = 0;
    
    chargingStations.forEach(function(station, index) {
        setTimeout(function() {
            const marker = {
                id: 'ideal_' + Date.now() + '_' + index,
                name: station.name,
                description: '理想汽车充电站 - ' + station.district,
                lat: station.lat,
                lng: station.lng,
                categoryId: categoryId,
                createdAt: new Date().toLocaleString()
            };
            
            markers.push(marker);
            addedCount++;
            
            // 显示在地图上
            if (map) {
                displayMarkerOnMap(marker);
            }
            
            // 所有标记添加完成后
            if (addedCount === chargingStations.length) {
                saveMarkers();
                updateMarkersList();
                updateMarkerStats();
                showStatus('成功添加 ' + addedCount + ' 个理想充电站', 'success');
                
                // 调整地图视图
                setTimeout(function() {
                    fitMapToMarkers();
                }, 500);
            }
        }, index * 100); // 每个标记间隔 100ms 添加
    });
}

// 批量添加小鹏充电站
function batchAddXiaopengChargingStations() {
    console.log('开始批量添加小鹏充电站...');
    showStatus('正在批量添加小鹏充电站...', 'info');
    
    // 示例数据：深圳市各区的鹏充电站位置
    const chargingStations = [
        { name: '小鹏充电站 - 福田区', lat: 22.5329, lng: 114.0633, district: '福田区' },
        { name: '小鹏充电站 - 南山区', lat: 22.5531, lng: 113.9420, district: '南山区' },
        { name: '小鹏充电站 - 罗湖区', lat: 22.5771, lng: 114.1321, district: '罗湖区' },
        { name: '小鹏充电站 - 宝安区', lat: 22.5641, lng: 113.8939, district: '宝安区' },
        { name: '小鹏充电站 - 龙岗区', lat: 22.7308, lng: 114.2578, district: '龙岗区' },
        { name: '小鹏充电站 - 盐田区', lat: 22.5650, lng: 114.2497, district: '盐田区' },
        { name: '小鹏充电站 - 龙华区', lat: 22.6675, lng: 114.0399, district: '龙华区' },
        { name: '小鹏充电站 - 坪山区', lat: 22.7032, lng: 114.3560, district: '坪山区' },
        { name: '小鹏充电站 - 光明区', lat: 22.7639, lng: 113.9455, district: '光明区' },
        { name: '小鹏充电站 - 大鹏新区', lat: 22.6042, lng: 114.4779, district: '大鹏新区' }
    ];
    
    // 找到"充电站"分类
    const chargingCategory = categories.find(c => c.name === '充电站' || c.name === '充电桩');
    const categoryId = chargingCategory ? chargingCategory.id : 'default';
    
    let addedCount = 0;
    
    chargingStations.forEach(function(station, index) {
        setTimeout(function() {
            const marker = {
                id: 'xiaopeng_' + Date.now() + '_' + index,
                name: station.name,
                description: '小鹏汽车充电站 - ' + station.district,
                lat: station.lat,
                lng: station.lng,
                categoryId: categoryId,
                createdAt: new Date().toLocaleString()
            };
            
            markers.push(marker);
            addedCount++;
            
            // 显示在地图上
            if (map) {
                displayMarkerOnMap(marker);
            }
            
            // 所有标记添加完成后
            if (addedCount === chargingStations.length) {
                saveMarkers();
                updateMarkersList();
                updateMarkerStats();
                showStatus('成功添加 ' + addedCount + ' 个小鹏充电站', 'success');
                
                // 调整地图视图
                setTimeout(function() {
                    fitMapToMarkers();
                }, 500);
            }
        }, index * 100); // 每个标记间隔 100ms 添加
    });
}
