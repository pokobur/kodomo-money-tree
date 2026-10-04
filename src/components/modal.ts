interface ModalOptions {
  title: string;
  content: HTMLElement | string;
  buttons?: { label: string; className?: string; onClick: () => void }[];
  onClose?: () => void;
}

export function showModal(options: ModalOptions): { close: () => void } {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  
  const modal = document.createElement('div');
  modal.className = 'modal-card';
  
  const closeBtn = document.createElement('button');
  closeBtn.className = 'modal-close-btn';
  closeBtn.innerHTML = '✕';
  
  const header = document.createElement('div');
  header.className = 'modal-header';
  const title = document.createElement('h3');
  title.textContent = options.title;
  header.appendChild(title);
  header.appendChild(closeBtn);
  
  const body = document.createElement('div');
  body.className = 'modal-body';
  if (typeof options.content === 'string') {
    body.innerHTML = options.content;
  } else {
    body.appendChild(options.content);
  }
  
  modal.appendChild(header);
  modal.appendChild(body);
  
  if (options.buttons && options.buttons.length > 0) {
    const footer = document.createElement('div');
    footer.className = 'modal-footer';
    
    options.buttons.forEach(btnConfig => {
      const btn = document.createElement('button');
      btn.className = `btn ${btnConfig.className || 'btn-primary'}`;
      btn.textContent = btnConfig.label;
      btn.addEventListener('click', btnConfig.onClick);
      footer.appendChild(btn);
    });
    
    modal.appendChild(footer);
  }
  
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  
  // Animation
  requestAnimationFrame(() => {
    overlay.classList.add('visible');
    modal.classList.add('visible');
  });
  
  function close() {
    overlay.classList.remove('visible');
    modal.classList.remove('visible');
    setTimeout(() => {
      if (document.body.contains(overlay)) {
        document.body.removeChild(overlay);
      }
      if (options.onClose) options.onClose();
    }, 300); // Matches transition duration
  }
  
  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      close();
    }
  });
  
  return { close };
}
