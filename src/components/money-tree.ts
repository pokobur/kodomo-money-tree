// ============================================================
// 🌳 マネーツリー Canvas描画エンジン
// 貯蓄残高に応じて5段階に成長するインタラクティブな木
// ============================================================

import { getTreeLevel, getTreeProgress, type TreeLevel } from '../types/models';

interface GoldenFruit {
  x: number;
  y: number;
  radius: number;
  angle: number;
  glowPhase: number;
}

interface Creature {
  type: 'bird' | 'squirrel' | 'owl' | 'fairy';
  x: number;
  y: number;
  phase: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: 'star' | 'leaf' | 'sparkle' | 'coin';
}

export interface MoneyTreeOptions {
  savingsBalance: number;
  unclaimedInterest: number;
  wishProgress?: number;  // 0-100
  wishTitle?: string;
  onFruitTap?: () => void;
}

export class MoneyTree {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animationId: number = 0;
  private time: number = 0;
  private options: MoneyTreeOptions;
  private fruits: GoldenFruit[] = [];
  private creatures: Creature[] = [];
  private particles: Particle[] = [];
  private windOffset: number = 0;
  private dpr: number = 1;

  // 水やりアニメーション
  private wateringActive: boolean = false;
  private wateringTime: number = 0;

  // レベルアップ演出
  private levelUpFlash: number = 0;

  constructor(canvas: HTMLCanvasElement, options: MoneyTreeOptions) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.options = options;
    this.dpr = window.devicePixelRatio || 1;
    this.resize();
    this.setupFruits();
    this.setupCreatures();
    this.setupTapHandler();
  }

  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    this.canvas.width = Math.floor(rect.width * this.dpr);
    this.canvas.height = Math.floor(rect.height * this.dpr);
    this.ctx.scale(this.dpr, this.dpr);
    this.setupFruits();
    this.setupCreatures();
  }

  /** オプション更新 */
  updateOptions(options: Partial<MoneyTreeOptions>): void {
    const oldLevel = getTreeLevel(this.options.savingsBalance).level;
    this.options = { ...this.options, ...options };
    const newLevel = getTreeLevel(this.options.savingsBalance).level;
    
    if (newLevel > oldLevel) {
      this.triggerLevelUp();
    }
    this.setupFruits();
    this.setupCreatures();
  }

  /** 金の果実の配置 */
  private setupFruits(): void {
    this.fruits = [];
    if (this.options.unclaimedInterest <= 0) return;
    
    const w = this.canvas.width / this.dpr;
    const h = this.canvas.height / this.dpr;
    const cx = w / 2;
    const treeTop = h * 0.15;
    const count = Math.min(Math.ceil(this.options.unclaimedInterest / 10), 8);

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count - Math.PI / 2;
      const radius = w * 0.15 + Math.random() * w * 0.05;
      this.fruits.push({
        x: cx + Math.cos(angle) * radius,
        y: treeTop + h * 0.2 + Math.sin(angle) * radius * 0.5,
        radius: 12 + Math.random() * 4,
        angle: Math.random() * Math.PI * 2,
        glowPhase: Math.random() * Math.PI * 2,
      });
    }
  }

  /** 動物クリーチャーの配置 */
  private setupCreatures(): void {
    this.creatures = [];
    const level = getTreeLevel(this.options.savingsBalance);
    const w = this.canvas.width / this.dpr;
    const h = this.canvas.height / this.dpr;

    if (level.level >= 3) {
      // 鳥の巣 → 鳥
      this.creatures.push({ type: 'bird', x: w * 0.65, y: h * 0.3, phase: 0 });
    }
    if (level.level >= 4) {
      // リス
      this.creatures.push({ type: 'squirrel', x: w * 0.3, y: h * 0.55, phase: Math.PI });
      // フクロウ
      this.creatures.push({ type: 'owl', x: w * 0.7, y: h * 0.25, phase: Math.PI * 0.5 });
    }
    if (level.level >= 5) {
      // 妖精
      for (let i = 0; i < 3; i++) {
        this.creatures.push({
          type: 'fairy',
          x: w * (0.3 + Math.random() * 0.4),
          y: h * (0.1 + Math.random() * 0.3),
          phase: Math.random() * Math.PI * 2,
        });
      }
    }
  }

  /** タップハンドラー設定 */
  private setupTapHandler(): void {
    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // 金の果実のタップ判定
      for (const fruit of this.fruits) {
        const dist = Math.sqrt((x - fruit.x) ** 2 + (y - fruit.y) ** 2);
        if (dist < fruit.radius + 10) {
          this.harvestFruit(fruit);
          return;
        }
      }
    });
  }

  /** 果実収穫アニメーション */
  private harvestFruit(fruit: GoldenFruit): void {
    // コインパーティクルを発生
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12;
      this.particles.push({
        x: fruit.x,
        y: fruit.y,
        vx: Math.cos(angle) * (2 + Math.random() * 3),
        vy: Math.sin(angle) * (2 + Math.random() * 3) - 2,
        life: 60,
        maxLife: 60,
        size: 6 + Math.random() * 4,
        color: '#FFD700',
        type: 'coin',
      });
    }

    // 星エフェクト
    for (let i = 0; i < 8; i++) {
      this.particles.push({
        x: fruit.x + (Math.random() - 0.5) * 30,
        y: fruit.y + (Math.random() - 0.5) * 30,
        vx: (Math.random() - 0.5) * 2,
        vy: -Math.random() * 3,
        life: 40,
        maxLife: 40,
        size: 3 + Math.random() * 3,
        color: '#FFF176',
        type: 'sparkle',
      });
    }

    // コールバック
    this.options.onFruitTap?.();
  }

  /** 水やり演出開始 */
  triggerWatering(): void {
    this.wateringActive = true;
    this.wateringTime = 0;
  }

  /** レベルアップ演出 */
  private triggerLevelUp(): void {
    this.levelUpFlash = 60;
    // 大量のパーティクル
    const w = this.canvas.width / this.dpr;
    const h = this.canvas.height / this.dpr;
    for (let i = 0; i < 30; i++) {
      this.particles.push({
        x: w / 2 + (Math.random() - 0.5) * w * 0.6,
        y: h * 0.4 + (Math.random() - 0.5) * h * 0.3,
        vx: (Math.random() - 0.5) * 4,
        vy: -Math.random() * 5 - 1,
        life: 80 + Math.random() * 40,
        maxLife: 120,
        size: 4 + Math.random() * 6,
        color: ['#FFD700', '#81C784', '#FFF176', '#4CAF50'][Math.floor(Math.random() * 4)],
        type: Math.random() > 0.5 ? 'star' : 'sparkle',
      });
    }
  }

  /** アニメーションループ開始 */
  start(): void {
    const animate = () => {
      this.time++;
      this.windOffset = Math.sin(this.time * 0.02) * 3;
      this.update();
      this.draw();
      this.animationId = requestAnimationFrame(animate);
    };
    animate();
  }

  /** アニメーション停止 */
  stop(): void {
    cancelAnimationFrame(this.animationId);
  }

  /** 更新ロジック */
  private update(): void {
    // パーティクル更新
    this.particles = this.particles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05; // 重力
      p.life--;
      return p.life > 0;
    });

    // 水やりアニメーション
    if (this.wateringActive) {
      this.wateringTime++;
      if (this.wateringTime > 120) {
        this.wateringActive = false;
        // 水やり完了 → 星エフェクト
        const w = this.canvas.width / this.dpr;
        const h = this.canvas.height / this.dpr;
        for (let i = 0; i < 15; i++) {
          this.particles.push({
            x: w / 2 + (Math.random() - 0.5) * w * 0.4,
            y: h * 0.3 + Math.random() * h * 0.2,
            vx: (Math.random() - 0.5) * 3,
            vy: -Math.random() * 4 - 1,
            life: 50 + Math.random() * 30,
            maxLife: 80,
            size: 3 + Math.random() * 4,
            color: '#FFF176',
            type: 'star',
          });
        }
      }
    }

    // レベルアップフラッシュ減衰
    if (this.levelUpFlash > 0) this.levelUpFlash--;

    // クリーチャーアニメーション
    this.creatures.forEach(c => {
      c.phase += 0.03;
    });
  }

  /** 描画メイン */
  private draw(): void {
    const w = this.canvas.width / this.dpr;
    const h = this.canvas.height / this.dpr;
    const ctx = this.ctx;
    const level = getTreeLevel(this.options.savingsBalance);
    const progress = getTreeProgress(this.options.savingsBalance);

    ctx.clearRect(0, 0, w, h);

    // 背景（空のグラデーション）
    this.drawSky(w, h);

    // 地面
    this.drawGround(w, h);

    // マネーツリー描画
    this.drawTree(w, h, level, progress);

    // 動物たち
    this.drawCreatures();

    // 金の果実
    this.drawFruits();

    // ウィッシュリスト宝箱
    if (this.options.wishProgress !== undefined) {
      this.drawTreasureChest(w, h);
    }

    // 水やりアニメーション
    if (this.wateringActive) {
      this.drawWatering(w, h);
    }

    // パーティクル
    this.drawParticles();

    // レベルアップフラッシュ
    if (this.levelUpFlash > 0) {
      ctx.fillStyle = `rgba(255, 215, 0, ${this.levelUpFlash / 60 * 0.3})`;
      ctx.fillRect(0, 0, w, h);
    }

    // Lv.5 黄金オーラ
    if (level.level >= 5) {
      this.drawGoldenAura(w, h);
    }
  }

  /** 空の描画 */
  private drawSky(w: number, h: number): void {
    const ctx = this.ctx;
    const gradient = ctx.createLinearGradient(0, 0, 0, h * 0.7);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(0.5, '#B0E0F0');
    gradient.addColorStop(1, '#E0F2F1');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // 雲
    this.drawCloud(w * 0.15, h * 0.08, 25);
    this.drawCloud(w * 0.75 + Math.sin(this.time * 0.005) * 5, h * 0.12, 20);
    this.drawCloud(w * 0.5 + Math.sin(this.time * 0.008) * 3, h * 0.05, 15);
  }

  /** 雲 */
  private drawCloud(x: number, y: number, size: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.arc(x + size * 0.8, y - size * 0.2, size * 0.7, 0, Math.PI * 2);
    ctx.arc(x + size * 1.4, y, size * 0.6, 0, Math.PI * 2);
    ctx.arc(x - size * 0.5, y + size * 0.1, size * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  /** 地面 */
  private drawGround(w: number, h: number): void {
    const ctx = this.ctx;
    const groundY = h * 0.75;
    
    // 草地グラデーション
    const gradient = ctx.createLinearGradient(0, groundY, 0, h);
    gradient.addColorStop(0, '#81C784');
    gradient.addColorStop(0.3, '#66BB6A');
    gradient.addColorStop(1, '#4CAF50');
    ctx.fillStyle = gradient;
    
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    // 丘の形
    for (let x = 0; x <= w; x += 5) {
      const y = groundY + Math.sin(x * 0.01 + 1) * 8 + Math.sin(x * 0.02) * 4;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();

    // 小さな花
    for (let i = 0; i < 8; i++) {
      const fx = w * (0.1 + i * 0.1 + Math.sin(i * 3) * 0.03);
      const fy = groundY + 5 + Math.sin(fx * 0.02) * 5;
      this.drawFlower(fx, fy, ['#FF80AB', '#FFAB91', '#FFF176', '#CE93D8'][i % 4]);
    }
  }

  /** 小さな花 */
  private drawFlower(x: number, y: number, color: string): void {
    const ctx = this.ctx;
    const sway = Math.sin(this.time * 0.03 + x) * 2;
    
    // 茎
    ctx.strokeStyle = '#66BB6A';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y + 8);
    ctx.quadraticCurveTo(x + sway, y + 4, x + sway, y);
    ctx.stroke();

    // 花びら
    ctx.fillStyle = color;
    for (let i = 0; i < 5; i++) {
      const a = (Math.PI * 2 * i) / 5 + this.time * 0.01;
      ctx.beginPath();
      ctx.arc(x + sway + Math.cos(a) * 3, y + Math.sin(a) * 3, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    // 中心
    ctx.fillStyle = '#FDD835';
    ctx.beginPath();
    ctx.arc(x + sway, y, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  /** ツリー描画 */
  private drawTree(w: number, h: number, level: TreeLevel, progress: number): void {
    const ctx = this.ctx;
    const cx = w / 2;
    const groundY = h * 0.75;
    const sway = this.windOffset;

    if (level.level === 1) {
      // Lv.1 たね・ふたば
      this.drawSeed(cx, groundY, progress, sway);
    } else if (level.level === 2) {
      // Lv.2 わかぎ
      this.drawSapling(cx, groundY, progress, sway);
    } else if (level.level === 3) {
      // Lv.3 りっぱな木
      this.drawFullTree(cx, groundY, progress, sway, false);
    } else if (level.level === 4) {
      // Lv.4 だいじゅ
      this.drawFullTree(cx, groundY, progress, sway, true);
    } else {
      // Lv.5 せかいじゅ
      this.drawWorldTree(cx, groundY, sway);
    }
  }

  /** Lv.1 種・双葉 */
  private drawSeed(cx: number, groundY: number, progress: number, sway: number): void {
    const ctx = this.ctx;

    // 鉢植え
    ctx.fillStyle = '#A1887F';
    ctx.beginPath();
    ctx.moveTo(cx - 20, groundY - 5);
    ctx.lineTo(cx + 20, groundY - 5);
    ctx.lineTo(cx + 15, groundY + 15);
    ctx.lineTo(cx - 15, groundY + 15);
    ctx.closePath();
    ctx.fill();

    // 土
    ctx.fillStyle = '#795548';
    ctx.beginPath();
    ctx.ellipse(cx, groundY - 5, 18, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    if (progress > 0.3) {
      // 芽
      const stemHeight = 10 + progress * 25;
      ctx.strokeStyle = '#66BB6A';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx, groundY - 5);
      ctx.quadraticCurveTo(cx + sway * 0.3, groundY - 5 - stemHeight / 2, cx + sway * 0.5, groundY - 5 - stemHeight);
      ctx.stroke();

      // 双葉
      if (progress > 0.5) {
        const topX = cx + sway * 0.5;
        const topY = groundY - 5 - stemHeight;
        
        ctx.fillStyle = '#81C784';
        // 左の葉
        ctx.beginPath();
        ctx.ellipse(topX - 8, topY - 3, 10, 5, -0.5 + Math.sin(this.time * 0.05) * 0.1, 0, Math.PI * 2);
        ctx.fill();
        // 右の葉
        ctx.beginPath();
        ctx.ellipse(topX + 8, topY - 3, 10, 5, 0.5 + Math.sin(this.time * 0.05 + 1) * 0.1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  /** Lv.2 わかぎ */
  private drawSapling(cx: number, groundY: number, progress: number, sway: number): void {
    const ctx = this.ctx;
    const trunkH = 60 + progress * 40;

    // 幹
    ctx.fillStyle = '#8D6E63';
    ctx.beginPath();
    ctx.moveTo(cx - 6, groundY);
    ctx.quadraticCurveTo(cx - 5 + sway * 0.3, groundY - trunkH / 2, cx - 4 + sway * 0.5, groundY - trunkH);
    ctx.lineTo(cx + 4 + sway * 0.5, groundY - trunkH);
    ctx.quadraticCurveTo(cx + 5 + sway * 0.3, groundY - trunkH / 2, cx + 6, groundY);
    ctx.closePath();
    ctx.fill();

    // 葉っぱの集まり
    const leafY = groundY - trunkH;
    const leafRadius = 25 + progress * 20;
    
    // 影
    ctx.fillStyle = '#4CAF50';
    ctx.beginPath();
    ctx.arc(cx + sway * 0.5, leafY + 5, leafRadius, 0, Math.PI * 2);
    ctx.fill();

    // メインの葉
    const leafGrad = ctx.createRadialGradient(
      cx + sway * 0.5, leafY - 5, leafRadius * 0.2,
      cx + sway * 0.5, leafY, leafRadius
    );
    leafGrad.addColorStop(0, '#A5D6A7');
    leafGrad.addColorStop(0.6, '#66BB6A');
    leafGrad.addColorStop(1, '#43A047');
    ctx.fillStyle = leafGrad;
    ctx.beginPath();
    ctx.arc(cx + sway * 0.5, leafY, leafRadius, 0, Math.PI * 2);
    ctx.fill();

    // 個別の葉っぱ
    for (let i = 0; i < 5; i++) {
      const a = (Math.PI * 2 * i) / 5 + this.time * 0.01;
      const lx = cx + sway * 0.5 + Math.cos(a) * leafRadius * 0.8;
      const ly = leafY + Math.sin(a) * leafRadius * 0.7;
      ctx.fillStyle = i % 2 ? '#81C784' : '#A5D6A7';
      ctx.beginPath();
      ctx.ellipse(lx, ly, 12, 7, a, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /** Lv.3-4 立派な木 / 大樹 */
  private drawFullTree(cx: number, groundY: number, progress: number, sway: number, isGreat: boolean): void {
    const ctx = this.ctx;
    const scale = isGreat ? 1.3 : 1.0;
    const trunkH = (100 + progress * 30) * scale;
    const trunkW = (12 + progress * 4) * scale;

    // 根っこ
    if (isGreat) {
      ctx.fillStyle = '#795548';
      for (let i = 0; i < 3; i++) {
        const angle = -Math.PI * 0.3 + (Math.PI * 0.6 * i) / 2;
        ctx.beginPath();
        ctx.moveTo(cx, groundY);
        ctx.quadraticCurveTo(
          cx + Math.cos(angle) * 30 * scale,
          groundY + 5,
          cx + Math.cos(angle) * 45 * scale,
          groundY + 10
        );
        ctx.lineTo(cx + Math.cos(angle) * 40 * scale, groundY + 15);
        ctx.quadraticCurveTo(cx + Math.cos(angle) * 20 * scale, groundY + 10, cx, groundY + 5);
        ctx.closePath();
        ctx.fill();
      }
    }

    // 幹
    const trunkGrad = ctx.createLinearGradient(cx - trunkW, 0, cx + trunkW, 0);
    trunkGrad.addColorStop(0, '#6D4C41');
    trunkGrad.addColorStop(0.3, '#8D6E63');
    trunkGrad.addColorStop(0.7, '#8D6E63');
    trunkGrad.addColorStop(1, '#5D4037');
    ctx.fillStyle = trunkGrad;

    ctx.beginPath();
    ctx.moveTo(cx - trunkW, groundY);
    ctx.quadraticCurveTo(cx - trunkW + sway * 0.2, groundY - trunkH * 0.5, cx - trunkW * 0.5 + sway * 0.4, groundY - trunkH);
    ctx.lineTo(cx + trunkW * 0.5 + sway * 0.4, groundY - trunkH);
    ctx.quadraticCurveTo(cx + trunkW + sway * 0.2, groundY - trunkH * 0.5, cx + trunkW, groundY);
    ctx.closePath();
    ctx.fill();

    // 枝
    const branchCount = isGreat ? 4 : 3;
    for (let i = 0; i < branchCount; i++) {
      const by = groundY - trunkH * (0.4 + i * 0.15);
      const dir = i % 2 === 0 ? 1 : -1;
      const bLen = (30 + i * 10) * scale;
      
      ctx.strokeStyle = '#795548';
      ctx.lineWidth = 4 * scale;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx + sway * 0.3, by);
      ctx.quadraticCurveTo(
        cx + dir * bLen * 0.5 + sway * 0.4,
        by - 10,
        cx + dir * bLen + sway * 0.5,
        by - 15 + Math.sin(this.time * 0.03 + i) * 3
      );
      ctx.stroke();
    }

    // 葉の集まり（複数の円で構成）
    const topY = groundY - trunkH;
    const crownRadius = (45 + progress * 15) * scale;
    const crownPositions = [
      { x: cx + sway * 0.5, y: topY, r: crownRadius },
      { x: cx - crownRadius * 0.5 + sway * 0.4, y: topY + crownRadius * 0.3, r: crownRadius * 0.7 },
      { x: cx + crownRadius * 0.5 + sway * 0.6, y: topY + crownRadius * 0.2, r: crownRadius * 0.75 },
      { x: cx + sway * 0.5, y: topY - crownRadius * 0.3, r: crownRadius * 0.6 },
    ];

    // 影
    crownPositions.forEach(pos => {
      ctx.fillStyle = '#388E3C';
      ctx.beginPath();
      ctx.arc(pos.x, pos.y + 3, pos.r, 0, Math.PI * 2);
      ctx.fill();
    });

    // 葉本体
    crownPositions.forEach((pos, idx) => {
      const grad = ctx.createRadialGradient(pos.x, pos.y - pos.r * 0.3, pos.r * 0.1, pos.x, pos.y, pos.r);
      grad.addColorStop(0, '#A5D6A7');
      grad.addColorStop(0.5, '#66BB6A');
      grad.addColorStop(1, '#43A047');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, pos.r, 0, Math.PI * 2);
      ctx.fill();

      // 葉のディテール
      for (let i = 0; i < 4; i++) {
        const a = (Math.PI * 2 * i) / 4 + idx + this.time * 0.008;
        const lx = pos.x + Math.cos(a) * pos.r * 0.6;
        const ly = pos.y + Math.sin(a) * pos.r * 0.5;
        ctx.fillStyle = '#81C784';
        ctx.beginPath();
        ctx.ellipse(lx, ly, 8 * scale, 5 * scale, a, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // 花（Lv.3+）
    if (true) {
      for (let i = 0; i < 5; i++) {
        const a = (Math.PI * 2 * i) / 5 + this.time * 0.005;
        const fx = cx + sway * 0.5 + Math.cos(a) * crownRadius * 0.7;
        const fy = topY + Math.sin(a) * crownRadius * 0.5;
        ctx.fillStyle = '#FF80AB';
        ctx.beginPath();
        ctx.arc(fx, fy, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFF176';
        ctx.beginPath();
        ctx.arc(fx, fy, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 鳥の巣（Lv.3+）
    if (true) {
      const nestX = cx + 30 * scale + sway * 0.4;
      const nestY = groundY - trunkH * 0.6;
      ctx.fillStyle = '#8D6E63';
      ctx.beginPath();
      ctx.ellipse(nestX, nestY, 15 * scale, 8 * scale, 0, 0, Math.PI);
      ctx.fill();
      ctx.fillStyle = '#A1887F';
      ctx.beginPath();
      ctx.ellipse(nestX, nestY, 15 * scale, 5 * scale, 0, Math.PI, Math.PI * 2);
      ctx.fill();
      // 卵
      ctx.fillStyle = '#FFF9C4';
      ctx.beginPath();
      ctx.ellipse(nestX - 4, nestY - 3, 4, 5, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(nestX + 4, nestY - 2, 4, 5, 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /** Lv.5 せかいじゅ */
  private drawWorldTree(cx: number, groundY: number, sway: number): void {
    // まず大樹を描画
    this.drawFullTree(cx, groundY, 1.0, sway, true);
    
    // 追加の光エフェクト
    const ctx = this.ctx;
    const topY = groundY - 130 * 1.3;
    
    // 光の粒子（自動生成）
    if (this.time % 10 === 0) {
      this.particles.push({
        x: cx + (Math.random() - 0.5) * 120,
        y: topY + (Math.random() - 0.5) * 80,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -Math.random() * 1.5 - 0.5,
        life: 60 + Math.random() * 40,
        maxLife: 100,
        size: 2 + Math.random() * 3,
        color: Math.random() > 0.5 ? '#FFD700' : '#FFF176',
        type: 'sparkle',
      });
    }
  }

  /** 黄金のオーラ */
  private drawGoldenAura(w: number, h: number): void {
    const ctx = this.ctx;
    const cx = w / 2;
    const cy = h * 0.35;
    const radius = w * 0.35;
    
    const auraGrad = ctx.createRadialGradient(cx, cy, radius * 0.3, cx, cy, radius);
    const alpha = 0.08 + Math.sin(this.time * 0.02) * 0.04;
    auraGrad.addColorStop(0, `rgba(255, 215, 0, ${alpha})`);
    auraGrad.addColorStop(0.5, `rgba(255, 215, 0, ${alpha * 0.5})`);
    auraGrad.addColorStop(1, 'rgba(255, 215, 0, 0)');
    ctx.fillStyle = auraGrad;
    ctx.fillRect(0, 0, w, h);
  }

  /** 動物描画 */
  private drawCreatures(): void {
    const ctx = this.ctx;
    this.creatures.forEach(c => {
      const bob = Math.sin(c.phase) * 3;
      
      switch (c.type) {
        case 'bird':
          // 🐦 小鳥
          ctx.fillStyle = '#42A5F5';
          ctx.beginPath();
          ctx.ellipse(c.x, c.y + bob, 8, 6, 0, 0, Math.PI * 2);
          ctx.fill();
          // 翼
          ctx.fillStyle = '#1E88E5';
          const wingAngle = Math.sin(c.phase * 3) * 0.3;
          ctx.beginPath();
          ctx.ellipse(c.x - 5, c.y + bob - 2, 8, 3, -0.5 + wingAngle, 0, Math.PI * 2);
          ctx.fill();
          // 目
          ctx.fillStyle = '#FFF';
          ctx.beginPath();
          ctx.arc(c.x + 4, c.y + bob - 2, 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#333';
          ctx.beginPath();
          ctx.arc(c.x + 4.5, c.y + bob - 2, 1, 0, Math.PI * 2);
          ctx.fill();
          // くちばし
          ctx.fillStyle = '#FFA000';
          ctx.beginPath();
          ctx.moveTo(c.x + 8, c.y + bob - 1);
          ctx.lineTo(c.x + 12, c.y + bob);
          ctx.lineTo(c.x + 8, c.y + bob + 1);
          ctx.closePath();
          ctx.fill();
          break;

        case 'squirrel':
          // 🐿️ リス
          ctx.fillStyle = '#A1887F';
          // 体
          ctx.beginPath();
          ctx.ellipse(c.x, c.y + bob, 7, 9, 0, 0, Math.PI * 2);
          ctx.fill();
          // 頭
          ctx.beginPath();
          ctx.arc(c.x, c.y + bob - 10, 6, 0, Math.PI * 2);
          ctx.fill();
          // 耳
          ctx.beginPath();
          ctx.arc(c.x - 4, c.y + bob - 15, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(c.x + 4, c.y + bob - 15, 3, 0, Math.PI * 2);
          ctx.fill();
          // しっぽ
          ctx.fillStyle = '#8D6E63';
          ctx.beginPath();
          ctx.ellipse(c.x + 8, c.y + bob + 5, 5, 12, 0.5 + Math.sin(c.phase) * 0.2, 0, Math.PI * 2);
          ctx.fill();
          // 目
          ctx.fillStyle = '#333';
          ctx.beginPath();
          ctx.arc(c.x - 2, c.y + bob - 11, 1.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(c.x + 2, c.y + bob - 11, 1.5, 0, Math.PI * 2);
          ctx.fill();
          break;

        case 'owl':
          // 🦉 フクロウ
          ctx.fillStyle = '#795548';
          // 体
          ctx.beginPath();
          ctx.ellipse(c.x, c.y + bob, 10, 14, 0, 0, Math.PI * 2);
          ctx.fill();
          // 顔の白い部分
          ctx.fillStyle = '#D7CCC8';
          ctx.beginPath();
          ctx.ellipse(c.x, c.y + bob - 4, 8, 7, 0, 0, Math.PI * 2);
          ctx.fill();
          // 目
          const blink = Math.sin(c.phase * 0.5) > 0.95;
          ctx.fillStyle = '#FDD835';
          ctx.beginPath();
          ctx.arc(c.x - 3, c.y + bob - 5, blink ? 0.5 : 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(c.x + 3, c.y + bob - 5, blink ? 0.5 : 3, 0, Math.PI * 2);
          ctx.fill();
          // 瞳
          if (!blink) {
            ctx.fillStyle = '#333';
            ctx.beginPath();
            ctx.arc(c.x - 3, c.y + bob - 5, 1.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(c.x + 3, c.y + bob - 5, 1.5, 0, Math.PI * 2);
            ctx.fill();
          }
          // くちばし
          ctx.fillStyle = '#FF8F00';
          ctx.beginPath();
          ctx.moveTo(c.x, c.y + bob - 2);
          ctx.lineTo(c.x - 2, c.y + bob + 1);
          ctx.lineTo(c.x + 2, c.y + bob + 1);
          ctx.closePath();
          ctx.fill();
          break;

        case 'fairy':
          // ✨ 妖精
          const fx = c.x + Math.sin(c.phase) * 15;
          const fy = c.y + Math.cos(c.phase * 1.3) * 10 + bob;
          // 光の玉
          const fairyGrad = ctx.createRadialGradient(fx, fy, 0, fx, fy, 12);
          fairyGrad.addColorStop(0, 'rgba(255, 215, 0, 0.8)');
          fairyGrad.addColorStop(0.5, 'rgba(255, 215, 0, 0.3)');
          fairyGrad.addColorStop(1, 'rgba(255, 215, 0, 0)');
          ctx.fillStyle = fairyGrad;
          ctx.beginPath();
          ctx.arc(fx, fy, 12, 0, Math.PI * 2);
          ctx.fill();
          // 中心の光
          ctx.fillStyle = '#FFF';
          ctx.beginPath();
          ctx.arc(fx, fy, 3, 0, Math.PI * 2);
          ctx.fill();
          // 羽
          ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.beginPath();
          ctx.ellipse(fx - 6, fy - 2, 5, 3, -0.3, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(fx + 6, fy - 2, 5, 3, 0.3, 0, Math.PI * 2);
          ctx.fill();
          break;
      }
    });
  }

  /** 金の果実描画 */
  private drawFruits(): void {
    const ctx = this.ctx;
    this.fruits.forEach(fruit => {
      const glow = 0.5 + Math.sin(this.time * 0.05 + fruit.glowPhase) * 0.3;
      
      // グロー
      const glowGrad = ctx.createRadialGradient(fruit.x, fruit.y, fruit.radius * 0.5, fruit.x, fruit.y, fruit.radius * 2.5);
      glowGrad.addColorStop(0, `rgba(255, 215, 0, ${glow * 0.4})`);
      glowGrad.addColorStop(1, 'rgba(255, 215, 0, 0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(fruit.x, fruit.y, fruit.radius * 2.5, 0, Math.PI * 2);
      ctx.fill();

      // リンゴ形状
      const grad = ctx.createRadialGradient(
        fruit.x - fruit.radius * 0.3, fruit.y - fruit.radius * 0.3, fruit.radius * 0.1,
        fruit.x, fruit.y, fruit.radius
      );
      grad.addColorStop(0, '#FFE082');
      grad.addColorStop(0.5, '#FFD700');
      grad.addColorStop(1, '#FFA000');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(fruit.x, fruit.y, fruit.radius, 0, Math.PI * 2);
      ctx.fill();

      // ハイライト
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.beginPath();
      ctx.arc(fruit.x - fruit.radius * 0.25, fruit.y - fruit.radius * 0.25, fruit.radius * 0.35, 0, Math.PI * 2);
      ctx.fill();

      // 茎
      ctx.strokeStyle = '#795548';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(fruit.x, fruit.y - fruit.radius);
      ctx.lineTo(fruit.x + 2, fruit.y - fruit.radius - 5);
      ctx.stroke();

      // 🪙マーク
      ctx.fillStyle = '#FFA000';
      ctx.font = `bold ${fruit.radius * 0.8}px 'M PLUS Rounded 1c'`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('¥', fruit.x, fruit.y + 1);
    });
  }

  /** 宝箱描画 */
  private drawTreasureChest(w: number, h: number): void {
    const ctx = this.ctx;
    const cx = w / 2 + this.windOffset * 0.3;
    const cy = h * 0.08;
    const progress = this.options.wishProgress || 0;

    // 宝箱本体
    ctx.fillStyle = '#8D6E63';
    ctx.beginPath();
    ctx.roundRect(cx - 18, cy - 5, 36, 20, 3);
    ctx.fill();
    
    // 宝箱のフタ
    ctx.fillStyle = '#A1887F';
    ctx.beginPath();
    ctx.roundRect(cx - 20, cy - 15, 40, 12, [5, 5, 0, 0]);
    ctx.fill();

    // 金具
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.roundRect(cx - 5, cy - 8, 10, 8, 2);
    ctx.fill();

    // 進捗テキスト
    ctx.fillStyle = '#FFF';
    ctx.font = "bold 8px 'M PLUS Rounded 1c'";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${Math.floor(progress)}%`, cx, cy + 5);

    // 宝箱が100%で光る
    if (progress >= 100) {
      const glow = 0.3 + Math.sin(this.time * 0.08) * 0.2;
      const glowGrad = ctx.createRadialGradient(cx, cy, 5, cx, cy, 35);
      glowGrad.addColorStop(0, `rgba(255, 215, 0, ${glow})`);
      glowGrad.addColorStop(1, 'rgba(255, 215, 0, 0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, 35, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /** 水やりアニメーション */
  private drawWatering(w: number, h: number): void {
    const ctx = this.ctx;
    const progress = this.wateringTime / 120;

    if (progress < 0.3) {
      // じょうろ登場
      const jx = w * 0.7 - progress * w * 0.3;
      const jy = h * 0.3;
      
      // じょうろ本体
      ctx.fillStyle = '#42A5F5';
      ctx.beginPath();
      ctx.roundRect(jx - 15, jy, 30, 20, 5);
      ctx.fill();
      // 注ぎ口
      ctx.strokeStyle = '#42A5F5';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(jx + 15, jy + 5);
      ctx.lineTo(jx + 30, jy - 5);
      ctx.stroke();
      // 取っ手
      ctx.strokeStyle = '#1E88E5';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(jx, jy - 5, 10, Math.PI, 0);
      ctx.stroke();
    } else if (progress < 0.8) {
      // 水が出る
      const jx = w * 0.5;
      const jy = h * 0.28;
      
      // じょうろ
      ctx.fillStyle = '#42A5F5';
      ctx.beginPath();
      ctx.roundRect(jx - 15, jy, 30, 20, 5);
      ctx.fill();
      ctx.strokeStyle = '#42A5F5';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(jx + 15, jy + 5);
      ctx.lineTo(jx + 25, jy - 5);
      ctx.stroke();

      // 水しぶき
      const waterCount = 8;
      for (let i = 0; i < waterCount; i++) {
        const t = (this.wateringTime * 3 + i * 20) % 80;
        const wx = jx + 25 + (Math.random() - 0.5) * 10;
        const wy = jy - 5 + t * 1.5;
        const alpha = 1 - t / 80;
        ctx.fillStyle = `rgba(66, 165, 245, ${alpha * 0.6})`;
        ctx.beginPath();
        ctx.arc(wx, wy, 2 + Math.random() * 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // progress >= 0.8: じょうろ退場（自然にフェードアウト）
  }

  /** パーティクル描画 */
  private drawParticles(): void {
    const ctx = this.ctx;
    this.particles.forEach(p => {
      const alpha = p.life / p.maxLife;
      
      switch (p.type) {
        case 'coin':
          ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = `rgba(255, 160, 0, ${alpha})`;
          ctx.font = `bold ${p.size}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('¥', p.x, p.y);
          break;

        case 'star':
          ctx.fillStyle = p.color.replace(')', `, ${alpha})`).replace('rgb', 'rgba');
          if (!p.color.startsWith('rgba')) {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = alpha;
          }
          this.drawStar(p.x, p.y, p.size, 4);
          ctx.globalAlpha = 1;
          break;

        case 'sparkle':
          ctx.fillStyle = p.color;
          ctx.globalAlpha = alpha;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
          break;

        case 'leaf':
          ctx.fillStyle = p.color;
          ctx.globalAlpha = alpha;
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, p.size * 2, p.size, p.life * 0.1, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
          break;
      }
    });
  }

  /** 星型描画 */
  private drawStar(cx: number, cy: number, r: number, points: number): void {
    const ctx = this.ctx;
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const a = (Math.PI * i) / points - Math.PI / 2;
      const radius = i % 2 === 0 ? r : r * 0.4;
      const x = cx + Math.cos(a) * radius;
      const y = cy + Math.sin(a) * radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }

  /** キャンバス要素を返す */
  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }
}

/** マネーツリーのCanvas要素を生成 */
export function createMoneyTreeCanvas(container: HTMLElement, options: MoneyTreeOptions): MoneyTree {
  const canvas = document.createElement('canvas');
  canvas.className = 'money-tree-canvas';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  canvas.style.cursor = 'pointer';
  container.appendChild(canvas);

  const tree = new MoneyTree(canvas, options);
  tree.start();

  // リサイズ対応
  const resizeObserver = new ResizeObserver(() => {
    const rect = container.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    tree.resize();
  });
  resizeObserver.observe(container);

  return tree;
}
