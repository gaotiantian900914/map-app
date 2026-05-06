/**
 * 分类服务模块
 * 管理地图标注的分类
 */

import { saveCategories, loadMarkers } from './storage-service.js';
import { escapeHtml } from './utils.js';

const DEFAULT_CATEGORIES = [
    { id: 'default', name: '默认分类', color: '#2196F3', isDefault: true },
    { id: 'charging', name: '充电站', color: '#4CAF50', isDefault: false },
    { id: 'parking', name: '停车场', color: '#FF9800', isDefault: false }
];

let categories = [];

export function initCategories() {
    const savedCategories = loadCategories();

    if (savedCategories && savedCategories.length > 0) {
        categories = savedCategories;
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
        const matchName = !searchText || cat.name.toLowerCase().includes(searchText.toLowerCase());
        const matchColor = !colorFilter || cat.color === colorFilter;
        return matchName && matchColor;
    });
}

export function renderCategoryTable() {
    const tbody = document.getElementById('categoryTableBody');
    const emptyState = document.getElementById('categoryEmptyState');

    if (!tbody) return;

    const searchText = (document.getElementById('categorySearchInput') || {}).value || '';
    const colorFilter = (document.getElementById('categoryColorFilter') || {}).value || '';

    const filteredCategories = filterCategories(searchText, colorFilter);

    if (filteredCategories.length === 0) {
        tbody.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }

    if (emptyState) emptyState.style.display = 'none';

    const allMarkers = JSON.parse(localStorage.getItem('mapMarkers') || '[]');

    tbody.innerHTML = filteredCategories.map(cat => {
        const count = allMarkers.filter(m => m.categoryId === cat.id || (cat.id === 'default' && !m.categoryId)).length;
        const createdTime = cat.createdAt ? new Date(cat.createdAt).toLocaleDateString() : '-';

        return '<tr style="border-bottom: 1px solid #eee;">' +
            '<td style="padding: 15px;">' +
                '<span style="width: 32px; height: 32px; background: ' + escapeHtml(cat.color) + '; border-radius: 50%; display: inline-block; border: 2px solid ' + escapeHtml(cat.color) + ';"></span>' +
            '</td>' +
            '<td style="padding: 15px; font-weight: 500; color: ' + escapeHtml(cat.color) + ';">' + escapeHtml(cat.name) + '</td>' +
            '<td style="padding: 15px; color: #666;">' + escapeHtml(cat.color) + '</td>' +
            '<td style="padding: 15px;">' + count + ' 个标注</td>' +
            '<td style="padding: 15px; color: #999;">' + createdTime + '</td>' +
            '<td style="padding: 15px; text-align: center;">' +
                '<button onclick="window.editCategory(\'' + escapeHtml(cat.id) + '\')" style="padding: 6px 12px; margin-right: 5px; border: none; background: #2196F3; color: white; border-radius: 4px; cursor: pointer; font-size: 12px;">编辑</button>' +
                (!cat.isDefault ? '<button onclick="window.deleteCategoryById(\'' + escapeHtml(cat.id) + '\')" style="padding: 6px 12px; border: none; background: #f44336; color: white; border-radius: 4px; cursor: pointer; font-size: 12px;">删除</button>' : '<span style="color: #999; font-size: 12px;">默认</span>') +
            '</td>' +
        '</tr>';
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
