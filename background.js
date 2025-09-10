// background.js
// 此文件在上一版基础上优化了清理速度（通过并发和调整延迟）。
// 无需修改，因为删除逻辑的修正已在 popup.js 中完成。

let cleanupState = {
    isRunning: false,
    processed: 0,
    deleted: 0,
    errors: 0,
    total: 0,
    idsToDelete: [],
    stopRequested: false,
    wasStopped: false
};

const STORAGE_KEY = 'bookmarkCleanupState';
const CLEANUP_DELAY_MS = 8;
const MAX_CONCURRENT_REQUESTS = 8;

async function saveState() {
    try {
        await chrome.storage.local.set({ [STORAGE_KEY]: cleanupState });
        console.log("后台状态已保存:", cleanupState);
    } catch (err) {
        console.error("保存状态失败:", err);
    }
}

function resetState() {
    cleanupState = {
        isRunning: false,
        processed: 0,
        deleted: 0,
        errors: 0,
        total: 0,
        idsToDelete: [],
        stopRequested: false,
        wasStopped: false
    };
    console.log("后台状态已重置");
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "startCleanup") {
        console.log("收到启动清理请求");
        if (cleanupState.isRunning) {
            console.warn("清理已在运行中，忽略新的启动请求");
            sendResponse({ status: "already_running" });
            return true;
        }

        resetState();
        cleanupState.isRunning = true;
        cleanupState.idsToDelete = message.idsToDelete || [];
        cleanupState.total = message.totalToDelete || cleanupState.idsToDelete.length;
        cleanupState.processed = 0;
        cleanupState.deleted = 0;
        cleanupState.errors = 0;
        cleanupState.stopRequested = false;
        cleanupState.wasStopped = false;

        saveState().then(() => {
            performCleanup();
        });
        sendResponse({ status: "started" });

    } else if (message.action === "stopCleanup") {
        console.log("收到停止清理请求");
        if (cleanupState.isRunning) {
            cleanupState.stopRequested = true;
            console.log("已设置停止请求标志");
            saveState();
            sendResponse({ status: "stop_requested" });
        } else {
            console.log("当前没有运行中的清理任务");
            sendResponse({ status: "not_running" });
        }
    }
    return true;
});

async function processBatch(idsBatch) {
    const results = await Promise.allSettled(
        idsBatch.map(async (id) => {
            if (cleanupState.stopRequested) {
                throw new Error("STOP_REQUESTED_DURING_WAIT");
            }
            await chrome.bookmarks.remove(id);
            console.log(`成功删除书签 ID: ${id}`);
            cleanupState.deleted++;
        })
    );

    results.forEach((result, index) => {
        if (result.status === 'rejected') {
            const id = idsBatch[index];
            if (result.reason.message !== "STOP_REQUESTED_DURING_WAIT") {
                console.error(`删除书签 ID: ${id} 时出错:`, result.reason);
                cleanupState.errors++;
            } else {
                console.log(`书签 ID: ${id} 的删除因停止请求被跳过。`);
            }
        }
        if (result.status === 'fulfilled' || result.reason.message !== "STOP_REQUESTED_DURING_WAIT") {
             cleanupState.processed++;
        }
    });
}

async function performCleanup() {
    console.log("开始执行后台清理任务 (优化版)...");
    const ids = [...cleanupState.idsToDelete];

    for (let i = 0; i < ids.length; i += MAX_CONCURRENT_REQUESTS) {
        if (cleanupState.stopRequested) {
            console.log("检测到停止请求，正在中断清理任务...");
            cleanupState.wasStopped = true;
            break;
        }

        const batch = ids.slice(i, i + MAX_CONCURRENT_REQUESTS);
        try {
            await processBatch(batch);
        } catch (batchErr) {
             console.error("处理批次时发生未预期错误:", batchErr);
        }

        await saveState();

        if (CLEANUP_DELAY_MS > 0 && i + MAX_CONCURRENT_REQUESTS < ids.length) {
           await new Promise(resolve => setTimeout(resolve, CLEANUP_DELAY_MS));
        }
    }

    console.log("后台清理任务完成或被中断。");
    cleanupState.isRunning = false;
    await saveState();
    console.log("最终状态:", cleanupState);
}