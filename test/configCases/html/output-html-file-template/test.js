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

it("template + title: existing <title> in template is preserved", () => {
	const html = read("with-title.html");
	expect(html).toContain("<title>Template Title</title>");
	expect(html).toContain('<div id="app">');
});
