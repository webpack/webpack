const fs = require("fs");
const path = require("path");

require("./page.html");

it("should honor a custom output.htmlFilename template", () => {
	const pagesDir = path.resolve(__dirname, "pages");
	const files = fs.readdirSync(pagesDir);
	// Exactly one HTML file under `pages/`, matching the template
	// `pages/[name].[contenthash:8].html`.
	expect(files).toHaveLength(1);
	const [emitted] = files;
	expect(emitted).toMatch(/^page\.[a-f0-9]{8}\.html$/);
	const html = fs.readFileSync(path.join(pagesDir, emitted), "utf-8");
	// The page is emitted into `pages/`, but assets and chunks live at the
	// `output.path` root. Asset URLs in the emitted HTML must therefore be
	// rewritten with an `../` undo path relative to the HTML's location;
	// otherwise the browser would look for `pages/<hash>.png` instead of
	// `<hash>.png`.
	expect(html).not.toContain('src="./image.png"');
	expect(html).toMatch(/<img src="\.\.\/[a-f0-9]+\.png" alt="image">/);
});
