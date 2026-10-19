/* motion.js — DepthGlow interaction engine (zero deps, ~3kb)
   - Reticle cursor: 4 corner brackets that follow pointer and SNAP around
     hovered interactive targets (buttons/links), matching their bounding box.
   - Magnetic buttons: interactive elements pull gently toward the cursor.
   - Reveal on scroll: IntersectionObserver toggles .in on [data-reveal].
   Respects prefers-reduced-motion. Loads after DOM ready. */
(function () {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (!matchMedia("(pointer: fine)").matches) return; // touch: skip

  var reticle = document.createElement("div");
  reticle.id = "reticle";
  reticle.innerHTML = '<i class="r tl"></i><i class="r tr"></i><i class="r bl"></i><i class="r br"></i>';
  document.body.appendChild(reticle);
  var corners = reticle.querySelectorAll(".r");

  var mx = innerWidth / 2, my = innerHeight / 2;   // target
  var cx = mx, cy = my;                             // current
  var snap = null;                                  // snapped element bbox
  var SX = 14, SY = 14, GAP = 6;                    // idle size / snap padding

  addEventListener("pointermove", function (e) {
    mx = e.clientX; my = e.clientY;
    reticle.classList.add("on");
    var t = e.target.closest("button,a,[data-mag]");
    if (t) { var r = t.getBoundingClientRect(); snap = r; reticle.classList.add("snap"); }
    else { snap = null; reticle.classList.remove("snap"); }
  }, { passive: true });
  addEventListener("pointerleave", function () { reticle.classList.remove("on"); });

  // magnetic pull on buttons
  var magEls = [];
  function collectMag() { magEls = [].slice.call(document.querySelectorAll(".btn,[data-mag]")); }
  collectMag();
  addEventListener("pointermove", function (e) {
    for (var i = 0; i < magEls.length; i++) {
      var el = magEls[i], r = el.getBoundingClientRect();
      var dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      var dist = Math.hypot(dx, dy), rad = Math.max(r.width, r.height) * 0.9;
      if (dist < rad) {
        var f = (1 - dist / rad) * 0.35;
        el.style.transform = "translate(" + (dx * f) + "px," + (dy * f) + "px)";
        el.style.setProperty("--mx", ((e.clientX - r.left) / r.width * 100) + "%");
        el.style.setProperty("--my", ((e.clientY - r.top) / r.height * 100) + "%");
      } else if (el.style.transform) el.style.transform = "";
    }
  }, { passive: true });

  // rAF: lerp reticle toward target (or snap box)
  function tick() {
    var tx, ty, w, h;
    if (snap) { tx = snap.left + snap.width / 2; ty = snap.top + snap.height / 2; w = snap.width + GAP * 2; h = snap.height + GAP * 2; }
    else { tx = mx; ty = my; w = SX; h = SY; }
    cx += (tx - cx) * 0.2; cy += (ty - cy) * 0.2;
    var hw = w / 2, hh = h / 2;
    corners[0].style.transform = "translate(" + (cx - hw) + "px," + (cy - hh) + "px)";
    corners[1].style.transform = "translate(" + (cx + hw - 14) + "px," + (cy - hh) + "px)";
    corners[2].style.transform = "translate(" + (cx - hw) + "px," + (cy + hh - 14) + "px)";
    corners[3].style.transform = "translate(" + (cx + hw - 14) + "px," + (cy + hh - 14) + "px)";
    corners[0].style.width = corners[1].style.width = w + "px";
    corners[2].style.width = corners[3].style.width = w + "px";
    corners[0].style.height = corners[2].style.height = h + "px";
    corners[1].style.height = corners[3].style.height = h + "px";
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  // reveal on scroll
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
  }, { threshold: 0.15 });
  document.querySelectorAll("[data-reveal]").forEach(function (el) { io.observe(el); });

  // re-collect magnetic elements when DOM changes
  new MutationObserver(collectMag).observe(document.body, { childList: true, subtree: true });
})();
