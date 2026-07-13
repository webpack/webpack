const fs = require("fs");
const path = require("path");

const page = fs.readFileSync(path.resolve(__dirname, "page.html"), "utf-8");

it("should not emit any preload/modulepreload tags by default", () => {
	expect(page).not.toContain("rel=\"preload\"");
	expect(page).not.toContain("rel=\"modulepreload\"");
	// The runtime sibling is still loaded via a plain <script> tag.
	expect(page).toContain('<script src="runtime.js"></script>');
});
