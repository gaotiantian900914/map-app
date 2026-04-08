/**
 * UI 服务模块
 * 处理用户界面相关的操作
 */

import { getColorValue } from './utils.js';

/**
 * 显示状态消息（Toast 提示）
 * @param {string} message - 消息内容
 * @param {string} type - 消息类型：success, error, info
 */
export function showStatus(message, type = 'info') {
    console.log('状态消息:', message, type);
    
    // 创建 toast 元素
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        padding: 12px 24px;
        background: ${type === 'error' ? '#f44336' : type === 'success' ? '#4CAF50' : '#2196F3'};
        color: white;
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        z-index: 10000;
        font-size: 14px;
        transition: opacity 0.3s;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // 3 秒后移除
    setTimeout(function() {
        toast.style.opacity = '0';
        setTimeout(function() {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

/**
 * 更新标记列表 UI
 * @param {Array} markers - 标记数组
 * @param {Function} getCategoryName - 获取分类名称的函数
 * @param {Function} getCategoryColor - 获取分类颜色的函数
 * @param {Function} onFocusMarker - 聚焦标记的回调
 * @param {Function} onDeleteMarker - 删除标记的回调
 */
export function updateMarkersList(markers, getCategoryName, getCategoryColor, onFocusMarker, onDeleteMarker) {
    const listDiv = document.getElementById('markersList');
    if (!listDiv) {
        console.log('markersList 元素不存在，跳过更新');
        return;
    }
    
    if (!markers || markers.length === 0) {
        listDiv.innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">暂无标注</p>';
        return;
    }
    
    let html = '';
    markers.forEach(function(marker) {
        // 验证标记数据是否有效
        if (!marker || typeof marker.lat !== 'number' || typeof marker.lng !== 'number' || isNaN(marker.lat) || isNaN(marker.lng)) {
            console.warn('跳过无效标记:', marker);
            return;
        }
        
        const categoryName = getCategoryName(marker.categoryId);
        const categoryColor = getColorValue(getCategoryColor(marker.categoryId));
        
        html += '<div class="marker-item" data-id="' + marker.id + '" onclick="window.focusOnMarker(' + marker.lng + ', ' + marker.lat + ', \'' + marker.id + '\')">' +
            '<span class="delete-btn" onclick="window.deleteMarker(\'' + marker.id + '\', event)">删除</span>' +
            '<h4>' + marker.name + '<span class="marker-category-badge" style="background: ' + categoryColor + ';">' + categoryName + '</span></h4>' +
            '<p>' + (marker.description || '无描述') + '</p>' +
            '<p style="font-size: 11px; color: #999;">' + marker.lat.toFixed(6) + ', ' + marker.lng.toFixed(6) + '</p>' +
            '</div>';
    });
    
    listDiv.innerHTML = html;
}

/**
 * 更新分类选择器
 * @param {Array} categories - 分类数组
 * @param {string} containerId - 容器 ID
 */
export function updateCategorySelect(categories, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '';
    
    categories.forEach(function(category) {
        const option = document.createElement('div');
        option.className = 'category-option';
        option.dataset.id = category.id;
        option.innerHTML = `
            <span class="category-color" style="background: ${getColorValue(category.color)}"></span>
            <span class="category-name">${category.name}</span>
        `;
        container.appendChild(option);
    });
}

/**
 * 更新统计信息
 * @param {number} totalMarkers - 总标记数
 * @param {number} totalCategories - 总分类数
 */
export function updateMarkerStats(totalMarkers, totalCategories) {
    const totalMarkersElement = document.getElementById('totalMarkers');
    const totalCategoriesElement = document.getElementById('totalCategories');
    
    if (totalMarkersElement) {
        totalMarkersElement.textContent = totalMarkers;
    }
    if (totalCategoriesElement) {
        totalCategoriesElement.textContent = totalCategories;
    }
}

/**
 * 高亮显示标记列表项
 * @param {string} markerId - 标记 ID
 */
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

/**
 * 显示搜索结果
 * @param {Array} nearbyMarkers - 附近的标记（带距离）
 * @param {number} radius - 搜索半径
 * @param {Function} getCategoryName - 获取分类名称的函数
 * @param {Function} getCategoryColor - 获取分类颜色的函数
 */
export function showNearbyResults(nearbyMarkers, radius, getCategoryName, getCategoryColor) {
    const listDiv = document.getElementById('markersList');
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
            '<div style="font-weight: bold; color: #333; margin-bottom: 5px;">' + marker.name + '</div>' +
            '<div style="font-size: 12px; color: #666;">' + (marker.description || '无描述') + '</div>' +
            '<div style="font-size: 12px; color: #2196F3; margin-top: 5px;">距离：' + distance + ' 米</div>' +
            '</div>';
    });
    
    listDiv.innerHTML = html;
}

/**
 * 切换 Tab
 * @param {string} tabName - Tab 名称
 */
export function switchTab(tabName) {
    // 隐藏所有视图
    document.querySelectorAll('.view-section').forEach(function(section) {
        section.style.display = 'none';
    });
    
    // 移除所有 tab 的 active 状态
    document.querySelectorAll('.tab-btn').forEach(function(btn) {
        btn.classList.remove('active');
    });
    
    // 显示目标视图
    const targetView = document.getElementById(tabName + 'View');
    if (targetView) {
        targetView.style.display = 'block';
    }
    
    // 激活对应 tab
    const targetTab = document.querySelector('.tab-btn[onclick*="' + tabName + '"]');
    if (targetTab) {
        targetTab.classList.add('active');
    }
}
