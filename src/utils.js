/**
 * 工具函数模块
 * 提供通用的工具函数
 */

// 颜色映射
export const COLOR_MAP = {
    red: '#f44336',
    blue: '#2196F3',
    green: '#4CAF50',
    yellow: '#FFEB3B',
    purple: '#9C27B0',
    orange: '#FF9800',
    pink: '#E91E63',
    cyan: '#00BCD4'
};

// 标记图标映射
export const MARKER_ICONS = {
    red: 'https://webapi.amap.com/maps?v=1.4.15&key=45461b14046c9bda310ce713420c84d4',
    blue: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_b.png',
    green: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_g.png',
    yellow: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_y.png',
    purple: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_p.png',
    orange: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_o.png',
    pink: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_r.png',
    cyan: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_b.png'
};

/**
 * 获取颜色值（支持预定义颜色和自定义十六进制颜色）
 * @param {string} color - 颜色名称或十六进制值
 * @returns {string} 颜色值
 */
export function getColorValue(color) {
    if (COLOR_MAP[color]) {
        return COLOR_MAP[color];
    }
    return color;
}

/**
 * 格式化距离显示
 * @param {number} meters - 距离（米）
 * @returns {string} 格式化后的距离字符串
 */
export function formatDistance(meters) {
    if (meters < 1000) {
        return Math.round(meters) + ' 米';
    } else {
        return (meters / 1000).toFixed(2) + ' 公里';
    }
}

/**
 * 生成唯一 ID
 * @returns {string} 唯一 ID
 */
export function generateId() {
    return Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * 验证坐标是否有效
 * @param {number} lat - 纬度
 * @param {number} lng - 经度
 * @returns {boolean} 是否有效
 */
export function isValidCoordinate(lat, lng) {
    return typeof lat === 'number' && 
           typeof lng === 'number' && 
           !isNaN(lat) && 
           !isNaN(lng) &&
           lat >= -90 && lat <= 90 &&
           lng >= -180 && lng <= 180;
}

/**
 * 验证标记数据是否有效
 * @param {Object} marker - 标记对象
 * @returns {boolean} 是否有效
 */
export function isValidMarker(marker) {
    if (!marker) return false;
    return isValidCoordinate(marker.lat, marker.lng);
}

/**
 * 计算两点之间的距离（米）
 * @param {number} lat1 - 第一点纬度
 * @param {number} lng1 - 第一点经度
 * @param {number} lat2 - 第二点纬度
 * @param {number} lng2 - 第二点经度
 * @returns {number} 距离（米）
 */
export function calculateDistance(lat1, lng1, lat2, lng2) {
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
 * 延迟执行函数
 * @param {number} ms - 延迟毫秒数
 * @returns {Promise}
 */
export function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 导出 CSV 数据
 * @param {Array} data - 数据数组
 * @param {string} filename - 文件名
 */
export function exportToCSV(data, filename) {
    if (!data || data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    const csv = [
        headers.join(','),
        ...data.map(row => 
            headers.map(header => 
                JSON.stringify(row[header] || '')
            ).join(',')
        )
    ].join('\n');
    
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
