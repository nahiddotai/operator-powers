/* ============ S7 PROMISE 50.0-54.0 / S8 END 54.0-58.5 ============ */
SCENES.push(() => {
  const T = 50.0;
  const tw = $("#s7tw"), tx = $("#s7t"), mark = $("#s7mark"), msvg = $("#s7mark svg");
  const W1 = tx.offsetWidth;
  tx.textContent = "No prompts to memorize.";
  const W2 = tx.offsetWidth;
  tx.textContent = "No code to write.";

  /* mark arrives with ripples */
  tl.fromTo(msvg, { opacity: 0, scale: 0.15 }, { opacity: 1, scale: 0.3077, duration: 0.7, ease: "expo.out" }, T + 0.02);
  $$(".s7ring").forEach((r, i) => {
    tl.set(r, { scale: 0.4, opacity: 0.9 }, T + 0.08 + i * 0.2);
    tl.to(r, { scale: 3.2, opacity: 0, duration: 1.5, ease: "power2.out" }, T + 0.081 + i * 0.2);
  });

  /* the mark drags the line out behind it, then swallows it back.
     v = revealed width; group (text + mark) stays centred. */
  const R = { v: 0, W: W1 };
  const applyR = () => {
    const v = Math.max(0, R.v), left = 960 - (v + 64) / 2;
    tw.style.transform = `translateX(${left.toFixed(2)}px)`;
    const m = `linear-gradient(90deg, #000 ${Math.max(0, v - 70).toFixed(1)}px, transparent ${v.toFixed(1)}px)`;
    tw.style.webkitMaskImage = m; tw.style.maskImage = m;
    mark.style.transform = `translateX(${(left + v).toFixed(2)}px)`;
  };
  applyR();
  tl.to(R, { v: W1, duration: 0.85, ease: "power3.out", onUpdate: applyR }, T + 0.5);
  tl.fromTo(tx, { color: ACC_SOFT }, { color: INK, duration: 0.9, ease: "sine.out" }, T + 0.5);
  tl.to(R, { v: 0, duration: 0.5, ease: "power3.in", onUpdate: applyR }, T + 1.72);
  tl.to(tx, { filter: "blur(8px)", opacity: 0.2, duration: 0.45, ease: "power2.in" }, T + 1.74);
  setText(tx, "No prompts to memorize.", T + 2.26, "No code to write.");
  tl.to(tx, { filter: "blur(0px)", opacity: 1, duration: 0.01 }, T + 2.27);
  tl.to(R, { v: W2, duration: 0.95, ease: "power3.out", onUpdate: applyR }, T + 2.3);
  tl.fromTo(tx, { color: ACC_SOFT }, { color: INK, duration: 0.9, ease: "sine.out", immediateRender: false }, T + 2.3);
  tl.to(R, { v: 0, duration: 0.45, ease: "power3.in", onUpdate: applyR }, T + 3.12);
  tl.to(tx, { filter: "blur(8px)", opacity: 0.2, duration: 0.4, ease: "power2.in" }, T + 3.14);

  /* the mark grows into the end-card icon (centre 960,396 at 208px) */
  tl.to(msvg, { scale: 1, y: -144, duration: 0.5, ease: "power3.inOut" }, T + 3.5);

  /* S8 end card */
  const E = 54.0;
  tl.fromTo("#s8glow", { opacity: 0 }, { opacity: 1, duration: 1.4, ease: "sine.out" }, E);
  tl.fromTo("#s8word", { opacity: 0, y: 22, filter: "blur(10px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 1.1, ease: "power3.out" }, E + 0.3);
  tl.fromTo("#s8now", { opacity: 0, y: 16, filter: "blur(8px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 1.0, ease: "power3.out" }, E + 1.0);
});
