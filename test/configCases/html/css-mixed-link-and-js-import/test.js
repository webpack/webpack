const fs = require("fs");
const path = require("path");

const readFile = (name) =>
	fs.readFileSync(path.resolve(__dirname, name), "utf-8");

it("should mix a <link rel=stylesheet> entry with CSS imported from a <script src> entry", () => {
	const extracted = readFile("page.html");
	expect(extracted).toMatchSnapshot();

	// Order in the source HTML is link first, then script. The cascade
	// must keep that — the linked CSS dominates everything the script-
	// side CSS contributes.
	const linkHrefRe = /<link rel="stylesheet" href="([^"]+)">/g;
	const linkHrefs = [];
	for (let m; (m = linkHrefRe.exec(extracted)); ) linkHrefs.push(m[1]);

	const scriptSrcRe = /<script src="([^"]+)">/g;
	const scriptSrcs = [];
	for (let m; (m = scriptSrcRe.exec(extracted)); ) scriptSrcs.push(m[1]);
	expect(scriptSrcs).toHaveLength(1);

	// One `<link>` for the `<link rel="stylesheet">` entry, plus one
	// for the entry chunk's CSS (containing both JS-imported `.css`
	// files merged in import order). The CSS `@import` of `shared.css`
	// is followed by the CSS pipeline and lands in the same chunk, so
	// no third `<link>` shows up for it.
	expect(linkHrefs).toHaveLength(2);
	for (const href of linkHrefs) {
		expect(href).toMatch(/\.css$/);
		expect(() => readFile(href)).not.toThrow();
	}

	const [linkedHref, importedHref] = linkHrefs;

	// Linked sheet must come first in the HTML — it's what the user
	// authored in their source.
	expect(extracted.indexOf(`href="${linkedHref}"`)).toBeLessThan(
		extracted.indexOf(`href="${importedHref}"`)
	);
	// Both `<link>`s precede the `<script>`.
	expect(extracted.lastIndexOf('<link rel="stylesheet"')).toBeLessThan(
		extracted.indexOf("<script")
	);

	const linkedCss = readFile(linkedHref);
	const jsBundleCss = readFile(importedHref);

	// The link's CSS came from `./linked.css`, nothing else.
	expect(linkedCss).toContain('content: "linked"');
	expect(linkedCss).not.toContain('content: "imported"');
	expect(linkedCss).not.toContain('content: "imports-shared"');
	expect(linkedCss).not.toContain('content: "shared"');

	// The JS-side bundle contains everything entry.js pulled in —
	// `imported.css`, `imports-shared.css`, and `shared.css` via the
	// CSS `@import` inside `imports-shared.css`. The order of the
	// modules inside that single chunk follows the source's import
	// order (CssModulesPlugin's per-chunk ordering): shared.css is
	// pulled in BEFORE the `imports-shared.css` rule that triggered
	// it, then `imported.css` and `imports-shared.css` themselves.
	expect(jsBundleCss).toContain('content: "imported"');
	expect(jsBundleCss).toContain('content: "imports-shared"');
	expect(jsBundleCss).toContain('content: "shared"');

	// `.hero` cascade in the final document: linked.css declares it
	// red, imported.css redeclares it green. linked.css loads first
	// (link before script), imported.css loads second — so green
	// wins. Easiest to verify by checking that linked.css holds the
	// red declaration and the JS-side bundle holds the green one,
	// and that linked precedes imported in the HTML (already done).
	expect(linkedCss).toContain("color: red");
	expect(jsBundleCss).toContain("color: green");
});
