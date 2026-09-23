// Assembles index.html from src/. Run: node build.mjs
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const src = (p) => readFileSync(join(root, "src", p), "utf8");
const list = (dir, ext) =>
  readdirSync(join(root, "src", dir))
    .filter((f) => f.endsWith(ext))
    .sort()
    .map((f) => src(join(dir, f)));

const DURATION = 58.5;

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=1920, height=1080" />
<title>Operator Powers launch</title>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<style>
${src("styles.css")}
${list("css", ".css").join("\n")}
</style>
</head>
<body>
${src("defs.html")}
<div id="root" data-composition-id="main" data-start="0" data-duration="${DURATION}" data-width="1920" data-height="1080">
${list("scenes", ".html").join("\n")}
</div>
<script>
${src("js/core.js")}
${list("js/scenes", ".js").join("\n")}
${src("js/end.js")}
</script>
</body>
</html>
`;

writeFileSync(join(root, "index.html"), html);
console.log(`index.html written (${(html.length / 1024).toFixed(1)} KB)`);
