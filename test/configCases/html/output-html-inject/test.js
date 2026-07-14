const fs = require("fs");
const path = require("path");

const read = (name) => fs.readFileSync(path.resolve(__dirname, name), "utf-8");
const scripts = (html) => html.match(/<script\b[^>]*>/g) || [];
const headContent = (html) => (html.match(/<head>([\s\S]*?)<\/head>/i) || [])[1] || "";
const bodyContent = (html) => (html.match(/<body>([\s\S]*?)<\/body>/i) || [])[1] || "";

it("inject:body (default) puts scripts in <body>, not <head>", () => {
	const html = read("body.html");
	expect(bodyContent(html)).toMatch(/<script/);
	expect(headContent(html)).not.toMatch(/<script src=/);
});

it("inject:head puts scripts in <head>, body is empty", () => {
	const html = read("head.html");
	expect(headContent(html)).toMatch(/<script/);
	expect(bodyContent(html)).not.toMatch(/<script/);
});

it("inject:false on synthetic HTML keeps only the entry <script> tag", () => {
	const html = read("false.html");
	expect(scripts(html).length).toBe(1);
	expect(bodyContent(html)).toMatch(/<script[^>]* src="[^"]+\.js"/);
});

it("inject:false on authored HTML skips sibling chunks but keeps entry tag", () => {
	const html = read("page-false.html");
	expect(html).toMatch(/<script src="[^"]+\.js"/);
	expect(scripts(html).length).toBe(1);
});

it("inject:head on authored HTML (single chunk) rewrites entry URL", () => {
	const html = read("page-head.html");
	expect(html).toMatch(/<script src="[^"]+\.js"/);
});

it("inject:head synthetic HTML + runtimeChunk: runtime before entry in <head> (load order preserved)", () => {
	const html = read("head-split.html");
	// both runtime and entry must be in <head>
	expect(headContent(html)).toMatch(/<script/);
	expect(bodyContent(html)).not.toMatch(/<script/);
	// runtime must appear before the entry to preserve __webpack_require__ availability
	const runtimeIdx = html.indexOf("runtime.js");
	const entryIdx = html.search(/__html_[a-f0-9]+_0\.js/);
	expect(runtimeIdx).toBeLessThan(entryIdx);
});

it("inject:head with runtimeChunk moves runtime sibling into <head>, entry stays in <body>", () => {
	const html = read("page-head-split.html");
	// runtime chunk sibling must be in <head>
	expect(headContent(html)).toMatch(/<script src="[^"]+\.js"/);
	// entry script stays where the author put it — in <body>
	expect(bodyContent(html)).toMatch(/<script src="[^"]+\.js"/);
	// exactly one script in head (runtime) and one in body (entry)
	expect(scripts(headContent(html)).length).toBe(1);
	expect(scripts(bodyContent(html)).length).toBe(1);
});

it("inject:false with runtimeChunk suppresses sibling entirely, entry URL still rewritten", () => {
	const html = read("page-false-split.html");
	// only the entry script tag — runtime sibling is suppressed
	expect(scripts(html).length).toBe(1);
	expect(html).toMatch(/<script src="[^"]+\.js"/);
});

it("output.module: true defaults inject to head (module scripts are implicitly deferred)", () => {
	const html = read("module-default-head.html");
	expect(headContent(html)).toMatch(/<script type="module"/);
	expect(bodyContent(html)).not.toMatch(/<script/);
});

it("inject:false keeps opt-in resource hints for the suppressed siblings", () => {
	const html = read("page-false-hints.html");
	expect(scripts(html).length).toBe(1);
	expect(html).toMatch(/<link rel="preload" as="script"/);
});

it("inject:head keeps injected stylesheets ahead of the first blocking script", () => {
	const html = read("page-head-css.html");
	const linkIdx = html.search(/<link rel="stylesheet"/);
	const scriptIdx = html.search(/<script/);
	expect(linkIdx).toBeGreaterThanOrEqual(0);
	expect(linkIdx).toBeLessThan(scriptIdx);
});

it("inject:false on synthetic HTML keeps the entry tag, suppresses the runtime sibling", () => {
	const html = read("false-split.html");
	expect(scripts(html).length).toBe(1);
	expect(html).toMatch(/<script[^>]* src="[^"]+\.js"/);
	expect(html).not.toMatch(/runtime\.js/);
});

it("inject:head ignores `</head>` inside a comment", () => {
	const html = read("page-head-comment.html");
	const comment = html.slice(html.indexOf("<!--"), html.indexOf("-->"));
	expect(comment).not.toMatch(/<script/);
	const runtimeIdx = html.indexOf("runtime.js");
	expect(runtimeIdx).toBeGreaterThan(html.indexOf("-->"));
	expect(runtimeIdx).toBeLessThan(html.lastIndexOf("</head>"));
});

it("inject:head with no head tags anchors just inside the implicit head", () => {
	const html = read("page-nohead.html");
	// no head markup is added
	expect(html).not.toMatch(/<head>/i);
	expect(scripts(html).length).toBe(2);
	// runtime sibling appears before the entry script in document order
	const runtimeIdx = html.indexOf("runtime.js");
	const entryIdx = html.search(/__html_[a-f0-9]+_0\.js/);
	expect(runtimeIdx).toBeLessThan(entryIdx);
	// hints anchor there too
	expect(html).toMatch(/<link rel="preload" as="script"/);
});

it("inject:head anchors inside an implied head, after its last child", () => {
	const html = read("page-implied-head.html");
	const runtimeIdx = html.indexOf("runtime.js");
	expect(runtimeIdx).toBeGreaterThan(html.indexOf("</title>"));
	expect(runtimeIdx).toBeLessThan(html.indexOf("<body>"));
});

it("bare-script page: siblings stay before the entry, hints use the pre-script fallback", () => {
	const html = read("page-bare-script.html");
	expect(scripts(html).length).toBe(2);
	const runtimeIdx = html.indexOf("runtime.js");
	const entryIdx = html.search(/__html_[a-f0-9]+_0\.js/);
	expect(runtimeIdx).toBeLessThan(entryIdx);
	expect(html).toMatch(/<link rel="preload" as="script"/);
});

it("a body entry's stylesheet goes to <head> even with default inject", () => {
	const html = read("page-body-css.html");
	expect(headContent(html)).toMatch(/<link rel="stylesheet"/);
	expect(bodyContent(html)).not.toMatch(/<link rel="stylesheet"/);
	// the script itself stays where the author put it
	expect(bodyContent(html)).toMatch(/<script/);
});

it("stylesheet entry: split CSS sibling clones the original <link> in <head>", () => {
	const html = read("page-css-link-split.html");
	const links = html.match(/<link rel="stylesheet"[^>]*>/g) || [];
	expect(links.length).toBe(2);
	// the sibling clone keeps the author's `media` attribute
	for (const link of links) {
		expect(link).toMatch(/media="screen"/);
	}
	expect(headContent(html)).toMatch(/shared-css/);
});

it("split CSS chunks keep the source import order in <head>", () => {
	const html = read("page-css-order.html");
	const head = headContent(html);
	const c = head.indexOf("css-c");
	const b = head.indexOf("css-b");
	const a = head.indexOf("css-a");
	expect(c).toBeGreaterThanOrEqual(0);
	expect(c).toBeLessThan(b);
	expect(b).toBeLessThan(a);
});

it("mixed page: CSS may follow the defer script but stays ahead of the blocking script", () => {
	const html = read("page-mixed-css.html");
	const deferIdx = html.search(/<script src="[^"]+" defer>/);
	const linkIdx = html.indexOf('<link rel="stylesheet"');
	const blockingIdx = html.search(/<script src="[^"]+"><\/script>/);
	expect(deferIdx).toBeGreaterThanOrEqual(0);
	expect(blockingIdx).toBeGreaterThanOrEqual(0);
	expect(linkIdx).toBeGreaterThan(deferIdx);
	expect(linkIdx).toBeLessThan(blockingIdx);
});

it("defer entry + inject:head: runtime sibling precedes the stylesheet at the head anchor", () => {
	const html = read("page-defer-split.html");
	const head = headContent(html);
	const scriptIdx = head.indexOf("<script");
	const linkIdx = head.indexOf('<link rel="stylesheet"');
	expect(scriptIdx).toBeGreaterThanOrEqual(0);
	// Vite order: the deferred runtime script tag comes first, CSS after
	expect(linkIdx).toBeGreaterThan(scriptIdx);
	expect(head).toMatch(/runtime\.js/);
	// the deferred entry script itself stays where the author put it
	expect(bodyContent(html)).toMatch(/<script src="[^"]+\.js" defer>/);
});

it("explicit inject:body beats the output.module head default", () => {
	const html = read("module-inject-body.html");
	expect(bodyContent(html)).toMatch(/<script type="module"/);
	expect(headContent(html)).not.toMatch(/<script/);
});
