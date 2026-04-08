/**
 * 分类服务模块
 * 管理地图标注的分类
 */

import { saveCategories, loadCategories } from './storage-service.js';

// 默认分类
const DEFAULT_CATEGORIES = [
    { id: 'default', name: '默认', color: 'blue' },
    { id: 'restaurant', name: '餐厅', color: 'red' },
    { id: 'hotel', name: '酒店', color: 'green' },
    { id: 'scenic', name: '景点', color: 'yellow' },
    { id: 'shopping', name: '购物', color: 'purple' },
    { id: 'transport', name: '交通', color: 'orange' },
    { id: 'charging', name: '充电站', color: 'cyan' }
];

// 当前分类列表
let categories = [];

/**
 * 初始化分类
 * @returns {Array} 分类数组
 */
export function initCategories() {
    const savedCategories = loadCategories();
    
    if (savedCategories && savedCategories.length > 0) {
        categories = savedCategories;
    } else {
        categories = [...DEFAULT_CATEGORIES];
        saveCategories(categories);
    }
    
    return categories;
}

/**
 * 获取所有分类
 * @returns {Array} 分类数组
 */
export function getCategories() {
    return categories;
}

/**
 * 根据 ID 获取分类
 * @param {string} categoryId - 分类 ID
 * @returns {Object|null} 分类对象
 */
export function getCategoryById(categoryId) {
    return categories.find(c => c.id === categoryId) || null;
}

/**
 * 获取分类名称
 * @param {string} categoryId - 分类 ID
 * @returns {string} 分类名称
 */
export function getCategoryName(categoryId) {
    const category = getCategoryById(categoryId);
    return category ? category.name : '默认';
}

/**
 * 获取分类颜色
 * @param {string} categoryId - 分类 ID
 * @returns {string} 颜色值
 */
export function getCategoryColor(categoryId) {
    const category = getCategoryById(categoryId);
    return category ? category.color : 'blue';
}

/**
 * 添加新分类
 * @param {Object} category - 分类对象
 */
export function addCategory(category) {
    categories.push(category);
    saveCategories(categories);
}

/**
 * 删除分类
 * @param {string} categoryId - 分类 ID
 */
export function deleteCategory(categoryId) {
    if (categoryId === 'default') {
        console.warn('不能删除默认分类');
        return false;
    }
    
    const index = categories.findIndex(c => c.id === categoryId);
    if (index > -1) {
        categories.splice(index, 1);
        saveCategories(categories);
        return true;
    }
    
    return false;
}

/**
 * 更新分类
 * @param {string} categoryId - 分类 ID
 * @param {Object} data - 更新的数据
 */
export function updateCategory(categoryId, data) {
    const category = getCategoryById(categoryId);
    if (category) {
        Object.assign(category, data);
        saveCategories(categories);
        return true;
    }
    return false;
}
