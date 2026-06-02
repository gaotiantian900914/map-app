import { escapeHtml, fuzzyMatch } from './utils.js';

const STORAGE_KEY = 'mapSearchHistory';
const MAX_RECORDS = 500;
const PAGE_SIZE = 10;

let historyList = [];
let currentPage = 1;
let currentCriteria = {};
let currentSort = { field: 'createdAt', order: 'desc' };

export function initSearchHistory() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (data) {
            historyList = JSON.parse(data);
        }
    } catch (e) {
        historyList = [];
    }
    currentPage = 1;
    currentCriteria = {};
    return historyList;
}

export function getSearchHistory() {
    return historyList;
}

export function addSearchRecord(record) {
    const item = {
        id: 'sh_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
        type: record.type || 'search',
        keyword: record.keyword || '',
        name: record.name || '',
        address: record.address || '',
        lat: record.lat,
        lng: record.lng,
        source: record.source || 'map',
        createdAt: new Date().toISOString()
    };

    historyList.unshift(item);

    if (historyList.length > MAX_RECORDS) {
        historyList = historyList.slice(0, MAX_RECORDS);
    }

    saveHistory();
    return item;
}

export function deleteSearchRecord(id) {
    const index = historyList.findIndex(r => r.id === id);
    if (index > -1) {
        historyList.splice(index, 1);
        saveHistory();
        return true;
    }
    return false;
}

export function deleteSearchRecordsBatch(ids) {
    const idSet = new Set(ids);
    historyList = historyList.filter(r => !idSet.has(r.id));
    saveHistory();
    return true;
}

export function clearSearchHistory() {
    historyList = [];
    saveHistory();
}

export function filterSearchHistory(criteria) {
    let filtered = historyList;

    if (criteria.type && criteria.type !== 'all') {
        filtered = filtered.filter(r => r.type === criteria.type);
    }

    if (criteria.source && criteria.source !== 'all') {
        filtered = filtered.filter(r => r.source === criteria.source);
    }

    if (criteria.keyword && criteria.keyword.trim()) {
        const kw = criteria.keyword.trim();
        filtered = filtered.filter(r =>
            fuzzyMatch(r.name, kw) ||
            fuzzyMatch(r.keyword, kw) ||
            fuzzyMatch(r.address, kw)
        );
    }

    if (criteria.startDate) {
        var start = new Date(criteria.startDate);
        start.setHours(0, 0, 0, 0);
        filtered = filtered.filter(r => new Date(r.createdAt) >= start);
    }

    if (criteria.endDate) {
        var end = new Date(criteria.endDate);
        end.setHours(23, 59, 59, 999);
        filtered = filtered.filter(r => new Date(r.createdAt) <= end);
    }

    return filtered;
}

export function getSearchHistoryStats() {
    const searchCount = historyList.filter(r => r.type === 'search').length;
    const locationCount = historyList.filter(r => r.type === 'location').length;
    var now = new Date();
    var todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    var monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    var todayCount = historyList.filter(r => new Date(r.createdAt) >= todayStart).length;
    var weekCount = historyList.filter(r => new Date(r.createdAt) >= weekStart).length;
    var monthCount = historyList.filter(r => new Date(r.createdAt) >= monthStart).length;
    return {
        total: historyList.length,
        searchCount: searchCount,
        locationCount: locationCount,
        todayCount: todayCount,
        weekCount: weekCount,
        monthCount: monthCount
    };
}

function saveHistory() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(historyList));
    } catch (e) {
        console.error('保存搜索记录失败:', e);
    }
}

export function renderSearchHistoryTable(criteria, page) {
    var tableContainer = document.getElementById('historyTableContainer');
    var emptyState = document.getElementById('historyEmptyState');
    var statsDiv = document.getElementById('historyStats');
    var paginationDiv = document.getElementById('historyPagination');

    if (!tableContainer) return;

    if (criteria) currentCriteria = criteria;
    if (page) currentPage = page;

    var filtered = filterSearchHistory(currentCriteria);

    filtered = sortRecords(filtered, currentSort.field, currentSort.order);

    var stats = getSearchHistoryStats();

    if (statsDiv) {
        statsDiv.innerHTML =
            '<div style="font-size: 15px; font-weight: bold; color: #333;">🔍 全部记录 <span style="color: #667eea; font-size: 20px;">' + stats.total + '</span> 条</div>' +
            '<div style="display: flex; align-items: center; gap: 6px; font-size: 13px;">' +
                '<span style="width: 10px; height: 10px; background: #FF9800; border-radius: 50%; display: inline-block;"></span>' +
                '<span style="color: #666;">搜索</span><strong style="color: #333;">' + stats.searchCount + '</strong>' +
            '</div>' +
            '<div style="display: flex; align-items: center; gap: 6px; font-size: 13px;">' +
                '<span style="width: 10px; height: 10px; background: #2196F3; border-radius: 50%; display: inline-block;"></span>' +
                '<span style="color: #666;">定位</span><strong style="color: #333;">' + stats.locationCount + '</strong>' +
            '</div>' +
            '<div style="font-size: 13px; color: #666;">今日 <strong style="color: #667eea;">' + stats.todayCount + '</strong> 条</div>' +
            '<div style="font-size: 13px; color: #666;">本周 <strong style="color: #667eea;">' + stats.weekCount + '</strong> 条</div>' +
            '<div style="font-size: 13px; color: #666;">本月 <strong style="color: #667eea;">' + stats.monthCount + '</strong> 条</div>' +
            '<div style="font-size: 13px; color: #999;">筛选结果 <strong style="color: #667eea;">' + filtered.length + '</strong> 条</div>';
    }

    if (filtered.length === 0) {
        tableContainer.innerHTML = '';
        if (emptyState) emptyState.style.display = 'flex';
        if (paginationDiv) paginationDiv.innerHTML = '';
        return;
    }

    if (emptyState) emptyState.style.display = 'none';

    var totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    var startIdx = (currentPage - 1) * PAGE_SIZE;
    var endIdx = Math.min(startIdx + PAGE_SIZE, filtered.length);
    var pageData = filtered.slice(startIdx, endIdx);

    var nameArrow = getSortArrow('name');
    var timeArrow = getSortArrow('createdAt');

    var html = '<table style="width: 100%; border-collapse: separate; border-spacing: 0; background: white;">' +
        '<thead style="position: sticky; top: 0; z-index: 10;">' +
            '<tr>' +
                '<th style="width: 50px; text-align: center; border-radius: 8px 0 0 0;">#</th>' +
                '<th style="width: 70px;">类型</th>' +
                '<th style="min-width: 150px; cursor: pointer; user-select: none;" onclick="window.sortHistory(\'name\')">名称 ' + nameArrow + '</th>' +
                '<th style="min-width: 200px;">地址</th>' +
                '<th style="width: 100px;">来源</th>' +
                '<th style="width: 160px; cursor: pointer; user-select: none;" onclick="window.sortHistory(\'createdAt\')">时间 ' + timeArrow + '</th>' +
                '<th style="width: 120px; text-align: center; border-radius: 0 8px 0 0;">操作</th>' +
            '</tr>' +
        '</thead>' +
        '<tbody>';

    pageData.forEach(function(record, idx) {
        var typeIcon = record.type === 'location' ? '📍' : '🔎';
        var typeLabel = record.type === 'location' ? '定位' : '搜索';
        var typeBg = record.type === 'location' ? '#2196F3' : '#FF9800';
        var sourceLabel = record.source === 'add' ? '新增标注页' : '地图视图';
        var timeStr = formatTime(record.createdAt);
        var fullTime = formatFullTime(record.createdAt);
        var globalIdx = startIdx + idx + 1;

        html += '<tr style="border-bottom: 1px solid #f0f0f0; transition: background 0.2s;" onmouseover="this.style.background=\'#f5f7fa\'" onmouseout="this.style.background=\'white\'">' +
            '<td style="text-align: center; padding: 12px 8px; color: #999; font-size: 12px;">' + globalIdx + '</td>' +
            '<td style="padding: 12px 8px;"><span style="display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 10px; font-size: 11px; color: white; background: ' + typeBg + ';">' + typeIcon + ' ' + typeLabel + '</span></td>' +
            '<td style="padding: 12px 8px; font-weight: 500; color: #333; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">' + escapeHtml(record.name || record.keyword || '未知地点') + '</td>' +
            '<td style="padding: 12px 8px; color: #888; font-size: 12px; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">' + escapeHtml(record.address || '-') + '</td>' +
            '<td style="padding: 12px 8px; font-size: 12px; color: #999;">' + sourceLabel + '</td>' +
            '<td style="padding: 12px 8px; font-size: 12px; color: #999;" title="' + fullTime + '">' + timeStr + '</td>' +
            '<td style="padding: 12px 8px; text-align: center;"><div class="action-btns" style="justify-content: center;">' +
                '<button class="btn-view" onclick="window.gotoHistoryLocation(' + record.lng + ', ' + record.lat + ', \'' + escapeHtml((record.name || '').replace(/'/g, "\\'")) + '\')" style="padding: 4px 10px; font-size: 11px;">📍 前往</button>' +
                '<button class="btn-delete-small" onclick="window.deleteHistoryRecord(\'' + escapeHtml(record.id) + '\')" style="padding: 4px 10px; font-size: 11px;">🗑️</button>' +
            '</div></td>' +
        '</tr>';
    });

    html += '</tbody></table>';
    tableContainer.innerHTML = html;

    if (paginationDiv) {
        if (totalPages <= 1) {
            paginationDiv.innerHTML = '<div style="text-align: center; font-size: 12px; color: #999; padding: 10px;">共 ' + filtered.length + ' 条记录</div>';
        } else {
            var pHtml = '<div style="display: flex; justify-content: center; align-items: center; gap: 6px; padding: 15px 0; flex-wrap: wrap;">';

            pHtml += '<button onclick="window.gotoHistoryPage(1)" ' + (currentPage === 1 ? 'disabled' : '') +
                ' style="padding: 6px 10px; border: 1px solid #e0e0e0; background: white; color: #666; border-radius: 6px; cursor: pointer; font-size: 12px;' + (currentPage === 1 ? ' opacity: 0.4; cursor: not-allowed;' : '') + '">首页</button>';

            pHtml += '<button onclick="window.gotoHistoryPage(' + (currentPage - 1) + ')" ' + (currentPage === 1 ? 'disabled' : '') +
                ' style="padding: 6px 10px; border: 1px solid #e0e0e0; background: white; color: #666; border-radius: 6px; cursor: pointer; font-size: 12px;' + (currentPage === 1 ? ' opacity: 0.4; cursor: not-allowed;' : '') + '">上一页</button>';

            var startPage = Math.max(1, currentPage - 2);
            var endPage = Math.min(totalPages, currentPage + 2);
            if (startPage > 1) pHtml += '<span style="color: #999; font-size: 12px;">...</span>';

            for (var p = startPage; p <= endPage; p++) {
                if (p === currentPage) {
                    pHtml += '<button style="padding: 6px 12px; border: none; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 6px; font-size: 12px; font-weight: 600; min-width: 36px;">' + p + '</button>';
                } else {
                    pHtml += '<button onclick="window.gotoHistoryPage(' + p + ')" style="padding: 6px 12px; border: 1px solid #e0e0e0; background: white; color: #666; border-radius: 6px; cursor: pointer; font-size: 12px; min-width: 36px;">' + p + '</button>';
                }
            }

            if (endPage < totalPages) pHtml += '<span style="color: #999; font-size: 12px;">...</span>';

            pHtml += '<button onclick="window.gotoHistoryPage(' + (currentPage + 1) + ')" ' + (currentPage === totalPages ? 'disabled' : '') +
                ' style="padding: 6px 10px; border: 1px solid #e0e0e0; background: white; color: #666; border-radius: 6px; cursor: pointer; font-size: 12px;' + (currentPage === totalPages ? ' opacity: 0.4; cursor: not-allowed;' : '') + '">下一页</button>';

            pHtml += '<button onclick="window.gotoHistoryPage(' + totalPages + ')" ' + (currentPage === totalPages ? 'disabled' : '') +
                ' style="padding: 6px 10px; border: 1px solid #e0e0e0; background: white; color: #666; border-radius: 6px; cursor: pointer; font-size: 12px;' + (currentPage === totalPages ? ' opacity: 0.4; cursor: not-allowed;' : '') + '">末页</button>';

            pHtml += '<span style="font-size: 12px; color: #999; margin-left: 8px;">第 ' + currentPage + '/' + totalPages + ' 页，共 ' + filtered.length + ' 条</span>';

            pHtml += '</div>';
            paginationDiv.innerHTML = pHtml;
        }
    }
}

function sortRecords(records, field, order) {
    return records.slice().sort(function(a, b) {
        var va = a[field] || '';
        var vb = b[field] || '';
        if (field === 'createdAt') {
            va = new Date(va).getTime() || 0;
            vb = new Date(vb).getTime() || 0;
            return order === 'asc' ? va - vb : vb - va;
        }
        va = va.toString().toLowerCase();
        vb = vb.toString().toLowerCase();
        if (va < vb) return order === 'asc' ? -1 : 1;
        if (va > vb) return order === 'asc' ? 1 : -1;
        return 0;
    });
}

function getSortArrow(field) {
    if (currentSort.field !== field) return '<span style="color: #ccc; font-size: 10px;">▲▼</span>';
    if (currentSort.order === 'asc') return '<span style="color: #667eea; font-size: 10px;">▲</span><span style="color: #ccc; font-size: 10px;">▼</span>';
    return '<span style="color: #ccc; font-size: 10px;">▲</span><span style="color: #667eea; font-size: 10px;">▼</span>';
}

export function setHistorySort(field) {
    if (currentSort.field === field) {
        currentSort.order = currentSort.order === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.field = field;
        currentSort.order = field === 'createdAt' ? 'desc' : 'asc';
    }
    currentPage = 1;
    renderSearchHistoryTable(null, 1);
}

function formatTime(isoStr) {
    if (!isoStr) return '-';
    var d = new Date(isoStr);
    var now = new Date();
    var diff = now - d;

    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return Math.floor(diff / 60000) + ' 分钟前';
    if (diff < 86400000) return Math.floor(diff / 3600000) + ' 小时前';
    if (diff < 172800000) return '昨天 ' + d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');

    return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
}

function formatFullTime(isoStr) {
    if (!isoStr) return '';
    var d = new Date(isoStr);
    return d.getFullYear() + '-' + (d.getMonth() + 1).toString().padStart(2, '0') + '-' + d.getDate().toString().padStart(2, '0') + ' ' +
        d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0') + ':' + d.getSeconds().toString().padStart(2, '0');
}
