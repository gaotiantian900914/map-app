/**
 * 存储服务模块
 * 处理数据的持久化（localStorage + 云开发）
 */

const TCB_ENV_ID = 'map-app-1gu1wii1bfe2604c';

const STORAGE_KEYS = {
    MARKERS: 'mapMarkers',
    CATEGORIES: 'mapCategories'
};

let app = null;
let db = null;
let cloudEnabled = false;

export async function initCloudBase() {
    if (typeof window.tcb === 'undefined') {
        cloudEnabled = false;
        return false;
    }

    try {
        app = window.tcb.init({ env: TCB_ENV_ID });
        db = app.database();
        cloudEnabled = true;
        return true;
    } catch (error) {
        console.error('云开发初始化失败:', error);
        cloudEnabled = false;
        return false;
    }
}

export function isCloudEnabled() {
    return cloudEnabled && db;
}

export async function saveMarkers(markers) {
    try {
        localStorage.setItem(STORAGE_KEYS.MARKERS, JSON.stringify(markers));
    } catch (error) {
        console.error('保存到 localStorage 失败:', error);
    }

    if (cloudEnabled && db) {
        try {
            await db.collection('markers').doc('all-markers').set({
                markers: markers
            });
        } catch (error) {
            console.error('同步到云开发失败:', error);
        }
    }
}

export async function loadMarkers() {
    if (cloudEnabled && db) {
        try {
            const res = await db.collection('markers').doc('all-markers').get();
            if (res.data && res.data.markers && res.data.markers.length > 0) {
                localStorage.setItem(STORAGE_KEYS.MARKERS, JSON.stringify(res.data.markers));
                return res.data.markers;
            }
        } catch (error) {
            console.error('从云开发加载失败:', error);
        }
    }

    try {
        const data = localStorage.getItem(STORAGE_KEYS.MARKERS);
        if (data) {
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('从 localStorage 加载失败:', error);
    }

    return [];
}

export function saveCategories(categories) {
    try {
        localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
    } catch (error) {
        console.error('保存分类失败:', error);
    }
}

export function loadCategories() {
    try {
        const data = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
        if (data) {
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('加载分类失败:', error);
    }

    return null;
}

export function clearAllData() {
    localStorage.removeItem(STORAGE_KEYS.MARKERS);
    localStorage.removeItem(STORAGE_KEYS.CATEGORIES);
}
