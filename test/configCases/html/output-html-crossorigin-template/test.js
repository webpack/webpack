const fs = require("fs");
const path = require("path");

const read = (file) => fs.readFileSync(path.resolve(__dirname, file), "utf-8");
const count = (str, sub) => str.split(sub).length - 1;

it("adds output.crossOriginLoading to a template tag without crossorigin", () => {
	const html = read("page.html");
	// the `a.js` tag had no crossorigin -> exactly one tag gets the default
	expect(count(html, 'crossorigin="anonymous"')).toBe(1);
});

it("preserves an author-set crossorigin value on a template tag", () => {
	const html = read("page.html");
	// the `b.js` tag's value is kept, not duplicated or overridden
	expect(count(html, 'crossorigin="use-credentials"')).toBe(1);
});
