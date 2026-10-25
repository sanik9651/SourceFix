/**
 * SourceFix — Tips & Donation Module
 * Exclusive Support: Buy Me a Coffee (buymeacoffee.com/puzikov020g) & Monobank card (4441 1110 3714 3868)
 */

export const TIPS_CONFIG = {
    authorName: "Разработчик SourceFix",
    buyMeACoffeeUrl: "https://buymeacoffee.com/puzikov020g",
    monobankCard: "4441 1110 3714 3868",
    monobankRaw: "4441111037143868",
    bankName: "Monobank (Монобанк)"
};

async function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (_) {}
    }
    try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const success = document.execCommand('copy');
        textArea.remove();
        return success;
    } catch (_) {
        return false;
    }
}

export function initTips() {
    const modal = document.getElementById('tipModal');
    if (!modal) return;

    const closeBtn = document.getElementById('tipModalClose');
    const backdrop = document.getElementById('tipModalBackdrop');
    const headerBtn = document.getElementById('tipBtnHeader');
    const successBtn = document.getElementById('tipBtnSuccess');
    const footerBtn = document.getElementById('tipBtnFooter');

    function openModal() {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        setTimeout(() => {
            modal.classList.remove('opacity-0');
            const box = modal.querySelector('.tip-modal-box');
            if (box) box.classList.remove('scale-95');
        }, 10);
    }

    function closeModal() {
        modal.classList.add('opacity-0');
        const box = modal.querySelector('.tip-modal-box');
        if (box) box.classList.add('scale-95');
        setTimeout(() => {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
        }, 200);
    }

    if (headerBtn)  headerBtn.addEventListener('click', openModal);
    if (successBtn) successBtn.addEventListener('click', openModal);
    if (footerBtn)  footerBtn.addEventListener('click', openModal);

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (backdrop) backdrop.addEventListener('click', closeModal);

    window.addEventListener('keydown', e => {
        if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
            closeModal();
        }
    });

    // Monobank copy button
    const copyBtns = document.querySelectorAll('.tip-copy-btn, #tipCopyMonobankBtn');
    copyBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            const rawNumber = btn.dataset.clipboard || TIPS_CONFIG.monobankRaw;
            const success = await copyToClipboard(rawNumber);
            if (success) {
                const textSpan = btn.querySelector('.tip-btn-text') || btn.querySelector('span:last-child');
                const origText = textSpan ? textSpan.textContent : btn.textContent;
                if (textSpan) textSpan.textContent = 'Скопировано! ✓';
                btn.classList.add('border-emerald-500', 'text-emerald-400');
                triggerHeartBurst(btn);
                showToast('Номер карты Monobank скопирован!');
                setTimeout(() => {
                    if (textSpan) textSpan.textContent = origText;
                    btn.classList.remove('border-emerald-500', 'text-emerald-400');
                }, 2200);
            } else {
                showToast('Выделите номер вручную: 4441 1110 3714 3868');
            }
        });
    });

    // BMC Links
    const bmcLinks = document.querySelectorAll('.tip-bmc-link');
    bmcLinks.forEach(link => {
        link.href = TIPS_CONFIG.buyMeACoffeeUrl;
        link.addEventListener('click', () => {
            triggerHeartBurst(link);
        });
    });
}

function showToast(msg) {
    let toast = document.getElementById('tipToastNotification');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'tipToastNotification';
        toast.className = 'fixed bottom-6 right-6 z-[100] px-4 py-3 rounded-2xl glass border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 text-xs font-mono font-bold shadow-2xl flex items-center gap-2 transition-all duration-300 transform translate-y-10 opacity-0 pointer-events-none';
        document.body.appendChild(toast);
    }
    toast.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="16 12 12 8 8 12"/></svg>
        <span>${msg}</span>
    `;
    toast.classList.remove('translate-y-10', 'opacity-0');
    setTimeout(() => {
        toast.classList.add('translate-y-10', 'opacity-0');
    }, 2500);
}

function triggerHeartBurst(targetEl) {
    if (!targetEl) return;
    const rect = targetEl.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    const emojis = ['☕', '❤️', '✨', '🪙', '🚀'];
    for (let i = 0; i < 7; i++) {
        const el = document.createElement('div');
        el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
        el.className = 'fixed pointer-events-none z-[120] text-sm select-none transition-all duration-700 ease-out';
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        el.style.transform = 'translate(-50%, -50%) scale(0.5)';
        document.body.appendChild(el);

        const angle = Math.random() * Math.PI * 2;
        const dist = 30 + Math.random() * 50;
        const tx = Math.cos(angle) * dist;
        const ty = Math.sin(angle) * dist - 25;

        requestAnimationFrame(() => {
            el.style.transform = `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(1.3)`;
            el.style.opacity = '0';
        });

        setTimeout(() => el.remove(), 750);
    }
}
