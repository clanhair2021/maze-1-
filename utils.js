/* ==========================================================================
   美容室CLan 迷路ゲーム - utils.js
   【役割】画像解析・判定計算・座標変換・補助関数の定義
   ========================================================================== */

// --------------------------------------------------------------------------
// 1. 時間表示フォーマット (秒数 -> 00:00.00 / 45.0)
// --------------------------------------------------------------------------
function formatMazeTime(ms) {
    const totalSeconds = ms / 1000;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const hundredths = Math.floor((ms % 1000) / 10);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(hundredths).padStart(2, '0')}`;
}

function formatPatchTime(seconds) {
    return `残り時間: ${Math.max(0, seconds).toFixed(1)}秒`;
}

// --------------------------------------------------------------------------
// 2. 座標計算・変換処理
// --------------------------------------------------------------------------
// 画面座標（Canvas表示上の座標）から非表示キャンバス（画像元データ）の座標へ変換
function getOriginalCoordinates(canvasX, canvasY) {
    const origX = (canvasX - offsetX) / scale;
    const origY = (canvasY - offsetY) / scale;
    return { x: origX, y: origY };
}

// --------------------------------------------------------------------------
// 3. 画像解析・壁判定ロジック（赤・青・壁色判定）
// --------------------------------------------------------------------------
function analyzeImagePoints() {
    if (!hiddenCtx || hiddenCanvas.width === 0 || hiddenCanvas.height === 0) return;

    const imageData = hiddenCtx.getImageData(0, 0, hiddenCanvas.width, hiddenCanvas.height);
    const data = imageData.data;

    let startSumX = 0, startSumY = 0, startCount = 0;
    let goalSumX = 0, goalSumY = 0, goalCount = 0;

    for (let y = 0; y < hiddenCanvas.height; y++) {
        for (let x = 0; x < hiddenCanvas.width; x++) {
            const index = (y * hiddenCanvas.width + x) * 4;
            const r = data[index];
            const g = data[index + 1];
            const b = data[index + 2];
            const a = data[index + 3];

            if (a < 100) continue; // 透明箇所はスキップ

            // 🔴 赤（スタート）の判定
            if (r > 150 && g < 80 && b < 80) {
                startSumX += x;
                startSumY += y;
                startCount++;
            }
            // 🔵 青（ゴール）の判定
            else if (b > 150 && r < 80 && g < 80) {
                goalSumX += x;
                goalSumY += y;
                goalCount++;
            }
        }
    }

    startPoint = startCount > 0 ? { x: startSumX / startCount, y: startSumY / startCount } : null;
    goalPoint = goalCount > 0 ? { x: goalSumX / goalCount, y: goalSumY / goalCount } : null;

    if (currentStageIndex !== null) {
        stages[currentStageIndex].start = startPoint;
        stages[currentStageIndex].goal = goalPoint;
    }

    isWallCalculated = true;
}

// 指定したオリジナル座標が「黒い壁（障害物）」に触れているかチェック
function isWallPixel(origX, origY) {
    if (origX < 0 || origX >= hiddenCanvas.width || origY < 0 || origY >= hiddenCanvas.height) {
        return true; // キャンバス外は壁扱い
    }

    const pixelData = hiddenCtx.getImageData(Math.floor(origX), Math.floor(origY), 1, 1).data;
    const r = pixelData[0];
    const g = pixelData[1];
    const b = pixelData[2];
    const a = pixelData[3];

    if (a < 50) return false; // 透明部分は背景（通行可能）

    // 赤（スタート）または青（ゴール）の色領域は壁判定から除外
    if ((r > 150 && g < 80 && b < 80) || (b > 150 && r < 80 && g < 80)) {
        return false;
    }

    // 明度が低い（黒っぽい）領域を壁とみなす
    const brightness = (r + g + b) / 3;
    return brightness < 100;
}

// --------------------------------------------------------------------------
// 4. ハック発生判定・乱数ユーティリティ
// --------------------------------------------------------------------------
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

