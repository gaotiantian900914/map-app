import { calculateDistance } from './utils.js';

const AMAP_REST_KEY = '4214ffb1464f3d9ffd569072100f3f3e';

export function searchPlace(keyword) {
    return new Promise((resolve, reject) => {
        if (!keyword || !keyword.trim()) {
            reject(new Error('请输入搜索关键词'));
            return;
        }

        var url = 'https://restapi.amap.com/v3/place/text?key=' + AMAP_REST_KEY +
            '&keywords=' + encodeURIComponent(keyword.trim()) +
            '&city=深圳&offset=10&page=1&extensions=all';

        fetch(url)
            .then(function(response) { return response.json(); })
            .then(function(data) {
                if (data.status === '1' && data.pois && data.pois.length > 0) {
                    const pois = [];
                    data.pois.forEach(function(poi) {
                        if (!poi.location) return;

                        var loc = poi.location.split(',');
                        var lng = parseFloat(loc[0]);
                        var lat = parseFloat(loc[1]);

                        if (isNaN(lat) || isNaN(lng)) return;

                        pois.push({
                            name: poi.name,
                            address: poi.address || poi.pname + poi.cityname + poi.adname,
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
                } else if (data.status === '1' && (!data.pois || data.pois.length === 0)) {
                    reject(new Error('未找到相关地点'));
                } else {
                    reject(new Error(data.info || '搜索失败'));
                }
            })
            .catch(function(err) {
                reject(new Error('网络请求失败：' + err.message));
            });
    });
}

export function reverseGeocode(lng, lat) {
    return new Promise((resolve, reject) => {
        var url = 'https://restapi.amap.com/v3/geocode/regeo?key=' + AMAP_REST_KEY +
            '&location=' + lng + ',' + lat + '&extensions=all&radius=1000';

        fetch(url)
            .then(function(response) { return response.json(); })
            .then(function(data) {
                if (data.status === '1' && data.regeocode) {
                    var rc = data.regeocode;
                    var ac = rc.addressComponent || {};
                    var name = '我的位置';
                    var address = rc.formatted_address || '';

                    if (rc.pois && rc.pois.length > 0) {
                        name = rc.pois[0].name || ac.township || '我的位置';
                    } else if (ac.township) {
                        name = ac.township;
                        if (ac.streetNumber && ac.streetNumber.street) {
                            name += ac.streetNumber.street;
                            if (ac.streetNumber.number) {
                                name += ac.streetNumber.number + '号';
                            }
                        }
                    }

                    resolve({ name: name, address: address });
                } else {
                    resolve({ name: '我的位置', address: lat.toFixed(6) + ', ' + lng.toFixed(6) });
                }
            })
            .catch(function() {
                resolve({ name: '我的位置', address: lat.toFixed(6) + ', ' + lng.toFixed(6) });
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
