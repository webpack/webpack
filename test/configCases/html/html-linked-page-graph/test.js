const fs = require("fs");
const path = require("path");

const read = (name) => fs.readFileSync(path.resolve(__dirname, name), "utf-8");

it("should name a page reached by several links once", () => {
	const files = fs.readdirSync(__dirname);
	// A url claimed twice would take a numbered name, so the suffixed
	// spellings have to be absent rather than merely outnumbered.
	const matching = (pattern) =>
		files.filter((file) => pattern.test(file)).sort();

	expect(matching(/^shared\d*\.html$/)).toEqual(["shared.html"]);
	expect(matching(/^deep\d*\.js$/)).toEqual(["deep.js"]);
	expect(read("shared.html")).toMatch(/<script src="deep\.js">/);
	expect(read("a.html")).toMatch(/<a href="shared\.html">/);
	expect(read("b.html")).toMatch(/<a href="shared\.html">/);
	// The link back to the entry page closes a cycle, and names nothing twice.
	expect(read("shared.html")).toMatch(/<a href="index\.html">/);
	expect(read("index.html")).toMatch(/<script src="home\.js">/);
	expect(files).toContain("first.js");
	expect(files).toContain("second.js");
});
