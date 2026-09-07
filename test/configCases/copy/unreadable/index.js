const fs = require("fs");
const path = require("path");

it("should report a file it may not read as an error", () => {
	expect(__STATS__.errors).toHaveLength(2);
});

it("should keep copying the patterns it can read", () => {
	expect(fs.readFileSync(path.resolve(__dirname, "a.txt"), "utf8")).toBe("a");
});
