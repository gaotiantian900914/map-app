/**
 * 标记服务模块
 * 管理地图标注的增删改查
 */

import { saveMarkers, loadMarkers } from './storage-service.js';
import { generateId, isValidMarker } from './utils.js';

// 当前标记列表
let markers = [];

/**
 * 初始化标记
 * @returns {Promise<Array>} 标记数组
 */
export async function initMarkers() {
    markers = await loadMarkers();
    return markers;
}

/**
 * 获取所有标记
 * @returns {Array} 标记数组
 */
export function getMarkers() {
    return markers;
}

/**
 * 根据 ID 获取标记
 * @param {string} markerId - 标记 ID
 * @returns {Object|null} 标记对象
 */
export function getMarkerById(markerId) {
    return markers.find(m => m.id === markerId) || null;
}

/**
 * 添加标记
 * @param {Object} markerData - 标记数据
 * @returns {Object} 新标记对象
 */
export function addMarker(markerData) {
    const marker = {
        id: generateId(),
        name: markerData.name || '未命名标记',
        description: markerData.description || '',
        lat: markerData.lat,
        lng: markerData.lng,
        categoryId: markerData.categoryId || 'default',
        createdAt: new Date().toLocaleString()
    };
    
    if (!isValidMarker(marker)) {
        throw new Error('无效的标记坐标');
    }
    
    markers.push(marker);
    saveMarkers(markers);
    
    return marker;
}

/**
 * 批量添加标记
 * @param {Array} markersData - 标记数据数组
 * @returns {Array} 新标记对象数组
 */
export function addMarkersBatch(markersData) {
    const newMarkers = [];
    
    markersData.forEach(function(markerData) {
        try {
            const marker = addMarker(markerData);
            newMarkers.push(marker);
        } catch (error) {
            console.error('添加标记失败:', error);
        }
    });
    
    saveMarkers(markers);
    return newMarkers;
}

/**
 * 删除标记
 * @param {string} markerId - 标记 ID
 * @returns {boolean} 是否成功删除
 */
export function deleteMarker(markerId) {
    const index = markers.findIndex(m => m.id === markerId);
    if (index > -1) {
        markers.splice(index, 1);
        saveMarkers(markers);
        return true;
    }
    return false;
}

/**
 * 更新标记
 * @param {string} markerId - 标记 ID
 * @param {Object} data - 更新的数据
 * @returns {boolean} 是否成功更新
 */
export function updateMarker(markerId, data) {
    const marker = getMarkerById(markerId);
    if (marker) {
        Object.assign(marker, data);
        saveMarkers(markers);
        return true;
    }
    return false;
}

/**
 * 搜索标记
 * @param {Object} criteria - 搜索条件
 * @returns {Array} 匹配的标记数组
 */
export function searchMarkers(criteria) {
    return markers.filter(marker => {
        if (criteria.categoryId && marker.categoryId !== criteria.categoryId) {
            return false;
        }
        
        if (criteria.keyword) {
            const keyword = criteria.keyword.toLowerCase();
            const nameMatch = marker.name.toLowerCase().includes(keyword);
            const descMatch = marker.description && marker.description.toLowerCase().includes(keyword);
            if (!nameMatch && !descMatch) {
                return false;
            }
        }
        
        if (criteria.lat && criteria.lng && criteria.radius) {
            const distance = calculateDistance(
                criteria.lat, criteria.lng,
                marker.lat, marker.lng
            );
            if (distance > criteria.radius) {
                return false;
            }
        }
        
        return true;
    });
}

/**
 * 计算两点之间的距离
 * @param {number} lat1 - 第一点纬度
 * @param {number} lng1 - 第一点经度
 * @param {number} lat2 - 第二点纬度
 * @param {number} lng2 - 第二点经度
 * @returns {number} 距离（米）
 */
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

/**
 * 清除所有标记
 */
export function clearAllMarkers() {
    markers = [];
    saveMarkers(markers);
}

/**
 * 导出标记数据
 * @returns {Array} 标记数据数组
 */
export function exportMarkers() {
    return markers.map(marker => ({
        id: marker.id,
        name: marker.name,
        description: marker.description,
        lat: marker.lat,
        lng: marker.lng,
        categoryId: marker.categoryId,
        createdAt: marker.createdAt
    }));
}
