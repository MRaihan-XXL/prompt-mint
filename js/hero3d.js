// DepthGlow hero: real-time glowing particle field (three.js, lazy-loaded).
// Additive blending gives the bloom look without postprocessing passes.
// Degrades gracefully: no WebGL / reduced-motion => static CSS glow stays visible.
(function () {
  "use strict";
  var host = document.querySelector(".hero-bg");
  if (!host) return;
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (window.matchMedia && window.matchMedia("(max-width: 640px)").matches) return; // keep phones light

  var s = document.createElement("script");
  s.src = "js/vendor/three.min.js";
  s.async = true;
  s.onload = init;
  s.onerror = function () { /* CSS glow remains */ };
  document.head.appendChild(s);

  function init() {
    if (typeof THREE === "undefined") return;
    var w = host.clientWidth || window.innerWidth;
    var h = host.clientHeight || window.innerHeight;
    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: "low-power" });
    } catch (e) { return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(w, h);
    renderer.domElement.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none";
    host.appendChild(renderer.domElement);

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 100);
    camera.position.z = 14;

    // particle cloud shaped like a soft torus knot — reads "cinematic 3D" instantly
    var COUNT = 2600;
    var pos = new Float32Array(COUNT * 3);
    var col = new Float32Array(COUNT * 3);
    var seed = new Float32Array(COUNT);
    var palette = [
      [0.49, 0.22, 0.93], // violet
      [0.02, 0.71, 0.83], // cyan
      [0.93, 0.29, 0.60], // pink
      [0.98, 0.75, 0.18], // gold
    ];
    for (var i = 0; i < COUNT; i++) {
      var t = (i / COUNT) * Math.PI * 2 * 3;
      var r = 4 + Math.sin(t * 2.7) * 1.6 + Math.random() * 1.2;
      pos[i * 3] = Math.cos(t) * r + (Math.random() - 0.5) * 2.2;
      pos[i * 3 + 1] = Math.sin(t * 1.3) * 2.6 + (Math.random() - 0.5) * 2.4;
      pos[i * 3 + 2] = Math.sin(t) * r * 0.6 + (Math.random() - 0.5) * 2.0;
      var c = palette[i % palette.length];
      col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
      seed[i] = Math.random() * Math.PI * 2;
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    var mat = new THREE.PointsMaterial({
      size: 0.09,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    var points = new THREE.Points(geo, mat);
    scene.add(points);

    var raf = 0, running = true;
    var base = geo.attributes.position.array.slice();
    function frame(now) {
      if (!running) return;
      raf = requestAnimationFrame(frame);
      var s1 = now * 0.0004;
      points.rotation.y = s1;
      points.rotation.x = Math.sin(s1 * 0.6) * 0.12;
      // gentle per-particle shimmer on Y
      for (var i = 0; i < COUNT; i += 3) {
        geo.attributes.position.array[i * 3 + 1] =
          base[i * 3 + 1] + Math.sin(s1 * 2 + seed[i]) * 0.18;
      }
      geo.attributes.position.needsUpdate = true;
      renderer.render(scene, camera);
    }
    raf = requestAnimationFrame(frame);

    // pause offscreen — battery + CPU
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        var vis = entries[0] && entries[0].isIntersecting;
        if (vis && !running) { running = true; raf = requestAnimationFrame(frame); }
        else if (!vis && running) { running = false; cancelAnimationFrame(raf); }
      }).observe(host);
    }

    var rt;
    window.addEventListener("resize", function () {
      clearTimeout(rt);
      rt = setTimeout(function () {
        var nw = host.clientWidth || window.innerWidth;
        var nh = host.clientHeight || window.innerHeight;
        camera.aspect = nw / nh;
        camera.updateProjectionMatrix();
        renderer.setSize(nw, nh);
      }, 150);
    });
  }
})();
