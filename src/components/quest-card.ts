export interface Quest {
  id?: string;
  title: string;
  reward_amount: number;
  status?: string;
  repeat_type?: string;
  requires_photo?: boolean;
  assigned_child_id?: string;
}

export interface QuestSubmission {
  id: string;
  status: string;
  photo_url?: string;
  parent_comment?: string;
  reward_amount?: number;
  quest_title?: string;
  quest?: Quest;
}

export interface QuestCardOptions {
  showActions?: boolean;
  onSubmit?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
}

export function createQuestCard(quest: Quest, submission?: QuestSubmission, options?: QuestCardOptions): HTMLElement {
  const card = document.createElement('div');
  card.className = 'quest-card';
  
  let statusClass = 'status-active';
  let statusText = 'チャレンジ中';
  
  if (submission) {
    if (submission.status === 'PENDING') {
      statusClass = 'status-pending';
      statusText = 'かくにん中';
    } else if (submission.status === 'APPROVED') {
      statusClass = 'status-approved';
      statusText = 'クリア！';
    } else if (submission.status === 'REJECTED') {
      statusClass = 'status-rejected';
      statusText = 'やりなおし';
    }
  }

  let repeatBadge = '';
  if (quest.repeat_type === 'DAILY') {
    repeatBadge = '<span class="badge badge-daily">まいにち</span>';
  } else if (quest.repeat_type === 'WEEKLY') {
    repeatBadge = '<span class="badge badge-weekly">まいしゅう</span>';
  }

  const assignedBadge = quest.assigned_child_id
    ? '<span class="badge" style="background: #E8F5E9; color: #2E7D32; border: 1px solid #A5D6A7; font-size: 0.75rem; padding: 2px 6px; border-radius: 6px; font-weight: bold;">🧒 あなた専用</span>'
    : '';

  const photoIcon = quest.requires_photo ? '<span class="photo-icon" title="しゃしんがひつよう">📷</span>' : '';

  const displayTitle = quest.title && quest.title !== 'おてつだい' && quest.title !== 'クエスト'
    ? quest.title
    : (submission?.quest_title || submission?.quest?.title || quest.title || 'クエスト');

  const displayReward = quest.reward_amount !== undefined && quest.reward_amount > 0
    ? quest.reward_amount
    : (submission?.reward_amount ?? submission?.quest?.reward_amount ?? quest.reward_amount ?? 0);

  card.innerHTML = `
    <div class="quest-card-header">
      <h3 class="quest-title">${displayTitle}</h3>
      <div class="quest-badges">
        ${assignedBadge}
        ${repeatBadge}
        ${photoIcon}
      </div>
    </div>
    <div class="quest-card-body">
      <div class="reward-badge">🪙 ${displayReward}</div>
      <div class="status-indicator ${statusClass}">${statusText}</div>
    </div>
    ${submission?.parent_comment ? `
      <div class="quest-comment-box" style="margin-top: 6px; padding: 6px 10px; background: ${submission.status === 'REJECTED' ? '#FFEBEE' : '#E8F5E9'}; border-radius: 8px; font-size: 0.85rem; color: ${submission.status === 'REJECTED' ? '#C62828' : '#2E7D32'}; font-weight: 500;">
        💬 おとなのひと: ${submission.parent_comment}
      </div>
    ` : ''}
    <div class="quest-card-actions" style="display: none;"></div>
  `;

  const actionsContainer = card.querySelector('.quest-card-actions') as HTMLElement;

  if (options?.showActions) {
    actionsContainer.style.display = 'flex';
    
    // Child view: no submission yet or rejected
    if (!submission || submission.status === 'REJECTED') {
      const submitBtn = document.createElement('button');
      submitBtn.className = 'btn btn-primary btn-block';
      submitBtn.textContent = 'かんりょう！';
      if (options.onSubmit) {
        submitBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          options.onSubmit!();
        });
      }
      actionsContainer.appendChild(submitBtn);
    }
    
    // Parent view: pending submission
    if (submission && submission.status === 'PENDING' && (options.onApprove || options.onReject)) {
      if (submission.photo_url) {
        const img = document.createElement('img');
        img.src = submission.photo_url;
        img.className = 'quest-submission-photo';
        actionsContainer.appendChild(img);
      }
      
      const btnGroup = document.createElement('div');
      btnGroup.className = 'btn-group';
      
      if (options.onApprove) {
        const approveBtn = document.createElement('button');
        approveBtn.className = 'btn btn-success';
        approveBtn.textContent = '承認する';
        approveBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          options.onApprove!();
        });
        btnGroup.appendChild(approveBtn);
      }
      
      if (options.onReject) {
        const rejectBtn = document.createElement('button');
        rejectBtn.className = 'btn btn-danger';
        rejectBtn.textContent = 'やり直し';
        rejectBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          options.onReject!();
        });
        btnGroup.appendChild(rejectBtn);
      }
      
      actionsContainer.appendChild(btnGroup);
    }
  }

  return card;
}
