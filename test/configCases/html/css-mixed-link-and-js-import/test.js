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

	// One `<link>` for the `<link rel="stylesheet">` entry, plus one for the entry
	// chunk's CSS holding both JS-imported files. `shared.css` is `@import`ed through
	// the CSS pipeline into that same chunk, so no third `<link>` appears.
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

	// The JS-side bundle holds everything entry.js pulled in, including `shared.css`
	// through the `@import` inside `imports-shared.css`. Module order within the chunk
	// follows source import order, so `shared.css` precedes the rule that pulled it.
	expect(jsBundleCss).toContain('content: "imported"');
	expect(jsBundleCss).toContain('content: "imports-shared"');
	expect(jsBundleCss).toContain('content: "shared"');

	// `.hero` cascade: linked.css declares it red and imported.css green. linked.css
	// loads first, so green wins — checked by linked.css holding the red declaration
	// and the JS-side bundle the green one.
	expect(linkedCss).toContain("color: red");
	expect(jsBundleCss).toContain("color: green");
});
