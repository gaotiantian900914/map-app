/**
 * 搜索服务模块
 * 处理地点搜索和附近标记搜索
 */

import { getPlaceSearch } from './map-service.js';
import { calculateDistance } from './utils.js';

export function searchPlace(keyword) {
    return new Promise((resolve, reject) => {
        if (!keyword || !keyword.trim()) {
            reject(new Error('请输入搜索关键词'));
            return;
        }

        const placeSearch = getPlaceSearch();
        if (!placeSearch) {
            reject(new Error('搜索服务未初始化，请刷新页面重试'));
            return;
        }

        placeSearch.search(keyword.trim(), function(status, result) {
            if (status === 'complete' && result) {
                if (result.poiList && result.poiList.pois && result.poiList.pois.length > 0) {
                    const pois = [];
                    result.poiList.pois.forEach(function(poi) {
                        if (!poi.location) return;

                        var lat, lng;
                        try {
                            if (typeof poi.location === 'string') {
                                var loc = poi.location.split(',');
                                lng = parseFloat(loc[0]);
                                lat = parseFloat(loc[1]);
                            } else if (typeof poi.location === 'object') {
                                lng = typeof poi.location.getLng === 'function' ? poi.location.getLng() : poi.location.lng;
                                lat = typeof poi.location.getLat === 'function' ? poi.location.getLat() : poi.location.lat;
                            }
                        } catch (e) {
                            return;
                        }

                        if (isNaN(lat) || isNaN(lng)) return;

                        pois.push({
                            name: poi.name,
                            address: poi.address,
                            lat: lat,
                            lng: lng,
                            type: poi.type,
                            tel: poi.tel
                        });
                    });

                    if (pois.length > 0) {
                        resolve(pois);
                    } else {
                        reject(new Error('未找到有效的地点信息'));
                    }
                } else {
                    reject(new Error('未找到相关地点'));
                }
            } else if (status === 'no_data') {
                reject(new Error('未找到相关地点'));
            } else {
                var errMsg = '搜索失败，请重试';
                if (result && result.message) {
                    errMsg = result.message;
                }
                reject(new Error(errMsg));
            }
        });
    });
}

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

    nearbyMarkers.sort(function(a, b) {
        return a.distance - b.distance;
    });

    return nearbyMarkers;
}
