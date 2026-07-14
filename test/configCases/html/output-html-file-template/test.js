const fs = require("fs");
const path = require("path");

const read = (name) => fs.readFileSync(path.resolve(__dirname, name), "utf-8");
const headContent = (html) =>
	(html.match(/<head>([\s\S]*?)<\/head>/i) || [])[1] || "";
const bodyContent = (html) =>
	(html.match(/<body>([\s\S]*?)<\/body>/i) || [])[1] || "";

it("template: preserves structure, injects script before </body>, not before <header>", () => {
	const html = read("basic.html");
	expect(html).toContain('<div id="app">');
	expect(html).toContain("<title>Template Title</title>");
	expect(html).toContain("<header>Page Header</header>");
	expect(bodyContent(html)).toMatch(/<script\b/);
	expect(headContent(html)).not.toMatch(/<script\b/);
	const headerIdx = html.indexOf("</header>");
	const scriptIdx = html.indexOf("<script");
	expect(scriptIdx).toBeGreaterThan(headerIdx);
});

it("template + inject:head: scripts placed in <head>, not before <header>", () => {
	const html = read("inject-head.html");
	expect(html).toContain('<div id="app">');
	expect(headContent(html)).toMatch(/<script\b/);
	expect(bodyContent(html)).not.toMatch(/<script\b/);
});

it("template + inject:false: no chunk scripts injected", () => {
	const html = read("inject-false.html");
	expect(html).toContain('<div id="app">');
	expect(html).not.toMatch(/<script\b/);
});

it("template + title: existing <title> wins, output.html.title is not duplicated", () => {
	const html = read("with-title.html");
	expect(html).toContain("<title>Template Title</title>");
	expect(html).not.toContain("Injected Title");
});

it("template with no </head>: scripts fall back to before </body>", () => {
	const html = read("no-head.html");
	expect(html).toContain('<div id="app">');
	expect(bodyContent(html)).toMatch(/<script\b/);
});

it("template with <!-- </head> --> comment: script goes to real </body>, not before comment", () => {
	const html = read("comment-tags.html");
	expect(html).toContain("<title>Comment Template</title>");
	expect(html).toContain('<div id="app">');
	expect(bodyContent(html)).toMatch(/<script\b/);
	expect(headContent(html)).not.toMatch(/<script\b/);
});

it("template with no <title> + output.html.title: title is injected from option", () => {
	const html = read("title-from-option.html");
	expect(html).toContain("<title>Option Title</title>");
});

it("template with no </body> (only </head>): script injected before </head>", () => {
	const html = read("no-body.html");
	expect(html).toContain("<title>No Body</title>");
	expect(html).toMatch(/<script\b/);
	const headClose = html.lastIndexOf("</head>");
	const scriptIdx = html.indexOf("<script");
	expect(scriptIdx).toBeLessThan(headClose);
});

it("template bare fragment (no </head> no </body>): script appended at end", () => {
	const html = read("bare-fragment.html");
	expect(html).toContain('<div id="app">');
	expect(html).toMatch(/<script\b/);
});

it("template with <!-- </body> --> comment: script injected before real </body>", () => {
	const html = read("comment-body.html");
	expect(html).toContain('<div id="app">');
	const fakeBodyIdx = html.indexOf("</body>");
	const realBodyIdx = html.lastIndexOf("</body>");
	const scriptIdx = html.indexOf("<script");
	expect(scriptIdx).toBeGreaterThan(fakeBodyIdx);
	expect(scriptIdx).toBeLessThan(realBodyIdx);
});

it("template + output.module: true: inject defaults to head (module scripts are implicitly deferred)", () => {
	const html = read("module-output.html");
	expect(html).toContain('<div id="app">');
	expect(headContent(html)).toMatch(/<script\b/);
	expect(bodyContent(html)).not.toMatch(/<script\b/);
});

it("template + CSS import: <link> in <head>, <script> in <body>", () => {
	const html = read("with-css.html");
	expect(headContent(html)).toMatch(/<link\b[^>]*rel="stylesheet"/);
	expect(headContent(html)).not.toMatch(/<script\b/);
	expect(bodyContent(html)).toMatch(/<script\b/);
});

it("template + BOM: BOM is stripped, output is valid HTML", () => {
	const html = read("bom.html");
	expect(html.charCodeAt(0)).not.toBe(0xfeff);
	expect(html).toContain("<title>BOM Template</title>");
	expect(html).toMatch(/<script\b/);
});

it("template + dependOn: two chunks injected in load order", () => {
	const html = read("depend-on.html");
	const scripts = html.match(/<script\b[^>]*>/g) || [];
	expect(scripts.length).toBe(2);
	expect(html.indexOf(scripts[0])).toBeLessThan(html.indexOf(scripts[1]));
});

it("template absolute path: resolves correctly", () => {
	const html = read("absolute-path.html");
	expect(html).toContain("<title>Template Title</title>");
	expect(html).toMatch(/<script\b/);
});
