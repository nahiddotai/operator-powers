/* ============ S1 HOOK 0.0-6.0 ============ */
SCENES.push(() => {
  const camEl = $("#s1cam"), stage = $("#s1stage");
  const cam = makeCam(camEl);
  const words = $$("#s1line > .w");
  const job = $("#s1job"), micwrap = $("#s1micwrap"), pill = $("#s1pill"), mic = $("#s1mic");
  const barsBox = $("#s1bars");
  const NB = 46;
  for (let i = 0; i < NB; i++) barsBox.appendChild(document.createElement("i"));
  const bars = $$("i", barsBox);

  // Resolve the final layout "Just describe [mic]" once, then drive the
  // re-centre with transforms (sub-pixel smooth) instead of layout tweens.
  const w0 = offsetIn(words[0], camEl), w1 = offsetIn(words[1], camEl), m0 = offsetIn(micwrap, camEl);
  job.style.display = "none"; micwrap.style.width = "96px";
  const f0 = offsetIn(words[0], camEl), f1 = offsetIn(words[1], camEl);
  const M = offsetIn(mic, camEl);
  const fm = offsetIn(micwrap, camEl);
  job.style.display = ""; micwrap.style.width = "0px";
  gsap.set(micwrap, { x: fm.x - m0.x });

  // giant "Your AI" sits to the right of the voice pill in world space
  const YA = $("#s1yourai");
  YA.style.left = M.x + 760 + 170 + "px";
  YA.style.top = M.cy - YA.offsetHeight / 2 + 4 + "px";
  const Y = offsetIn(YA, camEl);

  /* 0.2 words assemble */
  wordsIn(words.slice(0, 3), 0.2, { stagger: [0, 0.26, 0.52], dur: 0.95 });

  /* 1.25 "the job" dissolves, mic takes its place, line re-centres */
  tl.to(job, { opacity: 0, filter: "blur(10px)", scale: 0.9, duration: 0.34, ease: "power2.in" }, 1.22);
  tl.to(words[0], { x: f0.x - w0.x, duration: 0.6, ease: "power3.inOut" }, 1.28);
  tl.to(words[1], { x: f1.x - w1.x, duration: 0.6, ease: "power3.inOut" }, 1.28);
  tl.to(job, { x: f1.x - w1.x, duration: 0.6, ease: "power3.inOut" }, 1.28);
  tl.fromTo(pill, { scale: 0.3, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.75, ease: "expo.out" }, 1.42);

  /* cursor glides in and clicks the mic */
  const cur = makeCursor(camEl, M.cx + 360, M.cy + 250, 36);
  cursorShow(cur, 1.4, 0.2);
  cursorTo(cur, M.cx + 8, M.cy + 12, 1.42, 0.58, "power3.out");
  clickAt(cur, 2.0, camEl, M.cx, M.cy, "rgba(97,85,243,.45)");
  tl.to(mic, { backgroundColor: "#ecebfe", color: ACC, duration: 0.25, ease: "power2.out" }, 2.02);
  press(pill, 2.0, 0.93);
  tl.set(pill, { transformOrigin: "48px 48px" }, 0);

  /* 2.05 slam in on the voice pill */
  const ZC = { cx: M.cx + 150, cy: M.cy + 34, z: 3.4 };
  camTo(cam, ZC, 2.05, 0.82, "power3.inOut");
  tl.to(pill, { width: 760, duration: 0.85, ease: "power3.out" }, 2.16);
  cursorTo(cur, M.cx + 30, M.cy + 58, 2.2, 0.9, "power2.inOut");
  bars.forEach((b, i) => tl.fromTo(b, { opacity: 0 }, { opacity: 1 - (i / NB) * 0.6, duration: 0.3, ease: "power1.out" }, 2.28 + i * 0.012));
  tick(2.2, 4.06, (t) => {
    for (let i = 0; i < NB; i++) {
      const a = Math.abs(Math.sin(t * 7.1 + i * 0.73)) * 0.6 + Math.abs(Math.sin(t * 3.3 + i * 1.91)) * 0.4;
      const env = 0.3 + 0.7 * Math.abs(Math.sin(i * 0.31 + t * 1.4));
      bars[i].style.height = (8 + 56 * a * env).toFixed(1) + "px";
    }
  });

  /* transcript tooltip (screen space; tracks the pan) */
  const tip = $("#s1tip"), tipt = $("#s1tipt");
  const pillBottom = 540 - 34 * 3.4 + 48 * 3.4; // screen y of pill bottom after zoom
  gsap.set(tip, { left: 318, top: pillBottom + 70 });
  tl.fromTo(tip, { opacity: 0, y: 14, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: "power3.out" }, 2.5);
  typeText(tipt, "There's a decision buried in this call. Find it.", 2.56, 52);

  /* 3.05 whip pan onto "Your AI" */
  const panDx = (Y.cx - ZC.cx) * 3.4;
  camTo(cam, { cx: Y.cx, cy: M.cy + 6 }, 3.05, 0.62, "power3.inOut");
  tl.to(tip, { x: -panDx, duration: 0.62, ease: "power3.inOut" }, 3.05);
  tl.set(stage, { filter: "url(#mbx)" }, 3.05);
  tl.to("#mbxg", { attr: { stdDeviation: "26 0" }, duration: 0.3, ease: "power2.in" }, 3.05);
  tl.to("#mbxg", { attr: { stdDeviation: "0 0" }, duration: 0.3, ease: "power2.out" }, 3.36);
  tl.set(stage, { filter: "none" }, 3.68);
  tl.fromTo(YA, { opacity: 0 }, { opacity: 1, duration: 0.2 }, 2.9);
  tl.fromTo(YA, { backgroundPosition: "100% 0%" }, { backgroundPosition: "0% 0%", duration: 1.0, ease: "power2.inOut" }, 3.3);

  /* 4.05 cut: "finishes it." arrives oversized */
  tl.to([stage, "#s1ov"], { opacity: 0, duration: 0.001 }, 4.05);
  const fin = $("#s1fin");
  tl.fromTo(fin, { scale: 1.32, opacity: 0, filter: "blur(10px)" }, { scale: 1, opacity: 1, filter: "blur(0px)", duration: 0.7, ease: "expo.out" }, 4.05);
  $$("#s1fin .w").forEach((w, i) =>
    tl.fromTo(w, { color: ACC_SOFT }, { color: w.dataset.c || INK, duration: 1.0, ease: "sine.out" }, 4.05 + i * 0.14));

  /* 5.52 forward zoom-blur exit */
  tl.to(fin, { scale: 1.38, filter: "blur(16px)", duration: 0.46, ease: "power3.in" }, 5.52);
  tl.to(fin, { opacity: 0, duration: 0.44, ease: "none" }, 5.54);
});
