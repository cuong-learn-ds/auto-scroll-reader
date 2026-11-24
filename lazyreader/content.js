(() => {
  if (window.__lazyReaderLoaded) return;
  window.__lazyReaderLoaded = true;

  const DEFAULTS = { interval: 7, step: 80, duration: 900 };
  const STORE_KEY = "lazyReaderCfg";
  const cfg = { ...DEFAULTS };
  let running = false;
  let token = 0;

  // ---------- Giao dien (Shadow DOM de khong dinh CSS cua trang) ----------
  const host = document.createElement("div");
  host.id = "lazyreader-host";
  host.style.cssText =
    "all:initial;position:fixed;right:16px;bottom:16px;z-index:2147483647;display:none;";
  const root = host.attachShadow({ mode: "open" });
  root.innerHTML = `
    <style>
      .box{font:13px/1.4 system-ui,Segoe UI,Arial,sans-serif;color:#eee;background:#1f2430;
        border:1px solid #3a4152;border-radius:10px;padding:10px 12px;width:230px;
        box-shadow:0 4px 18px rgba(0,0,0,.45)}
      .top{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
      .top b{font-size:13px}
      .x{background:none;border:0;color:#aaa;font-size:16px;cursor:pointer;padding:0 4px}
      .st{color:#9fb4d8;min-height:18px;margin-bottom:8px}
      button.go{width:100%;padding:7px;border:0;border-radius:6px;background:#3b82f6;color:#fff;
        font-weight:600;cursor:pointer;margin-bottom:8px}
      button.go.on{background:#e5484d}
      label{display:block;margin-top:4px}
      input[type=range]{width:100%}
      .hint{color:#8a93a6;font-size:11px;margin-top:6px}
    </style>
    <div class="box">
      <div class="top"><b>LazyReader</b><button class="x" title="Ẩn bảng">x</button></div>
      <div class="st" id="st">Sẵn sàng</div>
      <button class="go" id="go">Bắt đầu</button>
      <label>Sang trang mới: <span id="iv"></span> giây
        <input type="range" id="ivr" min="3" max="20" step="1"></label>
      <label>Mỗi lần cuộn: <span id="sp"></span>% màn hình
        <input type="range" id="spr" min="30" max="100" step="5"></label>
      <div class="hint">Alt+S: bật/tắt. Cuộn tay sẽ tạm dừng.</div>
    </div>`;
  const $ = (id) => root.getElementById(id);
  const stEl = $("st"), goBtn = $("go"), ivR = $("ivr"), spR = $("spr");

  function setStatus(t) { stEl.textContent = t; }
  function syncUi() {
    ivR.value = cfg.interval; spR.value = cfg.step;
    $("iv").textContent = cfg.interval; $("sp").textContent = cfg.step;
    goBtn.textContent = running ? "Dừng" : "Bắt đầu";
    goBtn.classList.toggle("on", running);
  }

  const hasStore = typeof chrome !== "undefined" && chrome.storage && chrome.storage.local;
  function save() { if (hasStore) chrome.storage.local.set({ [STORE_KEY]: { interval: cfg.interval, step: cfg.step } }); }
  if (hasStore) {
    chrome.storage.local.get(STORE_KEY, (r) => {
      const s = r && r[STORE_KEY];
      if (s) { cfg.interval = s.interval || cfg.interval; cfg.step = s.step || cfg.step; }
      syncUi();
    });
  }

  ivR.addEventListener("input", () => { cfg.interval = +ivR.value; syncUi(); save(); });
  spR.addEventListener("input", () => { cfg.step = +spR.value; syncUi(); save(); });
  goBtn.addEventListener("click", () => (running ? stop("Đã dừng") : run()));
  root.querySelector(".x").addEventListener("click", () => { host.style.display = "none"; });

  // ---------- Tim phan tu dang cuon ----------
  function docEl() { return document.scrollingElement || document.documentElement; }
  function getScroller() {
    const de = docEl();
    if (de.scrollHeight > de.clientHeight + 10) return de;
    let best = null, bestArea = 0;
    for (const e of document.querySelectorAll("div,main,section,article")) {
      const s = getComputedStyle(e);
      if (!/(auto|scroll)/.test(s.overflowY)) continue;
      if (e.scrollHeight - e.clientHeight > 50) {
        const area = e.clientWidth * e.clientHeight;
        if (area > bestArea) { best = e; bestArea = area; }
      }
    }
    return best || de;
  }
  const viewH = (sc) => (sc === docEl() ? window.innerHeight : sc.clientHeight);
  const atEnd = (sc) => sc.scrollTop + viewH(sc) >= sc.scrollHeight - 4;

  // ---------- Cuon muot (ease-in-out) ----------
  function animateTo(sc, target, ms, my) {
    return new Promise((resolve) => {
      const from = sc.scrollTop, t0 = performance.now();
      const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
      (function frame(now) {
        if (my !== token) return resolve(false);
        const p = Math.min(1, (now - t0) / ms);
        sc.scrollTo({ top: from + (target - from) * ease(p), behavior: "instant" });
        p < 1 ? requestAnimationFrame(frame) : resolve(true);
      })(t0);
    });
  }

  // ---------- Cho anh lazy-load tai xong ----------
  document.addEventListener("error", (e) => {
    if (e.target && e.target.tagName === "IMG") e.target.dataset.lrFail = "1";
  }, true);

  function pendingImages(sc) {
    const limit = window.innerHeight + viewH(sc) * 0.5;
    return [...document.images].filter((img) => {
      if (img.dataset.lrFail) return false;
      const r = img.getBoundingClientRect();
      if (r.bottom <= 0 || r.top >= limit) return false;
      return !(img.complete && img.naturalWidth > 0);
    });
  }
  function waitImages(sc, my, maxMs) {
    return new Promise((resolve) => {
      const end = Date.now() + maxMs;
      (function poll() {
        if (my !== token) return resolve(false);
        if (!pendingImages(sc).length || Date.now() >= end) return resolve(true);
        setTimeout(poll, 200);
      })();
    });
  }
  function countdown(ms, my) {
    return new Promise((resolve) => {
      const end = Date.now() + ms;
      (function tick() {
        if (my !== token || !running) return resolve(false);
        const left = end - Date.now();
        if (left <= 0) return resolve(true);
        setStatus("Sang đoạn sau trong " + Math.ceil(left / 1000) + "s");
        setTimeout(tick, 200);
      })();
    });
  }

  // ---------- Vong lap chinh ----------
  function stop(msg) {
    running = false;
    token++;
    setStatus(msg || "Đã dừng");
    syncUi();
  }

  async function run() {
    const my = ++token;
    running = true;
    syncUi();
    while (running && my === token) {
      const sc = getScroller();
      if (atEnd(sc)) { stop("Đã tới cuối trang"); break; }
      const vh = viewH(sc);
      const target = Math.min(sc.scrollTop + (vh * cfg.step) / 100, sc.scrollHeight - vh);
      setStatus("Đang cuộn...");
      if (!(await animateTo(sc, target, cfg.duration, my))) break;
      setStatus("Chờ ảnh tải...");
      if (!(await waitImages(sc, my, 6000))) break;
      if (atEnd(sc)) { stop("Đã tới cuối trang"); break; }
      if (!(await countdown(cfg.interval * 1000, my))) break;
    }
  }

  // ---------- Tam dung khi nguoi dung cuon tay ----------
  const manualKeys = new Set(["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "]);
  function userTookOver(e) {
    if (!running || !e.isTrusted) return;
    if (e.composedPath && e.composedPath().includes(host)) return;
    if (e.type === "keydown" && !manualKeys.has(e.key)) return;
    stop("Tạm dừng (bạn vừa cuộn tay)");
  }
  window.addEventListener("wheel", userTookOver, { passive: true, capture: true });
  window.addEventListener("touchstart", userTookOver, { passive: true, capture: true });
  window.addEventListener("keydown", userTookOver, { capture: true });

  window.addEventListener("keydown", (e) => {
    if (e.altKey && (e.key === "s" || e.key === "S")) {
      e.preventDefault();
      running ? stop("Đã dừng") : run();
    }
  }, true);

  // ---------- Mo/dong bang dieu khien tu icon tren thanh cong cu ----------
  if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg && msg.type === "toggle-panel") {
        host.style.display = host.style.display === "none" ? "block" : "none";
      }
    });
  }

  syncUi();
  document.documentElement.appendChild(host);
})();
