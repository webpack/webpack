const fs = require("fs");
const path = require("path");

const readFile = (name) =>
	fs.readFileSync(path.resolve(__dirname, name), "utf-8");

it("should emit page.html with a <link> pointing to the bundled CSS chunk", () => {
	const extracted = readFile("page.html");
	expect(extracted).toMatchSnapshot();
	// Original `./style.css` was rewritten away.
	expect(extracted).not.toContain('href="./style.css"');
	// The `<link rel="stylesheet">` points at the emitted CSS chunk.
	const linkMatch = extracted.match(
		/<link\s+rel="stylesheet"\s+href="([^"]+)"/
	);
	expect(linkMatch).not.toBeNull();
	const cssPath = linkMatch[1];
	expect(cssPath).toMatch(/\.css$/);
	// The CSS file is on disk and `url()` inside it was resolved to an
	// asset module — the original `./image.png` path is gone, replaced
	// with the hashed asset filename.
	const css = readFile(cssPath);
	expect(css).not.toContain("./image.png");
	expect(css).toMatch(/url\(\s*"?[a-f0-9]+\.png"?\s*\)/);
});
