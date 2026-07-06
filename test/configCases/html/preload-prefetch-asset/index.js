import fs from "fs";
import path from "path";

import page from "./page.html";

it("should rewrite <link rel=preload/prefetch> of asset-module targets to asset URLs", () => {
	expect(typeof page).toBe("string");
	expect(page).toMatchSnapshot();

	// Every asset href is rewritten off the source path to the emitted URL.
	expect(page).not.toContain('href="./img.png"');
	expect(page).not.toContain('href="./img2.png"');
	expect(page).not.toContain('href="./font.woff2"');
	expect(page).not.toContain('href="./data.bin"');

	// `as` and sibling attributes are preserved; no chunk suffix is added.
	expect(page).toMatch(
		/<link rel="preload" as="image" href="assets\/img\.png">/
	);
	expect(page).toMatch(
		/<link rel="prefetch" as="image" href="assets\/img2\.png">/
	);
	expect(page).toMatch(
		/<link rel="preload" as="font" href="assets\/font\.woff2" type="font\/woff2" crossorigin>/
	);
	expect(page).toMatch(
		/<link rel="preload" as="fetch" href="assets\/data\.bin" crossorigin>/
	);

	// No chunk was emitted for a resource hint — these are plain assets.
	expect(page).not.toContain("__html_");
});

it("should emit each referenced asset to disk", () => {
	for (const name of ["img.png", "img2.png", "font.woff2", "data.bin"]) {
		expect(fs.existsSync(path.resolve(__dirname, "assets", name))).toBe(true);
	}
});
