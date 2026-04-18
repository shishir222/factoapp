const APP_ID = 'facto-swipe-v18';

let state = {
    settings: JSON.parse(localStorage.getItem(`${APP_ID}-settings`)) || { soundEnabled: true, theme: 'dark' },
    stats: JSON.parse(localStorage.getItem(`${APP_ID}-stats`)) || { dailyCount: 0, lastDate: new Date().toDateString(), goalReachedToday: false },
    loading: true
};

const els = {
    card: document.getElementById('card'),
    factText: document.getElementById('fact-text'),
    loader: document.getElementById('loader'),
    actions: document.getElementById('actions'),
    overlaySkip: document.getElementById('overlay-skip'),
    overlayLearn: document.getElementById('overlay-learn'),
    progressBar: document.getElementById('progress-bar'),
    settingsScreen: document.getElementById('screen-settings'),
    subpageCreator: document.getElementById('subpage-creator'),
    modalGoal: document.getElementById('modal-goal'),
    soundKnob: document.getElementById('sound-knob'),
    toggleSound: document.getElementById('toggle-sound')
};

function playSound(type) {
    if (!state.settings.soundEnabled) return;
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        if (type === 'swipe-right') {
            osc.frequency.setValueAtTime(600, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1000, ctx.currentTime + 0.1);
        } else if (type === 'swipe-left') {
            osc.frequency.setValueAtTime(400, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.1);
        } else {
            osc.frequency.setValueAtTime(800, ctx.currentTime);
        }
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
    } catch(e) {}
}

async function fetchNewFact() {
    state.loading = true;
    els.loader.classList.remove('hidden');
    els.card.classList.add('hidden');
    els.actions.classList.add('hidden');
    
    els.card.style.transform = `translate(0, 0) rotate(0deg)`;
    els.card.style.opacity = '1';
    els.overlaySkip.style.opacity = '0';
    els.overlayLearn.style.opacity = '0';
    els.card.className = els.card.className.replace(/swiping-\w+/, '').trim();

    try {
        const res = await fetch('https://uselessfacts.jsph.pl/random.json?language=en');
        const data = await res.json();
        els.factText.textContent = `"${data.text}"`;
    } catch (err) {
        els.factText.textContent = "Unable to reach the source. Swipe to try again.";
    } finally {
        state.loading = false;
        els.loader.classList.add('hidden');
        els.card.classList.remove('hidden');
        els.actions.classList.remove('hidden');
    }
}

let drag = { x: 0, y: 0, startX: 0, startY: 0, active: false };

function onStart(e) {
    if (state.loading || !els.settingsScreen.classList.contains('hidden')) return;
    const touch = e.type.includes('touch') ? e.touches[0] : e;
    drag.active = true;
    drag.startX = touch.clientX;
    drag.startY = touch.clientY;
    els.card.style.transition = 'none';
}

function onMove(e) {
    if (!drag.active) return;
    const touch = e.type.includes('touch') ? e.touches[0] : e;
    drag.x = touch.clientX - drag.startX;
    drag.y = touch.clientY - drag.startY;

    const rotate = drag.x * 0.08;
    els.card.style.transform = `translate(${drag.x}px, ${drag.y * 0.1}px) rotate(${rotate}deg)`;
    
    els.overlaySkip.style.opacity = Math.max(0, -drag.x / 100);
    els.overlayLearn.style.opacity = Math.max(0, drag.x / 100);
}

function onEnd() {
    if (!drag.active) return;
    drag.active = false;
    if (Math.abs(drag.x) > 100) {
        handleSwipe(drag.x > 0 ? 'right' : 'left');
    } else {
        els.card.style.transition = 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        els.card.style.transform = 'translate(0,0) rotate(0deg)';
        els.overlaySkip.style.opacity = '0';
        els.overlayLearn.style.opacity = '0';
    }
    drag.x = 0; drag.y = 0;
}

function handleSwipe(dir) {
    playSound(dir === 'right' ? 'swipe-right' : 'swipe-left');
    const targetX = dir === 'right' ? window.innerWidth : -window.innerWidth;
    els.card.classList.add(dir === 'right' ? 'swiping-right' : 'swiping-left');
    els.card.style.transform = `translate(${targetX}px, 0) rotate(${dir === 'right' ? 30 : -30}deg)`;
    els.card.style.opacity = '0';
    if (dir === 'right') updateStats();
    setTimeout(fetchNewFact, 350);
}

function updateStats() {
    const today = new Date().toDateString();
    if (state.stats.lastDate !== today) {
        state.stats.dailyCount = 1;
        state.stats.lastDate = today;
        state.stats.goalReachedToday = false;
    } else {
        state.stats.dailyCount++;
    }
    if (state.stats.dailyCount === 10 && !state.stats.goalReachedToday) {
        state.stats.goalReachedToday = true;
        setTimeout(() => els.modalGoal.classList.remove('hidden'), 500);
    }
    localStorage.setItem(`${APP_ID}-stats`, JSON.stringify(state.stats));
    renderProgressBar();
}

function renderProgressBar() {
    els.progressBar.innerHTML = '';
    for (let i = 0; i < 10; i++) {
        const dot = document.createElement('div');
        dot.className = `h-1.5 w-4 sm:w-5 rounded-full transition-all duration-500 ${i < state.stats.dailyCount ? '' : 'bg-gray-400/20'}`;
        if (i < state.stats.dailyCount) dot.style.backgroundColor = 'var(--accent)';
        els.progressBar.appendChild(dot);
    }
}

function applyTheme(themeId) {
    state.settings.theme = themeId;
    document.body.className = `theme-${themeId}`;
    document.getElementById('bg-glow').style.display = themeId === 'dark' ? 'block' : 'none';
    document.querySelectorAll('.theme-btn').forEach(btn => {
        const isActive = btn.dataset.theme === themeId;
        btn.style.borderColor = isActive ? 'var(--accent)' : 'transparent';
        btn.style.backgroundColor = isActive ? 'rgba(59,130,246,0.1)' : 'rgba(0,0,0,0.05)';
    });
    localStorage.setItem(`${APP_ID}-settings`, JSON.stringify(state.settings));
}

function renderSoundUI() {
    const isEnabled = state.settings.soundEnabled;
    els.toggleSound.style.backgroundColor = isEnabled ? 'var(--accent)' : '#9ca3af';
    els.soundKnob.style.left = isEnabled ? 'calc(100% - 1.25rem)' : '0.25rem';
    const icon = document.getElementById('sound-icon');
    icon.setAttribute('data-lucide', isEnabled ? 'volume-2' : 'volume-x');
    lucide.createIcons();
}

// Event Listeners
window.addEventListener('mousedown', onStart);
window.addEventListener('mousemove', onMove);
window.addEventListener('mouseup', onEnd);
window.addEventListener('touchstart', onStart);
window.addEventListener('touchmove', onMove);
window.addEventListener('touchend', onEnd);

document.getElementById('settings-toggle').onclick = () => els.settingsScreen.classList.remove('hidden');
document.getElementById('btn-back-settings').onclick = () => els.settingsScreen.classList.add('hidden');
document.getElementById('bar-creator-request').onclick = () => els.subpageCreator.classList.remove('hidden');
document.getElementById('btn-back-creator').onclick = () => els.subpageCreator.classList.add('hidden');
document.getElementById('btn-skip').onclick = () => handleSwipe('left');
document.getElementById('btn-learn').onclick = () => handleSwipe('right');
document.getElementById('btn-close-goal').onclick = () => els.modalGoal.classList.add('hidden');

document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.onclick = () => { playSound('click'); applyTheme(btn.dataset.theme); }
});

els.toggleSound.onclick = () => {
    state.settings.soundEnabled = !state.settings.soundEnabled;
    playSound('click');
    renderSoundUI();
    localStorage.setItem(`${APP_ID}-settings`, JSON.stringify(state.settings));
};

document.getElementById('btn-wipe').onclick = () => {
    if (confirm("Reset everything?")) { localStorage.clear(); window.location.reload(); }
};

window.onload = () => {
    lucide.createIcons();
    applyTheme(state.settings.theme);
    renderSoundUI();
    renderProgressBar();
    fetchNewFact();
};