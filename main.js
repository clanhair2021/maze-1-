/* ==========================================================================
   美容室CLan 迷路ゲーム - main.js
   【役割】イベントリスナー登録・タッチ＆マウス操作判定・アプリ初期化
   ========================================================================== */

// --------------------------------------------------------------------------
// 1. マウス & タッチ操作イベント処理（描画・判定判定）
// --------------------------------------------------------------------------
function getCanvasPoint(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
        x: clientX - rect.left,
        y: clientY - rect.top
    };
}

function handleStart(e) {
    if (hasJudged) return;

    const pt = getCanvasPoint(e);
    const orig = getOriginalCoordinates(pt.x, pt.y);

    // 管理者モード時は自由に描画開始
    if (isAdminMode) {
        isDrawing = true;
        currentStroke = [pt];
        return;
    }

    // 通常モード時：スタート地点（赤色領域）からの判定チェック
    if (startPoint) {
        const dist = Math.hypot(orig.x - startPoint.x, orig.y - startPoint.y);
        if (dist > 40) {
            // スタート地点以外からの描き始めは無効
            return;
        }
    }

    isDrawing = true;
    currentStroke = [pt];
    startMazeTimer();
}

function handleMove(e) {
    if (!isDrawing || hasJudged) return;
    if (e.cancelable) e.preventDefault(); // スクロール等の標準挙動を防止

    const pt = getCanvasPoint(e);
    const orig = getOriginalCoordinates(pt.x, pt.y);

    currentStroke.push(pt);
    redrawAllHistory();

    if (isAdminMode) return;

    // --- 通常プレイヤー時の衝突・進行判定 ---

    // 1. 壁判定（壁に触れたらアウト）
    if (isWallCalculated && isWallPixel(orig.x, orig.y)) {
        isDrawing = false;
        hasJudged = true;
        stopMazeTimer();
        alert('💥 壁に衝突しました！アウトです。');
        resetCanvasState();
        return;
    }

    // 2. ゴール判定（青色領域に到達したらクリア）
    if (goalPoint) {
        const dist = Math.hypot(orig.x - goalPoint.x, orig.y - goalPoint.y);
        if (dist <= 30) {
            isDrawing = false;
            hasJudged = true;
            stopMazeTimer();
            const finalTime = timerDisplay ? timerDisplay.innerText : '';
            alert(`🎉 GOAL！！おめでとうございます！\nクリアタイム: ${finalTime}`);
            return;
        }
    }

    // 3. ランダムハック発生判定 (1%の確率で発生)
    if (isHackModeEnabled && !isHacked && !isHackCooldown) {
        if (Math.random() < 0.01) {
            triggerHackEvent();
        }
    }
}

function handleEnd() {
    if (!isDrawing) return;
    isDrawing = false;

    if (currentStroke.length > 0) {
        allStrokes.push([...currentStroke]);
        currentStroke = [];
    }
}

// --------------------------------------------------------------------------
// 2. 管理者パネル・ファイル選択処理
// --------------------------------------------------------------------------
function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const imgSrc = event.target.result;
        if (currentStageIndex !== null) {
            stages[currentStageIndex].imageSrc = imgSrc;
        }
        loadMazeImage(imgSrc);
    };
    reader.readAsDataURL(file);
}

// --------------------------------------------------------------------------
// 3. 全イベントリスナー登録 & アプリ初期化
// --------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    // 🎨 キャンバス操作イベント
    canvas.addEventListener('mousedown', handleStart);
    canvas.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);

    canvas.addEventListener('touchstart', handleStart, { passive: false });
    canvas.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleEnd);

    // 🔄 ウィンドウリサイズ対応
    window.addEventListener('resize', resizeCanvas);

    // 📁 ファイル選択
    if (fileInput) {
        fileInput.addEventListener('change', handleFileUpload);
    }

    // 🧹 クリアボタン
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            resetCanvasState();
            redrawAllHistory();
        });
    }

    // ⚙️ モード切替ボタン
    const modeUserBtn = document.getElementById('mode-user-btn');
    const modeAdminBtn = document.getElementById('mode-admin-btn');
    if (modeUserBtn) modeUserBtn.addEventListener('click', () => setAdminMode(false));
    if (modeAdminBtn) modeAdminBtn.addEventListener('click', () => setAdminMode(true));

    // 🛠️ ハック復旧ボタン・パッチミニゲーム用ボタン
    const repairBtn = document.getElementById('repair-trigger-btn');
    const scanBtn = document.getElementById('scan-btn');
    const applyBtn = document.getElementById('apply-btn');
    const cancelBtn = document.getElementById('cancel-btn');

    if (repairBtn) repairBtn.addEventListener('click', openPatchGame);
    if (scanBtn) scanBtn.addEventListener('click', scanCode);
    if (applyBtn) applyBtn.addEventListener('click', executeLivePatch);
    if (cancelBtn) cancelBtn.addEventListener('click', closePatchGame);

    // 🧭 ドロワー開閉
    const menuToggleBtn = document.getElementById('menu-toggle');
    const closeDrawerBtn = document.getElementById('close-drawer-btn');
    const backMenuBtn = document.getElementById('back-menu-btn');

    if (menuToggleBtn) menuToggleBtn.addEventListener('click', toggleDrawer);
    if (closeDrawerBtn) closeDrawerBtn.addEventListener('click', closeDrawer);
    if (backMenuBtn) backMenuBtn.addEventListener('click', backToMenu);

    // ⚙️ 設定メニュー開閉
    const settingsTriggerBtn = document.getElementById('settings-trigger-btn');
    if (settingsTriggerBtn) {
        settingsTriggerBtn.addEventListener('click', toggleSettingsMenu);
    }

    // 🏁 初期状態のロード
    renderStageCards();
    showPage('menu-page');
});
