/**
 * 地图标注工具 - 主入口文件
 * 统一管理和调度所有模块
 */

import { initCloudBase } from './storage-service.js';
import { initCategories, getCategories, getCategoryName, getCategoryColor, renderCategoryTable, openCategoryModal, closeCategoryModal, selectColor, saveCategoryFromModal, deleteCategoryById as removeCategoryById, updateCategoryFilter } from './category-service.js';
import { initMarkers, getMarkers, addMarker as createMarker, deleteMarker as removeMarker, deleteMarkersBatch, searchMarkers, exportMarkers } from './marker-service.js';
import { initMap, getMap, displayMarker, fitMapToMarkers as fitView, setMapCenter, focusOnMarker as focusMarker, drawSearchCircle, clearMapMarkers } from './map-service.js';
import { searchPlace as doSearchPlace, searchNearbyMarkers, reverseGeocode, ipLocate } from './search-service.js';
import { showStatus, updateMarkerStats, highlightMarkerInList, showNearbyResults, renderMarkersTable, updateMarkerStatsPanel, updateBatchDeleteButton, switchTab as doSwitchTab, setMarkerSort } from './ui-service.js';
import { exportToCSV, isValidCoordinate } from './utils.js';
import { initSearchHistory, addSearchRecord, deleteSearchRecord, clearSearchHistory, renderSearchHistoryTable, setHistorySort } from './search-history-service.js';

let currentPosition = null;
let searchCircle = null;
let searchTempMarker = null;
let locationMarker = null;
let locationCircle = null;
let appInitialized = false;

async function initializeApp() {
    setTimeout(async function() {
        try {
            await initCloudBase();

            initCategories();

            initSearchHistory();

            await initMap('map', {
                zoom: 12,
                center: [114.057868, 22.542896]
            });

            await initMarkers();

            reloadMapMarkers();
            refreshAllUI();

            appInitialized = true;
            showStatus('地图加载完成，可以开始搜索', 'success');

        } catch (error) {
            console.error('应用初始化失败:', error);

            try {
                await initMarkers();
                refreshAllUI();
            } catch (e) {}

            showStatus('地图初始化失败，部分功能可能不可用', 'error');
        }
    }, 800);
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
        const category = categories.find(c => c.id === marker.categoryId || (c.id === 'default' && !marker.categoryId));
        const categoryName = category ? category.name : '默认分类';
        const categoryColor = category ? category.color : '#2196F3';
        displayMarker(marker, { categoryName: categoryName, categoryColor: categoryColor });
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
        const results = await doSearchPlace(keyword);
        if (results && results.length > 0) {
            setMapCenter(results[0].lng, results[0].lat, 16);

            addSearchRecord({
                type: 'search',
                keyword: keyword,
                name: results[0].name,
                address: results[0].address || '',
                lat: results[0].lat,
                lng: results[0].lng,
                source: 'map'
            });

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
        content: '<div style="position: relative; width: 30px; height: 40px;">' +
            '<svg width="30" height="40" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg">' +
                '<path d="M15 0C6.716 0 0 6.716 0 15c0 11.25 15 25 15 25s15-13.75 15-25c0-8.284-6.716-15-15-15z" fill="#FF9800"/>' +
                '<circle cx="15" cy="15" r="6" fill="white"/>' +
            '</svg>' +
        '</div>',
        offset: new AMap.Pixel(-15, -40)
    });

    var infoContent = '<div style="padding: 8px; min-width: 150px;">' +
        '<h4 style="margin: 0 0 5px 0; color: #333; font-size: 14px;">' + name + '</h4>' +
        '<p style="margin: 0; color: #999; font-size: 12px;">📍 经纬度: ' + lat.toFixed(6) + ', ' + lng.toFixed(6) + '</p>' +
        '</div>';

    var infoWindow = new AMap.InfoWindow({
        content: infoContent,
        offset: new AMap.Pixel(0, -30)
    });

    infoWindow.open(map, searchTempMarker.getPosition());
};

window.locateMe = function() {
    const statusDiv = document.getElementById('locationStatus');

    function onLocationSuccess(lng, lat, accuracy, isIPLocate) {
        currentPosition = { lng: lng, lat: lat };

        reverseGeocode(lng, lat).then(function(geoResult) {
            addSearchRecord({
                type: 'location',
                name: geoResult.name,
                address: geoResult.address,
                lat: lat,
                lng: lng,
                source: 'map'
            });

            if (locationMarker) {
                locationMarker.setMap(null);
                locationMarker = null;
            }
            if (locationCircle) {
                locationCircle.setMap(null);
                locationCircle = null;
            }

            const map = getMap();
            if (!map) return;

            locationMarker = new AMap.Marker({
                map: map,
                position: [lng, lat],
                title: geoResult.name,
                content: '<div style="position: relative; width: 30px; height: 40px;">' +
                    '<svg width="30" height="40" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg">' +
                        '<path d="M15 0C6.716 0 0 6.716 0 15c0 11.25 15 25 15 25s15-13.75 15-25c0-8.284-6.716-15-15-15z" fill="#2196F3"/>' +
                        '<circle cx="15" cy="15" r="6" fill="white"/>' +
                    '</svg>' +
                '</div>',
                offset: new AMap.Pixel(-15, -40)
            });

            if (!isIPLocate && accuracy && accuracy > 0) {
                locationCircle = new AMap.Circle({
                    map: map,
                    center: [lng, lat],
                    radius: Math.min(accuracy, 5000),
                    strokeColor: '#2196F3',
                    strokeWeight: 2,
                    strokeOpacity: 0.5,
                    fillColor: '#2196F3',
                    fillOpacity: 0.1
                });
            }

            setMapCenter(lng, lat, isIPLocate ? 13 : 16);

            var infoContent = '<div style="padding: 8px; min-width: 150px;">' +
                '<h4 style="margin: 0 0 5px 0; color: #333; font-size: 14px;">📍 ' + geoResult.name + '</h4>' +
                '<p style="margin: 0; color: #999; font-size: 12px;">' + geoResult.address + '</p>' +
                (isIPLocate ? '<p style="margin: 3px 0 0 0; color: #FF9800; font-size: 11px;">⚠️ IP定位，精度较低</p>' : '') +
                '</div>';

            var infoWindow = new AMap.InfoWindow({
                content: infoContent,
                offset: new AMap.Pixel(0, -30)
            });

            infoWindow.open(map, locationMarker.getPosition());

            if (statusDiv) {
                if (isIPLocate) {
                    statusDiv.innerHTML = '<p style="color: #FF9800;">⚠️ IP定位成功（精度较低，建议在HTTPS环境下使用精确定位）</p>';
                } else {
                    statusDiv.innerHTML = '<p style="color: #4CAF50;">✅ 定位成功</p>';
                }
            }
        }).catch(function() {
            addSearchRecord({
                type: 'location',
                name: '我的位置',
                address: lat.toFixed(6) + ', ' + lng.toFixed(6),
                lat: lat,
                lng: lng,
                source: 'map'
            });

            if (locationMarker) {
                locationMarker.setMap(null);
                locationMarker = null;
            }
            if (locationCircle) {
                locationCircle.setMap(null);
                locationCircle = null;
            }

            const map = getMap();
            if (!map) return;

            locationMarker = new AMap.Marker({
                map: map,
                position: [lng, lat],
                title: '我的位置',
                content: '<div style="position: relative; width: 30px; height: 40px;">' +
                    '<svg width="30" height="40" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg">' +
                        '<path d="M15 0C6.716 0 0 6.716 0 15c0 11.25 15 25 15 25s15-13.75 15-25c0-8.284-6.716-15-15-15z" fill="#2196F3"/>' +
                        '<circle cx="15" cy="15" r="6" fill="white"/>' +
                    '</svg>' +
                '</div>',
                offset: new AMap.Pixel(-15, -40)
            });

            setMapCenter(lng, lat, isIPLocate ? 13 : 16);

            if (statusDiv) {
                if (isIPLocate) {
                    statusDiv.innerHTML = '<p style="color: #FF9800;">⚠️ IP定位成功（精度较低）</p>';
                } else {
                    statusDiv.innerHTML = '<p style="color: #4CAF50;">✅ 定位成功</p>';
                }
            }
        });
    }

    function tryIPLocate() {
        if (statusDiv) statusDiv.innerHTML = '<p style="color: #FF9800;">精确定位失败，尝试IP定位...</p>';
        ipLocate().then(function(result) {
            onLocationSuccess(result.lng, result.lat, 0, true);
        }).catch(function(err) {
            if (statusDiv) statusDiv.innerHTML = '<p style="color: #f44336;">定位失败：所有定位方式均不可用。请检查网络连接或在HTTPS环境下使用。</p>';
        });
    }

    const geolocation = window.amapGeolocation;
    if (geolocation) {
        if (statusDiv) statusDiv.innerHTML = '<p style="color: #2196F3;">正在定位...</p>';
        geolocation.getCurrentPosition(function(status, result) {
            if (status === 'complete') {
                var lng = typeof result.position.getLng === 'function' ? result.position.getLng() : result.position.lng;
                var lat = typeof result.position.getLat === 'function' ? result.position.getLat() : result.position.lat;
                var accuracy = result.accuracy || 0;
                onLocationSuccess(lng, lat, accuracy, false);
            } else {
                if (navigator.geolocation) {
                    if (statusDiv) statusDiv.innerHTML = '<p style="color: #FF9800;">高德定位失败，尝试浏览器定位...</p>';
                    navigator.geolocation.getCurrentPosition(
                        function(pos) {
                            onLocationSuccess(pos.coords.longitude, pos.coords.latitude, pos.coords.accuracy, false);
                        },
                        function(err) {
                            tryIPLocate();
                        },
                        { enableHighAccuracy: true, timeout: 10000 }
                    );
                } else {
                    tryIPLocate();
                }
            }
        });
    } else if (navigator.geolocation) {
        if (statusDiv) statusDiv.innerHTML = '<p style="color: #2196F3;">正在定位...</p>';
        navigator.geolocation.getCurrentPosition(
            function(pos) {
                onLocationSuccess(pos.coords.longitude, pos.coords.latitude, pos.coords.accuracy, false);
            },
            function(err) {
                tryIPLocate();
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    } else {
        tryIPLocate();
    }
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
        const categoryColor = category ? category.color : '#2196F3';

        displayMarker(marker, { categoryName: categoryName, categoryColor: categoryColor });
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
    doSwitchTab(tab);

    if (tab === 'category') {
        renderCategoryTable();
    } else if (tab === 'table') {
        const markers = getMarkers();
        const categories = getCategories();
        renderMarkersTable(markers, getCategoryName, getCategoryColor);
        updateMarkerStatsPanel(markers, categories);
    } else if (tab === 'history') {
        renderSearchHistoryTable({});
    } else if (tab === 'map') {
        setTimeout(function() {
            const map = getMap();
            if (map) map.resize();
        }, 100);
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
    removeCategoryById(categoryId);
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

window.filterHistory = function() {
    const typeFilter = document.getElementById('historyTypeFilter');
    const searchInput = document.getElementById('historySearchInput');
    const startDateInput = document.getElementById('historyStartDate');
    const endDateInput = document.getElementById('historyEndDate');

    const criteria = {
        type: typeFilter ? typeFilter.value : 'all',
        keyword: searchInput ? searchInput.value.trim() : '',
        startDate: startDateInput ? startDateInput.value : '',
        endDate: endDateInput ? endDateInput.value : ''
    };

    renderSearchHistoryTable(criteria, 1);
};

window.gotoHistoryPage = function(page) {
    renderSearchHistoryTable(null, page);
};

window.resetHistoryFilter = function() {
    const typeFilter = document.getElementById('historyTypeFilter');
    const searchInput = document.getElementById('historySearchInput');
    const startDateInput = document.getElementById('historyStartDate');
    const endDateInput = document.getElementById('historyEndDate');

    if (typeFilter) typeFilter.value = 'all';
    if (searchInput) searchInput.value = '';
    if (startDateInput) startDateInput.value = '';
    if (endDateInput) endDateInput.value = '';

    renderSearchHistoryTable({}, 1);
};

window.sortHistory = function(field) {
    setHistorySort(field);
};

window.sortMarkers = function(field) {
    setMarkerSort(field);
    const markers = getMarkers();
    const categories = getCategories();
    renderMarkersTable(markers, getCategoryName, getCategoryColor);
};

window.deleteHistoryRecord = function(id) {
    deleteSearchRecord(id);
    window.filterHistory();
};

window.clearAllHistory = function() {
    if (!confirm('确定要清空所有搜索记录吗？')) return;
    clearSearchHistory();
    renderSearchHistoryTable({});
    showStatus('搜索记录已清空', 'success');
};

window.gotoHistoryLocation = function(lng, lat, name) {
    doSwitchTab('map');
    document.querySelectorAll('.tab-item').forEach(item => item.classList.remove('active'));
    document.querySelectorAll('.tab-item')[0].classList.add('active');

    setMapCenter(lng, lat, 17);

    new AMap.Marker({
        map: getMap(),
        position: [lng, lat],
        title: name,
        content: '<div style="position: relative; width: 30px; height: 40px;">' +
            '<svg width="30" height="40" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg">' +
                '<path d="M15 0C6.716 0 0 6.716 0 15c0 11.25 15 25 15 25s15-13.75 15-25c0-8.284-6.716-15-15-15z" fill="#FF9800"/>' +
                '<circle cx="15" cy="15" r="6" fill="white"/>' +
            '</svg>' +
        '</div>',
        offset: new AMap.Pixel(-15, -40)
    });
};

if (document.readyState === 'complete') {
    initializeApp();
} else {
    window.addEventListener('load', initializeApp);
}

export { initializeApp };
