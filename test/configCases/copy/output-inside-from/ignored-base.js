const fs = require("fs");
const path = require("path");

it("should copy nothing from a base the hook ignores", () => {
	expect(fs.existsSync(path.resolve(__dirname, "out"))).toBe(false);
	const warnings = __STATS__.children[__STATS_I__].warnings;
	expect(warnings.map((warning) => warning.message)).toEqual([
		expect.stringContaining("copied no file")
	]);
});
