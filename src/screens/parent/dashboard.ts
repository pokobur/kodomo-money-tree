import { router } from '../../lib/router';
import { store } from '../../lib/store';
import { logout } from '../../lib/auth';
import { createNavBar } from '../../components/nav';
import { showToast } from '../../components/toast';
import { showModal } from '../../components/modal';
import { questService } from '../../services/quest.service';
import { withdrawalService } from '../../services/withdrawal.service';
import { accountService } from '../../services/account.service';
import { getLocalData } from '../../services/local-data';
import { formatCoin, formatDate } from '../../utils/format';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

export function createParentDashboard(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'screen-container parent-theme';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.height = '100vh';

    const contentArea = document.createElement('div');
    contentArea.className = 'parent-dashboard';
    contentArea.style.flexGrow = '1';
    contentArea.style.overflowY = 'auto';
    contentArea.style.padding = '1.25rem';
    contentArea.style.paddingBottom = '5rem';

    // Header
    const headerRow = document.createElement('div');
    headerRow.style.display = 'flex';
    headerRow.style.justifyContent = 'space-between';
    headerRow.style.alignItems = 'center';
    headerRow.style.marginBottom = '1.5rem';
    
    const header = document.createElement('h1');
    header.innerText = 'ダッシュボード';
    header.style.margin = '0';
    header.style.fontSize = '1.75rem';
    header.style.color = '#3F51B5';
    
    const logoutBtn = document.createElement('button');
    logoutBtn.innerText = 'ログアウト';
    logoutBtn.className = 'btn btn-outline';
    logoutBtn.style.padding = '0.4rem 1rem';
    logoutBtn.style.minHeight = '36px';
    logoutBtn.style.fontSize = '0.85rem';
    logoutBtn.onclick = async () => {
        await logout();
        router.navigate('/');
    };
    
    headerRow.appendChild(header);
    headerRow.appendChild(logoutBtn);
    contentArea.appendChild(headerRow);

    // Summary Cards (Total Savings, Total Children, Active Quests)
    const summarySection = document.createElement('div');
    contentArea.appendChild(summarySection);

    // Section 1: Pending Approvals
    const approvalsSection = document.createElement('div');
    contentArea.appendChild(approvalsSection);

    // Section 2: Pending Withdrawals
    const withdrawalsSection = document.createElement('div');
    contentArea.appendChild(withdrawalsSection);

    // Section 3: Children Summary
    const childrenSection = document.createElement('div');
    contentArea.appendChild(childrenSection);

    // Family Code
    const familyCodeSection = document.createElement('div');
    contentArea.appendChild(familyCodeSection);

    container.appendChild(contentArea);
    container.appendChild(createNavBar('PARENT'));

    const render = () => {
        const state = store.getState();
        if (!state) return;

        const localData = getLocalData();
        const deletedIds = new Set(localData.deletedChildIds || []);
        
        // 子ども一覧（ストア ＋ ローカル統合）
        const childMap = new Map<string, any>();
        (localData.users || []).filter((u: any) => u.role === 'CHILD' && !deletedIds.has(u.id)).forEach((c: any) => childMap.set(c.id, c));
        (state.children || []).filter((c: any) => !deletedIds.has(c.id)).forEach((c: any) => childMap.set(c.id, { ...childMap.get(c.id), ...c }));
        const children = Array.from(childMap.values());
        const familyChildIds = new Set(children.map((c: any) => c.id));
        const familyId = state.family?.id || (localData.families?.[0] as any)?.id;

        // 提出物（ストア ＋ ローカル統合、ローカルの最新状態を優先）
        const localSubs = (localData.submissions || []).filter((s: any) => !deletedIds.has(s.child_id));
        const storeSubs = (state.submissions || []).filter((s: any) => !deletedIds.has(s.child_id));
        const subMap = new Map<string, any>();
        storeSubs.forEach(s => subMap.set(s.id, s));
        localSubs.forEach(s => subMap.set(s.id, s));
        const submissions = Array.from(subMap.values());

        // 出金リクエスト（ストア ＋ ローカル統合、ローカルの最新状態を優先）
        const localWds = (localData.withdrawals || []).filter((w: any) => !deletedIds.has(w.child_id));
        const storeWds = (state.withdrawals || []).filter((w: any) => !deletedIds.has(w.child_id));
        const wdMap = new Map<string, any>();
        storeWds.forEach(w => wdMap.set(w.id, w));
        localWds.forEach(w => wdMap.set(w.id, w));
        const withdrawals = Array.from(wdMap.values());

        // クエスト一覧（ストア ＋ ローカル統合、ローカルの最新状態を優先）
        const localQuests = (localData.quests || []);
        const questMap = new Map<string, any>();
        (state.quests || []).forEach(q => questMap.set(q.id, q));
        localQuests.forEach(q => questMap.set(q.id, q));
        const quests = Array.from(questMap.values());

        // 子どもたち全体の使えるお金と貯金額の合計を計算
        const localAccounts = (localData.accounts || []).filter((a: any) => !deletedIds.has(a.child_id));
        const getChildAccount = (childId: string) => {
            const accFromStore = (state.accounts || []).find((a: any) => a.child_id === childId);
            const accFromLocal = (localAccounts || []).find((a: any) => a.child_id === childId);
            if (!accFromStore) return accFromLocal;
            if (!accFromLocal) return accFromStore;
            const localTotal = (accFromLocal.spending_balance || 0) + (accFromLocal.savings_balance || 0);
            const storeTotal = (accFromStore.spending_balance || 0) + (accFromStore.savings_balance || 0);
            if ((accFromLocal as any)._local_transfer_at) return accFromLocal;
            if (localTotal > 0 && storeTotal === 0) return accFromLocal;
            return accFromStore;
        };

        let totalSpending = 0;
        let totalSavings = 0;
        children.forEach((child: any) => {
            const acc = getChildAccount(child.id);
            totalSpending += (acc?.spending_balance ?? (child as any).spending_balance ?? 0);
            totalSavings += (acc?.savings_balance ?? (child as any).savings_balance ?? 0);
        });

        const pendingQuests = submissions.filter((s: any) => 
            s.status === 'PENDING' &&
            (familyChildIds.has(s.child_id) || s.family_id === familyId || !s.family_id)
        );
        const pendingWithdrawals = withdrawals.filter((w: any) => 
            (w.status === 'PENDING' || w.status === 'COOLDOWN') &&
            (familyChildIds.has(w.child_id) || w.family_id === familyId || !w.family_id)
        );
        const totalPendingCount = pendingQuests.length + pendingWithdrawals.length;

        // 1. Summary Cards (+ 承認待ち通知バナー)
        const notificationBanner = totalPendingCount > 0 ? `
            <div class="card" style="background: linear-gradient(135deg, #FFF8E1, #FFECB3); border: 2px solid #FFA000; border-radius: 12px; padding: 12px 16px; margin-bottom: 1.25rem; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 4px 12px rgba(255,160,0,0.18);">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <span style="font-size: 1.8rem;">🔔</span>
                    <div>
                        <div style="font-weight: 800; color: #E65100; font-size: 1.05rem;">承認待ちのリクエストが ${totalPendingCount}件 あります！</div>
                        <div style="font-size: 0.85rem; color: #6D4C41; margin-top: 2px;">
                            ${pendingQuests.length > 0 ? `クエスト報告: <strong>${pendingQuests.length}件</strong> ` : ''}
                            ${pendingWithdrawals.length > 0 ? `出金・購入: <strong>${pendingWithdrawals.length}件</strong>` : ''}
                        </div>
                    </div>
                </div>
            </div>
        ` : '';

        summarySection.innerHTML = `
            ${notificationBanner}
            <div class="summary-cards" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 1.5rem;">
                <div class="card" style="padding: 1rem; text-align: center; border-left: 4px solid #FF7043; background: #FFF8E1;">
                    <div style="font-size: 0.85rem; color: #666; font-weight: bold;">💳 つかえるお金（合計）</div>
                    <div style="font-size: 1.5rem; font-weight: 800; color: #E65100; margin-top: 4px;">${formatCoin(totalSpending)}</div>
                </div>
                <div class="card" style="padding: 1rem; text-align: center; border-left: 4px solid #4CAF50; background: #F1F8E9;">
                    <div style="font-size: 0.85rem; color: #666; font-weight: bold;">🏦 貯金額（合計）</div>
                    <div style="font-size: 1.5rem; font-weight: 800; color: #2E7D32; margin-top: 4px;">${formatCoin(totalSavings)}</div>
                </div>
                <div class="card" style="padding: 1rem; text-align: center; border-left: 4px solid #42A5F5;">
                    <div style="font-size: 0.85rem; color: #666; font-weight: bold;">登録中のこども</div>
                    <div style="font-size: 1.5rem; font-weight: bold; color: #1976D2; margin-top: 4px;">${children.length}人</div>
                </div>
                <div class="card" style="padding: 1rem; text-align: center; border-left: 4px solid #FFD700;">
                    <div style="font-size: 0.85rem; color: #666; font-weight: bold;">有効なクエスト</div>
                    <div style="font-size: 1.5rem; font-weight: bold; color: #F57F17; margin-top: 4px;">${quests.filter((q: any) => q.is_active).length}件</div>
                </div>
            </div>
        `;

        // 2. Approvals (Quests)
        const questBadge = pendingQuests.length > 0 ? `<span style="background: #E65100; color: white; font-size: 0.8rem; font-weight: bold; padding: 2px 8px; border-radius: 12px; margin-left: 8px;">${pendingQuests.length}</span>` : '';
        approvalsSection.innerHTML = `<h2 style="font-size: 1.25rem; margin-bottom: 0.75rem; color: #333; display: flex; align-items: center;">承認待ちのクエスト ${questBadge}</h2>`;
        if (pendingQuests.length === 0) {
            approvalsSection.innerHTML += '<div class="card" style="padding: 1rem; text-align: center; color: #888; margin-bottom: 1.5rem;">現在、承認待ちのクエスト報告はありません</div>';
        } else {
            pendingQuests.forEach((sub: any) => {
                const quest = quests.find((q: any) => q.id === sub.quest_id);
                const child = children.find((c: any) => c.id === sub.child_id);
                const childName = child?.display_name || 'こども';
                const questTitle = quest?.title || sub.quest_title || 'クエスト';

                const card = document.createElement('div');
                card.className = 'card approval-card';
                card.style.marginBottom = '1rem';
                card.style.borderLeft = '4px solid #FFA726';
                card.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <h3 style="margin: 0; font-size: 1.1rem;">${childName}</h3>
                        <span style="color: #666; font-size: 0.8em;">${formatDate(sub.submitted_at)}</span>
                    </div>
                    <p style="margin: 6px 0; font-weight: bold; color: #333;">クエスト: ${questTitle}</p>
                    ${(quest?.reward_amount || sub.reward_amount) ? `<p style="margin: 4px 0; color: #F57F17; font-weight: bold;">報酬: ${formatCoin(quest?.reward_amount ?? sub.reward_amount)}</p>` : ''}
                    ${sub.photo_url ? `<img src="${sub.photo_url}" style="width: 100%; max-height: 180px; object-fit: cover; border-radius: 8px; margin: 8px 0;" alt="提出写真" />` : ''}
                    <div style="display: flex; gap: 10px; margin-top: 12px;">
                        <button class="approve-btn btn-primary" style="flex: 1; min-height: 44px; border-radius: 8px; border: none; background: #4CAF50; color: white; font-weight: bold; cursor: pointer;">承認する</button>
                        <button class="reject-btn" style="flex: 1; min-height: 44px; border-radius: 8px; border: 1px solid #EF5350; background: white; color: #EF5350; font-weight: bold; cursor: pointer;">差し戻し</button>
                    </div>
                `;

                const approveBtn = card.querySelector('.approve-btn') as HTMLButtonElement;
                approveBtn.onclick = async () => {
                    try {
                        approveBtn.disabled = true;
                        approveBtn.textContent = '承認中...';
                        await questService.approveSubmission(sub.id);
                        await refreshData();
                        showToast(`${childName}のクエストを承認しました！報酬を付与しました`, 'success');
                    } catch (err: any) {
                        showToast(err.message || '承認に失敗しました', 'error');
                        approveBtn.disabled = false;
                        approveBtn.textContent = '承認する';
                    }
                };

                const rejectBtn = card.querySelector('.reject-btn') as HTMLButtonElement;
                rejectBtn.onclick = () => {
                    const modalContent = document.createElement('div');
                    modalContent.innerHTML = `
                        <p style="margin-bottom: 0.75rem; color: #333; line-height: 1.5;">
                            <strong>${childName}</strong> の「<strong>${questTitle}</strong>」を差し戻します。<br>
                            お子さまに伝えたい理由やアドバイスを入力してください。
                        </p>
                        <label style="display: block; font-weight: bold; font-size: 0.9rem; color: #555; margin-bottom: 6px;">差し戻しの理由・コメント</label>
                        <textarea id="reject-comment-input" rows="3" placeholder="例: もう少しきれいに片付けてみてね！" style="width: 100%; padding: 0.6rem; border-radius: 8px; border: 1px solid #ccc; font-size: 0.95rem; box-sizing: border-box; resize: vertical; margin-bottom: 1.25rem; font-family: inherit;"></textarea>
                        <div style="display: flex; gap: 10px;">
                            <button id="cancel-reject-btn" style="flex: 1; min-height: 44px; border-radius: 8px; border: 1px solid #ccc; background: white; cursor: pointer;">キャンセル</button>
                            <button id="submit-reject-btn" style="flex: 1; min-height: 44px; border-radius: 8px; border: none; background: #EF5350; color: white; font-weight: bold; cursor: pointer;">差し戻す</button>
                        </div>
                    `;

                    const modalObj = showModal({ title: 'クエストの差し戻し', content: modalContent });

                    const cancelBtn = modalContent.querySelector('#cancel-reject-btn') as HTMLButtonElement;
                    if (cancelBtn) cancelBtn.onclick = () => modalObj.close();

                    const submitBtn = modalContent.querySelector('#submit-reject-btn') as HTMLButtonElement;
                    const commentInput = modalContent.querySelector('#reject-comment-input') as HTMLTextAreaElement;

                    if (submitBtn && commentInput) {
                        submitBtn.onclick = async () => {
                            const comment = commentInput.value.trim() || 'もう一度がんばってみよう！';
                            try {
                                submitBtn.disabled = true;
                                submitBtn.textContent = '処理中...';
                                await questService.rejectSubmission(sub.id, comment);
                                await refreshData();
                                modalObj.close();
                                showToast('クエストを差し戻しました', 'info');
                            } catch (err: any) {
                                showToast(err.message || '処理に失敗しました', 'error');
                                submitBtn.disabled = false;
                                submitBtn.textContent = '差し戻す';
                            }
                        };
                    }
                };

                approvalsSection.appendChild(card);
            });
        }

        // 3. Withdrawals
        const wdBadge = pendingWithdrawals.length > 0 ? `<span style="background: #1976D2; color: white; font-size: 0.8rem; font-weight: bold; padding: 2px 8px; border-radius: 12px; margin-left: 8px;">${pendingWithdrawals.length}</span>` : '';
        withdrawalsSection.innerHTML = `<h2 style="font-size: 1.25rem; margin-bottom: 0.75rem; color: #333; display: flex; align-items: center;">出金リクエスト ${wdBadge}</h2>`;
        if (pendingWithdrawals.length === 0) {
            withdrawalsSection.innerHTML += '<div class="card" style="padding: 1rem; text-align: center; color: #888; margin-bottom: 1.5rem;">出金リクエストはありません</div>';
        } else {
            pendingWithdrawals.forEach((req: any) => {
                const child = children.find((c: any) => c.id === req.child_id);
                const childName = child?.display_name || 'こども';

                const displayPurpose = (req.purpose || '記載なし').replace(/\[[^\]]+\]/, '').trim();

                const card = document.createElement('div');
                card.className = 'card';
                card.style.marginBottom = '1rem';
                card.style.borderLeft = '4px solid #42A5F5';
                card.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <h3 style="margin: 0; font-size: 1.1rem;">${childName}</h3>
                        <span style="background: ${req.source_account === 'SPENDING' ? '#E3F2FD' : '#E8F5E9'}; color: ${req.source_account === 'SPENDING' ? '#1565C0' : '#2E7D32'}; font-size: 0.8rem; font-weight: bold; padding: 2px 8px; border-radius: 6px;">${req.source_account === 'SPENDING' ? '💳 つかえるお金から' : '🏦 貯金から'}</span>
                    </div>
                    <p style="font-size: 1.2rem; font-weight: bold; color: #E65100; margin: 6px 0;">${formatCoin(req.amount)}</p>
                    <p style="margin: 4px 0; color: #555;">つかいみち: ${displayPurpose}</p>
                    <div style="display: flex; gap: 10px; margin-top: 12px;">
                        <button class="approve-w-btn" style="flex: 1; min-height: 44px; border-radius: 8px; border: none; background: #4CAF50; color: white; font-weight: bold; cursor: pointer;">承認</button>
                        <button class="reject-w-btn" style="flex: 1; min-height: 44px; border-radius: 8px; border: 1px solid #EF5350; background: white; color: #EF5350; font-weight: bold; cursor: pointer;">差し戻し</button>
                    </div>
                `;

                const appWBtn = card.querySelector('.approve-w-btn') as HTMLButtonElement;
                appWBtn.onclick = async () => {
                    try {
                        appWBtn.disabled = true;
                        appWBtn.textContent = '承認中...';
                        await withdrawalService.approveWithdrawal(req.id);
                        await refreshData();
                        showToast(`${childName}の出金を承認しました`, 'success');
                    } catch (err: any) {
                        showToast(err.message || '失敗しました', 'error');
                        appWBtn.disabled = false;
                        appWBtn.textContent = '承認';
                    }
                };

                const rejWBtn = card.querySelector('.reject-w-btn') as HTMLButtonElement;
                rejWBtn.onclick = () => {
                    const modalContent = document.createElement('div');
                    modalContent.innerHTML = `
                        <p style="margin-bottom: 0.75rem; color: #333; line-height: 1.5;">
                            <strong>${childName}</strong> の出金リクエスト「<strong>${formatCoin(req.amount)} (${displayPurpose})</strong>」を差し戻します。<br>
                            お子さまに伝えたい理由やアドバイスを入力してください。
                        </p>
                        <label style="display: block; font-weight: bold; font-size: 0.9rem; color: #555; margin-bottom: 6px;">差し戻しの理由・コメント</label>
                        <textarea id="reject-withdrawal-comment-input" rows="3" placeholder="例: 今月は使いすぎだから、また来月考えようね" style="width: 100%; padding: 0.6rem; border-radius: 8px; border: 1px solid #ccc; font-size: 0.95rem; box-sizing: border-box; resize: vertical; margin-bottom: 1.25rem; font-family: inherit;"></textarea>
                        <div style="display: flex; gap: 10px;">
                            <button id="cancel-reject-w-btn" style="flex: 1; min-height: 44px; border-radius: 8px; border: 1px solid #ccc; background: white; cursor: pointer;">キャンセル</button>
                            <button id="submit-reject-w-btn" style="flex: 1; min-height: 44px; border-radius: 8px; border: none; background: #EF5350; color: white; font-weight: bold; cursor: pointer;">差し戻す</button>
                        </div>
                    `;

                    const modalObj = showModal({ title: '出金リクエストの差し戻し', content: modalContent });

                    const cancelBtn = modalContent.querySelector('#cancel-reject-w-btn') as HTMLButtonElement;
                    if (cancelBtn) cancelBtn.onclick = () => modalObj.close();

                    const submitBtn = modalContent.querySelector('#submit-reject-w-btn') as HTMLButtonElement;
                    const commentInput = modalContent.querySelector('#reject-withdrawal-comment-input') as HTMLTextAreaElement;

                    if (submitBtn && commentInput) {
                        submitBtn.onclick = async () => {
                            const comment = commentInput.value.trim() || 'また今度考えようね！';
                            try {
                                submitBtn.disabled = true;
                                submitBtn.textContent = '処理中...';
                                await withdrawalService.rejectWithdrawal(req.id, comment);
                                await refreshData();
                                modalObj.close();
                                showToast('出金リクエストを差し戻しました', 'info');
                            } catch (err: any) {
                                showToast(err.message || '失敗しました', 'error');
                                submitBtn.disabled = false;
                                submitBtn.textContent = '差し戻す';
                            }
                        };
                    }
                };

                withdrawalsSection.appendChild(card);
            });
        }

        // 4. Children
        childrenSection.innerHTML = '<h2 style="font-size: 1.25rem; margin-bottom: 0.75rem; color: #333;">こどもたち</h2>';
        if (children.length === 0) {
            childrenSection.innerHTML += '<div class="card" style="padding: 1rem; text-align: center; color: #888; margin-bottom: 1.5rem;">登録されているこどもがいません</div>';
        } else {
            children.forEach((child: any) => {
                const card = document.createElement('div');
                card.className = 'card';
                card.style.marginBottom = '0.75rem';
                card.style.display = 'flex';
                card.style.alignItems = 'center';
                card.style.gap = '12px';
                
                const displayName = child.display_name || child.nickname || 'こども';
                const initial = displayName ? displayName[0] : '?';
                const acc = getChildAccount(child.id);
                const spending = acc?.spending_balance ?? (child as any).spending_balance ?? 0;
                const savings = acc?.savings_balance ?? (child as any).savings_balance ?? 0;

                card.innerHTML = `
                    <div style="width: 44px; height: 44px; border-radius: 22px; background: #5C6BC0; color: white; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; font-weight: bold; flex-shrink: 0;">
                        ${initial}
                    </div>
                    <div style="flex-grow: 1;">
                        <h3 style="margin: 0; font-size: 1.05rem;">${displayName}</h3>
                        <div style="font-size: 0.85em; color: #666; margin-top: 2px;">
                            つかえる: <strong style="color: #FF7043; font-size: 1.05em;">${formatCoin(spending)}</strong> | 貯金: <strong style="color: #4CAF50; font-size: 1.05em;">${formatCoin(savings)}</strong>
                        </div>
                    </div>
                `;
                childrenSection.appendChild(card);
            });
        }

        // 5. Family Code
        const code = state.family?.family_code || '------';
        familyCodeSection.innerHTML = `
            <div class="card" style="margin-top: 1.5rem; text-align: center; background: linear-gradient(135deg, #E8EAF6, #C5CAE9); border: 1px solid #9FA8DA;">
                <p style="margin: 0; color: #3F51B5; font-weight: bold; font-size: 0.9rem;">ファミリーコード</p>
                <h2 style="margin: 8px 0; letter-spacing: 4px; font-size: 2rem; color: #1A237E; font-family: monospace;">${code}</h2>
                <button id="copy-code-btn" style="min-height: 40px; padding: 0 1.5rem; border-radius: 20px; border: none; background: #3F51B5; color: white; font-weight: bold; cursor: pointer;">コードをコピー</button>
            </div>
        `;

        const copyBtn = familyCodeSection.querySelector('#copy-code-btn') as HTMLButtonElement;
        if (copyBtn) {
            copyBtn.onclick = () => {
                navigator.clipboard.writeText(code);
                showToast('ファミリーコードをコピーしました！', 'info');
            };
        }
    };

    store.onAny(render);
    render();

    // 画面マウント時に提出物や出金申請の最新データを取得
    const refreshData = async () => {
        const localData = getLocalData();
        const family = store.get('family') || localData.families[0];
        const familyId = family?.id || store.get('currentUser')?.family_id;
        if (familyId) {
            try {
                const deletedIds = new Set(localData.deletedChildIds || []);

                let mergedChildren: any[] = [];
                if (isSupabaseConfigured) {
                    const { data: remoteChildren } = await supabase.from('users')
                        .select('*')
                        .eq('family_id', familyId)
                        .eq('role', 'CHILD');
                    if (remoteChildren) {
                        mergedChildren = remoteChildren.filter((c: any) => !deletedIds.has(c.id));
                    }
                }
                const localChildren = localData.users.filter(u => u.family_id === familyId && u.role === 'CHILD' && !deletedIds.has(u.id));
                localChildren.forEach(lc => {
                    if (!mergedChildren.some(mc => mc.id === lc.id)) {
                        mergedChildren.push(lc);
                    }
                });
                store.set('children', mergedChildren);

                const subs = await questService.getSubmissions(familyId);
                const localSubs = (localData.submissions || []).filter(s => (s.family_id === familyId || !s.family_id) && !deletedIds.has(s.child_id));
                const subMap = new Map<string, any>();
                subs.forEach(s => subMap.set(s.id, s));
                localSubs.forEach(s => subMap.set(s.id, s));
                store.set('submissions', Array.from(subMap.values()));

                const wds = await withdrawalService.getWithdrawals(familyId);
                const localWds = (localData.withdrawals || []).filter(w => (w.family_id === familyId || !w.family_id) && !deletedIds.has(w.child_id));
                const wdMap = new Map<string, any>();
                wds.forEach(w => wdMap.set(w.id, w));
                localWds.forEach(w => wdMap.set(w.id, w));
                store.set('withdrawals', Array.from(wdMap.values()));

                const qs = await questService.getAllQuests(familyId);
                const localQuests = localData.quests || [];
                const qMap = new Map<string, any>();
                qs.forEach(q => qMap.set(q.id, q));
                localQuests.forEach(q => qMap.set(q.id, q));
                store.set('quests', Array.from(qMap.values()));

                const accs = await accountService.getAccountsForFamily(familyId);
                store.set('accounts', accs.filter((a: any) => !deletedIds.has(a.child_id)));
            } catch (e) {
                console.warn('Failed to refresh dashboard data:', e);
            }
        }
    };
    refreshData();

    const applyFresh = () => {
        const fresh = getLocalData();
        if (fresh.accounts && fresh.accounts.length > 0) {
            store.set('accounts', fresh.accounts);
        }
        if (fresh.quests && fresh.quests.length > 0) {
            store.set('quests', fresh.quests);
        }
        if (fresh.submissions) {
            store.set('submissions', fresh.submissions);
        }
        if (fresh.withdrawals) {
            store.set('withdrawals', fresh.withdrawals);
        }
    };

    const onStorage = (e: StorageEvent) => {
        if (e.key === 'moneytree_data') {
            applyFresh();
            refreshData();
        }
    };
    const onLocalChange = () => {
        applyFresh();
        refreshData();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('moneytree_local_change', onLocalChange);
    window.addEventListener('focus', refreshData);

    const family = store.get('family');
    const subSub = questService.subscribeToSubmissions(family?.id || '', () => refreshData());
    const questSub = questService.subscribeToQuests(family?.id || '', () => refreshData());
    const wdSub = withdrawalService.subscribeToWithdrawals(family?.id || '', () => refreshData());
    const accSub = accountService.subscribeToFamilyAccounts(family?.id || '', () => refreshData());
    const pollInterval = window.setInterval(refreshData, 3000);

    router.onCleanup(() => {
        window.clearInterval(pollInterval);
        subSub.unsubscribe();
        questSub.unsubscribe();
        wdSub.unsubscribe();
        accSub.unsubscribe();
        window.removeEventListener('storage', onStorage);
        window.removeEventListener('moneytree_local_change', onLocalChange);
        window.removeEventListener('focus', refreshData);
    });

    return container;
}

