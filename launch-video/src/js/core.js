/* ============================================================
   Core: master timeline, camera, cursor, typing, text helpers,
   shared WebGL gradient field.
   Everything is driven by the paused master timeline so every
   frame is deterministic under HyperFrames seeking.
   ============================================================ */
window.__timelines = window.__timelines || {};
const tl = gsap.timeline({ paused: true });
/* Scene builders run after webfonts load so text measurement is exact. */
const SCENES = [];
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const INK = "#0d0d0d", ACC = "#6155f3", ACC_SOFT = "#b9b2f8";
const lerp = (a, b, k) => a + (b - a) * k;
const clamp01 = (v) => Math.max(0, Math.min(1, v));

/* seeded PRNG (mulberry32) for any scatter layouts */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- camera ----------
   Maps world point (cx, cy) to screen centre at zoom z.
   Zoom is interpolated in log space so push-ins feel even. */
function makeCam(el, o = {}) {
  const s = { cx: o.cx ?? 960, cy: o.cy ?? 540, lz: Math.log(o.z ?? 1), rx: o.rx || 0, ry: o.ry || 0, rz: o.rz || 0 };
  const apply = () => {
    el.style.transform =
      `translate(960px,540px) rotateX(${s.rx}deg) rotateY(${s.ry}deg) rotateZ(${s.rz}deg) ` +
      `scale(${Math.exp(s.lz).toFixed(5)}) translate(${(-s.cx).toFixed(3)}px,${(-s.cy).toFixed(3)}px)`;
  };
  apply();
  return { s, apply, el };
}
function camVars(v) {
  const o = {};
  for (const k in v) o[k === "z" ? "lz" : k] = k === "z" ? Math.log(v[k]) : v[k];
  return o;
}
function camTo(c, v, t, dur, ease = "power3.inOut") {
  tl.to(c.s, { ...camVars(v), duration: dur, ease, onUpdate: c.apply }, t);
}
/* world -> screen for a camera state (used to place overlays) */
function toScreen(c, x, y) {
  const z = Math.exp(c.s.lz);
  return [960 + (x - c.s.cx) * z, 540 + (y - c.s.cy) * z];
}

/* ---------- measuring (layout is static at build time) ---------- */
function rectIn(el, ancestor) {
  const a = ancestor.getBoundingClientRect(), b = el.getBoundingClientRect();
  return { x: b.left - a.left, y: b.top - a.top, w: b.width, h: b.height, cx: b.left - a.left + b.width / 2, cy: b.top - a.top + b.height / 2 };
}
/* Offset of el relative to an ancestor, ignoring transforms (walks offsetParent). */
function offsetIn(el, ancestor) {
  let x = 0, y = 0, n = el;
  while (n && n !== ancestor) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight, cx: x + el.offsetWidth / 2, cy: y + el.offsetHeight / 2 };
}

/* ---------- ticker: call fn(time) every frame inside [t0, t1] ---------- */
function tick(t0, t1, fn) {
  const p = { v: 0 };
  tl.to(p, { v: 1, duration: t1 - t0, ease: "none", onUpdate() { fn(t0 + p.v * (t1 - t0), p.v); } }, t0);
}

/* ---------- typing ---------- */
function typeText(el, str, t, cps = 18, from = "") {
  const p = { n: 0 };
  const dur = Math.max(0.05, (str.length - from.length) / cps);
  el.textContent = el.textContent || from;
  tl.to(p, {
    n: 1, duration: dur, ease: "none",
    onUpdate() { el.textContent = from + str.slice(from.length, from.length + Math.round(p.n * (str.length - from.length))); },
  }, t);
  return t + dur;
}
function eraseText(el, str, to, t, cps = 40) {
  const p = { n: 0 };
  const dur = Math.max(0.05, (str.length - to.length) / cps);
  tl.to(p, {
    n: 1, duration: dur, ease: "none",
    onUpdate() { el.textContent = str.slice(0, str.length - Math.round(p.n * (str.length - to.length))); },
  }, t);
  return t + dur;
}
function setText(el, str, t, prev = el.textContent) {
  const p = { v: 0 };
  tl.to(p, { v: 1, duration: 0.001, onUpdate() { el.textContent = p.v >= 1 ? str : prev; } }, t);
}

/* ---------- word entrances ---------- */
function wordsIn(ws, t, o = {}) {
  const st = o.stagger ?? 0.2, blur = o.blur ?? 14, y = o.y ?? 16, dur = o.dur ?? 0.8;
  ws.forEach((w, i) => {
    const tt = t + (Array.isArray(st) ? st[i] : i * st);
    tl.fromTo(w, { opacity: 0, filter: `blur(${blur}px)`, y, scale: o.scale ?? 1 },
      { opacity: 1, filter: "blur(0px)", y: 0, scale: 1, duration: dur, ease: "expo.out" }, tt);
    if (o.tint !== false)
      tl.fromTo(w, { color: o.tint || ACC_SOFT }, { color: w.dataset.c || INK, duration: dur * 1.5, ease: "sine.out" }, tt);
  });
}

/* ---------- cursor ---------- */
const CURSOR_SVG =
  '<svg viewBox="-1 -1 17 21"><path d="M0 0v17.2l4.1-3.9 2.9 6.6 3-1.3-2.9-6.5h5.7Z" fill="#0d0d0d" stroke="#fff" stroke-width="1.35" stroke-linejoin="round"/></svg>';
function makeCursor(parent, x, y, size = 34) {
  const c = document.createElement("div");
  c.className = "cursor";
  c.style.width = size + "px"; c.style.height = size * 1.24 + "px";
  c.innerHTML = CURSOR_SVG;
  parent.appendChild(c);
  gsap.set(c, { x, y, opacity: 0 });
  return c;
}
function cursorShow(c, t, dur = 0.25) { tl.to(c, { opacity: 1, duration: dur, ease: "power1.out" }, t); }
function cursorHide(c, t, dur = 0.2) { tl.to(c, { opacity: 0, duration: dur, ease: "power1.in" }, t); }
function cursorTo(c, x, y, t, dur = 0.6, ease = "power3.inOut") {
  tl.to(c, { x, y, duration: dur, ease }, t);
}
function clickAt(c, t, rippleParent, x, y, color) {
  tl.to(c, { scale: 0.84, duration: 0.08, ease: "power2.out" }, t);
  tl.to(c, { scale: 1, duration: 0.22, ease: "power2.out" }, t + 0.09);
  if (rippleParent) {
    const r = document.createElement("div");
    r.className = "ripple";
    if (color) r.style.borderColor = color;
    r.style.left = x + "px"; r.style.top = y + "px";
    rippleParent.appendChild(r);
    tl.set(r, { scale: 0.25, opacity: 0.85 }, t + 0.02);
    tl.to(r, { scale: 1.35, opacity: 0, duration: 0.6, ease: "power2.out" }, t + 0.021);
  }
}
/* press a button: compress + recover */
function press(el, t, s = 0.94) {
  tl.to(el, { scale: s, duration: 0.08, ease: "power2.out" }, t);
  tl.to(el, { scale: 1, duration: 0.3, ease: "power3.out" }, t + 0.09);
}

/* ---------- flash ---------- */
function flash(t, peak = 1, up = 0.12, down = 0.45) {
  const f = $("#flash");
  tl.to(f, { opacity: peak, duration: up, ease: "power2.in" }, t - up);
  tl.to(f, { opacity: 0, duration: down, ease: "power2.out" }, t);
}

/* ---------- shared gradient field (WebGL) ---------- */
const BG = (() => {
  const canvas = $("#bgc");
  const W = 960, H = 540;
  const gl = canvas.getContext("webgl", { preserveDrawingBuffer: true, antialias: false, alpha: false });
  const vs = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
  const fs = `precision highp float;
uniform float t; uniform vec2 r;
uniform vec3 c0,c1,c2,c3,c4; uniform float lum;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;mat2 m=mat2(1.6,1.2,-1.2,1.6);for(int i=0;i<5;i++){v+=a*n(p);p=m*p;a*=.5;}return v;}
void main(){
  vec2 uv=gl_FragCoord.xy/r;
  vec2 p=(uv-.5)*vec2(r.x/r.y,1.)*1.25;
  float tt=t*.05;
  vec2 q=vec2(fbm(p*1.05+vec2(0.,tt)),fbm(p*1.05+vec2(5.2,-tt*.8)));
  vec2 w=vec2(fbm(p*1.25+2.1*q+vec2(1.7,9.2)+tt*.6),fbm(p*1.25+2.1*q+vec2(8.3,2.8)-tt*.5));
  float f=fbm(p+1.7*w);
  vec3 col=mix(c1,c0,smoothstep(.0,1.,uv.y));
  col=mix(col,c2,smoothstep(.34,.86,f)*.85);
  col=mix(col,c3,smoothstep(.48,.96,w.x)*.72);
  col=mix(col,c4,smoothstep(.5,1.,q.y)*smoothstep(.85,.15,uv.y)*.85);
  col+=.07*smoothstep(.62,1.,f);
  float v=smoothstep(1.3,.3,length((uv-.5)*vec2(1.15,1.)));
  col*=mix(.86,1.,v)*lum;
  gl_FragColor=vec4(col,1.);
}`;
  const sh = (tp, s) => { const o = gl.createShader(tp); gl.shaderSource(o, s); gl.compileShader(o); return o; };
  const pr = gl.createProgram();
  gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(pr); gl.useProgram(pr);
  const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = (n) => gl.getUniformLocation(pr, n);
  const u = { t: U("t"), r: U("r"), lum: U("lum"), c: [U("c0"), U("c1"), U("c2"), U("c3"), U("c4")] };
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  // palettes: top, bottom, body, accent, low glow
  const PAL = [
    ["#86aef6", "#dccff8", "#b6a8f5", "#f3c7d8", "#ffe0c8"], // 0 sky (ChatGPT desktop)
    ["#2b3a9a", "#8b6fda", "#5a6de0", "#c68cdd", "#f3a8ba"], // 1 dusk (Codex)
    ["#a9c7f8", "#f6e2ea", "#c6b8f7", "#f9d3c0", "#fff0dc"], // 2 morning (iPhone)
  ].map((p) => p.map(hex));
  const state = { pal: 0, lum: 1 };
  function draw(time) {
    const i = Math.floor(state.pal), k = state.pal - i;
    const A = PAL[Math.min(i, PAL.length - 1)], B = PAL[Math.min(i + 1, PAL.length - 1)];
    gl.viewport(0, 0, W, H);
    gl.uniform1f(u.t, time); gl.uniform2f(u.r, W, H); gl.uniform1f(u.lum, state.lum);
    for (let j = 0; j < 5; j++) gl.uniform3f(u.c[j], lerp(A[j][0], B[j][0], k), lerp(A[j][1], B[j][1], k), lerp(A[j][2], B[j][2], k));
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  draw(0);
  return { draw, state };
})();
