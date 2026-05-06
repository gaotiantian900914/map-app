/**
 * 工具函数模块
 * 提供通用的工具函数
 */

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

export const MARKER_ICONS = {
    red: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_r.png',
    blue: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_b.png',
    green: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_g.png',
    yellow: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_y.png',
    purple: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_p.png',
    orange: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_o.png',
    pink: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_r.png',
    cyan: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_b.png'
};

export function getColorValue(color) {
    if (COLOR_MAP[color]) {
        return COLOR_MAP[color];
    }
    return color;
}

export function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export function formatDistance(meters) {
    if (meters < 1000) {
        return Math.round(meters) + ' 米';
    } else {
        return (meters / 1000).toFixed(2) + ' 公里';
    }
}

export function generateId() {
    return Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9);
}

export function isValidCoordinate(lat, lng) {
    return typeof lat === 'number' &&
           typeof lng === 'number' &&
           !isNaN(lat) &&
           !isNaN(lng) &&
           lat >= -90 && lat <= 90 &&
           lng >= -180 && lng <= 180;
}

export function isValidMarker(marker) {
    if (!marker) return false;
    return isValidCoordinate(marker.lat, marker.lng);
}

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

export function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

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
