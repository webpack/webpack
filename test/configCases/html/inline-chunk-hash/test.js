const fs = require("fs");
const path = require("path");

it("should resolve an inlined chunk through the chunk hash when no content hash is set", () => {
	const html = fs
		.readFileSync(path.resolve(__dirname, "main.html"))
		.toString("utf-8");
	// Every sentinel resolved: none is left in the emitted page.
	expect(html).not.toMatch(/__WEBPACK_HTML_INLINE__/);
	expect(html).toMatch(/<style>[\s\S]*color: ?red/);
	expect(html).toMatch(/<script>/);
});
