const fs = require("fs");
const path = require("path");

it("should copy a file 'from' as a file on a file system without lstat", () => {
	expect(
		fs.readFileSync(path.resolve(__dirname, "without-lstat/a.txt"), "utf8")
	).toBe("a");
	expect(__STATS__.children[__STATS_I__].errors).toHaveLength(0);
});
