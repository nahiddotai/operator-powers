/* ============ S2 PRODUCT 6.0-10.0 ============ */
SCENES.push(() => {
  const T = 6.0;
  const wrap = $("#s2wrap"), tile = $("#s2tile");
  tl.fromTo(tile, { scale: 0.7, opacity: 0, filter: "blur(16px)" }, { scale: 1, opacity: 1, filter: "blur(0px)", duration: 1.05, ease: "expo.out" }, T + 0.02);
  tl.fromTo("#s2O", { strokeDashoffset: 836 }, { strokeDashoffset: 0, duration: 0.85, ease: "power2.inOut" }, T + 0.28);
  tl.fromTo("#s2P", { strokeDashoffset: 780 }, { strokeDashoffset: 0, duration: 0.8, ease: "power2.inOut" }, T + 0.55);
  $$(".s2ring").forEach((r, i) => {
    tl.set(r, { scale: 1, opacity: 0.95 }, T + 0.12 + i * 0.24);
    tl.to(r, { scale: 3.6, opacity: 0, duration: 1.7, ease: "power2.out" }, T + 0.121 + i * 0.24);
  });
  wordsIn($$("#s2word .w"), T + 0.85, { stagger: 0.16, dur: 0.95, y: 22 });
  tl.fromTo("#s2subA", { opacity: 0, y: 20, filter: "blur(8px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.85, ease: "power3.out" }, T + 1.4);
  // subline cycles (cut-the-curve upward)
  tl.to("#s2subA", { y: -40, duration: 0.32, ease: "power4.in" }, T + 2.3);
  tl.to("#s2subA", { opacity: 0, duration: 0.2, ease: "power1.in" }, T + 2.3);
  tl.fromTo("#s2subB", { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: "power4.out" }, T + 2.62);
  // zoom-through exit
  tl.to(wrap, { scale: 1.24, filter: "blur(18px)", duration: 0.42, ease: "power3.in" }, T + 3.56);
  tl.to(wrap, { opacity: 0, duration: 0.42, ease: "none" }, T + 3.56);
});
