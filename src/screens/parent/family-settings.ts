import { router } from '../../lib/router';
import { store } from '../../lib/store';
import { createNavBar } from '../../components/nav';
import { logout } from '../../lib/auth';
import { showToast } from '../../components/toast';
import { showModal } from '../../components/modal';
import { familyService } from '../../services/family.service';
import { accountService } from '../../services/account.service';
import { cleanupService } from '../../services/cleanup.service';
import { getLocalData } from '../../services/local-data';
import { formatCoin } from '../../utils/format';

export function createFamilySettings(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'screen-container parent-theme';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.height = '100vh';

    const contentArea = document.createElement('div');
    contentArea.className = 'parent-settings';
    contentArea.style.flexGrow = '1';
    contentArea.style.overflowY = 'auto';
    contentArea.style.padding = '1.25rem';
    contentArea.style.paddingBottom = '5rem';

    const header = document.createElement('h1');
    header.innerText = 'ファミリー設定';
    header.style.color = '#3F51B5';
    header.style.fontSize = '1.75rem';
    header.style.marginBottom = '1.5rem';
    contentArea.appendChild(header);

    // Finance Settings
    const financeSection = document.createElement('div');
    financeSection.className = 'card';
    financeSection.style.marginBottom = '1.5rem';
    contentArea.appendChild(financeSection);

    // Balance Adjustments
    const balanceSection = document.createElement('div');
    contentArea.appendChild(balanceSection);

    // Family Code
    const codeSection = document.createElement('div');
    contentArea.appendChild(codeSection);

    // Data Cleanup & Optimization
    const cleanupSection = document.createElement('div');
    contentArea.appendChild(cleanupSection);

    // Logout
    const logoutBtn = document.createElement('button');
    logoutBtn.innerText = 'ログアウト';
    logoutBtn.className = 'btn';
    logoutBtn.style.width = '100%';
    logoutBtn.style.minHeight = '48px';
    logoutBtn.style.marginTop = '2rem';
    logoutBtn.style.border = '2px solid #EF5350';
    logoutBtn.style.color = '#EF5350';
    logoutBtn.style.background = 'white';
    logoutBtn.style.fontWeight = 'bold';
    logoutBtn.onclick = async () => {
        await logout();
        router.navigate('/');
    };
    contentArea.appendChild(logoutBtn);

    container.appendChild(contentArea);
    container.appendChild(createNavBar('PARENT'));

    const render = () => {
        const state = store.getState();
        if (!state) return;

        const family = state.family;
        const localData = getLocalData();
        const deletedIds = new Set(localData.deletedChildIds || []);
        const children = (state.children || []).filter((c: any) => !deletedIds.has(c.id));
        const localAccounts = (localData.accounts || []).filter((a: any) => !deletedIds.has(a.child_id));
        const accounts = (state.accounts || localAccounts).filter((a: any) => !deletedIds.has(a.child_id));
        const defaultRate = Math.round((family?.weekly_interest_rate ?? 0.05) * 100);
        const defaultLimit = family?.max_weekly_reward_limit ?? 5000;

        let childCardsHtml = '';
        if (children.length === 0) {
            childCardsHtml = `
                <div style="background: #F1F8E9; border-radius: 10px; padding: 1rem; color: #555; text-align: center; margin-bottom: 1rem;">
                    こどもが登録されていません。<br>
                    「こども管理」画面からこどもを追加すると、こどもごとに個別の金利ルールを設定できます。
                </div>
            `;
        } else {
            childCardsHtml = children.map((child: any) => {
                const acc = accounts.find((a: any) => a.child_id === child.id);
                const childRate = acc?.weekly_interest_rate != null 
                    ? Math.round(acc.weekly_interest_rate * 100) 
                    : (child.weekly_interest_rate != null ? Math.round(child.weekly_interest_rate * 100) : defaultRate);
                const childLimit = acc?.max_weekly_reward_limit != null 
                    ? acc.max_weekly_reward_limit 
                    : (child.max_weekly_reward_limit != null ? child.max_weekly_reward_limit : defaultLimit);
                const childSchedType = acc?.interest_schedule_type || child.interest_schedule_type || family?.interest_schedule_type || 'WEEKLY';
                const childSchedDay = acc?.interest_schedule_day != null
                    ? acc.interest_schedule_day
                    : (child.interest_schedule_day != null ? child.interest_schedule_day : (family?.interest_schedule_day ?? 0));
                const displayName = child.display_name || (child as any)?.nickname || 'こども';

                const daysOfWeek = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'];
                const weeklyOptions = daysOfWeek.map((d, i) => `<option value="${i}" ${childSchedDay === i ? 'selected' : ''}>毎週 ${d}</option>`).join('');
                const monthlyOptions = Array.from({ length: 31 }, (_, i) => i + 1).map(d => `<option value="${d}" ${childSchedDay === d ? 'selected' : ''}>毎月 ${d}日</option>`).join('');

                return `
                    <div class="child-rule-box card" data-child-id="${child.id}" style="background: #FFFFFF; border: 1px solid #E0E0E0; border-radius: 12px; padding: 1.1rem; margin-bottom: 1rem; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.85rem;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <div style="width: 38px; height: 38px; border-radius: 19px; background: #81C784; color: white; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; font-weight: bold;">
                                    ${displayName[0] || '🧒'}
                                </div>
                                <h3 style="margin: 0; font-size: 1.15rem; color: #2E7D32;">${displayName}</h3>
                            </div>
                            <span style="background: #E8F5E9; color: #2E7D32; font-size: 0.75rem; font-weight: bold; padding: 3px 8px; border-radius: 6px;">
                                個別設定
                            </span>
                        </div>
                        <div style="margin-bottom: 1rem;">
                            <label style="font-weight: bold; font-size: 0.88em; display: block; margin-bottom: 4px;">利息率 (1〜10%)</label>
                            <input type="range" class="child-rate-slider" min="1" max="10" value="${childRate}" style="width: 100%;">
                            <div class="child-rate-label" style="text-align: right; color: #4CAF50; font-weight: bold; margin-top: 3px; font-size: 0.88rem;">現在: ${childRate}%</div>
                        </div>
                        <div style="margin-bottom: 1rem;">
                            <label style="font-weight: bold; font-size: 0.88em; display: block; margin-bottom: 4px;">報酬上限（コイン）</label>
                            <input type="number" class="child-limit-input" value="${childLimit}" min="100" step="100" style="width: 100%; min-height: 42px; padding: 0.5rem; border-radius: 8px; border: 1px solid #ccc; font-size: 1rem;">
                        </div>
                        <div style="margin-bottom: 1.1rem; background: #F9FBE7; border: 1px solid #DCE775; border-radius: 8px; padding: 0.75rem;">
                            <label style="font-weight: bold; font-size: 0.88em; display: block; margin-bottom: 6px; color: #33691E;">📅 お小遣い（金利）の付与タイミング</label>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                                <select class="child-sched-type" style="min-height: 40px; padding: 0.4rem; border-radius: 8px; border: 1px solid #ccc; font-size: 0.9rem; background: white;">
                                    <option value="WEEKLY" ${childSchedType === 'WEEKLY' ? 'selected' : ''}>毎週（曜日指定）</option>
                                    <option value="MONTHLY" ${childSchedType === 'MONTHLY' ? 'selected' : ''}>毎月（日にち指定）</option>
                                </select>
                                <select class="child-sched-day-weekly" style="min-height: 40px; padding: 0.4rem; border-radius: 8px; border: 1px solid #ccc; font-size: 0.9rem; background: white; ${childSchedType === 'WEEKLY' ? '' : 'display: none;'}">
                                    ${weeklyOptions}
                                </select>
                                <select class="child-sched-day-monthly" style="min-height: 40px; padding: 0.4rem; border-radius: 8px; border: 1px solid #ccc; font-size: 0.9rem; background: white; ${childSchedType === 'MONTHLY' ? '' : 'display: none;'}">
                                    ${monthlyOptions}
                                </select>
                            </div>
                        </div>
                        <button class="child-save-btn primary-btn btn-primary" style="width: 100%; min-height: 44px; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; color: white; font-size: 0.95rem;">
                            💾 ${displayName}の金利ルールを保存
                        </button>
                    </div>
                `;
            }).join('');
        }

        const daysOfWeek = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'];
        const famSchedType = family?.interest_schedule_type || 'WEEKLY';
        const famSchedDay = family?.interest_schedule_day ?? 0;
        const defaultWeeklyOptions = daysOfWeek.map((d, i) => `<option value="${i}" ${famSchedDay === i ? 'selected' : ''}>毎週 ${d}</option>`).join('');
        const defaultMonthlyOptions = Array.from({ length: 31 }, (_, i) => i + 1).map(d => `<option value="${d}" ${famSchedDay === d ? 'selected' : ''}>毎月 ${d}日</option>`).join('');

        financeSection.innerHTML = `
            <h2 style="font-size: 1.25rem; margin-top: 0; color: #2E7D32;">金利ルール設定（固定こづかい）</h2>
            <p style="font-size: 0.85rem; color: #666; margin-top: -6px; margin-bottom: 1.25rem;">
                お子さまごとに、お小遣い（金利）の割合や報酬上限、付与日（毎週お好きな曜日、または毎月お好きな日）を個別に設定できます。
            </p>
            ${childCardsHtml}
            <div class="card" style="background: #FAFAFA; border: 1px dashed #BDBDBD; border-radius: 12px; padding: 1rem; margin-top: 1rem;">
                <h3 style="margin-top: 0; font-size: 0.95rem; color: #555;">⚙️ ファミリー全体のデフォルト設定</h3>
                <p style="font-size: 0.8rem; color: #777; margin-top: -4px; margin-bottom: 0.75rem;">個別設定がない場合の基準値として使用されます。</p>
                <div style="margin-bottom: 0.75rem;">
                    <label style="font-weight: bold; font-size: 0.85em; display: block; margin-bottom: 4px;">利息率 (1〜10%)</label>
                    <input type="range" id="rate-slider" min="1" max="10" value="${defaultRate}" style="width: 100%;">
                    <div id="rate-label" style="text-align: right; color: #4CAF50; font-weight: bold; margin-top: 2px; font-size: 0.85rem;">現在: ${defaultRate}%</div>
                </div>
                <div style="margin-bottom: 0.75rem;">
                    <label style="font-weight: bold; font-size: 0.85em; display: block; margin-bottom: 4px;">報酬上限（コイン）</label>
                    <input type="number" id="limit-input" value="${defaultLimit}" min="100" step="100" style="width: 100%; min-height: 40px; padding: 0.4rem; border-radius: 8px; border: 1px solid #ccc;">
                </div>
                <div style="margin-bottom: 1rem; background: #FFFFFF; border: 1px solid #E0E0E0; border-radius: 8px; padding: 0.6rem;">
                    <label style="font-weight: bold; font-size: 0.85em; display: block; margin-bottom: 6px; color: #555;">📅 デフォルトの付与タイミング</label>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <select id="default-sched-type" style="min-height: 40px; padding: 0.4rem; border-radius: 8px; border: 1px solid #ccc; font-size: 0.9rem;">
                            <option value="WEEKLY" ${famSchedType === 'WEEKLY' ? 'selected' : ''}>毎週（曜日指定）</option>
                            <option value="MONTHLY" ${famSchedType === 'MONTHLY' ? 'selected' : ''}>毎月（日にち指定）</option>
                        </select>
                        <select id="default-sched-day-weekly" style="min-height: 40px; padding: 0.4rem; border-radius: 8px; border: 1px solid #ccc; font-size: 0.9rem; ${famSchedType === 'WEEKLY' ? '' : 'display: none;'}">
                            ${defaultWeeklyOptions}
                        </select>
                        <select id="default-sched-day-monthly" style="min-height: 40px; padding: 0.4rem; border-radius: 8px; border: 1px solid #ccc; font-size: 0.9rem; ${famSchedType === 'MONTHLY' ? '' : 'display: none;'}">
                            ${defaultMonthlyOptions}
                        </select>
                    </div>
                </div>
                <button id="save-finance-btn" style="width: 100%; min-height: 42px; border: 1px solid #4CAF50; background: white; color: #2E7D32; border-radius: 8px; font-weight: bold; cursor: pointer;">
                    デフォルト設定を保存する
                </button>
            </div>
        `;

        // 子どもごとの設定イベントリスナーを登録
        const childBoxes = financeSection.querySelectorAll('.child-rule-box') as NodeListOf<HTMLElement>;
        childBoxes.forEach(box => {
            const childId = box.getAttribute('data-child-id');
            const slider = box.querySelector('.child-rate-slider') as HTMLInputElement;
            const label = box.querySelector('.child-rate-label') as HTMLElement;
            const limitInput = box.querySelector('.child-limit-input') as HTMLInputElement;
            const schedTypeSelect = box.querySelector('.child-sched-type') as HTMLSelectElement;
            const schedWeeklySelect = box.querySelector('.child-sched-day-weekly') as HTMLSelectElement;
            const schedMonthlySelect = box.querySelector('.child-sched-day-monthly') as HTMLSelectElement;
            const saveBtn = box.querySelector('.child-save-btn') as HTMLButtonElement;
            const child = children.find((c: any) => c.id === childId);
            const displayName = child?.display_name || (child as any)?.nickname || 'こども';

            if (slider && label) {
                slider.oninput = () => {
                    label.textContent = `現在: ${slider.value}%`;
                };
            }

            if (schedTypeSelect && schedWeeklySelect && schedMonthlySelect) {
                schedTypeSelect.onchange = () => {
                    if (schedTypeSelect.value === 'WEEKLY') {
                        schedWeeklySelect.style.display = 'block';
                        schedMonthlySelect.style.display = 'none';
                    } else {
                        schedWeeklySelect.style.display = 'none';
                        schedMonthlySelect.style.display = 'block';
                    }
                };
            }

            if (saveBtn && childId) {
                saveBtn.onclick = async () => {
                    try {
                        saveBtn.disabled = true;
                        saveBtn.textContent = '保存中...';

                        const newRate = parseInt(slider.value, 10) / 100;
                        const newLimit = parseInt(limitInput.value, 10) || 5000;
                        const schedType = (schedTypeSelect?.value || 'WEEKLY') as 'WEEKLY' | 'MONTHLY';
                        const schedDay = schedType === 'WEEKLY'
                            ? (parseInt(schedWeeklySelect?.value, 10) || 0)
                            : (parseInt(schedMonthlySelect?.value, 10) || 1);

                        await accountService.updateChildAccountSettings(childId, {
                            weekly_interest_rate: newRate,
                            max_weekly_reward_limit: newLimit,
                            interest_schedule_type: schedType,
                            interest_schedule_day: schedDay
                        });

                        showToast(`「${displayName}」の金利ルールを保存しました！`, 'success');
                    } catch (err: any) {
                        showToast(err.message || '保存に失敗しました', 'error');
                    } finally {
                        saveBtn.disabled = false;
                        saveBtn.textContent = `💾 ${displayName}の設定を保存`;
                    }
                };
            }
        });

        // ファミリーデフォルト設定のイベントリスナー
        const rateSlider = financeSection.querySelector('#rate-slider') as HTMLInputElement;
        const rateLabel = financeSection.querySelector('#rate-label') as HTMLElement;
        const defSchedType = financeSection.querySelector('#default-sched-type') as HTMLSelectElement;
        const defSchedWeekly = financeSection.querySelector('#default-sched-day-weekly') as HTMLSelectElement;
        const defSchedMonthly = financeSection.querySelector('#default-sched-day-monthly') as HTMLSelectElement;

        if (rateSlider && rateLabel) {
            rateSlider.oninput = () => {
                rateLabel.textContent = `現在: ${rateSlider.value}%`;
            };
        }

        if (defSchedType && defSchedWeekly && defSchedMonthly) {
            defSchedType.onchange = () => {
                if (defSchedType.value === 'WEEKLY') {
                    defSchedWeekly.style.display = 'block';
                    defSchedMonthly.style.display = 'none';
                } else {
                    defSchedWeekly.style.display = 'none';
                    defSchedMonthly.style.display = 'block';
                }
            };
        }

        const saveFinanceBtn = financeSection.querySelector('#save-finance-btn') as HTMLButtonElement;
        if (saveFinanceBtn) {
            saveFinanceBtn.onclick = async () => {
                if (!family) return;
                try {
                    saveFinanceBtn.disabled = true;
                    saveFinanceBtn.textContent = '保存中...';

                    const newRate = parseInt(rateSlider.value, 10) / 100;
                    const limitInput = financeSection.querySelector('#limit-input') as HTMLInputElement;
                    const newLimit = parseInt(limitInput.value, 10) || 5000;
                    const schedType = (defSchedType?.value || 'WEEKLY') as 'WEEKLY' | 'MONTHLY';
                    const schedDay = schedType === 'WEEKLY'
                        ? (parseInt(defSchedWeekly?.value, 10) || 0)
                        : (parseInt(defSchedMonthly?.value, 10) || 1);

                    const updated = await familyService.updateFamilySettings(family.id, {
                        weekly_interest_rate: newRate,
                        max_weekly_reward_limit: newLimit,
                        interest_schedule_type: schedType,
                        interest_schedule_day: schedDay
                    });
                    if (updated) {
                        store.set('family', { ...family, ...updated });
                        showToast('ファミリー全体のデフォルト設定を保存しました！', 'success');
                    }
                } catch (err: any) {
                    showToast(err.message || '保存に失敗しました', 'error');
                } finally {
                    saveFinanceBtn.disabled = false;
                    saveFinanceBtn.textContent = 'デフォルト設定を保存する';
                }
            };
        }

        balanceSection.innerHTML = '<h2 style="font-size: 1.2rem; margin: 1.5rem 0 0.75rem;">残高調整（手動補正）</h2>';
        if (children.length === 0) {
            balanceSection.innerHTML += '<div class="card" style="padding: 1rem; color: #888;">こどもが登録されていません</div>';
        } else {
            children.forEach((child: any) => {
                const el = document.createElement('div');
                el.className = 'card';
                el.style.marginBottom = '1rem';
                const acc = (state.accounts || []).find((a: any) => a.child_id === child.id)
                    || localAccounts.find((a: any) => a.child_id === child.id);
                const spending = acc?.spending_balance ?? 0;
                const savings = acc?.savings_balance ?? 0;

                el.innerHTML = `
                    <h3 style="margin-top: 0;">${child.display_name}</h3>
                    <div style="font-size: 0.85em; color: #666; margin-bottom: 10px;">
                        つかう残高: <strong style="color: #FF7043;">${formatCoin(spending)}</strong> | 貯金残高: <strong style="color: #4CAF50;">${formatCoin(savings)}</strong>
                    </div>
                    <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                        <select class="adj-account" style="flex: 1; min-height: 44px; padding: 0.5rem; border-radius: 8px; border: 1px solid #ccc;">
                            <option value="SPENDING">つかう口座</option>
                            <option value="SAVINGS">ためる（貯金）口座</option>
                        </select>
                        <input type="number" class="adj-amount" placeholder="金額 (例: 50 または -50)" style="flex: 1; min-height: 44px; padding: 0.5rem; border-radius: 8px; border: 1px solid #ccc;">
                    </div>
                    <input type="text" class="adj-reason" placeholder="調整の理由 (例: おこづかい、ペナルティ等)" style="width: 100%; min-height: 44px; padding: 0.5rem; border-radius: 8px; border: 1px solid #ccc; margin-bottom: 10px;">
                    <button class="adj-submit-btn" style="width: 100%; min-height: 44px; border-radius: 8px; border: none; background: #5C6BC0; color: white; font-weight: bold; cursor: pointer;">残高を調整する</button>
                `;

                const adjBtn = el.querySelector('.adj-submit-btn') as HTMLButtonElement;
                adjBtn.onclick = async () => {
                    const accSelect = el.querySelector('.adj-account') as HTMLSelectElement;
                    const amountInput = el.querySelector('.adj-amount') as HTMLInputElement;
                    const reasonInput = el.querySelector('.adj-reason') as HTMLInputElement;

                    const amount = parseInt(amountInput.value, 10);
                    const reason = reasonInput.value.trim() || '保護者による調整';

                    if (isNaN(amount) || amount === 0) {
                        showToast('0以外の調整金額を入力してください', 'error');
                        return;
                    }

                    try {
                        adjBtn.disabled = true;
                        await accountService.adjustBalance(child.id, accSelect.value as any, amount, reason);
                        const family = store.get('family');
                        if (family) {
                            const accs = await accountService.getAccountsForFamily(family.id);
                            store.set('accounts', accs);
                        }
                        showToast(`${child.display_name}の残高を調整しました！`, 'success');
                        amountInput.value = '';
                        reasonInput.value = '';
                    } catch (err: any) {
                        showToast(err.message || '調整に失敗しました', 'error');
                    } finally {
                        adjBtn.disabled = false;
                    }
                };

                balanceSection.appendChild(el);
            });
        }

        const code = state.family?.family_code || '------';
        codeSection.innerHTML = `
            <h2 style="font-size: 1.2rem; margin: 1.5rem 0 0.75rem;">ファミリーコード</h2>
            <div class="card" style="text-align: center; background: linear-gradient(135deg, #E8EAF6, #C5CAE9); border: 1px solid #9FA8DA;">
                <p style="margin: 0; color: #3F51B5; font-size: 0.9em; font-weight: bold;">お子さまのログイン時に必要です（数字6桁）</p>
                <h2 style="letter-spacing: 4px; font-size: 2.2rem; margin: 0.75rem 0; font-family: monospace; color: #1A237E;">${code}</h2>
                <div style="display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
                    <button id="copy-code-settings" style="min-height: 42px; padding: 0 1.25rem; border-radius: 21px; border: none; background: #3F51B5; color: white; font-weight: bold; cursor: pointer;">コードをコピー</button>
                    <button id="regen-code-settings" style="min-height: 42px; padding: 0 1rem; border-radius: 21px; border: 1px solid #3F51B5; background: white; color: #3F51B5; font-weight: bold; cursor: pointer;">数字コードを再発行</button>
                </div>
            </div>
        `;

        const copyBtn = codeSection.querySelector('#copy-code-settings') as HTMLButtonElement;
        if (copyBtn) {
            copyBtn.onclick = () => {
                navigator.clipboard.writeText(code);
                showToast('ファミリーコードをコピーしました！', 'info');
            };
        }

        const regenBtn = codeSection.querySelector('#regen-code-settings') as HTMLButtonElement;
        if (regenBtn) {
            regenBtn.onclick = async () => {
                if (!confirm('新しい6桁の数字ファミリーコードを発行しますか？\n（お子さまがログインする際のコードが変わります）')) return;
                try {
                    regenBtn.disabled = true;
                    if (state.family?.id) {
                        const newCode = await familyService.generateNewFamilyCode(state.family.id);
                        showToast(`新しいファミリーコード(${newCode})を発行しました`, 'success');
                    }
                } catch (err: any) {
                    showToast(err.message || 'コードの再発行に失敗しました', 'error');
                    regenBtn.disabled = false;
                }
            };
        }

        // Data Cleanup & Optimization Section
        cleanupSection.innerHTML = `
            <h2 style="font-size: 1.2rem; margin: 1.5rem 0 0.75rem;">データ管理・容量最適化</h2>
            <div class="card" style="padding: 1.25rem;">
                <p style="margin: 0 0 0.75rem 0; font-size: 0.9em; color: #555; line-height: 1.5;">
                    30日以上前の承認・却下済みのお手伝い履歴や古い出金申請など、不要になった履歴データを削除して容量を節約します。<br>
                    <span style="font-size: 0.85em; color: #888;">※未承認データや現在の口座残高はそのまま保持されます。</span>
                </p>
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0; margin-bottom: 0.75rem; border-top: 1px solid #eee; border-bottom: 1px solid #eee; font-size: 0.85em; color: #2E7D32;">
                    <span>⚡ 24時間ごとの自動クリーンアップ: <strong>有効</strong></span>
                </div>
                <button id="manual-cleanup-btn" style="width: 100%; min-height: 44px; border-radius: 8px; border: 1px solid #4CAF50; background: #E8F5E9; color: #2E7D32; font-weight: bold; cursor: pointer;">
                    🧹 不要なデータを今すぐ整理する
                </button>

                <div style="margin-top: 1.5rem; padding-top: 1.25rem; border-top: 1px dashed #EF5350;">
                    <p style="margin: 0 0 0.5rem 0; font-size: 0.9em; color: #D32F2F; font-weight: bold;">
                        ⚠️ データベース初期化（全データリセット）
                    </p>
                    <p style="margin: 0 0 0.75rem 0; font-size: 0.8em; color: #777; line-height: 1.4;">
                        登録した子ども、口座残高、クエスト、取引履歴などの全データを消去し、アプリを初期状態に戻します。
                    </p>
                    <button id="reset-all-data-btn" style="width: 100%; min-height: 44px; border-radius: 8px; border: 1px solid #EF5350; background: #FFEBEE; color: #D32F2F; font-weight: bold; cursor: pointer;">
                        🗑️ データベースを初期化する
                    </button>
                </div>
            </div>
        `;

        const cleanupBtn = cleanupSection.querySelector('#manual-cleanup-btn') as HTMLButtonElement;
        if (cleanupBtn) {
            cleanupBtn.onclick = async () => {
                try {
                    cleanupBtn.disabled = true;
                    cleanupBtn.textContent = '整理中...';
                    const res = await cleanupService.checkAndCleanup(true);
                    if (res) {
                        const total = res.submissionsCleaned + res.withdrawalsCleaned + res.transactionsCleaned + res.wishItemsCleaned;
                        if (total > 0) {
                            showToast(`不要データを整理しました（お手伝い: ${res.submissionsCleaned}件, 出金: ${res.withdrawalsCleaned}件, 履歴: ${res.transactionsCleaned}件）`, 'success');
                        } else {
                            showToast('削除対象の古い不要データはありませんでした（データは最新です）', 'info');
                        }
                    } else {
                        showToast('データの最適化が完了しました', 'info');
                    }
                } catch (e: any) {
                    showToast(e.message || 'クリーンアップに失敗しました', 'error');
                } finally {
                    cleanupBtn.disabled = false;
                    cleanupBtn.textContent = '🧹 不要なデータを今すぐ整理する';
                }
            };
        }

        const resetAllBtn = cleanupSection.querySelector('#reset-all-data-btn') as HTMLButtonElement;
        if (resetAllBtn) {
            resetAllBtn.onclick = () => {
                const modalContent = document.createElement('div');
                modalContent.innerHTML = `
                    <p style="margin-bottom: 1rem; color: #333; line-height: 1.5;">
                        <strong style="color: #D32F2F;">本当にデータベース・全データを初期化しますか？</strong><br><br>
                        登録中のこども、口座残高、クエスト、取引明細、出金申請などのすべてのデータが完全に削除され、初期状態に戻ります。<br>
                        <span style="font-size: 0.85em; color: #888;">※この操作は取り消せません。</span>
                    </p>
                    <div style="display: flex; gap: 10px; margin-top: 1.5rem;">
                        <button id="cancel-reset-modal-btn" style="flex: 1; min-height: 44px; border-radius: 8px; border: 1px solid #ccc; background: white; cursor: pointer;">キャンセル</button>
                        <button id="exec-reset-modal-btn" style="flex: 1; min-height: 44px; border-radius: 8px; border: none; background: #D32F2F; color: white; font-weight: bold; cursor: pointer;">完全に初期化する</button>
                    </div>
                `;

                const modalObj = showModal({ title: '⚠️ データベース初期化の確認', content: modalContent });

                const cancelBtn = modalContent.querySelector('#cancel-reset-modal-btn') as HTMLButtonElement;
                if (cancelBtn) cancelBtn.onclick = () => modalObj.close();

                const execBtn = modalContent.querySelector('#exec-reset-modal-btn') as HTMLButtonElement;
                if (execBtn) {
                    execBtn.onclick = async () => {
                        try {
                            execBtn.disabled = true;
                            execBtn.textContent = '初期化中...';
                            await cleanupService.resetAllData();
                            modalObj.close();
                            showToast('データベースを初期化しました', 'success');
                            setTimeout(() => {
                                window.location.href = '#/';
                                window.location.reload();
                            }, 500);
                        } catch (err: any) {
                            showToast(err.message || '初期化に失敗しました', 'error');
                            execBtn.disabled = false;
                            execBtn.textContent = '完全に初期化する';
                        }
                    };
                }
            };
        }
    };

    store.onAny(render);
    render();

    return container;
}

