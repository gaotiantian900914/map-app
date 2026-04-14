// ==================== 全局变量 ====================
let map = null;
let markers = [];
let categories = [];
let searchResultMarker = null;
let searchCircle = null;

// 高德地图 Web 服务 API Key (用于搜索功能)
const AMAP_WEB_SERVICE_KEY = '4214ffb1464f3d9ffd569072100f3f3e';

// ==================== 分类管理功能 ====================

// 加载分类
function loadCategories() {
    const saved = localStorage.getItem('mapCategories');
    if (saved) {
        categories = JSON.parse(saved);
    } else {
        initDefaultCategories();
    }
}

// 初始化默认分类
function initDefaultCategories() {
    categories = [
        { id: 'default', name: '默认分类', color: '#2196F3', isDefault: true },
        { id: 'charging', name: '充电站', color: '#4CAF50', isDefault: false },
        { id: 'parking', name: '停车场', color: '#FF9800', isDefault: false }
    ];
    saveCategories();
}

// 保存分类到本地存储
function saveCategories() {
    localStorage.setItem('mapCategories', JSON.stringify(categories));
}

// 添加新分类
function addNewCategory() {
    const nameInput = document.getElementById('newCategoryName');
    const colorSelect = document.getElementById('newCategoryColor');
    
    const name = nameInput.value.trim();
    if (!name) {
        showStatus('请输入分类名称', 'error');
        return;
    }
    
    // 检查是否已存在
    if (categories.some(c => c.name === name)) {
        showStatus('该分类已存在', 'error');
        return;
    }
    
    const colorMap = {
        'red': '#f44336',
        'blue': '#2196F3',
        'green': '#4CAF50',
        'yellow': '#FFEB3B',
        'purple': '#9C27B0',
        'orange': '#FF9800'
    };
    
    const newCategory = {
        id: 'cat_' + Date.now(),
        name: name,
        color: colorMap[colorSelect.value] || '#2196F3',
        isDefault: false
    };
    
    categories.push(newCategory);
    saveCategories();
    
    nameInput.value = '';
    updateCategoryList();
    showStatus('分类添加成功', 'success');
}

// 删除分类
function deleteCategory(categoryId) {
    const category = categories.find(c => c.id === categoryId);
    if (category && category.isDefault) {
        showStatus('默认分类不能删除', 'error');
        return;
    }
    
    if (!confirm('确定要删除这个分类吗？该分类下的标注将被移动到默认分类。')) {
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
    updateCategoryList();
    showStatus('分类删除成功', 'success');
}

// 更新分类列表显示
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

// ==================== Tab 切换功能 ====================

function switchTab(tab) {
    console.log('切换 Tab:', tab);
    
    // 更新 Tab 按钮状态
    const tabItems = document.querySelectorAll('.tab-item');
    tabItems.forEach(function(item) {
        item.classList.remove('active');
    });
    
    // 隐藏所有视图
    const views = ['mapView', 'addView', 'categoryView', 'tableView'];
    views.forEach(function(viewId) {
        const view = document.getElementById(viewId);
        if (view) {
            view.style.display = 'none';
        }
    });
    
    // 处理不同 Tab
    switch(tab) {
        case 'map':
            const mapView = document.getElementById('mapView');
            if (mapView) {
                mapView.style.display = 'flex';
            }
            tabItems[0].classList.add('active');
            break;
            
        case 'add':
            window.location.href = 'add-marker.html';
            break;
            
        case 'category':
            const categoryView = document.getElementById('categoryView');
            if (categoryView) {
                categoryView.style.display = 'block';
            }
            tabItems[2].classList.add('active');
            updateCategoryList();
            break;
            
        case 'table':
            const tableView = document.getElementById('tableView');
            if (tableView) {
                tableView.style.display = 'flex';
            }
            tabItems[3].classList.add('active');
            if (typeof refreshMarkers === 'function') {
                refreshMarkers();
            }
            break;
    }
}

// ==================== 地图初始化 ====================

function initMap() {
    console.log('初始化地图...');
    
    // 检查地图容器
    const mapContainer = document.getElementById('map');
    if (!mapContainer) {
        console.log('地图容器不存在，跳过地图初始化');
        return;
    }
    
    console.log('地图容器存在，检查 AMap...');
    
    // 检查 AMap 是否加载
    if (typeof AMap === 'undefined') {
        console.error('AMap 未加载');
        showStatus('地图加载失败，请刷新页面重试', 'error');
        return;
    }
    
    console.log('AMap 已加载，开始创建地图...');
    
    try {
        // 检测页面类型，设置不同的中心点
        const isAddMarkerPage = window.location.pathname.includes('add-marker.html');
        const centerPoint = isAddMarkerPage ? [114.057437, 22.538823] : [116.397428, 39.90923];
        
        console.log('创建地图，中心点:', centerPoint, '页面:', isAddMarkerPage ? 'add-marker.html' : 'index.html');
        
        map = new AMap.Map('map', {
            zoom: isAddMarkerPage ? 12 : 12,
            center: centerPoint
        });
        
        console.log('地图创建成功');
        
        // 加载插件并添加地图控件
        AMap.plugin(['AMap.Scale', 'AMap.ToolBar'], function() {
            map.addControl(new AMap.Scale());
            map.addControl(new AMap.ToolBar());
            console.log('地图控件添加完成');
        });
        
        // 加载已有标注
        loadMarkers();
        
        console.log('地图初始化完成');
    } catch (error) {
        console.error('地图初始化失败:', error);
        showStatus('地图初始化失败：' + error.message, 'error');
    }
}

// 加载标注
function loadMarkers() {
    const saved = localStorage.getItem('mapMarkers');
    if (saved) {
        const markerData = JSON.parse(saved);
        console.log('加载标注数据:', markerData.length, '个');
        markerData.forEach(data => {
            addMarkerToMap(data);
        });
    } else {
        console.log('没有保存的标注数据');
    }
}

// 添加标注到地图
function addMarkerToMap(data) {
    if (!map) {
        console.log('地图未初始化，跳过添加标记');
        return;
    }
    
    // 直接从 localStorage 获取最新分类数据
    const savedCategories = JSON.parse(localStorage.getItem('mapCategories') || '[]');
    const category = savedCategories.find(c => c.id === (data.category || 'default')) || 
                     (savedCategories.length > 0 ? savedCategories[0] : null);
    const categoryColor = category ? category.color : '#2196F3';
    const categoryName = category ? category.name : '默认分类';
    
    console.log('=== 添加标记详情 ===');
    console.log('标记名称:', data.name);
    console.log('标记分类 ID:', data.category);
    console.log('查找到的分类:', categoryName);
    console.log('分类颜色代码:', categoryColor);
    
    // 根据分类颜色创建不同颜色的标记
    let markerIcon;
    let iconType = '';
    
    // 理想充电站 - 橙色 (#FF9800)
    if (categoryColor === '#FF9800') {
        iconType = '橙色 (理想充电站)';
        markerIcon = new AMap.Icon({
            size: new AMap.Size(32, 32),
            image: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_orange.png',
            imageSize: new AMap.Size(32, 32)
        });
    // 小鹏充电站/蓝色 - 蓝色 (#2196F3 或 #3366CC)
    } else if (categoryColor === '#2196F3' || categoryColor === '#3366CC') {
        iconType = '蓝色 (小鹏充电站)';
        markerIcon = new AMap.Icon({
            size: new AMap.Size(32, 32),
            image: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_b.png',
            imageSize: new AMap.Size(32, 32)
        });
    // 充电站 - 绿色 (#4CAF50)
    } else if (categoryColor === '#4CAF50') {
        iconType = '绿色 (充电站)';
        markerIcon = new AMap.Icon({
            size: new AMap.Size(32, 32),
            image: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_g.png',
            imageSize: new AMap.Size(32, 32)
        });
    // 停车场 - 红色 (#f44336)
    } else if (categoryColor === '#f44336') {
        iconType = '红色 (停车场)';
        markerIcon = new AMap.Icon({
            size: new AMap.Size(32, 32),
            image: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_r.png',
            imageSize: new AMap.Size(32, 32)
        });
    } else {
        // 默认蓝色
        iconType = '默认蓝色';
        markerIcon = new AMap.Icon({
            size: new AMap.Size(32, 32),
            image: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_b.png',
            imageSize: new AMap.Size(32, 32)
        });
    }
    
    console.log('使用图标类型:', iconType);
    console.log('图标对象:', markerIcon);
    console.log('===================');
    
    const marker = new AMap.Marker({
        position: [data.lng, data.lat],
        title: data.name,
        icon: markerIcon,
        animation: 'AMAP_ANIMATION_DROP'
    });
    
    // 创建信息窗口内容
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
    console.log('✓ 标记添加成功:', data.name, '颜色:', iconType);
}

// ==================== 搜索功能 ====================

// 搜索地点
function searchPlace() {
    const input = document.getElementById('placeSearchInput');
    const keyword = input.value.trim();
    
    if (!keyword) {
        showStatus('请输入搜索关键词', 'error');
        return;
    }
    
    showStatus('正在搜索...', 'info');
    
    const url = `https://restapi.amap.com/v3/place/text?key=${AMAP_WEB_SERVICE_KEY}&keywords=${encodeURIComponent(keyword)}&offset=10&page=1&extensions=all`;
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.status === '1' && data.pois && data.pois.length > 0) {
                displayPlaceResults(data.pois);
                showStatus(`找到 ${data.pois.length} 个结果`, 'success');
            } else {
                showStatus('未找到相关地点', 'error');
                document.getElementById('placeSearchResults').innerHTML = '';
            }
        })
        .catch(error => {
            console.error('搜索失败:', error);
            showStatus('搜索失败：' + error.message, 'error');
        });
}

// 显示搜索结果
function displayPlaceResults(pois) {
    const container = document.getElementById('placeSearchResults');
    
    let html = '';
    pois.forEach((poi, index) => {
        const location = poi.location.split(',');
        const lng = parseFloat(location[0]);
        const lat = parseFloat(location[1]);
        
        html += `
            <div class="place-item" onclick="focusOnPlace(${lng}, ${lat}, '${poi.name}')">
                <h4>${poi.name}</h4>
                <p class="address">${poi.address || '暂无地址'}</p>
                <p style="font-size: 11px; color: #999;">${poi.type}</p>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// 聚焦到搜索地点
function focusOnPlace(lng, lat, name) {
    if (!map) return;
    
    if (searchResultMarker) {
        searchResultMarker.setMap(null);
    }
    
    searchResultMarker = new AMap.Marker({
        position: [lng, lat],
        title: name,
        icon: new AMap.Icon({
            size: new AMap.Size(32, 32),
            image: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_r.png',
            imageSize: new AMap.Size(32, 32)
        }),
        animation: 'AMAP_ANIMATION_DROP'
    });
    
    const infoWindow = new AMap.InfoWindow({
        content: `<div style="padding: 10px;"><h4 style="margin: 0;">${name}</h4><p style="margin: 5px 0 0 0; color: #666; font-size: 12px;">搜索结果</p></div>`,
        offset: new AMap.Pixel(0, -30)
    });
    
    searchResultMarker.on('click', function() {
        infoWindow.open(map, searchResultMarker.getPosition());
    });
    
    searchResultMarker.setMap(map);
    map.setCenter([lng, lat]);
    map.setZoom(16);
    infoWindow.open(map, [lng, lat]);
    
    showStatus(`已定位到：${name}`, 'success');
}

// ==================== 附近搜索功能 ====================

function searchNearby() {
    if (!map) {
        showStatus('地图尚未加载完成', 'error');
        return;
    }
    
    const radiusInput = document.getElementById('searchRadius');
    const radius = parseInt(radiusInput.value) || 1000;
    
    const center = map.getCenter();
    const centerLng = center.lng;
    const centerLat = center.lat;
    
    const allMarkers = JSON.parse(localStorage.getItem('mapMarkers') || '[]');
    
    const nearbyMarkers = [];
    allMarkers.forEach(marker => {
        const distance = calculateDistance(centerLat, centerLng, marker.lat, marker.lng);
        if (distance <= radius) {
            nearbyMarkers.push({
                ...marker,
                distance: distance
            });
        }
    });
    
    nearbyMarkers.sort((a, b) => a.distance - b.distance);
    
    showSearchCircle(centerLng, centerLat, radius);
    displaySearchResults(nearbyMarkers, radius);
    
    showStatus(`找到 ${nearbyMarkers.length} 个附近标注`, 'success');
}

function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function showSearchCircle(lng, lat, radius) {
    if (searchCircle) {
        searchCircle.setMap(null);
    }
    
    searchCircle = new AMap.Circle({
        center: [lng, lat],
        radius: radius,
        strokeColor: '#667eea',
        strokeWeight: 2,
        strokeOpacity: 0.8,
        fillColor: '#667eea',
        fillOpacity: 0.2
    });
    
    searchCircle.setMap(map);
}

function displaySearchResults(nearbyMarkers, radius) {
    const container = document.getElementById('searchResults');
    
    if (nearbyMarkers.length === 0) {
        container.innerHTML = '<div class="status info">范围内没有找到标注</div>';
        return;
    }
    
    const categoryCount = {};
    nearbyMarkers.forEach(marker => {
        const catId = marker.category || 'default';
        categoryCount[catId] = (categoryCount[catId] || 0) + 1;
    });
    
    let html = `<div style="margin-bottom: 10px; padding: 10px; background: #f5f5f5; border-radius: 8px;">
        <strong>搜索范围:</strong> ${radius}米<br>
        <strong>找到标注:</strong> ${nearbyMarkers.length}个
    </div>`;
    
    nearbyMarkers.forEach(marker => {
        const category = categories.find(c => c.id === (marker.category || 'default')) || categories[0];
        html += `
            <div class="result-item" onclick="focusOnMarker('${marker.id}')">
                <h4>${marker.name}</h4>
                <p>${marker.address || '暂无地址'}</p>
                <p>
                    <span class="marker-category-badge" style="background: ${category.color}">${category.name}</span>
                    <span class="distance">${marker.distance.toFixed(0)}米</span>
                </p>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function focusOnMarker(markerId) {
    const allMarkers = JSON.parse(localStorage.getItem('mapMarkers') || '[]');
    const markerData = allMarkers.find(m => m.id === markerId);
    
    if (markerData && map) {
        map.setCenter([markerData.lng, markerData.lat]);
        map.setZoom(17);
        
        const markerObj = markers.find(m => m.data.id === markerId);
        if (markerObj) {
            markerObj.marker.emit('click');
        }
    }
}

// ==================== 定位功能 ====================

function locateMe() {
    showStatus('正在定位...', 'info');
    
    if (!navigator.geolocation) {
        showStatus('您的浏览器不支持地理定位', 'error');
        return;
    }
    
    navigator.geolocation.getCurrentPosition(
        function(position) {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            
            if (map) {
                map.setCenter([lng, lat]);
                map.setZoom(16);
                
                const locationMarker = new AMap.Marker({
                    position: [lng, lat],
                    title: '我的位置',
                    icon: new AMap.Icon({
                        size: new AMap.Size(24, 24),
                        image: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_b.png',
                        imageSize: new AMap.Size(24, 24)
                    })
                });
                locationMarker.setMap(map);
                
                showStatus('定位成功', 'success');
            }
        },
        function(error) {
            console.error('定位失败:', error);
            showStatus('定位失败：' + error.message, 'error');
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}

// ==================== 标注管理功能 ====================

function clearAllMarkers() {
    if (!confirm('确定要清空所有标注吗？此操作不可恢复。')) {
        return;
    }
    
    localStorage.removeItem('mapMarkers');
    
    markers.forEach(m => m.marker.setMap(null));
    markers = [];
    
    showStatus('所有标注已清空', 'success');
}

// ==================== 表格功能 ====================

function refreshMarkers() {
    const tbody = document.getElementById('markersTableBody');
    const noMarkersMessage = document.getElementById('noMarkersMessage');
    
    if (!tbody) return;
    
    const allMarkers = JSON.parse(localStorage.getItem('mapMarkers') || '[]');
    
    if (allMarkers.length === 0) {
        tbody.innerHTML = '';
        noMarkersMessage.style.display = 'block';
        return;
    }
    
    noMarkersMessage.style.display = 'none';
    
    let html = '';
    allMarkers.forEach(marker => {
        const category = categories.find(c => c.id === (marker.category || 'default')) || categories[0];
        html += `
            <tr>
                <td style="text-align: center;"><input type="checkbox" class="marker-checkbox" value="${marker.id}" onchange="updateBatchDelete()"></td>
                <td>${marker.id}</td>
                <td>${marker.name}</td>
                <td><span class="marker-category-badge" style="background: ${category.color}">${category.name}</span></td>
                <td>${marker.address || '-'}</td>
                <td>${marker.lat.toFixed(6)}, ${marker.lng.toFixed(6)}</td>
                <td>${marker.createdAt ? new Date(marker.createdAt).toLocaleString() : '-'}</td>
                <td>
                    <div class="action-btns">
                        <button class="btn-view" onclick="viewMarker('${marker.id}')">查看</button>
                        <button class="btn-delete-small" onclick="deleteMarker('${marker.id}')">删除</button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
    updateMarkerStats();
}

function updateMarkerStats() {
    const statsContainer = document.getElementById('markerStats');
    if (!statsContainer) return;
    
    const allMarkers = JSON.parse(localStorage.getItem('mapMarkers') || '[]');
    
    const categoryCount = {};
    allMarkers.forEach(marker => {
        const catId = marker.category || 'default';
        categoryCount[catId] = (categoryCount[catId] || 0) + 1;
    });
    
    let html = `<p><strong>总标注数:</strong> ${allMarkers.length}</p>`;
    categories.forEach(cat => {
        const count = categoryCount[cat.id] || 0;
        html += `<p style="margin-top: 8px;"><span style="display: inline-block; width: 12px; height: 12px; background: ${cat.color}; border-radius: 50%; margin-right: 5px;"></span>${cat.name}: ${count}</p>`;
    });
    
    statsContainer.innerHTML = html;
}

function viewMarker(markerId) {
    switchTab('map');
    setTimeout(() => focusOnMarker(markerId), 100);
}

function deleteMarker(markerId) {
    if (!confirm('确定要删除这个标注吗？')) {
        return;
    }
    
    let allMarkers = JSON.parse(localStorage.getItem('mapMarkers') || '[]');
    allMarkers = allMarkers.filter(m => m.id !== markerId);
    localStorage.setItem('mapMarkers', JSON.stringify(allMarkers));
    
    refreshMarkers();
    
    if (document.getElementById('mapView').style.display !== 'none') {
        markers.forEach(m => m.marker.setMap(null));
        markers = [];
        loadMarkers();
    }
    
    showStatus('标注已删除', 'success');
}

function toggleSelectAll() {
    const selectAll = document.getElementById('selectAll');
    const checkboxes = document.querySelectorAll('.marker-checkbox');
    checkboxes.forEach(cb => cb.checked = selectAll.checked);
    updateBatchDelete();
}

function updateBatchDelete() {
    const checkedBoxes = document.querySelectorAll('.marker-checkbox:checked');
    const btn = document.getElementById('batchDeleteBtn');
    if (btn) {
        btn.textContent = `批量删除 (${checkedBoxes.length})`;
    }
}

function batchDeleteMarkers() {
    const checkedBoxes = document.querySelectorAll('.marker-checkbox:checked');
    if (checkedBoxes.length === 0) {
        showStatus('请先选择要删除的标注', 'error');
        return;
    }
    
    if (!confirm(`确定要删除选中的 ${checkedBoxes.length} 个标注吗？`)) {
        return;
    }
    
    const idsToDelete = Array.from(checkedBoxes).map(cb => cb.value);
    
    let allMarkers = JSON.parse(localStorage.getItem('mapMarkers') || '[]');
    allMarkers = allMarkers.filter(m => !idsToDelete.includes(m.id));
    localStorage.setItem('mapMarkers', JSON.stringify(allMarkers));
    
    refreshMarkers();
    
    if (document.getElementById('mapView').style.display !== 'none') {
        markers.forEach(m => m.marker.setMap(null));
        markers = [];
        loadMarkers();
    }
    
    showStatus(`已删除 ${idsToDelete.length} 个标注`, 'success');
}

function exportMarkers() {
    const allMarkers = JSON.parse(localStorage.getItem('mapMarkers') || '[]');
    if (allMarkers.length === 0) {
        showStatus('没有可导出的标注', 'error');
        return;
    }
    
    const dataStr = JSON.stringify(allMarkers, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `map-markers-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showStatus('标注已导出', 'success');
}

function filterTableByCategory() {
    refreshMarkers();
}

function filterTableBySearch() {
    refreshMarkers();
}

// ==================== 工具函数 ====================

function showStatus(message, type) {
    const statusDiv = document.getElementById('locationStatus');
    if (!statusDiv) return;
    
    statusDiv.className = `status ${type}`;
    statusDiv.textContent = message;
    statusDiv.style.display = 'flex';
    
    setTimeout(() => {
        statusDiv.style.display = 'none';
    }, 3000);
}

// ==================== 页面初始化 ====================

function initApp() {
    console.log('应用初始化...');
    
    loadCategories();
    initMap();
    
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('view') === 'table') {
        switchTab('table');
    } else if (urlParams.get('view') === 'category') {
        switchTab('category');
    }
    
    if (document.getElementById('categorySelect') && typeof updateAddMarkerCategorySelect === 'function') {
        updateAddMarkerCategorySelect();
    }
    if (document.getElementById('categoryList') && typeof updateCategoryList === 'function') {
        updateCategoryList();
    }
    
    console.log('应用初始化完成，地图状态:', map ? '已初始化' : '未初始化');
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOMContentLoaded 事件触发');
    initApp();
});

if (document.readyState === 'complete' || document.readyState === 'interactive') {
    console.log('DOM 已加载，立即初始化');
    setTimeout(initApp, 100);
}

// ==================== 批量添加充电站功能 ====================

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
    { name: '小鹏充电站 宝安壹方城', lat: 22.552141, lng: 113.887684, address: '宝安区新安街道新湖路 99 号' },
    { name: '小鹏充电站 宝安海雅缤纷城', lat: 22.558146, lng: 113.874531, address: '宝安区新安街道建安一路 99 号' },
    { name: '小鹏充电站 宝安欢乐港湾', lat: 22.559677, lng: 113.878939, address: '宝安区宝兴路欢乐港湾' },
    { name: '小鹏充电站 宝安大仟里', lat: 22.601817, lng: 113.869338, address: '宝安区西乡街道海城路 3 号' },
    { name: '小鹏充电站 宝安中粮大悦城', lat: 22.540712, lng: 113.839603, address: '宝安区新安街道创业二路与新安一路交汇处' },
    { name: '小鹏充电站 南山万象天地', lat: 22.541645, lng: 113.944387, address: '南山区深南大道 9668 号' },
    { name: '小鹏充电站 南山海岸城', lat: 22.518903, lng: 113.936347, address: '南山区文心五路 33 号' },
    { name: '小鹏充电站 南山深圳湾万象城', lat: 22.518347, lng: 113.944213, address: '南山区科苑南路 2888 号' },
    { name: '小鹏充电站 福田星河 COCO Park', lat: 22.538823, lng: 114.057437, address: '福田区福华三路 268 号' },
    { name: '小鹏充电站 福田皇庭广场', lat: 22.533456, lng: 114.057437, address: '福田区福华三路 118 号' }
];

function batchAddIdealChargingStations() {
    console.log('=== 开始批量添加理想充电站 ===');
    
    // 先从 localStorage 获取最新分类
    const savedCategories = JSON.parse(localStorage.getItem('mapCategories') || '[]');
    let idealCategory = savedCategories.find(c => c.name === '理想充电站');
    
    if (!idealCategory) {
        idealCategory = {
            id: 'ideal_charging_' + Date.now(),
            name: '理想充电站',
            color: '#FF9800',
            isDefault: false
        };
        categories.push(idealCategory);
        saveCategories();
        console.log('创建理想充电站分类:', idealCategory);
    } else {
        console.log('使用已存在的理想充电站分类:', idealCategory);
    }
    
    let allMarkers = JSON.parse(localStorage.getItem('mapMarkers') || '[]');
    let addedCount = 0;
    let skippedCount = 0;
    
    IDEAL_CHARGING_STATIONS.forEach(station => {
        const exists = allMarkers.some(m => 
            Math.abs(m.lat - station.lat) < 0.0001 && 
            Math.abs(m.lng - station.lng) < 0.0001
        );
        
        if (!exists) {
            const newMarker = {
                id: 'marker_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                name: station.name,
                address: station.address,
                lat: station.lat,
                lng: station.lng,
                category: idealCategory.id,
                description: '理想汽车充电站',
                createdAt: new Date().toISOString()
            };
            
            allMarkers.push(newMarker);
            addedCount++;
            console.log('添加理想充电站:', station.name, '分类 ID:', idealCategory.id, '颜色:', idealCategory.color);
        } else {
            skippedCount++;
            console.log('跳过已存在的充电站:', station.name);
        }
    });
    
    localStorage.setItem('mapMarkers', JSON.stringify(allMarkers));
    
    if (map) {
        markers.forEach(m => m.marker.setMap(null));
        markers = [];
        loadMarkers();
    }
    
    alert(`批量添加完成！\n成功添加：${addedCount} 个\n跳过重复：${skippedCount} 个`);
    
    if (typeof updateCategoryList === 'function') {
        updateCategoryList();
    }
    
    console.log('=== 理想充电站批量添加完成 ===');
}

function batchAddXpengChargingStations() {
    console.log('=== 开始批量添加小鹏充电站 ===');
    
    // 先从 localStorage 获取最新分类
    const savedCategories = JSON.parse(localStorage.getItem('mapCategories') || '[]');
    let xpengCategory = savedCategories.find(c => c.name === '小鹏充电站');
    
    if (!xpengCategory) {
        xpengCategory = {
            id: 'xpeng_charging_' + Date.now(),
            name: '小鹏充电站',
            color: '#2196F3',
            isDefault: false
        };
        categories.push(xpengCategory);
        saveCategories();
        console.log('创建小鹏充电站分类:', xpengCategory);
    } else {
        console.log('使用已存在的小鹏充电站分类:', xpengCategory);
    }
    
    let allMarkers = JSON.parse(localStorage.getItem('mapMarkers') || '[]');
    let addedCount = 0;
    let skippedCount = 0;
    
    XPENG_CHARGING_STATIONS.forEach(station => {
        const exists = allMarkers.some(m => 
            Math.abs(m.lat - station.lat) < 0.0001 && 
            Math.abs(m.lng - station.lng) < 0.0001
        );
        
        if (!exists) {
            const newMarker = {
                id: 'marker_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                name: station.name,
                address: station.address,
                lat: station.lat,
                lng: station.lng,
                category: xpengCategory.id,
                description: '小鹏汽车充电站',
                createdAt: new Date().toISOString()
            };
            
            allMarkers.push(newMarker);
            addedCount++;
            console.log('添加小鹏充电站:', station.name, '分类 ID:', xpengCategory.id, '颜色:', xpengCategory.color);
        } else {
            skippedCount++;
            console.log('跳过已存在的充电站:', station.name);
        }
    });
    
    localStorage.setItem('mapMarkers', JSON.stringify(allMarkers));
    
    if (map) {
        markers.forEach(m => m.marker.setMap(null));
        markers = [];
        loadMarkers();
    }
    
    alert(`批量添加完成！\n成功添加：${addedCount} 个\n跳过重复：${skippedCount} 个`);
    
    if (typeof updateCategoryList === 'function') {
        updateCategoryList();
    }
    
    console.log('=== 小鹏充电站批量添加完成 ===');
}

function clearAllData() {
    if (!confirm('确定要清空所有数据吗？此操作不可恢复！')) {
        return;
    }
    
    localStorage.removeItem('mapMarkers');
    localStorage.removeItem('mapCategories');
    
    if (markers) {
        markers.forEach(m => {
            if (m.marker) m.marker.setMap(null);
        });
    }
    markers = [];
    
    categories = [];
    initDefaultCategories();
    
    alert('所有数据已清空！');
    
    location.reload();
}
