/* ========================================
   ⚙️ システム設定
   ========================================== */
const CONFIG = {
    userStrokeColor: "rgba(0, 191, 255, 0.85)",   /* プレイヤーが引く線（黒の半透明） */
    adminStrokeColor: "rgba(0, 191, 255, 0.85)",  /* 管理者がお手本をなぞる時の色 */
    strokeWidth: 5,                          /* 線の太さ */
    goalTolerance: 12,                       /* ゴール位置判定の甘さ */
    startTolerance: 120                      /* スタート位置判定の甘さ */
};

/* ==========================================
   共通変数・要素定義
   ========================================== */
const menuPage = document.getElementById('menu-page');
const gamePage = document.getElementById('game-page');
const wrapper = document.getElementById('maze-wrapper');
const container = document.getElementById('canvas-container');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const mazeBg = document.getElementById('maze-bg');
const adminControls = document.getElementById('admin-controls');
const ctrlImageMode = document.getElementById('ctrl-image-mode');
const ctrlTraceMode = document.getElementById('ctrl-trace-mode');
const pageTitle = document.getElementById('page-title');
const hiddenCanvas = document.getElementById('hidden-canvas');
const hiddenCtx = hiddenCanvas.getContext('2d');
const imgAnswerObj = new Image();

let isDrawing = false;
let isAdminMode = false;
let adminSubMode = 'imageMode'; 
let hasJudged = false; 
let isLandscape = false; 
let currentMode = 'draw'; 

let scale = 1; let panX = 0; let panY = 0;
let startTouchDistance = 0; let lastTouchX = 0; let lastTouchY = 0;
let strokeHistory = []; let currentStroke = []; 
let judgeSystemType = 'color'; let savedRoute = [];
let mazeStartPoint = null; let mazeGoalPoint = null; let setupStep = 'none';
let currentStageNumber = 1;
let isBlackout = false; // 👈 追記：暗転フラグ
let hackTimer = null;         // ハック発生タイマー
let isHacked = false;         // ハック中（暗転障害発生中）かどうか
const HACK_INTERVAL = 8000;   // ハックが発生する間隔（例：8秒ごと）
let lightRadius = 150;      // スポットライトの半径（初期値）
const maxRadius = 150;      // スポットライトの最大半径
let isHackModeEnabled = true; // 👈 追記：ハックモード（暗転・スポットライト）のON/OFF

/* ==========================================
   🎮 難易度設定システム（追加）
   ========================================== */
let currentDifficulty = 'NORMAL';

const DIFFICULTY_SETTINGS = {
    EASY:     { useLight: false, radius: 150, hasHack: false, needScanMinigame: false },
    NORMAL:   { useLight: true,  radius: 150, hasHack: false, needScanMinigame: false },
    HARD:     { useLight: true,  radius: 150, hasHack: true,  needScanMinigame: false },
    EXPERT:   { useLight: true,  radius: 150, hasHack: true,  needScanMinigame: true },
    SECRET:   { useLight: true,  radius: 40,  hasHack: true,  needScanMinigame: true }
};

let mapOpacity = 1.0;
let currentBugType = 'TYPE_A';

// 難易度切り替え関数
function setDifficulty(diff) {
    currentDifficulty = diff;
    const settings = DIFFICULTY_SETTINGS[diff];
    
    if (typeof isHackModeEnabled !== 'undefined') {
        isHackModeEnabled = settings.hasHack;
    }
    if (typeof lightRadius !== 'undefined') {
        lightRadius = settings.radius;
    }
    
    document.querySelectorAll('.diff-btn').forEach(btn => btn.classList.remove('active'));
    const selectedBtn = document.getElementById(`btn-diff-${diff.toLowerCase()}`);
    if (selectedBtn) selectedBtn.classList.add('active');
}

/* ==========================================
   📦 プリセット（最初から入っている）ステージデータ
   ========================================== */
const PRESET_STAGES = [
    {
        number: 1,
        title: "北海道",
        image: "stages/stage1.jpg",            // 問題画像
        answerImage: "stages/stage1_ans.jpg",  // 正解画像（赤・青・黄が入った画像）
        judgeSystem: "color"
    },
    {
        number: 2,
        title: "青森県",
        image: "stages/stage2.jpg",
        answerImage: "stages/stage2_ans.jpg",
        judgeSystem: "color"
    }
];

/* ==========================================
   初期化・画像読み込みと自動フィット
   ========================================== */
window.onload = function() {
    loadStageData(1);
    refreshStageMenu();
    window.addEventListener('resize', adjustCanvasSize);
};

/* 🔍 正解画像から「青(スタート)」「緑(ゴール)」を自動判定する処理 */
function autoDetectStartAndGoal(ansImgObj) {
    if (!ansImgObj.complete || ansImgObj.naturalWidth === 0) return;

    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = ansImgObj.naturalWidth;
    tempCanvas.height = ansImgObj.naturalHeight;
    tempCtx.drawImage(ansImgObj, 0, 0);

    const imgData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height).data;
    let foundStart = null;
    let foundGoal = null;

    // 4ピクセル単位で走査（高速化のため）
    for (let y = 0; y < tempCanvas.height; y += 4) {
        for (let x = 0; x < tempCanvas.width; x += 4) {
            const i = (y * tempCanvas.width + x) * 4;
            const r = imgData[i];
            const g = imgData[i + 1];
            const b = imgData[i + 2];
            const a = imgData[i + 3];

            if (a < 200) continue;

            // 青色判定 (スタート)
            if (!foundStart && b > 180 && r < 100 && g < 100) {
                foundStart = { x: x, y: y };
            }
            // 緑色判定 (ゴール)
            if (!foundGoal && g > 180 && r < 100 && b < 100) {
                foundGoal = { x: x, y: y };
            }

            if (foundStart && foundGoal) break;
        }
        if (foundStart && foundGoal) break;
    }

    // 表示用キャンバスの解像度スケール比率を計算して位置を補正
    const scaleX = canvas.width / tempCanvas.width;
    const scaleY = canvas.height / tempCanvas.height;

    if (foundStart) mazeStartPoint = { x: foundStart.x * scaleX, y: foundStart.y * scaleY };
    if (foundGoal) mazeGoalPoint = { x: foundGoal.x * scaleX, y: foundGoal.y * scaleY };
}

/* ✨ 指定されたステージのデータをローカルストレージ・プリセットから読み込む関数 */
function loadStageData(stageNumber) {
    currentStageNumber = stageNumber;
    const preset = PRESET_STAGES.find(s => s.number === stageNumber);

    const localImage = localStorage.getItem(`stage_${stageNumber}_image`) || (preset ? preset.image : "");
    const localRoute = localStorage.getItem(`stage_${stageNumber}_route`);
    const localSystem = localStorage.getItem(`stage_${stageNumber}_judge_system`) || (preset ? preset.judgeSystem : "color");
    const localAnsImg = localStorage.getItem(`stage_${stageNumber}_answer_image`) || (preset ? preset.answerImage : "");
    const localStart = localStorage.getItem(`stage_${stageNumber}_start_pt`);
    const localGoal = localStorage.getItem(`stage_${stageNumber}_goal_pt`);

    // いったんデータをリセット
    mazeBg.src = "";
    mazeBg.style.display = 'none';
    savedRoute = [];
    imgAnswerObj.src = "";
    mazeStartPoint = null;
    mazeGoalPoint = null;
    judgeSystemType = localSystem;

    // 選択されたステージのデータを反映
    if (localImage) { mazeBg.src = localImage; mazeBg.style.display = 'block'; }
    if (judgeSystemType === 'trace' && localRoute) { savedRoute = JSON.parse(localRoute); }
    
    // 2枚画像判定（color）の読み込みと自動スタート・ゴール位置判定
    if (localAnsImg) { 
        imgAnswerObj.src = localAnsImg;
        imgAnswerObj.onload = function() {
            if (!localStart || !localGoal) {
                autoDetectStartAndGoal(imgAnswerObj);
            }
        };
    }

    if (localStart) mazeStartPoint = JSON.parse(localStart);
    if (localGoal) mazeGoalPoint = JSON.parse(localGoal);
}

mazeBg.onload = function() {
    isLandscape = mazeBg.naturalWidth > mazeBg.naturalHeight;
    adjustCanvasSize();
};

function adjustCanvasSize() {
    if (!mazeBg.src || mazeBg.naturalWidth === 0) return;

    const screenWidth = container.clientWidth;
    const screenHeight = container.clientHeight;

    const imgWidth = mazeBg.naturalWidth;
    const imgHeight = mazeBg.naturalHeight;

    let targetWidth = screenWidth;
    let targetHeight = screenHeight;

    const screenRatio = screenWidth / screenHeight;
    const imgRatio = imgWidth / imgHeight;

    if (imgRatio > screenRatio) {
        targetWidth = screenWidth;
        targetHeight = screenWidth / imgRatio;
    } else {
        targetHeight = screenHeight;
        targetWidth = screenHeight * imgRatio;
    }

    canvas.width = targetWidth;
    canvas.height = targetHeight;
    canvas.style.width = targetWidth + 'px';
    canvas.style.height = targetHeight + 'px';

    redrawAllHistory(); 
}

function updateTransform() {
    let baseRotate = isLandscape ? 'rotate(90deg) ' : '';
    wrapper.style.transform = `${baseRotate}translate(${panX}px, ${panY}px) scale(${scale})`;
}

function setMode(mode) {
    currentMode = mode;
    document.getElementById('btn-draw').classList.toggle('selected', mode === 'draw');
    document.getElementById('btn-zoom').classList.toggle('selected', mode === 'zoom');
}

/* ==========================================
   🚪 ドロワーメニュー & 設定の開閉
   ========================================== */
function toggleDrawer() {
    document.getElementById('drawer-menu').classList.toggle('open');
}

function toggleSettings() {
    document.getElementById('settingsContent').classList.toggle('open');
}

document.addEventListener('touchstart', function(e) {
    const drawer = document.getElementById('drawer-menu');
    const toggleBtn = document.getElementById('menu-toggle');
    if (drawer && drawer.classList.contains('open') && !drawer.contains(e.target) && e.target !== toggleBtn) {
        drawer.classList.remove('open');
    }
});

document.addEventListener('click', function(e) {
    const menu = document.querySelector('.settings-menu');
    if (menu && !menu.contains(e.target)) {
        const setCont = document.getElementById('settingsContent');
        if(setCont) setCont.classList.remove('open');
    }
});

/* ==========================================
   ゲーム状態遷移
   ========================================== */
function setSetupStep(step) {
    setupStep = step;
    document.getElementById('setup-status').innerText = step === 'start' ? "スタート位置を1回タップしてください" : "ゴール位置を1回タップしてください";
}

function startGame(stageNumber) {
    if (stageNumber) {
        loadStageData(stageNumber);
    }
    
    isAdminMode = false; setupStep = 'none';
    pageTitle.innerText = `CLan迷路ゲーム - Stage ${currentStageNumber}`; 
    setMode('draw'); adminControls.style.display = 'none';
    menuPage.classList.remove('active'); gamePage.classList.add('active');
    scale = 1; panX = 0; panY = 0; updateTransform();
    setTimeout(adjustCanvasSize, 50); setTimeout(resetCanvas, 60);
}

function openAdmin(mode) {
    const setCont = document.getElementById('settingsContent');
    if (setCont) setCont.classList.remove('open');
    isAdminMode = true; adminSubMode = mode; setupStep = 'none';
    pageTitle.innerText = mode === 'imageMode' ? `画像2枚登録 (Stage ${currentStageNumber})` : `なぞりお手本登録 (Stage ${currentStageNumber})`;
    
    const statusEl = document.getElementById('setup-status');
    if (statusEl) statusEl.innerText = "位置を指定してください";
    
    setMode('draw');
    
    document.getElementById('admin-controls').style.display = 'block';
    ctrlImageMode.style.display = mode === 'imageMode' ? 'block' : 'none';
    ctrlTraceMode.style.display = mode === 'traceMode' ? 'block' : 'none';
    
    const savedTitle = localStorage.getItem(`stage_${currentStageNumber}_title`) || "";
    const inputA = document.getElementById('stage-title-input-a');
    const inputB = document.getElementById('stage-title-input-b');
    if (inputA) inputA.value = savedTitle;
    if (inputB) inputB.value = savedTitle;
    
    menuPage.classList.remove('active'); 
    gamePage.classList.add('active');
    
    scale = 1; panX = 0; panY = 0; updateTransform();
    
    setTimeout(adjustCanvasSize, 50); 
    setTimeout(resetCanvas, 60);

    setTimeout(() => {
        const drawer = document.getElementById('drawer-menu');
        if (drawer) drawer.classList.add('open');
    }, 200);
}

function goBackMenu() { 
    stopMazeTimer(); 
    stopHackLoop(); // 👈 追記：ハックタイマーと暗転を完全リセット
    document.getElementById('timer-display').innerText = "TIME: 00:00.00"; 
    gamePage.classList.remove('active'); 
    menuPage.classList.add('active'); 
    refreshStageMenu();
}

function resetCanvas() { 
    ctx.clearRect(0, 0, canvas.width, canvas.height); 
    strokeHistory = []; 
    currentStroke = [];
    hasJudged = false; 
    stopHackLoop(); // 👈 追記：ハックタイマーと暗転を完全リセット
    redrawAllHistory(); 
}

/* ==========================================
   描画・タッチイベント処理
   ========================================== */
function redrawAllHistory() {
    // 1. メインキャンバスをクリア
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    updateTransform();
    
    // 2. 管理者モードのスタート/ゴール表示
    if (isAdminMode && adminSubMode === 'imageMode') {
        if (mazeStartPoint) { ctx.beginPath(); ctx.arc(mazeStartPoint.x, mazeStartPoint.y, 10, 0, Math.PI*2); ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.fill(); }
        if (mazeGoalPoint) { ctx.beginPath(); ctx.arc(mazeGoalPoint.x, mazeGoalPoint.y, 10, 0, Math.PI*2); ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fill(); }
    }

    // 3. 過去に描いた線を描画
    for (let stroke of strokeHistory) {
        if (stroke.length === 0) continue;
        ctx.beginPath(); ctx.moveTo(stroke[0].x, stroke[0].y);
        ctx.lineWidth = CONFIG.strokeWidth / scale;
        ctx.strokeStyle = isAdminMode ? CONFIG.adminStrokeColor : CONFIG.userStrokeColor; 
        ctx.lineCap = "round"; ctx.lineJoin = "round";
        for (let i = 1; i < stroke.length; i++) { ctx.lineTo(stroke[i].x, stroke[i].y); }
        ctx.stroke();
    }

    // 4. 現在描いている途中の線を描画
    if (isDrawing && currentStroke.length > 0) {
        ctx.beginPath(); ctx.moveTo(currentStroke[0].x, currentStroke[0].y);
        ctx.lineWidth = CONFIG.strokeWidth / scale;
        ctx.strokeStyle = isAdminMode ? CONFIG.adminStrokeColor : CONFIG.userStrokeColor;
        ctx.lineCap = "round"; ctx.lineJoin = "round";
        for (let i = 1; i < currentStroke.length; i++) { ctx.lineTo(currentStroke[i].x, currentStroke[i].y); }
        ctx.stroke();
    }

    // 5. 暗転・スポットライト処理（画面座標系で一括描画）
    if (!isAdminMode && isHackModeEnabled) {
        // メモリ上に暗幕用のキャンバスを作成（等倍サイズ）
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');

        if (isBlackout) {
            // 完全暗転時：画面全体（0, 0 から 幅・高さ）を真っ黒に塗る
            tempCtx.fillStyle = 'rgba(0, 0, 0, 0.98)';
            tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        } else if (currentStroke.length > 0) {
            // スポットライト時：画面全体を暗くする
            tempCtx.fillStyle = 'rgba(0, 0, 0, 0.95)';
            tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

            // 指の最新座標を「拡大・移動後の画面上の位置」に変換
            const lastPos = currentStroke[currentStroke.length - 1];
            const screenX = lastPos.x * scale + panX;
            const screenY = lastPos.y * scale + panY;
            const screenRadius = lightRadius * scale; // 拡大率に合わせたスポットライト半径

            tempCtx.globalCompositeOperation = 'destination-out';
            let grad = tempCtx.createRadialGradient(screenX, screenY, 10 * scale, screenX, screenY, screenRadius);
            grad.addColorStop(0, 'rgba(0,0,0,1)');   // スポットライトの中心（穴あけ）
            grad.addColorStop(0.8, 'rgba(0,0,0,0.8)');
            grad.addColorStop(1, 'rgba(0,0,0,0)');

            tempCtx.beginPath();
            tempCtx.arc(screenX, screenY, screenRadius, 0, Math.PI * 2);
            tempCtx.fillStyle = grad;
            tempCtx.fill();
        }

        // くり抜いた暗幕をメインキャンバスの上に重ねる（変換行列を一時リセット）
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0); 
        ctx.drawImage(tempCanvas, 0, 0);
        ctx.restore();
    }
}




function undoLastLine() { 
    if (strokeHistory.length > 0) { 
        strokeHistory.pop()
        hasJudged = false;
        redrawAllHistory(); } }

function getTouchPos(e) {
    const rect = canvas.getBoundingClientRect(); const touch = e.touches[0];
    let clientX = touch.clientX - rect.left; let clientY = touch.clientY - rect.top;
    return { x: clientX * (canvas.width / rect.width), y: clientY * (canvas.height / rect.height) };
}

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (currentMode === 'zoom' || e.touches.length >= 2) {
        isDrawing = false;
        if (e.touches.length >= 2) { startTouchDistance = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); }
        else { lastTouchX = e.touches[0].clientX; lastTouchY = e.touches[0].clientY; }
        return;
    }

    const pos = getTouchPos(e);

    if (isAdminMode && setupStep !== 'none') {
        isDrawing = false;
        if (setupStep === 'start') { mazeStartPoint = { x: pos.x, y: pos.y }; alert("スタート位置を設定しました"); }
        else if (setupStep === 'goal') { mazeGoalPoint = { x: pos.x, y: pos.y }; alert("ゴール位置を設定しました"); }
        setupStep = 'none'; document.getElementById('setup-status').innerText = "設定完了。保存してください。";
        redrawAllHistory(); return;
    }

    if (!isAdminMode && hasJudged) return; 
    isDrawing = true; 
    if (!isAdminMode && !isMazeTimerRunning) {
        startMazeTimer();
    }
    currentStroke = [pos]; 
    ctx.beginPath(); ctx.moveTo(pos.x, pos.y);
    ctx.lineWidth = CONFIG.strokeWidth / scale; 
    ctx.strokeStyle = isAdminMode ? CONFIG.adminStrokeColor : CONFIG.userStrokeColor;
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    if (!isAdminMode) { checkRealtimeGoalTouch(pos.x, pos.y); }
});

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (currentMode === 'zoom' || e.touches.length >= 2) {
        if (e.touches.length >= 2) {
            let currentDistance = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
            if (startTouchDistance > 0) { scale = Math.max(1, Math.min(scale * (currentDistance / startTouchDistance), 4)); startTouchDistance = currentDistance; updateTransform(); }
        } else {
            let deltaX = e.touches[0].clientX - lastTouchX; let deltaY = e.touches[0].clientY - lastTouchY;
            if (isLandscape) { panX += deltaY; panY -= deltaX; } else { panX += deltaX; panY += deltaY; }
            lastTouchX = e.touches[0].clientX; lastTouchY = e.touches[0].clientY; updateTransform();
        } return;
    }
    if (!isDrawing || (!isAdminMode && hasJudged)) return;
    if (!isMazeTimerRunning) {
        startMazeTimer();
    }
    const pos = getTouchPos(e); 
    currentStroke.push(pos); 
    // ⭕️ ゴール判定の前に今描いている線を履歴に保存（ゴールに達したらそのまま描き終わりにさせる）
    if (!isAdminMode) { 
        checkRealtimeGoalTouch(pos.x, pos.y); 
    }
    // 💡 指の最新位置に合わせてスポットライトを移動描画する
    redrawAllHistory();
});


canvas.addEventListener('touchend', () => { 
    if (isDrawing && currentStroke.length > 0) { 
        strokeHistory.push(currentStroke); 
    } 
    isDrawing = false; 
    startTouchDistance = 0; 
});

/* ==========================================
   画像アップロードと保存
   ========================================== */
document.getElementById('img-question')?.addEventListener('change', (e) => { loadImgToBg(e.target.files[0]); });
document.getElementById('img-single')?.addEventListener('change', (e) => { loadImgToBg(e.target.files[0]); });
document.getElementById('img-answer')?.addEventListener('change', (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = function(event) { 
        imgAnswerObj.src = event.target.result; 
        localStorage.setItem(`stage_${currentStageNumber}_answer_image`, event.target.result); 
    };
    reader.readAsDataURL(file);
});

function loadImgToBg(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(event) { 
        mazeBg.src = event.target.result; 
        mazeBg.style.display = 'block'; 
        localStorage.setItem(`stage_${currentStageNumber}_image`, event.target.result); 
    };
    reader.readAsDataURL(file);
}

function saveImageModeData() {
    if(!mazeBg.src || !imgAnswerObj.src) { alert("問題と答えの両方の画像をセットしてください。"); return; }
    if(!mazeStartPoint || !mazeGoalPoint) { alert("スタート位置とゴール位置を画面上で指定してください。"); return; }
    
    const inputEl = document.getElementById('stage-title-input-a');
    const titleInput = inputEl ? inputEl.value.trim() : "";
    const finalTitle = titleInput || `ステージ ${currentStageNumber}`;

    localStorage.setItem(`stage_${currentStageNumber}_title`, finalTitle);
    localStorage.setItem(`stage_${currentStageNumber}_judge_system`, 'color'); 
    judgeSystemType = 'color';
    localStorage.setItem(`stage_${currentStageNumber}_start_pt`, JSON.stringify(mazeStartPoint)); 
    localStorage.setItem(`stage_${currentStageNumber}_goal_pt`, JSON.stringify(mazeGoalPoint));
    
    alert(`ステージ ${currentStageNumber} の登録が完了しました！`); 
    goBackMenu();
}

function getAllPoints() { return strokeHistory.flat(); }

function saveTraceModeData() {
    const allPts = getAllPoints(); if (allPts.length < 5) { alert("ルートがなぞられていません。"); return; }
    savedRoute = allPts.filter((_, idx) => idx % 3 === 0); savedRoute.push(allPts[allPts.length - 1]);
    
    const inputEl = document.getElementById('stage-title-input-b');
    const titleInput = inputEl ? inputEl.value.trim() : "";
    const finalTitle = titleInput || `ステージ ${currentStageNumber}`;

    localStorage.setItem(`stage_${currentStageNumber}_title`, finalTitle);
    localStorage.setItem(`stage_${currentStageNumber}_route`, JSON.stringify(savedRoute)); 
    localStorage.setItem(`stage_${currentStageNumber}_judge_system`, 'trace'); 
    judgeSystemType = 'trace';
    
    alert(`ステージ ${currentStageNumber} のお手本ルート保存が完了しました！`); 
    goBackMenu();
}

/* ==========================================
   判定ロジック本体
   ========================================== */
function checkRealtimeGoalTouch(x, y) {
    if (hasJudged) return;
    if (judgeSystemType === 'color') {
        if (!mazeGoalPoint) return;
        if (Math.hypot(x - mazeGoalPoint.x, y - mazeGoalPoint.y) < CONFIG.goalTolerance) { 
            isDrawing = false; 
            hasJudged = true; 
            checkAnswerColor(); // ⭕️ setTimeout をやめて即時実行！
        }
    } else if (judgeSystemType === 'trace') {
        if (savedRoute.length === 0) return;
        const correctEnd = savedRoute[savedRoute.length - 1];
        if (Math.hypot(x - correctEnd.x, y - correctEnd.y) < CONFIG.goalTolerance) { 
            isDrawing = false; 
            hasJudged = true; 
            checkAnswerTrace(); // ⭕️ setTimeout をやめて即時実行！
        }
    }
}


function checkAnswerColor() {
    hiddenCanvas.width = canvas.width; 
    hiddenCanvas.height = canvas.height;
    hiddenCtx.drawImage(imgAnswerObj, 0, 0, canvas.width, canvas.height);
    
    // 全ての線データを取得
    const allPts = getAllPoints();
    if (allPts.length === 0) {
        hasJudged = false;
        return;
    }
    
    // ① スタート地点のチェック
    if (mazeStartPoint) {
        if (Math.hypot(allPts[0].x - mazeStartPoint.x, allPts[0].y - mazeStartPoint.y) > CONFIG.startTolerance) {
            alert("残念！スタート地点から正しく描き始められていないようです。"); 
            hasJudged = false; 
            return;
        }
    }

    // ② 正解画像（隠しキャンバス）のピクセルデータを取得
    const imgData = hiddenCtx.getImageData(0, 0, hiddenCanvas.width, hiddenCanvas.height).data;
    const waypoints = [];
    const step = 15;

    for (let y = 0; y < hiddenCanvas.height; y += step) {
        for (let x = 0; x < hiddenCanvas.width; x += step) {
            const idx = (y * hiddenCanvas.width + x) * 4;
            const r = imgData[idx];
            const g = imgData[idx + 1];
            const b = imgData[idx + 2];
            const a = imgData[idx + 3];

            if (r > 180 && g > 180 && b < 100 && a > 200) {
                waypoints.push({ x: x, y: y, passed: false });
            }
        }
    }

    if (waypoints.length === 0) {
        alert("正解ルート（黄色）が画像から検出できませんでした。正解画像を確認してください。");
        hasJudged = false;
        return;
    }

    // ③ 通過チェック
    let passedCount = 0;
    const tolerance = 12;

    for (let i = 0; i < waypoints.length; i++) {
        const wp = waypoints[i];
        for (let j = 0; j < allPts.length; j++) {
            const pt = allPts[j];
            if (pt && typeof pt.x === 'number' && typeof pt.y === 'number') {
                if (Math.hypot(pt.x - wp.x, pt.y - wp.y) < tolerance) {
                    passedCount++;
                    break;
                }
            }
        }
    }

    // ④ 通過率の計算と判定
    const passRate = waypoints.length > 0 ? (passedCount / waypoints.length) : 0;

    if (passRate >= 0.90) {
        stopMazeTimer();
        alert("正解！おめでとうございます！"); 
        resetCanvas(); 
        goBackMenu(); 
    } else { 
        alert(`残念！正解ルートを通っていません。（通過率: ${Math.round(passRate * 100)}%）\n「1つ戻る」でやり直せますよ！`); 
        hasJudged = false; 
    }
}


/* ==========================================
   ⏱️ 高精度ミリ秒タイマーの設定
   ========================================== */
let mazeStartTime = 0;      
let mazeTimerInterval = null; 
let isMazeTimerRunning = false; 

function startMazeTimer() {
    if (isMazeTimerRunning) return; 
    isMazeTimerRunning = true;
    mazeStartTime = Date.now(); 
   
    mazeTimerInterval = setInterval(() => {
        const elapsedTime = Date.now() - mazeStartTime; 
        document.getElementById('timer-display').innerText = "TIME: " + formatMazeTime(elapsedTime);
    }, 10);

    // 迷路タイマー開始時にハックループもスタート
    startHackLoop();

}

function stopMazeTimer() {
    if (!isMazeTimerRunning) return;
    isMazeTimerRunning = false;
    clearInterval(mazeTimerInterval); 

    // ゲーム終了やリセット時にハックループを停止
    stopHackLoop();

}

function formatMazeTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = Math.floor((ms % 1000) / 10); 
    
    const mm = String(minutes).padStart(2, '0');
    const ss = String(seconds).padStart(2, '0');
    const msm = String(milliseconds).padStart(2, '0');
    
    return `${mm}:${ss}.${msm}`;
}

function adminSelectStage(stageNumber) {
    loadStageData(stageNumber);
    pageTitle.innerText = adminSubMode === 'imageMode' ? `画像2枚登録 (Stage ${stageNumber})` : `なぞりお手本登録 (Stage ${stageNumber})`;
    resetCanvas();
    alert(`編集対象を ステージ ${stageNumber} に切り替えました。画像をアップロードして登録してください。`);
}

/* ==========================================
   ✨ ステージリストの自動組み立てと新規追加
   ========================================== */
function refreshStageMenu() {
    const stageContainer = document.querySelector('.stage-container');
    if (!stageContainer) return;

    stageContainer.innerHTML = "";

    let maxStage = PRESET_STAGES.length;
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const match = key.match(/^stage_(\d+)_image$/);
        if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxStage) maxStage = num;
        }
    }

    for (let i = 1; i <= maxStage; i++) {
        const preset = PRESET_STAGES.find(s => s.number === i);
        const hasImg = localStorage.getItem(`stage_${i}_image`) || (preset ? preset.image : null);
        
        const customTitle = localStorage.getItem(`stage_${i}_title`) || (preset ? preset.title : null);
        const titleText = hasImg ? (customTitle || `ステージ ${i}`) : `（未登録のステージです）`;

        let imageBoxHtml = `<div class="image-placeholder">STAGE ${i}</div>`;
        if (hasImg) {
            imageBoxHtml = `<div class="image-placeholder" style="background-image: url('${hasImg}'); background-size: contain; background-repeat: no-repeat; background-position: center;"></div>`;
        }

        const card = document.createElement('div');
        card.className = 'stage-card';
        card.setAttribute('onclick', `startGame(${i})`);
        card.innerHTML = `
            <div class="stage-image-box">
                ${imageBoxHtml}
            </div>
            <div class="stage-info">
                <div class="stage-number">Stage ${String(i).padStart(2, '0')}</div>
                <div class="stage-title">${titleText}</div>
            </div>
        `;
        stageContainer.appendChild(card);
    }

    const addCard = document.createElement('div');
    addCard.className = 'stage-card';
    addCard.style.borderStyle = 'dashed';
    addCard.style.background = '#fafafa';
    addCard.setAttribute('onclick', `addNewStageAction(${maxStage + 1})`);
    addCard.innerHTML = `
        <div class="stage-image-box" style="border-style: dashed;">
            <div class="image-placeholder" style="font-size: 20px;">＋</div>
        </div>
        <div class="stage-info">
            <div class="stage-number" style="color: #666;">NEW STAGE</div>
            <div class="stage-title" style="color: #666;">新しいステージを追加する</div>
        </div>
    `;
    stageContainer.appendChild(addCard);
}

function addNewStageAction(nextStageNumber) {
    loadStageData(nextStageNumber);
    openAdmin('imageMode'); 
}

function checkAnswerTrace() {
    stopMazeTimer(); 
    alert("正解！おめでとうございます！"); 
    resetCanvas(); 
    goBackMenu();
}

/* ==========================================
   🚨 リアルプログラムパッチ・攻防ミニゲーム用変数・関数
   ========================================== */
// 👈 1. ゲーム状態保持用変数の初期宣言
let gameState = {
    patchValues: {
        isBlackout: 'true',
        valA: 1,
        valB: 1
    }
};

let patchTimeLeft = 45.0;
let patchTimerInterval = null;
let hasNoiseInCurrentSession = false;
let isScanned = false;
let targetCalcValue = 6;
let currentDialTarget = null;

// 🚨 ハック（障害）発生関数（パッチ適用ミニゲーム起動）
function triggerHackEvent() {
    if (isAdminMode || !isHackModeEnabled || hasJudged || !isMazeTimerRunning) return;

    isHacked = true;
    isBlackout = true; // 迷路画面を完全暗転
    redrawAllHistory();

    // ミニゲーム画面を開く
    openPatchMinigame();
}

// 🔓 パッチ適用ミニゲーム画面の初期化＆表示
function openPatchMinigame() {
    isScanned = false;
    
    // 値を初期化
    gameState.patchValues = { isBlackout: 'true', valA: 1, valB: 1 };

    const overlay = document.getElementById('minigame-overlay');
    if (overlay) {
        overlay.style.setProperty('display', 'flex', 'important');
    }

    // ノイズ（バグ）の発生判定（60%の確率）
    hasNoiseInCurrentSession = Math.random() < 0.6;
    const glitchEl = document.getElementById('glitch-noise');
    if (glitchEl) {
        glitchEl.style.display = hasNoiseInCurrentSession ? 'block' : 'none';
    }

    // 目標となる計算値をランダム決定 (4, 6, 8)
    targetCalcValue = [4, 6, 8][Math.floor(Math.random() * 3)];

    // コードUIの描画
    renderCodeUI();

    // 制限時間タイマー（45.0秒カウントダウン）
    patchTimeLeft = 45.0;
    const timerEl = document.getElementById('timer-display-patch');
    if (timerEl) {
        timerEl.innerText = `残り時間: ${patchTimeLeft.toFixed(1)}秒`;
    }
    
    clearInterval(patchTimerInterval);
    patchTimerInterval = setInterval(() => {
        patchTimeLeft -= 0.1;
        if (timerEl) {
            timerEl.innerText = `残り時間: ${Math.max(0, patchTimeLeft).toFixed(1)}秒`;
        }
        
        if (patchTimeLeft <= 0) {
            clearInterval(patchTimerInterval);
            alert("【TIME OVER】パッチ適用失敗！システムが復旧できませんでした。");
            openPatchMinigame();
        }
    }, 100);
}

// 💻 コード解析画面の描画（ポップアップダイヤル・スキャン機能・ノイズ統合版）
function renderCodeUI() {
    const codeBox = document.getElementById('code-box');
    if (!codeBox) return;

    const isBlackoutVal = gameState.patchValues.isBlackout;
    const valA = gameState.patchValues.valA;
    const valB = gameState.patchValues.valB;

    let commentHeader = isScanned ?
        `<div class="code-line comment">// ⚠️ MALWARE DETECTED (書き換え不可)</div>` :
        `<div class="code-line comment">// --- INTRUSION DETECTED ---</div>`;

    let activeHackScript = isScanned ?
        `<span class="var-name">isBlackout</span> = <span class="val">true</span>; <span class="ruby-text">← 暗転障害発生源</span>` :
        `<span class="var-name">isBlackout</span> = <span class="val">true</span>;`;

    let patchComment = isScanned ?
        `<div class="code-line comment">// 🛠️ 修復用パッチコード (指示通りに書き換えよ)</div>` :
        `<div class="code-line comment">// --- SYSTEM REPAIR MODULE ---</div>`;

    const multiplyOp = isScanned ? '×' : '*';

    const rBlackout = isScanned ? '<span class="ruby-text">← 画面消灯 (falseで解除)</span>' : '';
    const rValA = isScanned ? '<span class="ruby-text">← 回復計算値A</span>' : '';
    const rValB = isScanned ? '<span class="ruby-text">← 回復計算値B</span>' : '';
    const rCalc = isScanned ? `<span class="ruby-text">← (valA + valB) を ${targetCalcValue} にせよ</span>` : '';

    let fakeCodeHtml = '';
    if (hasNoiseInCurrentSession) {
        fakeCodeHtml = `
            <div class="code-line fake-code">
                <input type="checkbox" id="fake-code-active" checked>
                <label for="fake-code-active">systemErrorCrash(); // ⚠️ BUG NOISE DETECTED</label>
            </div>
        `;
    }

    codeBox.innerHTML = `
        ${commentHeader}
        <div class="code-line locked"><span class="keyword">function</span> <span class="var-name">applyMalware</span>() {</div>
        <div class="code-line locked">    ${activeHackScript}</div>
        <div class="code-line locked">}</div>
        
        ${fakeCodeHtml}

        <div class="code-line"></div>
        ${patchComment}
        <div class="code-line"><span class="keyword">function</span> <span class="var-name">applySystemPatch</span>() {</div>
        <div class="code-line">    <span class="var-name">isBlackout</span> = <span id="patch-blackout" class="val-dial-btn" onclick="openPatchDial('blackout')">${isBlackoutVal}</span>; ${rBlackout}</div>
        <div class="code-line">    <span class="keyword">let</span> <span class="var-name">valA</span> = <span id="calc-a" class="val-dial-btn" onclick="openPatchDial('valA')">${valA}</span>; ${rValA}</div>
        <div class="code-line">    <span class="keyword">let</span> <span class="var-name">valB</span> = <span id="calc-b" class="val-dial-btn" onclick="openPatchDial('valB')">${valB}</span>; ${rValB}</div>
        <div class="code-line">    <span class="var-name">systemStatus</span> = (<span class="var-name">valA</span> + <span class="var-name">valB</span>) ${multiplyOp} <span class="val">20</span>; ${rCalc}</div>
        <div class="code-line">}</div>

        <!-- 🔲 モーダル風ポップアップダイヤル -->
        <div id="dial-modal" class="dial-modal-overlay" onclick="closePatchDial(event)">
            <div class="dial-modal-content">
                <div id="dial-modal-title" class="dial-modal-title">SELECT VALUE</div>
                <div id="dial-option-grid" class="dial-option-grid"></div>
            </div>
        </div>
    `;
}

// 🔍 スキャンボタン実行
function runCodeScan() {
    isScanned = true;
    renderCodeUI();
    alert("【SCAN COMPLETE】コードの解析が完了しました。各プログラム要素の解説ルビを表示します。");
}

// ▶ 修正実行ボタン実行
function executeLivePatch() {
    if (hasNoiseInCurrentSession) {
        const fakeCheck = document.getElementById('fake-code-active');
        if (fakeCheck && fakeCheck.checked) {
            alert("【RUNTIME ERROR】Uncaught ReferenceError: systemErrorCrash is not defined\n余計なコードが実行を妨害しています！スキャンしてバグ行を除外（チェック解除）してください。");
            return;
        }
    }

    // 👈 選択中の値を gameState から直接判定
    const selectedBlackout = gameState.patchValues.isBlackout === 'true';
    const valA = parseInt(gameState.patchValues.valA, 10);
    const valB = parseInt(gameState.patchValues.valB, 10);
    const calcSum = valA + valB;

    // パッチ成功条件：isBlackout を false にし、計算値を目標値に合わせる
    if (!selectedBlackout && calcSum === targetCalcValue) {
        alert("【SUCCESS】パッチが正常適用されました！システムが復旧します。");
        resolveHackEvent();
    } else {
        alert("【PATCH FAILED】パッチの検証に失敗しました！\nスキャン（SCAN）を実行して指示通りにコードを設定してください。");
    }
}

// ✅ ハック復旧（暗転解除＆ミニゲーム終了）
function resolveHackEvent() {
    clearInterval(patchTimerInterval);
    isHacked = false;
    isBlackout = false;
    
    const overlay = document.getElementById('minigame-overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }

    redrawAllHistory();
}

// ⏱️ ハック発生タイマーの開始・停止
function startHackLoop() {
    stopHackLoop();
    hackTimer = setInterval(() => {
        if (!isHacked && isMazeTimerRunning) {
            triggerHackEvent();
        }
    }, HACK_INTERVAL);
}

function stopHackLoop() {
    if (hackTimer) {
        clearInterval(hackTimer);
        hackTimer = null;
    }
    resolveHackEvent();
}

// 🔲 ポップアップダイヤルの制御処理
function openPatchDial(type) {
    const modal = document.getElementById('dial-modal');
    const title = document.getElementById('dial-modal-title');
    const grid = document.getElementById('dial-option-grid');
    if (!modal || !grid) return;
    
    grid.innerHTML = '';
    currentDialTarget = type;

    if (type === 'blackout') {
        title.innerText = 'SET: isBlackout';
        ['true', 'false'].forEach(val => {
            const btn = document.createElement('button');
            btn.className = 'dial-option-btn';
            btn.innerText = val;
            btn.onclick = () => applyDialValue(val);
            grid.appendChild(btn);
        });
    } else {
        title.innerText = `SET: ${type}`;
        [1, 2, 3, 4].forEach(num => {
            const btn = document.createElement('button');
            btn.className = 'dial-option-btn';
            btn.innerText = num;
            btn.onclick = () => applyDialValue(num);
            grid.appendChild(btn);
        });
    }

    modal.classList.add('active');
}

function applyDialValue(val) {
    if (currentDialTarget === 'blackout') {
        const el = document.getElementById('patch-blackout');
        if (el) el.innerText = val;
        gameState.patchValues.isBlackout = val;
    } else if (currentDialTarget === 'valA') {
        const el = document.getElementById('calc-a');
        if (el) el.innerText = val;
        gameState.patchValues.valA = val;
    } else if (currentDialTarget === 'valB') {
        const el = document.getElementById('calc-b');
        if (el) el.innerText = val;
        gameState.patchValues.valB = val;
    }
    
    const modal = document.getElementById('dial-modal');
    if (modal) modal.classList.remove('active');
}

function closePatchDial(e) {
    if (e.target.id === 'dial-modal') {
        e.target.classList.remove('active');
    }
}
