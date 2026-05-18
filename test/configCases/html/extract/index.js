const fs = require("fs");
const path = require("path");

const page = require("./page.html");

const readFile = (name) =>
	fs.readFileSync(path.resolve(__dirname, name), "utf-8");

it("should emit page.html with rewritten URLs alongside the JS bundle", () => {
	const extracted = readFile("page.html");
	expect(extracted).toMatchSnapshot();
	// URLs were rewritten — no original relative paths remain.
	expect(extracted).not.toContain('src="./entry.js"');
	expect(extracted).not.toContain('href="./icon.png"');
	expect(extracted).not.toContain('src="./image.png"');
	// `<script src>` was rewritten to the chunk URL.
	expect(extracted).toMatch(/<script src="__html_[a-f0-9]+_0\.chunk\.js">/);
	// Asset URLs were rewritten to hashed filenames.
	expect(extracted).toMatch(/<link rel="icon" href="[a-f0-9]+\.png">/);
	expect(extracted).toMatch(/<img src="[a-f0-9]+\.png" alt="image">/);
});

it("should still expose the rewritten HTML as the module's default export", () => {
	expect(typeof page).toBe("string");
	// Same content as the emitted file.
	expect(page).toBe(readFile("page.html"));
});
