/**
 * 分类服务模块
 * 管理地图标注的分类
 */

import { saveCategories, loadMarkers } from './storage-service.js';
import { escapeHtml, fuzzyMatch } from './utils.js';

const DEFAULT_CATEGORIES = [
    { id: 'default', name: '默认分类', color: '#2196F3', isDefault: true },
    { id: 'charging', name: '充电站', color: '#4CAF50', isDefault: false },
    { id: 'parking', name: '停车场', color: '#FF9800', isDefault: false },
    { id: 'xpeng', name: '小鹏超充', color: '#FF5722', isDefault: false },
    { id: 'lixiang', name: '理想超充', color: '#00BCD4', isDefault: false },
    { id: 'tesla', name: '特斯拉超充', color: '#9C27B0', isDefault: false },
    { id: 'nio', name: '蔚来换电', color: '#3F51B5', isDefault: false },
    { id: 'byd', name: '比亚迪超充', color: '#E53935', isDefault: false },
    { id: 'gac', name: '广汽能源', color: '#7CB342', isDefault: false },
    { id: 'yianqi', name: '逸安启', color: '#00897B', isDefault: false },
    { id: 'lantu', name: '岚途', color: '#546E7A', isDefault: false }
];

let categories = [];

export function initCategories() {
    const savedCategories = loadCategories();

    if (savedCategories && savedCategories.length > 0) {
        categories = savedCategories;

        DEFAULT_CATEGORIES.forEach(function(defCat) {
            const exists = categories.some(c => c.id === defCat.id);
            if (!exists) {
                categories.push({
                    ...defCat,
                    createdAt: new Date().toISOString()
                });
            }
        });

        saveCategories(categories);
    } else {
        categories = DEFAULT_CATEGORIES.map(c => ({
            ...c,
            createdAt: new Date().toISOString()
        }));
        saveCategories(categories);
    }

    return categories;
}

export function loadCategories() {
    return loadCategoriesFromStorage();
}

function loadCategoriesFromStorage() {
    try {
        const data = localStorage.getItem('mapCategories');
        if (data) {
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('加载分类失败:', error);
    }
    return null;
}

export function getCategories() {
    return categories;
}

export function getCategoryById(categoryId) {
    return categories.find(c => c.id === categoryId) || null;
}

export function getCategoryName(categoryId) {
    const category = getCategoryById(categoryId);
    return category ? category.name : '默认分类';
}

export function getCategoryColor(categoryId) {
    const category = getCategoryById(categoryId);
    return category ? category.color : '#2196F3';
}

export function addCategory(categoryData) {
    const category = {
        id: 'category_' + Date.now(),
        name: categoryData.name,
        color: categoryData.color || '#2196F3',
        isDefault: false,
        createdAt: new Date().toISOString()
    };
    categories.push(category);
    saveCategories(categories);
    return category;
}

export function deleteCategory(categoryId) {
    if (categoryId === 'default') {
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

export function updateCategory(categoryId, data) {
    const category = getCategoryById(categoryId);
    if (category) {
        Object.assign(category, data);
        saveCategories(categories);
        return true;
    }
    return false;
}

export function filterCategories(searchText, colorFilter) {
    return categories.filter(cat => {
        const matchName = fuzzyMatch(cat.name, searchText);
        const matchColor = !colorFilter || cat.color === colorFilter;
        return matchName && matchColor;
    });
}

export function renderCategoryTable() {
    const cardList = document.getElementById('categoryCardList');
    const emptyState = document.getElementById('categoryEmptyState');
    const statsDiv = document.getElementById('categoryStats');

    if (!cardList) return;

    const searchText = (document.getElementById('categorySearchInput') || {}).value || '';
    const colorFilter = (document.getElementById('categoryColorFilter') || {}).value || '';

    const filteredCategories = filterCategories(searchText, colorFilter);

    const allMarkers = JSON.parse(localStorage.getItem('mapMarkers') || '[]');

    if (statsDiv) {
        const totalCount = allMarkers.length;
        let statsHtml = '<div style="font-size: 15px; font-weight: bold; color: #333;">🏷️ 共 <span style="color: #667eea; font-size: 20px;">' + categories.length + '</span> 个分类</div>';
        statsHtml += '<div style="font-size: 13px; color: #666;">📍 总标注数: <strong>' + totalCount + '</strong></div>';
        categories.forEach(function(cat) {
            const count = allMarkers.filter(m => m.categoryId === cat.id || (cat.id === 'default' && !m.categoryId)).length;
            statsHtml += '<div style="display: flex; align-items: center; gap: 6px; font-size: 13px;">' +
                '<span style="width: 10px; height: 10px; background: ' + escapeHtml(cat.color) + '; border-radius: 50%; display: inline-block;"></span>' +
                '<span style="color: #666;">' + escapeHtml(cat.name) + '</span>' +
                '<strong style="color: #333;">' + count + '</strong>' +
            '</div>';
        });
        statsDiv.innerHTML = statsHtml;
    }

    if (filteredCategories.length === 0) {
        cardList.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }

    if (emptyState) emptyState.style.display = 'none';

    cardList.innerHTML = filteredCategories.map(cat => {
        const count = allMarkers.filter(m => m.categoryId === cat.id || (cat.id === 'default' && !m.categoryId)).length;
        const createdTime = cat.createdAt ? new Date(cat.createdAt).toLocaleDateString() : '-';

        return '<div style="background: white; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); overflow: hidden; transition: transform 0.2s, box-shadow 0.2s;" onmouseover="this.style.transform=\'translateY(-2px)\'; this.style.boxShadow=\'0 6px 20px rgba(0,0,0,0.12)\'" onmouseout="this.style.transform=\'translateY(0)\'; this.style.boxShadow=\'0 2px 12px rgba(0,0,0,0.08)\'">' +
            '<div style="height: 6px; background: ' + escapeHtml(cat.color) + ';"></div>' +
            '<div style="padding: 20px;">' +
                '<div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">' +
                    '<div style="display: flex; align-items: center; gap: 12px;">' +
                        '<span style="width: 40px; height: 40px; background: ' + escapeHtml(cat.color) + '; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; font-size: 18px; font-weight: bold;">' + escapeHtml(cat.name.charAt(0)) + '</span>' +
                        '<div>' +
                            '<div style="font-weight: 600; font-size: 16px; color: #333;">' + escapeHtml(cat.name) + '</div>' +
                            '<div style="font-size: 12px; color: #999; margin-top: 2px;">' + (cat.isDefault ? '📌 默认分类' : '创建于 ' + createdTime) + '</div>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
                '<div style="display: flex; justify-content: space-between; align-items: center;">' +
                    '<div style="display: flex; align-items: center; gap: 6px;">' +
                        '<span style="font-size: 24px; font-weight: bold; color: ' + escapeHtml(cat.color) + ';">' + count + '</span>' +
                        '<span style="font-size: 13px; color: #999;">个标注</span>' +
                    '</div>' +
                    '<div style="display: flex; gap: 8px;">' +
                        '<button onclick="window.editCategory(\'' + escapeHtml(cat.id) + '\')" style="padding: 6px 14px; border: 1px solid #e0e0e0; background: white; color: #666; border-radius: 6px; cursor: pointer; font-size: 12px; transition: all 0.2s;" onmouseover="this.style.borderColor=\'#2196F3\'; this.style.color=\'#2196F3\'" onmouseout="this.style.borderColor=\'#e0e0e0\'; this.style.color=\'#666\'">✏️ 编辑</button>' +
                        (!cat.isDefault ? '<button onclick="window.deleteCategoryById(\'' + escapeHtml(cat.id) + '\')" style="padding: 6px 14px; border: 1px solid #e0e0e0; background: white; color: #666; border-radius: 6px; cursor: pointer; font-size: 12px; transition: all 0.2s;" onmouseover="this.style.borderColor=\'#f44336\'; this.style.color=\'#f44336\'" onmouseout="this.style.borderColor=\'#e0e0e0\'; this.style.color=\'#666\'">🗑️ 删除</button>' : '') +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</div>';
    }).join('');
}

export function openCategoryModal(categoryId) {
    const modal = document.getElementById('categoryModal');
    const title = document.getElementById('categoryModalTitle');
    const nameInput = document.getElementById('categoryNameInput');
    const editId = document.getElementById('editCategoryId');

    nameInput.value = '';
    editId.value = '';

    document.querySelectorAll('#categoryModal label[onclick]').forEach(label => {
        label.style.border = '2px solid #e0e0e0';
    });

    if (categoryId) {
        const category = getCategoryById(categoryId);
        if (category) {
            title.textContent = '✏️ 编辑分类';
            nameInput.value = category.name;
            editId.value = category.id;

            const colorRadio = document.querySelector('input[name="categoryColor"][value="' + category.color + '"]');
            if (colorRadio) {
                colorRadio.checked = true;
                colorRadio.parentElement.style.border = '2px solid #667eea';
            }
        }
    } else {
        title.textContent = '➕ 新增分类';
        const colorRadio = document.querySelector('input[name="categoryColor"][value="#2196F3"]');
        if (colorRadio) {
            colorRadio.checked = true;
            colorRadio.parentElement.style.border = '2px solid #667eea';
        }
    }

    modal.style.display = 'flex';
    nameInput.focus();
}

export function closeCategoryModal() {
    const modal = document.getElementById('categoryModal');
    if (modal) modal.style.display = 'none';
}

export function selectColor(color, element) {
    document.querySelectorAll('#categoryModal label[onclick]').forEach(label => {
        label.style.border = '2px solid #e0e0e0';
    });
    element.style.border = '2px solid #667eea';
    const radio = element.querySelector('input[type="radio"]');
    if (radio) radio.checked = true;
}

export function saveCategoryFromModal() {
    const nameInput = document.getElementById('categoryNameInput');
    const editId = document.getElementById('editCategoryId');
    const name = nameInput.value.trim();

    if (!name) {
        nameInput.focus();
        nameInput.style.borderColor = '#f44336';
        return;
    }

    const selectedColor = document.querySelector('input[name="categoryColor"]:checked');
    const color = selectedColor ? selectedColor.value : '#2196F3';

    if (editId.value) {
        updateCategory(editId.value, { name: name, color: color });
    } else {
        addCategory({ name: name, color: color });
    }

    closeCategoryModal();
    renderCategoryTable();
    updateCategoryFilter();
}

export function deleteCategoryById(categoryId) {
    const category = getCategoryById(categoryId);
    if (!category) return;

    if (category.isDefault) {
        return;
    }

    if (!confirm('确定要删除分类"' + category.name + '"吗？\n\n该分类下的所有标注将被移动到默认分类。')) {
        return;
    }

    const allMarkers = JSON.parse(localStorage.getItem('mapMarkers') || '[]');
    allMarkers.forEach(marker => {
        if (marker.categoryId === categoryId) {
            marker.categoryId = 'default';
        }
    });
    localStorage.setItem('mapMarkers', JSON.stringify(allMarkers));

    deleteCategory(categoryId);
    renderCategoryTable();
    updateCategoryFilter();
}

export function updateCategoryFilter() {
    const filterSelect = document.getElementById('categoryFilter');
    if (!filterSelect) return;

    const currentValue = filterSelect.value;
    filterSelect.innerHTML = '<option value="all">全部类型</option>';

    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.id;
        option.textContent = cat.name;
        filterSelect.appendChild(option);
    });

    filterSelect.value = currentValue;
}
