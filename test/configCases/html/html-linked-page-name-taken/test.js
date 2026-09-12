const fs = require("fs");
const path = require("path");

it("should number a page's script past a name an entry already emits", () => {
	const about = fs.readFileSync(path.resolve(__dirname, "about.html"), "utf-8");
	const files = fs.readdirSync(__dirname);

	// `about.js` is the JavaScript entry's bundle, so the page's script of the
	// same name is numbered past it rather than colliding with it.
	expect(about).toMatch(/<script src="about1\.js">/);
	expect(files).toContain("about.js");
	expect(files).toContain("about1.js");

	expect(
		fs.readFileSync(path.resolve(__dirname, "about.js"), "utf-8")
	).toContain("about-page");
	expect(
		fs.readFileSync(path.resolve(__dirname, "about1.js"), "utf-8")
	).toContain("about-script");
});
