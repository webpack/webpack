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

it("template with no </head>: CSS and scripts fall back to before </body>", () => {
	const html = read("no-head.html");
	expect(html).toContain('<div id="app">');
	expect(bodyContent(html)).toMatch(/<script\b/);
});

it("template with <!-- </head> --> comment: comment does not trigger false injection", () => {
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
