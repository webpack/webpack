const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const readHtml = (name) =>
	fs.readFileSync(path.resolve(__dirname, name), "utf-8");

const at = (html, needle) => html.indexOf(needle);

it("leaves HTML untouched when nothing is injected", () => {
	const html = readHtml("default.html");
	expect(html).not.toContain("theme-color");
	expect(html).not.toContain("<noscript");
});

it("places tags at each injectTo position, in order", () => {
	const html = readHtml("positions.html");
	const head = html.match(/<head>([\s\S]*?)<\/head>/)[1];
	const body = html.match(/<body>([\s\S]*?)<\/body>/)[1];
	// head-prepend before head-append
	expect(at(head, 'rel="preconnect"')).toBeLessThan(at(head, "theme-color"));
	expect(at(head, "theme-color")).toBeGreaterThanOrEqual(0);
	// body-prepend first, then the entry script, then body-append
	expect(at(body, "<noscript>no js</noscript>")).toBeLessThan(
		at(body, "positions.js")
	);
	expect(at(body, "positions.js")).toBeLessThan(at(body, 'src="/a.js"'));
});

it("serializes attributes and void elements correctly", () => {
	const html = readHtml("attrs.html");
	// boolean true → bare attr; false/undefined omitted; value escaped
	expect(html).toContain('<script src="a&quot;b.js" async>');
	expect(html).not.toContain("nomodule");
	expect(html).not.toContain("crossorigin");
	// voidTag:false forces a closing tag on a normally-void element
	expect(html).toContain('<link rel="x">y</link>');
});

it("prepends before and appends after existing head content", () => {
	const head = readHtml("authored.html").match(/<head>([\s\S]*?)<\/head>/)[1];
	// head-prepend meta(b) before <title>, head-append meta(a) after it
	expect(at(head, 'name="b"')).toBeLessThan(at(head, "<title>"));
	expect(at(head, 'name="a"')).toBeGreaterThan(at(head, "</title>"));
});

it("accumulates tags across multiple taps (waterfall)", () => {
	const html = readHtml("multi.html");
	expect(html).toContain('name="one"');
	expect(html).toContain('name="two"');
});

it("prepends head tags and appends body tags on a fragment with no head/body", () => {
	const html = readHtml("fragment.html");
	// head tag prepended before the fragment content
	expect(at(html, 'name="frag-head"')).toBeGreaterThanOrEqual(0);
	expect(at(html, 'name="frag-head"')).toBeLessThan(at(html, "<div"));
	// body tag appended after the fragment content
	expect(at(html, 'src="/f.js"')).toBeGreaterThan(at(html, "</div>"));
});

it("hashes an injected inline <script> into the CSP", () => {
	const html = readHtml("csp.html");
	const policy = html.match(
		/<meta http-equiv="Content-Security-Policy" content="([^"]*)"/i
	)[1];
	// Extract the inline script body without a tag-matching regexp.
	const start = html.indexOf(">", html.indexOf("<script")) + 1;
	const body = html.slice(start, html.indexOf("</script>", start));
	const hash = `'sha256-${crypto
		.createHash("sha256")
		.update(body, "utf8")
		.digest("base64")}'`;
	expect(policy).toContain(hash);
});
