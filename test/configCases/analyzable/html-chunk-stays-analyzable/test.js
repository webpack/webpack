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

	expect(entry).toContain(`${"chunkImports"} = {`);
	expect(entry).toContain('"./lazy-page.mjs"');
	// The name is in the loader's map, so no chunk id is turned into one.
	expect(entry).not.toContain(`${"__webpack_require__"}.u =`);
	expect(emitted("lazy-page.mjs")).toBe(true);
});
