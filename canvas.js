/* ==========================================================================
   美容室CLan 迷路ゲーム - canvas.js
   【役割】キャンバス描画・画像レスポンシブスケール・タイマー制御
   ========================================================================== */

// --------------------------------------------------------------------------
// 1. キャンバス状態のリセット & リサイズ処理
// --------------------------------------------------------------------------
function resetCanvasState() {
    allStrokes = [];
    currentStroke = [];
    stopMazeTimer();
    hasJudged = false;
    isWallCalculated = false;
    if (timerDisplay) timerDisplay.innerText = '00:00.00';
    clearCanvas();
}

function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// ウィンドウサイズに合わせてキャンバスを自動リサイズ
function resizeCanvas() {
    const container = document.getElementById('canvas-container');
    if (!container) return;

    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    if (imgWidth > 0 && imgHeight > 0) {
        calculateScaleAndOffset();
    }
    redrawAllHistory();
}

// 画像の表示スケールとセンタリングオフセットの計算
function calculateScaleAndOffset() {
    const container = document.getElementById('canvas-container');
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    const scaleX = containerWidth / imgWidth;
    const scaleY = containerHeight / imgHeight;
    scale = Math.min(scaleX, scaleY);

    offsetX = (containerWidth - imgWidth * scale) / 2;
    offsetY = (containerHeight - imgHeight * scale) / 2;
}

// --------------------------------------------------------------------------
// 2. 迷路画像の読み込み・解析呼び出し
// --------------------------------------------------------------------------
function loadMazeImage(imageSrc) {
    currentMazeImageSrc = imageSrc;
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
        imgWidth = img.width;
        imgHeight = img.height;

        // 非表示キャンバス（判定用）に描画
        hiddenCanvas.width = imgWidth;
        hiddenCanvas.height = imgHeight;
        hiddenCtx.drawImage(img, 0, 0);

        // 表示用背景画像の設定
        if (mazeBg) {
            mazeBg.src = imageSrc;
            mazeBg.style.display = 'block';
        }

        if (setupStatus) {
            setupStatus.innerText = 'ステータス: 解析完了（壁・スタート・ゴール設定済）';
        }

        resizeCanvas();
        analyzeImagePoints();
        resetCanvasState();
    };

    img.src = imageSrc;
}

// --------------------------------------------------------------------------
// 3. 軌跡および演出の再描画 (メインループ・更新)
// --------------------------------------------------------------------------
function redrawAllHistory() {
    clearCanvas();

    // 1. 過去の描画ストローク（軌跡）を再描画
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const drawStroke = (stroke) => {
        if (stroke.length < 2) return;
        ctx.strokeStyle = strokeColorInput ? strokeColorInput.value : '#000000';
        ctx.beginPath();
        ctx.moveTo(stroke[0].x, stroke[0].y);
        for (let i = 1; i < stroke.length; i++) {
            ctx.lineTo(stroke[i].x, stroke[i].y);
        }
        ctx.stroke();
    };

    allStrokes.forEach(drawStroke);
    if (currentStroke.length > 0) {
        drawStroke(currentStroke);
    }

    // 2. スタート / ゴール / スポットライトの描画
    const lastPoint = currentStroke.length > 0 ? currentStroke[currentStroke.length - 1] : null;

    if (!isAdminMode && isHackModeEnabled) {
        if (isBlackout) {
            // 完全暗転時：画面全体を真っ黒に塗りつぶす
            ctx.fillStyle = 'rgba(0, 0, 0, 0.98)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else if (lastPoint) {
            // スポットライト時：指の周りだけをくり抜く暗転処理
            ctx.save();
            ctx.fillStyle = 'rgba(0, 0, 0, 0.95)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.globalCompositeOperation = 'destination-out';
            const radius = 100;
            const grad = ctx.createRadialGradient(lastPoint.x, lastPoint.y, 10, lastPoint.x, lastPoint.y, radius);
            grad.addColorStop(0, 'rgba(0,0,0,1)');
            grad.addColorStop(1, 'rgba(0,0,0,0)');

            ctx.beginPath();
            ctx.arc(lastPoint.x, lastPoint.y, radius, 0, Math.PI * 2);
            ctx.fillStyle = grad;
            ctx.fill();
            ctx.restore();
        }
    }
}

// --------------------------------------------------------------------------
// 4. 迷路タイマー制御
// --------------------------------------------------------------------------
function startMazeTimer() {
    if (isMazeTimerRunning) return;
    isMazeTimerRunning = true;
    mazeStartTime = Date.now();

    clearInterval(mazeTimerInterval);
    mazeTimerInterval = setInterval(() => {
        if (!isMazeTimerRunning) return;
        const elapsed = Date.now() - mazeStartTime;
        if (timerDisplay) {
            timerDisplay.innerText = formatMazeTime(elapsed);
        }
    }, 10);
}

function stopMazeTimer() {
    isMazeTimerRunning = false;
    clearInterval(mazeTimerInterval);
}
