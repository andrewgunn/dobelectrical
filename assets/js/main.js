/* D O'Brien Electrical — site interactions */
(function () {
  "use strict";

  var PHONE_WA = "447429389961";
  var EMAIL = "Enquiries@dobelectrical.co.uk";
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Nav ---------- */
  var nav = document.getElementById("nav");
  var menu = document.getElementById("menu");
  var toggle = document.querySelector(".nav__toggle");
  var actionbar = document.querySelector(".actionbar");

  function onScroll() {
    var y = window.scrollY;
    if (nav) nav.classList.toggle("is-scrolled", y > 20);
    if (actionbar) actionbar.classList.toggle("is-visible", y > 280);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  function setMenu(open) {
    nav.classList.toggle("is-open", open);
    menu.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    document.body.style.overflow = open ? "hidden" : "";
  }
  if (toggle && menu) {
    toggle.addEventListener("click", function () {
      setMenu(!menu.classList.contains("is-open"));
    });
    menu.addEventListener("click", function (e) {
      if (e.target.closest("a")) setMenu(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && menu.classList.contains("is-open")) {
        setMenu(false);
        toggle.focus();
      }
    });
    window.addEventListener("resize", function () {
      if (window.innerWidth > 960 && menu.classList.contains("is-open")) setMenu(false);
    });
  }

  /* ---------- Reveal on scroll ---------- */
  var revealEls = document.querySelectorAll("[data-reveal]");
  if ("IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-in"); });
  }

  /* ---------- Counters ---------- */
  function formatNum(n, decimals) {
    return n.toLocaleString("en-GB", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }
  function runCounter(el) {
    var target = parseFloat(el.dataset.count);
    var decimals = (el.dataset.count.split(".")[1] || "").length;
    var prefix = el.dataset.prefix || "";
    var suffix = el.dataset.suffix || "";
    if (reduceMotion) {
      el.textContent = prefix + formatNum(target, decimals) + suffix;
      return;
    }
    var start = performance.now();
    var dur = 1800;
    (function tick(now) {
      var t = Math.min(1, (now - start) / dur);
      var eased = 1 - Math.pow(1 - t, 4);
      el.textContent = prefix + formatNum(target * eased, decimals) + suffix;
      if (t < 1) requestAnimationFrame(tick);
    })(start);
  }
  var counters = document.querySelectorAll("[data-count]");
  if ("IntersectionObserver" in window) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          runCounter(entry.target);
          cio.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });
    counters.forEach(function (el) { cio.observe(el); });
  } else {
    counters.forEach(runCounter);
  }

  /* ---------- Cursor spotlight on cards ---------- */
  document.querySelectorAll(".glow-card").forEach(function (card) {
    card.addEventListener("pointermove", function (e) {
      var r = card.getBoundingClientRect();
      card.style.setProperty("--mx", e.clientX - r.left + "px");
      card.style.setProperty("--my", e.clientY - r.top + "px");
    });
  });

  /* ---------- Circuit board canvas ---------- */
  document.querySelectorAll(".hero__canvas").forEach(function (canvas) {
    var ctx = canvas.getContext("2d");
    var host = canvas.parentElement;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W, H, traces, pulses, staticLayer, raf, visible = true;
    var pointer = { x: -9999, y: -9999 };
    var CELL = 26;
    var DIRS = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];

    function build() {
      var rect = host.getBoundingClientRect();
      W = rect.width;
      H = rect.height;
      canvas.width = W * dpr;
      canvas.height = H * dpr;

      var cols = Math.ceil(W / CELL), rows = Math.ceil(H / CELL);
      var used = {};
      var count = Math.round((cols * rows) / 9);
      traces = [];
      for (var i = 0; i < count; i++) {
        var cx = (Math.random() * cols) | 0, cy = (Math.random() * rows) | 0;
        if (used[cx + "," + cy]) continue;
        var dir = (Math.random() * 8) | 0;
        if (dir % 2) dir = (dir + 1) % 8; // start orthogonal
        var pts = [[cx, cy]];
        used[cx + "," + cy] = 1;
        var len = 4 + ((Math.random() * 14) | 0);
        for (var s = 0; s < len; s++) {
          if (Math.random() < 0.28) dir = (dir + (Math.random() < 0.5 ? 1 : 7)) % 8;
          var nx = cx + DIRS[dir][0], ny = cy + DIRS[dir][1];
          if (nx < 0 || ny < 0 || nx > cols || ny > rows || used[nx + "," + ny]) break;
          cx = nx; cy = ny;
          used[cx + "," + cy] = 1;
          pts.push([cx, cy]);
        }
        if (pts.length < 3) continue;
        var px = pts.map(function (p) { return [p[0] * CELL, p[1] * CELL]; });
        var segs = [], total = 0;
        for (var k = 1; k < px.length; k++) {
          var d = Math.hypot(px[k][0] - px[k - 1][0], px[k][1] - px[k - 1][1]);
          segs.push(d);
          total += d;
        }
        traces.push({ pts: px, segs: segs, len: total });
      }

      // Pre-render faint static traces
      staticLayer = document.createElement("canvas");
      staticLayer.width = canvas.width;
      staticLayer.height = canvas.height;
      var sctx = staticLayer.getContext("2d");
      sctx.scale(dpr, dpr);
      sctx.lineCap = "round";
      sctx.lineJoin = "round";
      traces.forEach(function (t) {
        sctx.strokeStyle = "rgba(245,197,66,0.10)";
        sctx.lineWidth = 1.4;
        sctx.beginPath();
        sctx.moveTo(t.pts[0][0], t.pts[0][1]);
        for (var j = 1; j < t.pts.length; j++) sctx.lineTo(t.pts[j][0], t.pts[j][1]);
        sctx.stroke();
        [t.pts[0], t.pts[t.pts.length - 1]].forEach(function (p, idx) {
          sctx.beginPath();
          sctx.arc(p[0], p[1], idx ? 3.2 : 2.2, 0, Math.PI * 2);
          sctx.fillStyle = "rgba(245,197,66,0.16)";
          sctx.fill();
        });
      });

      pulses = [];
      var n = Math.min(26, Math.max(8, traces.length / 8));
      for (var q = 0; q < n; q++) pulses.push(newPulse(true));
    }

    function newPulse(randomStart) {
      var t = traces[(Math.random() * traces.length) | 0];
      return { t: t, d: randomStart ? Math.random() * t.len : 0, v: 1.2 + Math.random() * 2.2, tail: 40 + Math.random() * 70 };
    }

    function pointAt(t, dist) {
      var acc = 0;
      for (var i = 0; i < t.segs.length; i++) {
        if (acc + t.segs[i] >= dist) {
          var f = (dist - acc) / t.segs[i];
          var a = t.pts[i], b = t.pts[i + 1];
          return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
        }
        acc += t.segs[i];
      }
      return t.pts[t.pts.length - 1];
    }

    function drawPulse(p) {
      var head = Math.min(p.d, p.t.len);
      var tail = Math.max(0, p.d - p.tail);
      var steps = 14;
      var hp = pointAt(p.t, head);
      var near = Math.hypot(hp[0] - pointer.x, hp[1] - pointer.y);
      var boost = near < 220 ? 1 + (1 - near / 220) * 1.5 : 1;
      ctx.lineWidth = 2;
      for (var i = 0; i < steps; i++) {
        var d1 = tail + ((head - tail) * i) / steps;
        var d2 = tail + ((head - tail) * (i + 1)) / steps;
        var a = pointAt(p.t, d1), b = pointAt(p.t, d2);
        ctx.strokeStyle = "rgba(255,217,94," + Math.min(1, ((i + 1) / steps) * 0.9 * boost) + ")";
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(hp[0], hp[1], 2.6 * Math.min(boost, 1.8), 0, Math.PI * 2);
      ctx.fillStyle = "#fff3c4";
      ctx.shadowColor = "#f5c542";
      ctx.shadowBlur = 14 * boost;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    function frame() {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(staticLayer, 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineCap = "round";

      // Glow around pointer
      if (pointer.x > -999) {
        var g = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, 200);
        g.addColorStop(0, "rgba(245,197,66,0.10)");
        g.addColorStop(1, "rgba(245,197,66,0)");
        ctx.fillStyle = g;
        ctx.fillRect(pointer.x - 200, pointer.y - 200, 400, 400);
      }

      for (var i = 0; i < pulses.length; i++) {
        var p = pulses[i];
        p.d += p.v;
        if (p.d - p.tail > p.t.len) pulses[i] = p = newPulse(false);
        drawPulse(p);
      }
      if (visible) raf = requestAnimationFrame(frame);
    }

    function start() {
      cancelAnimationFrame(raf);
      build();
      if (reduceMotion) {
        ctx.drawImage(staticLayer, 0, 0);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        pulses.forEach(drawPulse);
      } else {
        raf = requestAnimationFrame(frame);
      }
    }

    host.addEventListener("pointermove", function (e) {
      var r = canvas.getBoundingClientRect();
      pointer.x = e.clientX - r.left;
      pointer.y = e.clientY - r.top;
    });
    host.addEventListener("pointerleave", function () { pointer.x = pointer.y = -9999; });

    if ("IntersectionObserver" in window && !reduceMotion) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible) { cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); }
      }).observe(host);
    }

    var size = host.getBoundingClientRect(), rt;
    window.addEventListener("resize", function () {
      clearTimeout(rt);
      rt = setTimeout(function () {
        // Ignore small height changes from mobile URL bars showing/hiding
        var r = host.getBoundingClientRect();
        if (Math.abs(r.width - size.width) > 2 || Math.abs(r.height - size.height) > 160) {
          size = r;
          start();
        }
      }, 200);
    });
    start();
  });

  /* ---------- Process rail ---------- */
  var process = document.querySelector(".process");
  if (process) {
    var fill = process.querySelector(".process__fill");
    var steps = process.querySelectorAll(".step");
    var updateRail = function () {
      var r = process.getBoundingClientRect();
      var mid = window.innerHeight * 0.6;
      var p = Math.max(0, Math.min(1, (mid - r.top) / r.height));
      fill.style.setProperty("--p", p);
      steps.forEach(function (s) {
        var sr = s.getBoundingClientRect();
        s.classList.toggle("is-lit", sr.top + 32 < mid);
      });
    };
    window.addEventListener("scroll", updateRail, { passive: true });
    window.addEventListener("resize", updateRail);
    updateRail();
  }

  /* ---------- Coverage map ---------- */
  var tabs = document.querySelectorAll(".area-tabs [role=tab]");
  if (tabs.length) {
    var nodes = document.querySelectorAll(".node");
    var selectArea = function (key, focusTab) {
      tabs.forEach(function (t) {
        var on = t.dataset.area === key;
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
        if (on && focusTab) t.focus();
      });
      document.querySelectorAll(".area-panel").forEach(function (p) {
        p.hidden = p.dataset.area !== key;
      });
      nodes.forEach(function (n) { n.classList.toggle("is-active", n.dataset.area === key); });
    };
    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () { selectArea(t.dataset.area); });
      t.addEventListener("keydown", function (e) {
        var dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (!dir) return;
        e.preventDefault();
        selectArea(tabs[(i + dir + tabs.length) % tabs.length].dataset.area, true);
      });
    });
    nodes.forEach(function (n) {
      n.addEventListener("click", function () { selectArea(n.dataset.area); });
      n.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectArea(n.dataset.area); }
      });
    });
  }

  /* ---------- Light switch CTA ---------- */
  document.querySelectorAll(".switch").forEach(function (sw) {
    var cta = sw.closest(".cta");
    sw.addEventListener("click", function () {
      var on = sw.getAttribute("aria-checked") !== "true";
      sw.setAttribute("aria-checked", String(on));
      cta.classList.toggle("is-on", on);
    });
  });

  /* ---------- Project filters ---------- */
  var filterBtns = document.querySelectorAll(".filters button");
  filterBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var f = btn.dataset.filter;
      filterBtns.forEach(function (b) { b.setAttribute("aria-pressed", String(b === btn)); });
      document.querySelectorAll(".project").forEach(function (p) {
        p.hidden = !(f === "all" || p.dataset.cat.split(" ").indexOf(f) > -1);
        if (!p.hidden) p.classList.add("is-in");
      });
    });
  });

  /* ---------- Quote form (sends via WhatsApp or email) ---------- */
  var form = document.getElementById("quoteForm");
  if (form) {
    var validate = function () {
      var firstBad = null;
      form.querySelectorAll("[required]").forEach(function (input) {
        var field = input.closest(".field");
        var ok = input.value.trim() !== "" && input.checkValidity();
        field.classList.toggle("has-error", !ok);
        input.setAttribute("aria-invalid", String(!ok));
        if (!ok && !firstBad) firstBad = input;
      });
      var email = form.elements.email;
      if (email.value.trim() && !email.checkValidity()) {
        email.closest(".field").classList.add("has-error");
        if (!firstBad) firstBad = email;
      }
      if (firstBad) firstBad.focus();
      return !firstBad;
    };

    form.querySelectorAll("input, select, textarea").forEach(function (el) {
      el.addEventListener("input", function () {
        var field = el.closest(".field");
        if (field.classList.contains("has-error") && el.value.trim() && el.checkValidity()) {
          field.classList.remove("has-error");
          el.removeAttribute("aria-invalid");
        }
      });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!validate()) return;
      var v = function (name) { return form.elements[name].value.trim(); };
      var lines = [
        "Hi D O'Brien Electrical, I'd like a free quote.",
        "",
        "Name: " + v("firstName") + " " + v("lastName"),
        "Phone: " + v("phone"),
        v("email") ? "Email: " + v("email") : null,
        "Address: " + v("address"),
        "Service: " + v("service"),
        "",
        v("message")
      ].filter(function (l) { return l !== null; });
      var body = lines.join("\n");
      var via = (e.submitter && e.submitter.value) || "whatsapp";
      if (via === "email") {
        window.location.href = "mailto:" + EMAIL +
          "?subject=" + encodeURIComponent("Quote request: " + v("service") + " (" + v("firstName") + " " + v("lastName") + ")") +
          "&body=" + encodeURIComponent(body);
      } else {
        window.open("https://wa.me/" + PHONE_WA + "?text=" + encodeURIComponent(body), "_blank", "noopener");
      }
    });

    // Pre-select service from ?service= links
    var pre = new URLSearchParams(window.location.search).get("service");
    if (pre) {
      Array.prototype.forEach.call(form.elements.service.options, function (o) {
        if (o.value === pre) o.selected = true;
      });
    }
  }

  /* ---------- Year ---------- */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();
