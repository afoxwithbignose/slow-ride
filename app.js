/* =========================================================================
   慢骑 · 交互脚本
   外壳 / 3D 场景挂载 / 专注计时 / 规划 / 日程 / 换装
   ========================================================================= */
(function () {
  'use strict';

  const $ = function (sel, root) { return (root || document).querySelector(sel); };
  const $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  const pad = function (n) { return String(n).padStart(2, '0'); };
  const clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };

  /* ------------------------------------------------------------------ 图标 */
  const SPRITE = [
    '<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true"><defs>',
    '<symbol id="i-sun" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M18.8 5.2l-1.6 1.6M6.8 17.2l-1.6 1.6"/></g></symbol>',
    '<symbol id="i-coast" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.4"/><path d="M2.5 15.5c2.2 0 2.2 1.6 4.4 1.6s2.2-1.6 4.4-1.6 2.2 1.6 4.4 1.6 2.2-1.6 4.4-1.6M2.5 20c2.2 0 2.2-1.4 4.4-1.4S9.1 20 11.3 20s2.2-1.4 4.4-1.4S17.9 20 20.1 20"/></g></symbol>',
    '<symbol id="i-flag" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5.5 21V3.6"/><path d="M5.5 4.6h12.2l-2.4 4.2 2.4 4.2H5.5"/></g></symbol>',
    '<symbol id="i-cal" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3.2" y="5" width="17.6" height="16" rx="3"/><path d="M3.2 10h17.6M8.2 3v4M15.8 3v4"/><path d="M7.8 14.2h1.6M11.2 14.2h1.6M14.6 14.2h1.6M7.8 17.4h1.6M11.2 17.4h1.6"/></g></symbol>',
    '<symbol id="i-shirt" viewBox="0 0 24 24"><path d="M9 3.2 4.4 5.8 3 10.4l3 1.2v8.2h12v-8.2l3-1.2-1.4-4.6L15 3.2a3.2 3.2 0 0 1-6 0Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></symbol>',
    '<symbol id="i-sound" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5v5h3l4.2 3.4V6.1L7 9.5Z"/><path d="M15 8.6a4.6 4.6 0 0 1 0 6.8M17.8 6a8.2 8.2 0 0 1 0 12"/></g></symbol>',
    '<symbol id="i-mute" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5v5h3l4.2 3.4V6.1L7 9.5Z"/><path d="m15.5 9.5 5 5M20.5 9.5l-5 5"/></g></symbol>',
    '<symbol id="i-play" viewBox="0 0 24 24"><path d="M8 4.8 19 12 8 19.2Z" fill="currentColor"/></symbol>',
    '<symbol id="i-pause" viewBox="0 0 24 24"><g fill="currentColor"><rect x="6.4" y="5" width="4.2" height="14" rx="1.4"/><rect x="13.4" y="5" width="4.2" height="14" rx="1.4"/></g></symbol>',
    '<symbol id="i-reset" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 10.2A8 8 0 1 1 6 17"/><path d="M4.2 4.8v5.6h5.6"/></g></symbol>',
    '<symbol id="i-check" viewBox="0 0 24 24"><path d="m5 12.6 4.6 4.4L19.4 6.8" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></symbol>',
    '<symbol id="i-plus" viewBox="0 0 24 24"><path d="M12 4.5v15M4.5 12h15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></symbol>',
    '<symbol id="i-x" viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></symbol>',
    '<symbol id="i-left" viewBox="0 0 24 24"><path d="M14.5 5.5 8 12l6.5 6.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></symbol>',
    '<symbol id="i-right" viewBox="0 0 24 24"><path d="M9.5 5.5 16 12l-6.5 6.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></symbol>',
    '<symbol id="i-clock" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="8.4"/><path d="M12 7.2V12l3.4 2.2"/></g></symbol>',
    '<symbol id="i-sparkle" viewBox="0 0 24 24"><path d="M12 2.8c.7 4.5 2.9 6.7 7.4 7.4-4.5.7-6.7 2.9-7.4 7.4-.7-4.5-2.9-6.7-7.4-7.4 4.5-.7 6.7-2.9 7.4-7.4Z" fill="currentColor"/><path d="M19 15.4c.3 1.8 1.2 2.7 3 3-1.8.3-2.7 1.2-3 3-.3-1.8-1.2-2.7-3-3 1.8-.3 2.7-1.2 3-3Z" fill="currentColor"/></symbol>',
    '<symbol id="i-flame" viewBox="0 0 24 24"><path d="M12.2 2.6c.6 3.2-.8 4.6-2.2 6.1-1.5 1.6-3 3.2-3 6.1a5.2 5.2 0 0 0 10.4 0c0-2.1-1-3.4-2-4.7-.5-.7-1-1.4-1.3-2.2-1.6 1.2-2 2.6-1.5 4.4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></symbol>',
    '<symbol id="i-bike" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="5.6" cy="16.8" r="3.4"/><circle cx="18.4" cy="16.8" r="3.4"/><path d="M8.8 16.8h2.6l2.6-6.4h-3M14 10.4l2.4 6.4h2M12 4.6h2.4M10.8 6.8h3.4"/></g></symbol>',
    '<symbol id="i-cup" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.6 8.2h11v6a5.5 5.5 0 0 1-11 0Z"/><path d="M15.6 9.6h1.9a2.6 2.6 0 0 1 0 5.2h-1.9M3.4 20.2h13.4"/><path d="M7.8 2.8v2M11 2.8v2"/></g></symbol>',
    '<symbol id="i-shuffle" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6.5h4l10 11h4M3 17.5h4l3-3.3M14.8 9.6l2.2-3.1h4"/><path d="m18.4 3.4 2.8 3.1-2.8 3.1M18.4 14.4l2.8 3.1-2.8 3.1"/></g></symbol>',
    '<symbol id="i-trash" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.4 7h15.2M9.2 7V4.6h5.6V7M6.4 7l.9 13h9.4l.9-13M10.2 11v5.4M13.8 11v5.4"/></g></symbol>',
    '<symbol id="i-wind" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 8.2h11.4a3.1 3.1 0 1 0-3-3.9M3 12.4h15.6a2.8 2.8 0 1 1-2.7 3.5M3 16.6h7.4a2.6 2.6 0 1 1-2.5 3.2"/></g></symbol>',
    '<symbol id="i-target" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8.4"/><circle cx="12" cy="12" r="4.6"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/></g></symbol>',
    '<symbol id="i-info" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="8.6"/><path d="M12 11v5.4M12 7.6v.2"/></g></symbol>',
    '<symbol id="i-goose" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M8.4 21v-7.2a3.5 3.5 0 0 1 7 0V21"/><circle cx="11.6" cy="7.4" r="3.6"/><path d="M15.2 6.8h4.3a1.6 1.6 0 0 1 0 3.2h-4.3M13.4 5.6h.1"/></g></symbol>',
    '<symbol id="i-mountain" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.6 19 9 8l2.6 4.4L14.4 8l7 11Z"/><path d="m6.8 12.4 1.6 1.4 1.4-1.6"/></g></symbol>',
    '<symbol id="i-heart" viewBox="0 0 24 24"><path d="M12 20.4S3.6 15.4 3.6 9.6A4.6 4.6 0 0 1 12 7a4.6 4.6 0 0 1 8.4 2.6c0 5.8-8.4 10.8-8.4 10.8Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></symbol>',
    '<symbol id="i-expand" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5"/></g></symbol>',
    '</defs></svg>'
  ].join('');

  /* ------------------------------------------------------------------ 本地存储 */
  const NS = 'slowride.v1.';
  const store = {
    get: function (key, fallback) {
      try {
        const raw = localStorage.getItem(NS + key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (e) { return fallback; }
    },
    set: function (key, value) {
      try { localStorage.setItem(NS + key, JSON.stringify(value)); } catch (e) {}
    }
  };

  /* ------------------------------------------------------------------ 日期 */
  const WEEK_CN = ['日', '一', '二', '三', '四', '五', '六'];
  const WEEK_FULL = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parseYmd(s) { const p = String(s).split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); }
  function addDays(d, n) { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() + n); return x; }
  function startOfWeek(d) {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const shift = (x.getDay() + 6) % 7;
    x.setDate(x.getDate() - shift);
    return x;
  }
  function fmtMD(d) { return (d.getMonth() + 1) + '月' + d.getDate() + '日'; }
  function fmtHM(seconds) {
    const s = Math.max(0, Math.round(seconds));
    return pad(Math.floor(s / 60)) + ':' + pad(s % 60);
  }
  function fmtMinutes(min) {
    const m = Math.max(0, Math.round(min));
    if (m < 60) return m + ' 分钟';
    const h = Math.floor(m / 60);
    const r = m % 60;
    return h + ' 小时' + (r ? ' ' + r + ' 分' : '');
  }

  /* ------------------------------------------------------------------ 数据 */
  function seedSessions() {
    const saved = store.get('sessions', null);
    if (Array.isArray(saved)) return saved;
    const today = new Date();
    const pattern = [25, 50, 75, 40, 25, 60, 50];
    const list = [];
    for (let i = 6; i >= 0; i--) {
      const d = addDays(today, -i);
      const mins = pattern[6 - i];
      if (mins > 0) list.push({ date: ymd(d), minutes: mins, task: '海岸骑行' });
    }
    store.set('sessions', list);
    return list;
  }

  const Sessions = {
    all: function () { return seedSessions(); },
    save: function (list) { store.set('sessions', list); },
    record: function (minutes, task) {
      const list = Sessions.all();
      list.push({ date: ymd(new Date()), minutes: minutes, task: task || '自由骑行' });
      Sessions.save(list);
    },
    on: function (date) {
      return Sessions.all().filter(function (s) { return s.date === date; })
        .reduce(function (a, s) { return a + s.minutes; }, 0);
    },
    today: function () { return Sessions.on(ymd(new Date())); },
    week: function () {
      const start = startOfWeek(new Date());
      let total = 0;
      for (let i = 0; i < 7; i++) total += Sessions.on(ymd(addDays(start, i)));
      return total;
    },
    streak: function () {
      let n = 0;
      let d = new Date();
      if (Sessions.on(ymd(d)) === 0) d = addDays(d, -1);
      while (Sessions.on(ymd(d)) > 0 && n < 400) { n++; d = addDays(d, -1); }
      return n;
    },
    weekDays: function () {
      const start = startOfWeek(new Date());
      const today = ymd(new Date());
      return Array.from({ length: 7 }, function (_, i) {
        const d = addDays(start, i);
        return { date: ymd(d), dateObj: d, label: WEEK_CN[d.getDay()], dayNum: d.getDate(), minutes: Sessions.on(ymd(d)), today: ymd(d) === today };
      });
    }
  };

  const DEFAULT_LOOK = { feather: '#FFFFFF', hat: 'straw', scarf: '#F26B4E', frame: '#12C2AE', basket: 'flowers' };
  function getLook() { return Object.assign({}, DEFAULT_LOOK, store.get('look', {})); }
  function saveLook(look) { store.set('look', look); }

  /* ------------------------------------------------------------------ 声音 */
  function audio() { return window.SlowRideAudio || null; }
  let soundPref = store.get('sound', { enabled: true, volume: 0.55 });
  if (!soundPref || typeof soundPref !== 'object') soundPref = { enabled: true, volume: 0.55 };

  function initAudio() {
    const A = audio();
    if (!A) return;
    A.setEnabled(soundPref.enabled !== false);
    A.setVolume(typeof soundPref.volume === 'number' ? soundPref.volume : 0.55);
    A.onChange(function (s) { renderSoundUI(s); });
  }
  function sessionRunning() {
    const s = store.get('focus', null);
    return !!(s && s.running && s.endAt > Date.now());
  }
  function toggleSound() {
    const A = audio();
    if (!A) return;
    const currentlyEnabled = soundPref.enabled !== false;
    const next = !currentlyEnabled;
    soundPref.enabled = next;
    store.set('sound', soundPref);
    A.setEnabled(next);
    if (next && sessionRunning()) {
      A.start();
      showToast('环境声已开启，海风回来了');
    } else if (!next) {
      showToast('环境声已关闭');
    } else {
      showToast('环境声已开启 · 专注开始时自动播放');
    }
    renderSoundUI(A.state);
  }
  function renderSoundUI(s) {
    s = s || (audio() ? audio().state : { playing: false, enabled: soundPref.enabled !== false, volume: soundPref.volume });
    const playing = !!s.playing;
    $$('[data-sound]').forEach(function (btn) {
      btn.setAttribute('aria-pressed', playing ? 'true' : 'false');
      const use = btn.querySelector('.icon use');
      if (use) use.setAttribute('href', s.enabled === false ? '#i-mute' : '#i-sound');
    });
    $$('.sound-btn').forEach(function (btn) {
      const st = btn.querySelector('.state');
      if (st) st.textContent = s.enabled === false ? '关闭' : (playing ? '播放中' : '开启');
      const eq = btn.querySelector('.eq');
      if (eq) eq.classList.toggle('on', playing);
    });
    $$('[data-sound-switch]').forEach(function (btn) {
      btn.setAttribute('aria-checked', s.enabled === false ? 'false' : 'true');
      const label = btn.querySelector('[data-sound-label]');
      if (label) label.textContent = s.enabled === false ? '环境声关闭' : (playing ? '环境声播放中' : '环境声就绪');
      const eq = btn.querySelector('.eq');
      if (eq) eq.classList.toggle('on', playing);
    });
    $$('[data-volume]').forEach(function (input) {
      if (document.activeElement !== input) input.value = String(Math.round((s.volume != null ? s.volume : soundPref.volume) * 100));
    });
  }

  /* ------------------------------------------------------------------ 提示 / 弹层 */
  let toastTimer = null;
  function showToast(text, iconId) {
    let el = $('#toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      el.className = 'toast';
      el.setAttribute('role', 'status');
      document.body.appendChild(el);
    }
    el.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#' + (iconId || 'i-check') + '"></use></svg><span></span>';
    el.querySelector('span').textContent = text;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 2200);
  }

  function openModal(id) {
    const m = document.getElementById(id);
    if (!m) return;
    m.hidden = false;
    document.body.style.overflow = 'hidden';
    const focusable = m.querySelector('input, select, textarea, button');
    if (focusable) setTimeout(function () { focusable.focus(); }, 40);
  }
  function closeModal(m) {
    m = typeof m === 'string' ? document.getElementById(m) : m;
    if (!m) return;
    m.hidden = true;
    if (!document.querySelector('.modal:not([hidden])')) document.body.style.overflow = '';
  }
  function initModals() {
    $$('.modal').forEach(function (m) {
      m.addEventListener('click', function (e) {
        if (e.target.closest('[data-close]')) closeModal(m);
      });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        const open = $$('.modal:not([hidden])');
        if (open.length) closeModal(open[open.length - 1]);
      }
    });
  }

  /* ------------------------------------------------------------------ 通用壳 */
  function initShell() {
    document.body.insertAdjacentHTML('afterbegin', SPRITE);

    const page = document.body.getAttribute('data-page');
    $$('.nav a').forEach(function (a) {
      if (a.getAttribute('data-nav') === page) a.classList.add('active');
    });

    const now = new Date();
    $$('[data-today]').forEach(function (el) {
      el.textContent = fmtMD(now) + ' ' + WEEK_FULL[now.getDay()];
    });
    $$('[data-year]').forEach(function (el) { el.textContent = String(now.getFullYear()); });

    const streak = Sessions.streak();
    $$('[data-streak]').forEach(function (el) { el.textContent = streak > 0 ? '连续 ' + streak + ' 天' : '今天开始'; });

    $$('[data-today-min]').forEach(function (el) { el.textContent = String(Sessions.today()); });
    $$('[data-today-seg]').forEach(function (bar) {
      const done = Math.min(4, Math.floor(Sessions.today() / 25));
      $$('i', bar).forEach(function (i, idx) { i.classList.toggle('on', idx < done); });
    });

    initAudio();
    $$('[data-sound]').forEach(function (btn) {
      btn.addEventListener('click', toggleSound);
    });
    $$('[data-volume]').forEach(function (input) {
      input.addEventListener('input', function () {
        const v = clamp(Number(input.value) / 100, 0, 1);
        soundPref.volume = v;
        store.set('sound', soundPref);
        if (audio()) audio().setVolume(v);
      });
    });

    initModals();
    initSessionChip();
    document.addEventListener('pointerdown', function once() {
      document.removeEventListener('pointerdown', once);
      if (sessionRunning() && soundPref.enabled !== false && audio() && !audio().state.playing) {
        audio().start();
      }
    }, { once: true });
  }

  function initSessionChip() {
    const chip = $('#sessionChip');
    if (!chip) return;
    const update = function () {
      const s = store.get('focus', null);
      const on = !!(s && s.running && s.endAt > Date.now());
      chip.hidden = !on;
      if (on) {
        const left = Math.max(0, Math.round((s.endAt - Date.now()) / 1000));
        const t = chip.querySelector('[data-session-time]');
        if (t) t.textContent = fmtHM(left);
      }
    };
    update();
    setInterval(update, 1000);
  }

  function summaryTodayText() {
    const mins = Sessions.today();
    const running = store.get('focus', null);
    if (running && running.running) return '阿满正在海岸线上';
    if (mins <= 0) return '阿满在岸边等你出发';
    return '今天已经骑了 ' + mins + ' 分钟';
  }

  /* ------------------------------------------------------------------ 专注页 */
  const KM_PER_MIN = 0.16; // 慢骑速度：9.6 km/h

  const Focus = { s: null, scene: null, timer: null, els: {}, fs: false };

  function initFocus() {
    const saved = store.get('focus', null);
    const base = { running: false, total: 25 * 60, remaining: 25 * 60, duration: 25, endAt: 0, task: '' };
    Focus.s = Object.assign(base, saved || {});
    Focus.s.duration = Math.round(Focus.s.total / 60) || 25;

    if (Focus.s.running && Focus.s.endAt && Focus.s.endAt <= Date.now()) {
      Focus.s.running = false;
      Focus.s.remaining = 0;
      Sessions.record(Focus.s.duration, Focus.s.task);
      store.set('focus', Focus.s);
      setTimeout(function () { showDone(Focus.s.duration, Focus.s.task); }, 500);
    }

    Focus.els = {
      timer: $('#timer'),
      sub: $('#taskEcho'),
      badge: $('#consoleBadge'),
      start: $('#startBtn'),
      reset: $('#resetBtn'),
      bar: $('#sessionBar'),
      presets: $$('[data-min]'),
      task: $('#taskInput'),
      sceneStatus: $('#sceneStatusText'),
      scenePill: $('#sceneStatus'),
      sceneTotal: $('#sceneRideTotal'),
      slots: $('#voyageSlots'),
      voyageFoot: $('#voyageFoot'),
      weekBars: $('#weekBars'),
      weekTotal: $('#weekTotal'),
      weekMeta: $('#weekMeta'),
      rideKm: $('#rideKm'),
      rideDayKm: $('#rideDayKm'),
      fsHud: $('#fsHud'),
      fsTimer: $('#fsTimer'),
      fsKm: $('#fsKm'),
      fsDayKm: $('#fsDayKm'),
      fsTask: $('#fsTask'),
      fsMode: $('#fsMode'),
      fsPlay: $('#fsPlay'),
      fsExit: $('#fsExit'),
      fsBtn: $('#fsBtn')
    };

    const stage = $('#focusScene');
    if (stage && window.createSeaside) {
      try {
        Focus.scene = window.createSeaside(stage, {
          mode: Focus.s.running ? 'ride' : 'rest',
          look: getLook(),
          zoom: 0.68,
          theta: 0.5,
          phi: 0.42,
          target: [0, 1.4, 2.4],
          shadowSize: 1024
        });
      } catch (err) {
        stage.innerHTML = '<div class="scene-fallback">海岸暂时起雾了，刷新页面再试一次。</div>';
      }
    }

    const tick = function () {
      if (!Focus.s.running) return;
      const left = Math.max(0, Math.round((Focus.s.endAt - Date.now()) / 1000));
      if (left !== Focus.s.remaining) {
        Focus.s.remaining = left;
        renderTimer();
        renderBar();
        renderFullscreen();
        updateTitle();
        if (left <= 0) completeFocus();
      }
    };
    clearInterval(Focus.timer);
    Focus.timer = setInterval(tick, 250);

    Focus.els.start && Focus.els.start.addEventListener('click', function () {
      if (Focus.s.running) pauseFocus(); else startFocus();
    });
    Focus.els.fsPlay && Focus.els.fsPlay.addEventListener('click', function () {
      if (Focus.s.running) pauseFocus(); else startFocus();
    });
    Focus.els.fsExit && Focus.els.fsExit.addEventListener('click', exitFullscreen);
    Focus.els.fsBtn && Focus.els.fsBtn.addEventListener('click', enterFullscreen);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && Focus.fs) exitFullscreen();
    });
    Focus.els.reset && Focus.els.reset.addEventListener('click', resetFocus);
    Focus.els.presets.forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (Focus.s.running) return;
        const mins = Number(btn.getAttribute('data-min')) || 25;
        Focus.s.total = mins * 60;
        Focus.s.remaining = mins * 60;
        Focus.s.duration = mins;
        Focus.s.endAt = 0;
        store.set('focus', Focus.s);
        renderFocus();
      });
    });
    if (Focus.els.task) {
      Focus.els.task.value = Focus.s.task || '';
      let taskTimer = null;
      Focus.els.task.addEventListener('input', function () {
        clearTimeout(taskTimer);
        taskTimer = setTimeout(function () {
          Focus.s.task = Focus.els.task.value.trim();
          store.set('focus', Focus.s);
          if (Focus.els.sub) Focus.els.sub.textContent = Focus.s.task || '自由骑行';
        }, 300);
      });
    }
    const doneAgain = $('#doneAgain');
    doneAgain && doneAgain.addEventListener('click', function () {
      closeModal('doneModal');
      Focus.s.remaining = Focus.s.total;
      Focus.s.endAt = 0;
      store.set('focus', Focus.s);
      renderFocus();
      startFocus();
    });
    const doneClose = $('#doneClose');
    doneClose && doneClose.addEventListener('click', function () { closeModal('doneModal'); });

    if (Focus.s.running) {
      Focus.s.remaining = Math.max(0, Math.round((Focus.s.endAt - Date.now()) / 1000));
    }
    renderFocus();
  }

  function updateTitle() {
    if (!Focus.s) return;
    document.title = Focus.s.running ? fmtHM(Focus.s.remaining) + ' · 专注海岸' : '慢骑 · 专注海岸';
  }

  function persistFocus() { store.set('focus', Focus.s); }

  function startFocus() {
    if (!Focus.s) return;
    if (Focus.s.remaining <= 0) Focus.s.remaining = Focus.s.total;
    Focus.s.running = true;
    Focus.s.endAt = Date.now() + Focus.s.remaining * 1000;
    persistFocus();
    renderFocus();
    if (Focus.scene) Focus.scene.setMode('ride');
    if (window.SlowRideAudio) window.SlowRideAudio.start();
    if (Focus.els.scenePill) Focus.els.scenePill.classList.add('live');
  }

  function pauseFocus() {
    if (!Focus.s) return;
    Focus.s.remaining = Math.max(0, Math.round((Focus.s.endAt - Date.now()) / 1000));
    Focus.s.running = false;
    persistFocus();
    renderFocus();
    if (Focus.scene) Focus.scene.setMode('rest');
    // 暂停不再掐掉环境声，海浪会陪着这一小段茶歇
    if (Focus.els.scenePill) Focus.els.scenePill.classList.remove('live');
  }

  function resetFocus() {
    if (!Focus.s) return;
    Focus.s.running = false;
    Focus.s.remaining = Focus.s.total;
    Focus.s.endAt = 0;
    persistFocus();
    renderFocus();
    if (Focus.scene) Focus.scene.setMode('rest');
    if (window.SlowRideAudio) window.SlowRideAudio.stop(0.9);
    if (Focus.els.scenePill) Focus.els.scenePill.classList.remove('live');
  }

  function completeFocus() {
    if (!Focus.s || Focus.s.completed) return;
    Focus.s.completed = true;
    Focus.s.running = false;
    Focus.s.remaining = 0;
    Focus.s.endAt = 0;
    persistFocus();
    renderFocus();
    if (Focus.scene) Focus.scene.setMode('rest');
    if (window.SlowRideAudio) window.SlowRideAudio.stop(2.4);
    Sessions.record(Focus.s.duration, Focus.s.task);
    refreshFocusStats();
    renderKm();
    renderSoundUI();
    if (Focus.fs) exitFullscreen();
    showDone(Focus.s.duration, Focus.s.task);
    setTimeout(function () { Focus.s.completed = false; }, 400);
  }

  function showDone(minutes, task) {
    const title = $('#doneTask');
    const big = $('#doneMinutes');
    if (title) title.textContent = task || '自由骑行';
    if (big) big.textContent = minutes + ' 分钟';
    openModal('doneModal');
    updateTitle();
  }

  function renderFocus() {
    if (!Focus.s) return;
    renderTimer();
    renderBar();
    renderControls();
    renderSceneStatus();
    renderVoyage();
    renderWeekBars();
    refreshFocusStats();
    renderKm();
    renderFullscreen();
    updateTitle();
    renderSoundUI();
    if (Focus.els.task && document.activeElement !== Focus.els.task) Focus.els.task.value = Focus.s.task || '';
  }

  function renderTimer() {
    if (Focus.els.timer) Focus.els.timer.textContent = fmtHM(Focus.s.remaining);
    if (Focus.els.sub) Focus.els.sub.textContent = Focus.s.task || '自由骑行';
    renderKm();
  }

  function sessionKm() {
    if (!Focus.s) return 0;
    const totalMin = (Focus.s.duration || Focus.s.total / 60);
    const doneMin = Math.max(0, totalMin - Focus.s.remaining / 60);
    return doneMin * KM_PER_MIN;
  }

  function renderKm() {
    if (!Focus.s) return;
    const km = sessionKm();
    const elapsed = Math.max(0, Focus.s.duration * 60 - Focus.s.remaining) / 60;
    const dayKm = (Sessions.today() + (Focus.s.remaining > 0 ? elapsed : 0)) * KM_PER_MIN;
    if (Focus.els.rideKm) Focus.els.rideKm.textContent = km.toFixed(1);
    if (Focus.els.rideDayKm) Focus.els.rideDayKm.textContent = dayKm.toFixed(1);
    if (Focus.els.fsKm) Focus.els.fsKm.textContent = km.toFixed(1);
    if (Focus.els.fsDayKm) Focus.els.fsDayKm.textContent = dayKm.toFixed(1);
  }

  function renderFullscreen() {
    if (!Focus.s) return;
    const running = Focus.s.running;
    const s = Focus.s;
    if (Focus.els.fsTimer) Focus.els.fsTimer.textContent = fmtHM(s.remaining);
    if (Focus.els.fsTask) Focus.els.fsTask.textContent = s.task || '自由骑行';
    if (Focus.els.fsMode) {
      Focus.els.fsMode.textContent = running ? '骑行中' : (s.remaining <= 0 ? '已到岸' : (s.remaining < s.total ? '喝茶休息' : '待出发'));
    }
    if (Focus.els.fsPlay) {
      const label = running ? '暂停 · 喝口茶' : (s.remaining > 0 && s.remaining < s.total ? '继续骑行' : '开始骑行');
      Focus.els.fsPlay.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#' + (running ? 'i-pause' : 'i-play') + '"></use></svg>' + label;
      Focus.els.fsPlay.classList.toggle('ink', running);
      Focus.els.fsPlay.classList.toggle('primary', !running);
    }
    renderKm();
  }

  function enterFullscreen() {
    const panel = document.querySelector('.scene-panel');
    if (!panel || Focus.fs) return;
    Focus.fs = true;
    panel.classList.add('fs-mode');
    document.body.classList.add('fs-ride');
    if (Focus.els.fsHud) Focus.els.fsHud.hidden = false;
    if (Focus.scene) Focus.scene.setView(window.innerWidth <= 760 ? { zoom: 0.54, theta: 0.5, phi: 0.38, target: [0, 1.15, 2.60] } : { zoom: 0.82, theta: 0.5, phi: 0.40, target: [0, 1.30, 2.60] });
    renderFullscreen();
    if (Focus.scene) setTimeout(function () { Focus.scene.resize(); }, 60);
  }

  function exitFullscreen() {
    const panel = document.querySelector('.scene-panel');
    Focus.fs = false;
    if (panel) panel.classList.remove('fs-mode');
    document.body.classList.remove('fs-ride');
    if (Focus.els.fsHud) Focus.els.fsHud.hidden = true;
    if (Focus.scene) {
      Focus.scene.setView({ zoom: 0.68, theta: 0.5, phi: 0.42, target: [0, 1.4, 2.4] });
      setTimeout(function () { Focus.scene.resize(); }, 60);
    }
  }

  function renderBar() {
    if (!Focus.els.bar) return;
    const total = Math.max(1, Focus.s.total);
    const progress = clamp(1 - Focus.s.remaining / total, 0, 1);
    const filled = Focus.s.remaining <= 0 ? 10 : Math.floor(progress * 10 + 0.0001);
    $$('i', Focus.els.bar).forEach(function (i, idx) {
      i.classList.toggle('on', idx < filled);
      i.classList.toggle('hot', idx < filled && Focus.s.running);
    });
  }

  function renderControls() {
    const running = Focus.s.running;
    if (Focus.els.badge) {
      Focus.els.badge.textContent = running ? '骑行中' : (Focus.s.remaining <= 0 ? '已到岸' : (Focus.s.remaining < Focus.s.total ? '已暂停' : '待出发'));
      Focus.els.badge.className = 'badge ' + (running ? 'coral' : (Focus.s.remaining <= 0 ? 'sea' : ''));
    }
    if (Focus.els.start) {
      Focus.els.start.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#' + (running ? 'i-pause' : 'i-play') + '"></use></svg>' + (running ? '暂停一下' : (Focus.s.remaining < Focus.s.total && Focus.s.remaining > 0 ? '继续骑行' : '开始骑行'));
      Focus.els.start.classList.toggle('ink', running);
      Focus.els.start.classList.toggle('primary', !running);
    }
    if (Focus.els.reset) {
      Focus.els.reset.disabled = !running && Focus.s.remaining === Focus.s.total;
    }
    Focus.els.presets.forEach(function (btn) {
      const on = Number(btn.getAttribute('data-min')) === Focus.s.duration;
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.disabled = running;
    });
  }

  function renderSceneStatus() {
    if (!Focus.els.sceneStatus) return;
    let text = '在岸边喝口茶';
    if (Focus.s.running) text = '海边骑行中';
    else if (Focus.s.remaining <= 0) text = '到岸啦，歇一会';
    else if (Focus.s.remaining < Focus.s.total) text = '停在海边喝茶';
    Focus.els.sceneStatus.textContent = text;
    if (Focus.els.scenePill) Focus.els.scenePill.classList.toggle('live', Focus.s.running);
  }

  function renderVoyage() {
    const mins = Sessions.today();
    const done = Math.min(4, Math.floor(mins / 25));
    const running = Focus.s && Focus.s.running && Focus.s.remaining > 0;
    if (Focus.els.slots) {
      let html = '';
      for (let i = 0; i < 4; i++) {
        const state = i < done ? 'done' : (running && i === done ? 'now' : '');
        const mark = i < done ? '<svg class="icon" aria-hidden="true"><use href="#i-check"></use></svg>' : '';
        const label = i < done ? '完成' : (running && i === done ? '正在骑' : '待出发');
        html += '<div class="slot ' + state + '"><span class="n">第 ' + (i + 1) + ' 段</span><span class="m">25 分钟</span><span class="mark" aria-hidden="true">' + mark + '</span><span class="n">' + label + '</span></div>';
      }
      Focus.els.slots.innerHTML = html;
    }
    if (Focus.els.voyageFoot) {
      const left = Math.max(0, 4 - done);
      Focus.els.voyageFoot.innerHTML = '今天已骑 <b>' + mins + '</b> 分钟 · ' + (left === 0 ? '四段航程全部完成' : '还差 ' + left + ' 段到岸');
    }
  }

  function renderWeekBars() {
    if (!Focus.els.weekBars) return;
    const days = Sessions.weekDays();
    const max = Math.max(40, Math.max.apply(null, days.map(function (d) { return d.minutes; })));
    Focus.els.weekBars.innerHTML = days.map(function (d) {
      const h = d.minutes <= 0 ? 4 : Math.max(8, Math.round((d.minutes / max) * 100));
      return '<div class="bar' + (d.today ? ' today' : '') + '"><span class="v">' + (d.minutes > 0 ? d.minutes : '·') + '</span><span class="fill" style="height:' + h + '%"></span><span class="d">' + d.label + '</span></div>';
    }).join('');
  }

  function refreshFocusStats() {
    const mins = Sessions.today();
    $$('[data-today-min]').forEach(function (el) { el.textContent = String(mins); });
    $$('[data-today-seg]').forEach(function (bar) {
      const done = Math.min(4, Math.floor(mins / 25));
      $$('i', bar).forEach(function (i, idx) { i.classList.toggle('on', idx < done); });
    });
    if (Focus.els.weekTotal) Focus.els.weekTotal.textContent = String(Math.round(Sessions.week()));
    if (Focus.els.weekMeta) {
      const streak = Sessions.streak();
      Focus.els.weekMeta.textContent = '连续 ' + streak + ' 天 · 本周共 ' + Math.round(Sessions.week() / 25) + ' 段';
    }
    if (Focus.els.sceneTotal) Focus.els.sceneTotal.textContent = '今日 ' + mins + ' 分钟';
    $$('[data-streak]').forEach(function (el) { el.textContent = Sessions.streak() > 0 ? '连续 ' + Sessions.streak() + ' 天' : '今天开始'; });
    $$('[data-today-text]').forEach(function (el) { el.textContent = summaryTodayText(); });
  }

  /* ------------------------------------------------------------------ 规划页 */
  function seedPlan() {
    let plan = store.get('plan', null);
    if (!plan || !Array.isArray(plan.three)) {
      plan = {
        three: [
          { id: 't1', text: '专注 3 段，把作品集首页推进到视觉稿', tag: '专注', done: false },
          { id: 't2', text: '傍晚去海边慢跑 20 分钟', tag: '身体', done: false },
          { id: 't3', text: '给妈妈打个电话', tag: '生活', done: false }
        ],
        goals: [
          {
            id: 'g1', title: '完成作品集首页', tag: '作品集', current: 4, target: 6, unit: '段',
            milestones: [{ t: '信息架构', done: true }, { t: '线框稿', done: true }, { t: '视觉稿', done: false }]
          },
          {
            id: 'g2', title: '读完《设计中的设计》', tag: '阅读', current: 3, target: 5, unit: '章',
            milestones: [{ t: '第一章', done: true }, { t: '第二章', done: true }, { t: '第三章', done: true }]
          },
          {
            id: 'g3', title: '连续早起 7 天', tag: '习惯', current: 5, target: 7, unit: '天',
            milestones: [{ t: '周一', done: true }, { t: '周三', done: true }, { t: '周五', done: true }]
          }
        ]
      };
      store.set('plan', plan);
    }
    return plan;
  }

  function initPlan() {
    const plan = seedPlan();
    renderPlan(plan);
  }

  function savePlan(plan) { store.set('plan', plan); }

  function renderPlan(plan) {
    plan = plan || seedPlan();
    const list = $('#todoList');
    if (list) {
      list.innerHTML = plan.three.map(function (t) {
        return '<div class="todo' + (t.done ? ' done' : '') + '" data-id="' + t.id + '">' +
          '<button class="box" aria-label="标记完成" aria-pressed="' + (t.done ? 'true' : 'false') + '"><svg class="icon" aria-hidden="true"><use href="#i-check"></use></svg></button>' +
          '<span class="txt">' + escapeHTML(t.text) + '</span>' +
          '<span class="tag">' + escapeHTML(t.tag || '') + '</span>' +
          '<button class="del" aria-label="删除这一件"><svg class="icon" aria-hidden="true"><use href="#i-x"></use></svg></button>' +
          '</div>';
      }).join('');
      $$('.todo', list).forEach(function (row) {
        const id = row.getAttribute('data-id');
        row.addEventListener('click', function (ev) {
          if (ev.target.closest('.del')) return;
          toggleTodo(id);
        });
        row.querySelector('.del').addEventListener('click', function (ev) { ev.stopPropagation(); removeTodo(id); });
      });
    }
    const left = plan.three.filter(function (t) { return !t.done; }).length;
    $$('[data-todo-left]').forEach(function (el) { el.textContent = left === 0 ? '全部完成' : '还剩 ' + left + ' 件'; });
    $$('[data-plan-badge]').forEach(function (el) { el.textContent = '本周 ' + plan.three.length + ' 件事'; });

    const grid = $('#goalGrid');
    if (grid) {
      let html = plan.goals.map(function (g) {
        const current = clamp(g.current, 0, g.target);
        const done = current >= g.target;
        let segs = '';
        for (let i = 0; i < g.target; i++) segs += '<i class="' + (i < current ? (done ? 'on' : 'hot') : '') + '"></i>';
        const ms = (g.milestones || []).map(function (m) {
          return '<li class="' + (m.done ? 'done' : '') + '">' + (m.done ? '✓ ' : '') + escapeHTML(m.t) + '</li>';
        }).join('');
        return '<article class="card goal-card' + (done ? ' done' : '') + '" data-goal="' + g.id + '">' +
          '<div class="goal-top"><span class="badge ' + (done ? 'sea' : 'sky') + '">' + escapeHTML(g.tag) + '</span><span class="goal-count">' + current + ' / ' + g.target + ' ' + escapeHTML(g.unit) + '</span></div>' +
          '<h3>' + escapeHTML(g.title) + '</h3>' +
          '<div class="seg-bar" aria-hidden="true">' + segs + '</div>' +
          (ms ? '<ul class="milestones">' + ms + '</ul>' : '') +
          '<div class="goal-foot"><span class="left">' + (done ? '已经完成，去海边庆祝一下' : '还差 ' + (g.target - current) + ' ' + escapeHTML(g.unit)) + '</span>' +
          '<button class="btn sm" data-goal-add="' + g.id + '"' + (done ? ' disabled' : '') + '><svg class="icon" aria-hidden="true"><use href="#i-plus"></use></svg>' + (done ? '已完成' : '记录一段') + '</button></div>' +
          '</article>';
      }).join('');
      html += '<button class="goal-add" id="addGoalBtn" type="button"><svg class="icon" aria-hidden="true"><use href="#i-plus"></use></svg>添加一个航行目标</button>';
      grid.innerHTML = html;
      $$('[data-goal-add]', grid).forEach(function (btn) {
        btn.addEventListener('click', function () { addGoalSegment(btn.getAttribute('data-goal-add')); });
      });
      const add = $('#addGoalBtn');
      add && add.addEventListener('click', function () { openModal('goalModal'); });
    }

    const week = Sessions.week();
    const segsDone = Math.min(12, Math.round(week / 25));
    const big = $('#weekBig');
    const unit = $('#weekUnit');
    if (big) {
      if (week >= 60) {
        big.textContent = (week / 60).toFixed(1).replace('.0', '');
        if (unit) unit.textContent = '小时 · 本周专注';
      } else {
        big.textContent = String(week);
        if (unit) unit.textContent = '分钟 · 本周专注';
      }
    }
    const bar = $('#weekBar');
    if (bar) $$('i', bar).forEach(function (i, idx) { i.classList.toggle('on', idx < segsDone); });
    const meta = $('#weekGoalline');
    if (meta) meta.textContent = '目标 12 段 · 已完成 ' + segsDone + ' 段';
    const bars = $('#planBars');
    if (bars) {
      const days = Sessions.weekDays();
      const max = Math.max(40, Math.max.apply(null, days.map(function (d) { return d.minutes; })));
      bars.innerHTML = days.map(function (d) {
        const h = d.minutes <= 0 ? 4 : Math.max(8, Math.round((d.minutes / max) * 100));
        return '<div class="bar' + (d.today ? ' today' : '') + '"><span class="v">' + (d.minutes > 0 ? d.minutes : '·') + '</span><span class="fill" style="height:' + h + '%"></span><span class="d">' + d.label + '</span></div>';
      }).join('');
    }
    const streakEl = $('#planStreak');
    if (streakEl) streakEl.textContent = '连续 ' + Sessions.streak() + ' 天';
  }

  function toggleTodo(id) {
    const plan = seedPlan();
    const t = plan.three.find(function (x) { return x.id === id; });
    if (!t) return;
    t.done = !t.done;
    savePlan(plan);
    renderPlan(plan);
    if (t.done) showToast('又完成一件，风都轻了一点');
  }

  function removeTodo(id) {
    const plan = seedPlan();
    plan.three = plan.three.filter(function (x) { return x.id !== id; });
    savePlan(plan);
    renderPlan(plan);
    showToast('已从本周清单里拿掉');
  }

  function addTodo(text) {
    const plan = seedPlan();
    plan.three.push({ id: 't' + Date.now(), text: text, tag: '新', done: false });
    savePlan(plan);
    renderPlan(plan);
    showToast('记下了，慢慢来');
  }

  function addGoalSegment(id) {
    const plan = seedPlan();
    const g = plan.goals.find(function (x) { return x.id === id; });
    if (!g) return;
    g.current = clamp(g.current + 1, 0, g.target);
    savePlan(plan);
    renderPlan(plan);
    if (g.current >= g.target) showToast('目标达成，阿满为你按了下车铃');
    else showToast('记下 25 分钟，往前骑了一小段');
  }

  function addGoal(data) {
    const plan = seedPlan();
    plan.goals.push({
      id: 'g' + Date.now(),
      title: data.title,
      tag: data.tag || '新目标',
      current: 0,
      target: Math.max(1, data.target || 4),
      unit: data.unit || '段',
      milestones: []
    });
    savePlan(plan);
    renderPlan(plan);
    showToast('新目标已经挂上桅杆');
  }

  function bindPlanForms() {
    const addForm = $('#todoAddForm');
    if (addForm) {
      addForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const input = $('#todoInput');
        const v = input.value.trim();
        if (!v) return;
        addTodo(v);
        input.value = '';
      });
    }
    const goalForm = $('#goalForm');
    if (goalForm) {
      goalForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const title = $('#goalTitle').value.trim();
        if (!title) return;
        addGoal({
          title: title,
          tag: $('#goalTag').value.trim(),
          target: Number($('#goalTarget').value) || 4,
          unit: $('#goalUnit').value.trim() || '段'
        });
        closeModal('goalModal');
        goalForm.reset();
      });
    }
  }

  /* ------------------------------------------------------------------ 日程页 */
  function seedSchedule() {
    let events = store.get('schedule', null);
    if (Array.isArray(events)) return events;
    const monday = startOfWeek(new Date());
    const mk = function (dayOffset, start, dur, title, type) {
      const d = addDays(monday, dayOffset);
      return { id: 'e' + dayOffset + start + title, date: ymd(d), start: start, dur: dur, title: title, type: type, done: false };
    };
    events = [
      mk(0, 8 * 60 + 30, 45, '海岸慢跑', 'move'),
      mk(0, 10 * 60, 120, '设计史', 'class'),
      mk(0, 14 * 60, 120, '专注：作品集', 'focus'),
      mk(0, 19 * 60, 60, '读书', 'focus'),
      mk(1, 9 * 60, 120, '界面设计课', 'class'),
      mk(1, 13 * 60 + 30, 90, '专注：提案', 'focus'),
      mk(1, 16 * 60, 45, '咖啡休息', 'rest'),
      mk(1, 20 * 60, 60, '自由骑行', 'move'),
      mk(2, 9 * 60 + 30, 120, '专注：线框', 'focus'),
      mk(2, 14 * 60, 60, '小组讨论', 'class'),
      mk(2, 18 * 60 + 30, 60, '瑜伽', 'move'),
      mk(3, 8 * 60 + 30, 45, '海岸慢跑', 'move'),
      mk(3, 10 * 60, 120, '专注：作品集首页', 'focus'),
      mk(3, 14 * 60, 90, '配色工作坊', 'class'),
      mk(3, 16 * 60 + 30, 40, '喝茶发呆', 'rest'),
      mk(3, 19 * 60, 60, '专注：读书', 'focus'),
      mk(4, 9 * 60, 150, '专注：视觉稿', 'focus'),
      mk(4, 14 * 60, 60, '评审会', 'class'),
      mk(4, 17 * 60, 90, '骑行', 'move'),
      mk(5, 10 * 60, 120, '专注：长文', 'focus'),
      mk(5, 15 * 60, 90, '海边散步', 'move'),
      mk(6, 11 * 60, 90, '复盘 & 规划', 'focus'),
      mk(6, 16 * 60, 120, '休息', 'rest')
    ];
    store.set('schedule', events);
    return events;
  }

  const Schedule = {
    weekStart: startOfWeek(new Date()),
    selectedDate: ymd(new Date()),
    events: null
  };

  function scheduleEvents() {
    if (!Schedule.events) Schedule.events = seedSchedule();
    return Schedule.events;
  }
  function saveSchedule() { store.set('schedule', Schedule.events); }

  function fmtTime(min) { return pad(Math.floor(min / 60)) + ':' + pad(min % 60); }

  function initSchedule() {
    Schedule.weekStart = startOfWeek(new Date());
    Schedule.selectedDate = ymd(new Date());
    Schedule.events = seedSchedule();

    $$('[data-week-prev]').forEach(function (b) {
      b.addEventListener('click', function () { Schedule.weekStart = addDays(Schedule.weekStart, -7); renderSchedule(); });
    });
    $$('[data-week-next]').forEach(function (b) {
      b.addEventListener('click', function () { Schedule.weekStart = addDays(Schedule.weekStart, 7); renderSchedule(); });
    });
    $$('[data-week-today]').forEach(function (b) {
      b.addEventListener('click', function () {
        Schedule.weekStart = startOfWeek(new Date());
        Schedule.selectedDate = ymd(new Date());
        renderSchedule();
      });
    });
    $$('[data-add-event]').forEach(function (b) {
      b.addEventListener('click', function () { openEventModal(); });
    });
    const form = $('#eventForm');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        const date = $('#evDate').value;
        const start = timeToMin($('#evStart').value);
        const dur = Number($('#evDur').value) || 60;
        const title = $('#evTitle').value.trim();
        const type = $('#evType').value;
        if (!date || !title || start == null) return;
        const s = clamp(start, 8 * 60, 21 * 60);
        Schedule.events.push({
          id: 'e' + Date.now(),
          date: date,
          start: s,
          dur: Math.min(dur, 22 * 60 - s),
          title: title,
          type: type,
          done: false
        });
        saveSchedule();
        Schedule.weekStart = startOfWeek(parseYmd(date));
        Schedule.selectedDate = date;
        renderSchedule();
        closeModal('eventModal');
        form.reset();
        showToast('安排已经写进这一周');
      });
    }
    renderSchedule();
  }

  function timeToMin(v) {
    if (!v) return null;
    const p = String(v).split(':').map(Number);
    return p[0] * 60 + (p[1] || 0);
  }

  function renderSchedule() {
    const start = Schedule.weekStart;
    const end = addDays(start, 6);
    $$('[data-week-label]').forEach(function (el) {
      el.textContent = fmtMD(start) + ' – ' + fmtMD(end);
    });
    const todayStr = ymd(new Date());
    const grid = $('#weekGrid');
    if (grid) {
      let html = '<div class="week-corner">时间</div>';
      for (let i = 0; i < 7; i++) {
        const d = addDays(start, i);
        const isToday = ymd(d) === todayStr;
        html += '<div class="day-head' + (isToday ? ' today' : '') + '"><span class="w">周' + WEEK_CN[d.getDay()] + '</span><span class="n">' + d.getDate() + '</span>' + (isToday ? '<span class="today-dot">今天</span>' : '') + '</div>';
      }
      html += '<div class="time-col" aria-hidden="true">';
      for (let h = 8; h <= 21; h++) {
        const top = ((h - 8) * 60 / (14 * 60)) * 100;
        html += '<span class="' + (h === 8 ? 'first' : '') + '" style="top:' + top + '%">' + pad(h) + ':00</span>';
      }
      html += '</div>';
      for (let i = 0; i < 7; i++) {
        const d = addDays(start, i);
        const ds = ymd(d);
        const isToday = ds === todayStr;
        const list = scheduleEvents().filter(function (e) { return e.date === ds; }).sort(function (a, b) { return a.start - b.start; });
        html += '<div class="day-col' + (isToday ? ' today' : '') + '" data-date="' + ds + '">';
        list.forEach(function (e) {
          const top = ((e.start - 8 * 60) / 60) * 44.2857;
          const h = Math.max(26, (e.dur / 60) * 44.2857 - 3);
          html += '<div class="event ' + e.type + (h < 40 ? ' short' : '') + (e.done ? ' done' : '') + '" data-id="' + e.id + '" style="top:' + top + 'px;height:' + h + 'px" title="' + escapeHTML(e.title) + ' ' + fmtTime(e.start) + '–' + fmtTime(e.start + e.dur) + '">' +
            '<button class="x" aria-label="删除安排"><svg class="icon" aria-hidden="true"><use href="#i-x"></use></svg></button>' +
            '<span class="et">' + fmtTime(e.start) + '–' + fmtTime(e.start + e.dur) + '</span>' +
            '<span class="en">' + escapeHTML(e.title) + '</span>' +
            '</div>';
        });
        html += '</div>';
      }
      grid.innerHTML = html;
      $$('.event', grid).forEach(function (el) {
        const id = el.getAttribute('data-id');
        el.addEventListener('click', function (ev) {
          if (ev.target.closest('.x')) {
            ev.stopPropagation();
            removeEvent(id);
            return;
          }
          toggleEvent(id);
        });
      });
    }

    const tabs = $('#mobileDayTabs');
    if (tabs) {
      let html = '';
      for (let i = 0; i < 7; i++) {
        const d = addDays(start, i);
        const ds = ymd(d);
        html += '<button type="button" data-day="' + ds + '" class="' + (ds === todayStr ? 'today' : '') + '" aria-pressed="' + (ds === Schedule.selectedDate ? 'true' : 'false') + '"><span>周' + WEEK_CN[d.getDay()] + '</span><b>' + d.getDate() + '</b></button>';
      }
      tabs.innerHTML = html;
      $$('button', tabs).forEach(function (b) {
        b.addEventListener('click', function () {
          Schedule.selectedDate = b.getAttribute('data-day');
          renderSchedule();
        });
      });
    }
    const dayList = $('#mobileDayList');
    if (dayList) {
      const list = scheduleEvents().filter(function (e) { return e.date === Schedule.selectedDate; }).sort(function (a, b) { return a.start - b.start; });
      if (!list.length) {
        dayList.innerHTML = '<div class="empty-day">这天还是空的，去海边发会呆，或者加一个安排。</div>';
      } else {
        dayList.innerHTML = list.map(function (e) {
          return '<div class="mobile-event ' + e.type + (e.done ? ' done' : '') + '" data-id="' + e.id + '" tabindex="0" role="button" aria-label="' + escapeHTML(e.title) + '">' +
            '<span class="tm">' + fmtTime(e.start) + '<br>' + fmtTime(e.start + e.dur) + '</span>' +
            '<span class="tt">' + escapeHTML(e.title) + '</span>' +
            '<button class="x" aria-label="删除安排" style="margin-left:auto;width:34px;height:34px;border:1.5px solid var(--ink);border-radius:8px;background:var(--cream);display:grid;place-items:center;flex:0 0 34px"><svg class="icon" aria-hidden="true" style="width:14px;height:14px"><use href="#i-x"></use></svg></button>' +
            '</div>';
        }).join('');
        $$('.mobile-event', dayList).forEach(function (el) {
          const id = el.getAttribute('data-id');
          el.addEventListener('click', function (ev) {
            if (ev.target.closest('.x')) { removeEvent(id); return; }
            toggleEvent(id);
          });
          el.addEventListener('keydown', function (ev) {
            if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); toggleEvent(id); }
          });
        });
      }
    }
  }

  function toggleEvent(id) {
    const e = scheduleEvents().find(function (x) { return x.id === id; });
    if (!e) return;
    e.done = !e.done;
    saveSchedule();
    renderSchedule();
    if (e.done) showToast('这一段完成了');
  }

  function removeEvent(id) {
    Schedule.events = scheduleEvents().filter(function (x) { return x.id !== id; });
    saveSchedule();
    renderSchedule();
    showToast('已从日程里删掉');
  }

  function openEventModal() {
    const sel = $('#evDate');
    if (sel) {
      let html = '';
      for (let i = 0; i < 7; i++) {
        const d = addDays(Schedule.weekStart, i);
        const ds = ymd(d);
        html += '<option value="' + ds + '"' + (ds === Schedule.selectedDate ? ' selected' : '') + '>周' + WEEK_CN[d.getDay()] + ' · ' + fmtMD(d) + '</option>';
      }
      sel.innerHTML = html;
    }
    const start = $('#evStart');
    if (start && !start.value) start.value = '09:30';
    openModal('eventModal');
  }

  /* ------------------------------------------------------------------ 角色页 */
  const FEATHERS = [
    { v: '#FFFFFF', n: '雪白' }, { v: '#FFF0D2', n: '奶油' }, { v: '#DDF4E8', n: '薄荷' },
    { v: '#FFE1E8', n: '樱粉' }, { v: '#DDEFFF', n: '天蓝' }, { v: '#FFDCC7', n: '蜜桃' },
    { v: '#E8DFFF', n: '薰衣草' }, { v: '#FDF6C9', n: '黄油' }
  ];
  const SCARVES = [
    { v: '#F26B4E', n: '珊瑚' }, { v: '#19A99A', n: '海青' }, { v: '#F7C565', n: '阳光' },
    { v: '#1E3B4A', n: '墨蓝' }, { v: '#EFE6D2', n: '奶油' }, { v: '#BFE6F6', n: '天蓝' },
    { v: 'none', n: '不戴' }
  ];
  const FRAMES = [
    { v: '#12C2AE', n: '海青' }, { v: '#F26B4E', n: '珊瑚' }, { v: '#EFE6D2', n: '奶油' },
    { v: '#2A2B30', n: '墨黑' }, { v: '#F7C565', n: '阳光' }, { v: '#A8E6D8', n: '薄荷' }
  ];
  const HATS = [
    { v: 'straw', n: '草帽' }, { v: 'sailor', n: '水手帽' }, { v: 'crown', n: '小皇冠' },
    { v: 'flower', n: '花环' }, { v: 'beret', n: '贝雷帽' }, { v: 'bucket', n: '渔夫帽' },
    { v: 'beanie', n: '毛线帽' }, { v: 'none', n: '不戴' }
  ];
  const BASKETS = [
    { v: 'flowers', n: '野花' }, { v: 'shells', n: '贝壳' }, { v: 'snack', n: '面包' }
  ];

  function initCharacter() {
    const look = getLook();
    let scene = null;
    const stage = $('#charStage');
    const narrow = stage && stage.clientWidth > 0 && stage.clientWidth < 520;
    if (stage && window.createSeaside) {
      try {
        scene = window.createSeaside(stage, {
          mode: 'ride',
          look: look,
          zoom: narrow ? 0.37 : 0.30,
          theta: -0.5,
          phi: 0.33,
          target: narrow ? [0.28, 1.58, 2.78] : [0.32, 1.60, 2.78],
          shadowSize: 1024
        });
      } catch (err) {
        stage.innerHTML = '<div class="scene-fallback">试衣间暂时起雾了，刷新页面再试一次。</div>';
      }
    }

    function label(group, value) {
      const el = $('[data-now="' + group + '"]');
      if (!el) return;
      let text = value;
      if (group === 'feather') text = (FEATHERS.find(function (x) { return x.v === value; }) || {}).n || '';
      if (group === 'scarf') text = (SCARVES.find(function (x) { return x.v === value; }) || {}).n || '';
      if (group === 'frame') text = (FRAMES.find(function (x) { return x.v === value; }) || {}).n || '';
      if (group === 'hat') text = (HATS.find(function (x) { return x.v === value; }) || {}).n || '';
      if (group === 'basket') text = (BASKETS.find(function (x) { return x.v === value; }) || {}).n || '';
      el.textContent = text;
    }
    function summary() {
      const f = (FEATHERS.find(function (x) { return x.v === look.feather; }) || {}).n || '雪白';
      const h = (HATS.find(function (x) { return x.v === look.hat; }) || {}).n || '不戴';
      const s = (SCARVES.find(function (x) { return x.v === look.scarf; }) || {}).n || '不戴';
      const el = $('#lookSummary');
      if (el) el.textContent = f + '羽 · ' + h + ' · ' + s + '领巾';
    }
    function paint() {
      $$('[data-feather]').forEach(function (b) {
        b.setAttribute('aria-pressed', b.getAttribute('data-feather') === look.feather ? 'true' : 'false');
        b.style.setProperty('--sw', b.getAttribute('data-feather'));
      });
      $$('[data-scarf]').forEach(function (b) {
        b.setAttribute('aria-pressed', b.getAttribute('data-scarf') === look.scarf ? 'true' : 'false');
        b.style.setProperty('--sw', b.getAttribute('data-scarf') === 'none' ? 'transparent' : b.getAttribute('data-scarf'));
      });
      $$('[data-frame]').forEach(function (b) {
        b.setAttribute('aria-pressed', b.getAttribute('data-frame') === look.frame ? 'true' : 'false');
        b.style.setProperty('--sw', b.getAttribute('data-frame'));
      });
      $$('[data-hat]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-hat') === look.hat ? 'true' : 'false'); });
      $$('[data-basket]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-basket') === look.basket ? 'true' : 'false'); });
      label('feather', look.feather);
      label('scarf', look.scarf);
      label('frame', look.frame);
      label('hat', look.hat);
      label('basket', look.basket);
      summary();
    }
    function apply() {
      saveLook(look);
      if (scene) scene.setLook(look);
      paint();
    }

    $$('[data-feather]').forEach(function (b) {
      b.addEventListener('click', function () { look.feather = b.getAttribute('data-feather'); apply(); });
    });
    $$('[data-scarf]').forEach(function (b) {
      b.addEventListener('click', function () { look.scarf = b.getAttribute('data-scarf'); apply(); });
    });
    $$('[data-frame]').forEach(function (b) {
      b.addEventListener('click', function () { look.frame = b.getAttribute('data-frame'); apply(); });
    });
    $$('[data-hat]').forEach(function (b) {
      b.addEventListener('click', function () { look.hat = b.getAttribute('data-hat'); apply(); });
    });
    $$('[data-basket]').forEach(function (b) {
      b.addEventListener('click', function () { look.basket = b.getAttribute('data-basket'); apply(); });
    });
    const rand = $('#randomLook');
    rand && rand.addEventListener('click', function () {
      look.feather = FEATHERS[Math.floor(Math.random() * FEATHERS.length)].v;
      look.hat = HATS[Math.floor(Math.random() * HATS.length)].v;
      look.scarf = SCARVES[Math.floor(Math.random() * (SCARVES.length - 1))].v;
      look.frame = FRAMES[Math.floor(Math.random() * FRAMES.length)].v;
      look.basket = BASKETS[Math.floor(Math.random() * BASKETS.length)].v;
      apply();
      showToast('换了一身新行头', 'i-sparkle');
    });
    const save = $('#saveLook');
    save && save.addEventListener('click', function () {
      apply();
      showToast('这套造型已保存，出发吧', 'i-check');
    });
    $$('[data-preview-mode]').forEach(function (b) {
      b.addEventListener('click', function () {
        $$('[data-preview-mode]').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        const mode = b.getAttribute('data-preview-mode');
        if (!scene) return;
        scene.setMode(mode);
        scene.setView(mode === 'tea' ? {
          zoom: narrow ? 0.46 : 0.38, theta: -0.46, phi: 0.30,
          target: narrow ? [0.10, 1.30, 3.30] : [0.10, 1.35, 3.20]
        } : {
          zoom: narrow ? 0.37 : 0.30, theta: -0.5, phi: 0.33,
          target: narrow ? [0.28, 1.58, 2.78] : [0.32, 1.60, 2.78]
        });
      });
    });
    const reset = $('#charReset');
    reset && reset.addEventListener('click', function () { if (scene) scene.resetView(); });

    paint();

    const rides = Sessions.all().length;
    const days = Math.max(1, Math.round((Date.now() - parseYmd('2026-11-07').getTime()) / 86400000));
    const km = (Sessions.all().reduce(function (a, s) { return a + s.minutes; }, 0) * KM_PER_MIN).toFixed(1);
    const dEl = $('#statDays'); if (dEl) dEl.textContent = String(days);
    const rEl = $('#statRides'); if (rEl) rEl.textContent = String(rides);
    const kEl = $('#statKm'); if (kEl) kEl.textContent = km;

    renderSoundUI();
  }

  /* ------------------------------------------------------------------ 工具 */
  function escapeHTML(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ------------------------------------------------------------------ 启动 */
  function boot() {
    initShell();
    const page = document.body.getAttribute('data-page');
    if (page === 'focus') initFocus();
    if (page === 'plan') { initPlan(); bindPlanForms(); }
    if (page === 'schedule') initSchedule();
    if (page === 'character') initCharacter();
    if (page === 'plan' || page === 'schedule' || page === 'character') renderSoundUI();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
