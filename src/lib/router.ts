// ============================================================
// SPA ハッシュルーター
// シンプルなハッシュベースルーティング
// ============================================================

export type RouteHandler = (params: Record<string, string>) => HTMLElement | Promise<HTMLElement>;

interface Route {
  pattern: RegExp;
  paramNames: string[];
  handler: RouteHandler;
}

class Router {
  private routes: Route[] = [];
  private container: HTMLElement | null = null;
  private currentCleanup: (() => void) | null = null;

  /** ルート定義を追加 */
  addRoute(path: string, handler: RouteHandler): this {
    // パスをRegExpに変換 (例: '/child/:id' → /^#\/child\/([^/]+)$/)
    const paramNames: string[] = [];
    const pattern = path
      .replace(/:([^/]+)/g, (_match, paramName) => {
        paramNames.push(paramName);
        return '([^/]+)';
      });
    this.routes.push({
      pattern: new RegExp(`^#${pattern}$`),
      paramNames,
      handler,
    });
    return this;
  }

  /** ルーターを開始 */
  start(container: HTMLElement): void {
    this.container = container;
    window.addEventListener('hashchange', () => this.resolve());
    // 初期ルーティング
    this.resolve();
  }

  /** 画面遷移 */
  navigate(path: string): void {
    const targetHash = path.startsWith('#') ? path : `#${path}`;
    if (window.location.hash === targetHash) {
      this.resolve();
    } else {
      window.location.hash = targetHash;
    }
  }

  /** 現在のハッシュを解決してレンダリング */
  private async resolve(): Promise<void> {
    const hash = window.location.hash || '#/';
    
    for (const route of this.routes) {
      const match = hash.match(route.pattern);
      if (match) {
        const params: Record<string, string> = {};
        route.paramNames.forEach((name, i) => {
          params[name] = match[i + 1];
        });
        
        // 前の画面のクリーンアップ
        if (this.currentCleanup) {
          this.currentCleanup();
          this.currentCleanup = null;
        }

        try {
          const element = await route.handler(params);
          if (this.container) {
            // スムーズなページ遷移アニメーション
            this.container.style.opacity = '0';
            this.container.style.transform = 'translateY(8px)';
            
            setTimeout(() => {
              if (this.container) {
                this.container.innerHTML = '';
                this.container.appendChild(element);
                // フェードイン
                requestAnimationFrame(() => {
                  if (this.container) {
                    this.container.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                    this.container.style.opacity = '1';
                    this.container.style.transform = 'translateY(0)';
                  }
                });
              }
            }, 150);
          }
        } catch (err) {
          console.error('Route handler error:', err);
        }
        return;
      }
    }

    // マッチするルートがない場合はホームへ
    this.navigate('/');
  }

  /** クリーンアップ関数を登録 */
  onCleanup(fn: () => void): void {
    this.currentCleanup = fn;
  }
}

export const router = new Router();
