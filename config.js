/* ==========================================================================
   美容室CLan 迷路ゲーム - config.js
   【役割】プリセットステージの設定・グローバル状態変数の保持
   ========================================================================== */

// 🏁 プリセットステージの定義（既存のデータ構造）
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

// アプリ内で保持・追加変更されるステージ配列（PRESET_STAGESをベースに互換構造へ変換）
let stages = PRESET_STAGES.map(stage => ({
    id: stage.number,
    title: stage.title,
    imageSrc: stage.image,
    answerImageSrc: stage.answerImage,
    judgeSystem: stage.judgeSystem || "color",
    isCalculated: false
}));

// 現在選択中のステージインデックス
let currentStageIndex = null;

// ゲーム・描画の状態変数
let isAdminMode = false;
let isDrawing = false;
let currentStroke = [];
let allStrokes = [];
let hasJudged = false;

// 判定用変数
let startPoint = null;
let goalPoint = null;
let isWallCalculated = false;
