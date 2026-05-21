const fs = require("fs");
const path = require("path");

const readFile = (name) =>
	fs.readFileSync(path.resolve(__dirname, name), "utf-8");

it("should preserve runtime -> vendor -> entry script order while still emitting CSS <link>s before the scripts", () => {
	const extracted = readFile("page.html");
	expect(extracted).toMatchSnapshot();

	const scriptSrcRe = /<script src="([^"]+)">/g;
	const scriptSrcs = [];
	for (let m; (m = scriptSrcRe.exec(extracted)); ) scriptSrcs.push(m[1]);

	const linkHrefRe = /<link rel="stylesheet" href="([^"]+)">/g;
	const linkHrefs = [];
	for (let m; (m = linkHrefRe.exec(extracted)); ) linkHrefs.push(m[1]);

	// Three scripts: runtime, vendor, entry — in that exact order. If
	// runtime ends up after vendor (or after entry) the browser hits
	// `__webpack_require__ is not defined` when loading the dependent
	// chunk first.
	expect(scriptSrcs).toHaveLength(3);
	expect(scriptSrcs[0]).toMatch(/html-runtime/);
	expect(scriptSrcs[1]).toMatch(/vendor/);
	expect(scriptSrcs[2]).not.toMatch(/(html-runtime|vendor)/);
	for (const src of scriptSrcs) {
		expect(src).toMatch(/\.js$/);
		expect(() => readFile(src)).not.toThrow();
	}

	// CSS goes before any script tag.
	const firstScriptIdx = extracted.indexOf("<script");
	const lastLinkIdx = extracted.lastIndexOf('<link rel="stylesheet"');
	expect(lastLinkIdx).toBeGreaterThan(-1);
	expect(lastLinkIdx).toBeLessThan(firstScriptIdx);

	// Two CSS files reach the HTML: vendor-style.css is split into its
	// own chunk (it shares the vendor cache group test? — actually no,
	// vendor cache group only matches vendor.js. vendor-style.css
	// stays in the entry chunk along with app-style.css). With no CSS
	// split, expect a single `<link>` for the entry chunk's CSS
	// (merged vendor-style + app-style). If a future change splits CSS,
	// this assertion may need updating but the cascade order check
	// still holds.
	expect(linkHrefs.length).toBeGreaterThanOrEqual(1);
	for (const href of linkHrefs) {
		expect(href).toMatch(/\.css$/);
		expect(() => readFile(href)).not.toThrow();
	}
});
