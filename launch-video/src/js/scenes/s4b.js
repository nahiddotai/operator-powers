/* ============ S4b MONTAGE 34.0-38.0 ============ */
SCENES.push(() => {
  const T = 34.0;
  flash(T, 0.7, 0.14, 0.45);
  const world = $("#mtworld");
  const cards = $$(".mc", world);
  // x, y, z (px). Near cards keep clear of the centre headline.
  const L = [
    [-660, -250, -250], [650, -270, -560], [-720, 270, -820], [700, 260, -300],
    [-200, -400, -1250], [280, 400, -1050], [-1020, -30, -1450], [1010, 10, -1200],
    [140, -440, -1750], [-440, 430, -1650], [560, -40, -2050], [-600, -60, -2250],
  ];
  cards.forEach((c, i) => { c.style.transform = `translate3d(${L[i][0]}px,${L[i][1]}px,${L[i][2]}px)`; });
  const FOCAL = -420;
  const ease = gsap.parseEase("power1.inOut");
  function frame(t) {
    const p = clamp01((t - T) / 4);
    const d = 1150 * ease(p);
    const ry = lerp(-9, 7, p), rx = lerp(5, -3, p);
    world.style.transform = `translateZ(${d.toFixed(2)}px) rotateY(${ry.toFixed(3)}deg) rotateX(${rx.toFixed(3)}deg)`;
    cards.forEach((c, i) => {
      const ze = L[i][2] + d;
      const ent = clamp01((t - (T + 0.02 + i * 0.035)) / 0.55);
      const near = 1 - clamp01((ze - 520) / 260);
      c.style.opacity = (ent * ent * (3 - 2 * ent) * near).toFixed(3);
      const b = Math.min(12, Math.abs(ze - FOCAL) / 105);
      c.style.filter = `blur(${b.toFixed(2)}px)`;
    });
  }
  frame(T);
  tick(T, T + 4, (t) => frame(t));

  /* "28 powers." counts up, then "One install." */
  const A = $("#mtA"), B = $("#mtB"), N = $("#mtN");
  tl.fromTo(A, { opacity: 0, scale: 0.9, filter: "blur(12px)" }, { opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.8, ease: "expo.out" }, T + 0.28);
  const cnt = gsap.parseEase("power2.out");
  tick(T + 0.28, T + 1.3, (t) => { N.textContent = String(Math.round(1 + 27 * cnt(clamp01((t - T - 0.28) / 1.0)))); });
  tl.to(A, { scale: 1.2, filter: "blur(10px)", duration: 0.22, ease: "power3.in" }, T + 2.0);
  tl.to(A, { opacity: 0, duration: 0.22, ease: "none" }, T + 2.0);
  tl.fromTo(B, { opacity: 0, scale: 0.75, filter: "blur(10px)" }, { opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.6, ease: "expo.out" }, T + 2.22);

  /* exit: push through into Codex */
  tl.to(["#mtstage", "#mtov"], { scale: 1.25, filter: "blur(18px)", duration: 0.45, ease: "power3.in", transformOrigin: "50% 50%" }, T + 3.55);
  flash(T + 4.0, 1, 0.32, 0.55);
});
