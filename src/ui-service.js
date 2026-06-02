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

let markerSort = { field: 'createdAt', order: 'desc' };

export function renderMarkersTable(markers, getCategoryName, getCategoryColor) {
    const tbody = document.getElementById('markersTableBody');
    const noMsg = document.getElementById('noMarkersMessage');
    const tableContent = tbody ? tbody.closest('.table-content') : null;

    if (!tbody) return;

    if (!markers || markers.length === 0) {
        tbody.innerHTML = '';
        if (noMsg) noMsg.style.display = 'block';
        if (tableContent) tableContent.style.display = 'none';
        return;
    }

    if (noMsg) noMsg.style.display = 'none';
    if (tableContent) tableContent.style.display = '';

    var sorted = markers.slice().sort(function(a, b) {
        var va = a[markerSort.field] || '';
        var vb = b[markerSort.field] || '';
        if (markerSort.field === 'createdAt') {
            va = new Date(va).getTime() || 0;
            vb = new Date(vb).getTime() || 0;
            return markerSort.order === 'asc' ? va - vb : vb - va;
        }
        va = va.toString().toLowerCase();
        vb = vb.toString().toLowerCase();
        if (va < vb) return markerSort.order === 'asc' ? -1 : 1;
        if (va > vb) return markerSort.order === 'asc' ? 1 : -1;
        return 0;
    });

    var nameArrow = getMarkerSortArrow('name');
    var timeArrow = getMarkerSortArrow('createdAt');

    var thead = tbody.closest('table').querySelector('thead tr');
    if (thead) {
        var ths = thead.querySelectorAll('th');
        ths[2].innerHTML = '名称 ' + nameArrow;
        ths[2].style.cursor = 'pointer';
        ths[2].style.userSelect = 'none';
        ths[2].onclick = function() { window.sortMarkers('name'); };
        ths[7].innerHTML = '创建时间 ' + timeArrow;
        ths[7].style.cursor = 'pointer';
        ths[7].style.userSelect = 'none';
        ths[7].onclick = function() { window.sortMarkers('createdAt'); };
    }

    tbody.innerHTML = sorted.map(function(marker, index) {
        const categoryName = getCategoryName(marker.categoryId);
        const categoryColor = getColorValue(getCategoryColor(marker.categoryId));

        return '<tr style="border-bottom: 1px solid #f0f0f0; transition: background 0.2s;" onmouseover="this.style.background=\'#f5f7fa\'" onmouseout="this.style.background=\'white\'">' +
            '<td style="text-align: center; padding: 12px 8px;"><input type="checkbox" class="marker-checkbox" data-id="' + escapeHtml(marker.id) + '" style="width: 16px; height: 16px; cursor: pointer;"></td>' +
            '<td style="padding: 12px 8px; color: #999; font-size: 12px; text-align: center;">' + (index + 1) + '</td>' +
            '<td style="padding: 12px 8px; font-weight: 500; color: #333;">' + escapeHtml(marker.name) + '</td>' +
            '<td style="padding: 12px 8px;"><span style="display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 11px; color: white; background: ' + categoryColor + ';">' + escapeHtml(categoryName) + '</span></td>' +
            '<td style="padding: 12px 8px; color: #666; font-size: 13px; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">' + escapeHtml(marker.description || '-') + '</td>' +
            '<td style="padding: 12px 8px; font-size: 12px; font-family: monospace; color: #555;">' + marker.lng.toFixed(6) + '</td>' +
            '<td style="padding: 12px 8px; font-size: 12px; font-family: monospace; color: #555;">' + marker.lat.toFixed(6) + '</td>' +
            '<td style="padding: 12px 8px; font-size: 12px; color: #999;">' + escapeHtml(marker.createdAt || '-') + '</td>' +
            '<td style="padding: 12px 8px; text-align: center;"><div class="action-btns" style="justify-content: center;">' +
                '<button class="btn-view" onclick="window.focusOnMarker(' + marker.lng + ', ' + marker.lat + ', \'' + escapeHtml(marker.id) + '\')" style="padding: 4px 10px; font-size: 11px;">📍 查看</button>' +
                '<button class="btn-delete-small" onclick="window.deleteMarker(\'' + escapeHtml(marker.id) + '\')" style="padding: 4px 10px; font-size: 11px;">🗑️</button>' +
            '</div></td>' +
        '</tr>';
    }).join('');
}

function getMarkerSortArrow(field) {
    if (markerSort.field !== field) return '<span style="color: #ccc; font-size: 10px;">▲▼</span>';
    if (markerSort.order === 'asc') return '<span style="color: #667eea; font-size: 10px;">▲</span><span style="color: #ccc; font-size: 10px;">▼</span>';
    return '<span style="color: #ccc; font-size: 10px;">▲</span><span style="color: #667eea; font-size: 10px;">▼</span>';
}

export function setMarkerSort(field) {
    if (markerSort.field === field) {
        markerSort.order = markerSort.order === 'asc' ? 'desc' : 'asc';
    } else {
        markerSort.field = field;
        markerSort.order = field === 'createdAt' ? 'desc' : 'asc';
    }
}

export function updateMarkerStatsPanel(markers, categories) {
    const statsDiv = document.getElementById('markerStats');
    if (!statsDiv) return;

    const categoryStats = categories.map(cat => {
        const count = markers.filter(m => m.categoryId === cat.id || (cat.id === 'default' && !m.categoryId)).length;
        return { name: cat.name, color: cat.color, count: count };
    });

    let html = '<div style="font-size: 15px; font-weight: bold; color: #333;">📊 共 <span style="color: #667eea; font-size: 20px;">' + markers.length + '</span> 条标注</div>';

    categoryStats.forEach(stat => {
        if (stat.count > 0) {
            html += '<div style="display: flex; align-items: center; gap: 6px; font-size: 13px;">' +
                '<span style="width: 10px; height: 10px; background: ' + getColorValue(stat.color) + '; border-radius: 50%; display: inline-block;"></span>' +
                '<span style="color: #666;">' + escapeHtml(stat.name) + '</span>' +
                '<span style="font-weight: bold; color: #333;">' + stat.count + '</span>' +
            '</div>';
        }
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

    ['mapView', 'addView', 'categoryView', 'tableView', 'historyView'].forEach(viewId => {
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
        case 'history':
            document.getElementById('historyView').style.display = 'block';
            tabItems[4].classList.add('active');
            break;
    }
}
