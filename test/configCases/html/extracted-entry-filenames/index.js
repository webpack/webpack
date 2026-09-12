const fs = require("fs");
const path = require("path");

// This bundle is emitted into `js/`, so the output root is one level up.
const outputRoot = path.resolve(__dirname, "..");

it("should name a page's script and link entries after their urls", () => {
	expect(
		fs.readFileSync(path.resolve(outputRoot, "page.html"), "utf-8")
	).toMatchSnapshot();
});

it("should keep the directory each filename template asked for", () => {
	// `js/bundle.js` lends its `js/` and `.js`, `styles.css` its root and
	// `.css` — neither template is consulted for `output.chunkFilename`.
	expect(fs.readdirSync(path.resolve(outputRoot, "js")).sort()).toEqual([
		"a.js",
		"b.js",
		"bundle.js"
	]);
	const files = fs.readdirSync(outputRoot);
	expect(files).toContain("a.css");
	expect(files).toContain("b.css");
});
