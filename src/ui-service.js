/**
 * UI 服务模块
 * 处理用户界面相关的操作
 */

import { getColorValue, escapeHtml, formatDistance } from './utils.js';

export function showStatus(message, type = 'info') {
    const toast = document.createElement('div');
    toast.style.cssText = 'position: fixed; top: 20px; left: 50%; transform: translateX(-50%);' +
        'padding: 12px 24px;' +
        'background: ' + (type === 'error' ? '#f44336' : type === 'success' ? '#4CAF50' : '#2196F3') + ';' +
        'color: white; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.15);' +
        'z-index: 10000; font-size: 14px; transition: opacity 0.3s;';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(function() {
        toast.style.opacity = '0';
        setTimeout(function() {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

export function updateMarkersList(markers, getCategoryName, getCategoryColor, onFocusMarker, onDeleteMarker) {
    const listDiv = document.getElementById('markersList');
    if (!listDiv) return;

    if (!markers || markers.length === 0) {
        listDiv.innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">暂无标注</p>';
        return;
    }

    let html = '';
    markers.forEach(function(marker) {
        if (!marker || typeof marker.lat !== 'number' || typeof marker.lng !== 'number') return;

        const categoryName = getCategoryName(marker.categoryId);
        const categoryColor = getColorValue(getCategoryColor(marker.categoryId));

        html += '<div class="marker-item" data-id="' + escapeHtml(marker.id) + '"' +
            ' onclick="window.focusOnMarker(' + marker.lng + ', ' + marker.lat + ', \'' + escapeHtml(marker.id) + '\')">' +
            '<span class="delete-btn" onclick="window.deleteMarker(\'' + escapeHtml(marker.id) + '\', event)">删除</span>' +
            '<h4>' + escapeHtml(marker.name) +
            '<span class="marker-category-badge" style="background: ' + categoryColor + ';">' + escapeHtml(categoryName) + '</span></h4>' +
            '<p>' + escapeHtml(marker.description || '无描述') + '</p>' +
            '<p style="font-size: 11px; color: #999;">' + marker.lat.toFixed(6) + ', ' + marker.lng.toFixed(6) + '</p>' +
            '</div>';
    });

    listDiv.innerHTML = html;
}

export function updateCategorySelect(categories, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';

    categories.forEach(function(category) {
        const option = document.createElement('div');
        option.className = 'category-option';
        option.dataset.id = category.id;
        option.innerHTML = '<span class="category-color" style="background: ' + getColorValue(category.color) + '"></span>' +
            '<span class="category-name">' + escapeHtml(category.name) + '</span>';
        container.appendChild(option);
    });
}

export function updateMarkerStats(totalMarkers, totalCategories) {
    const totalMarkersElement = document.getElementById('totalMarkers');
    const totalCategoriesElement = document.getElementById('totalCategories');

    if (totalMarkersElement) totalMarkersElement.textContent = totalMarkers;
    if (totalCategoriesElement) totalCategoriesElement.textContent = totalCategories;
}

export function highlightMarkerInList(markerId) {
    const markerItems = document.querySelectorAll('.marker-item');
    markerItems.forEach(function(item) {
        item.style.background = '#f9f9f9';
    });

    const targetItem = document.querySelector('.marker-item[data-id="' + markerId + '"]');
    if (targetItem) {
        targetItem.style.background = '#e3f2fd';
        targetItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

export function showNearbyResults(nearbyMarkers, radius, getCategoryName, getCategoryColor) {
    const listDiv = document.getElementById('searchResults');
    if (!listDiv) return;

    if (!nearbyMarkers || nearbyMarkers.length === 0) {
        listDiv.innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">附近 ' + radius + ' 米内没有标注</p>';
        return;
    }

    let html = '<h4 style="margin-bottom: 15px; color: #333;">附近 ' + radius + ' 米内找到 ' + nearbyMarkers.length + ' 个标注</h4>';

    nearbyMarkers.forEach(function(item) {
        const marker = item.marker;
        const distance = Math.round(item.distance);
        const categoryName = getCategoryName(marker.categoryId);
        const categoryColor = getColorValue(getCategoryColor(marker.categoryId));

        html += '<div style="padding: 10px; margin-bottom: 8px; background: #f5f5f5; border-radius: 8px; border-left: 4px solid ' + categoryColor + ';">' +
            '<div style="font-weight: bold; color: #333; margin-bottom: 5px;">' + escapeHtml(marker.name) + '</div>' +
            '<div style="font-size: 12px; color: #666;">' + escapeHtml(marker.description || '无描述') + '</div>' +
            '<div style="font-size: 12px; color: #2196F3; margin-top: 5px;">距离：' + formatDistance(distance) + '</div>' +
            '</div>';
    });

    listDiv.innerHTML = html;
}

export function renderMarkersTable(markers, getCategoryName, getCategoryColor) {
    const tbody = document.getElementById('markersTableBody');
    const noMsg = document.getElementById('noMarkersMessage');

    if (!tbody) return;

    if (!markers || markers.length === 0) {
        tbody.innerHTML = '';
        if (noMsg) noMsg.style.display = 'block';
        return;
    }

    if (noMsg) noMsg.style.display = 'none';

    tbody.innerHTML = markers.map(function(marker, index) {
        const categoryName = getCategoryName(marker.categoryId);
        const categoryColor = getColorValue(getCategoryColor(marker.categoryId));

        return '<tr>' +
            '<td style="text-align: center;"><input type="checkbox" class="marker-checkbox" data-id="' + escapeHtml(marker.id) + '" style="width: 18px; height: 18px; cursor: pointer;"></td>' +
            '<td>' + (index + 1) + '</td>' +
            '<td>' + escapeHtml(marker.name) + '</td>' +
            '<td><span style="display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 11px; color: white; background: ' + categoryColor + ';">' + escapeHtml(categoryName) + '</span></td>' +
            '<td>' + escapeHtml(marker.description || '-') + '</td>' +
            '<td style="font-size: 11px;">' + marker.lat.toFixed(6) + ', ' + marker.lng.toFixed(6) + '</td>' +
            '<td style="font-size: 11px; color: #999;">' + escapeHtml(marker.createdAt || '-') + '</td>' +
            '<td><div class="action-btns">' +
                '<button class="btn-view" onclick="window.focusOnMarker(' + marker.lng + ', ' + marker.lat + ', \'' + escapeHtml(marker.id) + '\')">查看</button>' +
                '<button class="btn-delete-small" onclick="window.deleteMarker(\'' + escapeHtml(marker.id) + '\')">删除</button>' +
            '</div></td>' +
        '</tr>';
    }).join('');
}

export function updateMarkerStatsPanel(markers, categories) {
    const statsDiv = document.getElementById('markerStats');
    if (!statsDiv) return;

    const categoryStats = categories.map(cat => {
        const count = markers.filter(m => m.categoryId === cat.id || (cat.id === 'default' && !m.categoryId)).length;
        return { name: cat.name, color: cat.color, count: count };
    });

    let html = '<div style="margin-bottom: 10px; font-size: 14px; font-weight: bold;">总标注数: ' + markers.length + '</div>';

    categoryStats.forEach(stat => {
        html += '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">' +
            '<span style="display: flex; align-items: center; gap: 8px;">' +
                '<span style="width: 12px; height: 12px; background: ' + getColorValue(stat.color) + '; border-radius: 50%; display: inline-block;"></span>' +
                escapeHtml(stat.name) +
            '</span>' +
            '<span style="font-weight: bold;">' + stat.count + '</span>' +
        '</div>';
    });

    statsDiv.innerHTML = html;
}

export function updateBatchDeleteButton() {
    const btn = document.getElementById('batchDeleteBtn');
    if (!btn) return;

    const checked = document.querySelectorAll('.marker-checkbox:checked');
    btn.textContent = '🗑️ 批量删除 (' + checked.length + ')';
}

export function switchTab(tab) {
    const tabItems = document.querySelectorAll('.tab-item');
    tabItems.forEach(item => item.classList.remove('active'));

    ['mapView', 'addView', 'categoryView', 'tableView'].forEach(viewId => {
        const view = document.getElementById(viewId);
        if (view) view.style.display = 'none';
    });

    switch(tab) {
        case 'map':
            document.getElementById('mapView').style.display = 'flex';
            tabItems[0].classList.add('active');
            break;
        case 'add':
            window.location.href = 'add-marker.html';
            break;
        case 'category':
            document.getElementById('categoryView').style.display = 'block';
            tabItems[2].classList.add('active');
            break;
        case 'table':
            document.getElementById('tableView').style.display = 'flex';
            tabItems[3].classList.add('active');
            break;
    }
}
