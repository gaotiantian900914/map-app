// ==================== 全局变量 ====================
let map = null;
let markers = [];
let categories = [];

// 高德地图 Web 服务 API Key
const AMAP_WEB_SERVICE_KEY = '4214ffb1464f3d9ffd569072100f3f3e';

// ==================== 分类管理功能 ====================

function loadCategories() {
    const saved = localStorage.getItem('mapCategories');
    if (saved) {
        categories = JSON.parse(saved);
    } else {
        initDefaultCategories();
    }
}

function initDefaultCategories() {
    categories = [
        { id: 'default', name: '默认分类', color: '#2196F3', isDefault: true },
        { id: 'charging', name: '充电站', color: '#4CAF50', isDefault: false },
        { id: 'parking', name: '停车场', color: '#FF9800', isDefault: false }
    ];
    saveCategories();
}

function saveCategories() {
    localStorage.setItem('mapCategories', JSON.stringify(categories));
}

function updateCategoryList() {
    const listContainer = document.getElementById('categoryList');
    if (!listContainer) return;
    
    const allMarkers = JSON.parse(localStorage.getItem('mapMarkers') || '[]');
    
    let html = '';
    categories.forEach(category => {
        const count = allMarkers.filter(m => m.category === category.id || (category.id === 'default' && !m.category)).length;
        html += `
            <div class="category-item" style="border-left-color: ${category.color}">
                <div>
                    <span class="category-name" style="color: ${category.color}">${category.name}</span>
                    <span style="color: #999; font-size: 12px; margin-left: 10px;">(${count} 个标注)</span>
                </div>
                <div class="category-actions">
                    ${!category.isDefault ? `<button class="btn-delete" onclick="deleteCategory('${category.id}')">删除</button>` : '<span style="color: #999; font-size: 12px;">默认</span>'}
                </div>
            </div>
        `;
    });
    
    listContainer.innerHTML = html || '<p style="color: #999; text-align: center;">暂无分类</p>';
}

function deleteCategory(categoryId) {
    const category = categories.find(c => c.id === categoryId);
    if (category && category.isDefault) {
        console.log('默认分类不能删除');
        return;
    }
    
    const allMarkers = JSON.parse(localStorage.getItem('mapMarkers') || '[]');
    allMarkers.forEach(marker => {
        if (marker.category === categoryId) {
            marker.category = 'default';
        }
    });
    localStorage.setItem('mapMarkers', JSON.stringify(allMarkers));
    
    categories = categories.filter(c => c.id !== categoryId);
    saveCategories();
    updateCategoryList();
    renderCategoryTable();
    console.log('分类删除成功');
}

// ==================== 新版分类管理功能 ====================

function renderCategoryTable() {
    const tbody = document.getElementById('categoryTableBody');
    const emptyState = document.getElementById('categoryEmptyState');
    
    if (!tbody) return;
    
    const searchText = (document.getElementById('categorySearchInput') || {}).value || '';
    const colorFilter = (document.getElementById('categoryColorFilter') || {}).value || '';
    
    let filteredCategories = categories.filter(cat => {
        const matchName = !searchText || cat.name.toLowerCase().includes(searchText.toLowerCase());
        const matchColor = !colorFilter || cat.color === colorFilter;
        return matchName && matchColor;
    });
    
    if (filteredCategories.length === 0) {
        tbody.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }
    
    if (emptyState) emptyState.style.display = 'none';
    
    const allMarkers = JSON.parse(localStorage.getItem('mapMarkers') || '[]');
    
    tbody.innerHTML = filteredCategories.map(cat => {
        const count = allMarkers.filter(m => m.category === cat.id || (cat.id === 'default' && !m.category)).length;
        const createdTime = cat.createdAt ? new Date(cat.createdAt).toLocaleDateString() : '-';
        
        return `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 15px;">
                    <span style="width: 32px; height: 32px; background: ${cat.color}; border-radius: 50%; display: inline-block; border: 2px solid ${cat.color};"></span>
                </td>
                <td style="padding: 15px; font-weight: 500; color: ${cat.color};">${cat.name}</td>
                <td style="padding: 15px; color: #666;">${cat.color}</td>
                <td style="padding: 15px;">${count} 个标注</td>
                <td style="padding: 15px; color: #999;">${createdTime}</td>
                <td style="padding: 15px; text-align: center;">
                    <button onclick="editCategory('${cat.id}')" style="padding: 6px 12px; margin-right: 5px; border: none; background: #2196F3; color: white; border-radius: 4px; cursor: pointer; font-size: 12px;">编辑</button>
                    ${!cat.isDefault ? `<button onclick="deleteCategoryById('${cat.id}')" style="padding: 6px 12px; border: none; background: #f44336; color: white; border-radius: 4px; cursor: pointer; font-size: 12px;">删除</button>` : '<span style="color: #999; font-size: 12px;">默认</span>'}
                </td>
            </tr>
        `;
    }).join('');
}

function filterCategories() {
    renderCategoryTable();
}

function openCategoryModal(categoryId = null) {
    const modal = document.getElementById('categoryModal');
    const title = document.getElementById('categoryModalTitle');
    const nameInput = document.getElementById('categoryNameInput');
    const editId = document.getElementById('editCategoryId');
    
    // 重置表单
    nameInput.value = '';
    editId.value = '';
    
    // 清除之前的选择样式
    document.querySelectorAll('#categoryModal label').forEach(label => {
        label.style.border = '2px solid #e0e0e0';
    });
    
    if (categoryId) {
        // 编辑模式
        const category = categories.find(c => c.id === categoryId);
        if (category) {
            title.textContent = '✏️ 编辑分类';
            nameInput.value = category.name;
            editId.value = category.id;
            
            // 选中当前颜色
            const colorRadio = document.querySelector(`input[name="categoryColor"][value="${category.color}"]`);
            if (colorRadio) {
                colorRadio.checked = true;
                colorRadio.parentElement.style.border = '2px solid #667eea';
            }
        }
    } else {
        // 新增模式
        title.textContent = '➕ 新增分类';
        // 默认选中蓝色
        const colorRadio = document.querySelector(`input[name="categoryColor"][value="#2196F3"]`);
        if (colorRadio) {
            colorRadio.checked = true;
            colorRadio.parentElement.style.border = '2px solid #667eea';
        }
    }
    
    modal.style.display = 'flex';
    nameInput.focus();
}

function closeCategoryModal() {
    const modal = document.getElementById('categoryModal');
    modal.style.display = 'none';
}

function selectColor(color, element) {
    // 清除所有选中样式
    document.querySelectorAll('#categoryModal label').forEach(label => {
        label.style.border = '2px solid #e0e0e0';
    });
    // 选中当前颜色
    element.style.border = '2px solid #667eea';
    // 选中单选框
    const radio = element.querySelector('input[type="radio"]');
    if (radio) radio.checked = true;
}

function saveCategory() {
    const nameInput = document.getElementById('categoryNameInput');
    const editId = document.getElementById('editCategoryId');
    const name = nameInput.value.trim();
    
    if (!name) {
        nameInput.focus();
        nameInput.style.borderColor = '#f44336';
        return;
    }
    
    const selectedColor = document.querySelector('input[name="categoryColor"]:checked');
    const color = selectedColor ? selectedColor.value : '#2196F3';
    
    if (editId.value) {
        // 编辑现有分类
        const category = categories.find(c => c.id === editId.value);
        if (category) {
            category.name = name;
            category.color = color;
            saveCategories();
            console.log('分类更新成功:', category.name);
        }
    } else {
        // 新增分类
        const newCategory = {
            id: 'category_' + Date.now(),
            name: name,
            color: color,
            isDefault: false,
            createdAt: new Date().toISOString()
        };
        categories.push(newCategory);
        saveCategories();
        console.log('分类添加成功:', newCategory.name);
    }
    
    closeCategoryModal();
    renderCategoryTable();
    updateCategoryFilter();
    if (typeof refreshMarkers === 'function') refreshMarkers();
    if (typeof initMap === 'function' && map) {
        markers.forEach(m => m.marker.setMap(null));
        markers = [];
        loadMarkers();
    }
}

function editCategory(categoryId) {
    openCategoryModal(categoryId);
}

function deleteCategoryById(categoryId) {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return;
    
    if (category.isDefault) {
        console.log('默认分类不能删除');
        return;
    }
    
    if (!confirm(`确定要删除分类"${category.name}"吗？\n\n该分类下的所有标注将被移动到默认分类。`)) {
        return;
    }
    
    // 将该分类下的标注移动到默认分类
    const allMarkers = JSON.parse(localStorage.getItem('mapMarkers') || '[]');
    allMarkers.forEach(marker => {
        if (marker.category === categoryId) {
            marker.category = 'default';
        }
    });
    localStorage.setItem('mapMarkers', JSON.stringify(allMarkers));
    
    // 删除分类
    categories = categories.filter(c => c.id !== categoryId);
    saveCategories();
    
    renderCategoryTable();
    updateCategoryFilter();
    console.log('分类删除成功');
    
    // 刷新地图标记
    if (typeof initMap === 'function' && map) {
        markers.forEach(m => m.marker.setMap(null));
        markers = [];
        loadMarkers();
    }
}

function updateCategoryFilter() {
    const filterSelect = document.getElementById('categoryFilter');
    if (!filterSelect) return;
    
    const currentValue = filterSelect.value;
    filterSelect.innerHTML = '<option value="all">全部类型</option>';
    
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.id;
        option.textContent = cat.name;
        filterSelect.appendChild(option);
    });
    
    filterSelect.value = currentValue;
}

// ==================== Tab 切换功能 ====================

function switchTab(tab) {
    const tabItems = document.querySelectorAll('.tab-item');
    tabItems.forEach(item => item.classList.remove('active'));
    
    ['mapView', 'addView', 'categoryView', 'tableView'].forEach(viewId => {
        const view = document.getElementById(viewId);
        if (view) view.style.display = 'none';
    });
    
    switch(tab) {
        case 'map':
            document.getElementById('mapView').style.display = 'flex';
            tabItems[0].classList.add('active');
            break;
        case 'add':
            window.location.href = 'add-marker.html';
            break;
        case 'category':
            document.getElementById('categoryView').style.display = 'block';
            tabItems[2].classList.add('active');
            updateCategoryList();
            renderCategoryTable();
            break;
        case 'table':
            document.getElementById('tableView').style.display = 'flex';
            tabItems[3].classList.add('active');
            if (typeof refreshMarkers === 'function') refreshMarkers();
            break;
    }
}

// ==================== 地图初始化 ====================

function initMap() {
    console.log('初始化地图...');
    
    const mapContainer = document.getElementById('map');
    if (!mapContainer) {
        console.log('地图容器不存在');
        return;
    }
    
    if (typeof AMap === 'undefined') {
        console.error('AMap 未加载');
        return;
    }
    
    try {
        const isAddMarkerPage = window.location.pathname.includes('add-marker.html');
        const centerPoint = isAddMarkerPage ? [114.057437, 22.538823] : [116.397428, 39.90923];
        
        map = new AMap.Map('map', {
            zoom: 12,
            center: centerPoint
        });
        
        AMap.plugin(['AMap.Scale', 'AMap.ToolBar'], function() {
            map.addControl(new AMap.Scale());
            map.addControl(new AMap.ToolBar());
        });
        
        loadMarkers();
        console.log('地图初始化完成');
    } catch (error) {
        console.error('地图初始化失败:', error);
    }
}

function loadMarkers() {
    if (!map) return;
    
    const saved = localStorage.getItem('mapMarkers');
    if (!saved) return;
    
    const markerData = JSON.parse(saved);
    console.log('加载标注数据:', markerData.length, '个');
    
    markerData.forEach(data => {
        addMarkerToMap(data);
    });
}

function addMarkerToMap(data) {
    if (!map) return;
    
    const savedCategories = JSON.parse(localStorage.getItem('mapCategories') || '[]');
    const category = savedCategories.find(c => c.id === (data.category || 'default')) || 
                     (savedCategories.length > 0 ? savedCategories[0] : null);
    const categoryColor = category ? category.color : '#2196F3';
    
    console.log('=== 添加标记 ===');
    console.log('标记名称:', data.name);
    console.log('标记分类 ID:', data.category);
    console.log('查找到的分类:', category);
    console.log('分类名称:', category ? category.name : '未找到');
    console.log('分类颜色:', categoryColor);
    
    // 根据分类名称判断使用什么图标
    // 使用高德地图支持的图标 URL
    let iconUrl;
    
    // 理想充电站使用红色图标
    if (category && category.name === '理想充电站') {
        console.log('✓ 匹配到理想充电站，使用红色图标');
        iconUrl = 'https://webapi.amap.com/theme/v1.3/markers/n/mark_r.png';
    }
    // 小鹏充电站使用蓝色图标
    else if (category && category.name === '小鹏充电站') {
        console.log('✓ 匹配到小鹏充电站，使用蓝色图标');
        iconUrl = 'https://webapi.amap.com/theme/v1.3/markers/n/mark_b.png';
    }
    // 其他分类根据颜色判断
    else if (categoryColor === '#FF9800' || categoryColor === '#FF5722') {
        iconUrl = 'https://webapi.amap.com/theme/v1.3/markers/n/mark_r.png';
    } else if (categoryColor === '#2196F3' || categoryColor === '#3366CC') {
        iconUrl = 'https://webapi.amap.com/theme/v1.3/markers/n/mark_b.png';
    } else if (categoryColor === '#4CAF50') {
        iconUrl = 'https://webapi.amap.com/theme/v1.3/markers/n/mark_g.png';
    } else {
        iconUrl = 'https://webapi.amap.com/theme/v1.3/markers/n/mark_b.png';
    }
    
    console.log('使用图标 URL:', iconUrl);
    
    // 创建自定义图标
    const icon = new AMap.Icon({
        size: new AMap.Size(32, 32),
        image: iconUrl,
        imageSize: new AMap.Size(32, 32)
    });
    
    // 创建标记
    const marker = new AMap.Marker({
        map: map,
        position: [data.lng, data.lat],
        title: data.name,
        icon: icon,
        offset: new AMap.Pixel(-16, -32)
    });
    
    const infoContent = `
        <div style="padding: 10px; min-width: 200px;">
            <h4 style="margin: 0 0 10px 0; color: #333;">${data.name}</h4>
            <p style="margin: 5px 0; color: #666; font-size: 12px;">
                <strong>地址:</strong> ${data.address || '暂无'}
            </p>
            <p style="margin: 5px 0; color: #666; font-size: 12px;">
                <strong>坐标:</strong> ${data.lat.toFixed(6)}, ${data.lng.toFixed(6)}
            </p>
            ${data.description ? `<p style="margin: 5px 0; color: #666; font-size: 12px;"><strong>备注:</strong> ${data.description}</p>` : ''}
        </div>
    `;
    
    const infoWindow = new AMap.InfoWindow({
        content: infoContent,
        offset: new AMap.Pixel(0, -30)
    });
    
    marker.on('click', function() {
        infoWindow.open(map, marker.getPosition());
    });
    
    marker.setMap(map);
    markers.push({ marker: marker, data: data });
}

// ==================== 批量添加功能 ====================

const IDEAL_CHARGING_STATIONS = [
    { name: '理想充电站 宝安壹方城', lat: 22.552141, lng: 113.887684, address: '宝安区新安街道新湖路 99 号' },
    { name: '理想充电站 宝安海雅缤纷城', lat: 22.558146, lng: 113.874531, address: '宝安区新安街道建安一路 99 号' },
    { name: '理想充电站 宝安欢乐港湾', lat: 22.559677, lng: 113.878939, address: '宝安区宝兴路欢乐港湾' },
    { name: '理想充电站 宝安大仟里', lat: 22.601817, lng: 113.869338, address: '宝安区西乡街道海城路 3 号' },
    { name: '理想充电站 宝安中粮大悦城', lat: 22.540712, lng: 113.839603, address: '宝安区新安街道创业二路与新安一路交汇处' },
    { name: '理想充电站 南山万象天地', lat: 22.541645, lng: 113.944387, address: '南山区深南大道 9668 号' },
    { name: '理想充电站 南山海岸城', lat: 22.518903, lng: 113.936347, address: '南山区文心五路 33 号' },
    { name: '理想充电站 南山深圳湾万象城', lat: 22.518347, lng: 113.944213, address: '南山区科苑南路 2888 号' },
    { name: '理想充电站 福田星河 COCO Park', lat: 22.538823, lng: 114.057437, address: '福田区福华三路 268 号' },
    { name: '理想充电站 福田皇庭广场', lat: 22.533456, lng: 114.057437, address: '福田区福华三路 118 号' }
];

const XPENG_CHARGING_STATIONS = [
    { name: '小鹏充电站 宝安壹方城', lat: 22.552241, lng: 113.887784, address: '宝安区新安街道新湖路 99 号' },
    { name: '小鹏充电站 宝安海雅缤纷城', lat: 22.558246, lng: 113.874631, address: '宝安区新安街道建安一路 99 号' },
    { name: '小鹏充电站 宝安欢乐港湾', lat: 22.559777, lng: 113.879039, address: '宝安区宝兴路欢乐港湾' },
    { name: '小鹏充电站 宝安大仟里', lat: 22.601917, lng: 113.869438, address: '宝安区西乡街道海城路 3 号' },
    { name: '小鹏充电站 宝安中粮大悦城', lat: 22.540812, lng: 113.839703, address: '宝安区新安街道创业二路与新安一路交汇处' },
    { name: '小鹏充电站 南山万象天地', lat: 22.541745, lng: 113.944487, address: '南山区深南大道 9668 号' },
    { name: '小鹏充电站 南山海岸城', lat: 22.519003, lng: 113.936447, address: '南山区文心五路 33 号' },
    { name: '小鹏充电站 南山深圳湾万象城', lat: 22.518447, lng: 113.944313, address: '南山区科苑南路 2888 号' },
    { name: '小鹏充电站 福田星河 COCO Park', lat: 22.538923, lng: 114.057537, address: '福田区福华三路 268 号' },
    { name: '小鹏充电站 福田皇庭广场', lat: 22.533556, lng: 114.057537, address: '福田区福华三路 118 号' }
];

function batchAddIdealChargingStations() {
    console.log('开始批量添加理想充电站...');
    
    let savedCategories = JSON.parse(localStorage.getItem('mapCategories') || '[]');
    let idealCategory = savedCategories.find(c => c.name === '理想充电站');
    
    if (!idealCategory) {
        idealCategory = {
            id: 'ideal_charging_' + Date.now(),
            name: '理想充电站',
            color: '#FF5722',
            isDefault: false
        };
        savedCategories.push(idealCategory);
        localStorage.setItem('mapCategories', JSON.stringify(savedCategories));
        categories = savedCategories;
    } else {
        // 更新现有分类的颜色为红色
        idealCategory.color = '#FF5722';
        localStorage.setItem('mapCategories', JSON.stringify(savedCategories));
        categories = savedCategories;
    }
    
    console.log('理想分类颜色:', idealCategory.color);
    
    let allMarkers = JSON.parse(localStorage.getItem('mapMarkers') || '[]');
    let addedCount = 0;
    
    IDEAL_CHARGING_STATIONS.forEach(station => {
        const exists = allMarkers.some(m => 
            Math.abs(m.lat - station.lat) < 0.0001 && 
            Math.abs(m.lng - station.lng) < 0.0001
        );
        
        if (!exists) {
            allMarkers.push({
                id: 'marker_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                name: station.name,
                address: station.address,
                lat: station.lat,
                lng: station.lng,
                category: idealCategory.id,
                description: '理想汽车充电站',
                createdAt: new Date().toISOString()
            });
            addedCount++;
        }
    });
    
    localStorage.setItem('mapMarkers', JSON.stringify(allMarkers));
    
    if (map) {
        markers.forEach(m => m.marker.setMap(null));
        markers = [];
        loadMarkers();
    }
    
    console.log(`批量添加完成！成功添加 ${addedCount} 个理想充电站`);
    updateCategoryList();
}

function batchAddXpengChargingStations() {
    console.log('开始批量添加小鹏充电站...');
    
    let savedCategories = JSON.parse(localStorage.getItem('mapCategories') || '[]');
    let xpengCategory = savedCategories.find(c => c.name === '小鹏充电站');
    
    if (!xpengCategory) {
        xpengCategory = {
            id: 'xpeng_charging_' + Date.now(),
            name: '小鹏充电站',
            color: '#2196F3',
            isDefault: false
        };
        savedCategories.push(xpengCategory);
        localStorage.setItem('mapCategories', JSON.stringify(savedCategories));
        categories = savedCategories;
    }
    
    console.log('小鹏分类颜色:', xpengCategory.color);
    
    let allMarkers = JSON.parse(localStorage.getItem('mapMarkers') || '[]');
    let addedCount = 0;
    
    XPENG_CHARGING_STATIONS.forEach(station => {
        const exists = allMarkers.some(m => 
            Math.abs(m.lat - station.lat) < 0.0001 && 
            Math.abs(m.lng - station.lng) < 0.0001
        );
        
        if (!exists) {
            allMarkers.push({
                id: 'marker_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                name: station.name,
                address: station.address,
                lat: station.lat,
                lng: station.lng,
                category: xpengCategory.id,
                description: '小鹏汽车充电站',
                createdAt: new Date().toISOString()
            });
            addedCount++;
        }
    });
    
    localStorage.setItem('mapMarkers', JSON.stringify(allMarkers));
    
    if (map) {
        markers.forEach(m => m.marker.setMap(null));
        markers = [];
        loadMarkers();
    }
    
    console.log(`批量添加完成！成功添加 ${addedCount} 个小鹏充电站`);
    updateCategoryList();
}

function clearAllData() {
    localStorage.removeItem('mapMarkers');
    localStorage.removeItem('mapCategories');
    
    markers.forEach(m => m.marker.setMap(null));
    markers = [];
    categories = [];
    initDefaultCategories();
    
    console.log('所有数据已清空！');
    location.reload();
}

// ==================== 页面初始化 ====================

function initApp() {
    loadCategories();
    initMap();
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('页面加载完成');
    initApp();
});
