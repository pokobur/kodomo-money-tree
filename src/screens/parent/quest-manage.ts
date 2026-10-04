import { router } from '../../lib/router';
import { store } from '../../lib/store';
import { createNavBar } from '../../components/nav';
import { showModal } from '../../components/modal';
import { showToast } from '../../components/toast';
import { questService } from '../../services/quest.service';
import { getLocalData } from '../../services/local-data';
import { formatCoin } from '../../utils/format';

export function createQuestManage(): HTMLElement {
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
    header.innerText = 'クエスト管理';
    contentArea.appendChild(header);

    const addBtn = document.createElement('button');
    addBtn.innerText = '+ 新しいクエスト';
    addBtn.className = 'primary-btn';
    addBtn.style.minHeight = '48px';
    addBtn.style.width = '100%';
    addBtn.style.marginBottom = '1rem';
    addBtn.onclick = () => openQuestModal();
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
        const localQuests = localData.quests || [];
        const qMap = new Map<string, any>();
        (state.quests || []).forEach((q: any) => qMap.set(q.id, q));
        localQuests.forEach((q: any) => qMap.set(q.id, q));
        const quests = Array.from(qMap.values());
        
        if (quests.length === 0) {
            listSection.innerHTML = '<p style="text-align: center; color: #666; margin-top: 2rem;">クエストがありません。<br>「＋ 新しいクエスト」から作成してみましょう！</p>';
        } else {
            const children = state.children || [];
            quests.forEach((q: any) => {
                const assignedChild = q.assigned_child_id ? children.find((c: any) => c.id === q.assigned_child_id) : null;
                const assignedBadge = assignedChild
                    ? `<span style="background: #E3F2FD; color: #1565C0; padding: 3px 8px; border-radius: 8px; font-size: 0.8em; font-weight: bold;">🧒 ${assignedChild.display_name || 'こども'} 専用</span>`
                    : `<span style="background: #FFF8E1; color: #F57F17; padding: 3px 8px; border-radius: 8px; font-size: 0.8em; font-weight: bold;">🌟 全員</span>`;

                const card = document.createElement('div');
                card.className = 'card';
                card.style.marginBottom = '1rem';
                card.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <h3 style="margin: 0;">${q.title}</h3>
                        <div style="display: flex; gap: 6px; align-items: center;">
                            ${assignedBadge}
                            <span style="background: #E8F5E9; color: #2E7D32; padding: 3px 8px; border-radius: 8px; font-size: 0.8em; font-weight: bold;">
                                ${q.repeat_type === 'DAILY' ? '毎日' : q.repeat_type === 'WEEKLY' ? '毎週' : '1回のみ'}
                            </span>
                        </div>
                    </div>
                    ${q.description ? `<p style="color: #666; font-size: 0.9em; margin: 6px 0;">${q.description}</p>` : ''}
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
                        <p style="color: #F57F17; font-weight: bold; font-size: 1.1em; margin: 0;">${formatCoin(q.reward_amount)}</p>
                        <span style="font-size: 0.8em; color: #888;">配分: つかう ${q.spending_percent}% / 貯金 ${q.savings_percent}%</span>
                    </div>
                    <div style="display: flex; gap: 8px; margin-top: 12px;">
                        <button class="edit-btn" style="flex: 1; min-height: 40px; border-radius: 8px; border: 1px solid #ccc; background: white; cursor: pointer;">編集</button>
                        <button class="toggle-btn" style="flex: 1; min-height: 40px; border-radius: 8px; border: none; background: ${q.is_active ? '#EF5350' : '#4CAF50'}; color: white; cursor: pointer;">
                            ${q.is_active ? '無効にする' : '有効にする'}
                        </button>
                        <button class="delete-btn" style="min-height: 40px; padding: 0 12px; border-radius: 8px; border: 1px solid #EF5350; background: #FFEBEE; color: #D32F2F; cursor: pointer; font-size: 0.9em;" title="削除">
                            🗑️ 削除
                        </button>
                    </div>
                `;

                const editBtn = card.querySelector('.edit-btn') as HTMLButtonElement;
                if (editBtn) editBtn.onclick = () => openQuestModal(q);

                const toggleBtn = card.querySelector('.toggle-btn') as HTMLButtonElement;
                if (toggleBtn) toggleBtn.onclick = async () => {
                    try {
                        toggleBtn.disabled = true;
                        await questService.updateQuest(q.id, { is_active: !q.is_active });
                        const family = store.get('family');
                        if (family) {
                            const updatedQuests = await questService.getAllQuests(family.id);
                            store.set('quests', updatedQuests);
                        }
                        showToast(`クエストを${q.is_active ? '無効' : '有効'}にしました`, 'info');
                    } catch (err: any) {
                        showToast(err.message || '更新に失敗しました', 'error');
                        toggleBtn.disabled = false;
                    }
                };

                const deleteBtn = card.querySelector('.delete-btn') as HTMLButtonElement;
                if (deleteBtn) deleteBtn.onclick = () => confirmDeleteQuest(q);

                listSection.appendChild(card);
            });
        }
    };

    const confirmDeleteQuest = (quest: any, onDeleted?: () => void) => {
        const content = document.createElement('div');
        content.innerHTML = `
            <p style="margin-bottom: 1rem; color: #333; line-height: 1.5;">
                お手伝い「<strong>${quest.title}</strong>」を完全に削除しますか？<br>
                <span style="font-size: 0.85em; color: #888;">※この操作は取り消せません。</span>
            </p>
            <div style="display: flex; gap: 10px; margin-top: 1.5rem;">
                <button id="cancel-delete-btn" style="flex: 1; min-height: 44px; border-radius: 8px; border: 1px solid #ccc; background: white; cursor: pointer;">キャンセル</button>
                <button id="exec-delete-btn" style="flex: 1; min-height: 44px; border-radius: 8px; border: none; background: #EF5350; color: white; font-weight: bold; cursor: pointer;">削除する</button>
            </div>
        `;

        const modalObj = showModal({ title: 'クエストの削除', content });

        const cancelBtn = content.querySelector('#cancel-delete-btn') as HTMLButtonElement;
        if (cancelBtn) cancelBtn.onclick = () => modalObj.close();

        const execBtn = content.querySelector('#exec-delete-btn') as HTMLButtonElement;
        if (execBtn) execBtn.onclick = async () => {
            try {
                execBtn.disabled = true;
                execBtn.textContent = '削除中...';
                await questService.deleteQuest(quest.id);
                const family = store.get('family');
                if (family) {
                    const updatedQuests = await questService.getAllQuests(family.id);
                    store.set('quests', updatedQuests);
                }
                modalObj.close();
                if (onDeleted) onDeleted();
                showToast('クエストを削除しました', 'success');
            } catch (err: any) {
                showToast(err.message || '削除に失敗しました', 'error');
                execBtn.disabled = false;
                execBtn.textContent = '削除する';
            }
        };
    };

    const openQuestModal = (quest?: any) => {
        const family = store.get('family');
        if (!family) {
            showToast('ファミリー情報が取得できません', 'error');
            return;
        }

        const spendingInitial = quest?.spending_percent ?? 100;
        const savingsInitial = quest?.savings_percent ?? 0;
        const localData = getLocalData();
        const deletedIds = new Set(localData.deletedChildIds || []);
        const children = (store.getState()?.children || []).filter((c: any) => !deletedIds.has(c.id));

        const childOptionsHtml = children.map((c: any) => `
            <option value="${c.id}" ${quest?.assigned_child_id === c.id ? 'selected' : ''}>
                🧒 ${c.display_name || c.nickname || 'こども'} 専用
            </option>
        `).join('');

        const content = document.createElement('div');
        content.innerHTML = `
            <div id="quest-modal-error" style="color: #EF5350; margin-bottom: 10px; display: none;"></div>
            <label style="display: block; font-size: 0.9em; margin-bottom: 4px; color: #555;">お手伝いのタイトル</label>
            <input type="text" id="quest-title" placeholder="例: おさらあらい" value="${quest?.title || ''}" style="width: 100%; min-height: 48px; margin-bottom: 12px; padding: 0.5rem; border-radius: 8px; border: 1px solid #ccc;">

            <label style="display: block; font-size: 0.9em; margin-bottom: 4px; color: #555;">くわしい説明（任意）</label>
            <textarea id="quest-desc" placeholder="例: ごはんのあとのおさらを ピカピカにあらおう" style="width: 100%; min-height: 70px; margin-bottom: 12px; padding: 0.5rem; border-radius: 8px; border: 1px solid #ccc;">${quest?.description || ''}</textarea>

            <div style="margin-bottom: 12px;">
                <label style="display: block; font-size: 0.9em; margin-bottom: 4px; color: #555;">対象のお子さま</label>
                <select id="quest-child" style="width: 100%; min-height: 48px; padding: 0.5rem; border-radius: 8px; border: 1px solid #ccc; font-size: 0.95rem;">
                    <option value="" ${!quest?.assigned_child_id ? 'selected' : ''}>🌟 ぜんいん（すべてのお子さま）</option>
                    ${childOptionsHtml}
                </select>
            </div>

            <label style="display: block; font-size: 0.9em; margin-bottom: 4px; color: #555;">ごほうびのコイン数</label>
            <input type="number" id="quest-reward" placeholder="例: 50" min="1" value="${quest?.reward_amount || '50'}" style="width: 100%; min-height: 48px; margin-bottom: 12px; padding: 0.5rem; border-radius: 8px; border: 1px solid #ccc;">
            
            <div style="margin-bottom: 12px;">
                <label style="display: block; font-size: 0.9em; margin-bottom: 4px; color: #555;">くりかえし</label>
                <select id="quest-repeat" style="width: 100%; min-height: 48px; padding: 0.5rem; border-radius: 8px; border: 1px solid #ccc;">
                    <option value="DAILY" ${quest?.repeat_type === 'DAILY' ? 'selected' : ''}>まいにち（毎日）</option>
                    <option value="WEEKLY" ${quest?.repeat_type === 'WEEKLY' ? 'selected' : ''}>まいしゅう（毎週）</option>
                    <option value="ONCE" ${quest?.repeat_type === 'ONCE' ? 'selected' : ''}>1回だけ</option>
                </select>
            </div>
            
            <label style="display: flex; align-items: center; margin-bottom: 14px; cursor: pointer;">
                <input type="checkbox" id="quest-photo" ${quest?.requires_photo ? 'checked' : ''} style="width: 22px; height: 22px; margin-right: 10px;">
                <span>写真の提出を必須にする</span>
            </label>

            <div style="margin-bottom: 14px;">
                <label style="display: block; font-size: 0.9em; margin-bottom: 4px; color: #555;">報酬の配分（合計100%）</label>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <input type="range" id="quest-spending-slider" min="0" max="100" step="5" value="${spendingInitial}" style="flex-grow: 1;">
                    <span id="quest-ratio-text" style="font-size: 0.9em; min-width: 150px; font-weight: bold; color: #4CAF50;">
                        使う: ${spendingInitial}% / 貯金: ${savingsInitial}%
                    </span>
                </div>
            </div>
        `;

        const slider = content.querySelector('#quest-spending-slider') as HTMLInputElement;
        const ratioText = content.querySelector('#quest-ratio-text') as HTMLElement;
        slider.oninput = () => {
            const spendingVal = parseInt(slider.value, 10);
            const savingsVal = 100 - spendingVal;
            ratioText.textContent = `使う: ${spendingVal}% / 貯金: ${savingsVal}%`;
        };

        const submitBtn = document.createElement('button');
        submitBtn.innerText = quest ? '更新する' : 'クエストを作成する';
        submitBtn.className = 'primary-btn';
        submitBtn.style.minHeight = '48px';
        submitBtn.style.width = '100%';
        submitBtn.style.marginTop = '10px';

        let modalObj: { close: () => void } | null = null;

        submitBtn.onclick = async () => {
            const titleInput = content.querySelector('#quest-title') as HTMLInputElement;
            const descInput = content.querySelector('#quest-desc') as HTMLTextAreaElement;
            const rewardInput = content.querySelector('#quest-reward') as HTMLInputElement;
            const repeatSelect = content.querySelector('#quest-repeat') as HTMLSelectElement;
            const childSelect = content.querySelector('#quest-child') as HTMLSelectElement;
            const photoCheck = content.querySelector('#quest-photo') as HTMLInputElement;
            const errDiv = content.querySelector('#quest-modal-error') as HTMLDivElement;

            const title = titleInput.value.trim();
            const reward = parseInt(rewardInput.value, 10);
            const spendingPercent = parseInt(slider.value, 10);
            const savingsPercent = 100 - spendingPercent;
            const assignedChildId = childSelect?.value ? childSelect.value : null;

            if (!title) {
                errDiv.textContent = 'タイトルを入力してください';
                errDiv.style.display = 'block';
                return;
            }
            if (!reward || reward <= 0) {
                errDiv.textContent = 'ごほうびコイン数は1枚以上にしてください';
                errDiv.style.display = 'block';
                return;
            }

            try {
                submitBtn.disabled = true;
                submitBtn.textContent = '保存中...';
                errDiv.style.display = 'none';

                const questData: any = {
                    family_id: family.id,
                    title,
                    description: descInput.value.trim(),
                    reward_amount: reward,
                    spending_percent: spendingPercent,
                    savings_percent: savingsPercent,
                    repeat_type: repeatSelect.value,
                    requires_photo: photoCheck.checked,
                    assigned_child_id: assignedChildId,
                    is_active: true
                };

                if (quest) {
                    await questService.updateQuest(quest.id, questData);
                    showToast('クエストを更新しました！', 'success');
                } else {
                    await questService.createQuest(questData);
                    showToast('クエストを作成しました！', 'success');
                }

                // ストアのクエスト一覧を最新化
                const updatedQuests = await questService.getAllQuests(family.id);
                store.set('quests', updatedQuests);

                modalObj?.close();
            } catch (err: any) {
                errDiv.textContent = err.message || 'クエストの保存に失敗しました';
                errDiv.style.display = 'block';
                submitBtn.disabled = false;
                submitBtn.textContent = quest ? '更新する' : 'クエストを作成する';
            }
        };

        content.appendChild(submitBtn);

        if (quest) {
            const deleteLinkBtn = document.createElement('button');
            deleteLinkBtn.innerText = '🗑️ このクエストを完全に削除する';
            deleteLinkBtn.type = 'button';
            deleteLinkBtn.style.cssText = 'width: 100%; min-height: 40px; margin-top: 10px; background: transparent; border: 1px solid #EF5350; color: #D32F2F; border-radius: 8px; cursor: pointer; font-size: 0.9em;';
            deleteLinkBtn.onclick = () => {
                confirmDeleteQuest(quest, () => modalObj?.close());
            };
            content.appendChild(deleteLinkBtn);
        }

        modalObj = showModal({ title: quest ? 'クエスト編集' : '新しいクエスト', content });
    };

    store.onAny(render);
    render();

    // 画面マウント時に最新クエストを取得
    const refreshQuests = async () => {
        const family = store.get('family');
        if (family) {
            try {
                const qs = await questService.getAllQuests(family.id);
                const localData = getLocalData();
                const localQuests = localData.quests || [];
                const qMap = new Map<string, any>();
                qs.forEach(q => qMap.set(q.id, q));
                localQuests.forEach(q => qMap.set(q.id, q));
                store.set('quests', Array.from(qMap.values()));
            } catch (e) {
                console.warn('Failed to load quests in quest-manage:', e);
            }
        }
    };
    refreshQuests();

    const onStorage = (e: StorageEvent) => {
        if (e.key === 'moneytree_data') {
            const fresh = getLocalData();
            if (fresh.quests && fresh.quests.length > 0) {
                store.set('quests', fresh.quests);
            }
            refreshQuests();
        }
    };
    const onLocalChange = () => {
        const fresh = getLocalData();
        if (fresh.quests && fresh.quests.length > 0) {
            store.set('quests', fresh.quests);
        }
        refreshQuests();
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener('moneytree_local_change', onLocalChange);
    window.addEventListener('focus', refreshQuests);

    const family = store.get('family');
    const questSub = questService.subscribeToQuests(family?.id || '', () => refreshQuests());

    router.onCleanup(() => {
        questSub.unsubscribe();
        window.removeEventListener('storage', onStorage);
        window.removeEventListener('moneytree_local_change', onLocalChange);
        window.removeEventListener('focus', refreshQuests);
    });

    return container;
}

