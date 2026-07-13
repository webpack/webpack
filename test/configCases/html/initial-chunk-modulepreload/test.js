const fs = require("fs");
const path = require("path");

const page = fs.readFileSync(path.resolve(__dirname, "page.html"), "utf-8");

it("should modulepreload the entry's initial dependency chunks under output.module", () => {
	// The runtime chunk is an initial sibling — fetched in parallel from <head>.
	expect(page).toContain('<link rel="modulepreload" href="runtime.mjs">');
	// ESM output uses `modulepreload`, never `preload as=script`.
	expect(page).not.toContain('rel="preload"');
	// The entry chunk itself is not preloaded — it's already the <script src>.
	expect(page).not.toMatch(/<link rel="modulepreload" href="__html_/);
});

it("should place the modulepreloads inside <head>, before the body scripts", () => {
	const headEnd = page.indexOf("</head>");
	expect(headEnd).toBeGreaterThan(-1);
	// exec()-in-a-loop rather than String.prototype.matchAll (needs Node 12+).
	const re = /<link rel="modulepreload"[^>]*>/g;
	let m;
	while ((m = re.exec(page))) {
		expect(m.index).toBeLessThan(headEnd);
	}
	expect(page.indexOf("<script")).toBeGreaterThan(headEnd);
});

it("should NOT statically hint dynamic imports — those stay on the runtime", () => {
	expect(page).not.toMatch(/rel="prefetch"/);
	expect(page).not.toContain("lazy");
});
