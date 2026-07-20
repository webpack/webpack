const fs = require("fs");
const path = require("path");

const dir = __dirname;
const page = fs.readFileSync(path.resolve(dir, "page.html"), "utf-8");

it("should emit both entry-chunk and vendor-chunk asset hints into HTML head", () => {
	// `webpackPreload` on font (entry chunk).
	expect(page).toMatch(
		/<link rel="preload" as="font" href="[^"]*font\.woff2"/
	);
	// Rule-based hint on png (vendor chunk).
	expect(page).toMatch(
		/<link rel="prefetch" as="image" href="[^"]*image\.png"[^>]*fetchpriority="low"/
	);
});

it("should skip the JS-runtime hint pass — HTML entries handle it themselves", () => {
	// If both assets are HTML-hinted, the startup asset hint runtime module
	// should short-circuit and produce nothing in any chunk emitted for this page.
	for (const file of fs.readdirSync(dir)) {
		if (!file.endsWith(".mjs") && !file.endsWith(".chunk.mjs")) continue;
		const src = fs.readFileSync(path.resolve(dir, file), "utf-8");
		expect(src).not.toMatch(/webpack\/runtime\/startup asset hints/);
	}
});
