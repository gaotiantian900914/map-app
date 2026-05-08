import { escapeHtml, fuzzyMatch } from './utils.js';

const STORAGE_KEY = 'mapSearchHistory';
const MAX_RECORDS = 500;

let historyList = [];

export function initSearchHistory() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (data) {
            historyList = JSON.parse(data);
        }
    } catch (e) {
        historyList = [];
    }
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

    return filtered;
}

export function getSearchHistoryStats() {
    const searchCount = historyList.filter(r => r.type === 'search').length;
    const locationCount = historyList.filter(r => r.type === 'location').length;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayCount = historyList.filter(r => new Date(r.createdAt) >= todayStart).length;
    return {
        total: historyList.length,
        searchCount: searchCount,
        locationCount: locationCount,
        todayCount: todayCount
    };
}

function saveHistory() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(historyList));
    } catch (e) {
        console.error('保存搜索记录失败:', e);
    }
}

export function renderSearchHistoryTable(criteria) {
    const cardList = document.getElementById('historyCardList');
    const emptyState = document.getElementById('historyEmptyState');
    const statsDiv = document.getElementById('historyStats');

    if (!cardList) return;

    const filtered = filterSearchHistory(criteria || {});
    const stats = getSearchHistoryStats();

    if (statsDiv) {
        statsDiv.innerHTML =
            '<div style="font-size: 15px; font-weight: bold; color: #333;">🔍 共 <span style="color: #667eea; font-size: 20px;">' + stats.total + '</span> 条记录</div>' +
            '<div style="display: flex; align-items: center; gap: 6px; font-size: 13px;">' +
                '<span style="width: 10px; height: 10px; background: #FF9800; border-radius: 50%; display: inline-block;"></span>' +
                '<span style="color: #666;">搜索</span><strong style="color: #333;">' + stats.searchCount + '</strong>' +
            '</div>' +
            '<div style="display: flex; align-items: center; gap: 6px; font-size: 13px;">' +
                '<span style="width: 10px; height: 10px; background: #2196F3; border-radius: 50%; display: inline-block;"></span>' +
                '<span style="color: #666;">定位</span><strong style="color: #333;">' + stats.locationCount + '</strong>' +
            '</div>' +
            '<div style="font-size: 13px; color: #666;">今日 <strong style="color: #667eea;">' + stats.todayCount + '</strong> 条</div>';
    }

    if (filtered.length === 0) {
        cardList.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }

    if (emptyState) emptyState.style.display = 'none';

    cardList.innerHTML = filtered.map(function(record) {
        var typeIcon = record.type === 'location' ? '📍' : '🔎';
        var typeLabel = record.type === 'location' ? '定位' : '搜索';
        var typeBg = record.type === 'location' ? '#2196F3' : '#FF9800';
        var sourceLabel = record.source === 'add' ? '新增标注页' : '地图视图';
        var timeStr = formatTime(record.createdAt);

        return '<div style="background: white; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); padding: 16px; transition: transform 0.2s, box-shadow 0.2s;" onmouseover="this.style.transform=\'translateY(-2px)\'; this.style.boxShadow=\'0 6px 20px rgba(0,0,0,0.12)\'" onmouseout="this.style.transform=\'translateY(0)\'; this.style.boxShadow=\'0 2px 12px rgba(0,0,0,0.08)\'">' +
            '<div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">' +
                '<div style="display: flex; align-items: center; gap: 10px;">' +
                    '<span style="width: 36px; height: 36px; background: ' + typeBg + '; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-size: 16px;">' + typeIcon + '</span>' +
                    '<div>' +
                        '<div style="font-weight: 600; font-size: 15px; color: #333;">' + escapeHtml(record.name || record.keyword || '未知地点') + '</div>' +
                        (record.address ? '<div style="font-size: 12px; color: #999; margin-top: 2px;">📍 ' + escapeHtml(record.address) + '</div>' : '') +
                    '</div>' +
                '</div>' +
                '<button onclick="window.deleteHistoryRecord(\'' + escapeHtml(record.id) + '\')" style="background: none; border: none; color: #ccc; cursor: pointer; font-size: 14px; padding: 4px;" onmouseover="this.style.color=\'#f44336\'" onmouseout="this.style.color=\'#ccc\'">✕</button>' +
            '</div>' +
            '<div style="display: flex; justify-content: space-between; align-items: center;">' +
                '<div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">' +
                    '<span style="display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 11px; color: white; background: ' + typeBg + ';">' + typeLabel + '</span>' +
                    (record.keyword && record.keyword !== record.name ? '<span style="font-size: 11px; color: #999;">关键词: ' + escapeHtml(record.keyword) + '</span>' : '') +
                    '<span style="font-size: 11px; color: #bbb;">' + sourceLabel + '</span>' +
                '</div>' +
                '<div style="display: flex; align-items: center; gap: 10px;">' +
                    '<span style="font-size: 11px; color: #999;">' + timeStr + '</span>' +
                    '<button onclick="window.gotoHistoryLocation(' + record.lng + ', ' + record.lat + ', \'' + escapeHtml((record.name || '').replace(/'/g, "\\'")) + '\')" style="padding: 4px 10px; border: 1px solid #e0e0e0; background: white; color: #667eea; border-radius: 6px; cursor: pointer; font-size: 11px; transition: all 0.2s;" onmouseover="this.style.borderColor=\'#667eea\'; this.style.background=\'#667eea\'; this.style.color=\'white\'" onmouseout="this.style.borderColor=\'#e0e0e0\'; this.style.background=\'white\'; this.style.color=\'#667eea\'">📍 前往</button>' +
                '</div>' +
            '</div>' +
        '</div>';
    }).join('');
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
