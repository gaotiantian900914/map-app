// 强制修复理想充电站标记格式
function fixIdealMarkerFormat() {
    console.log('开始检查并修复理想充电站标记格式...');
    let fixedCount = 0;
    
    const idealCategory = categories.find(cat => cat.name === '理想充电站');
    if (!idealCategory) {
        console.log('理想充电站分类不存在，跳过修复');
        return;
    }
    
    for (let i = 0; i < markers.length; i++) {
        const marker = markers[i];
        
        if (marker.categoryId !== idealCategory.id) {
            continue;
        }
        
        const hasWrongNameFormat = marker.name && (
            marker.name.includes('理想充电站 -') || 
            marker.name.includes('理想汽车充电站')
        );
        
        const hasWrongDescriptionFormat = marker.description && (
            marker.description.includes('理想汽车充电站 -') ||
            marker.description.includes('理想充电站 -') ||
            marker.description === '理想汽车充电站' ||
            marker.description === marker.name
        );
        
        if (hasWrongNameFormat || hasWrongDescriptionFormat) {
            console.log('发现格式错误的标记:', marker.name);
            console.log('  当前描述:', marker.description);
            marker.description = '地址信息缺失，请手动更新';
            fixedCount++;
            console.log('  已修复描述:', marker.description);
        }
    }
    
    if (fixedCount > 0) {
        console.log('修复完成，共修复 ' + fixedCount + ' 个标记');
        saveMarkers();
        if (map) {
            reloadMarkersOnMap();
            updateMarkersList();
        }
        showStatus('检测到 ' + fixedCount + ' 个格式错误的理想充电站，已自动修复！', 'success');
    } else {
        console.log('未发现格式错误的理想充电站标记');
    }
}
