import { router } from '../../lib/router';
import { store } from '../../lib/store';
import { createNavBar } from '../../components/nav';
import { showModal } from '../../components/modal';
import { showToast } from '../../components/toast';
import { wishService } from '../../services/wish.service';
import { getLocalData } from '../../services/local-data';
import { accountService } from '../../services/account.service';
import { withdrawalService } from '../../services/withdrawal.service';
import { formatCoin } from '../../utils/format';
import { soundManager } from '../../utils/sound';
import { fireSuccess } from '../../utils/confetti';

export function createChildWishlist(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'screen-container child-theme';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.height = '100vh';

    const contentArea = document.createElement('div');
    contentArea.className = 'wishlist-screen';
    contentArea.style.flexGrow = '1';
    contentArea.style.overflowY = 'auto';
    contentArea.style.padding = '1.25rem';
    contentArea.style.paddingBottom = '5rem';

    const header = document.createElement('h1');
    header.innerText = 'ほしいものリスト 🎁';
    header.style.textAlign = 'center';
    header.style.color = '#2E7D32';
    header.style.margin = '0 0 1rem 0';
    contentArea.appendChild(header);

    const addBtn = document.createElement('button');
    addBtn.innerText = '＋ ほしいものを ついか';
    addBtn.className = 'primary-btn btn-primary';
    addBtn.style.minHeight = '48px';
    addBtn.style.width = '100%';
    addBtn.style.marginBottom = '1.25rem';
    addBtn.style.fontWeight = 'bold';
    addBtn.style.fontSize = '1.05rem';
    addBtn.style.border = 'none';
    addBtn.style.borderRadius = '12px';
    addBtn.style.cursor = 'pointer';
    addBtn.style.color = 'white';
    addBtn.onclick = () => openAddModal();
    contentArea.appendChild(addBtn);

    const grid = document.createElement('div');
    grid.className = 'wishlist-grid';
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(260px, 1fr))';
    grid.style.gap = '1rem';
    contentArea.appendChild(grid);

    container.appendChild(contentArea);
    container.appendChild(createNavBar('CHILD'));

    const render = () => {
        const state = store.getState();
        if (!state) return;

        grid.innerHTML = '';
        const childId = state.currentUser?.id;
        const localData = getLocalData();
        const rawItems = (state.wishItems && state.wishItems.length > 0)
            ? state.wishItems
            : (localData.wishItems || []).filter((w: any) => !childId || w.child_id === childId);
        const withdrawals = (state.withdrawals && state.withdrawals.length > 0)
            ? state.withdrawals
            : (localData.withdrawals || []).filter((w: any) => !childId || w.child_id === childId);

        // 承認済みのほしいもの購入IDを抽出して確実に除外＆DB削除
        const approvedWishIds = new Set<string>();
        withdrawals.forEach((w: any) => {
            if (w.status === 'APPROVED' && w.purpose) {
                const m = w.purpose.match(/\[([a-zA-Z0-9_-]+)\]/);
                if (m && m[1]) {
                    approvedWishIds.add(m[1]);
                    wishService.deleteWishItem(m[1]).catch(() => {});
                }
            }
        });

        const items = rawItems.filter((item: any) => !item.is_purchased && !approvedWishIds.has(item.id));
        const savings = state.account?.savings_balance || 0;
        const spending = state.account?.spending_balance || 0;

        if (items.length === 0) {
            grid.innerHTML = '<div class="card" style="grid-column: 1 / -1; text-align: center; color: #888; padding: 2rem;">ほしいものを とうろくして、目標にむかって ちょきんしよう！</div>';
            return;
        }

        items.forEach((item: any) => {
            const progress = Math.min(100, Math.round((savings / item.target_price) * 100));
            const achieved = savings >= item.target_price;
            const canBuy = achieved;
            const isPendingApproval = withdrawals.some((w: any) =>
                w.child_id === (state.currentUser?.id) &&
                (w.status === 'PENDING' || w.status === 'COOLDOWN') &&
                w.purpose && w.purpose.includes(`[${item.id}]`)
            );

            const card = document.createElement('div');
            card.className = 'card wish-card';
            card.style.display = 'flex';
            card.style.flexDirection = 'column';
            card.style.gap = '8px';
            if (achieved) {
                card.style.border = '2px solid #FFD700';
                card.style.boxShadow = '0 4px 15px rgba(255, 215, 0, 0.3)';
            }

            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                    <h3 style="margin: 0; font-size: 1.15rem; color: #333; flex: 1; word-break: break-word;">${item.title}</h3>
                    <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
                        ${achieved ? '<span style="background: #FFD700; color: #000; font-weight: bold; padding: 2px 8px; border-radius: 12px; font-size: 0.8rem; white-space: nowrap;">🎉 かえるよ！</span>' : ''}
                        <button class="delete-wish-btn" title="リストから けす" style="background: #FFEBEE; border: none; border-radius: 8px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #D32F2F; font-size: 0.95rem; transition: background 0.2s;">🗑️</button>
                    </div>
                </div>
                ${item.image_url ? `<img src="${item.image_url}" onerror="this.style.display='none'" style="width: 100%; height: 120px; object-fit: cover; border-radius: 8px; margin: 4px 0;" alt="${item.title}" />` : ''}
                <div style="font-weight: 800; font-size: 1.25rem; color: #2E7D32;">${formatCoin(item.target_price)}</div>
                
                <div>
                    <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: #666; margin-bottom: 4px;">
                        <span>ちょきんのわりあい</span>
                        <strong style="color: ${achieved ? '#2E7D32' : '#F57F17'};">${progress}%</strong>
                    </div>
                    <div style="background: #E0E0E0; height: 12px; border-radius: 6px; overflow: hidden;">
                        <div style="background: linear-gradient(to right, #81C784, #4CAF50); width: ${progress}%; height: 100%; transition: width 0.5s ease;"></div>
                    </div>
                </div>

                ${item.matching_bonus_percent ? `
                    <div style="background: #FFF3E0; color: #E65100; padding: 4px 8px; border-radius: 6px; font-size: 0.8rem; font-weight: bold;">
                        👨‍👩‍👦 パパママが ${item.matching_bonus_percent}% おうえん中！
                    </div>
                ` : ''}

                <div style="font-size: 0.8em; color: #888; margin-top: auto;">
                    のこり: ${achieved ? '0 コイン (ごーる！)' : `${formatCoin(Math.max(0, item.target_price - savings))}`}
                </div>

                ${isPendingApproval ? `
                    <div style="background: #FFF3E0; color: #E65100; border: 1px solid #FFE0B2; padding: 8px 12px; border-radius: 10px; font-weight: bold; font-size: 0.9rem; text-align: center; margin-top: 8px;">
                        ⏳ おとなのひとの かくにんまち
                    </div>
                ` : canBuy ? `
                    <button class="buy-wish-btn" style="width: 100%; min-height: 44px; background: linear-gradient(135deg, #4CAF50, #2E7D32); color: white; font-weight: bold; font-size: 0.95rem; border: none; border-radius: 10px; cursor: pointer; margin-top: 8px; box-shadow: 0 2px 8px rgba(46, 125, 50, 0.3);">
                        🛍️ これを かう！ (${formatCoin(item.target_price)})
                    </button>
                ` : ''}
            `;

            // 手動削除ボタン（要件: 追加したものを手動で削除できるようにする）
            const deleteBtn = card.querySelector('.delete-wish-btn') as HTMLButtonElement;
            if (deleteBtn) {
                deleteBtn.onclick = async (e) => {
                    e.stopPropagation();
                    if (!confirm(`「${item.title}」を リストから けしますか？`)) return;
                    try {
                        deleteBtn.disabled = true;
                        await wishService.deleteWishItem(item.id);
                        const childId = store.getState()?.currentUser?.id;
                        if (childId) {
                            const updated = await wishService.getWishItems(childId);
                            store.set('wishItems', updated);
                        }
                        showToast(`「${item.title}」を けしたよ`, 'info');
                    } catch (err: any) {
                        showToast(err.message || 'けすのに しっぱいしたよ', 'error');
                        deleteBtn.disabled = false;
                    }
                };
            }

            // 購入ボタン（要件: 親の承認が必要）
            const buyBtn = card.querySelector('.buy-wish-btn') as HTMLButtonElement;
            if (buyBtn) {
                buyBtn.onclick = () => openPurchaseModal(item, savings);
            }

            grid.appendChild(card);
        });
    };

    const openPurchaseModal = (item: any, savings: number) => {
        const state = store.getState();
        const child = state?.currentUser;
        if (!child) return;

        if (savings < item.target_price) {
            showToast('ちょきんが たりないよ！', 'error');
            return;
        }

        const content = document.createElement('div');
        content.innerHTML = `
            <div id="purchase-error" style="color: #EF5350; margin-bottom: 10px; display: none;"></div>
            
            <div style="text-align: center; margin-bottom: 1rem;">
                ${item.image_url ? `<img src="${item.image_url}" style="width: 120px; height: 120px; object-fit: cover; border-radius: 12px; margin-bottom: 8px;" alt="${item.title}" />` : ''}
                <h3 style="margin: 0; font-size: 1.2rem; color: #333;">${item.title}</h3>
                <div style="font-size: 1.4rem; font-weight: 800; color: #2E7D32; margin-top: 4px;">
                    ${formatCoin(item.target_price)}
                </div>
            </div>

            <div style="background: #E8F5E9; padding: 0.75rem; border-radius: 10px; margin-bottom: 1rem; font-size: 0.95rem; color: #2E7D32;">
                🏦 <strong>ちょきんから つかうよ</strong><br>
                いまの ちょきん: <strong>${formatCoin(savings)}</strong> ➔ のこり: <strong>${formatCoin(savings - item.target_price)}</strong>
            </div>

            <div style="background: #FFF9C4; border: 1px solid #FBC02D; padding: 0.75rem; border-radius: 8px; margin-bottom: 1.25rem; font-size: 0.85rem; color: #F57F17; line-height: 1.4;">
                💌 <strong>おとなのひとに おねがいを おくるよ！</strong><br>
                おとなのひとが「いいよ！」と しょうにんしたら、ちょきんから つかわれて リストから じどうで けされるよ。
            </div>

            <button id="confirm-purchase-btn" class="primary-btn btn-primary" style="width: 100%; min-height: 50px; font-weight: bold; border-radius: 12px; border: none; cursor: pointer; color: white; font-size: 1.05rem; background: linear-gradient(135deg, #4CAF50, #2E7D32);">
                💌 おとなのひとに おねがいする
            </button>
        `;

        let modalObj: { close: () => void } | null = null;

        const confirmBtn = content.querySelector('#confirm-purchase-btn') as HTMLButtonElement;
        confirmBtn.onclick = async () => {
            const errDiv = content.querySelector('#purchase-error') as HTMLDivElement;

            try {
                confirmBtn.disabled = true;
                confirmBtn.textContent = 'おねがい中...';

                // 親の承認が必要: 貯金（SAVINGS）から出金リクエストを作成
                await withdrawalService.createWithdrawalRequest(
                    child.id,
                    child.family_id || state.family?.id || '',
                    item.target_price,
                    `ほしいもの購入[${item.id}]: ${item.title}`,
                    'SAVINGS'
                );

                // ストアの出金リクエストを更新
                const updatedWithdrawals = await withdrawalService.getWithdrawals(child.id);
                store.set('withdrawals', updatedWithdrawals);

                soundManager.play('success');
                showToast(`おとなのひとに「${item.title}」を かうおねがいを おくったよ！`, 'success');
                modalObj?.close();
            } catch (err: any) {
                if (errDiv) {
                    errDiv.textContent = err.message || 'おねがいをおくるのに しっぱいしたよ';
                    errDiv.style.display = 'block';
                }
                confirmBtn.disabled = false;
                confirmBtn.textContent = '💌 おとなのひとに おねがいする';
            }
        };

        modalObj = showModal({ title: 'ほしいものを かう おねがい 🎁', content });
    };

    const openAddModal = () => {
        const state = store.getState();
        const child = state?.currentUser;
        if (!child) return;
        const familyId = child.family_id || state?.family?.id || '';

        const content = document.createElement('div');
        content.innerHTML = `
            <div id="wish-error" style="color: #EF5350; margin-bottom: 10px; display: none;"></div>
            <label style="display: block; font-weight: bold; font-size: 0.9em; margin-bottom: 4px;">ほしいものの なまえ</label>
            <input type="text" id="wish-name" placeholder="例: サッカーボール、ゲームソフト" style="width: 100%; min-height: 48px; margin-bottom: 1rem; padding: 0.5rem; border-radius: 8px; border: 1px solid #ccc;">

            <label style="display: block; font-weight: bold; font-size: 0.9em; margin-bottom: 4px;">ねだん（コイン）</label>
            <input type="number" id="wish-price" placeholder="例: 1500" min="1" style="width: 100%; min-height: 48px; margin-bottom: 1rem; padding: 0.5rem; border-radius: 8px; border: 1px solid #ccc;">

            <label style="display: block; font-weight: bold; font-size: 0.9em; margin-bottom: 4px;">しゃしんの URL（なくてもOK）</label>
            <input type="url" id="wish-url" placeholder="https://..." style="width: 100%; min-height: 48px; margin-bottom: 1rem; padding: 0.5rem; border-radius: 8px; border: 1px solid #ccc;">

            <button id="add-wish-btn" class="primary-btn btn-primary" style="width: 100%; min-height: 50px; font-weight: bold; border-radius: 12px; border: none; cursor: pointer; color: white;">
                リストに ついかする
            </button>
        `;

        let modalObj: { close: () => void } | null = null;

        const submitBtn = content.querySelector('#add-wish-btn') as HTMLButtonElement;
        submitBtn.onclick = async () => {
            const nameInput = content.querySelector('#wish-name') as HTMLInputElement;
            const priceInput = content.querySelector('#wish-price') as HTMLInputElement;
            const urlInput = content.querySelector('#wish-url') as HTMLInputElement;
            const errDiv = content.querySelector('#wish-error') as HTMLDivElement;

            const title = nameInput.value.trim();
            const price = parseInt(priceInput.value, 10);
            const imageUrl = urlInput.value.trim();

            if (!title) {
                errDiv.textContent = 'なまえを 入力してね！';
                errDiv.style.display = 'block';
                return;
            }
            if (isNaN(price) || price <= 0) {
                errDiv.textContent = '1コインいじょうの ねだんを入れてね！';
                errDiv.style.display = 'block';
                return;
            }

            try {
                submitBtn.disabled = true;
                submitBtn.textContent = 'ついか中...';
                const created = await wishService.createWishItem({
                    child_id: child.id,
                    family_id: familyId,
                    title,
                    target_price: price,
                    image_url: imageUrl || undefined
                });

                const currentWishes = store.get('wishItems') || [];
                if (!currentWishes.some(w => w.id === created.id)) {
                    store.set('wishItems', [created, ...currentWishes]);
                }

                soundManager.play('success');
                showToast('リストに ついかしたよ！がんばって貯めよう', 'success');
                modalObj?.close();
                render();
            } catch (err: any) {
                errDiv.textContent = err.message || 'エラーがおきちゃった';
                errDiv.style.display = 'block';
                submitBtn.disabled = false;
                submitBtn.textContent = 'リストに ついかする';
            }
        };

        modalObj = showModal({ title: 'ほしいものを ついか', content });
    };

    // 最新データ（ほしい物リスト、出金リクエスト、口座残高）を取得して反映
    const refreshData = async () => {
        const childId = store.getState()?.currentUser?.id;
        if (childId) {
            try {
                const [wList, wishList, acc] = await Promise.all([
                    withdrawalService.getWithdrawals(childId),
                    wishService.getWishItems(childId),
                    accountService.getAccount(childId)
                ]);
                store.set('withdrawals', wList);
                store.set('wishItems', wishList);
                if (acc) store.set('account', acc);
            } catch (e) {
                console.warn('Failed to load wishlist data:', e);
            }
        }
    };
    refreshData();

    const onStorage = (e: StorageEvent) => {
        if (e.key === 'moneytree_data') refreshData();
    };
    const onLocalChange = (e: any) => {
        const detail = e.detail;
        if (detail?.wishItems) {
            const childId = store.getState()?.currentUser?.id;
            const myItems = detail.wishItems.filter((w: any) => !childId || w.child_id === childId);
            store.set('wishItems', myItems);
        }
        refreshData();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('moneytree_local_change', onLocalChange);
    window.addEventListener('focus', refreshData);

    const childId = store.getState()?.currentUser?.id;
    const withdrawSub = childId ? withdrawalService.subscribeToWithdrawals(childId, () => refreshData()) : { unsubscribe: () => {} };
    const wishSub = childId ? wishService.subscribeToWishItems(childId, () => refreshData()) : { unsubscribe: () => {} };
    const accSub = childId ? accountService.subscribeToAccount(childId, (acc) => {
        if (acc) store.set('account', acc);
    }) : { unsubscribe: () => {} };
    const pollInterval = window.setInterval(refreshData, 3500);

    router.onCleanup(() => {
        window.clearInterval(pollInterval);
        withdrawSub.unsubscribe();
        wishSub.unsubscribe();
        accSub.unsubscribe();
        window.removeEventListener('storage', onStorage);
        window.removeEventListener('moneytree_local_change', onLocalChange);
        window.removeEventListener('focus', refreshData);
    });

    store.onAny(render);
    render();

    return container;
}
