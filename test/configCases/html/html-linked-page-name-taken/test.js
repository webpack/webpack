const fs = require("fs");
const path = require("path");

it("should leave a page's script alone when its name is taken", () => {
	const about = fs.readFileSync(path.resolve(__dirname, "about.html"), "utf-8");

	// `about.js` is the JavaScript entry's bundle, so the page keeps the name
	// the parser gave its script rather than colliding with it.
	expect(about).toMatch(/<script src="__html_[a-f0-9]+_0\.chunk\.js">/);
	expect(fs.readdirSync(__dirname)).toContain("about.js");

	const js = fs.readFileSync(path.resolve(__dirname, "about.js"), "utf-8");
	expect(js).toContain("about-page");
});
