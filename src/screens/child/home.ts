import { router } from '../../lib/router';
import { store } from '../../lib/store';
import { createBalanceBar } from '../../components/balance-bar';
import { createMoneyTreeCanvas } from '../../components/money-tree';
import { createNavBar } from '../../components/nav';
import { createQuestCard } from '../../components/quest-card';
import { showModal } from '../../components/modal';
import { showToast } from '../../components/toast';
import { getTreeLevel } from '../../types/models';
import type { MoneyTree } from '../../components/money-tree';
import { questService } from '../../services/quest.service';
import { accountService } from '../../services/account.service';
import { withdrawalService } from '../../services/withdrawal.service';
import { interestService } from '../../services/interest.service';
import { soundManager } from '../../utils/sound';
import { fireSuccess } from '../../utils/confetti';
import { formatCoin } from '../../utils/format';
import { getLocalData, saveLocalData } from '../../services/local-data';

export function createChildHome(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'screen-container child-theme child-home-container';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.minHeight = '100vh';
    container.style.paddingBottom = '5.5rem';
    container.style.overflowY = 'auto';

    // 1. Top: Child Header (Profile & Logout button)
    const headerRow = document.createElement('div');
    headerRow.className = 'child-header';
    
    const profileInfo = document.createElement('div');
    profileInfo.className = 'child-profile-info';
    
    const avatarBadge = document.createElement('div');
    avatarBadge.className = 'child-avatar-badge';
    avatarBadge.innerText = '🧒';
    
    const nameText = document.createElement('span');
    nameText.className = 'child-name-text';
    nameText.innerText = 'おともだち';
    
    profileInfo.appendChild(avatarBadge);
    profileInfo.appendChild(nameText);
    headerRow.appendChild(profileInfo);

    const logoutBtn = document.createElement('button');
    logoutBtn.className = 'btn-child-logout';
    logoutBtn.innerHTML = '<span>🚪 おわる</span>';
    logoutBtn.title = 'ログアウト';
    logoutBtn.onclick = () => {
        router.navigate('/child/logout');
    };
    headerRow.appendChild(logoutBtn);
    container.appendChild(headerRow);

    // 2. Balance Bar & Quick Actions
    const topSection = document.createElement('div');
    topSection.appendChild(createBalanceBar());

    const actionsRow = document.createElement('div');
    actionsRow.style.display = 'flex';
    actionsRow.style.gap = '10px';
    actionsRow.style.padding = '0 1rem';
    actionsRow.style.marginTop = '0.5rem';

    const spendBtn = document.createElement('button');
    spendBtn.className = 'action-pill-btn';
    spendBtn.style.flex = '1';
    spendBtn.style.minHeight = '46px';
    spendBtn.style.background = 'linear-gradient(135deg, #42A5F5, #1E88E5)';
    spendBtn.style.color = '#fff';
    spendBtn.style.border = 'none';
    spendBtn.style.borderRadius = '14px';
    spendBtn.style.fontWeight = 'bold';
    spendBtn.style.fontSize = '0.95rem';
    spendBtn.style.cursor = 'pointer';
    spendBtn.style.boxShadow = '0 3px 8px rgba(33, 150, 243, 0.3)';
    spendBtn.style.display = 'flex';
    spendBtn.style.alignItems = 'center';
    spendBtn.style.justifyContent = 'center';
    spendBtn.style.gap = '6px';
    spendBtn.innerHTML = '<span>🛍️</span><span>つかう</span>';
    spendBtn.onclick = () => openSpendModal();

    const transferBtn = document.createElement('button');
    transferBtn.className = 'action-pill-btn';
    transferBtn.style.flex = '1';
    transferBtn.style.minHeight = '46px';
    transferBtn.style.background = 'linear-gradient(135deg, #66BB6A, #43A047)';
    transferBtn.style.color = '#fff';
    transferBtn.style.border = 'none';
    transferBtn.style.borderRadius = '14px';
    transferBtn.style.fontWeight = 'bold';
    transferBtn.style.fontSize = '0.95rem';
    transferBtn.style.cursor = 'pointer';
    transferBtn.style.boxShadow = '0 3px 8px rgba(76, 175, 80, 0.3)';
    transferBtn.style.display = 'flex';
    transferBtn.style.alignItems = 'center';
    transferBtn.style.justifyContent = 'center';
    transferBtn.style.gap = '6px';
    transferBtn.innerHTML = '<span>🔄</span><span>おかねを うつす</span>';
    transferBtn.onclick = () => openTransferModal();

    actionsRow.appendChild(spendBtn);
    actionsRow.appendChild(transferBtn);
    topSection.appendChild(actionsRow);
    container.appendChild(topSection);

    const getFreshAccount = (): any => {
        const state = store.getState();
        const childId = state?.currentUser?.id;
        if (!childId) return null;
        const local = getLocalData();
        const localAcc = local.accounts?.find((a: any) => a.child_id === childId);
        const storeAcc = state?.account;
        if (!storeAcc && !localAcc) return null;
        if (!storeAcc) return localAcc;
        if (!localAcc) return storeAcc;
        const localTotal = (localAcc.spending_balance || 0) + (localAcc.savings_balance || 0);
        const storeTotal = (storeAcc.spending_balance || 0) + (storeAcc.savings_balance || 0);
        if ((localAcc as any)._local_transfer_at) return localAcc;
        if (localTotal > 0 && storeTotal === 0) return localAcc;
        if (storeTotal > 0 && localTotal === 0) return storeAcc;
        return storeAcc;
    };

    const openSpendModal = () => {
        const state = store.getState();
        const child = state?.currentUser;
        const family = state?.family;
        if (!child) return;

        const currentAcc = getFreshAccount();
        const spending = currentAcc?.spending_balance || 0;

        const content = document.createElement('div');
        content.innerHTML = `
            <div id="spend-error" style="color: #EF5350; margin-bottom: 10px; display: none;"></div>

            <div style="background: #E3F2FD; padding: 0.75rem; border-radius: 10px; margin-bottom: 1rem; font-size: 0.95rem; color: #1565C0;">
                💳 <strong>いま つかえるおかね:</strong> <span style="font-weight: 800; font-size: 1.15rem; color: #0D47A1;">${formatCoin(spending)}</span>
            </div>

            <label style="display: block; font-weight: bold; font-size: 0.9em; margin-bottom: 4px;">いくら つかう？（コイン）</label>
            <input type="number" id="spend-amount" placeholder="例: 100" min="1" max="${spending}" style="width: 100%; min-height: 48px; margin-bottom: 1rem; padding: 0.5rem; border-radius: 8px; border: 1px solid #ccc; font-size: 1.1rem; font-weight: bold;">

            <label style="display: block; font-weight: bold; font-size: 0.9em; margin-bottom: 4px;">つかいみち（なにに つかう？）</label>
            <input type="text" id="spend-purpose" placeholder="例: おかし、ノート、ジュース" style="width: 100%; min-height: 48px; margin-bottom: 1rem; padding: 0.5rem; border-radius: 8px; border: 1px solid #ccc; font-size: 1rem;">

            <div style="background: #FFF9C4; border: 1px solid #FBC02D; padding: 0.75rem; border-radius: 8px; margin-bottom: 1.25rem; font-size: 0.85rem; color: #F57F17; line-height: 1.4;">
                💌 <strong>おとなのひとに おねがいを おくるよ！</strong><br>
                おとなのひとが「いいよ！」と しょうにんしたら、つかえるようになるよ。
            </div>

            <button id="submit-spend-btn" class="primary-btn btn-primary" style="width: 100%; min-height: 50px; font-weight: bold; border-radius: 12px; border: none; cursor: pointer; color: white; font-size: 1.05rem; background: linear-gradient(135deg, #1976D2, #0D47A1);">
                💌 おねがいを おくる
            </button>
        `;

        let modalObj: { close: () => void } | null = null;
        const submitBtn = content.querySelector('#submit-spend-btn') as HTMLButtonElement;
        submitBtn.onclick = async () => {
            const amountInput = content.querySelector('#spend-amount') as HTMLInputElement;
            const purposeInput = content.querySelector('#spend-purpose') as HTMLInputElement;
            const errDiv = content.querySelector('#spend-error') as HTMLDivElement;

            const amount = parseInt(amountInput.value, 10);
            const purpose = purposeInput.value.trim();

            const fresh = getFreshAccount();
            const freshSpending = fresh?.spending_balance || 0;

            if (isNaN(amount) || amount <= 0) {
                errDiv.textContent = '1コインいじょうの かずをいれてね！';
                errDiv.style.display = 'block';
                return;
            }
            if (amount > freshSpending) {
                errDiv.textContent = 'つかえるおかねが たりないよ！';
                errDiv.style.display = 'block';
                return;
            }
            if (!purpose) {
                errDiv.textContent = 'つかいみちを かいてね！';
                errDiv.style.display = 'block';
                return;
            }

            try {
                submitBtn.disabled = true;
                submitBtn.textContent = 'おねがい中...';
                await withdrawalService.createWithdrawalRequest(
                    child.id,
                    child.family_id || family?.id || '',
                    amount,
                    purpose,
                    'SPENDING'
                );
                const updated = await withdrawalService.getWithdrawals(child.id);
                store.set('withdrawals', updated);

                soundManager.play('success');
                showToast('おとなのひとに おねがいを おくったよ！', 'success');
                modalObj?.close();
            } catch (err: any) {
                errDiv.textContent = err.message || 'おねがいをおくるのに しっぱいしたよ';
                errDiv.style.display = 'block';
                submitBtn.disabled = false;
                submitBtn.textContent = '💌 おねがいを おくる';
            }
        };

        modalObj = showModal({ title: 'つかえるおかねを つかう 🛍️', content });
    };

    const openTransferModal = () => {
        const state = store.getState();
        const child = state?.currentUser;
        if (!child) return;

        let currentAcc = getFreshAccount();
        let spending = currentAcc?.spending_balance || 0;
        let savings = currentAcc?.savings_balance || 0;

        let selectedDirection: 'SPENDING_TO_SAVINGS' | 'SAVINGS_TO_SPENDING' = 
            (spending === 0 && savings > 0) ? 'SAVINGS_TO_SPENDING' : 'SPENDING_TO_SAVINGS';

        const content = document.createElement('div');
        content.innerHTML = `
            <div id="transfer-error" style="color: #EF5350; margin-bottom: 10px; display: none; font-weight: bold; background: #FFEBEE; padding: 8px 12px; border-radius: 8px; border-left: 4px solid #EF5350;"></div>

            <div style="display: flex; gap: 8px; margin-bottom: 1rem;">
                <div style="flex: 1; background: #E3F2FD; padding: 0.6rem; border-radius: 8px; text-align: center;">
                    <div style="font-size: 0.8rem; color: #1565C0;">💳 つかえるおかね</div>
                    <div id="display-spending-val" style="font-weight: 800; font-size: 1.15rem; color: #0D47A1;">${formatCoin(spending)}</div>
                </div>
                <div style="flex: 1; background: #E8F5E9; padding: 0.6rem; border-radius: 8px; text-align: center;">
                    <div style="font-size: 0.8rem; color: #2E7D32;">🏦 ちょきんばこ</div>
                    <div id="display-savings-val" style="font-weight: 800; font-size: 1.15rem; color: #1B5E20;">${formatCoin(savings)}</div>
                </div>
            </div>

            <label style="display: block; font-weight: bold; font-size: 0.9em; margin-bottom: 6px;">どっちに うつす？</label>
            <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 1rem;">
                <div class="direction-option" data-dir="SPENDING_TO_SAVINGS" style="display: flex; align-items: center; gap: 10px; padding: 12px; border: 2px solid ${selectedDirection === 'SPENDING_TO_SAVINGS' ? '#4CAF50' : '#ccc'}; border-radius: 10px; cursor: pointer; background: ${selectedDirection === 'SPENDING_TO_SAVINGS' ? '#F1F8E9' : '#fff'}; transition: all 0.2s;">
                    <input type="radio" name="direction" value="SPENDING_TO_SAVINGS" ${selectedDirection === 'SPENDING_TO_SAVINGS' ? 'checked' : ''} style="accent-color: #4CAF50; transform: scale(1.3); cursor: pointer;">
                    <div style="flex: 1;">
                        <span style="font-size: 0.95rem; font-weight: bold; color: #2E7D32;">💳 つかえる ➔ 🏦 ちょきんばこ</span>
                        <div style="font-size: 0.75rem; color: #666;">（うつせる最大: ${formatCoin(spending)}）</div>
                    </div>
                </div>
                <div class="direction-option" data-dir="SAVINGS_TO_SPENDING" style="display: flex; align-items: center; gap: 10px; padding: 12px; border: 2px solid ${selectedDirection === 'SAVINGS_TO_SPENDING' ? '#2196F3' : '#ccc'}; border-radius: 10px; cursor: pointer; background: ${selectedDirection === 'SAVINGS_TO_SPENDING' ? '#E3F2FD' : '#fff'}; transition: all 0.2s;">
                    <input type="radio" name="direction" value="SAVINGS_TO_SPENDING" ${selectedDirection === 'SAVINGS_TO_SPENDING' ? 'checked' : ''} style="accent-color: #2196F3; transform: scale(1.3); cursor: pointer;">
                    <div style="flex: 1;">
                        <span style="font-size: 0.95rem; font-weight: bold; color: #1565C0;">🏦 ちょきんばこ ➔ 💳 つかえる</span>
                        <div style="font-size: 0.75rem; color: #666;">（うつせる最大: ${formatCoin(savings)}）</div>
                    </div>
                </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <label style="font-weight: bold; font-size: 0.9em;">いくら うつす？（コイン）</label>
                <span id="max-transfer-hint" style="font-size: 0.8rem; color: #666; font-weight: bold;"></span>
            </div>
            <input type="number" id="transfer-amount" placeholder="例: 100" min="1" style="width: 100%; min-height: 48px; margin-bottom: 0.5rem; padding: 0.5rem; border-radius: 8px; border: 1px solid #ccc; font-size: 1.15rem; font-weight: bold; box-sizing: border-box;">

            <!-- クイック金額選択ボタン -->
            <div id="quick-amount-buttons" style="display: flex; gap: 6px; margin-bottom: 1.25rem; flex-wrap: wrap;"></div>

            <button id="submit-transfer-btn" class="primary-btn btn-primary" style="width: 100%; min-height: 50px; font-weight: bold; border-radius: 12px; border: none; cursor: pointer; color: white; font-size: 1.05rem; background: linear-gradient(135deg, #4CAF50, #2E7D32);">
                🔄 おかねを うつす
            </button>
        `;

        let modalObj: { close: () => void } | null = null;
        const dirCards = content.querySelectorAll('.direction-option') as NodeListOf<HTMLDivElement>;
        const amountInput = content.querySelector('#transfer-amount') as HTMLInputElement;
        const maxHint = content.querySelector('#max-transfer-hint') as HTMLElement;
        const quickBtnsWrap = content.querySelector('#quick-amount-buttons') as HTMLElement;
        const errDiv = content.querySelector('#transfer-error') as HTMLDivElement;
        const submitBtn = content.querySelector('#submit-transfer-btn') as HTMLButtonElement;

        const updateDirectionUI = () => {
            currentAcc = getFreshAccount();
            spending = currentAcc?.spending_balance || 0;
            savings = currentAcc?.savings_balance || 0;

            const maxAvailable = selectedDirection === 'SPENDING_TO_SAVINGS' ? spending : savings;
            amountInput.max = String(maxAvailable);
            maxHint.textContent = `最大 ${formatCoin(maxAvailable)}`;

            dirCards.forEach(card => {
                const dir = card.getAttribute('data-dir');
                const radio = card.querySelector('input') as HTMLInputElement;
                if (dir === selectedDirection) {
                    radio.checked = true;
                    card.style.border = selectedDirection === 'SPENDING_TO_SAVINGS' ? '2px solid #4CAF50' : '2px solid #2196F3';
                    card.style.background = selectedDirection === 'SPENDING_TO_SAVINGS' ? '#F1F8E9' : '#E3F2FD';
                } else {
                    radio.checked = false;
                    card.style.border = '1px solid #ccc';
                    card.style.background = '#fff';
                }
            });

            // Quick amount buttons
            quickBtnsWrap.innerHTML = '';
            const presets = [
                { label: 'ぜんぶ', val: maxAvailable },
                { label: 'はんぶん', val: Math.floor(maxAvailable / 2) },
                { label: '100', val: 100 },
                { label: '50', val: 50 },
                { label: '10', val: 10 },
            ];
            presets.filter(p => p.val > 0 && p.val <= maxAvailable).forEach(p => {
                const qBtn = document.createElement('button');
                qBtn.type = 'button';
                qBtn.textContent = p.label === 'ぜんぶ' || p.label === 'はんぶん' ? `${p.label} (${p.val})` : `${p.val}コイン`;
                qBtn.style.cssText = 'padding: 4px 10px; font-size: 0.8rem; font-weight: bold; border-radius: 8px; border: 1px solid #81C784; background: #fff; color: #2E7D32; cursor: pointer;';
                qBtn.onclick = () => {
                    amountInput.value = String(p.val);
                    errDiv.style.display = 'none';
                };
                quickBtnsWrap.appendChild(qBtn);
            });
        };

        dirCards.forEach(card => {
            card.onclick = () => {
                selectedDirection = card.getAttribute('data-dir') as 'SPENDING_TO_SAVINGS' | 'SAVINGS_TO_SPENDING';
                updateDirectionUI();
            };
        });

        updateDirectionUI();

        submitBtn.onclick = async () => {
            currentAcc = getFreshAccount();
            spending = currentAcc?.spending_balance || 0;
            savings = currentAcc?.savings_balance || 0;

            const amount = parseInt(amountInput.value, 10);
            const maxAvailable = selectedDirection === 'SPENDING_TO_SAVINGS' ? spending : savings;

            if (isNaN(amount) || amount <= 0) {
                errDiv.textContent = '1コインいじょうの かずをいれてね！';
                errDiv.style.display = 'block';
                return;
            }

            if (amount > maxAvailable) {
                errDiv.textContent = selectedDirection === 'SPENDING_TO_SAVINGS'
                    ? 'つかえるおかねが たりないよ！'
                    : 'ちょきんが たりないよ！';
                errDiv.style.display = 'block';
                return;
            }

            try {
                submitBtn.disabled = true;
                submitBtn.textContent = 'うつし中...';
                const updatedAccount = await accountService.transferMoney(child.id, selectedDirection, amount);
                if (updatedAccount) {
                    store.set('account', updatedAccount);
                }
                const updatedTx = await accountService.getTransactions(child.id);
                if (updatedTx) {
                    store.set('transactions', updatedTx);
                }

                soundManager.play('celebrate');
                fireSuccess();
                showToast(`${amount} コインを うつしたよ！✨`, 'success');
                modalObj?.close();
            } catch (err: any) {
                errDiv.textContent = err.message || 'うつすのに しっぱいしたよ';
                errDiv.style.display = 'block';
                submitBtn.disabled = false;
                submitBtn.textContent = '🔄 おかねを うつす';
            }
        };

        modalObj = showModal({ title: 'おかねを うつす 🔄', content });
    };

    // 3. Middle: Tree Container
    const middleSection = document.createElement('div');
    middleSection.className = 'tree-container';

    const treeBadge = document.createElement('div');
    treeBadge.className = 'tree-level-badge';
    middleSection.appendChild(treeBadge);

    const canvasContainer = document.createElement('div');
    canvasContainer.className = 'tree-canvas-wrapper';
    middleSection.appendChild(canvasContainer);

    const promptText = document.createElement('div');
    promptText.className = 'pulse-text';
    promptText.style.display = 'none';
    promptText.style.position = 'absolute';
    promptText.style.bottom = '12px';
    promptText.style.background = '#FFD700';
    promptText.style.color = '#000';
    promptText.style.padding = '8px 16px';
    promptText.style.borderRadius = '20px';
    promptText.style.fontWeight = '800';
    promptText.style.fontSize = '0.9rem';
    promptText.style.boxShadow = '0 4px 12px rgba(255, 215, 0, 0.4)';
    promptText.style.cursor = 'pointer';
    promptText.innerText = '🍎 きのみを タップして しゅうかくしよう！';
    middleSection.appendChild(promptText);

    container.appendChild(middleSection);

    // 4. Bottom: Today's Quests Header & Horizontal Scroll
    const questsSection = document.createElement('div');
    questsSection.style.margin = '0.5rem 0 1rem';

    const sectionHeader = document.createElement('div');
    sectionHeader.className = 'child-section-header';
    sectionHeader.innerHTML = `
        <h3>📋 きょうの クエスト</h3>
        <a href="#/child/quests" class="see-all-link">ぜんぶみる ➔</a>
    `;
    questsSection.appendChild(sectionHeader);

    const quickListContainer = document.createElement('div');
    quickListContainer.className = 'quest-quick-list';
    questsSection.appendChild(quickListContainer);
    container.appendChild(questsSection);

    // 5. Fixed Footer: Nav bar
    container.appendChild(createNavBar('CHILD'));

    let moneyTree: MoneyTree | null = null;
    let lastRenderedQuestsKey = '';

    const render = () => {
        const state = store.getState();
        if (!state) return;

        // Update Child Header
        const user = state.currentUser;
        if (user) {
            nameText.innerText = `${user.display_name || 'おともだち'}`;
            avatarBadge.innerText = user.avatar_url || '🧒';
        }

        const currentAcc = getFreshAccount();
        const unclaimed = currentAcc?.unclaimed_interest ?? state.account?.unclaimed_interest ?? 0;
        const savings = currentAcc?.savings_balance ?? state.account?.savings_balance ?? 0;

        // Update Tree Badge
        const level = getTreeLevel(savings);
        treeBadge.innerText = `Lv.${level.level} ${level.name}`;

        // Prompt text visibility
        if (unclaimed > 0) {
            promptText.style.display = 'block';
        } else {
            promptText.style.display = 'none';
        }

        // Tree Canvas
        if (!moneyTree) {
            moneyTree = createMoneyTreeCanvas(canvasContainer, {
                savingsBalance: savings,
                unclaimedInterest: unclaimed,
                onFruitTap: async () => {
                    const child = store.get('currentUser');
                    if (!child) return;
                    try {
                        const harvested = await interestService.harvestInterest(child.id);
                        if (harvested > 0) {
                            soundManager.play('harvest');
                            fireSuccess();
                            showToast(`きんのきのみから ${harvested} コインを しゅうかくしたよ！🍎✨`, 'success');
                            promptText.style.display = 'none';
                        }
                    } catch (err: any) {
                        showToast(err.message || 'しゅうかくに しっぱいしたよ', 'error');
                    }
                }
            });
        } else {
            moneyTree.updateOptions({
                savingsBalance: savings,
                unclaimedInterest: unclaimed
            });
        }

        const currentChildId = state.currentUser?.id;
        const currentFamilyId = state.currentUser?.family_id || state.family?.id;
        const localData = getLocalData();
        const qMap = new Map<string, any>();
        (state.quests || []).forEach((q: any) => qMap.set(q.id, q));
        (localData.quests || []).forEach((q: any) => qMap.set(q.id, q));
        const rawQuests = Array.from(qMap.values());

        const subMap = new Map<string, any>();
        (localData.submissions || []).forEach((s: any) => {
            if (s && s.id) subMap.set(s.id, s);
        });
        (state.submissions || []).forEach((s: any) => {
            if (!s || !s.id) return;
            const existing = subMap.get(s.id);
            if (!existing) {
                subMap.set(s.id, s);
            } else {
                const status = (s.status === 'APPROVED' || s.status === 'REJECTED') ? s.status
                    : (existing.status === 'APPROVED' || existing.status === 'REJECTED') ? existing.status
                    : s.status;
                const parent_comment = s.parent_comment || existing.parent_comment;
                const reviewed_at = s.reviewed_at || existing.reviewed_at;
                subMap.set(s.id, { ...existing, ...s, status, parent_comment, reviewed_at });
            }
        });
        const rawSubs = Array.from(subMap.values());

        const pendingQuestIds = new Set(
            rawSubs
                .filter((s: any) => (!currentChildId || s.child_id === currentChildId) && s.status === 'PENDING')
                .map((s: any) => s.quest_id)
        );
        const activeQuests = rawQuests.filter((q: any) => {
            const isForFam = !currentFamilyId || !q.family_id || q.family_id === currentFamilyId;
            const isForMe = !q.assigned_child_id || q.assigned_child_id === currentChildId;
            return isForFam && q.is_active && isForMe && !pendingQuestIds.has(q.id);
        });
        const questsKey = JSON.stringify(activeQuests.slice(0, 4).map((q: any) => [q.id, q.title, q.reward_amount, q.is_active]));
        if (questsKey !== lastRenderedQuestsKey) {
            lastRenderedQuestsKey = questsKey;
            quickListContainer.innerHTML = '';
            if (activeQuests.length === 0) {
                const emptyMsg = document.createElement('div');
                emptyMsg.style.padding = '1rem';
                emptyMsg.style.color = '#777';
                emptyMsg.style.fontSize = '0.9rem';
                emptyMsg.style.background = 'rgba(255,255,255,0.7)';
                emptyMsg.style.borderRadius = '16px';
                emptyMsg.style.margin = '0 1rem';
                emptyMsg.innerText = 'きょうの クエストは ないよ！ゆっくりやすんでね 🎈';
                quickListContainer.appendChild(emptyMsg);
            } else {
                activeQuests.slice(0, 4).forEach((quest: any) => {
                    const latestSub = state.submissions?.filter((s: any) => s.quest_id === quest.id)
                        .sort((a: any, b: any) => new Date(b.submitted_at || 0).getTime() - new Date(a.submitted_at || 0).getTime())[0];
                    const card = createQuestCard(quest, latestSub?.status === 'REJECTED' ? latestSub : undefined, {
                        showActions: true,
                        onSubmit: () => router.navigate('/child/quests')
                    });
                    quickListContainer.appendChild(card);
                });
            }
        }
    };

    // Subscribe to store
    store.onAny(render);
    render();

    // Check interest calculation on mount
    const state = store.getState();
    if (state?.account && state?.family) {
        const rate = ((state.account.weekly_interest_rate ?? state.family.weekly_interest_rate) ?? 0.05) * 100;
        interestService.checkAndCalculateInterest(state.account, rate);
    }

    // 最新クエストと口座情報を自動取得（親が追加・無効化・承認した変更を即座に反映）
    const refreshData = async () => {
        const familyId = s?.family?.id || s?.currentUser?.family_id;
        if (familyId) {
            try {
                const quests = await questService.getAllQuests(familyId);
                store.set('quests', quests);
                const submissions = await questService.getSubmissions(familyId);
                store.set('submissions', submissions);

                // ローカルストレージにも最新の提出ステータスを同期
                const local = getLocalData();
                let changed = false;
                submissions.forEach((sub: any) => {
                    const idx = (local.submissions || []).findIndex(ls => ls.id === sub.id);
                    if (idx >= 0) {
                        if (local.submissions[idx].status !== sub.status || local.submissions[idx].parent_comment !== sub.parent_comment) {
                            local.submissions[idx] = { ...local.submissions[idx], ...sub };
                            changed = true;
                        }
                    } else {
                        if (!local.submissions) local.submissions = [];
                        local.submissions.push(sub);
                        changed = true;
                    }
                });
                if (changed) {
                    saveLocalData(local, false);
                }
            } catch (e) {
                console.warn('Failed to refresh quests/submissions:', e);
            }
        }
        if (s?.currentUser?.id && s?.currentUser?.role === 'CHILD') {
            try {
                const acc = await accountService.getAccount(s.currentUser.id);
                if (acc) store.set('account', acc);
            } catch (e) {
                console.warn('Failed to refresh account:', e);
            }
        }
    };
    refreshData();

    // 別タブで親がクエスト変更した時やウィンドウフォーカス時にも自動更新
    const onStorage = (e: StorageEvent) => {
        if (e.key === 'moneytree_data') {
            const fresh = getLocalData();
            const currentChildId = store.get('currentUser')?.id;
            if (currentChildId) {
                const acc = (fresh.accounts || []).find((a: any) => a.child_id === currentChildId);
                if (acc) store.set('account', acc);
            }
            if (fresh.quests && fresh.quests.length > 0) {
                store.set('quests', fresh.quests);
            }
            if (fresh.submissions) {
                store.set('submissions', fresh.submissions);
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
        }
        if (fresh.quests && fresh.quests.length > 0) {
            store.set('quests', fresh.quests);
        }
        if (fresh.submissions) {
            store.set('submissions', fresh.submissions);
        }
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('moneytree_local_change', onLocalChange);
    window.addEventListener('focus', refreshData);

    const s = store.getState();
    const questSub = questService.subscribeToQuests(s?.family?.id || '', () => refreshData());
    const subSub = questService.subscribeToSubmissions(s?.family?.id || '', () => refreshData());
    const accSub = s?.currentUser?.id ? accountService.subscribeToAccount(s.currentUser.id, (newAcc) => {
        if (newAcc) store.set('account', newAcc);
    }) : { unsubscribe: () => {} };
    const pollInterval = window.setInterval(refreshData, 3500);

    router.onCleanup(() => {
        window.clearInterval(pollInterval);
        questSub.unsubscribe();
        subSub.unsubscribe();
        accSub.unsubscribe();
        window.removeEventListener('storage', onStorage);
        window.removeEventListener('moneytree_local_change', onLocalChange);
        window.removeEventListener('focus', refreshData);
    });

    return container;
}
