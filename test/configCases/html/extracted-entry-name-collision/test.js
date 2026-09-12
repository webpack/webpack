const fs = require("fs");
const path = require("path");

const read = (name) => fs.readFileSync(path.resolve(__dirname, name), "utf-8");

it("should number a second page's script past a basename the first one took", () => {
	const files = fs.readdirSync(__dirname);
	expect(files).toContain("app.js");
	expect(files).toContain("app1.js");

	// Both pages load `./app.js`, and the links are in the reverse of their
	// lexical order, so only document order gives `second.html` the plain name.
	expect(read("second.html")).toMatch(/<script src="app\.js">/);
	expect(read("first.html")).toMatch(/<script src="app1\.js">/);
	expect(read("app.js")).toContain("second-page-script");
	expect(read("app1.js")).toContain("first-page-script");
});
