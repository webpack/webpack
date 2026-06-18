const fs = require("fs");
const path = require("path");

const read = (file) => fs.readFileSync(path.resolve(__dirname, file), "utf-8");

it("adds output.crossOriginLoading to a template tag without crossorigin", () => {
	const html = read("page.html");
	// the `a.js` tag had no crossorigin -> gets the configured value
	const tags = html.match(/<script\b[^>]*><\/script>/g);
	const withDefault = tags.filter((t) =>
		t.includes('crossorigin="anonymous"')
	);
	expect(withDefault).toHaveLength(1);
});

it("preserves an author-set crossorigin value on a template tag", () => {
	const html = read("page.html");
	// the `b.js` tag set crossorigin="use-credentials" -> kept as-is
	expect(html).toContain('crossorigin="use-credentials"');
	expect(html).not.toMatch(/use-credentials"[^>]*crossorigin/);
});
