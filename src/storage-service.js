/**
 * 存储服务模块
 * 处理数据的持久化（localStorage + 云开发）
 */

// 云开发环境 ID
const TCB_ENV_ID = 'map-app-1gu1wii1bfe2604c';

// 云开发相关变量
let app = null;
let db = null;
let cloudEnabled = false;

/**
 * 初始化云开发
 * @returns {Promise<boolean>} 是否成功
 */
export async function initCloudBase() {
    console.log('检查云开发 SDK...');
    
    if (typeof window.tcb === 'undefined') {
        console.warn('云开发 SDK 未加载，将使用 localStorage 存储');
        cloudEnabled = false;
        return false;
    }
    
    try {
        app = window.tcb.init({ env: TCB_ENV_ID });
        db = app.database();
        cloudEnabled = true;
        console.log('云开发初始化成功');
        return true;
    } catch (error) {
        console.error('云开发初始化失败:', error);
        cloudEnabled = false;
        return false;
    }
}

/**
 * 检查云开发是否可用
 * @returns {boolean}
 */
export function isCloudEnabled() {
    return cloudEnabled && db;
}

/**
 * 保存标记数据
 * @param {Array} markers - 标记数组
 * @returns {Promise<void>}
 */
export async function saveMarkers(markers) {
    // 保存到 localStorage
    try {
        localStorage.setItem('myMapMarkers', JSON.stringify(markers));
        console.log('标记已保存到 localStorage');
    } catch (error) {
        console.error('保存到 localStorage 失败:', error);
    }
    
    // 如果云开发可用，同步到云端
    if (cloudEnabled && db) {
        try {
            await db.collection('markers').doc('all-markers').set({
                markers: markers
            });
            console.log('标记已同步到云开发');
        } catch (error) {
            console.error('同步到云开发失败:', error);
        }
    }
}

/**
 * 加载标记数据
 * @returns {Promise<Array>} 标记数组
 */
export async function loadMarkers() {
    // 如果云开发可用，优先从云端加载
    if (cloudEnabled && db) {
        try {
            const res = await db.collection('markers').doc('all-markers').get();
            if (res.data && res.data.markers && res.data.markers.length > 0) {
                console.log('从云开发加载标记数据:', res.data.markers.length);
                // 保存到 localStorage 作为备份
                localStorage.setItem('myMapMarkers', JSON.stringify(res.data.markers));
                return res.data.markers;
            }
        } catch (error) {
            console.error('从云开发加载失败:', error);
        }
    }
    
    // 从 localStorage 加载
    try {
        const data = localStorage.getItem('myMapMarkers');
        if (data) {
            const markers = JSON.parse(data);
            console.log('从 localStorage 加载标记数据:', markers.length);
            return markers;
        }
    } catch (error) {
        console.error('从 localStorage 加载失败:', error);
    }
    
    return [];
}

/**
 * 保存分类数据
 * @param {Array} categories - 分类数组
 */
export function saveCategories(categories) {
    try {
        localStorage.setItem('mapCategories', JSON.stringify(categories));
        console.log('分类已保存到 localStorage');
    } catch (error) {
        console.error('保存分类失败:', error);
    }
}

/**
 * 加载分类数据
 * @returns {Array} 分类数组
 */
export function loadCategories() {
    try {
        const data = localStorage.getItem('mapCategories');
        if (data) {
            const categories = JSON.parse(data);
            console.log('从 localStorage 加载分类数据:', categories.length);
            return categories;
        }
    } catch (error) {
        console.error('加载分类失败:', error);
    }
    
    return null;
}

/**
 * 清除所有数据
 */
export function clearAllData() {
    localStorage.removeItem('myMapMarkers');
    localStorage.removeItem('mapCategories');
    console.log('所有数据已清除');
}
