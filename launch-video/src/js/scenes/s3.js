/* ============ S3 INSTALL 10.0-19.5 / S4 OUTCOMES 19.5-34.0 ============ */
SCENES.push(() => {
  const camEl = $("#s3cam"), stage = $("#s3stage"), win = $("#cgwin");
  const cam = makeCam(camEl, { z: 0.8, rx: 16, ry: -12 });
  const P = (sel) => offsetIn(typeof sel === "string" ? $(sel) : sel, camEl);
  const toast = $("#toast");
  toast.style.left = (1520 - toast.offsetWidth) / 2 + "px";

  /* ---------- 10.0 window arrives tilted, settles flat ---------- */
  tl.fromTo(win, { opacity: 0, filter: "blur(18px)" }, { opacity: 1, filter: "blur(0px)", duration: 0.8, ease: "expo.out" }, 10.0);
  camTo(cam, { z: 0.97, rx: 0, ry: 0 }, 10.0, 1.35, "expo.out");
  flash(10.02, 0.8, 0.1, 0.5);

  const cur = makeCursor(camEl, 1260, 860, 30);
  cursorShow(cur, 10.85, 0.25);

  /* ---------- 11.0 open Plugins ---------- */
  const np = P("#navPlugins");
  cursorTo(cur, np.x + 44, np.cy + 2, 10.95, 0.78);
  camTo(cam, { cx: 840, cy: 440, z: 1.32 }, 10.95, 1.0);
  clickAt(cur, 11.76, camEl, np.x + 44, np.cy, "rgba(13,13,13,.25)");
  tl.to("#navPlugins", { backgroundColor: "#ececec", duration: 0.15 }, 11.78);
  tl.to("#vHome", { opacity: 0, duration: 0.18, ease: "power1.in" }, 11.82);
  tl.fromTo("#vPlugins", { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }, 11.9);

  /* ---------- 12.5 search "Operator" ---------- */
  const ps = P("#psearch");
  cursorTo(cur, ps.x + 150, ps.cy + 6, 12.02, 0.5);
  camTo(cam, { cx: ps.x + 400, cy: ps.cy + 150, z: 1.68 }, 12.08, 0.85);
  clickAt(cur, 12.54, camEl, ps.x + 150, ps.cy, "rgba(13,13,13,.2)");
  tl.fromTo("#pscaret", { opacity: 0 }, { opacity: 1, duration: 0.01 }, 12.58);
  tl.to("#psph", { opacity: 0, duration: 0.01 }, 12.64);
  typeText($("#pstype"), "Operator", 12.64, 14);
  tl.to("#pgrid", { opacity: 0, y: 10, duration: 0.25, ease: "power2.in" }, 12.95);
  tl.fromTo("#presults", { opacity: 0 }, { opacity: 1, duration: 0.2 }, 13.12);
  tl.fromTo("#presult", { opacity: 0, y: 18, scale: 0.98 }, { opacity: 1, y: 0, scale: 1, duration: 0.55, ease: "expo.out" }, 13.12);

  /* ---------- 13.8 open the plugin page ---------- */
  const pr = P("#presult");
  cursorTo(cur, pr.x + 280, pr.cy + 8, 13.3, 0.45);
  clickAt(cur, 13.78, camEl, pr.x + 280, pr.cy, "rgba(13,13,13,.2)");
  press($("#presult"), 13.78, 0.985);
  tl.to("#pdim", { opacity: 1, duration: 0.35, ease: "power2.out" }, 13.88);
  tl.fromTo("#pmodal", { opacity: 0, y: 34, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: "expo.out" }, 13.9);
  camTo(cam, { cx: 960, cy: 532, z: 1.24 }, 13.86, 0.7);

  /* ---------- 15.0 giant push onto Install, click ---------- */
  const pi = P("#pinstall");
  cursorTo(cur, pi.cx + 6, pi.cy + 6, 14.45, 0.55);
  camTo(cam, { cx: pi.cx + 8, cy: pi.cy + 22, z: 4.3 }, 15.0, 0.72, "power3.inOut");
  clickAt(cur, 15.75, camEl, pi.cx, pi.cy, "rgba(97,85,243,.55)");
  press($("#pinstall"), 15.75, 0.92);
  tl.fromTo("#pinstall", { boxShadow: "0 0 0 0px rgba(97,85,243,0), 0 0 0px 0px rgba(97,85,243,0)" },
    { boxShadow: "0 0 0 7px rgba(97,85,243,.22), 0 0 34px 10px rgba(97,85,243,.38)", duration: 0.18, ease: "power2.out" }, 15.77);
  tl.to("#pinstall", { boxShadow: "0 0 0 0px rgba(97,85,243,0), 0 0 0px 0px rgba(97,85,243,0)", duration: 0.7, ease: "power2.out" }, 16.0);
  tl.to("#pinLab", { opacity: 0, duration: 0.12 }, 15.82);
  tl.fromTo("#pinSpin", { opacity: 0 }, { opacity: 1, duration: 0.12 }, 15.86);
  tl.fromTo("#pinSpin", { rotation: 0 }, { rotation: 760, duration: 0.62, ease: "none", immediateRender: false }, 15.86);
  tl.to("#pinSpin", { opacity: 0, duration: 0.1 }, 16.4);
  tl.to("#pinstall", { backgroundColor: "#f0f0f0", duration: 0.3, ease: "power2.out" }, 16.4);
  tl.fromTo("#pinDone", { opacity: 0, scale: 0.82 }, { opacity: 1, scale: 1, duration: 0.45, ease: "expo.out" }, 16.44);

  /* ---------- 16.5 pull back: toast + sidebar entry ---------- */
  camTo(cam, { cx: 960, cy: 540, z: 1.0 }, 16.52, 0.85, "power3.inOut");
  tl.fromTo(toast, { opacity: 0, y: -18 }, { opacity: 1, y: 0, duration: 0.5, ease: "expo.out" }, 16.8);
  tl.to("#navOPwrap", { height: 38, duration: 0.45, ease: "power3.inOut" }, 16.9);
  tl.fromTo("#navOP", { opacity: 0, x: -12 }, { opacity: 1, x: 0, duration: 0.45, ease: "power3.out" }, 17.0);
  tl.to("#navPlugins", { backgroundColor: "rgba(236,236,236,0)", duration: 0.2 }, 17.0);
  tl.to("#pmodal", { opacity: 0, scale: 0.98, duration: 0.25, ease: "power2.in" }, 17.28);
  tl.to("#pdim", { opacity: 0, duration: 0.3 }, 17.3);

  /* ---------- 17.6 new chat with the plugin ---------- */
  const no = P("#navOP");
  cursorTo(cur, no.x + 70, no.cy + 4, 17.02, 0.56);
  clickAt(cur, 17.6, camEl, no.x + 70, no.cy, "rgba(13,13,13,.2)");
  tl.to("#navOP", { backgroundColor: "#ececec", duration: 0.15 }, 17.62);
  tl.to("#vPlugins", { opacity: 0, duration: 0.2 }, 17.64);
  tl.to("#vHome", { opacity: 1, duration: 0.35, ease: "power2.out" }, 17.7);
  tl.fromTo("#homechip", { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.5, ease: "expo.out" }, 17.82);
  tl.to(toast, { opacity: 0, y: -10, duration: 0.3, ease: "power2.in" }, 17.9);
  const hc = P("#homecomp");
  camTo(cam, { cx: hc.cx, cy: hc.cy + 24, z: 1.58 }, 17.66, 0.75);

  /* attachment + prompt */
  tl.to("#attWrap", { height: 70, duration: 0.42, ease: "power3.out" }, 18.0);
  tl.fromTo("#attWrap .att", { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.45, ease: "expo.out" }, 18.02);
  camTo(cam, { cy: hc.cy + 58 }, 18.0, 0.5, "power2.inOut");
  tl.to("#homeph", { opacity: 0, duration: 0.01 }, 18.3);
  tl.fromTo("#homecaret", { opacity: 0 }, { opacity: 1, duration: 0.01 }, 18.3);
  tl.to("#homesendW", { opacity: 0, duration: 0.12 }, 18.34);
  tl.to("#homesendU", { opacity: 1, duration: 0.12 }, 18.36);
  typeText($("#hometype"), "Find the decision buried in this call.", 18.32, 40);
  cursorHide(cur, 18.3, 0.2);
  const hs = P("#homesend");
  tl.set(cur, { x: hs.cx + 60, y: hs.cy + 50 }, 18.6);
  cursorShow(cur, 18.9, 0.2);
  cursorTo(cur, hs.cx + 4, hs.cy + 4, 18.95, 0.42);
  clickAt(cur, 19.38);
  press($("#homesend"), 19.38, 0.88);
  cursorHide(cur, 19.5, 0.15);

  /* ---------- 19.45 conversation view (S4) ---------- */
  tl.to("#vHome", { opacity: 0, duration: 0.15, ease: "power1.in" }, 19.44);
  tl.fromTo("#vChat", { opacity: 0 }, { opacity: 1, duration: 0.22 }, 19.46);
  camTo(cam, { cx: 897, cy: 498, z: 1.5 }, 19.42, 0.72, "power3.inOut");
  tl.to("#cgside", { filter: "blur(5px)", duration: 0.5, ease: "power2.out" }, 19.46);
  tl.to("#s4scrim", { opacity: 1, duration: 0.5, ease: "power2.out" }, 19.5);

  const thread = $("#thread");
  const exs = $$(".ex", thread);
  const V = [19.5, 23.2, 26.8, 30.4];

  function headIn(h, t) {
    tl.fromTo($(".s4lab", h), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }, t);
    wordsIn($$(".w", h), t + 0.1, { stagger: 0.055, dur: 0.8, blur: 10, y: 20 });
  }
  function headOut(h, t) {
    const ws = $$(".w", h);
    ws.forEach((w, i) => {
      tl.to(w, { y: -44, duration: 0.34, ease: "power4.in" }, t + i * 0.022);
      tl.to(w, { opacity: 0, duration: 0.2, ease: "power1.in" }, t + i * 0.022);
    });
    tl.to($(".s4lab", h), { opacity: 0, y: -16, duration: 0.3, ease: "power3.in" }, t);
  }
  function exchangeIn(i, t, dTool = 0.4, dW = 0.8) {
    const ex = exs[i];
    tl.fromTo($(".umsg", ex), { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.55, ease: "power3.out" }, t);
    const line = $(".tool-line", ex);
    tl.fromTo(line, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.45, ease: "power3.out" }, t + dTool);
    tl.fromTo($(".shim", line), { backgroundPosition: "100% 0%" }, { backgroundPosition: "0% 0%", duration: 0.9, ease: "none" }, t + dTool);
    tl.fromTo($(".wdg", ex), { opacity: 0, y: 26, scale: 0.985 }, { opacity: 1, y: 0, scale: 1, duration: 0.65, ease: "expo.out" }, t + dW);
  }
  function scrollTo(i, t) {
    tl.to(thread, { y: -exs[i].offsetTop, duration: 0.6, ease: "power3.inOut" }, t);
    tl.set(stage, { filter: "url(#mby)" }, t);
    tl.to("#mbyg", { attr: { stdDeviation: "0 14" }, duration: 0.28, ease: "power2.in" }, t + 0.02);
    tl.to("#mbyg", { attr: { stdDeviation: "0 0" }, duration: 0.28, ease: "power2.out" }, t + 0.3);
    tl.set(stage, { filter: "none" }, t + 0.6);
  }
  // hide later exchanges until they're sent
  exs.slice(1).forEach((ex) => tl.set($$(".umsg, .tool-line, .wdg", ex), { opacity: 0 }, 0));

  /* V1 Meeting Miner */
  exchangeIn(0, 19.48, 0.22, 0.5);
  headIn($("#h1"), 19.78);
  $$("#w1 .drow").forEach((r, i) => tl.fromTo(r, { opacity: 0, x: -14 }, { opacity: 1, x: 0, duration: 0.5, ease: "power3.out" }, 20.3 + i * 0.16));
  tl.fromTo("#w1 .missed", { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.55, ease: "power3.out" }, 20.95);
  $$("#w1 .tag").forEach((r, i) => tl.fromTo(r, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.4, ease: "expo.out" }, 21.3 + i * 0.07));
  camTo(cam, { cy: 508, z: 1.54 }, 20.3, 0.9, "power2.out");

  /* V2 Content Repurposing */
  headOut($("#h1"), 23.02);
  scrollTo(1, 23.12);
  camTo(cam, { cy: 498, z: 1.5 }, 23.12, 0.6, "power3.inOut");
  exchangeIn(1, 23.3);
  headIn($("#h2"), 23.42);
  $$("#w2 .post").forEach((r, i) => tl.fromTo(r, { opacity: 0, y: 22, scale: 0.95 }, { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: "expo.out" }, 24.28 + i * 0.12));
  $$("#w2 .week span").forEach((r, i) =>
    tl.fromTo(r, { opacity: 0, backgroundColor: "#ffffff" }, { opacity: 1, backgroundColor: "#f5f3ff", duration: 0.35, ease: "power2.out" }, 24.9 + i * 0.05));
  camTo(cam, { cy: 506, z: 1.55 }, 24.0, 0.9, "power2.out");

  /* V3 LLM Council */
  headOut($("#h2"), 26.62);
  scrollTo(2, 26.72);
  camTo(cam, { cy: 498, z: 1.5 }, 26.72, 0.6, "power3.inOut");
  exchangeIn(2, 26.9);
  headIn($("#h3"), 27.02);
  $$("#w3 .adv").forEach((r, i) => {
    tl.fromTo(r, { opacity: 0, x: -14 }, { opacity: 1, x: 0, duration: 0.5, ease: "power3.out" }, 27.82 + i * 0.17);
    tl.fromTo($("em", r), { scale: 0.7, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: "expo.out" }, 27.98 + i * 0.17);
  });
  tl.fromTo("#w3 .verdict", { opacity: 0, y: 14, scale: 0.98 }, { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: "expo.out" }, 28.75);
  camTo(cam, { cy: 506, z: 1.55 }, 27.6, 1.0, "power2.out");

  /* V4 Customer Insight Synthesizer */
  headOut($("#h3"), 30.22);
  scrollTo(3, 30.32);
  camTo(cam, { cy: 498, z: 1.5 }, 30.32, 0.6, "power3.inOut");
  exchangeIn(3, 30.5);
  headIn($("#h4"), 30.62);
  $$("#w4 .pat").forEach((r, i) => {
    tl.fromTo(r, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }, 31.35 + i * 0.28);
    tl.fromTo($(".bar i", r), { scaleX: 0 }, { scaleX: 1, duration: 0.8, ease: "power3.out" }, 31.45 + i * 0.28);
  });
  camTo(cam, { cy: 506, z: 1.55 }, 31.1, 1.0, "power2.out");

  /* 33.58 zoom-through into the montage */
  tl.to([stage, "#s4ov"], { scale: 1.16, filter: "blur(16px)", duration: 0.42, ease: "power3.in", transformOrigin: "50% 50%" }, 33.58);
  tl.to([stage, "#s4ov"], { opacity: 0, duration: 0.4, ease: "none" }, 33.6);
});
