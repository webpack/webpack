const fs = require("fs");
const path = require("path");

const read = (name) => fs.readFileSync(path.resolve(__dirname, name), "utf-8");

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

it("synthetic title-only: title is present, no base or extra metas", () => {
	const html = read("synthetic-title.html");
	expect(html).toMatch(/<title>Title Only<\/title>/);
	expect(html).not.toContain("<base ");
	expect(html).not.toContain("<meta name=");
});

it("synthetic base string: base href set correctly", () => {
	const html = read("synthetic-base.html");
	expect(html).toMatch(/<base href="\/static\/">/);
	expect(html).not.toContain("target=");
});

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

it("authored base-only: base inserted at head start when no charset present", () => {
	const html = read("page-nocharset.html");
	expect(html).toMatch(/<base href="\/assets\/">/);
	expect(html).toMatch(/<head><base href="\/assets\/">/);
});

it("special chars: $-patterns in option values are not expanded", () => {
	const html = read("page-special-chars.html");
	expect(html).toContain("<title>Save $$$ now &amp; more</title>");
	expect(html).toContain(
		'<meta name="description" content="worth $&amp; to $` you">'
	);
	expect(html).toContain('<meta name="line-break" content="a&#10;b">');
});

it("implicit head: tags injected into implicit head, not inside <header>", () => {
	const html = read("page-implicit-head.html");
	expect(html).toContain(
		'<html><meta charset="utf-8"><base href="/x/"><title>No Head Doc</title><body>'
	);
	expect(html).toContain('<header class="top">x</header>');
});

it("svg title in body does not suppress page title injection", () => {
	const html = read("page-svg-title.html");
	expect(html).toContain("<title>Real Page Title</title>");
	expect(html).toContain("<svg><title>icon label</title></svg>");
});

it("meta content mentioning 'charset' does not suppress charset injection", () => {
	const html = read("page-charset-word.html");
	expect(html).toContain('<meta charset="utf-8">');
	expect(html).toContain('content="how to pick a charset"');
});

it("existing metas win: same-name/property option metas are skipped", () => {
	const html = read("page-dup-meta.html");
	expect(html.match(/<meta[^>]*viewport/g)).toHaveLength(1);
	expect(html).toContain('content="width=device-width"');
	expect(html.match(/<meta[^>]*description/g)).toHaveLength(1);
	expect(html).toContain("content='authored'");
	expect(html.match(/<meta[^>]*keywords/g)).toHaveLength(1);
	expect(html.match(/<meta[^>]*og:title/g)).toHaveLength(1);
	expect(html).toContain('content="Authored OG"');
	expect(html).toContain('<meta name="author" content="Options Author">');
});

it("http-equiv charset declaration is respected and base follows it", () => {
	const html = read("page-httpequiv.html");
	expect(html).not.toContain("<meta charset=");
	expect(html).toContain(
		'charset=utf-8"><base href="/after-charset/">'
	);
});

it("bare fragment without doctype/html/head still gets tags", () => {
	const html = read("page-bare.html");
	expect(html).toContain("<title>Bare Fragment</title>");
});

it("doctype without html/head tags: tags injected inside the implicit head", () => {
	const html = read("page-doctype-only.html");
	expect(html).toMatch(
		/^<!doctype html><script src="[^"]+"><\/script><title>Doctype Only<\/title>/
	);
});

it("synthetic: newline in title is entity-encoded and builds successfully", () => {
	const html = read("synthetic-newline.html");
	expect(html).toContain("<title>Line1&#10;Line2</title>");
});

it("commented-out tags do not count as existing", () => {
	const html = read("page-comment.html");
	expect(html).toContain("<title>Comment Proof</title>");
	expect(html).toContain('<base href="/real/">');
	expect(html).toContain('<meta charset="utf-8">');
	expect(html).toContain("<!-- <title>Fake</title>");
});

it("template contents are inert, metas after the template still count", () => {
	const html = read("page-template.html");
	expect(html).toContain('<meta name="viewport" content="vp-from-options">');
	expect(html.match(/content="inert"/g)).toHaveLength(2);
	expect(html.match(/<meta[^>]*existing/g)).toHaveLength(1);
	expect(html).not.toContain('content="no"');
});

it("entity-encoded meta names are decoded before dedup", () => {
	const html = read("page-entity-meta.html");
	expect(html).toContain('content="authored entity"');
	expect(html).not.toContain('content="from options"');
});
