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
    if (/voxel/i.test(id)) return "⬒";
    if (/waifu|lofi/i.test(id)) return "♡";
    if (/cel-shaded|hero/i.test(id)) return "⚡";
    if (/web-slinger|noir/i.test(id)) return "◆";
    if (/samurai|slash/i.test(id)) return "✕";
    if (/mecha|hangar/i.test(id)) return "⬡";
    if (/ki-aura|aura/i.test(id)) return "◉";
    if (/gothic|mage/i.test(id)) return "☽";
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
    var list = DATA.templates.filter(function (t) {
      if (activeCat === "All" || activeCat === "Recent") return true;
      if (t.category === activeCat) return true;
      var tags = (t.tags || []).map(function (x) { return String(x).toLowerCase(); });
      return tags.indexOf(String(activeCat).toLowerCase()) > -1;
    });
    if (activeCat === "Recent") {
      list = list.slice().sort(function (a, b) {
        return String(b.date || "").localeCompare(String(a.date || ""));
      });
    }
    return list;
  }

  function renderGrid() {
    els.grid.innerHTML = "";
    visible().forEach(function (t) {
      var card = document.createElement("article");
      card.className = "card";
      var thumbHtml =
        '<div class="thumb" style="background:' + esc(t.accent) + '">' +
          (t.thumb
            ? '<img src="' + esc(t.thumb) + '" alt="" loading="lazy" decoding="async">'
            : '<span class="glyph">' + glyphFor(t.category, t.id) + "</span>") +
          '<span class="badge ' + tierClass(t.tier) + '">' + t.tier.toUpperCase() + "</span>" +
        "</div>";
      card.innerHTML = thumbHtml +
        '<div class="body">' +
          "<h3>" + esc(t.title) + "</h3>" +
          "<p>" + esc(t.blurb) + "</p>" +
          '<div class="row"><span class="cat">' + esc(t.category) + '</span><span class="open">Open →</span></div>' +
        "</div>";
      card.onclick = function () { openModal(t); };
      // keyboard accessibility: cards are interactive, so they must be focusable
      card.setAttribute("role", "button");
      card.setAttribute("tabindex", "0");
      card.setAttribute("aria-label", "Open " + t.title + " preview");
      card.onkeydown = function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openModal(t); }
      };
      els.grid.appendChild(card);
    });
    if (!els.grid.children.length) {
      els.grid.innerHTML = '<p style="color:var(--dim);grid-column:1/-1;text-align:center;padding:40px 0">No templates in this category yet — fresh drops coming.</p>';
    }
  }

  var modalTemplateId = null;

  function openModal(t, fromHistory) {
    els.mTitle.textContent = t.title;
    els.mBadge.textContent = t.tier.toUpperCase();
    els.mBadge.className = "badge " + tierClass(t.tier);
    els.mBlurb.textContent = t.blurb;
    els.mFrame.src = t.demo;
    modalTemplateId = t.id;
    if (!fromHistory) history.pushState({ dgModal: t.id }, "", "#t/" + t.id);

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
      els.mPeek.style.display = "block";
      if (getToken()) {
        els.mPeek.classList.add("locked");
        els.mPeek.textContent = "Checking your access…";
        els.mFootAction.innerHTML = "";
        fetchGatedPrompt(t, els.mPeek, els.mFootAction);
      } else {
        showSignInState(t, els.mPeek, els.mFootAction);
      }
    }
    els.modal.classList.add("open");
    document.body.style.overflow = "hidden";
    // a11y: move focus into the dialog
    try { els.modal.setAttribute("tabindex", "-1"); els.modal.focus(); } catch (e) {}
  }

  function closeModal(fromHistory) {
    els.modal.classList.remove("open");
    els.mFrame.src = "about:blank";
    document.body.style.overflow = "";
    if (modalTemplateId) {
      modalTemplateId = null;
      if (!fromHistory && location.hash.indexOf("#t/") === 0) history.back();
    }
  }

  // deep-link: #t/<id> opens the modal directly (shareable + refresh-safe)
  function openFromHash() {
    var m = location.hash.match(/^#t\/([^&=?]+)/);
    if (!m || !DATA) return;
    var id = decodeURIComponent(m[1]);
    var t = null;
    for (var i = 0; i < DATA.templates.length; i++) {
      if (DATA.templates[i].id === id) { t = DATA.templates[i]; break; }
    }
    if (t) openModal(t, true);
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

  // ---- PayPal SDK: loaded on demand from config (swap live/sandbox without touching HTML) ----
  var _ppLoading = false, _ppFailed = false;
  function ensurePaypal(cb) {
    if (typeof paypal !== "undefined" && paypal.Buttons) { cb(); return; }
    var id = (window.DG && window.DG.PAYPAL_CLIENT_ID) || "";
    if (!id || _ppFailed) { cb(); return; } // cb() renders the fallback/retry UI
    if (_ppLoading) return;
    _ppLoading = true;
    var s = document.createElement("script");
    s.src = "https://www.paypal.com/sdk/js?client-id=" + encodeURIComponent(id) +
      "&vault=true&intent=subscription";
    s.async = true;
    var settle = function (ok) {
      _ppLoading = false;
      if (!ok) _ppFailed = true;
      cb();
    };
    s.onload = function () { settle(typeof paypal !== "undefined"); };
    s.onerror = function () { settle(false); };
    document.head.appendChild(s);
    setTimeout(function () { if (_ppLoading) settle(typeof paypal !== "undefined"); }, 9000);
  }
  function renderPaypalButtons() {
    var map = [["paypal-button-pro", "pro"], ["paypal-button-max", "max"]];
    map.forEach(function (pair) {
      var el = document.getElementById(pair[0]);
      var plan = DATA.plans[pair[1]];
      if (!el || !plan || !plan.id) return;
      el.innerHTML = "";
      if (typeof paypal === "undefined" || !paypal.Buttons) {
        if (_ppFailed) {
          el.innerHTML = '<span class="pay-fallback">Payment buttons failed to load.</span>';
          var rb = document.createElement("button");
          rb.type = "button";
          rb.className = "btn btn-ghost btn-sm";
          rb.textContent = "Retry";
          rb.onclick = function () { _ppFailed = false; ensurePaypal(renderPaypalButtons); };
          el.appendChild(rb);
        } else {
          el.innerHTML = '<span class="pay-fallback">Loading payment buttons…</span>';
        }
        return;
      }
      paypal.Buttons({
        style: { shape: "rect", color: "gold", layout: "vertical", label: "subscribe", height: 46 },
        createSubscription: function (data, actions) {
          return actions.subscription.create({ plan_id: plan.id });
        },
        onApprove: function (data) {
          window.location.href = "thanks.html?sub_id=" + encodeURIComponent(data.subscriptionID || "") +
            "&tier=" + encodeURIComponent(pair[1]);
        },
        onError: function (err) {
          console.error("PayPal error", err);
          toast("Payment error — please try again or contact support.");
        }
      }).render(el);
    });
  }

  // ---- Supabase Google auth (client only talks to same-origin /api/*) ----
  var AUTH_KEY = "dg_auth";
  function cfg() { return window.DG || {}; }
  function loadAuth() { try { return JSON.parse(localStorage.getItem(AUTH_KEY) || "null"); } catch (e) { return null; } }
  function saveAuth(a) { try { localStorage.setItem(AUTH_KEY, JSON.stringify(a)); } catch (e) {} }
  function clearAuth() { try { localStorage.removeItem(AUTH_KEY); } catch (e) {} }
  function getToken() {
    var a = loadAuth();
    if (!a || !a.access_token) return null;
    if (a.expires_at && Date.now() > a.expires_at * 1000) return null; // stale — use ensureFreshToken()
    return a.access_token;
  }
  // Returns a valid access token, transparently refreshing ~55s before expiry.
  // Falls back to clearAuth (null) only when the refresh itself fails.
  function ensureFreshToken() {
    var a = loadAuth();
    if (!a || !a.access_token) return Promise.resolve(null);
    if (!a.expires_at || Date.now() < (a.expires_at - 55) * 1000) {
      return Promise.resolve(a.access_token);
    }
    if (!a.refresh_token) return Promise.resolve(null);
    var c = cfg();
    return fetch(c.SUPABASE_URL.replace(/\/$/, "") + "/auth/v1/token?grant_type=refresh_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: c.SUPABASE_ANON_KEY || "" },
      body: JSON.stringify({ refresh_token: a.refresh_token })
    })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (d) {
        saveAuth({
          access_token: d.access_token,
          refresh_token: d.refresh_token || a.refresh_token,
          token_type: d.token_type || "bearer",
          expires_at: Math.floor(Date.now() / 1000) + (d.expires_in || 3600)
        });
        updateAuthBtn();
        return d.access_token;
      })
      .catch(function () { clearAuth(); updateAuthBtn(); return null; });
  }
  function b64UrlEncode(buf) {
    var str = "";
    var bytes = new Uint8Array(buf);
    for (var i = 0; i < bytes.byteLength; i++) str += String.fromCharCode(bytes[i]);
    return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  // PKCE-first sign-in: new Supabase projects default to the authorization-code
  // flow, older ones still accept implicit tokens in the URL hash. We send a
  // code_challenge with the hosted authorize page and handle BOTH returns.
  function signIn() {
    var c = cfg();
    if (!c.SUPABASE_URL) { toast("Sign-in not configured yet — add Supabase keys in js/config.js"); return; }
    var verifier = b64UrlEncode(crypto.getRandomValues(new Uint8Array(32)));
    try { localStorage.setItem("dg_pkce_verifier", verifier); } catch (e) {}
    var finish = function (challenge) {
      var url = c.SUPABASE_URL.replace(/\/$/, "") + "/auth/v1/authorize" +
        "?redirect_to=" + encodeURIComponent(c.REDIRECT || location.origin + location.pathname);
      if (challenge) url += "&code_challenge=" + encodeURIComponent(challenge) + "&code_challenge_method=s256";
      if (c.SUPABASE_ANON_KEY) url += "&apikey=" + encodeURIComponent(c.SUPABASE_ANON_KEY);
      location.href = url;
    };
    if (crypto.subtle && crypto.subtle.digest) {
      crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)).then(function (hash) {
        finish(b64UrlEncode(hash));
      }, function () { finish(null); });
    } else { finish(null); }
  }
  // PKCE return: ?code=... must be exchanged for tokens with the stored verifier.
  function consumeCode() {
    var params = new URLSearchParams(location.search);
    var code = params.get("code");
    if (!code) return;
    var c = cfg();
    var verifier = null;
    try { verifier = localStorage.getItem("dg_pkce_verifier"); localStorage.removeItem("dg_pkce_verifier"); } catch (e) {}
    if (!verifier || !c.SUPABASE_URL) return;
    fetch(c.SUPABASE_URL.replace(/\/$/, "") + "/auth/v1/token?grant_type=pkce", {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: c.SUPABASE_ANON_KEY || "" },
      body: JSON.stringify({ auth_code: code, code_verifier: verifier })
    })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (d) {
        if (!d.access_token) throw new Error("no access_token");
        saveAuth({
          access_token: d.access_token,
          refresh_token: d.refresh_token || "",
          token_type: d.token_type || "bearer",
          expires_at: Math.floor(Date.now() / 1000) + (d.expires_in || 3600)
        });
        history.replaceState(null, "", location.pathname);
        updateAuthBtn();
        toast("Signed in");
      })
      .catch(function () { toast("Sign-in failed — try again"); });
  }
  function signOut() { clearAuth(); updateAuthBtn(); toast("Signed out"); }
  // Proactive refresh: implicit-grant tokens last ~1h; refresh_token is rotated
  // and stored, so an active reader never has to re-sign-in mid session.
  function refreshAuth() {
    var a = loadAuth();
    if (!a || !a.refresh_token) return;
    if (!a.expires_at || Date.now() < (a.expires_at - 60) * 1000) return; // still fresh
    var c = cfg();
    if (!c.SUPABASE_URL) return;
    fetch(c.SUPABASE_URL.replace(/\/$/, "") + "/auth/v1/token?grant_type=refresh_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: c.SUPABASE_ANON_KEY || "" },
      body: JSON.stringify({ refresh_token: a.refresh_token })
    })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (d) {
        saveAuth({
          access_token: d.access_token,
          refresh_token: d.refresh_token || a.refresh_token,
          token_type: d.token_type || "bearer",
          expires_at: Math.floor(Date.now() / 1000) + (d.expires_in || 3600)
        });
        updateAuthBtn();
      })
      .catch(function () { clearAuth(); updateAuthBtn(); });
  }
  function consumeHash() {
    var h = location.hash.replace(/^#/, "");
    if (h.indexOf("access_token=") === -1) return;
    var p = new URLSearchParams(h);
    var at = p.get("access_token");
    if (at) {
      var exp = parseInt(p.get("expires_in") || "3600", 10);
      saveAuth({
        access_token: at,
        refresh_token: p.get("refresh_token") || "",
        token_type: p.get("token_type") || "bearer",
        expires_at: Math.floor(Date.now() / 1000) + (isNaN(exp) ? 3600 : exp)
      });
      history.replaceState(null, "", location.pathname + location.search);
      updateAuthBtn();
      toast("Signed in");
    }
  }
  function updateAuthBtn() {
    var b = document.getElementById("authBtn");
    if (b) b.textContent = getToken() ? "Sign out" : "Sign in";
  }

  function showSignInState(t, peek, foot) {
    peek.classList.add("locked");
    peek.textContent = "Sign in with the email you used at checkout to unlock your " + t.tier.toUpperCase() + " prompts. Subscribed but not signed in? Sign in first.";
    foot.innerHTML = "";
    var si = document.createElement("button");
    si.className = "btn btn-primary";
    si.textContent = "Sign in to unlock";
    si.onclick = function () { signIn(); };
    foot.appendChild(si);
    var pr = document.createElement("a");
    pr.className = "btn btn-ghost";
    pr.href = "#pricing";
    pr.textContent = "See pricing";
    pr.onclick = function () { closeModal(); };
    foot.appendChild(pr);
  }
  function showUpgradeState(t, peek, foot) {
    peek.classList.remove("locked");
    peek.textContent = "Signed in, but this " + t.tier.toUpperCase() + " prompt needs an active " + t.tier.toUpperCase() + " subscription. Subscribe below, then return here.";
    foot.innerHTML = "";
    var up = document.createElement("a");
    up.className = "btn btn-primary";
    up.href = "#pricing";
    up.textContent = "Unlock with " + t.tier.toUpperCase() + " — $" + DATA.plans[t.tier].price + "/mo";
    up.onclick = function () { closeModal(); };
    foot.appendChild(up);
    // user may have just subscribed in another tab — let them re-check without reloading
    var rc = document.createElement("button");
    rc.className = "btn btn-ghost";
    rc.textContent = "I just subscribed — check access";
    rc.onclick = function () {
      peek.classList.add("locked");
      peek.textContent = "Checking your access…";
      fetchGatedPrompt(t, peek, foot);
    };
    foot.appendChild(rc);
  }
  async function fetchGatedPrompt(t, peek, foot) {
    try {
      var token = await ensureFreshToken();
      if (!token) { clearAuth(); updateAuthBtn(); showSignInState(t, peek, foot); return; }
      var r = await fetch("/api/prompt/" + encodeURIComponent(t.id), {
        headers: { Authorization: "Bearer " + token }
      });
      if (r.status === 401) { clearAuth(); updateAuthBtn(); showSignInState(t, peek, foot); return; }
      if (r.status === 402) { showUpgradeState(t, peek, foot); return; }
      if (r.status === 404) {
        peek.classList.remove("locked");
        peek.textContent = "This prompt isn't published yet — it's landing in the next drop.";
        foot.innerHTML = "";
        return;
      }
      if (!r.ok) throw new Error("HTTP " + r.status);
      var d = await r.json();
      if (!d.prompt) throw new Error("empty prompt");
      peek.classList.remove("locked");
      peek.textContent = d.prompt;
      foot.innerHTML = "";
      var cb = document.createElement("button");
      cb.className = "btn btn-primary";
      cb.textContent = "Copy prompt";
      cb.onclick = function () { copyPrompt(d.prompt, cb); };
      foot.appendChild(cb);
    } catch (e) {
      peek.classList.remove("locked");
      peek.textContent = "Couldn't load the prompt (" + ((e && e.message) || e) + "). Refresh or contact support.";
    }
  }

  // nav + progress on scroll
  window.addEventListener("scroll", function () {
    var h = document.documentElement;
    var pct = (h.scrollTop / (h.scrollHeight - h.clientHeight)) * 100;
    els.progress.style.width = pct + "%";
    if (h.scrollTop > 30) els.nav.classList.add("solid"); else els.nav.classList.remove("solid");
  }, { passive: true });

  els.mClose.onclick = function () { closeModal(); };
  els.modal.addEventListener("click", function (e) { if (e.target === els.modal || e.target.classList.contains("modal-bg")) closeModal(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeModal(); });
  window.addEventListener("popstate", function () {
    if (location.hash.indexOf("#t/") !== 0 && modalTemplateId) closeModal(true);
    else openFromHash();
  });

  var freeCta = document.getElementById("free-cta");
  if (freeCta) freeCta.onclick = function () {
    var lib = document.getElementById("library");
    if (lib) lib.scrollIntoView({ behavior: "smooth" });
  };

  consumeCode();
  consumeHash();
  refreshAuth();
  updateAuthBtn();

  // capture client errors for support diagnostics (shown via contact page flow)
  window.addEventListener("error", function (e) {
    try {
      var arr = JSON.parse(localStorage.getItem("dg_errors") || "[]");
      arr.push({ m: e.message, f: (e.filename || "").split("/").pop(), l: e.lineno, t: Date.now() });
      localStorage.setItem("dg_errors", JSON.stringify(arr.slice(-10)));
    } catch (_) {}
  });
  var authBtn = document.getElementById("authBtn");
  if (authBtn) authBtn.onclick = function () { if (getToken()) signOut(); else signIn(); };

  fetch("data/templates.json", { cache: "no-cache" })
    .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
    .then(function (d) {
      DATA = d;
      document.querySelectorAll("[data-count]").forEach(function (n) { n.textContent = d.templates.length; });
      renderChips();
      renderGrid();
      openFromHash();
      ensurePaypal(renderPaypalButtons);
    })
    .catch(function (err) {
      els.grid.innerHTML = '<p style="color:#f87171;grid-column:1/-1;padding:40px 0">Failed to load templates: ' + esc(err.message) + "</p>";
    });
})();
