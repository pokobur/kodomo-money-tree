// ============================================================
// マネーツリー - 紙吹雪・パーティクル演出 (confetti.ts)
// canvas-confetti ラッパーライブラリ
// ============================================================

import confetti from 'canvas-confetti';

/**
 * 座標（ピクセル座標または0〜1の正規化座標）を canvas-confetti の origin 用に正規化
 */
function toNormalizedOrigin(x: number, y: number): { x: number; y: number } {
  const hasWindow = typeof window !== 'undefined';
  const screenWidth = hasWindow && window.innerWidth > 0 ? window.innerWidth : 1;
  const screenHeight = hasWindow && window.innerHeight > 0 ? window.innerHeight : 1;

  const normX = x > 1 ? Math.min(1, Math.max(0, x / screenWidth)) : Math.min(1, Math.max(0, x));
  const normY = y > 1 ? Math.min(1, Math.max(0, y / screenHeight)) : Math.min(1, Math.max(0, y));

  return { x: normX, y: normY };
}

/**
 * 指定した座標から金色コインの破裂エフェクトを発生
 * @param x 発射位置X（ピクセル座標または 0.0〜1.0）
 * @param y 発射位置Y（ピクセル座標または 0.0〜1.0）
 */
export function fireCoinBurst(x: number, y: number): void {
  const origin = toNormalizedOrigin(x, y);

  confetti({
    particleCount: 30,
    spread: 60,
    startVelocity: 25,
    decay: 0.92,
    gravity: 1.1,
    origin,
    shapes: ['circle'],
    scalar: 1.2,
    colors: ['#FFD700', '#FFA000', '#FFCA28', '#FFE082', '#FFC107'],
    disableForReducedMotion: true,
  });
}

/**
 * 画面全体でのサクセス演出（グリーン＋ゴールドの紙吹雪）
 * クエスト達成や承認時に使用
 */
export function fireSuccess(): void {
  const colors = ['#4CAF50', '#81C784', '#66BB6A', '#FFD700', '#FFA000', '#FFCA28'];

  // 左下からの発射
  confetti({
    particleCount: 45,
    angle: 60,
    spread: 55,
    startVelocity: 35,
    origin: { x: 0.15, y: 0.75 },
    colors,
    disableForReducedMotion: true,
  });

  // 右下からの発射
  confetti({
    particleCount: 45,
    angle: 120,
    spread: 55,
    startVelocity: 35,
    origin: { x: 0.85, y: 0.75 },
    colors,
    disableForReducedMotion: true,
  });

  // 中央の軽い広がり
  confetti({
    particleCount: 25,
    spread: 90,
    startVelocity: 25,
    origin: { x: 0.5, y: 0.6 },
    colors,
    disableForReducedMotion: true,
  });
}

/**
 * 連続した大祝祭演出（複数バーストによる盛大なお祝い）
 * 目標金額の達成、ウィッシュリスト購入時などに使用
 */
export function fireCelebration(): void {
  const duration = 2500;
  const animationEnd = Date.now() + duration;
  const colors = [
    '#4CAF50',
    '#81C784',
    '#FFD700',
    '#FFA000',
    '#FF7043',
    '#AB47BC',
    '#42A5F5',
  ];

  const frame = () => {
    // 画面左下から
    confetti({
      particleCount: 4,
      angle: 60,
      spread: 60,
      startVelocity: 40,
      origin: { x: 0.05, y: 0.8 },
      colors,
      disableForReducedMotion: true,
    });

    // 画面右下から
    confetti({
      particleCount: 4,
      angle: 120,
      spread: 60,
      startVelocity: 40,
      origin: { x: 0.95, y: 0.8 },
      colors,
      disableForReducedMotion: true,
    });

    if (Date.now() < animationEnd) {
      requestAnimationFrame(frame);
    }
  };

  requestAnimationFrame(frame);
}

/**
 * ツリーカラーで真上に向かって打ち上がるレベルアップ演出
 * 木の成長時に使用
 */
export function fireLevelUp(): void {
  const treeColors = [
    '#1B5E20',
    '#2E7D32',
    '#4CAF50',
    '#81C784',
    '#A5D6A7',
    '#FFD700',
    '#FFA000',
  ];

  confetti({
    particleCount: 75,
    angle: 90,
    spread: 70,
    startVelocity: 48,
    decay: 0.9,
    gravity: 0.8,
    origin: { x: 0.5, y: 0.85 },
    colors: treeColors,
    shapes: ['circle', 'square'],
    disableForReducedMotion: true,
  });
}

/**
 * 木の実（金のリンゴ）収穫時の少粒子バースト演出
 * @param x 収穫したリンゴの位置X（ピクセル座標または 0.0〜1.0）
 * @param y 収穫したリンゴの位置Y（ピクセル座標または 0.0〜1.0）
 */
export function fireHarvest(x: number, y: number): void {
  const origin = toNormalizedOrigin(x, y);

  confetti({
    particleCount: 16,
    spread: 50,
    startVelocity: 20,
    decay: 0.93,
    gravity: 0.9,
    origin,
    shapes: ['circle'],
    scalar: 1.3,
    colors: ['#FFD700', '#FFA000', '#FF8F00', '#FF7043', '#E53935'],
    disableForReducedMotion: true,
  });
}
