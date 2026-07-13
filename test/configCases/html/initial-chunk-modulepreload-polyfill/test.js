const fs = require("fs");
const path = require("path");

const page = fs.readFileSync(path.resolve(__dirname, "page.html"), "utf-8");

it("should inline the modulepreload polyfill when the environment lacks native support", () => {
	// `output.environment.modulePreload: false` → emit the ES5 fallback.
	expect(page).toMatch(/<script>\(function\(\)\{[\s\S]*?modulepreload[\s\S]*?\}\)\(\);<\/script>/);
	expect(page).toContain('<link rel="modulepreload" href="runtime.mjs">');
	// Exactly one polyfill per page, in <head>, before the body scripts.
	expect((page.match(/document\.createElement\("link"\)\.relList/g) || []).length).toBe(1);
	const headEnd = page.indexOf("</head>");
	expect(page.search(/<script>\(function/)).toBeLessThan(headEnd);
});
