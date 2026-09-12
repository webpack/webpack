import page from "./page.html";

it("should rewrite custom data-src URLs the same way as default sources", () => {
	// Default `<img src>` still rewritten.
	expect(page).not.toContain('src="./hero.png"');
	expect(page).toMatch(/src="hero\.png"/);
	// Custom `data-src` rewritten via the user-supplied source entry.
	expect(page).not.toContain('data-src="./lazy.png"');
	expect(page).toMatch(/data-src="lazy\.png"/);
});

it("should parse custom srcset entries as srcset (not src)", () => {
	expect(page).not.toContain('data-srcset="./small.png 1x, ./large.png 2x"');
	// Both candidates rewritten to bare filenames; descriptors preserved.
	expect(page).toMatch(/data-srcset="small\.png 1x,\s*large\.png 2x"/);
});

it("should match a tagless entry against any element", () => {
	expect(page).not.toContain('data-href="./linked.png"');
	expect(page).toMatch(/<section data-href="linked\.png">/);
});

it("should not promote custom sources into compilation entries", () => {
	// A custom source without `'...'` is a plain URL rewrite, so the page
	// gains no chunk named after it — every rewritten URL is an asset one.
	expect(page).not.toMatch(/"page\d*\.js"/);
	expect(__STATS__.assets.map((a) => a.name)).not.toContain("page.js");
});
