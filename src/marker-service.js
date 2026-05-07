/**
 * 标记服务模块
 * 管理地图标注的增删改查
 */

import { saveMarkers, loadMarkers } from './storage-service.js';
import { generateId, isValidMarker, calculateDistance, fuzzyMatch } from './utils.js';

let markers = [];

export async function initMarkers() {
    markers = await loadMarkers();

    let needSave = false;
    markers.forEach(function(marker) {
        if (marker.category && !marker.categoryId) {
            marker.categoryId = marker.category;
            delete marker.category;
            needSave = true;
        }
        if (!marker.categoryId) {
            marker.categoryId = 'default';
            needSave = true;
        }
    });

    if (needSave) {
        saveMarkers(markers);
    }

    return markers;
}

export function getMarkers() {
    return markers;
}

export function getMarkerById(markerId) {
    return markers.find(m => m.id === markerId) || null;
}

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

    return newMarkers;
}

export function deleteMarker(markerId) {
    const index = markers.findIndex(m => m.id === markerId);
    if (index > -1) {
        markers.splice(index, 1);
        saveMarkers(markers);
        return true;
    }
    return false;
}

export function deleteMarkersBatch(markerIds) {
    let deletedCount = 0;
    markerIds.forEach(function(id) {
        const index = markers.findIndex(m => m.id === id);
        if (index > -1) {
            markers.splice(index, 1);
            deletedCount++;
        }
    });
    if (deletedCount > 0) {
        saveMarkers(markers);
    }
    return deletedCount;
}

export function updateMarker(markerId, data) {
    const marker = getMarkerById(markerId);
    if (marker) {
        Object.assign(marker, data);
        saveMarkers(markers);
        return true;
    }
    return false;
}

export function searchMarkers(criteria) {
    return markers.filter(marker => {
        if (criteria.categoryId && criteria.categoryId !== 'all' && marker.categoryId !== criteria.categoryId) {
            return false;
        }

        if (criteria.keyword) {
            const keyword = criteria.keyword;
            const nameMatch = fuzzyMatch(marker.name, keyword);
            const descMatch = fuzzyMatch(marker.description, keyword);
            const coordMatch = fuzzyMatch(marker.lat.toFixed(6) + ', ' + marker.lng.toFixed(6), keyword);
            const timeMatch = fuzzyMatch(marker.createdAt, keyword);
            if (!nameMatch && !descMatch && !coordMatch && !timeMatch) {
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

export function clearAllMarkers() {
    markers = [];
    saveMarkers(markers);
}

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
