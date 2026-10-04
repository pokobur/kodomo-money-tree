import { router } from '../../lib/router';
import { store } from '../../lib/store';
import { createNavBar } from '../../components/nav';
import { showModal } from '../../components/modal';
import { showToast } from '../../components/toast';
import { withdrawalService } from '../../services/withdrawal.service';
import { accountService } from '../../services/account.service';
import { interestService } from '../../services/interest.service';
import { formatCoin, formatDate } from '../../utils/format';
import { soundManager } from '../../utils/sound';
import { getLocalData } from '../../services/local-data';

export function createChildSavings(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'screen-container child-theme';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.height = '100vh';

    const contentArea = document.createElement('div');
    contentArea.className = 'savings-screen';
    contentArea.style.flexGrow = '1';
    contentArea.style.overflowY = 'auto';
    contentArea.style.padding = '1.25rem';
    contentArea.style.paddingBottom = '5rem';

    const header = document.createElement('h1');
    header.innerText = 'ちょきんばこ 🏦';
    header.style.textAlign = 'center';
    header.style.color = '#2E7D32';
    header.style.margin = '0 0 1rem 0';
    contentArea.appendChild(header);

    // Balance Display
    const balanceCard = document.createElement('div');
    balanceCard.className = 'card';
    balanceCard.style.textAlign = 'center';
    balanceCard.style.background = 'linear-gradient(135deg, #E8F5E9, #C8E6C9)';
    balanceCard.style.border = '2px solid #81C784';
    balanceCard.style.marginBottom = '1.25rem';
    contentArea.appendChild(balanceCard);

    // Interest Preview Card
    const interestCard = document.createElement('div');
    interestCard.className = 'card';
    interestCard.style.background = '#FFF9C4';
    interestCard.style.border = '2px solid #FDD835';
    interestCard.style.marginBottom = '1.25rem';
    interestCard.style.textAlign = 'center';
    contentArea.appendChild(interestCard);

    // Chart Area
    const chartSection = document.createElement('div');
    chartSection.className = 'card';
    chartSection.style.marginBottom = '1.25rem';
    contentArea.appendChild(chartSection);



    // History List
    const historyList = document.createElement('div');
    contentArea.appendChild(historyList);

    container.appendChild(contentArea);
    container.appendChild(createNavBar('CHILD'));

    let activeChartTab: 'daily' | 'weekly' = 'daily';

    const render = () => {
        const state = store.getState();
        if (!state) return;

        const account = state.account;
        const savings = account?.savings_balance || 0;
        const spending = account?.spending_balance || 0;
        const rate = ((account?.weekly_interest_rate ?? state.family?.weekly_interest_rate) ?? 0.05) * 100;
        const pendingInterest = Math.ceil(savings * (rate / 100));

        balanceCard.innerHTML = `
            <div style="font-size: 0.9rem; color: #555; font-weight: bold;">いまの ちょきん</div>
            <div style="font-size: 2.2rem; font-weight: 800; color: #2E7D32; margin: 6px 0;">${formatCoin(savings)}</div>
            <div style="font-size: 0.85rem; color: #777;">（つかえる おかね: ${formatCoin(spending)}）</div>
        `;

        const schedType = account?.interest_schedule_type || state.family?.interest_schedule_type || 'WEEKLY';
        const schedDay = account?.interest_schedule_day !== undefined
            ? account.interest_schedule_day
            : (state.family?.interest_schedule_day ?? 0);
        const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
        const scheduleLabel = schedType === 'MONTHLY' ? `まい月 ${schedDay}にち` : `まいしゅう ${dayNames[schedDay] || '日'}ようび`;

        interestCard.innerHTML = `
            <div style="font-size: 0.85rem; color: #8D6E63; font-weight: bold;">🌱 つぎのきんりよそう (${scheduleLabel})</div>
            <div style="font-size: 1.5rem; font-weight: bold; color: #F57F17; margin: 4px 0;">+${pendingInterest} コイン</div>
            <div style="font-size: 0.75rem; color: #9E9E9E;">（おこづかいとしてふえるおかね）</div>
        `;

        // 取引履歴の準備（グラフ計算と履歴表示の両方で使用）
        const currentChildId = state.currentUser?.id;
        const localData = getLocalData();
        const txMap = new Map<string, any>();
        (localData.transactions || [])
            .filter((t: any) => !currentChildId || t.child_id === currentChildId)
            .forEach((t: any) => txMap.set(t.id, t));
        (state.transactions || [])
            .filter((t: any) => !currentChildId || t.child_id === currentChildId)
            .forEach((t: any) => txMap.set(t.id, t));
        const transactions = Array.from(txMap.values())
            .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        // 貯金残高に影響する取引の増減額を判定（プラスなら入金・報酬、マイナスなら出金）
        const getSavingsDelta = (tx: any): number => {
            const isSavings = tx.target_account === 'SAVINGS'
                || tx.type === 'INTEREST'
                || (tx.type === 'QUEST_REWARD' && (tx.title && (tx.title.includes('ちょきん分') || tx.title.includes('貯金分'))));
            if (!isSavings) return 0;
            if (tx.type === 'WITHDRAW' || tx.amount < 0) {
                return -Math.abs(tx.amount);
            }
            return Math.abs(tx.amount);
        };

        // 収支に応じた変動グラフの算出（日別7日間 / 週別4週間）
        const count = activeChartTab === 'daily' ? 7 : 4;
        const now = new Date();
        const targetPoints: { timestamp: number; label: string; isCurrent: boolean }[] = [];

        if (activeChartTab === 'daily') {
            for (let i = count - 1; i >= 0; i--) {
                if (i === 0) {
                    targetPoints.push({ timestamp: Date.now(), label: 'きょう', isCurrent: true });
                } else if (i === 1) {
                    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
                    targetPoints.push({ timestamp: d.getTime(), label: 'きのう', isCurrent: false });
                } else {
                    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 23, 59, 59, 999);
                    targetPoints.push({ timestamp: d.getTime(), label: `${d.getMonth() + 1}/${d.getDate()}`, isCurrent: false });
                }
            }
        } else {
            for (let i = count - 1; i >= 0; i--) {
                if (i === 0) {
                    targetPoints.push({ timestamp: Date.now(), label: 'いま', isCurrent: true });
                } else {
                    const d = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
                    d.setHours(23, 59, 59, 999);
                    targetPoints.push({ timestamp: d.getTime(), label: `${i}週前`, isCurrent: false });
                }
            }
        }

        let prevBal: number | null = null;
        const bars = targetPoints.map(point => {
            // point.timestamp より後に発生した取引の合計変動分を逆算
            const deltaAfter = transactions
                .filter((tx: any) => new Date(tx.created_at).getTime() > point.timestamp)
                .reduce((sum: number, tx: any) => sum + getSavingsDelta(tx), 0);
            const balance = Math.max(0, savings - deltaAfter);
            const diff = prevBal !== null ? balance - prevBal : 0;
            prevBal = balance;
            return {
                label: point.label,
                isCurrent: point.isCurrent,
                balance,
                diff
            };
        });

        // 対象期間内の入金・出金集計
        const earliestTimestamp = targetPoints[0].timestamp - (activeChartTab === 'daily' ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000);
        const periodTxs = transactions.filter((tx: any) => new Date(tx.created_at).getTime() >= earliestTimestamp);
        let periodIncome = 0;
        let periodExpense = 0;
        periodTxs.forEach((tx: any) => {
            const d = getSavingsDelta(tx);
            if (d > 0) periodIncome += d;
            else if (d < 0) periodExpense += Math.abs(d);
        });
        const netChange = bars[bars.length - 1].balance - bars[0].balance;
        const maxVal = Math.max(...bars.map(b => b.balance), 10);

        // グラフセクションの描画
        chartSection.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <h3 style="font-size: 1rem; margin: 0; color: #2E7D32; font-weight: 800; display: flex; align-items: center; gap: 4px;">
                    <span>📊</span> ちょきんのグラフ
                </h3>
                <div style="display: inline-flex; background: #E8F5E9; padding: 2px; border-radius: 20px; gap: 2px;">
                    <button id="chart-tab-daily" style="border: none; padding: 4px 10px; border-radius: 16px; font-size: 0.75rem; font-weight: bold; cursor: pointer; transition: all 0.2s; ${activeChartTab === 'daily' ? 'background: #2E7D32; color: white; box-shadow: 0 1px 3px rgba(0,0,0,0.15);' : 'background: transparent; color: #558B2F;'}">
                        7にちかん
                    </button>
                    <button id="chart-tab-weekly" style="border: none; padding: 4px 10px; border-radius: 16px; font-size: 0.75rem; font-weight: bold; cursor: pointer; transition: all 0.2s; ${activeChartTab === 'weekly' ? 'background: #2E7D32; color: white; box-shadow: 0 1px 3px rgba(0,0,0,0.15);' : 'background: transparent; color: #558B2F;'}">
                        4しゅうかん
                    </button>
                </div>
            </div>
        `;

        const tabDaily = chartSection.querySelector('#chart-tab-daily') as HTMLButtonElement;
        const tabWeekly = chartSection.querySelector('#chart-tab-weekly') as HTMLButtonElement;
        if (tabDaily) tabDaily.onclick = () => { if (activeChartTab !== 'daily') { activeChartTab = 'daily'; render(); } };
        if (tabWeekly) tabWeekly.onclick = () => { if (activeChartTab !== 'weekly') { activeChartTab = 'weekly'; render(); } };

        const chartContainer = document.createElement('div');
        chartContainer.style.display = 'flex';
        chartContainer.style.alignItems = 'flex-end';
        chartContainer.style.height = '120px';
        chartContainer.style.gap = activeChartTab === 'daily' ? '5px' : '10px';
        chartContainer.style.padding = '8px 2px 2px 2px';

        bars.forEach((b, idx) => {
            const barWrap = document.createElement('div');
            barWrap.style.flex = '1';
            barWrap.style.display = 'flex';
            barWrap.style.flexDirection = 'column';
            barWrap.style.alignItems = 'center';
            barWrap.style.height = '100%';
            barWrap.style.justifyContent = 'flex-end';
            barWrap.style.minWidth = '0';

            // 増減バッジ（変動があった場合に表示）
            let diffBadge = '<span style="height: 14px; margin-bottom: 2px;"></span>';
            if (idx > 0 && b.diff > 0) {
                diffBadge = `<span style="font-size: 0.58rem; font-weight: 800; color: #2E7D32; background: #E8F5E9; border-radius: 6px; padding: 1px 3px; margin-bottom: 2px; white-space: nowrap; line-height: 1.2;">+${b.diff}</span>`;
            } else if (idx > 0 && b.diff < 0) {
                diffBadge = `<span style="font-size: 0.58rem; font-weight: 800; color: #D84315; background: #FBE9E7; border-radius: 6px; padding: 1px 3px; margin-bottom: 2px; white-space: nowrap; line-height: 1.2;">${b.diff}</span>`;
            }

            // 金額ラベル
            const coinLabel = document.createElement('span');
            coinLabel.style.fontSize = activeChartTab === 'daily' ? '0.65rem' : '0.72rem';
            coinLabel.style.fontWeight = '800';
            coinLabel.style.color = b.isCurrent ? '#2E7D32' : '#555';
            coinLabel.style.marginBottom = '2px';
            coinLabel.style.whiteSpace = 'nowrap';
            coinLabel.innerText = `${b.balance}`;

            // バー本体の高さと色（収支に合わせて変動）
            const heightPct = maxVal === 0 ? 8 : Math.max(8, Math.round((b.balance / maxVal) * 65));
            const bar = document.createElement('div');
            bar.style.width = '82%';
            bar.style.height = `${heightPct}%`;
            bar.style.borderRadius = '5px 5px 0 0';
            bar.style.transition = 'height 0.3s ease, background 0.3s ease';

            if (b.isCurrent) {
                bar.style.background = 'linear-gradient(to top, #2E7D32, #4CAF50)';
                bar.style.boxShadow = '0 2px 4px rgba(46, 125, 50, 0.25)';
            } else if (idx > 0 && b.diff > 0) {
                bar.style.background = 'linear-gradient(to top, #43A047, #81C784)';
            } else if (idx > 0 && b.diff < 0) {
                bar.style.background = 'linear-gradient(to top, #FB8C00, #FFB74D)';
            } else {
                bar.style.background = '#C8E6C9';
            }

            // 日付・ラベル
            const label = document.createElement('span');
            label.style.fontSize = activeChartTab === 'daily' ? '0.65rem' : '0.72rem';
            label.style.fontWeight = b.isCurrent ? '800' : 'bold';
            label.style.color = b.isCurrent ? '#2E7D32' : '#777';
            label.style.marginTop = '4px';
            label.style.whiteSpace = 'nowrap';
            label.innerText = b.label;

            barWrap.innerHTML = diffBadge;
            barWrap.appendChild(coinLabel);
            barWrap.appendChild(bar);
            barWrap.appendChild(label);
            chartContainer.appendChild(barWrap);
        });
        chartSection.appendChild(chartContainer);

        // 期間の収支サマリーバー
        const summaryBox = document.createElement('div');
        summaryBox.style.marginTop = '10px';
        summaryBox.style.padding = '8px 12px';
        summaryBox.style.background = '#F9FBE7';
        summaryBox.style.border = '1px solid #E6EE9C';
        summaryBox.style.borderRadius = '8px';
        summaryBox.style.display = 'flex';
        summaryBox.style.justifyContent = 'space-between';
        summaryBox.style.alignItems = 'center';
        summaryBox.style.fontSize = '0.78rem';

        const changeIcon = netChange > 0 ? '📈' : netChange < 0 ? '📉' : '🪙';
        const changeText = netChange > 0
            ? `+${netChange} コイン ふえたよ！`
            : netChange < 0
            ? `${netChange} コイン つかったよ`
            : 'ちょきんキープ中！';
        const changeColor = netChange > 0 ? '#2E7D32' : netChange < 0 ? '#D84315' : '#558B2F';

        summaryBox.innerHTML = `
            <div style="font-weight: bold; color: ${changeColor}; display: flex; align-items: center; gap: 4px;">
                <span>${changeIcon}</span>
                <span>${changeText}</span>
            </div>
            <div style="font-size: 0.72rem; color: #689F38;">
                (＋${periodIncome} / －${periodExpense})
            </div>
        `;
        chartSection.appendChild(summaryBox);

        // History
        historyList.innerHTML = '<h3 style="font-size: 1rem; color: #444; margin: 1.5rem 0 0.5rem;">さいきんの りれき</h3>';
        const pendingWithdrawals = (state.withdrawals || []).filter(
            (w: any) => (w.child_id === currentChildId || !currentChildId) && (w.status === 'PENDING' || w.status === 'COOLDOWN')
        );

        if (transactions.length === 0 && pendingWithdrawals.length === 0) {
            historyList.innerHTML += '<div class="card" style="padding: 1rem; color: #888; text-align: center;">まだ りれきは ないよ</div>';
        } else {
            // 1. 出金リクエスト中の項目
            pendingWithdrawals.forEach((w: any) => {
                const item = document.createElement('div');
                item.className = 'card pending-withdrawal-card';
                item.style.padding = '0.85rem 1rem';
                item.style.marginBottom = '0.6rem';
                item.style.borderLeft = '4px solid #FFA726';
                item.style.background = '#FFFDE7';
                item.style.display = 'flex';
                item.style.justifyContent = 'space-between';
                item.style.alignItems = 'center';

                const isSpending = w.source_account === 'SPENDING';
                const cleanPurpose = (w.purpose || 'おこづかい').replace(/\[[^\]]+\]/, '').trim();
                const displayTitle = cleanPurpose.startsWith('ほしいもの購入')
                    ? `🎁 ${cleanPurpose}`
                    : `おかねをだす: ${cleanPurpose}`;

                item.innerHTML = `
                    <div style="flex: 1; min-width: 0;">
                        <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                            <span style="background: #FFA726; color: white; font-size: 0.75rem; font-weight: 800; padding: 2px 8px; border-radius: 12px; white-space: nowrap;">⏳ おねがい中</span>
                            <span style="background: ${isSpending ? '#E3F2FD' : '#E8F5E9'}; color: ${isSpending ? '#1565C0' : '#2E7D32'}; font-size: 0.75rem; font-weight: bold; padding: 2px 8px; border-radius: 8px; white-space: nowrap;">
                                ${isSpending ? '💳 つかえるおかねから' : '🏦 ちょきんから'}
                            </span>
                            <span style="font-weight: bold; font-size: 0.95rem; color: #333;">${displayTitle}</span>
                        </div>
                        <div style="font-size: 0.75rem; color: #777; margin-top: 4px;">
                            ${formatDate(w.created_at)} · おとなのひとの かくにんまち
                        </div>
                    </div>
                    <div style="text-align: right; margin-left: 10px;">
                        <div style="font-weight: 800; font-size: 1.15rem; color: #E65100; white-space: nowrap;">
                            -${Math.abs(w.amount).toLocaleString()}
                        </div>
                        <button class="cancel-w-btn" style="background: transparent; border: 1px solid #ccc; border-radius: 6px; font-size: 0.7rem; color: #888; padding: 2px 6px; margin-top: 4px; cursor: pointer;">
                            とりけす
                        </button>
                    </div>
                `;

                const cancelBtn = item.querySelector('.cancel-w-btn') as HTMLButtonElement;
                if (cancelBtn) {
                    cancelBtn.onclick = async () => {
                        if (!confirm('出金リクエストを とりけしますか？')) return;
                        try {
                            cancelBtn.disabled = true;
                            await withdrawalService.cancelWithdrawal(w.id);
                            await refreshData();
                            showToast('出金リクエストを とりけしたよ', 'info');
                        } catch (err: any) {
                            showToast(err.message || 'とりけしに しっぱいしたよ', 'error');
                            cancelBtn.disabled = false;
                        }
                    };
                }

                historyList.appendChild(item);
            });

            // 2. 差し戻された出金リクエスト
            const rejectedWithdrawals = (state.withdrawals || []).filter(
                (w: any) => (w.child_id === currentChildId || !currentChildId) && w.status === 'REJECTED' && w.parent_comment
            ).slice(0, 3);

            rejectedWithdrawals.forEach((w: any) => {
                const item = document.createElement('div');
                item.className = 'card rejected-withdrawal-card';
                item.style.padding = '0.85rem 1rem';
                item.style.marginBottom = '0.6rem';
                item.style.borderLeft = '4px solid #EF5350';
                item.style.background = '#FFEBEE';

                const isSpending = w.source_account === 'SPENDING';
                const cleanPurpose = (w.purpose || 'おこづかい').replace(/\[[^\]]+\]/, '').trim();
                const displayTitle = cleanPurpose.startsWith('ほしいもの購入')
                    ? `🎁 ${cleanPurpose}`
                    : `おかねをだす: ${cleanPurpose}`;

                item.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div>
                            <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                                <span style="background: #EF5350; color: white; font-size: 0.75rem; font-weight: 800; padding: 2px 8px; border-radius: 12px; white-space: nowrap;">❌ やりなおし</span>
                                <span style="background: ${isSpending ? '#E3F2FD' : '#E8F5E9'}; color: ${isSpending ? '#1565C0' : '#2E7D32'}; font-size: 0.75rem; font-weight: bold; padding: 2px 8px; border-radius: 8px; white-space: nowrap;">
                                    ${isSpending ? '💳 つかえるおかねから' : '🏦 ちょきんから'}
                                </span>
                                <span style="font-weight: bold; font-size: 0.95rem; color: #333;">${displayTitle}</span>
                            </div>
                            <div style="margin-top: 6px; padding: 6px 10px; background: white; border-radius: 6px; font-size: 0.85rem; color: #C62828;">
                                💬 おとなのひと: ${w.parent_comment}
                            </div>
                            <div style="font-size: 0.75rem; color: #777; margin-top: 4px;">
                                ${formatDate(w.created_at)}
                            </div>
                        </div>
                        <div style="font-weight: 800; font-size: 1.15rem; color: #C62828; margin-left: 10px; white-space: nowrap;">
                            ${w.amount}
                        </div>
                    </div>
                `;
                historyList.appendChild(item);
            });

            // 3. 確定済みの取引履歴（4桁以上の入金も分散せず美しく表示）
            transactions.slice(0, 15).forEach((tx: any) => {
                const item = document.createElement('div');
                item.className = 'card';
                item.style.padding = '0.75rem 1rem';
                item.style.marginBottom = '0.5rem';
                item.style.display = 'flex';
                item.style.justifyContent = 'space-between';
                item.style.alignItems = 'center';

                const isSavingsReward = tx.type === 'QUEST_REWARD' && (tx.target_account === 'SAVINGS' || (tx.title && (tx.title.includes('ちょきん分') || tx.title.includes('貯金分'))));
                const icon = isSavingsReward ? '🏦' : tx.type === 'QUEST_REWARD' ? '🎯' : tx.type === 'INTEREST' ? '🍎' : '💸';
                const isPositive = tx.amount > 0;
                const isWithdraw = tx.type === 'WITHDRAW' || tx.amount < 0;

                let sourceBadge = '';
                let subtitle = formatDate(tx.created_at);

                if (isWithdraw) {
                    const isSpending = tx.target_account === 'SPENDING';
                    const isSavings = tx.target_account === 'SAVINGS';
                    if (isSpending) {
                        sourceBadge = '<span style="background: #E3F2FD; color: #1565C0; font-size: 0.75rem; font-weight: bold; padding: 2px 8px; border-radius: 8px; white-space: nowrap;">💳 つかえるおかねから</span>';
                        subtitle = `${formatDate(tx.created_at)} · つかえるおかねから だしたよ`;
                    } else if (isSavings) {
                        sourceBadge = '<span style="background: #E8F5E9; color: #2E7D32; font-size: 0.75rem; font-weight: bold; padding: 2px 8px; border-radius: 8px; white-space: nowrap;">🏦 ちょきんから</span>';
                        subtitle = `${formatDate(tx.created_at)} · ちょきんから だしたよ`;
                    } else {
                        sourceBadge = '<span style="background: #FFF3E0; color: #E65100; font-size: 0.75rem; font-weight: bold; padding: 2px 8px; border-radius: 8px; white-space: nowrap;">💸 だしたよ</span>';
                        subtitle = `${formatDate(tx.created_at)}`;
                    }
                } else if (tx.type === 'QUEST_REWARD') {
                    if (isSavingsReward) {
                        sourceBadge = '<span style="background: #E8F5E9; color: #2E7D32; font-size: 0.75rem; font-weight: bold; padding: 2px 8px; border-radius: 8px; white-space: nowrap;">🏦 クエスト（ちょきん分）</span>';
                        subtitle = `${formatDate(tx.created_at)} · ちょきんばこに プラス`;
                    } else {
                        sourceBadge = '<span style="background: #FFF8E1; color: #F57F17; font-size: 0.75rem; font-weight: bold; padding: 2px 8px; border-radius: 8px; white-space: nowrap;">🎯 クエストのごほうび</span>';
                        subtitle = `${formatDate(tx.created_at)} · つかえるおかねに プラス`;
                    }
                } else if (tx.type === 'INTEREST') {
                    sourceBadge = '<span style="background: #E8F5E9; color: #2E7D32; font-size: 0.75rem; font-weight: bold; padding: 2px 8px; border-radius: 8px; white-space: nowrap;">🍎 きのみのコイン</span>';
                    subtitle = `${formatDate(tx.created_at)} · ちょきんに プラス`;
                } else if (tx.type === 'ADJUSTMENT') {
                    const targetName = tx.target_account === 'SPENDING' ? 'つかえるおかね' : 'ちょきん';
                    sourceBadge = `<span style="background: #F3E5F5; color: #7B1FA2; font-size: 0.75rem; font-weight: bold; padding: 2px 8px; border-radius: 8px; white-space: nowrap;">⚖️ ちょうせい</span>`;
                    subtitle = `${formatDate(tx.created_at)} · ${targetName}`;
                }

                const cleanTxTitle = (tx.title || '').replace(/\[[^\]]+\]/, '').trim();

                item.innerHTML = `
                    <div style="flex: 1; min-width: 0;">
                        <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                            ${sourceBadge}
                            <span style="font-weight: bold; font-size: 0.95rem; color: #333;">${icon} ${cleanTxTitle}</span>
                        </div>
                        <div style="font-size: 0.75rem; color: #888; margin-top: 4px;">${subtitle}</div>
                    </div>
                    <div style="font-weight: 800; font-size: 1.15rem; color: ${isPositive ? '#2E7D32' : '#E64A19'}; margin-left: 10px; white-space: nowrap;">
                        ${isPositive ? '+' : '-'}${Math.abs(tx.amount).toLocaleString()}
                    </div>
                `;
                historyList.appendChild(item);
            });
        }
    };

    store.onAny(render);
    render();

    // 最新の出金申請・取引履歴・残高を取得
    const refreshData = async () => {
        const s = store.getState();
        const childId = s?.currentUser?.id;
        if (childId) {
            try {
                const wds = await withdrawalService.getWithdrawals(childId);
                store.set('withdrawals', wds);
                const txs = await accountService.getTransactions(childId);
                store.set('transactions', txs);
                const acc = await accountService.getAccount(childId);
                if (acc) store.set('account', acc);
            } catch (e) {
                console.warn('Failed to refresh savings data:', e);
            }
        }
    };
    refreshData();

    const onStorage = (e: StorageEvent) => {
        if (e.key === 'moneytree_data') {
            const fresh = getLocalData();
            const currentChildId = store.get('currentUser')?.id;
            if (currentChildId) {
                const acc = (fresh.accounts || []).find((a: any) => a.child_id === currentChildId);
                if (acc) store.set('account', acc);
                const txs = (fresh.transactions || []).filter((t: any) => t.child_id === currentChildId);
                store.set('transactions', txs);
            }
            refreshData();
        }
    };
    const onLocalChange = (e: any) => {
        const fresh = e?.detail || getLocalData();
        const currentChildId = store.get('currentUser')?.id;
        if (currentChildId) {
            const acc = (fresh.accounts || []).find((a: any) => a.child_id === currentChildId);
            if (acc) store.set('account', acc);
            const txs = (fresh.transactions || []).filter((t: any) => t.child_id === currentChildId);
            store.set('transactions', txs);
        }
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('moneytree_local_change', onLocalChange);
    window.addEventListener('focus', refreshData);

    const s = store.getState();
    const childId = s?.currentUser?.id || '';
    const wdSub = withdrawalService.subscribeToWithdrawals(childId, () => refreshData());
    const accSub = childId ? accountService.subscribeToAccount(childId, (newAcc) => {
        if (newAcc) store.set('account', newAcc);
    }) : { unsubscribe: () => {} };
    const pollInterval = window.setInterval(refreshData, 3500);

    router.onCleanup(() => {
        window.clearInterval(pollInterval);
        wdSub.unsubscribe();
        accSub.unsubscribe();
        window.removeEventListener('storage', onStorage);
        window.removeEventListener('moneytree_local_change', onLocalChange);
        window.removeEventListener('focus', refreshData);
    });

    return container;
}
