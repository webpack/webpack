const fs = require("fs");
const path = require("path");

it("should not hint a page entry that emits no JavaScript", () => {
	const files = fs.readdirSync(__dirname);

	expect(files).toContain("empty.html");
	expect(files).not.toContain("empty.js");

	const html = fs.readFileSync(path.resolve(__dirname, "app.html"), "utf-8");
	expect(html).not.toContain("empty.js");
	// The hint naming the JS entry still renders.
	expect(html).toMatch(/<link rel="preload" as="script" href="second\.js">/);
});
