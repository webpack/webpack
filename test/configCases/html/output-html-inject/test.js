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

it("inject:false produces no chunk <script> tags in synthetic HTML", () => {
	const html = read("false.html");
	expect(html).not.toMatch(/<script src=/);
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

it("inject:head with no </head> tag falls back to inserting siblings before the entry tag", () => {
	const html = read("page-nohead.html");
	// both runtime and entry scripts land in <body> (no </head> to target)
	expect(html).not.toMatch(/<head>/i);
	expect(scripts(html).length).toBe(2);
	// runtime sibling appears before the entry script in document order
	const runtimeIdx = html.indexOf("runtime.js");
	const entryIdx = html.search(/__html_[a-f0-9]+_0\.js/);
	expect(runtimeIdx).toBeLessThan(entryIdx);
});
