const fs = require("fs");
const path = require("path");

it("emits integrity even without crossOriginLoading (warning is advisory)", () => {
	const html = fs
		.readFileSync(path.resolve(__dirname, "index.html"))
		.toString("utf-8");
	// The feature still works; only the missing-CORS warning is added.
	expect(html).toMatch(/integrity="sha384-/);
});
