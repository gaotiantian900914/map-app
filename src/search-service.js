/**
 * 搜索服务模块
 * 处理地点搜索和附近标记搜索
 */

import { calculateDistance } from './utils.js';

export function searchPlace(keyword) {
    return new Promise((resolve, reject) => {
        if (!keyword || !keyword.trim()) {
            reject(new Error('请输入搜索关键词'));
            return;
        }

        if (typeof AMap === 'undefined') {
            reject(new Error('地图服务未加载，请刷新页面'));
            return;
        }

        function doSearch(ps) {
            ps.search(keyword.trim(), function(status, result) {
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
                    var errMsg = '搜索失败';
                    if (result && typeof result === 'string') {
                        errMsg = result;
                    } else if (result && result.message) {
                        errMsg = result.message;
                    } else if (result && result.info) {
                        errMsg = result.info;
                    }
                    reject(new Error(errMsg));
                }
            });
        }

        if (AMap.PlaceSearch) {
            var ps = new AMap.PlaceSearch({
                pageSize: 10,
                pageIndex: 1,
                city: '深圳',
                extensions: 'all'
            });
            doSearch(ps);
        } else {
            AMap.plugin('AMap.PlaceSearch', function() {
                if (!AMap.PlaceSearch) {
                    reject(new Error('搜索插件加载失败，请刷新页面'));
                    return;
                }
                var ps = new AMap.PlaceSearch({
                    pageSize: 10,
                    pageIndex: 1,
                    city: '深圳',
                    extensions: 'all'
                });
                doSearch(ps);
            });
        }
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
