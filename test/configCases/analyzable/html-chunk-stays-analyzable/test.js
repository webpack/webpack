const fs = require("fs");
const path = require("path");

const read = (file) => fs.readFileSync(path.resolve(__dirname, file), "utf-8");
const html = read("page.html");
const emitted = (file) => fs.existsSync(path.resolve(__dirname, file));

// Only the attribute is read, never a closing tag: matching one is the shape
// static analysis rejects, and the name is all these assertions need.
const attribute = (name) => {
	const found = new RegExp(`\\s${name}="([^"]+)"`).exec(html);

	expect(found).not.toBe(null);
	return found[1];
};

it("should point the page at javascript this build emitted", () => {
	expect(emitted(attribute("src"))).toBe(true);
});

it("should point the page at a stylesheet this build emitted", () => {
	expect(emitted(attribute("href"))).toBe(true);
});

it("should reach the chunk an html page's javascript imports by name", () => {
	const entry = read(attribute("src"));

	const importMap = `${"chunkImports"} = {`;
	const start = entry.indexOf(importMap);

	expect(start).not.toBe(-1);
	// Read inside the map, so the name cannot be matched from anywhere else in the chunk.
	const region = entry.slice(start, entry.indexOf("};", start));

	expect(region).toContain('"./lazy-page.mjs"');
	expect(emitted("lazy-page.mjs")).toBe(true);
});
