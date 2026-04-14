

// ==================== Tab 切换功能 ====================

function switchTab(tab) {
    console.log('切换 Tab:', tab);
    
    // 更新 Tab 按钮状态
    const tabItems = document.querySelectorAll('.tab-item');
    tabItems.forEach(function(item) {
        item.classList.remove('active');
    });
    
    // 隐藏所有视图
    const views = ['mapView', 'addView', 'categoryView', 'tableView'];
    views.forEach(function(viewId) {
        const view = document.getElementById(viewId);
        if (view) {
            view.style.display = 'none';
        }
    });
    
    // 处理不同 Tab
    switch(tab) {
        case 'map':
            // 显示地图视图
            const mapView = document.getElementById('mapView');
            if (mapView) {
                mapView.style.display = 'flex';
            }
            // 激活对应按钮
            tabItems[0].classList.add('active');
            break;
            
        case 'add':
            // 跳转到新增标注页面
            window.location.href = 'add-marker.html';
            break;
            
        case 'category':
            // 显示分类管理视图
            const categoryView = document.getElementById('categoryView');
            if (categoryView) {
                categoryView.style.display = 'block';
            }
            // 激活对应按钮
            tabItems[2].classList.add('active');
            // 更新分类列表
            updateCategoryList();
            break;
            
        case 'table':
            // 显示表格视图
            const tableView = document.getElementById('tableView');
            if (tableView) {
                tableView.style.display = 'flex';
            }
            // 激活对应按钮
            tabItems[3].classList.add('active');
            // 刷新表格
            if (typeof refreshMarkers === 'function') {
                refreshMarkers();
            }
            break;
    }
}

// ==================== 页面初始化 ====================

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('页面加载完成，开始初始化...');
    
    // 加载分类
    loadCategories();
    
    // 检查 URL 参数
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('view') === 'table') {
        switchTab('table');
    } else if (urlParams.get('view') === 'category') {
        switchTab('category');
    }
});
