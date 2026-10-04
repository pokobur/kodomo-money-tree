// ============================================================
// マネーツリー - フォーマットユーティリティ (format.ts)
// 小学生向けひらがな対応・日本円/コイン表示
// ============================================================

const JAPANESE_WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'] as const;

/**
 * コイン枚数をカンマ区切り＋🪙絵文字付きでフォーマット
 * @param amount コイン枚数
 * @returns '1,234 🪙' 形式の文字列
 * @example formatCoin(1234) => '1,234 🪙'
 * @example formatCoin(0) => '0 🪙'
 */
export function formatCoin(amount: number): string {
  const safeAmount = Number.isFinite(amount) ? Math.round(amount) : 0;
  return `${safeAmount.toLocaleString('ja-JP')} 🪙`;
}

/**
 * 日付を日本語形式（月日・曜日付き）でフォーマット
 * @param dateStr ISO日付文字列またはDateが解釈可能な文字列
 * @returns '9月14日（日）' 形式の文字列
 * @example formatDate('2026-09-14T14:30:00') => '9月14日（月）'
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;

  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekday = JAPANESE_WEEKDAYS[date.getDay()];
  return `${month}月${day}日（${weekday}）`;
}

/**
 * 時刻を24時間表記 (HH:mm) でフォーマット
 * @param dateStr ISO日付文字列またはDateが解釈可能な文字列
 * @returns '14:30' 形式の文字列
 * @example formatTime('2026-09-14T14:30:00') => '14:30'
 */
export function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;

  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * 相対時間を日本語（小学生向けひらがな表現中心）でフォーマット
 * @param dateStr ISO日付文字列またはDateが解釈可能な文字列
 * @returns '3分まえ', '2じかんまえ', 'きのう' などの文字列
 * @example formatRelativeTime(date5MinAgo) => '5分まえ'
 * @example formatRelativeTime(date2HoursAgo) => '2じかんまえ'
 * @example formatRelativeTime(dateYesterday) => 'きのう'
 */
export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  // 未来時刻または1分未満
  if (diffMs < 0) {
    return 'たったいま';
  }

  const diffMinutes = Math.floor(diffMs / (60 * 1000));
  const diffHours = Math.floor(diffMs / (60 * 60 * 1000));

  if (diffMinutes < 1) {
    return 'たったいま';
  }
  if (diffHours < 1) {
    return `${diffMinutes}分まえ`;
  }

  // カレンダー基準の日数差を算出
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const targetStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const dayDiff = Math.floor((todayStart - targetStart) / (24 * 60 * 60 * 1000));

  if (dayDiff === 0) {
    return `${diffHours}じかんまえ`;
  }
  if (dayDiff === 1) {
    return 'きのう';
  }
  if (dayDiff === 2) {
    return 'おととい';
  }
  if (dayDiff < 7) {
    return `${dayDiff}にちまえ`;
  }

  // 1週間以上前は通常の日付表記にフォールバック
  return formatDate(dateStr);
}

/**
 * パーセンテージ表示フォーマット
 * @param value パーセント値 (75 または 0.75 の小数比率)
 * @returns '75%' 形式の文字列
 * @example formatPercent(75) => '75%'
 * @example formatPercent(0.75) => '75%'
 */
export function formatPercent(value: number): string {
  if (typeof value !== 'number' || isNaN(value)) return '0%';

  // 0 < value < 1 の小数が渡された場合は比率 (0.75 -> 75%) として解釈
  const pct = (value > 0 && value < 1) ? value * 100 : value;
  const rounded = Number.isInteger(pct) ? pct : Math.round(pct * 10) / 10;
  return `${rounded}%`;
}

/**
 * クールダウンや残り時間のカウントダウン表示フォーマット（ひらがな表現）
 * @param remainingMs 残りミリ秒数
 * @returns '23じかん 45ふん' 形式の文字列
 * @example formatCountdown(85500000) => '23じかん 45ふん'
 * @example formatCountdown(2700000) => '45ふん'
 */
export function formatCountdown(remainingMs: number): string {
  if (remainingMs <= 0) return '0ふん';

  const totalSeconds = Math.floor(remainingMs / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  if (days > 0) {
    return `${days}にち ${remainingHours}じかん`;
  }
  if (hours > 0) {
    return `${hours}じかん ${minutes}ふん`;
  }
  if (minutes > 0) {
    return `${minutes}ふん`;
  }
  return `${Math.max(0, totalSeconds)}びょう`;
}

/**
 * 漢字にふりがな（ルビ）を振ったHTML文字列を生成
 * @param kanji 漢字テキスト
 * @param reading ふりがな（ひらがな/カタカナ）
 * @returns `<ruby>漢字<rt>かんじ</rt></ruby>` 形式のHTML文字列
 * @example rubyText('貯金', 'ちょきん') => '<ruby>貯金<rt>ちょきん</rt></ruby>'
 */
export function rubyText(kanji: string, reading: string): string {
  const escape = (str: string): string =>
    str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

  return `<ruby>${escape(kanji)}<rt>${escape(reading)}</rt></ruby>`;
}
