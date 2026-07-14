const fs = require("fs");
const path = require("path");

const read = (name) => fs.readFileSync(path.resolve(__dirname, name), "utf-8");
const headContent = (html) =>
	(html.match(/<head>([\s\S]*?)<\/head>/i) || [])[1] || "";
const bodyContent = (html) =>
	(html.match(/<body>([\s\S]*?)<\/body>/i) || [])[1] || "";

it("body module script: CSS goes to <head>, the author's tag stays in <body> (Vite: both in head)", () => {
	const html = read("page-body.html");
	expect(headContent(html)).toMatch(/<link rel="stylesheet"[^>]*>/);
	expect(headContent(html)).not.toMatch(/<script/);
	// the entry URL is rewritten in place, like Vite
	expect(bodyContent(html)).toMatch(/<script type="module" src="[^"]+\.mjs"/);
});

it("head module script: CSS joins it in <head>, ahead of the script", () => {
	const html = read("page-head.html");
	const head = headContent(html);
	expect(head).toMatch(/<link rel="stylesheet"[^>]*>/);
	expect(head).toMatch(/<script type="module" src="[^"]+\.mjs"/);
	// webpack orders CSS first (also safe for blocking scripts); Vite emits
	// script-then-CSS, which only deferred modules tolerate
	expect(head.indexOf("<link")).toBeLessThan(head.indexOf("<script"));
});

it("bare script without head/body: no markup is synthesized, the CSS link sits next to the script (like Vite)", () => {
	const html = read("page-bare.html");
	expect(html).not.toMatch(/<head|<body|<html/i);
	expect(html).toMatch(/<link rel="stylesheet"[^>]*>/);
	expect(html).toMatch(/<script type="module" src="[^"]+\.mjs"/);
});
