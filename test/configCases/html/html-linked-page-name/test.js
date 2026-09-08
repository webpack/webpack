const fs = require("fs");
const path = require("path");

const read = (name) => fs.readFileSync(path.resolve(__dirname, name), "utf-8");

it("should name a linked page's script after that page", () => {
	const files = fs.readdirSync(__dirname);

	expect(files).toContain("about.js");
	expect(read("about.html")).toMatch(/<script src="about\.js">/);
	// The entry page still takes its entry's name.
	expect(read("index.html")).toMatch(/<script src="main\.js">/);
	expect(files).toContain("main.js");
});
