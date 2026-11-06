/* promo.niveshsahayak.in: cost estimate for a promotion card, worked out like an ad budget.
   The business picks a daily budget, the number of days, where the card shows and who sees it; the page shows the total,
   the price per 1,000 views and the estimated views and taps. Prices come from /rates.json (sites/promo/static/rates.json);
   R below is only the fallback when that file can't be read. A place can only give so many views a day (views_per_day):
   budget above that buys nothing, so the total is worked out on what can really be shown.
   "Send this estimate" fills the contact form on the page ([data-ns-contact], contact.js), or copies the estimate when the
   form is not switched on yet and opens the contact page. */
(function () {
  'use strict';
  var NS = window.NS;
  var R = { cpm: 50, place: { all: { label: 'Everywhere', mult: 1 }, pages: { label: 'Guide and tool pages', mult: 1 }, app: { label: 'Nivesh Sahayak App', mult: 1.3 } },
    india_extra: 0, india_share: 0.9, views_per_day: { pages: 12000, app: 3000 }, ctr: [0.004, 0.012],
    budget: { min: 100, max: 5000, step: 50, start: 200 }, days: { min: 1, max: 90, start: 15 }, min_total: 500 };
  var box, f, last = '', touched = false;
  function $(s, p) { return (p || document).querySelector(s); }
  function $$(s, p) { return Array.prototype.slice.call((p || document).querySelectorAll(s)); }
  function inr(n) { return '₹' + Math.round(n).toLocaleString('en-IN'); }
  function num(n) { return Math.round(n).toLocaleString('en-IN'); }
  /* round a views estimate to 2 significant digits so it never looks more exact than it is */
  function about(n) { if (n < 100) return Math.round(n); var p = Math.pow(10, Math.floor(Math.log10(n)) - 1); return Math.round(n / p) * p; }
  function clamp(v, a, b) { v = +v; return isNaN(v) ? a : Math.min(b, Math.max(a, v)); }
  function val(name) { var x = $('[name="' + name + '"]:checked', f); return x ? x.value : ''; }

  function calc() {
    var daily = clamp(f.elements.namedItem('daily').value, R.budget.min, R.budget.max);
    var days = Math.round(clamp(f.elements.namedItem('days').value, R.days.min, R.days.max));
    var place = R.place[val('place')] ? val('place') : 'all', india = val('who') === 'india';
    var rate = R.cpm * R.place[place].mult * (india ? 1 + R.india_extra : 1);
    var avail = (place === 'all' ? R.views_per_day.pages + R.views_per_day.app : R.views_per_day[place] || 0) * (india ? R.india_share : 1);
    var want = daily / rate * 1000, views = Math.min(want, avail), capped = want > avail;
    var payDay = views * rate / 1000, full = payDay * days;
    /* longer runs cost less: the biggest discount whose days this run reaches (rates.json discounts) */
    var off = (R.discounts || []).reduce(function (o, d) { return days >= d.days && d.off > o ? d.off : o; }, 0), total = full * (1 - off);
    return { daily: daily, days: days, place: place, india: india, rate: rate, avail: avail, views: views, capped: capped, payDay: payDay, total: total, full: full, off: off,
      maxDaily: Math.ceil(avail * rate / 1000) };
  }

  function draw() {
    var c = calc(), lo = c.views * 0.85, hi = c.views;
    $('[data-pr-total]', box).textContent = inr(c.total);
    $('[data-pr-sum]', box).textContent = inr(c.payDay) + ' a day × ' + c.days + (c.days === 1 ? ' day' : ' days') +
      (c.off ? ' = ' + inr(c.full) + ', less ' + Math.round(c.off * 100) + '% for a longer run' : '');
    var sv = $('[data-pr-save]', box); if (sv) { sv.hidden = !c.off; sv.textContent = c.off ? 'You save ' + inr(c.full - c.total) : ''; }
    $('[data-pr-rate]', box).textContent = inr(c.rate) + ' per 1,000 views';
    $('[data-pr-vday]', box).textContent = num(about(lo)) + ' – ' + num(about(hi));
    $('[data-pr-vall]', box).textContent = num(about(lo * c.days)) + ' – ' + num(about(hi * c.days));
    $('[data-pr-taps]', box).textContent = num(about(lo * c.days * R.ctr[0])) + ' – ' + num(about(hi * c.days * R.ctr[1]));
    $('[data-pr-bar]', box).style.width = Math.max(4, Math.min(100, c.views / c.avail * 100)) + '%';
    $('[data-pr-share]', box).textContent = 'Your card fills about ' + Math.round(Math.min(1, c.views / c.avail) * 100) + '% of the card spaces in this place each day.';
    var warn = [];
    if (c.capped) warn.push('This place can show a card about ' + num(about(c.avail)) + ' times a day, so a daily budget above ' + inr(c.maxDaily) + ' adds nothing. You pay only for what can be shown. For more views pick Everywhere or run more days.');
    if (c.total < R.min_total) warn.push('The smallest promotion is ' + inr(R.min_total) + ' in total. Add days or raise the daily budget.');
    var w = $('[data-pr-warn]', box);
    w.innerHTML = warn.map(function (x) { return '<p>' + NS.esc(x) + '</p>'; }).join('');
    w.hidden = !warn.length;
    $('[data-pr-send]', box).disabled = c.total < R.min_total;
    $('[data-pr-dailyout]', box).textContent = inr(c.daily);
    $('[data-pr-daysout]', box).textContent = c.days + (c.days === 1 ? ' day' : ' days');
    $$('[data-days]', box).forEach(function (b) { b.setAttribute('aria-pressed', +b.getAttribute('data-days') === c.days ? 'true' : 'false'); });
    last = ['Promotion card estimate (promo.niveshsahayak.in)',
      'Where: ' + R.place[c.place].label, 'Who sees it: ' + (c.india ? 'Only visitors in India' : 'All visitors'),
      'Daily budget: ' + inr(c.payDay), 'Days: ' + c.days, 'Total: ' + inr(c.total) + ' (' + inr(c.rate) + ' per 1,000 views' + (c.off ? ', ' + Math.round(c.off * 100) + '% off for ' + c.days + ' days' : '') + ')',
      'Estimated views: ' + $('[data-pr-vall]', box).textContent, '', 'My business:', 'Card link:', 'Start date:'].join('\n');
  }

  /* the number box and the slider of a field move together */
  function pair(name) {
    var n = f.elements.namedItem(name), s = f.elements.namedItem(name + '_r');
    s.addEventListener('input', function () { n.value = s.value; draw(); });
    n.addEventListener('input', function () { if (n.value !== '') { s.value = n.value; draw(); } });
    n.addEventListener('change', function () { var lim = R[name === 'daily' ? 'budget' : 'days']; n.value = clamp(n.value, lim.min, lim.max); s.value = n.value; draw(); });
  }

  function send() {
    var ta = $('[data-ns-contact] textarea');
    if (ta) {
      ta.value = last; ta.dispatchEvent(new Event('input', { bubbles: true }));
      var tp = $('[data-ns-contact] select[name="topic"]'); if (tp) tp.value = 'other';
      ta.scrollIntoView({ block: 'center', behavior: 'smooth' });
      ta.focus({ preventScroll: true });
      return;
    }
    var go = function () { NS.toast('Estimate copied. Paste it into the contact form.'); location.href = '/contact/'; };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(last).then(go, go); else go();
  }

  /* limits (and start values, unless the visitor already moved something) from the rates */
  function setup() {
    $$('[name="daily"],[name="daily_r"]', f).forEach(function (i) { i.min = R.budget.min; i.max = R.budget.max; i.step = R.budget.step; if (!touched) i.value = R.budget.start; });
    $$('[name="days"],[name="days_r"]', f).forEach(function (i) { i.min = R.days.min; i.max = R.days.max; if (!touched) i.value = R.days.start; });
    $$('[data-pr-cpm]').forEach(function (e) { e.textContent = inr(R.cpm); });
    $$('[data-place-label]', f).forEach(function (l) { var p = R.place[l.getAttribute('data-place-label')]; if (p) l.textContent = p.label; });
    var ex = $('[data-pr-india]', f); if (ex) { ex.textContent = R.india_extra ? '+' + Math.round(R.india_extra * 100) + '%' : ''; ex.hidden = !R.india_extra; }
    draw();
  }

  function start() {
    box = $('[data-pr-calc]');
    if (!box) return;
    f = $('form', box);
    f.addEventListener('submit', function (e) { e.preventDefault(); });
    f.addEventListener('change', draw);
    f.addEventListener('input', function () { touched = true; });
    box.addEventListener('click', function (e) { if (e.target.closest('[data-days]')) touched = true; });
    pair('daily'); pair('days');
    $$('[data-days]', box).forEach(function (b) {
      b.addEventListener('click', function () { var d = b.getAttribute('data-days'); f.elements.namedItem('days').value = d; f.elements.namedItem('days_r').value = d; draw(); });
    });
    $('[data-pr-send]', box).addEventListener('click', send);
    setup();
    fetch('/rates.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (j) { R = j; setup(); }).catch(function () {});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
