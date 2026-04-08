/**
 * 搜索服务模块
 * 处理地点搜索和附近标记搜索
 */

import { getPlaceSearch } from './map-service.js';
import { calculateDistance } from './utils.js';

/**
 * 搜索地点
 * @param {string} keyword - 搜索关键词
 * @returns {Promise<Array>} 搜索结果数组
 */
export function searchPlace(keyword) {
    return new Promise((resolve, reject) => {
        if (!keyword || !keyword.trim()) {
            reject(new Error('请输入搜索关键词'));
            return;
        }
        
        const placeSearch = getPlaceSearch();
        if (!placeSearch) {
            reject(new Error('搜索服务未初始化'));
            return;
        }
        
        console.log('开始搜索:', keyword);
        
        placeSearch.search(keyword.trim(), function(status, result) {
            console.log('搜索结果:', status, result);
            
            if (status === 'complete' && result && result.info === 'OK') {
                if (result.poiList && result.poiList.pois && result.poiList.pois.length > 0) {
                    const pois = result.poiList.pois.map(poi => ({
                        name: poi.name,
                        address: poi.address,
                        location: poi.location,
                        lat: poi.location.lat,
                        lng: poi.location.lng,
                        type: poi.type,
                        tel: poi.tel,
                        distance: poi.distance
                    }));
                    resolve(pois);
                } else {
                    reject(new Error('未找到相关地点'));
                }
            } else {
                console.error('搜索失败:', status, result);
                reject(new Error('搜索失败，请重试'));
            }
        });
    });
}

/**
 * 搜索附近的标记
 * @param {Array} markers - 标记数组
 * @param {number} lat - 当前位置纬度
 * @param {number} lng - 当前位置经度
 * @param {number} radius - 搜索半径（米）
 * @returns {Array} 附近的标记（带距离信息）
 */
export function searchNearbyMarkers(markers, lat, lng, radius) {
    if (!markers || markers.length === 0) {
        return [];
    }
    
    const nearbyMarkers = [];
    
    markers.forEach(function(marker) {
        const distance = calculateDistance(lat, lng, marker.lat, marker.lng);
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
    
    return nearbyMarkers;
}
