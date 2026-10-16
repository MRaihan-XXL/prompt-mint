(function () {
  "use strict";
  var DATA = null;
  var activeCat = "All";
  var els = {
    grid: document.getElementById("grid"),
    chips: document.getElementById("chips"),
    modal: document.getElementById("modal"),
    mFrame: document.getElementById("mFrame"),
    mTitle: document.getElementById("mTitle"),
    mBadge: document.getElementById("mBadge"),
    mBlurb: document.getElementById("mBlurb"),
    mPeek: document.getElementById("mPeek"),
    mAction: document.getElementById("mAction"),
    mClose: document.getElementById("mClose"),
    mFootAction: document.getElementById("mFootAction"),
    progress: document.getElementById("progress"),
    nav: document.getElementById("nav"),
    toast: document.getElementById("toast")
  };

  function tierClass(t) { return "tier-" + t; }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function toast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { els.toast.classList.remove("show"); }, 2200);
  }

  function glyphFor(cat, id) {
    if (/galaxy|particle/i.test(id)) return "✦";
    if (/liquid|metal/i.test(id)) return "◍";
    if (/city/i.test(id)) return "▦";
    if (/terrain/i.test(id)) return "▲";
    if (/mesh|wave/i.test(id)) return "≋";
    if (/prism|orbit/i.test(id)) return "◈";
    if (/glass|saas|pricing/i.test(id)) return "▤";
    if (/type|kinetic/i.test(id)) return "Aa";
    if (/portfolio|editorial/i.test(id)) return "▣";
    return "◐";
  }

  function renderChips() {
    els.chips.innerHTML = "";
    DATA.categories.forEach(function (c) {
      var b = document.createElement("button");
      b.className = "chip" + (c === activeCat ? " active" : "");
      b.textContent = c;
      b.onclick = function () { activeCat = c; renderChips(); renderGrid(); };
      els.chips.appendChild(b);
    });
  }

  function visible() {
    return DATA.templates.filter(function (t) {
      if (activeCat === "All") return true;
      if (activeCat === "Recent") return true; // all recent for now; newest first already
      return t.category === activeCat || (t.tags || []).indexOf(activeCat.toLowerCase()) > -1;
    });
  }

  function renderGrid() {
    els.grid.innerHTML = "";
    visible().forEach(function (t) {
      var card = document.createElement("article");
      card.className = "card";
      card.innerHTML =
        '<div class="thumb" style="background:' + t.accent + '">' +
          '<span class="glyph">' + glyphFor(t.category, t.id) + "</span>" +
          '<span class="badge ' + tierClass(t.tier) + '">' + t.tier.toUpperCase() + "</span>" +
        "</div>" +
        '<div class="body">' +
          "<h3>" + esc(t.title) + "</h3>" +
          "<p>" + esc(t.blurb) + "</p>" +
          '<div class="row"><span class="cat">' + esc(t.category) + '</span><span class="open">Open →</span></div>' +
        "</div>";
      card.onclick = function () { openModal(t); };
      els.grid.appendChild(card);
    });
    if (!els.grid.children.length) {
      els.grid.innerHTML = '<p style="color:var(--dim);grid-column:1/-1;text-align:center;padding:40px 0">No templates in this category yet — fresh drops coming.</p>';
    }
  }

  function openModal(t) {
    els.mTitle.textContent = t.title;
    els.mBadge.textContent = t.tier.toUpperCase();
    els.mBadge.className = "badge " + tierClass(t.tier);
    els.mBlurb.textContent = t.blurb;
    els.mFrame.src = t.demo;

    var isFree = t.tier === "free";
    if (isFree) {
      els.mPeek.classList.remove("locked");
      els.mPeek.textContent = t.prompt;
      els.mPeek.style.display = "block";
      els.mFootAction.innerHTML = "";
      var copyBtn = document.createElement("button");
      copyBtn.className = "btn btn-primary";
      copyBtn.textContent = "Copy prompt";
      copyBtn.onclick = function () { copyPrompt(t.prompt, copyBtn); };
      els.mFootAction.appendChild(copyBtn);
    } else {
      els.mPeek.classList.add("locked");
      els.mPeek.textContent =
        "This is a " + t.tier.toUpperCase() + " template.\n" +
        "The full production prompt is included with your " + t.tier.toUpperCase() +
        " subscription.\nSubscribe below, then unlock every " + t.tier.toUpperCase() + " prompt in one click.";
      els.mPeek.style.display = "block";
      els.mFootAction.innerHTML = "";
      var upBtn = document.createElement("a");
      upBtn.className = "btn btn-primary";
      upBtn.href = "#pricing";
      upBtn.textContent = t.tier === "max" ? "Unlock with Max — $15/mo" : "Unlock with Pro — $7/mo";
      upBtn.onclick = function () { closeModal(); };
      els.mFootAction.appendChild(upBtn);
    }
    els.modal.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    els.modal.classList.remove("open");
    els.mFrame.src = "about:blank";
    document.body.style.overflow = "";
  }

  function copyPrompt(text, btn) {
    var done = function () {
      toast("Prompt copied — paste it into your AI");
      if (btn) { var o = btn.textContent; btn.textContent = "Copied ✓"; setTimeout(function () { btn.textContent = o; }, 1600); }
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text, done); });
    } else { fallbackCopy(text, done); }
  }

  function fallbackCopy(text, done) {
    var ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); done(); } catch (e) { toast("Copy failed — select manually"); }
    document.body.removeChild(ta);
  }

  // expose for free-tier quick copy on cards via keyboard etc.
  window.__pm = { copyPrompt: copyPrompt };

  // nav + progress on scroll
  window.addEventListener("scroll", function () {
    var h = document.documentElement;
    var pct = (h.scrollTop / (h.scrollHeight - h.clientHeight)) * 100;
    els.progress.style.width = pct + "%";
    if (h.scrollTop > 30) els.nav.classList.add("solid"); else els.nav.classList.remove("solid");
  }, { passive: true });

  els.mClose.onclick = closeModal;
  els.modal.addEventListener("click", function (e) { if (e.target === els.modal || e.target.classList.contains("modal-bg")) closeModal(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeModal(); });

  fetch("data/templates.json", { cache: "no-cache" })
    .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
    .then(function (d) {
      DATA = d;
      document.querySelectorAll("[data-count]").forEach(function (n) { n.textContent = d.templates.length; });
      renderChips();
      renderGrid();
    })
    .catch(function (err) {
      els.grid.innerHTML = '<p style="color:#f87171;grid-column:1/-1;padding:40px 0">Failed to load templates: ' + esc(err.message) + "</p>";
    });
})();
