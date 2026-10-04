import { router } from '../../lib/router';
import { store } from '../../lib/store';
import { createNavBar } from '../../components/nav';
import { createQuestCard } from '../../components/quest-card';
import { showModal } from '../../components/modal';
import { showToast } from '../../components/toast';
import { questService } from '../../services/quest.service';
import { getLocalData, saveLocalData } from '../../services/local-data';
import { compressImage, fileToDataUrl } from '../../utils/image-compress';
import { soundManager } from '../../utils/sound';
import { fireSuccess } from '../../utils/confetti';

export function createChildQuests(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'screen-container child-theme';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.height = '100vh';

    const header = document.createElement('h1');
    header.innerText = 'クエスト';
    header.style.textAlign = 'center';
    header.style.margin = '1rem 0 0.5rem';
    header.style.fontSize = '1.75rem';
    container.appendChild(header);

    // Tab bar
    const tabBar = document.createElement('div');
    tabBar.className = 'tab-bar';
    tabBar.style.display = 'flex';
    tabBar.style.justifyContent = 'space-around';
    tabBar.style.margin = '0 1rem';
    tabBar.style.borderRadius = '16px';
    tabBar.style.background = 'rgba(255,255,255,0.7)';
    tabBar.style.padding = '4px';
    
    const tabs = ['できること', 'かくにん中', 'おわったよ'];
    let activeTab = 'できること';
    
    const contentArea = document.createElement('div');
    contentArea.className = 'quest-list-screen';
    contentArea.style.flexGrow = '1';
    contentArea.style.overflowY = 'auto';
    contentArea.style.padding = '1rem';
    contentArea.style.paddingBottom = '5rem';

    const renderTabs = () => {
        tabBar.innerHTML = '';
        tabs.forEach(tab => {
            const btn = document.createElement('button');
            btn.innerText = tab;
            btn.className = `tab-btn ${tab === activeTab ? 'active' : ''}`;
            btn.style.padding = '10px';
            btn.style.flexGrow = '1';
            btn.style.minHeight = '44px';
            btn.style.border = 'none';
            btn.style.borderRadius = '12px';
            btn.style.fontWeight = 'bold';
            btn.style.cursor = 'pointer';
            if (tab === activeTab) {
                btn.style.background = '#4CAF50';
                btn.style.color = 'white';
            } else {
                btn.style.background = 'transparent';
                btn.style.color = '#555';
            }
            btn.onclick = () => {
                activeTab = tab;
                renderTabs();
                renderContent();
            };
            tabBar.appendChild(btn);
        });
    };

    let lastRenderedContentKey = '';

    const renderContent = () => {
        const state = store.getState();
        if (!state) return;
        
        let items: any[] = [];
        let emptyMsg = '';

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
                // 承認済み(APPROVED)・差し戻し(REJECTED)のステータスを優先
                const status = (s.status === 'APPROVED' || s.status === 'REJECTED') ? s.status
                    : (existing.status === 'APPROVED' || existing.status === 'REJECTED') ? existing.status
                    : s.status;
                const parent_comment = s.parent_comment || existing.parent_comment;
                const reviewed_at = s.reviewed_at || existing.reviewed_at;
                subMap.set(s.id, { ...existing, ...s, status, parent_comment, reviewed_at });
            }
        });
        const rawSubs = Array.from(subMap.values());
        const currentChildId = state.currentUser?.id;
        const currentFamilyId = state.currentUser?.family_id || state.family?.id;

        if (activeTab === 'できること') {
            const pendingQuestIds = new Set(
                rawSubs
                    .filter((s: any) => (!currentChildId || s.child_id === currentChildId) && s.status === 'PENDING')
                    .map((s: any) => s.quest_id)
            );
            items = rawQuests.filter((q: any) => {
                const isForFam = !currentFamilyId || !q.family_id || q.family_id === currentFamilyId;
                const isForMe = !q.assigned_child_id || q.assigned_child_id === currentChildId;
                return isForFam && q.is_active && isForMe && !pendingQuestIds.has(q.id);
            });
            emptyMsg = 'いまできる クエストは ないよ！';
        } else if (activeTab === 'かくにん中') {
            items = rawSubs.filter((q: any) => (!currentChildId || q.child_id === currentChildId) && q.status === 'PENDING');
            emptyMsg = 'かくにん中の クエストは ないよ！';
        } else {
            // おわったよタブ: 承認されたクエストを表示
            items = rawSubs.filter((q: any) => (!currentChildId || q.child_id === currentChildId) && q.status === 'APPROVED');
            emptyMsg = 'おわった クエストは まだないよ！';
        }

        const contentKey = `${activeTab}_${JSON.stringify(items.map((i: any) => [i.id, i.status, i.is_active, i.parent_comment, i.reward_amount]))}`;
        if (contentKey === lastRenderedContentKey) {
            return;
        }
        lastRenderedContentKey = contentKey;
        contentArea.innerHTML = '';

        if (items.length === 0) {
            const emptyEl = document.createElement('div');
            emptyEl.className = 'card';
            emptyEl.innerText = emptyMsg;
            emptyEl.style.textAlign = 'center';
            emptyEl.style.color = '#666';
            emptyEl.style.padding = '2rem 1rem';
            emptyEl.style.marginTop = '2rem';
            contentArea.appendChild(emptyEl);
        } else {
            items.forEach((item: any) => {
                let card: HTMLElement;
                if (activeTab === 'できること') {
                    // 直近の提出（差し戻し・やり直し理由の表示用）を確認
                    const latestSub = state.submissions?.filter((s: any) => s.quest_id === item.id)
                        .sort((a: any, b: any) => new Date(b.submitted_at || 0).getTime() - new Date(a.submitted_at || 0).getTime())[0];
                    card = createQuestCard(item, latestSub?.status === 'REJECTED' ? latestSub : undefined, {
                        showActions: true,
                        onSubmit: () => openSubmitModal(item)
                    });
                } else {
                    const joinedQuest = (item.quests ? (Array.isArray(item.quests) ? item.quests[0] : item.quests) : null) || item.quest;
                    let foundQuest = state.quests?.find((q: any) => q.id === item.quest_id) || joinedQuest;
                    if (!foundQuest || foundQuest.reward_amount === undefined) {
                        try {
                            const localData = JSON.parse(localStorage.getItem('moneytree_data') || '{}');
                            foundQuest = (localData.quests || []).find((q: any) => q.id === item.quest_id) || foundQuest;
                        } catch {}
                    }
                    const quest = {
                        title: foundQuest?.title || item.quest_title || 'クエスト',
                        reward_amount: foundQuest?.reward_amount !== undefined ? foundQuest.reward_amount : (item.reward_amount !== undefined ? item.reward_amount : 0),
                        repeat_type: foundQuest?.repeat_type,
                        requires_photo: foundQuest?.requires_photo
                    };
                    card = createQuestCard(quest, item);
                }
                contentArea.appendChild(card);
            });
        }
    };

    const openSubmitModal = (quest: any) => {
        const child = store.get('currentUser');
        if (!child) return;

        let selectedPhotoDataUrl = '';

        const content = document.createElement('div');
        content.innerHTML = `
            <h3 style="margin-top: 0; color: #2E7D32;">${quest.title}</h3>
            ${quest.description ? `<p style="color: #666; margin-bottom: 1rem;">${quest.description}</p>` : ''}
            <div style="background: #FFF8E1; padding: 0.75rem; border-radius: 8px; margin-bottom: 1rem; color: #F57F17; font-weight: bold;">
                🪙 ごほうび: ${quest.reward_amount} コイン
            </div>
            
            ${quest.requires_photo ? `
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; font-weight: bold; margin-bottom: 6px;">📷 しゃしんをとる（かならず）</label>
                    <input type="file" id="quest-photo-file" accept="image/*" capture="environment" style="display: none;">
                    <button id="photo-upload-btn" type="button" style="width: 100%; min-height: 48px; border: 2px dashed #4CAF50; background: #F1F8E9; border-radius: 8px; font-weight: bold; cursor: pointer;">📷 カメラをつかう / しゃしんをえらぶ</button>
                    <div id="photo-preview-wrap" style="display: none; margin-top: 10px; text-align: center;">
                        <img id="photo-preview" style="max-width: 100%; max-height: 180px; border-radius: 8px; object-fit: cover;" alt="プレビュー" />
                    </div>
                </div>
            ` : ''}

            <button id="submit-quest-btn" class="primary-btn btn-primary" style="width: 100%; min-height: 52px; font-size: 1.1rem; border-radius: 12px; border: none; font-weight: bold; cursor: pointer; color: white;">
                ✨ かんりょう！ほうこくする
            </button>
        `;

        let modalObj: { close: () => void } | null = null;

        if (quest.requires_photo) {
            const fileInput = content.querySelector('#quest-photo-file') as HTMLInputElement;
            const photoBtn = content.querySelector('#photo-upload-btn') as HTMLButtonElement;
            const previewWrap = content.querySelector('#photo-preview-wrap') as HTMLElement;
            const previewImg = content.querySelector('#photo-preview') as HTMLImageElement;

            photoBtn.onclick = () => fileInput.click();
            fileInput.onchange = async () => {
                if (fileInput.files && fileInput.files[0]) {
                    const file = fileInput.files[0];
                    selectedPhotoDataUrl = await fileToDataUrl(file);
                    previewImg.src = selectedPhotoDataUrl;
                    previewWrap.style.display = 'block';
                    photoBtn.textContent = '📷 べつの しゃしんに かえる';
                }
            };
        }

        const submitBtn = content.querySelector('#submit-quest-btn') as HTMLButtonElement;
        submitBtn.onclick = async () => {
            if (quest.requires_photo && !selectedPhotoDataUrl) {
                showToast('しゃしんを とってね！📷', 'error');
                return;
            }

            try {
                submitBtn.disabled = true;
                submitBtn.textContent = 'おくっているよ...';

                const newSubmission = await questService.submitQuest(quest.id, child.id, selectedPhotoDataUrl);
                soundManager.play('success');
                fireSuccess();
                showToast('クエストを ほうこくしたよ！パパ・ママに つたえたよ', 'success');
                modalObj?.close();

                // ストアの submissions を即時更新して UI に反映
                const currentSubmissions = store.get('submissions') || [];
                store.set('submissions', [newSubmission, ...currentSubmissions]);

                activeTab = 'かくにん中';
                renderTabs();
                renderContent();
            } catch (err: any) {
                showToast(err.message || 'エラーがおきちゃった', 'error');
                submitBtn.disabled = false;
                submitBtn.textContent = '✨ かんりょう！ほうこくする';
            }
        };

        modalObj = showModal({ title: 'クエストの ほうこく', content });
    };

    container.appendChild(tabBar);
    container.appendChild(contentArea);
    container.appendChild(createNavBar('CHILD'));

    store.onAny(() => {
        renderTabs();
        renderContent();
    });
    
    renderTabs();
    renderContent();

    // 最新のクエストと提出データを再取得
    const refreshData = async () => {
        const s = store.getState();
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
    };
    refreshData();

    const onStorage = (e: StorageEvent) => {
        if (e.key === 'moneytree_data') {
            const fresh = getLocalData();
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
    const pollInterval = window.setInterval(refreshData, 3500);

    router.onCleanup(() => {
        window.clearInterval(pollInterval);
        questSub.unsubscribe();
        subSub.unsubscribe();
        window.removeEventListener('storage', onStorage);
        window.removeEventListener('moneytree_local_change', onLocalChange);
        window.removeEventListener('focus', refreshData);
    });

    return container;
}
