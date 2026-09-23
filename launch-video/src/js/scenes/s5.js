/* ============ S5 CODEX 38.0-44.4 ============ */
SCENES.push(() => {
  const T = 38.0;
  const camEl = $("#s5cam"), stage = $("#s5stage");
  const cam = makeCam(camEl);
  const P = (sel) => offsetIn($(sel), camEl);
  tl.set(BG.state, { pal: 1, lum: 1 }, T);

  // label sits centred above the heading
  const pill = $("#s5pill");
  pill.style.left = (1920 - pill.offsetWidth) / 2 + "px"; pill.style.top = "300px";

  /* arrive out of the white flash */
  tl.fromTo("#s5h", { opacity: 0, y: 18, filter: "blur(14px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.9, ease: "expo.out" }, T + 0.05);
  tl.fromTo("#s5comp", { opacity: 0, y: 26, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 0.9, ease: "expo.out" }, T + 0.18);
  tl.fromTo(pill, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }, T + 0.32);
  tl.fromTo(stage, { scale: 1.06 }, { scale: 1, duration: 1.2, ease: "expo.out", transformOrigin: "50% 50%" }, T);

  /* type, then cycle the deliverable */
  tl.fromTo("#s5caret", { opacity: 0 }, { opacity: 1, duration: 0.01 }, T + 0.7);
  const a = $("#s5a"), w = $("#s5w");
  const tA = typeText(a, "Turn my notes into a ", T + 0.74, 30);
  typeText(w, "launch plan", tA, 30);
  const comp = P("#s5comp");
  camTo(cam, { cx: comp.x + 520, cy: comp.cy + 8, z: 1.75 }, T + 0.95, 0.9, "power3.inOut");
  function swap(word, prev, t) {
    tl.to(w, { opacity: 0, y: -10, filter: "blur(6px)", duration: 0.16, ease: "power2.in" }, t);
    setText(w, word, t + 0.17, prev);
    tl.fromTo(w, { opacity: 0, y: 10, filter: "blur(6px)", color: "#c9c2ff" },
      { opacity: 1, y: 0, filter: "blur(0px)", color: "#ffffff", duration: 0.5, ease: "expo.out", immediateRender: false }, t + 0.17);
  }
  swap("case study", "launch plan", T + 2.1);
  swap("lead magnet", "case study", T + 2.7);

  /* pan to send, giant push, click with glow */
  const send = P("#s5send");
  const cur = makeCursor(camEl, send.cx + 180, send.cy + 170, 30);
  cursorShow(cur, T + 3.0, 0.2);
  cursorTo(cur, send.cx + 6, send.cy + 8, T + 3.02, 0.62, "power3.out");
  camTo(cam, { cx: send.cx - 30, cy: send.cy + 14, z: 3.9 }, T + 3.2, 0.62, "power3.inOut");
  clickAt(cur, T + 3.8, camEl, send.cx, send.cy, "rgba(255,255,255,.8)");
  press($("#s5send"), T + 3.8, 0.9);
  tl.to("#s5send", { backgroundColor: "#cfe0ff", boxShadow: "0 0 0 8px rgba(190,210,255,.35), 0 0 50px 16px rgba(170,195,255,.55)", duration: 0.2, ease: "power2.out" }, T + 3.82);
  flash(T + 4.1, 1, 0.2, 0.5);

  /* tasks run side by side */
  tl.to(stage, { opacity: 0, duration: 0.01 }, T + 4.1);
  tl.to("#s5tasks", { opacity: 1, duration: 0.01 }, T + 4.1);
  tl.fromTo("#s5th", { opacity: 0, y: 16, filter: "blur(10px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.8, ease: "expo.out" }, T + 4.12);
  $$("#s5tasks .cxtask").forEach((r, i) => {
    const t0 = T + 4.25 + i * 0.1;
    tl.fromTo(r, { opacity: 0, y: 30, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: "expo.out" }, t0);
    tl.to($(".cxprog i", r), { scaleX: 1, duration: 0.8 + i * 0.25, ease: "power2.inOut" }, t0 + 0.2);
    const done = t0 + 1.05 + i * 0.25;
    tl.to($(".cxprog", r), { opacity: 0, duration: 0.15 }, done);
    tl.fromTo($(".cxok", r), { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.45, ease: "expo.out" }, done + 0.05);
  });

  /* hand over to the phone: tasks slide back and soften */
  tl.to("#s5tasks", { x: -260, scale: 0.9, filter: "blur(8px)", opacity: 0, duration: 0.6, ease: "power3.in", transformOrigin: "30% 50%" }, T + 5.75);
  tl.to(BG.state, { pal: 2, duration: 1.2, ease: "sine.inOut" }, T + 5.7);
});
