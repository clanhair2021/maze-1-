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
        stopMazeTimer();
    }
}

// メインメニュー画面へ戻る
function backToMenu() {
    closeDrawer();
    showPage('menu-page');
    renderStageCards();
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
function toggleSettingsMenu(event) {
    if (event) event.stopPropagation();
    const content = document.getElementById('settings-content');
    if (content) {
        content.classList.toggle('open');
    }
}

// ドロップダウンメニュー外クリックで閉じる処理
window.addEventListener('click', (e) => {
    const content = document.getElementById('settings-content');
    const trigger = document.querySelector('.settings-trigger');
    if (content && content.classList.contains('open')) {
        if (!content.contains(e.target) && e.target !== trigger) {
            content.classList.remove('open');
        }
    }
});

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
    const container = document.getElementById('stage-container');
    if (!container) return;

    container.innerHTML = '';

    stages.forEach((stage, index) => {
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
    const selectedStage = stages[index];

    if (selectedStage.imageSrc) {
        loadMazeImage(selectedStage.imageSrc);
    } else {
        // 画像未登録時のデフォルト初期化
        currentMazeImageSrc = null;
        if (mazeBg) mazeBg.style.display = 'none';
        if (setupStatus) setupStatus.innerText = 'ステータス: 画像未設定';
        resetCanvasState();
    }

    showPage('game-page');
}
