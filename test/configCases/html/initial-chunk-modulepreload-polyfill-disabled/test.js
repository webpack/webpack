const fs = require("fs");
const path = require("path");

const page = fs.readFileSync(path.resolve(__dirname, "page.html"), "utf-8");

it("should emit modulepreload links but no inline polyfill when modulePreloadPolyfill is false", () => {
	// The `<link rel="modulepreload">` tags are still emitted.
	expect(page).toContain('<link rel="modulepreload" href="runtime.mjs">');
	// ...but the inline ES5 polyfill <script> is suppressed (strict CSP).
	expect(page).not.toMatch(/<script>\(function\(\)\{[\s\S]*?modulepreload/);
	expect(page).not.toContain('document.createElement("link").relList');
});
