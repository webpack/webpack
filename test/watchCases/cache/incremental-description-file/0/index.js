const metadata = require("./package.json");
const value = require("./a.js");

it("should resolve imports again when an imported description file changes", () => {
	expect(metadata.private).toBe(true);
	expect(value).toBe(WATCH_STEP === "1" ? "b" : WATCH_STEP === "3" ? "a2" : "a");
});
