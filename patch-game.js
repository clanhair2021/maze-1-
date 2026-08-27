/* ==========================================================================
   美容室CLan 迷路ゲーム - patch-game.js
   【役割】ハック発生演出・VS Code風バグ修正パッチミニゲーム
   ========================================================================== */

// --------------------------------------------------------------------------
// 1. ハック・演出トリガー
// --------------------------------------------------------------------------
function triggerHackEvent() {
    if (isHacked || isHackCooldown || !isHackModeEnabled) return;

    isHacked = true;
    hasNoiseInSession = true;

    // 暗転のランダム決定（完全暗転またはスポットライト）
    isBlackout = Math.random() < 0.5;

    // グリッチノイズ・キャンバス再描画
    redrawAllHistory();
    showNoiseEffect();

    // 警告ボタンの点滅状態更新
    const repairBtn = document.getElementById('repair-trigger-btn');
    if (repairBtn) {
        repairBtn.classList.add('warning');
        repairBtn.innerText = '⚠️ システム異常発生';
    }
}

function showNoiseEffect() {
    const overlay = document.getElementById('noise-overlay');
    if (!overlay) return;

    overlay.style.display = 'block';
    setTimeout(() => {
        overlay.style.display = 'none';
    }, 400);
}

// --------------------------------------------------------------------------
// 2. パッチミニゲーム モーダル開閉
// --------------------------------------------------------------------------
function openPatchGame() {
    if (isPatchGameActive) return;

    isPatchGameActive = true;
    isScanned = false;
    patchTimeLeft = 45.0;

    // ランダムなターゲット値をセット (3 〜 9)
    targetCalcValue = getRandomInt(3, 9);

    const overlay = document.getElementById('minigame-overlay');
    if (overlay) {
        overlay.style.display = 'flex';
    }

    renderCodeUI();
    startPatchTimer();
}

function closePatchGame() {
    isPatchGameActive = false;
    clearInterval(patchTimerInterval);

    const overlay = document.getElementById('minigame-overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

// --------------------------------------------------------------------------
// 3. パッチタイマー管理
// --------------------------------------------------------------------------
function startPatchTimer() {
    const timerElem = document.getElementById('timer-display-patch');
    if (timerElem) {
        timerElem.innerText = formatPatchTime(patchTimeLeft);
    }

    clearInterval(patchTimerInterval);
    patchTimerInterval = setInterval(() => {
        patchTimeLeft -= 0.1;
        if (timerElem) {
            timerElem.innerText = formatPatchTime(patchTimeLeft);
        }

        if (patchTimeLeft <= 0) {
            clearInterval(patchTimerInterval);
            alert('⌛ パッチ適用タイムアウト！復旧に失敗しました。');
            closePatchGame();
        }
    }, 100);
}

// --------------------------------------------------------------------------
// 4. コードエディタUIの動的生成
// --------------------------------------------------------------------------
function renderCodeUI() {
    const container = document.getElementById('patch-code-container');
    if (!container) return;

    const rubyHtml = isScanned
        ? `<div class="ruby-text">💡 ヒント: 式の計算結果が [ ${targetCalcValue} ] になるように演算子を選び、Apply Patchを押してください</div>`
        : '';

    container.innerHTML = `
        <div class="code-line"><span class="comment">// CRITICAL BUG DETECTED: MEMORY CORRUPTION</span></div>
        <div class="code-line"><span class="keyword">function</span> <span class="function-name">fixSystemKernel</span>() {</div>
        <div class="code-line">&nbsp;&nbsp;<span class="keyword">const</span> <span class="var-name">targetValue</span> = <span class="number">${targetCalcValue}</span>;</div>
        ${rubyHtml}
        <div class="code-line fake-code">
            &nbsp;&nbsp;<span class="keyword">let</span> <span class="var-name">result</span> = <span class="number">12</span> 
            <select id="op1-select" class="fix-select">
                <option value="+">+</option>
                <option value="-">-</option>
                <option value="*">*</option>
                <option value="/">/</option>
            </select>
            <span class="number">2</span>
            <select id="op2-select" class="fix-select">
                <option value="+">+</option>
                <option value="-">-</option>
                <option value="*">*</option>
                <option value="/">/</option>
            </select>
            <span class="number">3</span>;
        </div>
        <div class="code-line">&nbsp;&nbsp;<span class="keyword">return</span> <span class="var-name">result</span> === <span class="var-name">targetValue</span>;</div>
        <div class="code-line">}</div>
    `;
}

// --------------------------------------------------------------------------
// 5. コード解析 (Scan) & パッチ実行 (Execute Live Patch)
// --------------------------------------------------------------------------
function scanCode() {
    isScanned = true;
    renderCodeUI();
}

function executeLivePatch() {
    const op1 = document.getElementById('op1-select')?.value;
    const op2 = document.getElementById('op2-select')?.value;

    if (!op1 || !op2) return;

    // 演算結果の評価 (12 op1 2 op2 3)
    let calcResult = 0;
    try {
        // 安全な計算処理
        let step1 = 0;
        if (op1 === '+') step1 = 12 + 2;
        else if (op1 === '-') step1 = 12 - 2;
        else if (op1 === '*') step1 = 12 * 2;
        else if (op1 === '/') step1 = 12 / 2;

        if (op2 === '+') calcResult = step1 + 3;
        else if (op2 === '-') calcResult = step1 - 3;
        else if (op2 === '*') calcResult = step1 * 3;
        else if (op2 === '/') calcResult = step1 / 3;
    } catch (e) {
        calcResult = NaN;
    }

    if (calcResult === targetCalcValue) {
        alert('🎉 パッチ適用成功！システムが正常復旧しました。');
        closePatchGame();
        resolveHackState();
    } else {
        alert(`❌ パッチ検証エラー: 計算結果は ${calcResult} でした（目標: ${targetCalcValue}）`);
    }
}

// --------------------------------------------------------------------------
// 6. ハック状態の解除・クールダウン設定
// --------------------------------------------------------------------------
function resolveHackState() {
    isHacked = false;
    isBlackout = false;
    redrawAllHistory();

    const repairBtn = document.getElementById('repair-trigger-btn');
    if (repairBtn) {
        repairBtn.classList.remove('warning');
        repairBtn.innerText = '🛠️ システム診断';
    }

    // クールダウン設定 (連続ハック防止)
    isHackCooldown = true;
    clearTimeout(hackCooldownTimer);
    hackCooldownTimer = setTimeout(() => {
        isHackCooldown = false;
    }, 15000); // 15秒間クールダウン
}

