const fs = require("fs");
const path = require("path");

const read = (name) => fs.readFileSync(path.resolve(__dirname, name), "utf-8");

it("should name a linked page's script after its src", () => {
	const files = fs.readdirSync(__dirname);

	expect(files).toContain("about-page.js");
	expect(read("about.html")).toMatch(/<script src="about-page\.js">/);
	// The page an entry points at is no different — its src names it too.
	expect(read("index.html")).toMatch(/<script src="home\.js">/);
	expect(files).toContain("home.js");
});
