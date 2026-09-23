/* ---------- register ---------- */
tl.eventCallback("onUpdate", () => BG.draw(tl.time()));
window.addEventListener("hf-seek", (e) => BG.draw(e.detail.time));
window.__timelines["main"] = tl;
window.__hf = window.__hf || {};
window.__hf.buildReady = window.__hf.buildReady || {};
window.__hf.buildReady["op-scenes"] = document.fonts.ready.then(() => {
  SCENES.forEach((build) => build());
  tl.seek(0, false);
  BG.draw(0);
});
