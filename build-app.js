// Builds index.html (the clickable ParkGo web app) from the screen designs in parking-app-screens.html.
// Run:  node build-app.js
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'parking-app-screens.html');
const OUT = path.join(__dirname, 'index.html');
const src = fs.readFileSync(SRC, 'utf8');

const css = src.slice(src.indexOf('<style>') + 7, src.indexOf('</style>'));
const symbolsStart = src.indexOf('<svg width="0" height="0"');
const symbols = src.slice(symbolsStart, src.indexOf('</svg>\n\n<header') + 6);

// Pull the inner .screen of every shot, keyed by shot id
const views = [];
const order = [];
const START = '<div class="shot" id="';
for (let i = src.indexOf(START); i >= 0; i = src.indexOf(START, i + 1)) {
  const id = src.slice(i + START.length, src.indexOf('"', i + START.length));
  const lab = src.slice(i, src.indexOf('</div>', src.indexOf('<div class="label">', i)));
  order.push({ id: id, title: lab.replace(/<[^>]+>/g, ' ').replace(/^\s*\d+\s*/, '').replace(/\s+/g, ' ').trim() });
  const sStart = src.indexOf('<div class="screen"', i);
  // walk divs to find the matching close of .screen
  let depth = 0, j = sStart;
  const re = /<\/?div\b[^>]*>/g;
  re.lastIndex = sStart;
  let m;
  while ((m = re.exec(src))) {
    depth += m[0].startsWith('</') ? -1 : 1;
    if (depth === 0) { j = re.lastIndex; break; }
  }
  const screen = src.slice(sStart, j).replace('<div class="screen"', `<div class="screen view" id="v-${id}"`);
  views.push(screen);
}

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">
<meta name="theme-color" content="#1e9e5a">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="ParkGo">
<title>ParkGo</title>
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="icon-192.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
${css}
/* ---------- app shell ---------- */
html,body{height:100%}
body{padding:0;margin:0;overflow:hidden;background:#0d1411;-webkit-tap-highlight-color:transparent;user-select:none}
.app{position:fixed;inset:0;overflow:hidden}
.device{position:absolute;left:0;top:0;width:300px;height:620px;transform-origin:0 0;border-radius:40px;background:#0d1411;padding:9px;box-shadow:0 30px 60px rgba(0,0,0,.5)}
.device .screen{position:absolute;inset:9px;width:auto;height:auto}
.view{display:none!important}
.view.on{display:flex!important;animation:in .22s ease}
@keyframes in{from{opacity:.4;transform:translateX(12px)}to{opacity:1;transform:none}}
.view.back{animation:inb .22s ease}
@keyframes inb{from{opacity:.4;transform:translateX(-12px)}to{opacity:1;transform:none}}
[data-go],.chip,.toggle,.seg div,.card,.listrow{cursor:pointer}
.pager{position:fixed;left:0;right:0;bottom:12px;display:flex;align-items:center;justify-content:center;gap:14px;font:500 13px Inter,sans-serif;color:#cfe0d6}
.pager button{width:44px;height:44px;border-radius:50%;border:0;background:#1e9e5a;color:#fff;font-size:22px;line-height:1;cursor:pointer;display:grid;place-items:center}
.pager button:disabled{background:#2a3a32;color:#5b6b62;cursor:default}
.pager .t{min-width:260px;text-align:center}
.pager .t b{color:#fff}
.pager .k{display:block;font-size:11px;color:#93a39a;margin-top:2px}
.toast{position:fixed;left:50%;top:14px;transform:translate(-50%,-30px);opacity:0;background:rgba(18,32,26,.9);color:#fff;font:600 12px Inter,sans-serif;padding:7px 12px;border-radius:99px;transition:.25s;z-index:99;pointer-events:none;white-space:nowrap}
.toast.on{transform:translate(-50%,0);opacity:1}
@media (min-width:601px){.toast{display:none}}
/* Full-screen on phones: drop the frame and fake status bar/notch */
@media (max-width:600px){
  body{background:var(--bg)}
  .device{border-radius:0;padding:0;box-shadow:none;background:var(--bg)}
  .device .screen{inset:0;border-radius:0}
  .notch{display:none}
  .status{height:max(10px, env(safe-area-inset-top));padding:0;font-size:0}
  .status *{display:none}
  .pager{display:none}
}
</style>
</head>
<body>
${symbols}
<div class="app"><div class="device">
${views.join('\n')}
</div></div>
<div class="pager"><button id="prev" aria-label="Previous screen">‹</button><div class="t"><span id="ptitle"></span><span class="k">← → keys or mouse wheel · open on your phone for full screen</span></div><button id="next" aria-label="Next screen">›</button></div>
<div class="toast" id="toast"></div>
<script>
var ORDER = ${JSON.stringify(order)};
(function () {
  // Scale the 300px-wide design to the phone width (or a comfortable size on desktop)
  // The screens are designed at 282px wide; scale them to fit the real screen
  function fit() {
    var W = window.innerWidth, H = window.innerHeight, d = document.querySelector('.device');
    if (W <= 600) {
      var z = Math.min(Math.max(W / 282, 1), 1.6);
      d.style.width = (W / z) + 'px'; d.style.height = (H / z) + 'px';
      d.style.transform = 'scale(' + z + ')'; d.style.left = '0px'; d.style.top = '0px';
    } else {
      var z2 = Math.min((H - 100) / 620, 1.25);
      d.style.width = '300px'; d.style.height = '620px';
      d.style.transform = 'scale(' + z2 + ')';
      d.style.left = ((W - 300 * z2) / 2) + 'px'; d.style.top = Math.max((H - 620 * z2) / 2 - 30, 8) + 'px';
    }
  }
  fit(); addEventListener('resize', fit);

  var stack = [];
  function show(id, isBack) {
    var next = document.getElementById('v-' + id);
    if (!next) return false;
    var cur = document.querySelector('.view.on');
    if (cur === next) return true;
    if (cur) cur.classList.remove('on', 'back');
    next.classList.add('on');
    next.classList.toggle('back', !!isBack);
    updatePager(id);
    return true;
  }
  var toastTimer;
  function indexOf(id) { for (var k = 0; k < ORDER.length; k++) if (ORDER[k].id === id) return k; return -1; }
  function updatePager(id) {
    var k = indexOf(id), label = (k + 1) + ' / ' + ORDER.length + ' · ' + ORDER[k].title;
    document.getElementById('ptitle').innerHTML = '<b>' + (k + 1) + ' / ' + ORDER.length + '</b> · ' + ORDER[k].title;
    document.getElementById('prev').disabled = k <= 0;
    document.getElementById('next').disabled = k >= ORDER.length - 1;
    var t = document.getElementById('toast');
    t.textContent = label; t.classList.add('on');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove('on'); }, 1300);
  }
  function step(d) {
    var cur = document.querySelector('.view.on');
    var k = indexOf(cur.id.slice(2)) + d;
    if (k < 0 || k >= ORDER.length) return;
    stack = [ORDER[k].id];
    show(ORDER[k].id, d < 0);
    history.replaceState({ id: ORDER[k].id }, '', '#' + ORDER[k].id);
  }
  document.getElementById('prev').onclick = function () { step(-1); };
  document.getElementById('next').onclick = function () { step(1); };
  addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); step(1); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); step(-1); }
  });
  var wheelLock = 0;
  addEventListener('wheel', function (e) {
    var now = Date.now();
    if (now < wheelLock || Math.abs(e.deltaY) < 20) return;
    wheelLock = now + 500;
    step(e.deltaY > 0 ? 1 : -1);
  }, { passive: true });
  // Swipe left / right on a phone
  var sx = 0, sy = 0;
  addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  addEventListener('touchend', function (e) {
    var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 70 && Math.abs(dy) < 50) step(dx < 0 ? 1 : -1);
  }, { passive: true });
  function go(id) {
    var cur = document.querySelector('.view.on');
    var curId = cur && cur.id.slice(2);
    // Going to a screen already in history counts as going back
    var idx = stack.lastIndexOf(id);
    if (idx >= 0) { stack = stack.slice(0, idx + 1); show(id, true); }
    else { stack.push(id); show(id, false); }
    history.pushState({ id: id }, '', '#' + id);
  }
  addEventListener('popstate', function (e) {
    var id = (e.state && e.state.id) || 'splash';
    var idx = stack.lastIndexOf(id);
    if (idx >= 0) stack = stack.slice(0, idx + 1);
    show(id, true);
  });

  document.addEventListener('click', function (e) {
    var t = e.target;
    var el = t.closest('[data-go]');
    if (el && document.getElementById('v-' + el.dataset.go)) { e.preventDefault(); go(el.dataset.go); return; }

    // Small interactions so the prototype feels real
    var tg = t.closest('.toggle'); if (tg) { tg.classList.toggle('on'); return; }
    var chip = t.closest('.chips .chip');
    if (chip) { chip.parentNode.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('on'); }); chip.classList.add('on'); return; }
    var seg = t.closest('.seg > div');
    if (seg) { seg.parentNode.querySelectorAll('div').forEach(function (c) { c.classList.remove('on'); }); seg.classList.add('on'); return; }
    var day = t.closest('.cal i:not(.off)');
    if (day) { day.parentNode.querySelectorAll('i').forEach(function (c) { c.classList.remove('sel'); }); day.classList.add('sel'); return; }
    var radioCard = t.closest('.card');
    if (radioCard && radioCard.querySelector(':scope > .radio, .listrow > .radio') === null && radioCard.querySelector('.radio')) {
      var group = radioCard.parentNode;
      group.querySelectorAll('.card').forEach(function (c) { var r = c.querySelector('.radio'); if (r) { r.classList.remove('on'); c.style.borderColor = ''; c.style.borderWidth = ''; } });
      radioCard.querySelector('.radio').classList.add('on');
      radioCard.style.border = '2px solid var(--brand)';
      return;
    }
    var row = t.closest('.listrow');
    if (row && row.querySelector('.radio')) {
      row.parentNode.querySelectorAll('.radio').forEach(function (r) { r.classList.remove('on'); });
      row.querySelector('.radio').classList.add('on');
    }
  });

  // Fake QR pattern for the ticket
  document.querySelectorAll('.qr').forEach(function (qr) {
    var seed = 11;
    function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
    function finder(r, c, R, C) { var y = r - R, x = c - C; if (y < 0 || y > 6 || x < 0 || x > 6) return null; return y === 0 || y === 6 || x === 0 || x === 6 || (y >= 2 && y <= 4 && x >= 2 && x <= 4); }
    for (var r = 0; r < 21; r++) for (var c = 0; c < 21; c++) {
      var on = finder(r, c, 0, 0); if (on === null) on = finder(r, c, 0, 14); if (on === null) on = finder(r, c, 14, 0);
      if (on === null) on = (r === 7 || c === 7 || (r === 13 && c < 8) || (c === 13 && r < 8)) ? false : rnd() > 0.5;
      var i = document.createElement('i'); if (!on) i.className = 'o'; qr.appendChild(i);
    }
  });

  // Live timer on the "Parking in progress" screen
  var secs = 1 * 3600 + 18 * 60 + 42;
  setInterval(function () {
    secs++;
    var el = document.querySelector('#v-active .ring b');
    if (!el) return;
    var p = function (n) { return String(n).padStart(2, '0'); };
    el.textContent = p(Math.floor(secs / 3600)) + ':' + p(Math.floor(secs / 60) % 60) + ':' + p(secs % 60);
  }, 1000);

  // Start: deep link (#screen) or splash → onboarding
  var start = location.hash.slice(1);
  if (start && document.getElementById('v-' + start)) { stack = [start]; show(start); history.replaceState({ id: start }, '', '#' + start); }
  else {
    stack = ['splash']; show('splash'); history.replaceState({ id: 'splash' }, '', '#splash');
    setTimeout(function () { if (document.querySelector('.view.on').id === 'v-splash') go('onb1'); }, 1600);
  }
})();
</script>
</body>
</html>
`;
fs.writeFileSync(OUT, html, 'utf8');
console.log('Built index.html with ' + views.length + ' screens');
