/**
 * 地图服务模块
 * 管理高德地图的初始化和操作
 */

import { isValidCoordinate, escapeHtml } from './utils.js';

let map = null;
let placeSearch = null;
let geolocation = null;
let currentMarkers = [];
let activeInfoWindow = null;

export async function initMap(containerId, options = {}) {
    return new Promise((resolve, reject) => {
        try {
            if (typeof AMap === 'undefined') {
                reject(new Error('AMap 对象未定义，地图 API 加载失败'));
                return;
            }

            map = new AMap.Map(containerId, {
                zoom: options.zoom || 12,
                center: options.center || [114.057868, 22.542896],
                mapStyle: options.mapStyle || 'amap://styles/normal'
            });

            AMap.plugin(['AMap.PlaceSearch', 'AMap.Geolocation', 'AMap.Circle', 'AMap.GeometryUtil'], function() {
                placeSearch = new AMap.PlaceSearch({
                    pageSize: 10,
                    pageIndex: 1,
                    city: '深圳',
                    extensions: 'all'
                });

                geolocation = new AMap.Geolocation({
                    enableHighAccuracy: true,
                    timeout: 10000,
                    zoomToAccuracy: true
                });

                window.amapGeolocation = geolocation;

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

export function getMap() {
    return map;
}

export function getPlaceSearch() {
    return placeSearch;
}

export function getGeolocation() {
    return geolocation;
}

export function displayMarker(markerData, options = {}) {
    if (!map || typeof AMap === 'undefined') {
        return null;
    }

    if (!isValidCoordinate(markerData.lat, markerData.lng)) {
        return null;
    }

    try {
        const categoryColor = options.categoryColor || '#2196F3';
        const categoryName = options.categoryName || '默认';

        const markerContent = '<div style="position: relative; width: 30px; height: 40px;">' +
            '<svg width="30" height="40" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg">' +
                '<path d="M15 0C6.716 0 0 6.716 0 15c0 11.25 15 25 15 25s15-13.75 15-25c0-8.284-6.716-15-15-15z" fill="' + categoryColor + '"/>' +
                '<circle cx="15" cy="15" r="6" fill="white"/>' +
            '</svg>' +
        '</div>';

        const amapMarker = new AMap.Marker({
            position: [markerData.lng, markerData.lat],
            title: markerData.name,
            content: markerContent,
            offset: new AMap.Pixel(-15, -40),
            extData: markerData
        });

        const infoWindowContent = '<div style="padding: 10px; min-width: 200px;">' +
            '<h4 style="margin: 0 0 10px 0; color: #333;">' + escapeHtml(markerData.name) + '</h4>' +
            '<p style="margin: 5px 0; color: #666; font-size: 12px;">' +
                '<strong>分类:</strong> <span style="display: inline-block; padding: 1px 8px; border-radius: 10px; color: white; background: ' + categoryColor + '; font-size: 11px;">' + escapeHtml(categoryName) + '</span>' +
            '</p>' +
            '<p style="margin: 5px 0; color: #666; font-size: 12px;">' +
                '<strong>描述:</strong> ' + escapeHtml(markerData.description || '无描述') +
            '</p>' +
            '<p style="margin: 5px 0; color: #666; font-size: 12px;">' +
                '<strong>坐标:</strong> ' + markerData.lat.toFixed(6) + ', ' + markerData.lng.toFixed(6) +
            '</p>' +
            '<p style="margin: 5px 0; color: #999; font-size: 11px;">' +
                '<strong>创建时间:</strong> ' + escapeHtml(markerData.createdAt || '') +
            '</p>' +
        '</div>';

        const infoWindow = new AMap.InfoWindow({
            content: infoWindowContent,
            offset: new AMap.Pixel(0, -30)
        });

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

        amapMarker.setMap(map);

        currentMarkers.push({
            marker: amapMarker,
            data: markerData,
            infoWindow: infoWindow
        });

        return amapMarker;

    } catch (error) {
        console.error('显示标记失败:', error);
        return null;
    }
}

export function clearMapMarkers() {
    currentMarkers.forEach(function(item) {
        item.marker.setMap(null);
    });
    currentMarkers = [];
}

export function reloadMarkers(markers, options = {}) {
    clearMapMarkers();

    markers.forEach(function(marker) {
        try {
            displayMarker(marker, options);
        } catch (error) {
            console.error('重新显示标记失败:', error);
        }
    });
}

export function fitMapToMarkers(markers) {
    if (!map || !markers || markers.length === 0) {
        return;
    }

    try {
        const validMarkers = markers.filter(function(marker) {
            return marker &&
                   typeof marker.lat === 'number' &&
                   typeof marker.lng === 'number' &&
                   !isNaN(marker.lat) &&
                   !isNaN(marker.lng);
        });

        if (validMarkers.length === 0) {
            return;
        }

        const amapMarkers = [];
        validMarkers.forEach(function(m) {
            const amapMarker = new AMap.Marker({
                position: [m.lng, m.lat],
                map: map
            });
            amapMarkers.push(amapMarker);
        });

        map.setFitView(amapMarkers, false, [60, 60, 60, 60]);

        amapMarkers.forEach(function(m) {
            m.setMap(null);
        });

    } catch (error) {
        console.error('调整地图视图失败:', error);
    }
}

export function setMapCenter(lng, lat, zoom) {
    if (!map) return;

    if (!isValidCoordinate(lat, lng)) return;

    map.setCenter([lng, lat]);
    if (zoom) {
        map.setZoom(zoom);
    }
}

export function focusOnMarker(lng, lat, markerId) {
    if (!map) return;

    if (!isValidCoordinate(lat, lng)) return;

    setMapCenter(lng, lat, 16);

    const markerItem = currentMarkers.find(item => item.data.id === markerId);
    if (markerItem) {
        if (activeInfoWindow) {
            activeInfoWindow.close();
        }
        markerItem.infoWindow.open(map, [lng, lat]);
        activeInfoWindow = markerItem.infoWindow;
    }
}

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

export function getCurrentMarkersMap() {
    const map = {};
    currentMarkers.forEach(function(item) {
        map[item.data.id] = item;
    });
    return map;
}
