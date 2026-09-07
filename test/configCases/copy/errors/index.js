const fs = require("fs");
const path = require("path");

it("should error on a pattern which cannot copy what it names", () => {
	expect(__STATS__.errors).toHaveLength(2);
});

it("should only warn about a pattern which matched nothing", () => {
	expect(__STATS__.warnings).toHaveLength(1);
});

it("should not copy a file whose transform failed", () => {
	expect(fs.existsSync(path.resolve(__dirname, "boom.txt"))).toBe(false);
});
