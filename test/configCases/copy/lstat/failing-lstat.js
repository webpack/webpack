const fs = require("fs");
const path = require("path");

it("should not copy a pattern whose lstat failed other than missing", () => {
	expect(fs.existsSync(path.resolve(__dirname, "failing-lstat"))).toBe(false);
});
