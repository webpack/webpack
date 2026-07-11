const fs = require("fs");
const path = require("path");

const read = (name) => fs.readFileSync(path.resolve(__dirname, name), "utf-8");

// --- synthetic-all ---
it("synthetic: charset meta is first in head", () => {
	const html = read("synthetic-all.html");
	expect(html).toMatch(/<meta charset="UTF-8">/);
	const charsetPos = html.indexOf('<meta charset="UTF-8">');
	const basePos = html.indexOf("<base ");
	expect(charsetPos).toBeLessThan(basePos);
});

it("synthetic: base element injected with href and target", () => {
	const html = read("synthetic-all.html");
	expect(html).toMatch(/<base href="\/app\/" target="_self">/);
});

it("synthetic: non-charset metas injected with correct attribute", () => {
	const html = read("synthetic-all.html");
	expect(html).toMatch(/<meta name="viewport" content="width=device-width, initial-scale=1">/);
	expect(html).toMatch(/<meta name="description" content="A test page">/);
});

it("synthetic: og: uses property attribute, twitter: uses name attribute", () => {
	const html = read("synthetic-all.html");
	expect(html).toMatch(/<meta property="og:title" content="My App OG">/);
	// Twitter Cards use name=, not property= — using property= breaks Twitter's crawler
	expect(html).toMatch(/<meta name="twitter:card" content="summary">/);
});

it("synthetic: title injected", () => {
	const html = read("synthetic-all.html");
	expect(html).toMatch(/<title>My App<\/title>/);
});

it("synthetic: head tag order — charset before base before metas before title", () => {
	const html = read("synthetic-all.html");
	const charsetPos = html.indexOf("<meta charset=");
	const basePos = html.indexOf("<base ");
	const viewportPos = html.indexOf('<meta name="viewport"');
	const titlePos = html.indexOf("<title>");
	expect(charsetPos).toBeLessThan(basePos);
	expect(basePos).toBeLessThan(viewportPos);
	expect(viewportPos).toBeLessThan(titlePos);
});

// --- synthetic-title ---
it("synthetic title-only: title is present, no base or extra metas", () => {
	const html = read("synthetic-title.html");
	expect(html).toMatch(/<title>Title Only<\/title>/);
	expect(html).not.toContain("<base ");
	expect(html).not.toContain("<meta name=");
});

// --- synthetic-base ---
it("synthetic base string: base href set correctly", () => {
	const html = read("synthetic-base.html");
	expect(html).toMatch(/<base href="\/static\/">/);
	expect(html).not.toContain("target=");
});

// --- authored-all (source: page.html) ---
it("authored: charset injected at head start", () => {
	const html = read("page.html");
	expect(html).toMatch(/<meta charset="UTF-8">/);
});

it("authored: base injected when none existed", () => {
	const html = read("page.html");
	expect(html).toMatch(/<base href="\/cdn\/">/);
});

it("authored: viewport meta injected before </head>", () => {
	const html = read("page.html");
	expect(html).toMatch(/<meta name="viewport" content="width=device-width, initial-scale=1">/);
});

it("authored: title injected when none existed", () => {
	const html = read("page.html");
	expect(html).toMatch(/<title>Authored Title<\/title>/);
});

it("authored: charset before base in insertion order", () => {
	const html = read("page.html");
	const charsetPos = html.indexOf("<meta charset=");
	const basePos = html.indexOf("<base ");
	expect(charsetPos).toBeLessThan(basePos);
});

// --- authored-existing (source: page-existing.html) ---
it("authored existing: existing title is NOT replaced", () => {
	const html = read("page-existing.html");
	expect(html).toContain("<title>Existing Title</title>");
	expect(html).not.toContain("Should Not Override");
});

it("authored existing: existing charset is NOT duplicated", () => {
	const html = read("page-existing.html");
	const count = (html.match(/<meta\s[^>]*charset/gi) || []).length;
	expect(count).toBe(1);
	expect(html).toContain('charset="ISO-8859-1"');
});

it("authored existing: existing base is NOT replaced", () => {
	const html = read("page-existing.html");
	expect(html).toContain('href="/existing/"');
	expect(html).not.toContain("/should-not-override/");
});

// --- authored-base-only (source: page-nocharset.html) ---
it("authored base-only: base inserted at head start when no charset present", () => {
	const html = read("page-nocharset.html");
	expect(html).toMatch(/<base href="\/assets\/">/);
	// base should be right after <head> when there's no charset
	expect(html).toMatch(/<head><base href="\/assets\/">/);
});
