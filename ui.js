/* ==========================================================================
   美容室CLan 迷路ゲーム - ui.js
   【役割】画面切り替え・ドロワーメニュー・設定・UI制御関数
   ========================================================================== */

// --------------------------------------------------------------------------
// 1. ページ表示切り替え (メニュー / ゲーム)
// --------------------------------------------------------------------------
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active');
    }

    // ゲーム画面から移動する場合はタイマーを停止
    if (pageId !== 'game-page') {
        if (typeof stopMazeTimer === 'function') stopMazeTimer();
    }
}

// メインメニュー画面へ戻る
function backToMenu() {
    closeDrawer();
    showPage('menu-page');
    renderStageCards();
}
// HTML互換用エイリアス
function goBackMenu() {
    backToMenu();
}

// --------------------------------------------------------------------------
// 2. ドロワーメニュー制御
// --------------------------------------------------------------------------
function openDrawer() {
    const drawer = document.getElementById('drawer-menu');
    if (drawer) {
        drawer.classList.add('open');
    }
}

function closeDrawer() {
    const drawer = document.getElementById('drawer-menu');
    if (drawer) {
        drawer.classList.remove('open');
    }
}

function toggleDrawer() {
    const drawer = document.getElementById('drawer-menu');
    if (drawer) {
        drawer.classList.toggle('open');
    }
}

// --------------------------------------------------------------------------
// 3. 設定メニュー（右上ドロップダウン）制御
// --------------------------------------------------------------------------
function toggleSettings(event) {
    if (event) event.stopPropagation();
    // HTML側の id="settingsContent" に対応
    const content = document.getElementById('settingsContent');
    if (content) {
        content.classList.toggle('active');
        content.classList.toggle('open');
    }
}

// HTMLの onclick="toggleSettingsMenu()" 互換
function toggleSettingsMenu(event) {
    toggleSettings(event);
}

// ドロップダウンメニュー外クリックで閉じる処理
window.addEventListener('click', (e) => {
    const content = document.getElementById('settingsContent');
    const trigger = document.querySelector('.settings-trigger');
    if (content && (content.classList.contains('active') || content.classList.contains('open'))) {
        if (!content.contains(e.target) && e.target !== trigger) {
            content.classList.remove('active');
            content.classList.remove('open');
        }
    }
});

// HTMLの onclick="openAdmin('imageMode')" 用の受ける関数
function openAdmin(mode) {
    showPage('game-page');
    openDrawer();
    setAdminMode(true);
    
    const ctrlImage = document.getElementById('ctrl-image-mode');
    const ctrlTrace = document.getElementById('ctrl-trace-mode');
    
    if (mode === 'imageMode') {
        if (ctrlImage) ctrlImage.style.display = 'block';
        if (ctrlTrace) ctrlTrace.style.display = 'none';
    } else if (mode === 'traceMode') {
        if (ctrlImage) ctrlImage.style.display = 'none';
        if (ctrlTrace) ctrlTrace.style.display = 'block';
    }
}

// --------------------------------------------------------------------------
// 4. 管理者モード・ゲームモード切替 UI
// --------------------------------------------------------------------------
function setAdminMode(isAdmin) {
    isAdminMode = isAdmin;
    const adminControls = document.getElementById('admin-controls');
    const btnUser = document.getElementById('mode-user-btn');
    const btnAdmin = document.getElementById('mode-admin-btn');

    if (isAdminMode) {
        if (adminControls) adminControls.style.display = 'block';
        if (btnAdmin) btnAdmin.classList.add('selected');
        if (btnUser) btnUser.classList.remove('selected');
    } else {
        if (adminControls) adminControls.style.display = 'none';
        if (btnUser) btnUser.classList.add('selected');
        if (btnAdmin) btnAdmin.classList.remove('selected');
    }
    
    // キャンバス再描画
    if (typeof redrawAllHistory === 'function') {
        redrawAllHistory();
    }
}

// --------------------------------------------------------------------------
// 5. ステージ選択カードの動的描画 (3列グリッド対応)
// --------------------------------------------------------------------------
function renderStageCards() {
    // HTML側が class="stage-container" のため両対応
    const container = document.getElementById('stage-container') || document.querySelector('.stage-container');
    if (!container) return;

    container.innerHTML = '';

    // stagesが未定義または空の場合の安全保護
    const stageList = (typeof stages !== 'undefined' && stages.length > 0) ? stages : [
        {
            id: 1,
            title: "STAGE 1: 初級迷路",
            imageSrc: "",
            isCalculated: false
        }
    ];

    stageList.forEach((stage, index) => {
        const card = document.createElement('div');
        card.className = 'stage-card';
        card.onclick = () => selectStage(index);

        const imgBox = document.createElement('div');
        imgBox.className = 'stage-image-box';

        if (stage.imageSrc) {
            const img = document.createElement('img');
            img.src = stage.imageSrc;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'contain';
            imgBox.appendChild(img);
        } else {
            const placeholder = document.createElement('div');
            placeholder.className = 'image-placeholder';
            placeholder.innerText = `STAGE ${stage.id}`;
            imgBox.appendChild(placeholder);
        }

        const info = document.createElement('div');
        info.className = 'stage-info';
        info.innerHTML = `
            <div class="stage-number">STAGE 0${stage.id}</div>
            <div class="stage-title">${stage.title}</div>
        `;

        card.appendChild(imgBox);
        card.appendChild(info);
        container.appendChild(card);
    });
}

// ステージ選択時の処理
function selectStage(index) {
    currentStageIndex = index;
    const stageList = (typeof stages !== 'undefined') ? stages : [];
    const selectedStage = stageList[index];

    if (selectedStage && selectedStage.imageSrc) {
        if (typeof loadMazeImage === 'function') {
            loadMazeImage(selectedStage.imageSrc);
        }
    } else {
        // 画像未登録時のデフォルト初期化
        if (typeof currentMazeImageSrc !== 'undefined') currentMazeImageSrc = null;
        const mazeBg = document.getElementById('maze-bg');
        const setupStatus = document.getElementById('setup-status');
        if (mazeBg) mazeBg.style.display = 'none';
        if (setupStatus) setupStatus.innerText = 'ステータス: 画像未設定';
        if (typeof resetCanvasState === 'function') resetCanvasState();
    }

    showPage('game-page');
}

