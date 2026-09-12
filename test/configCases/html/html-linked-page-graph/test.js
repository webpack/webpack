const fs = require("fs");
const path = require("path");

const read = (name) => fs.readFileSync(path.resolve(__dirname, name), "utf-8");

it("should name a page reached by several links once", () => {
	const files = fs.readdirSync(__dirname);

	expect(files.filter((file) => file === "shared.html")).toHaveLength(1);
	expect(files.filter((file) => file === "deep.js")).toHaveLength(1);
	expect(read("shared.html")).toMatch(/<script src="deep\.js">/);
	expect(read("a.html")).toMatch(/<a href="shared\.html">/);
	expect(read("b.html")).toMatch(/<a href="shared\.html">/);
	// The link back to the entry page closes a cycle, and names nothing twice.
	expect(read("shared.html")).toMatch(/<a href="index\.html">/);
	expect(read("index.html")).toMatch(/<script src="home\.js">/);
	expect(files).toContain("first.js");
	expect(files).toContain("second.js");
});
