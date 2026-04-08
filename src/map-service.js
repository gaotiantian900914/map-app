/**
 * 地图服务模块
 * 管理高德地图的初始化和操作
 */

import { isValidCoordinate } from './utils.js';

// 地图实例
let map = null;
// 地图插件
let placeSearch = null;
let geolocation = null;
// 当前地图上的标记
let currentMarkers = [];
// 当前活跃的信息窗口
let activeInfoWindow = null;

/**
 * 初始化地图
 * @param {string} containerId - 地图容器 ID
 * @param {Object} options - 地图选项
 * @returns {Promise<Object>} 地图实例和插件
 */
export async function initMap(containerId, options = {}) {
    return new Promise((resolve, reject) => {
        try {
            if (typeof AMap === 'undefined') {
                reject(new Error('AMap 对象未定义，地图 API 加载失败'));
                return;
            }
            
            console.log('开始初始化地图...');
            
            // 创建地图实例
            map = new AMap.Map(containerId, {
                zoom: options.zoom || 12,
                center: options.center || [114.057868, 22.542896], // 默认深圳
                mapStyle: options.mapStyle || 'amap://styles/normal'
            });
            
            console.log('地图实例创建成功');
            
            // 加载地图插件
            AMap.plugin(['AMap.PlaceSearch', 'AMap.Geolocation', 'AMap.Circle', 'AMap.GeometryUtil'], function() {
                console.log('地图插件加载完成');
                
                // 初始化地点搜索
                placeSearch = new AMap.PlaceSearch({
                    pageSize: 10,
                    pageIndex: 1
                });
                console.log('PlaceSearch 插件初始化完成');
                
                // 初始化定位
                geolocation = new AMap.Geolocation({
                    enableHighAccuracy: true,
                    timeout: 10000,
                    zoomToAccuracy: true
                });
                console.log('Geolocation 插件初始化完成');
                
                resolve({
                    map,
                    placeSearch,
                    geolocation
                });
            });
            
        } catch (error) {
            console.error('地图初始化失败:', error);
            reject(error);
        }
    });
}

/**
 * 获取地图实例
 * @returns {Object} 地图实例
 */
export function getMap() {
    return map;
}

/**
 * 获取地点搜索插件
 * @returns {Object} 地点搜索插件
 */
export function getPlaceSearch() {
    return placeSearch;
}

/**
 * 获取定位插件
 * @returns {Object} 定位插件
 */
export function getGeolocation() {
    return geolocation;
}

/**
 * 在地图上显示标记
 * @param {Object} markerData - 标记数据
 * @param {Object} options - 选项
 * @returns {Object} 地图标记对象
 */
export function displayMarker(markerData, options = {}) {
    if (!map || typeof AMap === 'undefined') {
        console.error('地图未初始化，无法显示标记');
        return null;
    }
    
    if (!isValidCoordinate(markerData.lat, markerData.lng)) {
        console.error('无效的标记坐标:', markerData.lat, markerData.lng);
        return null;
    }
    
    try {
        // 创建标记
        const amapMarker = new AMap.Marker({
            position: [markerData.lng, markerData.lat],
            title: markerData.name,
            extData: markerData
        });
        
        // 创建信息窗口内容
        const infoWindowContent = `
            <div style="padding: 10px; min-width: 200px;">
                <h4 style="margin: 0 0 10px 0; color: #333;">${markerData.name}</h4>
                <p style="margin: 5px 0; color: #666; font-size: 12px;">
                    <strong>分类:</strong> ${options.categoryName || '默认'}
                </p>
                <p style="margin: 5px 0; color: #666; font-size: 12px;">
                    <strong>描述:</strong> ${markerData.description || '无描述'}
                </p>
                <p style="margin: 5px 0; color: #666; font-size: 12px;">
                    <strong>坐标:</strong> ${markerData.lat.toFixed(6)}, ${markerData.lng.toFixed(6)}
                </p>
                <p style="margin: 5px 0; color: #999; font-size: 11px;">
                    <strong>创建时间:</strong> ${markerData.createdAt}
                </p>
            </div>
        `;
        
        // 创建信息窗口
        const infoWindow = new AMap.InfoWindow({
            content: infoWindowContent,
            offset: new AMap.Pixel(0, -30)
        });
        
        // 点击标记显示信息窗口
        amapMarker.on('click', function() {
            if (activeInfoWindow) {
                activeInfoWindow.close();
            }
            infoWindow.open(map, amapMarker.getPosition());
            activeInfoWindow = infoWindow;
            
            if (options.onClick) {
                options.onClick(markerData);
            }
        });
        
        // 将标记添加到地图
        amapMarker.setMap(map);
        
        // 保存标记引用
        currentMarkers.push({
            marker: amapMarker,
            data: markerData,
            infoWindow: infoWindow
        });
        
        console.log('标记已显示在地图上:', markerData.name);
        return amapMarker;
        
    } catch (error) {
        console.error('显示标记失败:', error);
        return null;
    }
}

/**
 * 清除所有地图标记
 */
export function clearMapMarkers() {
    currentMarkers.forEach(function(item) {
        item.marker.setMap(null);
    });
    currentMarkers = [];
    console.log('已清除所有地图标记');
}

/**
 * 重新加载所有标记到地图
 * @param {Array} markers - 标记数组
 * @param {Object} options - 选项
 */
export function reloadMarkers(markers, options = {}) {
    clearMapMarkers();
    
    markers.forEach(function(marker) {
        try {
            displayMarker(marker, options);
        } catch (error) {
            console.error('重新显示标记失败:', error);
        }
    });
    
    console.log('标记重新加载完成，当前显示的标记数量:', currentMarkers.length);
}

/**
 * 调整地图视图以适应所有标记
 * @param {Array} markers - 标记数组
 */
export function fitMapToMarkers(markers) {
    if (!map || !markers || markers.length === 0) {
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
    } catch (error) {
        console.error('调整地图视图失败:', error);
    }
}

/**
 * 设置地图中心
 * @param {number} lng - 经度
 * @param {number} lat - 纬度
 * @param {number} zoom - 缩放级别
 */
export function setMapCenter(lng, lat, zoom = 16) {
    if (!map) {
        console.error('地图未初始化');
        return;
    }
    
    if (!isValidCoordinate(lat, lng)) {
        console.error('无效的坐标:', lat, lng);
        return;
    }
    
    map.setCenter([lng, lat]);
    if (zoom) {
        map.setZoom(zoom);
    }
}

/**
 * 聚焦到指定标记
 * @param {number} lng - 经度
 * @param {number} lat - 纬度
 * @param {string} markerId - 标记 ID
 * @param {Object} markerItem - 标记对象
 */
export function focusOnMarker(lng, lat, markerId, markerItem) {
    if (!map) {
        console.error('地图未初始化，无法聚焦标记');
        return;
    }
    
    if (!isValidCoordinate(lat, lng)) {
        console.error('无效的坐标:', lat, lng);
        return;
    }
    
    setMapCenter(lng, lat, 16);
    
    if (markerId && markerItem) {
        if (activeInfoWindow) {
            activeInfoWindow.close();
        }
        markerItem.infoWindow.open(map, [lng, lat]);
        activeInfoWindow = markerItem.infoWindow;
    }
}

/**
 * 绘制搜索范围圆圈
 * @param {number} lng - 中心点经度
 * @param {number} lat - 中心点纬度
 * @param {number} radius - 半径（米）
 * @returns {Object} 圆圈对象
 */
export function drawSearchCircle(lng, lat, radius) {
    if (!map || typeof AMap === 'undefined') {
        return null;
    }
    
    try {
        const circle = new AMap.Circle({
            center: [lng, lat],
            radius: radius,
            strokeColor: '#2196F3',
            strokeWeight: 2,
            strokeOpacity: 0.5,
            fillColor: '#2196F3',
            fillOpacity: 0.1
        });
        circle.setMap(map);
        return circle;
    } catch (error) {
        console.error('绘制圆圈失败:', error);
        return null;
    }
}
