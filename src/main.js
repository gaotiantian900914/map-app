/**
 * 地图标注工具 - 主入口文件
 * 统一管理和调度所有模块
 */

import { initCloudBase } from './storage-service.js';
import { initCategories, getCategories, getCategoryName, getCategoryColor, renderCategoryTable, openCategoryModal, closeCategoryModal, selectColor, saveCategoryFromModal, deleteCategoryById, updateCategoryFilter } from './category-service.js';
import { initMarkers, getMarkers, addMarker as createMarker, deleteMarker as removeMarker, deleteMarkersBatch, searchMarkers, exportMarkers, clearAllMarkers as removeAllMarkers } from './marker-service.js';
import { initMap, getMap, displayMarker, fitMapToMarkers as fitView, setMapCenter, focusOnMarker as focusMarker, drawSearchCircle, clearMapMarkers } from './map-service.js';
import { searchPlace, searchNearbyMarkers } from './search-service.js';
import { showStatus, updateMarkerStats, highlightMarkerInList, showNearbyResults, renderMarkersTable, updateMarkerStatsPanel, updateBatchDeleteButton, switchTab } from './ui-service.js';
import { exportToCSV, isValidCoordinate } from './utils.js';

let currentPosition = null;
let searchCircle = null;
let searchTempMarker = null;

async function initializeApp() {
    setTimeout(async function() {
        try {
            await initCloudBase();

            initCategories();

            await initMap('map', {
                zoom: 12,
                center: [114.057868, 22.542896]
            });

            await initMarkers();

            const categories = getCategories();
            const markers = getMarkers();

            markers.forEach(function(marker) {
                const category = categories.find(c => c.id === marker.categoryId);
                const categoryName = category ? category.name : '默认分类';

                displayMarker(marker, {
                    categoryName: categoryName,
                    onClick: function(markerData) {
                        console.log('点击标记:', markerData.name);
                    }
                });
            });

            updateMarkerStats(markers.length, categories.length);
            updateCategoryFilter();

            showStatus('地图加载完成，可以开始搜索', 'success');

        } catch (error) {
            console.error('应用初始化失败:', error);
            showStatus('应用初始化失败：' + error.message, 'error');
        }
    }, 500);
}

function refreshAllUI() {
    const categories = getCategories();
    const markers = getMarkers();

    updateMarkerStats(markers.length, categories.length);
    renderMarkersTable(markers, getCategoryName, getCategoryColor);
    updateMarkerStatsPanel(markers, categories);
    updateCategoryFilter();
}

function reloadMapMarkers() {
    clearMapMarkers();
    const markers = getMarkers();
    const categories = getCategories();
    markers.forEach(function(marker) {
        const category = categories.find(c => c.id === marker.categoryId);
        const categoryName = category ? category.name : '默认分类';
        displayMarker(marker, { categoryName: categoryName });
    });
}

window.searchPlace = async function() {
    const input = document.getElementById('placeSearchInput');
    if (!input || !input.value.trim()) {
        showStatus('请输入搜索关键词', 'error');
        return;
    }

    const keyword = input.value.trim();
    const statusDiv = document.getElementById('locationStatus');
    const resultsDiv = document.getElementById('placeSearchResults');

    if (statusDiv) statusDiv.innerHTML = '<p style="color: #2196F3;">正在搜索...</p>';

    try {
        const results = await searchPlace(keyword);
        if (results && results.length > 0) {
            const poi = results[0];
            setMapCenter(poi.lng, poi.lat, 16);

            if (resultsDiv) {
                let html = '';
                results.forEach(function(p, index) {
                    html += '<div style="padding: 10px; border-bottom: 1px solid #eee; cursor: pointer; transition: background 0.2s;"' +
                        ' onmouseover="this.style.background=\'#f0f0f0\'" onmouseout="this.style.background=\'white\'"' +
                        ' onclick="window.selectSearchResult(' + p.lng + ', ' + p.lat + ', \'' + p.name.replace(/'/g, "\\'") + '\')">' +
                        '<h4 style="margin: 0; font-size: 14px;">' + (index + 1) + '. ' + p.name + '</h4>' +
                        '<p style="margin: 5px 0 0 0; color: #666; font-size: 12px;">' + (p.address || '暂无地址') + '</p>' +
                        '</div>';
                });
                resultsDiv.innerHTML = html;
            }

            if (statusDiv) statusDiv.innerHTML = '<p style="color: #4CAF50;">找到 ' + results.length + ' 个结果，点击选择要标注的位置</p>';
        }
    } catch (error) {
        if (statusDiv) statusDiv.innerHTML = '<p style="color: #f44336;">' + error.message + '</p>';
    }
};

window.selectSearchResult = function(lng, lat, name) {
    const map = getMap();
    if (!map) return;

    map.setCenter([lng, lat]);
    map.setZoom(17);

    if (searchTempMarker) {
        searchTempMarker.setMap(null);
    }

    searchTempMarker = new AMap.Marker({
        map: map,
        position: [lng, lat],
        title: name,
        offset: new AMap.Pixel(-16, -32)
    });

    const infoContent = '<div style="padding: 8px; min-width: 150px;">' +
        '<h4 style="margin: 0 0 5px 0; color: #333; font-size: 14px;">' + name + '</h4>' +
        '<p style="margin: 0; color: #999; font-size: 12px;">点击"添加标注"保存此位置</p>' +
        '</div>';

    const infoWindow = new AMap.InfoWindow({
        content: infoContent,
        offset: new AMap.Pixel(0, -30)
    });

    infoWindow.open(map, searchTempMarker.getPosition());
};

window.locateMe = function() {
    const geolocation = window.amapGeolocation;
    if (!geolocation) {
        showStatus('定位服务未初始化', 'error');
        return;
    }

    const statusDiv = document.getElementById('locationStatus');
    if (statusDiv) statusDiv.innerHTML = '<p style="color: #2196F3;">正在定位...</p>';

    geolocation.getCurrentPosition(function(status, result) {
        if (status === 'complete') {
            currentPosition = result.position;
            setMapCenter(currentPosition.lng, currentPosition.lat, 16);
            if (statusDiv) statusDiv.innerHTML = '<p style="color: #4CAF50;">定位成功</p>';
        } else {
            if (statusDiv) statusDiv.innerHTML = '<p style="color: #f44336;">定位失败：' + result.message + '</p>';
        }
    });
};

window.searchNearby = function() {
    const radiusInput = document.getElementById('searchRadius');
    if (!radiusInput) return;

    const radius = parseInt(radiusInput.value) || 1000;

    const map = getMap();
    if (!map) return;

    const center = map.getCenter();
    const centerLat = center.getLat();
    const centerLng = center.getLng();

    if (searchCircle) {
        searchCircle.setMap(null);
    }

    searchCircle = drawSearchCircle(centerLng, centerLat, radius);

    const markers = getMarkers();
    const nearby = searchNearbyMarkers(markers, centerLat, centerLng, radius);

    showNearbyResults(nearby, radius, getCategoryName, getCategoryColor);
    showStatus('找到 ' + nearby.length + ' 个附近标注', 'success');
};

window.clearAllMarkers = function() {
    if (!confirm('确定要清空所有标注吗？此操作不可恢复！')) {
        return;
    }

    removeAllMarkers();
    clearMapMarkers();
    refreshAllUI();
    showStatus('所有标注已清空', 'success');
};

window.addMarkerFromInput = function(name, description, lat, lng, categoryId) {
    if (!name || !isValidCoordinate(lat, lng)) {
        showStatus('标注信息不完整', 'error');
        return false;
    }

    try {
        const marker = createMarker({ name, description, lat, lng, categoryId });

        const categories = getCategories();
        const category = categories.find(c => c.id === categoryId);
        const categoryName = category ? category.name : '默认分类';

        displayMarker(marker, { categoryName: categoryName });
        refreshAllUI();

        showStatus('标注添加成功', 'success');
        return true;
    } catch (error) {
        showStatus('添加标记失败：' + error.message, 'error');
        return false;
    }
};

window.deleteMarker = function(markerId, event) {
    if (event) {
        event.stopPropagation();
    }

    if (!confirm('确定要删除这个标注吗？')) {
        return;
    }

    if (removeMarker(markerId)) {
        reloadMapMarkers();
        refreshAllUI();
        showStatus('标注已删除', 'success');
    }
};

window.focusOnMarker = function(lng, lat, markerId) {
    focusMarker(lng, lat, markerId);
    highlightMarkerInList(markerId);
};

window.fitMapToMarkers = function() {
    const markers = getMarkers();
    fitView(markers);
};

window.exportMarkers = function() {
    const data = exportMarkers();
    if (data.length === 0) {
        showStatus('没有可导出的标注', 'error');
        return;
    }
    exportToCSV(data, '标注记录_' + new Date().toISOString().slice(0, 10) + '.csv');
    showStatus('标注数据导出成功', 'success');
};

window.switchTab = function(tab) {
    switchTab(tab);

    if (tab === 'category') {
        renderCategoryTable();
    } else if (tab === 'table') {
        const markers = getMarkers();
        const categories = getCategories();
        renderMarkersTable(markers, getCategoryName, getCategoryColor);
        updateMarkerStatsPanel(markers, categories);
    }
};

window.openCategoryModal = function() {
    openCategoryModal();
};

window.editCategory = function(categoryId) {
    openCategoryModal(categoryId);
};

window.closeCategoryModal = function() {
    closeCategoryModal();
};

window.selectColor = function(color, element) {
    selectColor(color, element);
};

window.saveCategory = function() {
    saveCategoryFromModal();
    reloadMapMarkers();
    refreshAllUI();
};

window.deleteCategoryById = function(categoryId) {
    deleteCategoryById(categoryId);
    reloadMapMarkers();
    refreshAllUI();
};

window.filterCategories = function() {
    renderCategoryTable();
};

window.filterTableByCategory = function() {
    const filterSelect = document.getElementById('categoryFilter');
    const categoryId = filterSelect ? filterSelect.value : 'all';

    let filtered;
    if (categoryId === 'all') {
        filtered = getMarkers();
    } else {
        filtered = searchMarkers({ categoryId: categoryId });
    }

    renderMarkersTable(filtered, getCategoryName, getCategoryColor);
};

window.filterTableBySearch = function() {
    const searchInput = document.getElementById('tableSearchInput');
    const keyword = searchInput ? searchInput.value.trim() : '';

    const filterSelect = document.getElementById('categoryFilter');
    const categoryId = filterSelect ? filterSelect.value : 'all';

    const criteria = {};
    if (keyword) criteria.keyword = keyword;
    if (categoryId !== 'all') criteria.categoryId = categoryId;

    let filtered;
    if (Object.keys(criteria).length > 0) {
        filtered = searchMarkers(criteria);
    } else {
        filtered = getMarkers();
    }

    renderMarkersTable(filtered, getCategoryName, getCategoryColor);
};

window.refreshMarkers = function() {
    reloadMapMarkers();
    refreshAllUI();
    showStatus('标注已刷新', 'success');
};

window.batchDeleteMarkers = function() {
    const checked = document.querySelectorAll('.marker-checkbox:checked');
    if (checked.length === 0) {
        showStatus('请先选择要删除的标注', 'error');
        return;
    }

    if (!confirm('确定要删除选中的 ' + checked.length + ' 个标注吗？')) {
        return;
    }

    const ids = [];
    checked.forEach(function(cb) {
        ids.push(cb.dataset.id);
    });

    deleteMarkersBatch(ids);
    reloadMapMarkers();
    refreshAllUI();
    showStatus('已删除 ' + ids.length + ' 个标注', 'success');
};

window.toggleSelectAll = function() {
    const selectAll = document.getElementById('selectAll');
    const checkboxes = document.querySelectorAll('.marker-checkbox');

    checkboxes.forEach(function(cb) {
        cb.checked = selectAll.checked;
    });

    updateBatchDeleteButton();
};

document.addEventListener('change', function(e) {
    if (e.target.classList.contains('marker-checkbox')) {
        updateBatchDeleteButton();
    }
});

if (document.readyState === 'complete') {
    initializeApp();
} else {
    window.addEventListener('load', initializeApp);
}

export { initializeApp };
