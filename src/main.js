/**
 * 地图标注工具 - 主入口文件
 * 统一管理和调度所有模块
 */

// 导入所有服务
import { initCloudBase, isCloudEnabled } from './storage-service.js';
import { initCategories, getCategories, getCategoryName, getCategoryColor } from './category-service.js';
import { initMarkers, getMarkers, addMarker, deleteMarker, searchMarkers, exportMarkers } from './marker-service.js';
import { initMap, getMap, displayMarker, reloadMarkers, fitMapToMarkers, setMapCenter, focusOnMarker, drawSearchCircle, clearMapMarkers } from './map-service.js';
import { searchPlace, searchNearbyMarkers } from './search-service.js';
import { showStatus, updateMarkersList, updateCategorySelect, updateMarkerStats, highlightMarkerInList, showNearbyResults, switchTab } from './ui-service.js';
import { exportToCSV, formatDistance, isValidCoordinate } from './utils.js';

// 全局状态
let currentPosition = null;
let searchCircle = null;
let isPinningMode = false;

/**
 * 初始化应用
 */
async function initializeApp() {
    console.log('initializeApp 被调用');
    
    setTimeout(async function() {
        try {
            console.log('开始初始化应用...');
            
            // 1. 初始化云开发（可选）
            await initCloudBase();
            
            // 2. 加载分类
            initCategories();
            
            // 3. 初始化地图
            const { map, placeSearch, geolocation } = await initMap('map', {
                zoom: 12,
                center: [114.057868, 22.542896]
            });
            
            // 4. 加载标记
            await initMarkers();
            
            // 5. 显示标记在地图上
            const categories = getCategories();
            const markers = getMarkers();
            
            markers.forEach(function(marker) {
                const category = categories.find(c => c.id === marker.categoryId);
                const categoryName = category ? category.name : '默认';
                
                displayMarker(marker, {
                    categoryName: categoryName,
                    onClick: function(markerData) {
                        console.log('点击标记:', markerData.name);
                    }
                });
            });
            
            // 6. 更新 UI
            updateMarkerStats(markers.length, categories.length);
            updateMarkersList(
                markers,
                getCategoryName,
                getCategoryColor,
                window.focusOnMarker,
                window.deleteMarker
            );
            
            console.log('应用初始化完成');
            showStatus('地图加载完成，可以开始搜索', 'success');
            
        } catch (error) {
            console.error('应用初始化失败:', error);
            showStatus('应用初始化失败：' + error.message, 'error');
        }
    }, 500);
}

// ==================== 全局函数（供 HTML 调用）====================

/**
 * 搜索地点
 */
window.searchPlace = async function() {
    const input = document.getElementById('placeSearchInput');
    if (!input || !input.value.trim()) {
        showStatus('请输入搜索关键词', 'error');
        return;
    }
    
    const keyword = input.value.trim();
    
    try {
        const results = await searchPlace(keyword);
        if (results && results.length > 0) {
            const poi = results[0];
            setMapCenter(poi.lng, poi.lat, 16);
            showStatus('搜索成功：' + poi.name, 'success');
        }
    } catch (error) {
        console.error('搜索失败:', error);
        showStatus(error.message, 'error');
    }
};

/**
 * 定位我的位置
 */
window.locateMyPosition = function() {
    const geolocation = window.amapGeolocation;
    if (!geolocation) {
        showStatus('定位服务未初始化', 'error');
        return;
    }
    
    showStatus('正在定位...', 'info');
    
    geolocation.getCurrentPosition(function(status, result) {
        if (status === 'complete') {
            currentPosition = result.position;
            setMapCenter(currentPosition.lng, currentPosition.lat, 16);
            showStatus('定位成功', 'success');
        } else {
            showStatus('定位失败：' + result.message, 'error');
        }
    });
};

/**
 * 搜索附近标记
 */
window.searchNearbyMarkers = function() {
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
    searchCircle = drawSearchCircle(currentPosition.lng, currentPosition.lat, radius);
    
    // 搜索范围内的标记
    const markers = getMarkers();
    const nearbyMarkers = searchNearbyMarkers(markers, currentPosition.lat, currentPosition.lng, radius);
    
    // 显示结果
    showNearbyResults(nearbyMarkers, radius, getCategoryName, getCategoryColor);
    showStatus('找到 ' + nearbyMarkers.length + ' 个附近标注', 'success');
};

/**
 * 添加标记
 */
window.addMarker = function(name, description, lat, lng, categoryId) {
    if (!name || !isValidCoordinate(lat, lng)) {
        showStatus('标注信息不完整', 'error');
        return false;
    }
    
    try {
        const marker = addMarker(name, description, lat, lng, categoryId);
        
        // 显示在地图上
        const categories = getCategories();
        const category = categories.find(c => c.id === categoryId);
        const categoryName = category ? category.name : '默认';
        
        displayMarker(marker, { categoryName: categoryName });
        
        // 更新 UI
        updateMarkersList(
            getMarkers(),
            getCategoryName,
            getCategoryColor,
            window.focusOnMarker,
            window.deleteMarker
        );
        updateMarkerStats(getMarkers().length, getCategories().length);
        
        showStatus('标注添加成功', 'success');
        return true;
    } catch (error) {
        console.error('添加标记失败:', error);
        showStatus('添加标记失败：' + error.message, 'error');
        return false;
    }
};

/**
 * 删除标记
 */
window.deleteMarker = function(markerId, event) {
    if (event) {
        event.stopPropagation();
    }
    
    if (!confirm('确定要删除这个标注吗？')) {
        return;
    }
    
    if (deleteMarker(markerId)) {
        // 清除地图上的所有标记
        clearMapMarkers();
        
        // 重新加载所有标记
        const markers = getMarkers();
        const categories = getCategories();
        
        markers.forEach(function(marker) {
            const category = categories.find(c => c.id === marker.categoryId);
            const categoryName = category ? category.name : '默认';
            displayMarker(marker, { categoryName: categoryName });
        });
        
        // 更新 UI
        updateMarkersList(
            markers,
            getCategoryName,
            getCategoryColor,
            window.focusOnMarker,
            window.deleteMarker
        );
        updateMarkerStats(markers.length, categories.length);
        
        showStatus('标注已删除', 'success');
    }
};

/**
 * 聚焦到标记
 */
window.focusOnMarker = function(lng, lat, markerId) {
    const markers = getMarkers();
    const markerItem = window.currentMarkersMap ? window.currentMarkersMap[markerId] : null;
    focusOnMarker(lng, lat, markerId, markerItem);
    highlightMarkerInList(markerId);
};

/**
 * 调整地图视图
 */
window.fitMapToMarkers = function() {
    const markers = getMarkers();
    fitMapToMarkers(markers);
};

/**
 * 导出 CSV
 */
window.exportToCSV = function() {
    const markers = exportMarkers();
    exportToCSV(markers, '标注记录_' + new Date().toISOString().slice(0, 10) + '.csv');
    showStatus('标注数据导出成功', 'success');
};

/**
 * 切换 Tab
 */
window.switchTab = function(tabName) {
    switchTab(tabName);
};

/**
 * 批量添加理想充电站
 */
window.batchAddIdealChargingStations = function() {
    console.log('开始批量添加理想充电站...');
    showStatus('正在批量添加理想充电站...', 'info');
    
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
    
    const categories = getCategories();
    const chargingCategory = categories.find(c => c.name === '充电站' || c.name === '充电桩');
    const categoryId = chargingCategory ? chargingCategory.id : 'default';
    
    let addedCount = 0;
    
    chargingStations.forEach(function(station, index) {
        setTimeout(function() {
            try {
                const marker = addMarker(station.name, '理想汽车充电站 - ' + station.district, station.lat, station.lng, categoryId);
                
                const category = categories.find(c => c.id === categoryId);
                const categoryName = category ? category.name : '默认';
                displayMarker(marker, { categoryName: categoryName });
                
                addedCount++;
                
                if (addedCount === chargingStations.length) {
                    updateMarkersList(
                        getMarkers(),
                        getCategoryName,
                        getCategoryColor,
                        window.focusOnMarker,
                        window.deleteMarker
                    );
                    updateMarkerStats(getMarkers().length, categories.length);
                    showStatus('成功添加 ' + addedCount + ' 个理想充电站', 'success');
                    setTimeout(function() {
                        fitMapToMarkers();
                    }, 500);
                }
            } catch (error) {
                console.error('添加充电站失败:', error);
            }
        }, index * 100);
    });
};

/**
 * 批量添加小鹏充电站
 */
window.batchAddXiaopengChargingStations = function() {
    console.log('开始批量添加小鹏充电站...');
    showStatus('正在批量添加小鹏充电站...', 'info');
    
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
    
    const categories = getCategories();
    const chargingCategory = categories.find(c => c.name === '充电站' || c.name === '充电桩');
    const categoryId = chargingCategory ? chargingCategory.id : 'default';
    
    let addedCount = 0;
    
    chargingStations.forEach(function(station, index) {
        setTimeout(function() {
            try {
                const marker = addMarker(station.name, '小鹏汽车充电站 - ' + station.district, station.lat, station.lng, categoryId);
                
                const category = categories.find(c => c.id === categoryId);
                const categoryName = category ? category.name : '默认';
                displayMarker(marker, { categoryName: categoryName });
                
                addedCount++;
                
                if (addedCount === chargingStations.length) {
                    updateMarkersList(
                        getMarkers(),
                        getCategoryName,
                        getCategoryColor,
                        window.focusOnMarker,
                        window.deleteMarker
                    );
                    updateMarkerStats(getMarkers().length, categories.length);
                    showStatus('成功添加 ' + addedCount + ' 个小鹏充电站', 'success');
                    setTimeout(function() {
                        fitMapToMarkers();
                    }, 500);
                }
            } catch (error) {
                console.error('添加充电站失败:', error);
            }
        }, index * 100);
    });
};

// ==================== 初始化 ====================

// 确保在 window.onload 后初始化（所有外部脚本加载完成后）
if (document.readyState === 'complete') {
    initializeApp();
} else {
    window.addEventListener('load', initializeApp);
}

// 导出给其他模块使用
export { initializeApp };
