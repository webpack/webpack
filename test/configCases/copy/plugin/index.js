const fs = require("fs");
const path = require("path");

it("should copy what a pattern given to the exported plugin names", () => {
	expect(fs.readFileSync(path.resolve(__dirname, "one.txt"), "utf8")).toBe(
		"one"
	);
});
