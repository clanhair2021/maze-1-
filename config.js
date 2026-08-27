/* ==========================================================================
   美容室CLan 迷路ゲーム - config.js
   【役割】ゲーム設定値、グローバル変数（状態管理）、ステージデータの定義
   ========================================================================== */

// --------------------------------------------------------------------------
// 1. DOM要素の参照
// --------------------------------------------------------------------------
const gamePage = document.getElementById('game-page');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const hiddenCanvas = document.getElementById('hidden-canvas');
const hiddenCtx = hiddenCanvas.getContext('2d');

const mazeWrapper = document.getElementById('maze-wrapper');
const mazeBg = document.getElementById('maze-bg');

const fileInput = document.getElementById('file-input');
const setupStatus = document.getElementById('setup-status');
const strokeColorInput = document.getElementById('stroke-color');
const clearBtn = document.getElementById('clear-btn');
const timerDisplay = document.getElementById('timer-display');

// --------------------------------------------------------------------------
// 2. 状態管理変数 (グローバルフラグ・データ)
// --------------------------------------------------------------------------
let isAdminMode = false;         // 管理者モードフラグ
let currentStageIndex = null;   // 現在選択中のステージインデックス

let isDrawing = false;
let currentStroke = [];
let allStrokes = [];

let StartPoint = null; 
let GoalPoint = null;

let isWallCalculated = false;
let mazeTimerInterval = null;
let mazeStartTime = 0;
let isMazeTimerRunning = false;
let hasJudged = false;          // すでに判定（クリア/アウト）済みか

// 画像・スケール管理
let currentMazeImageSrc = null;
let imgWidth = 0;
let imgHeight = 0;
let scale = 1;
let offsetX = 0;
let offsetY = 0;

// ハック・ミニゲーム関連状態
let isHackModeEnabled = true;   // ハック機能自体の有効/無効
let isHacked = false;           // ハック発生フラグ
let isBlackout = false;         // 暗転フラグ
let isPatchGameActive = false;  // パッチ適用ミニゲームのアクティブ状態
let patchTimeLeft = 45.0;
let patchTimerInterval = null;
let hasNoiseInSession = false;
let isScanned = false;
let targetCalcValue = 6;
let isHackCooldown = false;
let hackCooldownTimer = null;

// --------------------------------------------------------------------------
// 3. ステージデータ構造
// --------------------------------------------------------------------------
let stages = Array.from({ length: 6 }, (_, i) => ({
    id: i + 1,
    title: `STAGE ${i + 1}`,
    imageSrc: null,
    start: null,
    goal: null
}));

