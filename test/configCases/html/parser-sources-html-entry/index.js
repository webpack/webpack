const fs = require("fs");
const path = require("path");

const page = require("./page.html");

const readFile = (name) =>
	fs.readFileSync(path.resolve(__dirname, name), "utf-8");

it("should bundle a `type: html` link as its own page and rewrite the href", () => {
	// The custom source mapped `<a href>` to a linked HTML page entry, so the
	// href now points at the linked page's emitted filename, not the source path.
	expect(page).toContain('<a href="about.html">About</a>');
	expect(page).not.toContain("./about.html");
});

it("should process the linked page through the HTML pipeline as its own page", () => {
	const about = readFile("about.html");
	// `about.html` was emitted as a standalone page and its own `<img src>`
	// was rewritten to the bundled asset.
	expect(about).toContain('<img src="image.png" alt="logo">');
	expect(about).not.toContain("./image.png");
	expect(about).toMatchSnapshot();
});
