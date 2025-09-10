// popup.js
// 此文件在上一版基础上再次修复了按钮状态和交互逻辑，并添加了重置同步引导功能。
// 已修复：1. 删除逻辑（每组保留一个） 2. 根据浏览器智能显示同步按钮

document.addEventListener('DOMContentLoaded', async function () {
    const scanButton = document.getElementById('scanButton');
    const cleanButton = document.getElementById('cleanButton');
    const stopButton = document.getElementById('stopButton');
    const viewProgressButton = document.getElementById('viewProgressButton');
    const statusDiv = document.getElementById('status');
    const scanProgressContainer = document.getElementById('progressContainer');
    const scanProgressBar = document.getElementById('scanProgressBar');
    const scanProgressText = document.getElementById('scanProgressText');
    const cleanupProgressContainer = document.getElementById('cleanupProgressContainer');
    const cleanupProgressBar = document.getElementById('cleanupProgressBar');
    const cleanupProgressText = document.getElementById('cleanupProgressText');
    const resultsDiv = document.getElementById('results');
    const selectAllContainer = document.getElementById('selectAllContainer');
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    const selectAllLabel = document.getElementById('selectAllLabel');
    const filterSwitch = document.getElementById('filterSwitch');
    const filterSwitchText = document.getElementById('filterSwitchText');

    // --- 新增：获取重置同步按钮和说明文字的引用 ---
    const resetSyncButton = document.getElementById('resetSyncButton');
    const syncInfoText = document.getElementById('syncInfoText');
    // --- --- ---

    // --- 新增：全局变量 ---
    let allDuplicateGroups = []; // 存储所有按标题分组的结果
    let currentDisplayMode = 'strict'; // 'strict' (标题+网址) 或 'loose' (仅标题)
    let progressInterval = null;
    const STORAGE_KEY = 'bookmarkCleanupState';

    // --- 新增：检测浏览器是否为 Edge ---
    // Edge 的 userAgent 通常包含 "Edg/" (注意是 Edg, 不是 Edge)
    const isEdgeBrowser = navigator.userAgent.includes('Edg/');
    // 如果不是 Edge，则隐藏同步按钮和说明文字
    if (!isEdgeBrowser) {
        resetSyncButton.style.display = 'none';
        syncInfoText.style.display = 'none';
    }
    // 如果是 Edge，则保持默认的 display: none，由清理成功后显示
    // --- --- ---

    // --- 工具函数 ---
    function updateStatus(message, type = 'info') {
        statusDiv.textContent = message;
        statusDiv.className = '';
        statusDiv.classList.add(type);
    }

    function updateScanProgress(percent, text) {
        if (percent >= 0 && percent <= 100) {
            scanProgressBar.style.width = percent + '%';
        }
        scanProgressText.textContent = text || '';
    }

    // 更新清理进度UI
    function updateCleanupProgressUI(state) {
        if (state && state.isRunning !== undefined) {
            if (state.isRunning) {
                cleanupProgressContainer.style.display = 'block';
                const progressPercent = state.total > 0 ? Math.round((state.processed / state.total) * 100) : 0;
                cleanupProgressBar.style.width = progressPercent + '%';
                cleanupProgressText.textContent = `清理中... ${state.processed}/${state.total} (已删除: ${state.deleted}, 错误: ${state.errors})`;
                stopButton.style.display = 'block';
                stopButton.disabled = false;
                viewProgressButton.style.display = 'block';
                viewProgressButton.disabled = false;
                viewProgressButton.textContent = "刷新进度";
                // --- 修复：任务运行时隐藏重置同步按钮 ---
                resetSyncButton.style.display = 'none';
                syncInfoText.style.display = 'none';
                // --- --- ---
            } else {
                 cleanupProgressContainer.style.display = 'block';
                 stopButton.style.display = 'none';
                 viewProgressButton.style.display = 'block';
                 viewProgressButton.disabled = false;
                 if(state.wasStopped) {
                     cleanupProgressBar.style.width = (state.total > 0 ? Math.round((state.processed / state.total) * 100) : 0) + '%';
                     cleanupProgressText.textContent = `清理已被用户停止。已处理: ${state.processed}/${state.total}, 已删除: ${state.deleted}`;
                     updateStatus(`清理已被停止。`, 'warning');
                 } else if(state.total === 0) {
                     cleanupProgressBar.style.width = '100%';
                     cleanupProgressText.textContent = '没有需要清理的项目。';
                 } else if (state.errors > 0) {
                     cleanupProgressBar.style.width = '100%';
                     cleanupProgressText.textContent = `清理完成 (有错误)! 已删除: ${state.deleted}, 错误: ${state.errors}, 总数: ${state.total}`;
                     updateStatus(`清理完成，但出现了一些错误。`, 'warning');
                 } else {
                     cleanupProgressBar.style.width = '100%';
                     cleanupProgressText.textContent = `清理完成! 成功删除 ${state.deleted} 个书签。`;
                     updateStatus(`清理成功完成。`, 'success');
                     // --- 修复：仅在 Edge 上且清理成功后，显示重置同步按钮和说明文字 ---
                     if (isEdgeBrowser) {
                         resetSyncButton.style.display = 'block';
                         syncInfoText.style.display = 'block';
                     }
                     // --- --- ---
                 }
                 if (progressInterval) {
                     clearInterval(progressInterval);
                     progressInterval = null;
                     viewProgressButton.textContent = "查看最终进度";
                 }
                 cleanButton.disabled = false;
            }
        } else {
             cleanupProgressContainer.style.display = 'none';
             stopButton.style.display = 'none';
             viewProgressButton.style.display = 'none';
             cleanButton.disabled = false;
             // --- 修复：如果没有状态，也隐藏重置同步按钮和说明文字 ---
             resetSyncButton.style.display = 'none';
             syncInfoText.style.display = 'none';
             // --- --- ---
        }
    }

    // --- 核心功能函数 ---

    // --- 新增：根据模式过滤并显示结果 ---
    function displayFilteredResults() {
        resultsDiv.innerHTML = '';
        let displayGroups = [];

        if (currentDisplayMode === 'strict') {
            displayGroups = allDuplicateGroups.filter(group => group.bookmarks.length > 1 && group.strictDuplicatesExist);
        } else {
            displayGroups = allDuplicateGroups.filter(group => group.bookmarks.length > 1);
        }

        if (displayGroups.length === 0) {
            resultsDiv.innerHTML = `<p>在当前模式下 (<strong>${currentDisplayMode === 'strict' ? '严格' : '宽松'}</strong>) 未发现重复书签。</p>`;
        } else {
            const totalDuplicates = displayGroups.reduce((sum, group) => {
                if (currentDisplayMode === 'strict') {
                    return sum + group.bookmarks.filter(b => b.isStrictDuplicate).length;
                } else {
                    return sum + group.bookmarks.length - 1; // 第一个是保留的
                }
            }, 0);

            resultsDiv.innerHTML = `<p><strong>在当前模式下 (<strong>${currentDisplayMode === 'strict' ? '严格' : '宽松'}</strong>) 发现 ${displayGroups.length} 组重复书签，共 ${totalDuplicates} 个待清理。</strong></p>`;

            const list = document.createElement('div');
            list.id = 'duplicateGroupsList';

            displayGroups.forEach((group, index) => {
                const groupDiv = document.createElement('div');
                groupDiv.className = 'duplicate-group';
                groupDiv.dataset.groupIndex = index;

                const headerDiv = document.createElement('div');
                headerDiv.className = 'group-header';

                const groupCheckbox = document.createElement('input');
                groupCheckbox.type = 'checkbox';
                groupCheckbox.className = 'group-checkbox';
                groupCheckbox.checked = true;
                groupCheckbox.dataset.groupIndex = index;

                const summarySpan = document.createElement('span');
                summarySpan.className = 'group-summary';
                const firstBookmark = group.bookmarks[0];
                const displayTitle = firstBookmark.title || '(无标题)';
                const displayUrl = firstBookmark.url || '(无网址)';

                let summaryText = displayTitle;
                if (summaryText === '(无标题)' || summaryText.length > 50) {
                    summaryText = displayUrl;
                    if (summaryText.length > 50) {
                         summaryText = summaryText.substring(0, 50) + '...';
                    }
                } else if (summaryText.length > 50) {
                     summaryText = summaryText.substring(0, 50) + '...';
                }
                summarySpan.textContent = summaryText;
                summarySpan.title = `${displayTitle} - ${displayUrl}`;

                const countSpan = document.createElement('span');
                countSpan.className = 'group-count';
                let countText = '';
                if (currentDisplayMode === 'strict') {
                   const strictCount = group.bookmarks.filter(b => b.isStrictDuplicate).length;
                   countText = `(${strictCount})`;
                } else {
                   countText = `(${group.bookmarks.length - 1})`;
                }
                countSpan.textContent = countText;

                const modeIndicator = document.createElement('span');
                modeIndicator.className = 'mode-indicator';
                modeIndicator.textContent = currentDisplayMode === 'strict' ? '[严格]' : '[宽松]';

                headerDiv.appendChild(groupCheckbox);
                headerDiv.appendChild(summarySpan);
                headerDiv.appendChild(modeIndicator);
                headerDiv.appendChild(countSpan);

                const itemsDiv = document.createElement('div');
                itemsDiv.className = 'group-items';
                itemsDiv.style.display = 'none';

                group.bookmarks.forEach((bookmark, i) => {
                    const itemDiv = document.createElement('div');
                    itemDiv.className = 'group-item';
                    if (i === 0) {
                        itemDiv.classList.add('keep-item');
                        itemDiv.textContent = `[保留] ${bookmark.title || '(无标题)'} - ${bookmark.url} (ID: ${bookmark.id})`;
                    } else {
                        if (currentDisplayMode === 'strict' && !bookmark.isStrictDuplicate) {
                            return;
                        }

                        const itemCheckbox = document.createElement('input');
                        itemCheckbox.type = 'checkbox';
                        itemCheckbox.className = 'item-checkbox';
                        itemCheckbox.checked = true;
                        itemCheckbox.dataset.groupIndex = index;
                        itemCheckbox.dataset.itemIndex = i;

                        let itemTextContent = `[删除] ${bookmark.title || '(无标题)'} - ${bookmark.url} (ID: ${bookmark.id})`;
                        if (currentDisplayMode === 'loose' && !bookmark.isStrictDuplicate) {
                             itemTextContent += ' [网址不同]';
                        }

                        const itemText = document.createTextNode(itemTextContent);
                        itemDiv.classList.add('remove-item');

                        itemDiv.appendChild(itemCheckbox);
                        itemDiv.appendChild(itemText);
                    }
                    itemsDiv.appendChild(itemDiv);
                });

                groupDiv.appendChild(headerDiv);
                groupDiv.appendChild(itemsDiv);
                list.appendChild(groupDiv);

                headerDiv.addEventListener('click', (e) => {
                    if (e.target === groupCheckbox) return;
                    const isOpen = itemsDiv.style.display === 'block';
                    itemsDiv.style.display = isOpen ? 'none' : 'block';
                });

                groupCheckbox.addEventListener('change', function() {
                    const isChecked = this.checked;
                    const itemCheckboxes = itemsDiv.querySelectorAll('.item-checkbox');
                    itemCheckboxes.forEach(cb => cb.checked = isChecked);
                });
            });

            resultsDiv.appendChild(list);
            updateSelectAllState();
        }
        resultsDiv.style.display = 'block';
    }

     // --- 新增：更新全选复选框状态 ---
     function updateSelectAllState() {
         const allGroupCheckboxes = document.querySelectorAll('.group-checkbox');
         if (allGroupCheckboxes.length === 0) {
             selectAllCheckbox.checked = false;
             selectAllCheckbox.indeterminate = false;
             return;
         }

         const checkedGroups = document.querySelectorAll('.group-checkbox:checked');
         if (checkedGroups.length === allGroupCheckboxes.length) {
             selectAllCheckbox.checked = true;
             selectAllCheckbox.indeterminate = false;
         } else if (checkedGroups.length === 0) {
             selectAllCheckbox.checked = false;
             selectAllCheckbox.indeterminate = false;
         } else {
             selectAllCheckbox.checked = false;
             selectAllCheckbox.indeterminate = true;
         }
     }

    // --- 更新的 displayResults 函数 (现在只是存储和初始化显示) ---
    function displayResults(groups) {
        allDuplicateGroups = groups;
        currentDisplayMode = filterSwitch.checked ? 'strict' : 'loose';
        displayFilteredResults();

        selectAllContainer.style.display = 'block';
        selectAllCheckbox.checked = true;
        selectAllCheckbox.indeterminate = false;

        selectAllCheckbox.addEventListener('change', function() {
            const isChecked = this.checked;
            const allGroupCheckboxes = document.querySelectorAll('.group-checkbox');
            allGroupCheckboxes.forEach(gc => {
                gc.checked = isChecked;
                gc.dispatchEvent(new Event('change'));
            });
        });

        filterSwitch.addEventListener('change', function() {
            currentDisplayMode = this.checked ? 'strict' : 'loose';
            filterSwitchText.textContent = this.checked ? '严格模式 (标题+网址)' : '宽松模式 (仅标题)';
            displayFilteredResults();

            selectAllCheckbox.checked = true;
            selectAllCheckbox.indeterminate = false;
            const allGroupCheckboxes = document.querySelectorAll('.group-checkbox');
            allGroupCheckboxes.forEach(gc => {
                gc.checked = true;
                gc.dispatchEvent(new Event('change'));
            });
        });
    }

    async function scanForDuplicates() {
        scanButton.disabled = true;
        cleanButton.disabled = true;
        stopButton.disabled = true;
        viewProgressButton.disabled = true;
        cleanButton.style.display = 'none';
        stopButton.style.display = 'none';
        viewProgressButton.style.display = 'none';
        // --- 修复：扫描时隐藏重置同步按钮和说明文字 ---
        resetSyncButton.style.display = 'none';
        syncInfoText.style.display = 'none';
        // --- --- ---
        resultsDiv.style.display = 'none';
        selectAllContainer.style.display = 'none';
        allDuplicateGroups = [];
        scanProgressContainer.style.display = 'block';
        updateStatus('正在扫描书签...', 'info');
        updateScanProgress(0, '开始扫描...');

        try {
            await chrome.storage.local.remove(STORAGE_KEY);
            console.log("已清除旧的清理进度状态。");
        } catch (err) {
            console.warn("清除旧清理状态时出错（可能不存在）:", err);
        }
        cleanupProgressContainer.style.display = 'none';
        cleanupProgressBar.style.width = '0%';
        cleanupProgressText.textContent = '等待后台任务开始...';

        try {
            const startTime = performance.now();
            const bookmarkTreeNodes = await chrome.bookmarks.getTree();

            const titleMap = new Map();
            let totalBookmarksProcessed = 0;

            function traverseBookmarks(bookmarkNodes) {
                for (const node of bookmarkNodes) {
                    if (node.url && node.url.trim() !== '') {
                        totalBookmarksProcessed++;
                        const title = node.title || '';
                        if (!titleMap.has(title)) {
                            titleMap.set(title, []);
                        }
                        titleMap.get(title).push(node);
                    }
                    if (node.children && node.children.length > 0) {
                        traverseBookmarks(node.children);
                    }
                }
            }

            traverseBookmarks(bookmarkTreeNodes);

            let groupsFound = 0;
            let bookmarksToConsiderForDeletion = 0;
            let strictDuplicateCount = 0;

            titleMap.forEach((bookmarksWithSameTitle, title) => {
                if (bookmarksWithSameTitle.length > 1) {
                    groupsFound++;
                    const urlMap = new Map();
                    bookmarksWithSameTitle.forEach(b => {
                        const url = b.url || '';
                        if (!urlMap.has(url)) {
                            urlMap.set(url, []);
                        }
                        urlMap.get(url).push(b);
                    });

                    let strictDuplicatesExistInThisGroup = false;
                    urlMap.forEach((bookmarksWithSameUrl, url) => {
                        if (bookmarksWithSameUrl.length > 1) {
                            strictDuplicatesExistInThisGroup = true;
                            strictDuplicateCount += bookmarksWithSameUrl.length - 1;
                        }
                    });

                    const processedBookmarks = bookmarksWithSameTitle.map(b => ({
                        ...b,
                        isStrictDuplicate: urlMap.get(b.url || '').length > 1
                    }));
                    // 按 dateAdded 排序，最早的在前
                    processedBookmarks.sort((a, b) => (a.dateAdded || 0) - (b.dateAdded || 0));

                    allDuplicateGroups.push({
                        title: title,
                        bookmarks: processedBookmarks,
                        strictDuplicatesExist: strictDuplicatesExistInThisGroup
                    });
                }
            });

            displayResults(allDuplicateGroups);

            updateScanProgress(100, '扫描完成!');
            updateStatus(`扫描完成! 发现 ${groupsFound} 组标题重复。其中包含 ${strictDuplicateCount} 个严格重复 (标题+网址)。`, 'warning');
            console.log(`总扫描时间: ${performance.now() - startTime} 毫秒`);

            cleanButton.style.display = 'block';
            cleanButton.disabled = false;
            stopButton.style.display = 'none';
            viewProgressButton.style.display = 'none';

        } catch (error) {
            console.error("扫描书签时出错:", error);
            updateStatus('扫描过程中发生错误。请查看控制台。', 'error');
            updateScanProgress(0, '错误');
            scanButton.disabled = false;
            cleanButton.style.display = 'none';
            scanProgressContainer.style.display = 'none';
            // --- 修复：出错时也隐藏重置同步按钮和说明文字 ---
            resetSyncButton.style.display = 'none';
            syncInfoText.style.display = 'none';
            // --- --- ---
        } finally {
            scanButton.disabled = false;
        }
    }

    // --- 修复：更新的 startBackgroundCleanup 函数 (确保每组只删除被选中的且非保留项) ---
    async function startBackgroundCleanup() {
        if (allDuplicateGroups.length === 0) {
            updateStatus('没有可清理的项目。请先扫描。', 'info');
            return;
        }

        const idsToDelete = [];
        const displayMode = filterSwitch.checked ? 'strict' : 'loose';

        const groupCheckboxes = document.querySelectorAll('.group-checkbox:checked');
        groupCheckboxes.forEach(gc => {
            const groupIndex = parseInt(gc.dataset.groupIndex, 10);
            const originalGroupIndex = allDuplicateGroups.findIndex((g, idx) => idx === groupIndex);
            if (originalGroupIndex !== -1) {
                const group = allDuplicateGroups[originalGroupIndex];
                // 确定要保留的 ID (dateAdded 最早的)
                const keepId = group.bookmarks[0].id;

                const itemCheckboxes = document.querySelectorAll(`#duplicateGroupsList .duplicate-group[data-group-index="${groupIndex}"] .item-checkbox:checked`);
                itemCheckboxes.forEach(ic => {
                    const itemIndex = parseInt(ic.dataset.itemIndex, 10);
                    if (group.bookmarks[itemIndex]) {
                        const bookmark = group.bookmarks[itemIndex];
                        // 只有当被选中、ID 不是保留ID、且符合当前模式时，才加入删除列表
                        if (bookmark.id !== keepId) {
                            if (displayMode === 'strict' && bookmark.isStrictDuplicate) {
                                idsToDelete.push(bookmark.id);
                            } else if (displayMode === 'loose') {
                                idsToDelete.push(bookmark.id);
                            }
                        }
                    }
                });
            }
        });

        const totalToDelete = idsToDelete.length;

        if (totalToDelete === 0) {
            updateStatus(`在当前模式 (${displayMode === 'strict' ? '严格' : '宽松'}) 下没有选中任何需要删除的书签。`, 'info');
            return;
        }

        try {
            updateStatus(`正在启动后台清理 ${totalToDelete} 个书签 (模式: ${displayMode === 'strict' ? '严格' : '宽松'})...`, 'info');
            cleanupProgressContainer.style.display = 'block';
            cleanupProgressBar.style.width = '0%';
            cleanupProgressText.textContent = '正在启动后台任务...';
            stopButton.style.display = 'block';
            stopButton.disabled = true;
            stopButton.textContent = "停止清理";
            viewProgressButton.style.display = 'block';
            viewProgressButton.disabled = true;
            viewProgressButton.textContent = "刷新进度";
            cleanButton.disabled = true;
            // --- 修复：启动清理时隐藏重置同步按钮和说明文字 ---
            resetSyncButton.style.display = 'none';
            syncInfoText.style.display = 'none';
            // --- --- ---

            await chrome.runtime.sendMessage({
                action: "startCleanup",
                idsToDelete: idsToDelete,
                totalToDelete: totalToDelete
            });

            updateStatus(`已启动后台清理 ${totalToDelete} 个书签 (模式: ${displayMode === 'strict' ? '严格' : '宽松'})。`, 'info');
            startProgressPolling();

        } catch (error) {
             console.error("启动后台清理失败:", error);
             updateStatus('启动清理任务失败。', 'error');
             stopButton.style.display = 'none';
             viewProgressButton.style.display = 'none';
             cleanButton.disabled = false;
             // --- 修复：启动失败时也隐藏重置同步按钮和说明文字 ---
             resetSyncButton.style.display = 'none';
             syncInfoText.style.display = 'none';
             // --- --- ---
        }
    }

    async function requestStopCleanup() {
         try {
             stopButton.disabled = true;
             stopButton.textContent = "正在停止...";
             await chrome.runtime.sendMessage({ action: "stopCleanup" });
             updateStatus('已发送停止请求。等待确认...', 'info');
         } catch (err) {
              console.error("发送停止请求时出错:", err);
              updateStatus('发送停止请求失败。', 'error');
              stopButton.disabled = false;
              stopButton.textContent = "停止清理";
         }
    }

    function startProgressPolling() {
         if (progressInterval) {
             clearInterval(progressInterval);
         }
         progressInterval = setInterval(async () => {
             try {
                 const data = await chrome.storage.local.get(['bookmarkCleanupState']);
                 updateCleanupProgressUI(data.bookmarkCleanupState);
             } catch (err) {
                 console.error("轮询进度时出错:", err);
             }
         }, 1000);
    }

    async function manuallyRefreshProgress() {
         if (progressInterval) {
             try {
                 const data = await chrome.storage.local.get(['bookmarkCleanupState']);
                 updateCleanupProgressUI(data.bookmarkCleanupState);
             } catch (err) {
                 console.error("手动刷新错误:", err);
                 updateStatus('刷新进度失败。', 'error');
             }
         } else {
             startProgressPolling();
             viewProgressButton.textContent = "刷新进度";
             updateStatus('开始监控后台进度...', 'info');
         }
    }

    // --- 新增：打开 Edge 同步设置页面的函数 ---
    async function openSyncSettings() {
        try {
            await chrome.tabs.create({ url: "edge://settings/profiles/sync/reset" });
            updateStatus('正在打开 Edge 同步设置页面，请在新标签页中操作...', 'info');
            window.close();
        } catch (error) {
            console.error("打开同步设置页面失败:", error);
            updateStatus('无法打开同步设置页面。请手动在地址栏输入 edge://settings/profiles/sync/reset', 'error');
        }
    }
    // --- --- ---

    // --- 事件监听 ---
    scanButton.addEventListener('click', scanForDuplicates);
    cleanButton.addEventListener('click', startBackgroundCleanup);
    stopButton.addEventListener('click', requestStopCleanup);
    viewProgressButton.addEventListener('click', manuallyRefreshProgress);
    resetSyncButton.addEventListener('click', openSyncSettings);

    // --- Popup 打开时的初始化 ---
    try {
        const data = await chrome.storage.local.get(['bookmarkCleanupState']);
        if (data.bookmarkCleanupState && (data.bookmarkCleanupState.isRunning || !data.bookmarkCleanupState.isRunning)) {
             updateCleanupProgressUI(data.bookmarkCleanupState);
             if (data.bookmarkCleanupState.isRunning) {
                 console.log("检测到正在运行的后台任务，开始轮询进度。");
                 startProgressPolling();
             } else {
                 viewProgressButton.style.display = 'block';
                 viewProgressButton.textContent = "查看最终进度";
                 // --- 修复：如果上次清理已完成，且成功，也只在 Edge 上显示重置按钮 ---
                 if (isEdgeBrowser && data.bookmarkCleanupState.total !== undefined && data.bookmarkCleanupState.errors === 0) {
                     resetSyncButton.style.display = 'block';
                     syncInfoText.style.display = 'block';
                 }
                 // --- --- ---
             }
        }
    } catch (initErr) {
        console.error("初始化弹窗时出错:", initErr);
    }
});

window.addEventListener('beforeunload', function() {
    if (typeof progressInterval === 'number') {
        clearInterval(progressInterval);
        console.log("弹窗关闭，已停止进度轮询。");
    }
});