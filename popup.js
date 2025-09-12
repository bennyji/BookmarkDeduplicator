// popup.js
// 此文件在上一版基础上再次修复了按钮状态和交互逻辑，并添加了重置同步引导功能。
// 已修复：1. 删除逻辑（每组保留一个） 2. 根据浏览器智能显示同步按钮
// 新增：国际化支持 (i18n)

document.addEventListener('DOMContentLoaded', async function () {
    // --- 新增：语言相关元素和变量 ---
    const languageSwitchButton = document.getElementById('languageSwitchButton');
    const popupTitle = document.getElementById('popupTitle');
    const STORAGE_KEY_LANGUAGE = 'userLanguage';
    let currentLanguage = 'en'; // Default fallback

    // 定义翻译资源
    const translations = {
        en: {
            title: "Bookmark Deduplicator",
            scanButton: "1. Scan for Duplicates",
            cleanButton: "2. Start Background Cleanup",
            stopButton: "Stop Cleanup",
            viewProgressButton: "View/Refresh Progress",
            resetSyncButton: "3. Reset Browser Sync Data",
            syncInfoText: "Click the button above to go to the Edge settings page to manually reset sync data to apply changes.",
            selectAllLabel: "Select All/Deselect All",
            filterSwitchTextStrict: "Strict Mode (Title + URL)",
            filterSwitchTextLoose: "Loose Mode (Title Only)",
            statusInitial: "Please click \"Scan for Duplicates\".",
            statusScanning: "Scanning bookmarks...",
            statusScanComplete: (groupsFound, strictDuplicateCount) => 
                `Scan complete! Found ${groupsFound} groups of title duplicates. Containing ${strictDuplicateCount} strict duplicates (Title + URL).`,
            statusNoDuplicatesStrict: "No duplicate bookmarks found in strict mode.",
            statusNoDuplicatesLoose: "No duplicate bookmarks found in loose mode.",
            resultsHeader: (mode, groups, duplicates) => 
                `<strong>Found ${groups} groups of duplicates in current mode (<strong>${mode}</strong>), total ${duplicates} pending cleanup.</strong>`,
            modeIndicatorStrict: "[Strict]",
            modeIndicatorLoose: "[Loose]",
            keepItemPrefix: "[Keep] ",
            removeItemPrefix: "[Delete] ",
            differentUrlSuffix: " [Different URL]",
            groupCountStrict: (count) => `(${count})`,
            groupCountLoose: (count) => `(${count})`,
            scanProgressStart: "Starting scan...",
            scanProgressComplete: "Scan complete!",
            scanProgressError: "Error",
            cleanupProgressWaiting: "Waiting for background task to start...",
            cleanupProgressRunning: (processed, total, deleted, errors) => 
                `Cleaning up... ${processed}/${total} (Deleted: ${deleted}, Errors: ${errors})`,
            cleanupProgressStopped: (processed, total, deleted) => 
                `Cleanup was stopped by the user. Processed: ${processed}/${total}, Deleted: ${deleted}`,
            cleanupProgressNoItems: "No items need to be cleaned up.",
            cleanupProgressCompleteWithError: (deleted, errors, total) => 
                `Cleanup completed (with errors)! Deleted: ${deleted}, Errors: ${errors}, Total: ${total}`,
            cleanupProgressCompleteSuccess: (deleted) => 
                `Cleanup completed successfully! Successfully deleted ${deleted} bookmarks.`,
            statusCleanupStopped: "Cleanup was stopped.",
            statusCleanupCompleteWithError: "Cleanup completed, but some errors occurred.",
            statusCleanupCompleteSuccess: "Cleanup completed successfully.",
            statusCleanupStartError: "Error starting cleanup task.",
            statusCleanupStopError: "Error sending stop request.",
            statusOpenSyncError: "Failed to open sync settings page. Please manually enter edge://settings/profiles/sync/reset",
            statusOpenSyncInfo: "Opening Edge sync settings page, please operate in the new tab...",
            statusNoCleanupItems: "No items to clean up. Please scan first.",
            statusNoSelectedItems: (mode) => 
                `No bookmarks selected for deletion in current mode (${mode === 'strict' ? 'Strict' : 'Loose'}).`,
            statusStartCleanup: (total, mode) => 
                `Starting background cleanup of ${total} bookmarks (Mode: ${mode === 'strict' ? 'Strict' : 'Loose'})...`,
            statusStartedCleanup: (total, mode) => 
                `Started background cleanup of ${total} bookmarks (Mode: ${mode === 'strict' ? 'Strict' : 'Loose'}).`,
            statusInitProgressError: "Error refreshing progress.",
            statusInitProgressStart: "Starting to monitor background progress...",
            statusAlreadyRunning: "Cleanup is already running.",
            statusNotRunning: "No cleanup task is currently running.",
            statusStopRequested: "Stop request sent. Waiting for confirmation...",
            viewProgressFinal: "View Final Progress",
            viewProgressRefresh: "Refresh Progress",
            languageSwitchButton: "EN/中文"
            
        },
        zh: {
            title: "书签去重器",
            scanButton: "1. 扫描重复书签",
            cleanButton: "2. 开始后台清理",
            stopButton: "停止清理",
            viewProgressButton: "查看/刷新进度",
            resetSyncButton: "3. 重置浏览器同步数据",
            syncInfoText: "点击上方按钮前往 Edge 设置页面，手动重置同步数据以应用更改。",
            selectAllLabel: "全选/取消全选",
            filterSwitchTextStrict: "严格模式 (标题+网址)",
            filterSwitchTextLoose: "宽松模式 (仅标题)",
            statusInitial: "请点击“扫描重复书签”开始。",
            statusScanning: "正在扫描书签...",
            statusScanComplete: (groupsFound, strictDuplicateCount) => 
                `扫描完成! 发现 ${groupsFound} 组标题重复。其中包含 ${strictDuplicateCount} 个严格重复 (标题+网址)。`,
            statusNoDuplicatesStrict: "在严格模式下未发现重复书签。",
            statusNoDuplicatesLoose: "在宽松模式下未发现重复书签。",
            resultsHeader: (mode, groups, duplicates) => 
                `<strong>在当前模式下 (<strong>${mode}</strong>) 发现 ${groups} 组重复书签，共 ${duplicates} 个待清理。</strong>`,
            modeIndicatorStrict: "[严格]",
            modeIndicatorLoose: "[宽松]",
            keepItemPrefix: "[保留] ",
            removeItemPrefix: "[删除] ",
            differentUrlSuffix: " [网址不同]",
            groupCountStrict: (count) => `(${count})`,
            groupCountLoose: (count) => `(${count})`,
            scanProgressStart: "开始扫描...",
            scanProgressComplete: "扫描完成!",
            scanProgressError: "错误",
            cleanupProgressWaiting: "等待后台任务开始...",
            cleanupProgressRunning: (processed, total, deleted, errors) => 
                `清理中... ${processed}/${total} (已删除: ${deleted}, 错误: ${errors})`,
            cleanupProgressStopped: (processed, total, deleted) => 
                `清理已被用户停止。已处理: ${processed}/${total}, 已删除: ${deleted}`,
            cleanupProgressNoItems: "没有需要清理的项目。",
            cleanupProgressCompleteWithError: (deleted, errors, total) => 
                `清理完成 (有错误)! 已删除: ${deleted}, 错误: ${errors}, 总数: ${total}`,
            cleanupProgressCompleteSuccess: (deleted) => 
                `清理完成! 成功删除 ${deleted} 个书签。`,
            statusCleanupStopped: "清理已被停止。",
            statusCleanupCompleteWithError: "清理完成，但出现了一些错误。",
            statusCleanupCompleteSuccess: "清理成功完成。",
            statusCleanupStartError: "启动清理任务失败。",
            statusCleanupStopError: "发送停止请求失败。",
            statusOpenSyncError: "无法打开同步设置页面。请手动在地址栏输入 edge://settings/profiles/sync/reset",
            statusOpenSyncInfo: "正在打开 Edge 同步设置页面，请在新标签页中操作...",
            statusNoCleanupItems: "没有可清理的项目。请先扫描。",
            statusNoSelectedItems: (mode) => 
                `在当前模式 (${mode === 'strict' ? '严格' : '宽松'}) 下没有选中任何需要删除的书签。`,
            statusStartCleanup: (total, mode) => 
                `正在启动后台清理 ${total} 个书签 (模式: ${mode === 'strict' ? '严格' : '宽松'})...`,
            statusStartedCleanup: (total, mode) => 
                `已启动后台清理 ${total} 个书签 (模式: ${mode === 'strict' ? '严格' : '宽松'})。`,
            statusInitProgressError: "刷新进度失败。",
            statusInitProgressStart: "开始监控后台进度...",
            statusAlreadyRunning: "清理已在运行中。",
            statusNotRunning: "当前没有运行中的清理任务。",
            statusStopRequested: "已发送停止请求。等待确认...",
            viewProgressFinal: "查看最终进度",
            viewProgressRefresh: "刷新进度",
            languageSwitchButton: "EN/中文"
        }
    };

    // 根据当前语言更新 UI 文本
    function updateUIText(lang) {
        const t = translations[lang] || translations['en']; // Fallback to English
        popupTitle.textContent = t.title;
        scanButton.textContent = t.scanButton;
        cleanButton.textContent = t.cleanButton;
        stopButton.textContent = t.stopButton;
        viewProgressButton.textContent = t.viewProgressButton;
        resetSyncButton.textContent = t.resetSyncButton;
        syncInfoText.textContent = t.syncInfoText;
        selectAllLabel.textContent = t.selectAllLabel;
        filterSwitchText.textContent = filterSwitch.checked ? t.filterSwitchTextStrict : t.filterSwitchTextLoose;
        languageSwitchButton.textContent = t.languageSwitchButton;

        // 更新状态文本（如果已显示）
        if (statusDiv.textContent.includes("Please click") || statusDiv.textContent.includes("请点击")) {
             updateStatus(t.statusInitial, 'info');
        } else if (statusDiv.textContent.includes("Scanning") || statusDiv.textContent.includes("正在扫描")) {
             updateStatus(t.statusScanning, 'info');
        } else if (statusDiv.textContent.includes("Scan complete") || statusDiv.textContent.includes("扫描完成")) {
             // Scan complete message is dynamic, handled in scanForDuplicates
        } else if (statusDiv.textContent.includes("No duplicate") || statusDiv.textContent.includes("未发现重复")) {
             // No duplicates message is dynamic, handled in displayFilteredResults
        } else if (statusDiv.textContent.includes("Cleanup was stopped") || statusDiv.textContent.includes("清理已被停止")) {
             updateStatus(t.statusCleanupStopped, 'warning');
        } else if (statusDiv.textContent.includes("Cleanup completed") || statusDiv.textContent.includes("清理完成")) {
             if (statusDiv.textContent.includes("error") || statusDiv.textContent.includes("错误")) {
                 updateStatus(t.statusCleanupCompleteWithError, 'warning');
             } else {
                 updateStatus(t.statusCleanupCompleteSuccess, 'success');
             }
        } else if (statusDiv.textContent.includes("Error starting") || statusDiv.textContent.includes("启动清理任务失败")) {
             updateStatus(t.statusCleanupStartError, 'error');
        } else if (statusDiv.textContent.includes("Error sending") || statusDiv.textContent.includes("发送停止请求失败")) {
             updateStatus(t.statusCleanupStopError, 'error');
        } else if (statusDiv.textContent.includes("Failed to open") || statusDiv.textContent.includes("无法打开")) {
             updateStatus(t.statusOpenSyncError, 'error');
        } else if (statusDiv.textContent.includes("Opening Edge") || statusDiv.textContent.includes("正在打开 Edge")) {
             updateStatus(t.statusOpenSyncInfo, 'info');
        } else if (statusDiv.textContent.includes("No items to clean") || statusDiv.textContent.includes("没有可清理的项目")) {
             updateStatus(t.statusNoCleanupItems, 'info');
        } else if (statusDiv.textContent.includes("No bookmarks selected") || statusDiv.textContent.includes("没有选中任何")) {
             // This message is dynamic, handled in startBackgroundCleanup
        } else if (statusDiv.textContent.includes("Starting background") || statusDiv.textContent.includes("正在启动后台")) {
             // This message is dynamic, handled in startBackgroundCleanup
        } else if (statusDiv.textContent.includes("Started background") || statusDiv.textContent.includes("已启动后台")) {
             // This message is dynamic, handled in startBackgroundCleanup
        } else if (statusDiv.textContent.includes("Error refreshing") || statusDiv.textContent.includes("刷新进度失败")) {
             updateStatus(t.statusInitProgressError, 'error');
        } else if (statusDiv.textContent.includes("Starting to monitor") || statusDiv.textContent.includes("开始监控后台")) {
             updateStatus(t.statusInitProgressStart, 'info');
        } else if (statusDiv.textContent.includes("Cleanup is already") || statusDiv.textContent.includes("清理已在运行")) {
             updateStatus(t.statusAlreadyRunning, 'warning');
        } else if (statusDiv.textContent.includes("No cleanup task") || statusDiv.textContent.includes("当前没有运行中的")) {
             updateStatus(t.statusNotRunning, 'info');
        } else if (statusDiv.textContent.includes("Stop request sent") || statusDiv.textContent.includes("已发送停止请求")) {
             updateStatus(t.statusStopRequested, 'info');
        }

        // 更新进度文本（如果已显示）
        if (scanProgressText.textContent.includes("Initializing") || scanProgressText.textContent.includes("初始化")) {
            updateScanProgress(0, t.scanProgressStart);
        } else if (scanProgressText.textContent.includes("Scan complete") || scanProgressText.textContent.includes("扫描完成")) {
            updateScanProgress(100, t.scanProgressComplete);
        } else if (scanProgressText.textContent.includes("Error") || scanProgressText.textContent.includes("错误")) {
            updateScanProgress(0, t.scanProgressError);
        }

        if (cleanupProgressText.textContent.includes("Waiting") || cleanupProgressText.textContent.includes("等待")) {
            updateCleanupProgressUI({isRunning: false, total: 0}); // Trigger update with current state
        } else if (cleanupProgressText.textContent.includes("Cleaning") || cleanupProgressText.textContent.includes("清理中")) {
            // Running progress is dynamic, handled by updateCleanupProgressUI
        } else if (cleanupProgressText.textContent.includes("stopped") || cleanupProgressText.textContent.includes("停止")) {
            // Stopped progress is dynamic, handled by updateCleanupProgressUI
        } else if (cleanupProgressText.textContent.includes("No items") || cleanupProgressText.textContent.includes("没有")) {
            updateCleanupProgressUI({isRunning: false, total: 0});
        } else if (cleanupProgressText.textContent.includes("completed") || cleanupProgressText.textContent.includes("完成")) {
            // Completed progress is dynamic, handled by updateCleanupProgressUI
        }

        // 更新结果区域文本（如果已显示）
        if (resultsDiv.style.display !== 'none') {
            displayFilteredResults(); // Re-display results to apply new language
        }

        // 更新查看进度按钮文本
        if (viewProgressButton.textContent === "View Final Progress" || viewProgressButton.textContent === "查看最终进度") {
            viewProgressButton.textContent = t.viewProgressFinal;
        } else if (viewProgressButton.textContent === "View/Refresh Progress" || viewProgressButton.textContent === "查看/刷新进度") {
            viewProgressButton.textContent = t.viewProgressButton;
        } else if (viewProgressButton.textContent === "Refresh Progress" || viewProgressButton.textContent === "刷新进度") {
            viewProgressButton.textContent = t.viewProgressRefresh;
        }
        
    }

    // 检测并设置语言
    async function detectAndSetLanguage() {
        try {
            // 1. 尝试从存储中获取用户偏好
            const data = await chrome.storage.local.get([STORAGE_KEY_LANGUAGE]);
            if (data[STORAGE_KEY_LANGUAGE]) {
                currentLanguage = data[STORAGE_KEY_LANGUAGE];
                console.log("Language loaded from storage:", currentLanguage);
                return;
            }
        } catch (err) {
            console.warn("Error loading language from storage:", err);
        }

        // 2. 如果存储中没有，则根据浏览器语言判断
        const browserLang = navigator.language;
        if (browserLang.startsWith('zh')) {
            currentLanguage = 'zh';
        } else {
            currentLanguage = 'en'; // Default to English for other languages
        }
        console.log("Language detected from browser:", browserLang, "->", currentLanguage);
        
        // 3. 保存检测到的语言到存储
        try {
            await chrome.storage.local.set({ [STORAGE_KEY_LANGUAGE]: currentLanguage });
            console.log("Detected language saved to storage:", currentLanguage);
        } catch (err) {
            console.warn("Error saving detected language to storage:", err);
        }
    }

    // 切换语言
    async function switchLanguage() {
        currentLanguage = currentLanguage === 'en' ? 'zh' : 'en';
        console.log("Language switched to:", currentLanguage);
        updateUIText(currentLanguage);
        try {
            await chrome.storage.local.set({ [STORAGE_KEY_LANGUAGE]: currentLanguage });
            console.log("Language preference saved to storage:", currentLanguage);
        } catch (err) {
            console.error("Error saving language preference:", err);
        }
    }

    // --- --- ---

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
        const t = translations[currentLanguage] || translations['en'];
        if (state && state.isRunning !== undefined) {
            if (state.isRunning) {
                cleanupProgressContainer.style.display = 'block';
                const progressPercent = state.total > 0 ? Math.round((state.processed / state.total) * 100) : 0;
                cleanupProgressBar.style.width = progressPercent + '%';
                cleanupProgressText.textContent = t.cleanupProgressRunning(state.processed, state.total, state.deleted, state.errors);
                stopButton.style.display = 'block';
                stopButton.disabled = false;
                viewProgressButton.style.display = 'block';
                viewProgressButton.disabled = false;
                viewProgressButton.textContent = t.viewProgressRefresh;
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
                     cleanupProgressText.textContent = t.cleanupProgressStopped(state.processed, state.total, state.deleted);
                     updateStatus(t.statusCleanupStopped, 'warning');
                 } else if(state.total === 0) {
                     cleanupProgressBar.style.width = '100%';
                     cleanupProgressText.textContent = t.cleanupProgressNoItems;
                 } else if (state.errors > 0) {
                     cleanupProgressBar.style.width = '100%';
                     cleanupProgressText.textContent = t.cleanupProgressCompleteWithError(state.deleted, state.errors, state.total);
                     updateStatus(t.statusCleanupCompleteWithError, 'warning');
                 } else {
                     cleanupProgressBar.style.width = '100%';
                     cleanupProgressText.textContent = t.cleanupProgressCompleteSuccess(state.deleted);
                     updateStatus(t.statusCleanupCompleteSuccess, 'success');
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
                     viewProgressButton.textContent = t.viewProgressFinal;
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
        const t = translations[currentLanguage] || translations['en'];
        resultsDiv.innerHTML = '';
        let displayGroups = [];

        if (currentDisplayMode === 'strict') {
            displayGroups = allDuplicateGroups.filter(group => group.bookmarks.length > 1 && group.strictDuplicatesExist);
        } else {
            displayGroups = allDuplicateGroups.filter(group => group.bookmarks.length > 1);
        }

        if (displayGroups.length === 0) {
            const noDuplicatesText = currentDisplayMode === 'strict' ? t.statusNoDuplicatesStrict : t.statusNoDuplicatesLoose;
            resultsDiv.innerHTML = `<p>${noDuplicatesText}</p>`;
        } else {
            const totalDuplicates = displayGroups.reduce((sum, group) => {
                if (currentDisplayMode === 'strict') {
                    return sum + group.bookmarks.filter(b => b.isStrictDuplicate).length;
                } else {
                    return sum + group.bookmarks.length - 1; // 第一个是保留的
                }
            }, 0);

            resultsDiv.innerHTML = `<p>${t.resultsHeader(currentDisplayMode === 'strict' ? 'Strict' : 'Loose', displayGroups.length, totalDuplicates)}</p>`;

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
                const displayTitle = firstBookmark.title || (currentLanguage === 'en' ? '(No Title)' : '(无标题)');
                const displayUrl = firstBookmark.url || (currentLanguage === 'en' ? '(No URL)' : '(无网址)');

                let summaryText = displayTitle;
                if (summaryText === (currentLanguage === 'en' ? '(No Title)' : '(无标题)') || summaryText.length > 50) {
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
                   countText = t.groupCountStrict(strictCount);
                } else {
                   countText = t.groupCountLoose(group.bookmarks.length - 1);
                }
                countSpan.textContent = countText;

                const modeIndicator = document.createElement('span');
                modeIndicator.className = 'mode-indicator';
                modeIndicator.textContent = currentDisplayMode === 'strict' ? t.modeIndicatorStrict : t.modeIndicatorLoose;

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
                        itemDiv.textContent = `${t.keepItemPrefix}${bookmark.title || (currentLanguage === 'en' ? '(No Title)' : '(无标题)')} - ${bookmark.url} (ID: ${bookmark.id})`;
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

                        let itemTextContent = `${t.removeItemPrefix}${bookmark.title || (currentLanguage === 'en' ? '(No Title)' : '(无标题)')} - ${bookmark.url} (ID: ${bookmark.id})`;
                        if (currentDisplayMode === 'loose' && !bookmark.isStrictDuplicate) {
                             itemTextContent += t.differentUrlSuffix;
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
            filterSwitchText.textContent = this.checked ? translations[currentLanguage]?.filterSwitchTextStrict || 'Strict Mode (Title + URL)' : translations[currentLanguage]?.filterSwitchTextLoose || 'Loose Mode (Title Only)';
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
        const t = translations[currentLanguage] || translations['en'];
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
        updateStatus(t.statusScanning, 'info');
        updateScanProgress(0, t.scanProgressStart);

        try {
            await chrome.storage.local.remove(STORAGE_KEY);
            console.log("已清除旧的清理进度状态。");
        } catch (err) {
            console.warn("清除旧清理状态时出错（可能不存在）:", err);
        }
        cleanupProgressContainer.style.display = 'none';
        cleanupProgressBar.style.width = '0%';
        cleanupProgressText.textContent = t.cleanupProgressWaiting;

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

            updateScanProgress(100, t.scanProgressComplete);
            updateStatus(t.statusScanComplete(groupsFound, strictDuplicateCount), 'warning');
            console.log(`总扫描时间: ${performance.now() - startTime} 毫秒`);

            cleanButton.style.display = 'block';
            cleanButton.disabled = false;
            stopButton.style.display = 'none';
            viewProgressButton.style.display = 'none';

        } catch (error) {
            console.error("扫描书签时出错:", error);
            updateStatus('Scan error. Please check the console.', 'error');
            updateScanProgress(0, t.scanProgressError);
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
        const t = translations[currentLanguage] || translations['en'];
        if (allDuplicateGroups.length === 0) {
            updateStatus(t.statusNoCleanupItems, 'info');
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
            updateStatus(t.statusNoSelectedItems(displayMode), 'info');
            return;
        }

        try {
            updateStatus(t.statusStartCleanup(totalToDelete, displayMode), 'info');
            cleanupProgressContainer.style.display = 'block';
            cleanupProgressBar.style.width = '0%';
            cleanupProgressText.textContent = t.cleanupProgressWaiting;
            stopButton.style.display = 'block';
            stopButton.disabled = true;
            stopButton.textContent = t.stopButton; // Ensure text is correct
            viewProgressButton.style.display = 'block';
            viewProgressButton.disabled = true;
            viewProgressButton.textContent = t.viewProgressRefresh;
            cleanButton.disabled = true;
            // --- 修复：启动清理时隐藏重置同步按钮和说明文字 ---
            resetSyncButton.style.display = 'none';
            syncInfoText.style.display = 'none';
            // --- --- ---

            const response = await chrome.runtime.sendMessage({
                action: "startCleanup",
                idsToDelete: idsToDelete,
                totalToDelete: totalToDelete
            });

            if (response && response.status === "already_running") {
                 updateStatus(t.statusAlreadyRunning, 'warning');
                 stopButton.style.display = 'none';
                 viewProgressButton.style.display = 'none';
                 cleanButton.disabled = false;
                 resetSyncButton.style.display = 'none';
                 syncInfoText.style.display = 'none';
                 return;
            }

            updateStatus(t.statusStartedCleanup(totalToDelete, displayMode), 'info');
            startProgressPolling();

        } catch (error) {
             console.error("启动后台清理失败:", error);
             updateStatus(t.statusCleanupStartError, 'error');
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
        const t = translations[currentLanguage] || translations['en'];
         try {
             stopButton.disabled = true;
             stopButton.textContent = t.stopButton; // Ensure text is correct during request
             const response = await chrome.runtime.sendMessage({ action: "stopCleanup" });
             
             if (response && response.status === "not_running") {
                  updateStatus(t.statusNotRunning, 'info');
                  stopButton.disabled = false;
                  stopButton.textContent = t.stopButton;
                  return;
             }
             
             updateStatus(t.statusStopRequested, 'info');
         } catch (err) {
              console.error("发送停止请求时出错:", err);
              updateStatus(t.statusCleanupStopError, 'error');
              stopButton.disabled = false;
              stopButton.textContent = t.stopButton;
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
        const t = translations[currentLanguage] || translations['en'];
         if (progressInterval) {
             try {
                 const data = await chrome.storage.local.get(['bookmarkCleanupState']);
                 updateCleanupProgressUI(data.bookmarkCleanupState);
             } catch (err) {
                 console.error("手动刷新错误:", err);
                 updateStatus(t.statusInitProgressError, 'error');
             }
         } else {
             startProgressPolling();
             viewProgressButton.textContent = t.viewProgressRefresh;
             updateStatus(t.statusInitProgressStart, 'info');
         }
    }

    // --- 新增：打开 Edge 同步设置页面的函数 ---
    async function openSyncSettings() {
        const t = translations[currentLanguage] || translations['en'];
        try {
            await chrome.tabs.create({ url: "edge://settings/profiles/sync/reset" });
            updateStatus(t.statusOpenSyncInfo, 'info');
            window.close();
        } catch (error) {
            console.error("打开同步设置页面失败:", error);
            updateStatus(t.statusOpenSyncError, 'error');
        }
    }
    // --- --- ---

    // --- 事件监听 ---
    scanButton.addEventListener('click', scanForDuplicates);
    cleanButton.addEventListener('click', startBackgroundCleanup);
    stopButton.addEventListener('click', requestStopCleanup);
    viewProgressButton.addEventListener('click', manuallyRefreshProgress);
    resetSyncButton.addEventListener('click', openSyncSettings);
    languageSwitchButton.addEventListener('click', switchLanguage); // Add language switch listener

    // --- Popup 打开时的初始化 ---
    // 1. 首先检测并设置语言
    await detectAndSetLanguage();
    // 2. 然后根据检测到的语言更新UI文本
    updateUIText(currentLanguage);
    // 3. 最后执行其他初始化逻辑
    try {
        const data = await chrome.storage.local.get(['bookmarkCleanupState']);
        if (data.bookmarkCleanupState && (data.bookmarkCleanupState.isRunning || data.bookmarkCleanupState.isRunning === false)) { // Check for existence and boolean
             updateCleanupProgressUI(data.bookmarkCleanupState);
             if (data.bookmarkCleanupState.isRunning) {
                 console.log("检测到正在运行的后台任务，开始轮询进度。");
                 startProgressPolling();
             } else {
                 viewProgressButton.style.display = 'block';
                 viewProgressButton.textContent = translations[currentLanguage]?.viewProgressFinal || "View Final Progress";
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




