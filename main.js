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

    // 通常モード時：スタート地点からの判定チェック
    if (startPoint) {
        const dist = Math.hypot(orig.x - startPoint.x, orig.y - startPoint.y);
        if (dist > 40) {
            // スタート地点以外からの描き始めは無効
            return;
        }
    }

    isDrawing = true;
    currentStroke = [pt];
    if (typeof startMazeTimer === 'function') {
        startMazeTimer();
    }
}

function handleMove(e) {
    if (!isDrawing || hasJudged) return;
    if (e.cancelable) e.preventDefault(); // スクロール等の標準挙動を防止

    const pt = getCanvasPoint(e);
    const orig = getOriginalCoordinates(pt.x, pt.y);

    currentStroke.push(pt);
    if (typeof redrawAllHistory === 'function') {
        redrawAllHistory();
    }

    if (isAdminMode) return;

    // --- 通常プレイヤー時の衝突・進行判定 ---

    // 1. 壁判定（壁に触れたらアウト）
    if (typeof isWallCalculated !== 'undefined' && isWallCalculated && typeof isWallPixel === 'function' && isWallPixel(orig.x, orig.y)) {
        isDrawing = false;
        hasJudged = true;
        if (typeof stopMazeTimer === 'function') stopMazeTimer();
        alert('💥 壁に衝突しました！アウトです。');
        if (typeof resetCanvasState === 'function') resetCanvasState();
        return;
    }

    // 2. ゴール判定（ゴール領域に到達したらクリア）
    if (typeof goalPoint !== 'undefined' && goalPoint) {
        const dist = Math.hypot(orig.x - goalPoint.x, orig.y - goalPoint.y);
        if (dist <= 30) {
            isDrawing = false;
            hasJudged = true;
            if (typeof stopMazeTimer === 'function') stopMazeTimer();
            const timerDisplay = document.getElementById('timer-display');
            const finalTime = timerDisplay ? timerDisplay.innerText : '';
            alert(`🎉 GOAL！！おめでとうございます！\nクリアタイム: ${finalTime}`);
            return;
        }
    }

    // 3. ランダムハック発生判定 (1%の確率で発生)
    if (typeof isHackModeEnabled !== 'undefined' && isHackModeEnabled && !isHacked && !isHackCooldown) {
        if (Math.random() < 0.01) {
            if (typeof triggerHackEvent === 'function') triggerHackEvent();
        }
    }
}

function handleEnd() {
    if (!isDrawing) return;
    isDrawing = false;

    if (currentStroke.length > 0) {
        if (typeof allStrokes !== 'undefined') {
            allStrokes.push([...currentStroke]);
        }
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
        if (typeof currentStageIndex !== 'undefined' && currentStageIndex !== null) {
            stages[currentStageIndex].imageSrc = imgSrc;
        }
        if (typeof loadMazeImage === 'function') {
            loadMazeImage(imgSrc);
        }
    };
    reader.readAsDataURL(file);
}

// --------------------------------------------------------------------------
// 3. 全イベントリスナー登録 & アプリ初期化
// --------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    // 🎨 キャンバス要素の取得とイベント設定
    const canvas = document.getElementById('canvas');
    if (canvas) {
        canvas.addEventListener('mousedown', handleStart);
        canvas.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleEnd);

        canvas.addEventListener('touchstart', handleStart, { passive: false });
        canvas.addEventListener('touchmove', handleMove, { passive: false });
        window.addEventListener('touchend', handleEnd);
    }

    // 🔄 ウィンドウリサイズ対応
    if (typeof resizeCanvas === 'function') {
        window.addEventListener('resize', resizeCanvas);
    }

    // 📁 ファイル選択（問題画像・シングル画像）
    const imgQuestion = document.getElementById('img-question');
    const imgSingle = document.getElementById('img-single');
    if (imgQuestion) imgQuestion.addEventListener('change', handleFileUpload);
    if (imgSingle) imgSingle.addEventListener('change', handleFileUpload);

    // 🧹 初期化・クリア関係（HTML側の onclick 以外の安全対策）
    const clearBtn = document.querySelector('.drawer-btn[onclick*="resetCanvas"]');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (typeof resetCanvasState === 'function') resetCanvasState();
            if (typeof redrawAllHistory === 'function') redrawAllHistory();
        });
    }

    // 🏁 初期データの確保とステージカードの生成
    if (typeof stages === 'undefined' || !stages || stages.length === 0) {
        window.stages = [
            {
                id: 1,
                title: "STAGE 1: 初級迷路",
                imageSrc: "https://via.placeholder.com/360x520/ffffff/000000?text=MAZE+STAGE+1",
                isCalculated: false
            }
        ];
    }

    // ステージ一覧の描画関数を実行
    if (typeof renderStageCards === 'function') {
        renderStageCards();
    } else {
        // ui.js側に renderStageCards が無い場合の互換処理
        const container = document.querySelector('.stage-container');
        if (container && window.stages) {
            container.innerHTML = '';
            window.stages.forEach(stage => {
                const card = document.createElement('div');
                card.className = 'stage-card';
                card.style.cssText = 'border:2px solid #000; margin:10px; padding:10px; background:#fff; cursor:pointer; text-align:center;';
                card.innerHTML = `
                    <h3>${stage.title}</h3>
                    <img src="${stage.imageSrc}" style="max-width:100%; height:auto;">
                    <button style="margin-top:8px; padding:5px 15px;">スタート</button>
                `;
                card.onclick = () => {
                    const menuPage = document.getElementById('menu-page');
                    const gamePage = document.getElementById('game-page');
                    if (menuPage) menuPage.classList.remove('active');
                    if (gamePage) gamePage.classList.add('active');
                    if (typeof loadMazeImage === 'function') loadMazeImage(stage.imageSrc);
                };
                container.appendChild(card);
            });
        }
    }
});

