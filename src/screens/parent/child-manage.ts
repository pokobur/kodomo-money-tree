import { router } from '../../lib/router';
import { store } from '../../lib/store';
import { createNavBar } from '../../components/nav';
import { showModal } from '../../components/modal';
import { showToast } from '../../components/toast';
import { createChildProfile, deleteChildProfile, updateChildPin } from '../../lib/auth';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { getLocalData } from '../../services/local-data';
import { formatCoin } from '../../utils/format';

export function createChildManage(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'screen-container parent-theme';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.height = '100vh';

    const contentArea = document.createElement('div');
    contentArea.style.flexGrow = '1';
    contentArea.style.overflowY = 'auto';
    contentArea.style.padding = '1rem';

    const header = document.createElement('h1');
    header.innerText = 'こども管理';
    contentArea.appendChild(header);

    const addBtn = document.createElement('button');
    addBtn.innerText = '+ こどもを追加';
    addBtn.className = 'primary-btn';
    addBtn.style.minHeight = '48px';
    addBtn.style.width = '100%';
    addBtn.style.marginBottom = '1rem';
    addBtn.onclick = () => openAddChildModal();
    contentArea.appendChild(addBtn);

    const listSection = document.createElement('div');
    contentArea.appendChild(listSection);

    container.appendChild(contentArea);
    container.appendChild(createNavBar('PARENT'));

    const render = () => {
        const state = store.getState();
        if (!state) return;

        listSection.innerHTML = '';
        const localData = getLocalData();
        const deletedIds = new Set(localData.deletedChildIds || []);
        const children = (state.children || []).filter((c: any) => !deletedIds.has(c.id));
        
        if (children.length === 0) {
            listSection.innerHTML = '<p style="text-align: center;">こどもが登録されていません</p>';
        } else {
            children.forEach((child: any) => {
                const card = document.createElement('div');
                card.className = 'card';
                card.style.display = 'flex';
                card.style.alignItems = 'center';
                card.style.gap = '15px';
                
                const displayName = child.display_name || child.nickname || 'こども';
                const initial = displayName ? displayName[0] : '?';
                const account = localData.accounts.find(a => a.child_id === child.id);
                const spending = account?.spending_balance ?? child.spending_balance ?? 0;
                const savings = account?.savings_balance ?? child.savings_balance ?? 0;
                
                card.innerHTML = `
                    <div style="width: 50px; height: 50px; border-radius: 25px; background: #81C784; color: white; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: bold; flex-shrink: 0;">
                        ${initial}
                    </div>
                    <div style="flex-grow: 1; min-width: 0;">
                        <h3 style="margin: 0 0 5px 0;">${displayName}</h3>
                        <div style="font-size: 0.9em; color: #666;">
                            使う: ${formatCoin(spending)} | 貯金: ${formatCoin(savings)}
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px; flex-shrink: 0;">
                        <button class="pin-btn" style="min-height: 40px; padding: 0 10px; border-radius: 8px; border: 1px solid #ccc; background: #fff; cursor: pointer; font-weight: bold; font-size: 0.85rem;">PIN変更</button>
                        <button class="delete-btn" style="min-height: 40px; padding: 0 10px; border-radius: 8px; border: 1px solid #ffcdd2; background: #ffebee; color: #d32f2f; cursor: pointer; font-weight: bold; font-size: 0.85rem;">🗑️ 削除</button>
                    </div>
                `;
                
                const pinBtn = card.querySelector('.pin-btn') as HTMLButtonElement;
                if (pinBtn) {
                    pinBtn.onclick = () => openPinChangeModal(child);
                }

                const deleteBtn = card.querySelector('.delete-btn') as HTMLButtonElement;
                if (deleteBtn) {
                    deleteBtn.onclick = () => openDeleteConfirmModal(child);
                }

                listSection.appendChild(card);
            });
        }
    };

    const openAddChildModal = () => {
        const content = document.createElement('div');
        content.innerHTML = `
            <h2>こどもを追加</h2>
            <div id="add-child-error" style="color: #EF5350; margin-bottom: 10px; display: none;"></div>
            <input type="text" id="child-nickname" placeholder="ニックネーム" style="width: 100%; min-height: 48px; margin-bottom: 10px; padding: 0.5rem; border-radius: 8px; border: 1px solid #ccc;">
            <input type="password" id="child-pin" placeholder="4桁のPINコード" maxlength="4" style="width: 100%; min-height: 48px; margin-bottom: 10px; padding: 0.5rem; border-radius: 8px; border: 1px solid #ccc;">
            <input type="password" id="child-pin-confirm" placeholder="PINコード (確認用)" maxlength="4" style="width: 100%; min-height: 48px; margin-bottom: 10px; padding: 0.5rem; border-radius: 8px; border: 1px solid #ccc;">
        `;

        const submitBtn = document.createElement('button');
        submitBtn.innerText = '追加する';
        submitBtn.className = 'primary-btn';
        submitBtn.style.minHeight = '48px';
        submitBtn.style.width = '100%';
        submitBtn.style.marginTop = '10px';

        let modalObj: { close: () => void } | null = null;

        submitBtn.onclick = async () => {
            const nicknameInput = content.querySelector('#child-nickname') as HTMLInputElement;
            const pinInput = content.querySelector('#child-pin') as HTMLInputElement;
            const pinConfirmInput = content.querySelector('#child-pin-confirm') as HTMLInputElement;
            const errDiv = content.querySelector('#add-child-error') as HTMLDivElement;

            const nickname = nicknameInput.value.trim();
            const pin = pinInput.value.trim();
            const pinConfirm = pinConfirmInput.value.trim();

            if (!nickname) {
                errDiv.textContent = 'ニックネームを入力してください';
                errDiv.style.display = 'block';
                return;
            }
            if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
                errDiv.textContent = 'PINコードは4桁の半角数字で入力してください';
                errDiv.style.display = 'block';
                return;
            }
            if (pin !== pinConfirm) {
                errDiv.textContent = 'PINコードが一致しません';
                errDiv.style.display = 'block';
                return;
            }

            try {
                submitBtn.disabled = true;
                submitBtn.textContent = '追加中...';
                errDiv.style.display = 'none';

                const res = await createChildProfile(nickname, pin);
                if (!res.success) {
                    throw new Error(res.error || '作成に失敗しました');
                }

                showToast(`${nickname}を追加しました！`, 'success');
                modalObj?.close();
                await refreshChildren();
                render();
            } catch (err: any) {
                errDiv.textContent = err.message || 'エラーが発生しました';
                errDiv.style.display = 'block';
                submitBtn.disabled = false;
                submitBtn.textContent = '追加する';
            }
        };
        content.appendChild(submitBtn);

        modalObj = showModal({ title: 'こどもを追加', content });
    };

    const openDeleteConfirmModal = (child: any) => {
        const displayName = child.display_name || child.nickname || 'こども';
        const content = document.createElement('div');
        content.innerHTML = `
            <div style="text-align: center; margin-bottom: 1.25rem;">
                <div style="font-size: 3rem; margin-bottom: 0.5rem;">⚠️</div>
                <h3 style="margin: 0 0 0.5rem 0; color: #D32F2F; font-size: 1.2rem;">「${displayName}」を削除しますか？</h3>
                <p style="color: #666; font-size: 0.9rem; line-height: 1.5; margin: 0;">
                    この操作は取り消せません。<br>
                    ${displayName}の口座残高、お手伝いの履歴、ほしい物リストなどのすべてのデータが削除されます。
                </p>
            </div>
            <div id="delete-child-error" style="color: #EF5350; margin-bottom: 10px; display: none; text-align: center;"></div>
            <div style="display: flex; gap: 10px; margin-top: 1rem;">
                <button id="cancel-delete-btn" style="flex: 1; min-height: 46px; border: 1px solid #ccc; background: #f5f5f5; border-radius: 10px; font-weight: bold; cursor: pointer;">
                    キャンセル
                </button>
                <button id="confirm-delete-btn" style="flex: 1; min-height: 46px; border: none; background: #D32F2F; color: white; border-radius: 10px; font-weight: bold; cursor: pointer;">
                    削除する
                </button>
            </div>
        `;

        let modalObj: { close: () => void } | null = null;

        const cancelBtn = content.querySelector('#cancel-delete-btn') as HTMLButtonElement;
        cancelBtn.onclick = () => modalObj?.close();

        const confirmBtn = content.querySelector('#confirm-delete-btn') as HTMLButtonElement;
        confirmBtn.onclick = async () => {
            const errDiv = content.querySelector('#delete-child-error') as HTMLDivElement;
            try {
                confirmBtn.disabled = true;
                confirmBtn.textContent = '削除中...';
                cancelBtn.disabled = true;

                const res = await deleteChildProfile(child.id);
                if (!res.success) {
                    throw new Error(res.error || '削除に失敗しました');
                }

                showToast(`「${displayName}」を削除しました`, 'success');
                modalObj?.close();
                await refreshChildren();
                render();
            } catch (err: any) {
                errDiv.textContent = err.message || 'エラーが発生しました';
                errDiv.style.display = 'block';
                confirmBtn.disabled = false;
                confirmBtn.textContent = '削除する';
                cancelBtn.disabled = false;
            }
        };

        modalObj = showModal({ title: 'こどもの削除', content });
    };

    const openPinChangeModal = (child: any) => {
        const displayName = child.display_name || child.nickname || 'こども';
        const content = document.createElement('div');
        content.innerHTML = `
            <h3 style="margin-top: 0;">${displayName}のPIN変更</h3>
            <div id="pin-change-error" style="color: #EF5350; margin-bottom: 10px; display: none;"></div>
            <input type="password" id="new-pin-input" placeholder="新しい4桁のPIN" maxlength="4" style="width: 100%; min-height: 48px; margin-bottom: 10px; padding: 0.5rem; border-radius: 8px; border: 1px solid #ccc; font-size: 1.1rem;">
            <input type="password" id="confirm-pin-input" placeholder="確認のためもう一度入力" maxlength="4" style="width: 100%; min-height: 48px; margin-bottom: 15px; padding: 0.5rem; border-radius: 8px; border: 1px solid #ccc; font-size: 1.1rem;">
        `;
        
        let modalObj: { close: () => void } | null = null;
        const submitBtn = document.createElement('button');
        submitBtn.innerText = '変更する';
        submitBtn.className = 'primary-btn';
        submitBtn.style.minHeight = '48px';
        submitBtn.style.width = '100%';
        submitBtn.onclick = async () => {
            const pinInput = content.querySelector('#new-pin-input') as HTMLInputElement;
            const confirmInput = content.querySelector('#confirm-pin-input') as HTMLInputElement;
            const errDiv = content.querySelector('#pin-change-error') as HTMLDivElement;
            const newPin = pinInput.value.trim();
            const confirmPin = confirmInput.value.trim();

            if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
                errDiv.textContent = 'PINコードは4桁の数字を入力してください';
                errDiv.style.display = 'block';
                return;
            }
            if (newPin !== confirmPin) {
                errDiv.textContent = 'PINコードが一致しません';
                errDiv.style.display = 'block';
                return;
            }

            try {
                submitBtn.disabled = true;
                submitBtn.textContent = '変更中...';
                const res = await updateChildPin(child.id, newPin);
                if (!res.success) throw new Error(res.error || 'PIN変更に失敗しました');
                showToast(`${displayName}のPINを変更しました`, 'success');
                modalObj?.close();
            } catch (err: any) {
                errDiv.textContent = err.message || 'エラーが発生しました';
                errDiv.style.display = 'block';
                submitBtn.disabled = false;
                submitBtn.textContent = '変更する';
            }
        };
        content.appendChild(submitBtn);

        modalObj = showModal({ title: 'PIN変更', content });
    };

    store.onAny(render);
    render();

    // 画面マウント時とストレージイベント時に子ども一覧を同期
    const refreshChildren = async () => {
        const family = store.get('family');
        if (family) {
            const localData = getLocalData();
            const deletedIds = new Set(localData.deletedChildIds || []);
            let mergedChildren: any[] = [];

            if (isSupabaseConfigured) {
                try {
                    const { data: remoteChildren } = await supabase.from('users')
                        .select('*')
                        .eq('family_id', family.id)
                        .eq('role', 'CHILD');
                    if (remoteChildren) {
                        mergedChildren = remoteChildren.filter((c: any) => !deletedIds.has(c.id));
                    }
                } catch (e) {
                    console.warn('refreshChildren (Supabase) error:', e);
                }
            }

            // ローカルにある子ども（削除済みでないもの）も必ずマージ
            const localChildren = localData.users.filter(u => u.family_id === family.id && u.role === 'CHILD' && !deletedIds.has(u.id));
            localChildren.forEach(lc => {
                if (!mergedChildren.some(mc => mc.id === lc.id)) {
                    mergedChildren.push(lc);
                }
            });

            store.set('children', mergedChildren);
        }
    };
    refreshChildren();

    const onStorage = (e: StorageEvent) => {
        if (e.key === 'moneytree_data') {
            refreshChildren();
            render();
        }
    };
    const onLocalChange = () => {
        refreshChildren();
        render();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('moneytree_local_change', onLocalChange);
    window.addEventListener('focus', refreshChildren);

    router.onCleanup(() => {
        window.removeEventListener('storage', onStorage);
        window.removeEventListener('moneytree_local_change', onLocalChange);
        window.removeEventListener('focus', refreshChildren);
    });

    return container;
}
