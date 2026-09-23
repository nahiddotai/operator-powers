/* ============ S6 IPHONE 43.8-50.0 ============ */
SCENES.push(() => {
  const T = 43.8;
  const phone = $("#phone");
  const waveBox = $("#pwave");
  for (let i = 0; i < 34; i++) waveBox.appendChild(document.createElement("i"));
  const wv = $$("i", waveBox);

  /* layered: blurred desktop behind, phone rises in front */
  tl.fromTo("#s6back", { opacity: 0, x: -60, scale: 0.94 }, { opacity: 0.7, x: 0, scale: 0.9, duration: 1.2, ease: "expo.out", transformOrigin: "30% 50%" }, T + 0.1);
  tl.fromTo(phone, { y: 980, rotationX: 26, rotationY: -26, rotationZ: 4, scale: 1.0 },
    { y: 0, rotationX: 7, rotationY: -14, rotationZ: 0, scale: 1.04, duration: 1.25, ease: "expo.out" }, T + 0.05);
  tl.to(phone, { rotationX: 2, rotationY: -5, scale: 1.1, duration: 4.4, ease: "sine.inOut" }, T + 1.3);
  tl.fromTo("#s6lab", { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }, T + 0.45);
  wordsIn($$("#s6head .w"), T + 0.55, { stagger: 0.07, dur: 0.85, blur: 10, y: 22 });

  /* hide the conversation until it happens */
  ["#pu", "#ptl", "#pw"].forEach((s) => tl.set(s, { opacity: 0 }, 0));

  /* voice tap, listening, transcript */
  const tT = T + 1.2;
  tl.set("#ptouch", { opacity: 0.9, scale: 0.4 }, tT);
  tl.to("#ptouch", { opacity: 0, scale: 1.8, duration: 0.55, ease: "power2.out" }, tT + 0.001);
  press($("#pvoice"), tT, 0.88);
  tl.to("#pph", { opacity: 0, duration: 0.15 }, tT + 0.1);
  tl.fromTo("#pwave", { opacity: 0 }, { opacity: 1, duration: 0.2 }, tT + 0.15);
  tick(tT + 0.15, tT + 1.2, (t) => {
    for (let i = 0; i < wv.length; i++) {
      const a = Math.abs(Math.sin(t * 9.1 + i * 0.6)) * 0.6 + Math.abs(Math.sin(t * 4.3 + i * 1.7)) * 0.4;
      wv[i].style.height = (4 + 26 * a * (0.35 + 0.65 * Math.abs(Math.sin(i * 0.25 + t * 2)))).toFixed(1) + "px";
    }
  });
  tl.to("#pwave", { opacity: 0, duration: 0.18 }, tT + 1.2);
  typeText($("#ptype"), "Plan my week from these notes.", tT + 1.2, 42);
  tl.to("#ptype", { opacity: 0, duration: 0.12 }, tT + 2.0);
  tl.to("#pph", { opacity: 1, duration: 0.2 }, tT + 2.1);

  /* sent, answered */
  tl.to("#pgreet", { opacity: 0, y: -12, duration: 0.3, ease: "power2.in" }, tT + 1.95);
  tl.fromTo("#pu", { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.55, ease: "power3.out", immediateRender: false }, tT + 2.02);
  tl.fromTo("#ptl", { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.4, ease: "power3.out", immediateRender: false }, tT + 2.4);
  tl.fromTo("#ptl .shim", { backgroundPosition: "100% 0%" }, { backgroundPosition: "0% 0%", duration: 0.8, ease: "none" }, tT + 2.4);
  tl.fromTo("#pw", { opacity: 0, y: 20, scale: 0.98 }, { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: "expo.out", immediateRender: false }, tT + 2.75);
  $$("#pw .pr").forEach((r, i) => tl.fromTo(r, { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.45, ease: "power3.out" }, tT + 2.95 + i * 0.18));

  /* exit: push through to white */
  tl.to(["#s6stage", "#s6head", "#s6back"], { scale: 1.2, filter: "blur(16px)", duration: 0.45, ease: "power3.in", transformOrigin: "60% 50%" }, 49.55);
  flash(50.0, 1, 0.28, 0.35);
});
