const fs = require("fs");
const path = require("path");

const exists = (name) => fs.existsSync(path.resolve(__dirname, name));

it("should leave the output directory out when 'globOptions.ignore' names it", () => {
	expect(exists("keep.txt")).toBe(true);
	expect(exists("nested/deep.txt")).toBe(true);
	expect(exists("build/stale.txt")).toBe(false);
});

it("should leave what an earlier build left there in place", () => {
	expect(fs.readFileSync(path.resolve(__dirname, "stale.txt"), "utf8")).toBe(
		"stale"
	);
});
